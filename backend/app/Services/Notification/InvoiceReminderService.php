<?php

namespace App\Services\Notification;

use App\Models\Invoice;
use App\Models\NotifikasiTagihan;
use App\Models\Penugasan;
use App\Services\Invoice\InvoicePdfGenerator;
use App\Services\Invoice\TagihanService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * FR-5.4a / AC-9: kirim pengingat otomatis untuk Invoice yang akan/sudah
 * jatuh tempo, dengan syarat survei sudah berjalan.
 *
 * Schedule (offsets hari terhadap due_date):
 *   H-3  → tagihan_h3   (3 hari sebelum due date)
 *   H-1  → tagihan_h1   (1 hari sebelum due date)
 *   H+0  → tagihan_overdue (setelah due date, survei sedang berjalan)
 *
 * Invariants:
 *   - Hanya invoice dengan status BELUM lunas (sebagian / belum_bayar).
 *   - Hanya invoice yang siklus-nya punya Penugasan status SEDANG_BERTUGAS.
 *   - Satu invoice hanya boleh punya SATU notifikasi per offset per siklus
 *     (idempotent: jalan dua kali di hari yang sama tidak duplicate).
 *   - Retry: jika NotifikasiTagihan berstatus 'gagal' dan next_retry_at sudah
 *     lewat, scheduler akan coba ulang.
 */
class InvoiceReminderService
{
    public const JENIS_H3 = 'tagihan_h3';
    public const JENIS_H1 = 'tagihan_h1';
    public const JENIS_OVERDUE = 'tagihan_overdue';

    public function __construct(
        private Notifier $notifier,
        private InvoicePdfGenerator $invoicePdf,
        private TagihanService $tagihanService,
    ) {}

    /**
     * Cari invoice yang perlu dikirimi reminder hari ini, lalu kirim.
     * Dipanggil harian oleh scheduler.
     *
     * @return array{jenis: string, count: int, errors: int}
     */
    public function processDailyReminders(): array
    {
        $summary = ['h3' => 0, 'h1' => 0, 'overdue' => 0, 'errors' => 0];

        foreach ($this->candidatesForToday() as [$invoice, $jenis, $penugasanId]) {
            $result = $this->send($invoice, $jenis, $penugasanId);
            if ($result['status'] === 'terkirim') {
                $summary[$this->summaryKey($jenis)]++;
            } else {
                $summary['errors']++;
            }
        }

        return [
            'jenis' => 'daily',
            'count' => $summary['h3'] + $summary['h1'] + $summary['overdue'],
            'errors' => $summary['errors'],
        ];
    }

    /**
     * Kirim notifikasi overdue (untuk tagihan yang sudah lewat due date
     * dan survei masih berjalan). Dipisah karena AC-9 mensyaratkan ini
     * explicit & tidak menunggu due date berikutnya.
     */
    public function processOverdueReminders(): array
    {
        $count = 0; $errors = 0;
        foreach ($this->candidatesForOverdue() as [$invoice, $jenis, $penugasanId]) {
            $result = $this->send($invoice, $jenis, $penugasanId);
            $result['status'] === 'terkirim' ? $count++ : $errors++;
        }
        return ['jenis' => 'overdue', 'count' => $count, 'errors' => $errors];
    }

    /**
     * Retry semua notifikasi yang gagal dan sudah waktunya retry.
     */
    public function processRetries(): int
    {
        $recovered = 0;
        $failed = NotifikasiTagihan::where('status', NotifikasiTagihan::STATUS_GAGAL)
            ->where('attempt_count', '<', Notifier::MAX_ATTEMPTS)
            ->where(function ($q) {
                $q->whereNull('next_retry_at')->orWhere('next_retry_at', '<=', now());
            })
            ->get();

        foreach ($failed as $notif) {
            $result = $this->notifier->retry($notif);
            if ($result['status'] === 'terkirim') $recovered++;
        }
        return $recovered;
    }

    /**
     * Cari invoice yang due_date-nya H-3 atau H-1 dari hari ini.
     */
    public function candidatesForToday(): \Generator
    {
        $today = now()->startOfDay();
        foreach (config('notifikasi.reminder_offsets_days', [3, 1]) as $offset) {
            $target = $today->copy()->addDays($offset)->toDateString();
            $jenis = $offset === 3 ? self::JENIS_H3 : self::JENIS_H1;

            $invoices = Invoice::with('siklus.faskes', 'siklus.lembaga')
                ->whereIn('status', [Invoice::STATUS_BELUM_BAYAR, Invoice::STATUS_SEBAGIAN])
                ->whereDate('due_date', $target)
                ->get();

            foreach ($invoices as $invoice) {
                $penugasan = $this->activePenugasanForSiklus($invoice->siklus_id);
                if (! $penugasan) continue;
                if ($this->alreadySent($invoice->id, $jenis)) continue;

                yield [$invoice, $jenis, $penugasan->id];
            }
        }
    }

    /**
     * Cari invoice yang sudah lewat due_date DAN ada penugasan survei berjalan.
     */
    public function candidatesForOverdue(): \Generator
    {
        $today = now()->startOfDay()->toDateString();
        $invoices = Invoice::with('siklus.faskes', 'siklus.lembaga')
            ->whereIn('status', [Invoice::STATUS_BELUM_BAYAR, Invoice::STATUS_SEBAGIAN])
            ->whereDate('due_date', '<', $today)
            ->get();

        foreach ($invoices as $invoice) {
            $penugasan = $this->activePenugasanForSiklus($invoice->siklus_id);
            if (! $penugasan) continue;
            if ($this->alreadySent($invoice->id, self::JENIS_OVERDUE)) continue;

            yield [$invoice, self::JENIS_OVERDUE, $penugasan->id];
        }
    }

    private function activePenugasanForSiklus(string $siklusId): ?Penugasan
    {
        return Penugasan::where('siklus_id', $siklusId)
            ->where('jenis', Penugasan::JENIS_SURVEI)
            ->where('status', Penugasan::STATUS_SEDANG_BERTUGAS)
            ->first();
    }

    private function alreadySent(string $invoiceId, string $jenis): bool
    {
        return NotifikasiTagihan::where('jenis', $jenis)
            ->whereIn('siklus_id', function ($q) use ($invoiceId) {
                $q->select('siklus_id')->from('invoice')->where('id', $invoiceId);
            })
            ->where('status', NotifikasiTagihan::STATUS_TERKIRIM)
            ->exists();
    }

    private function send(Invoice $invoice, string $jenis, string $penugasanId): array
    {
        $faskes = $invoice->siklus->faskes;
        $daysToDue = (int) now()->startOfDay()->diffInDays(Carbon::parse($invoice->due_date), false);

        $subject = $jenis === self::JENIS_OVERDUE
            ? "Tertunda: Invoice {$invoice->nomor_invoice} sudah jatuh tempo"
            : "Pengingat: Invoice {$invoice->nomor_invoice} akan jatuh tempo";

        $message = $this->buildMessage($invoice, $jenis, $daysToDue);

        Log::info('notifikasi.tagihan.sending', [
            'invoice_id' => $invoice->id,
            'jenis' => $jenis,
            'days_to_due' => $daysToDue,
        ]);

        return $this->notifier->sendWithFallback(
            recipientPhone: $faskes->telepon ?? '',
            recipientEmail: $faskes->email ?? null,
            subject: $subject,
            message: $message,
            siklusId: $invoice->siklus_id,
            jenis: $jenis,
            penugasanId: $penugasanId,
            attachments: $this->buildAttachments($invoice),
            invoiceId: $invoice->id,
        );
    }

    /**
     * Lampiran PDF invoice untuk kanal email.
     */
    private function buildAttachments(Invoice $invoice): array
    {
        try {
            $pdf = $this->invoicePdf->generate($this->tagihanService->build($invoice));

            return [[
                'name' => $pdf['filename'],
                'content' => $pdf['content'],
                'mime' => 'application/pdf',
            ]];
        } catch (\Throwable $e) {
            Log::error('invoice.reminder.pdf_failed', [
                'invoice_id' => $invoice->id,
                'error' => $e->getMessage(),
            ]);
            return [];
        }
    }

    private function buildMessage(Invoice $invoice, string $jenis, int $daysToDue): string
    {
        $nomor = $invoice->nomor_invoice;
        $total = number_format((float) $invoice->total_tagihan, 0, ',', '.');
        $due = Carbon::parse($invoice->due_date)->translatedFormat('d F Y');
        $lembaga = $invoice->siklus?->lembaga?->nama ?? 'Lembaga Akreditasi';

        return match ($jenis) {
            self::JENIS_H3 => "Yth. {$invoice->siklus->faskes->nama},\n\n"
                . "Invoice {$nomor} sebesar Rp {$total} akan jatuh tempo dalam 3 hari ({$due}). "
                . "Mohon lakukan pembayaran tepat waktu agar proses survei tetap berjalan.\n\n"
                . "Terima kasih,\n{$lembaga}",

            self::JENIS_H1 => "Yth. {$invoice->siklus->faskes->nama},\n\n"
                . "Invoice {$nomor} sebesar Rp {$total} akan jatuh tempo BESOK ({$due}). "
                . "Mohon segera lakukan pembayaran.\n\n"
                . "Terima kasih,\n{$lembaga}",

            self::JENIS_OVERDUE => "Yth. {$invoice->siklus->faskes->nama},\n\n"
                . "Invoice {$nomor} sebesar Rp {$total} sudah jatuh tempo sejak {$due}. "
                . "Proses survei Anda saat ini sedang berjalan — mohon segera melunasi pembayaran.\n\n"
                . "Tidak ada sanksi atau pembatalan proses atas keterlambatan ini; pembayaran tetap dipantau secara terpisah.\n\n"
                . "Terima kasih,\n{$lembaga}",

            default => "Invoice {$nomor} belum dibayar.",
        };
    }

    private function summaryKey(string $jenis): string
    {
        return match ($jenis) {
            self::JENIS_H3 => 'h3',
            self::JENIS_H1 => 'h1',
            self::JENIS_OVERDUE => 'overdue',
            default => 'unknown',
        };
    }
}
