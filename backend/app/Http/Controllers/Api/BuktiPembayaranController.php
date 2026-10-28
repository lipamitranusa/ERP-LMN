<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BuktiPembayaran;
use App\Models\Invoice;
use App\Models\JurnalUmum;
use App\Services\AttachmentService;
use App\Services\AuditService;
use App\Services\Keuangan\SettlementJournalService;
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
     * GET /api/bukti/histori
     * Histori pembayaran Faskes lintas invoice — daftar bukti transfer yang
     * pernah dikirim (diterima, ditolak, dan masih menunggu), lengkap dengan
     * status jurnal bank masuknya.
     *
     * Berbeda dari antrianMenunggu() yang hanya menampilkan yang masih
     * menunggu, endpoint ini面向 audit: satu-satunya sumber untuk melihat
     * seluruh riwayat penerimaan kas dari Faskes beserta jejak bukubesar.
     *
     * Filter: q, status, metode, sumber, faskes_id, dari, sampai, page, per_page
     */
    public function histori(Request $request): JsonResponse
    {
        $query = BuktiPembayaran::query()
            ->with([
                'invoice:id,pks_id,siklus_id,nomor_invoice,total_tagihan,status',
                'invoice.siklus:id,faskes_id,lembaga_id,tahapan',
                'invoice.siklus.faskes:id,nama,tipe_faskes',
                'verifier:nama',
                'submitter:nama',
            ]);

        // Scope lemma: bukti pembayaran tidak punya kolom lemma_id, jadi
        // ikut melalui invoice → siklus (sama seperti antrianMenunggu).
        if ($lembagaId = session('lembaga_id')) {
            $query->whereHas('invoice.siklus', fn ($q) => $q->where('lembaga_id', $lembagaId));
        }

        if ($request->filled('status')) {
            $query->where('status_verifikasi', $request->string('status'));
        }
        if ($request->filled('metode')) {
            $query->where('metode', $request->string('metode'));
        }
        if ($request->filled('sumber')) {
            $query->where('sumber', $request->string('sumber'));
        }
        if ($request->filled('faskes_id')) {
            $query->whereHas('invoice.siklus', fn ($q) => $q->where('faskes_id', $request->string('faskes_id')));
        }
        if ($request->filled('dari')) {
            $query->whereDate('tanggal_submit', '>=', $request->date('dari'));
        }
        if ($request->filled('sampai')) {
            $query->whereDate('tanggal_submit', '<=', $request->date('sampai'));
        }
        if ($request->filled('q')) {
            $term = trim($request->string('q')->toString());
            $query->where(function ($w) use ($term) {
                $w->where('nomor_referensi', 'ilike', "%{$term}%")
                    ->orWhere('dari_rekening', 'ilike', "%{$term}%")
                    ->orWhere('alasan_penolakan', 'ilike', "%{$term}%")
                    ->orWhereHas('invoice', fn ($r) => $r->where('nomor_invoice', 'ilike', "%{$term}%"))
                    ->orWhereHas('invoice.siklus.faskes', fn ($r) => $r->where('nama', 'ilike', "%{$term}%"));
            });
        }

        $perPage = min(max((int) $request->integer('per_page', 25), 1), 100);
        $page = $query->orderByDesc('tanggal_submit')->orderByDesc('created_at')->paginate($perPage);

        // Jurnal bank masuk per bukti (settlement_piutang) — agar UI bisa
        // menandai pembayaran mana yang sudah terposting ke buku besar.
        $jurnalByBukti = JurnalUmum::where('ref_type', SettlementJournalService::REF_PIUTANG_SETTLEMENT)
            ->whereIn('ref_id', collect($page->items())->pluck('id'))
            ->pluck('nomor', 'ref_id')
            ->all();

        return response()->json([
            'data' => collect($page->items())->map(fn (BuktiPembayaran $b) => [
                'id' => $b->id,
                'tanggal_submit' => $b->tanggal_submit?->toDateString(),
                'tanggal_verifikasi' => $b->tanggal_verifikasi?->toDateString(),
                'nominal' => (float) $b->nominal,
                'metode' => $b->metode,
                'sumber' => $b->sumber,
                'status_verifikasi' => $b->status_verifikasi,
                'nomor_referensi' => $b->nomor_referensi,
                'dari_rekening' => $b->dari_rekening,
                'alasan_penolakan' => $b->alasan_penolakan,
                'verifier_nama' => $b->verifier?->nama,
                'submitter_nama' => $b->submitter?->nama,
                'path_bukti' => $b->path_bukti,
                'invoice' => $b->invoice ? [
                    'id' => $b->invoice->id,
                    'nomor_invoice' => $b->invoice->nomor_invoice,
                    'total_tagihan' => (float) $b->invoice->total_tagihan,
                    'status' => $b->invoice->status,
                ] : null,
                'faskes' => $b->invoice?->siklus?->faskes ? [
                    'id' => $b->invoice->siklus->faskes->id,
                    'nama' => $b->invoice->siklus->faskes->nama,
                    'tipe_faskes' => $b->invoice->siklus->faskes->tipe_faskes,
                ] : null,
                'jurnal_nomor' => $jurnalByBukti[$b->id] ?? null,
            ])->values(),
            'meta' => [
                'kpi' => $this->historiKpi(clone $query),
                'pagination' => [
                    'current_page' => $page->currentPage(),
                    'last_page' => $page->lastPage(),
                    'per_page' => $page->perPage(),
                    'total' => $page->total(),
                ],
            ],
        ]);
    }

    /**
     * Ringkasan nilai & jumlah pembayaran untuk halaman histori.
     * Dipisah dari histori() agar tidak ikut ter-paginate.
     *
     * Agregasi di SQL, bukan di PHP — histori bisa tumbuh ratusan ribu baris
     * pada lembaga dengan riwayat panjang.
     */
    private function historiKpi($query): array
    {
        $rows = $query
            ->reorder()
            ->without(['invoice', 'verifier', 'submitter'])
            ->toBase()
            ->selectRaw('status_verifikasi, COUNT(*) as jml, COALESCE(SUM(nominal), 0) as total')
            ->groupBy('status_verifikasi')
            ->get();

        $result = [];
        foreach ([BuktiPembayaran::STATUS_DITERIMA, BuktiPembayaran::STATUS_MENUNGGU, BuktiPembayaran::STATUS_DITOLAK] as $status) {
            $row = $rows->firstWhere('status_verifikasi', $status);
            $result["jumlah_{$status}"] = (int) ($row->jml ?? 0);
            $result["nilai_{$status}"] = round((float) ($row->total ?? 0), 2);
        }

        return $result;
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

            // Jurnal Bank Masuk (Dr Bank / Cr Piutang Usaha) TIDAK dibuat di
            // sini. Debit bank adalah aksi eksplisit dari tim Keuangan lewat
            // tombol "Buat Jurnal Bank Masuk" di halaman Detail Piutang —
            // akun bank hanya boleh didebit setelah penerimaan kas
            // dikonfirmasi terhadap mutasi rekening (rekonsiliasi bank).
            // Selain itu, pembuktian yang DITOLAK tidak boleh pernah
            // menghasilkan penerimaan kas di buku besar.

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
