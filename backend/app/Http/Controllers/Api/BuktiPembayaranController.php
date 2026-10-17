<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BuktiPembayaran;
use App\Models\Invoice;
use App\Services\AttachmentService;
use App\Services\AuditService;
use App\Services\Notification\Notifier;
use App\Services\Payment\InvoicePaidCalculator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BuktiPembayaranController extends Controller
{
    public function __construct(
        private InvoicePaidCalculator $calculator,
        private AuditService $audit,
        private Notifier $notifier,
        private AttachmentService $attachment,
    ) {}

    public function show(BuktiPembayaran $bukti): JsonResponse
    {
        $this->ensureSameLembaga($bukti);
        $bukti->load(['invoice', 'submitter', 'verifier']);
        $bukti->is_overdue = $bukti->isOverdue();
        return response()->json(['data' => $bukti]);
    }

    /**
     * Stream file bukti pembayaran untuk preview di browser.
     */
    public function view(BuktiPembayaran $bukti)
    {
        $this->ensureSameLembaga($bukti);
        if (! $bukti->path_bukti) {
            return response()->json(['message' => 'Bukti tidak memiliki file.'], 404);
        }

        $this->audit->log('bukti.viewed', 'bukti_pembayaran', $bukti->id, [
            'invoice_id' => $bukti->invoice_id,
        ]);

        $mime = $this->guessMime($bukti->path_bukti);
        $disk = \Illuminate\Support\Facades\Storage::disk('r2');

        abort_unless($disk->exists($bukti->path_bukti), 404, 'File bukti tidak ditemukan di storage.');

        return response($disk->get($bukti->path_bukti), 200, [
            'Content-Type' => $mime,
            'Content-Disposition' => 'inline; filename="' . basename($bukti->path_bukti) . '"',
            'Content-Length' => $disk->size($bukti->path_bukti),
        ]);
    }

    /**
     * Download file bukti pembayaran ke mesin user.
     */
    public function download(BuktiPembayaran $bukti)
    {
        $this->ensureSameLembaga($bukti);
        if (! $bukti->path_bukti) {
            return response()->json(['message' => 'Bukti tidak memiliki file.'], 404);
        }

        $this->audit->log('bukti.downloaded', 'bukti_pembayaran', $bukti->id, [
            'invoice_id' => $bukti->invoice_id,
        ]);

        $ext = pathinfo($bukti->path_bukti, PATHINFO_EXTENSION);
        $downloadName = "bukti-{$bukti->id}.{$ext}";
        return $this->attachment->response($bukti->path_bukti, $downloadName);
    }

    private function guessMime(string $path): string
    {
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        return match ($ext) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            'pdf' => 'application/pdf',
            default => 'application/octet-stream',
        };
    }

    public function byInvoice(Invoice $invoice): JsonResponse
    {
        $sessionLembagaId = session('lembaga_id');
        if ($sessionLembagaId !== null) {
            $siklusLembagaId = $invoice->siklus?->lembaga_id
                ?? $invoice->siklus()->value('lembaga_id');
            if ($siklusLembagaId !== $sessionLembagaId) {
                abort(response()->json(['message' => 'Invoice tidak ditemukan.'], 404));
            }
        }

        $bukti = $invoice->buktiPembayaran()
            ->with(['submitter', 'verifier'])
            ->orderByDesc('created_at')
            ->get()
            ->each(function (BuktiPembayaran $b) {
                $b->is_overdue = $b->isOverdue();
            });
        return response()->json(['data' => $bukti]);
    }

    /**
     * Antrian bukti yang menunggu verifikasi (untuk Admin Lembaga / Keuangan).
     * SLA-overdue diurutkan lebih dulu.
     */
    public function antrianMenunggu(): JsonResponse
    {
        $query = BuktiPembayaran::where('status_verifikasi', BuktiPembayaran::STATUS_MENUNGGU)
            ->with(['invoice.siklus.faskes', 'invoice.siklus.lembaga', 'submitter']);

        // Filter per lembaga aktif: hanya bukti dari invoice di siklus lembaga
        // yang sama dengan session user.
        if ($lembagaId = session('lembaga_id')) {
            $query->whereHas('invoice.siklus', fn ($q) => $q->where('lembaga_id', $lembagaId));
        }

        $bukti = $query
            ->orderBy('tanggal_submit')
            ->get()
            ->each(function (BuktiPembayaran $b) {
                $b->is_overdue = $b->isOverdue();
            })
            ->sortByDesc('is_overdue')
            ->values();
        return response()->json(['data' => $bukti]);
    }

    /**
     * FR-2.6 (SLA 1x24 jam tercatat di log), FR-2.7 (tolak + alasan).
     */
    public function verifikasi(Request $request, BuktiPembayaran $bukti): JsonResponse
    {
        $this->ensureSameLembaga($bukti);
        $data = $request->validate([
            'status' => 'required|in:diterima,ditolak',
            'alasan_penolakan' => 'required_if:status,ditolak|nullable|string|max:1000',
        ]);

        if ($bukti->status_verifikasi !== BuktiPembayaran::STATUS_MENUNGGU) {
            return response()->json([
                'message' => "Bukti sudah diverifikasi (status: {$bukti->status_verifikasi}).",
            ], 422);
        }

        $user = $request->user();
        $invoice = $bukti->invoice;

        return DB::transaction(function () use ($bukti, $data, $user, $invoice) {
            $bukti->update([
                'status_verifikasi' => $data['status'],
                'diverifikasi_oleh' => $user->id,
                'tanggal_verifikasi' => now(),
                'alasan_penolakan' => $data['status'] === BuktiPembayaran::STATUS_DITOLAK ? $data['alasan_penolakan'] : null,
            ]);

            $this->audit->log("bukti.{$data['status']}", 'bukti_pembayaran', $bukti->id, [
                'invoice_id' => $invoice->id,
                'nominal' => (float) $bukti->nominal,
                'alasan_penolakan' => $data['alasan_penolakan'] ?? null,
            ]);

            $newInvoiceStatus = $this->calculator->recalculate($invoice);

            if ($data['status'] === BuktiPembayaran::STATUS_DITOLAK) {
                Log::info('faskes.bukti_transfer.ditolak', [
                    'faskes_id' => $invoice->siklus->faskes_id,
                    'bukti_id' => $bukti->id,
                    'alasan' => $data['alasan_penolakan'],
                ]);

                // NFR-1: notifikasi Faskes via WhatsApp + fallback email.
                $faskes = $invoice->siklus->faskes;
                $this->notifier->sendWithFallback(
                    recipientPhone: $faskes->telepon ?? '',
                    recipientEmail: $faskes->email ?? null,
                    subject: 'Bukti transfer ditolak',
                    message: "Yth. {$faskes->nama},\n\n"
                        . "Bukti transfer untuk invoice {$invoice->nomor_invoice} kami TOLAK dengan alasan:\n"
                        . "\"{$data['alasan_penolakan']}\"\n\n"
                        . "Anda dapat mengunggah ulang bukti melalui portal Faskes. "
                        . "Sistem akan otomatis memperbarui status invoice setelah bukti baru diverifikasi.\n\n"
                        . "Terima kasih,\nLIPA MITRA NUSA",
                    siklusId: $invoice->siklus_id,
                    jenis: 'bukti_ditolak',
                );
            } elseif ($newInvoiceStatus === Invoice::STATUS_LUNAS) {
                $faskes = $invoice->siklus->faskes;
                $this->notifier->sendWithFallback(
                    recipientPhone: $faskes->telepon ?? '',
                    recipientEmail: $faskes->email ?? null,
                    subject: "Invoice {$invoice->nomor_invoice} telah LUNAS",
                    message: "Yth. {$faskes->nama},\n\n"
                        . "Pembayaran invoice {$invoice->nomor_invoice} telah kami terima dan diverifikasi. "
                        . "Status invoice sekarang: LUNAS.\n\n"
                        . "Terima kasih,\nLIPA MITRA NUSA",
                    siklusId: $invoice->siklus_id,
                    jenis: 'invoice_lunas',
                );
            }

            return response()->json([
                'data' => $bukti->fresh(),
                'invoice_status' => $newInvoiceStatus,
            ]);
        });
    }

    /**
     * Guard lembaga: bukti pembayaran hanya bisa diakses dari session lembaga
     * yang sama dengan lembaga siklus invoice di bawahnya. Melengkapi trait
     * BelongsToLembaga pada SiklusAkreditasi (tabel bukti_pembayaran tidak
     * memiliki kolom lembaga_id).
     */
    private function ensureSameLembaga(BuktiPembayaran $bukti): void
    {
        $sessionLembagaId = session('lembaga_id');
        if ($sessionLembagaId === null) {
            // Superadmin tanpa pilihan lembaga: skip filter
            return;
        }

        $siklusLembagaId = $bukti->invoice?->siklus?->lembaga_id
            ?? $bukti->invoice()?->siklus()->value('lembaga_id');

        if ($siklusLembagaId !== $sessionLembagaId) {
            abort(response()->json(['message' => 'Bukti pembayaran tidak ditemukan.'], 404));
        }
    }
}
