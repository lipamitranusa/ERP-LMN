<?php

namespace App\Console\Commands;

use App\Services\Notification\InvoiceReminderService;
use Illuminate\Console\Command;

/**
 * Scheduler harian untuk invoice reminder (NFR-1, FR-5.4a, AC-9).
 *
 *   H-3 dan H-1: cari invoice yang due_date-nya dalam 3 / 1 hari,
 *                dan ada Penugasan Survei yang sedang berjalan.
 *   Overdue:    invoice yang lewat due_date + survei masih berjalan.
 *   Retry:      kirim ulang notifikasi yang gagal dan sudah waktunya retry.
 *
 * Idempotent: aman dipanggil beberapa kali per hari — di-skip via
 * tabel notifikasi_tagihan (satu invoice hanya punya satu reminder
 * per jenis sampai due_date berganti).
 *
 * Setup di routes/console.php (sudah):
 *   $schedule->command('notifikasi:tagihan:harian')->dailyAt('08:00');
 */
class ProcessInvoiceReminders extends Command
{
    protected $signature = 'notifikasi:tagihan:harian
                            {--only-h3-h1 : Hanya kirim H-3 / H-1, skip overdue + retry}
                            {--only-overdue : Hanya kirim overdue}
                            {--only-retry : Hanya proses retry}';

    protected $description = 'Kirim pengingat tagihan H-3/H-1/overdue, plus retry notifikasi gagal.';

    public function handle(InvoiceReminderService $service): int
    {
        $flags = $this->option('only-h3-h1') || $this->option('only-overdue') || $this->option('only-retry');

        $start = microtime(true);
        $totalSent = 0; $totalErrors = 0;

        if (! $flags || $this->option('only-h3-h1')) {
            $r = $service->processDailyReminders();
            $totalSent += $r['count']; $totalErrors += $r['errors'];
            $this->info(sprintf(
                '[H-3/H-1] terkirim: %d, gagal: %d',
                $r['count'], $r['errors']
            ));
        }

        if (! $flags || $this->option('only-overdue')) {
            $r = $service->processOverdueReminders();
            $totalSent += $r['count']; $totalErrors += $r['errors'];
            $this->info(sprintf(
                '[Overdue] terkirim: %d, gagal: %d',
                $r['count'], $r['errors']
            ));
        }

        if (! $flags || $this->option('only-retry')) {
            $recovered = $service->processRetries();
            $this->info(sprintf('[Retry] recovered: %d', $recovered));
        }

        $elapsed = round((microtime(true) - $start) * 1000);
        $this->info(sprintf('Selesai dalam %d ms. Total terkirim: %d, gagal: %d', $elapsed, $totalSent, $totalErrors));

        return self::SUCCESS;
    }
}
