<?php

namespace App\Console\Commands;

use App\Models\BuktiPembayaran;
use App\Models\HutangPajak;
use App\Models\PembayaranHonor;
use App\Services\Keuangan\SettlementJournalService;
use Illuminate\Console\Command;

/**
 * Artisan command untuk backfill jurnal settlement AP/AR dari
 * bukti_pembayaran, pembayaran_honor, dan hutang_pajak yang sudah
 * ada di sistem namun belum punya jurnal settlement.
 *
 * Idempotent — aman dijalankan berulang kali.
 */
class SettlementRebuildCommand extends Command
{
    protected $signature = 'settlement:rebuild
                            {--scope=all : all|ar|ap_honor|ap_pajak}
                            {--dry-run : Tampilkan rencana tanpa membuat jurnal}';

    protected $description = 'Backfill jurnal settlement AP/AR yang hilang (idempotent)';

    public function handle(SettlementJournalService $svc): int
    {
        $scope = $this->option('scope');
        $dryRun = (bool) $this->option('dry-run');

        $created = 0;
        $skipped = 0;
        $errors = 0;

        if ($scope === 'all' || $scope === 'ar') {
            $buktiList = BuktiPembayaran::where('status_verifikasi', BuktiPembayaran::STATUS_DITERIMA)->get();
            $this->info("[AR] {$buktiList->count()} bukti diterima ditemukan.");
            foreach ($buktiList as $bukti) {
                if ($svc->existingJurnal(SettlementJournalService::REF_PIUTANG_SETTLEMENT, $bukti->id)) {
                    $skipped++;
                    continue;
                }
                if ($dryRun) {
                    $this->line("  [dry-run] akan buat jurnal untuk bukti #{$bukti->id} (nominal: {$bukti->nominal})");
                    continue;
                }
                try {
                    $svc->recordArSettlement($bukti, null, null);
                    $created++;
                    $this->line("  ✓ Bukti #{$bukti->id} → jurnal dibuat");
                } catch (\Throwable $e) {
                    $errors++;
                    $this->error("  ✗ Bukti #{$bukti->id}: {$e->getMessage()}");
                }
            }
        }

        if ($scope === 'all' || $scope === 'ap_honor') {
            $pembayaranList = PembayaranHonor::where('status', PembayaranHonor::STATUS_DISETUJUI)->get();
            $this->info("[AP Honor] {$pembayaranList->count()} pembayaran disetujui ditemukan.");
            foreach ($pembayaranList as $p) {
                if ($svc->existingJurnal(SettlementJournalService::REF_AP_HONOR_SETTLEMENT, $p->id)) {
                    $skipped++;
                    continue;
                }
                if ($dryRun) {
                    $this->line("  [dry-run] akan buat jurnal untuk pembayaran #{$p->nomor_pembayaran} (total: {$p->total_nominal})");
                    continue;
                }
                try {
                    $svc->recordApHonorSettlement($p, null, null);
                    $created++;
                    $this->line("  ✓ Pembayaran #{$p->nomor_pembayaran} → jurnal dibuat");
                } catch (\Throwable $e) {
                    $errors++;
                    $this->error("  ✗ Pembayaran #{$p->id}: {$e->getMessage()}");
                }
            }
        }

        if ($scope === 'all' || $scope === 'ap_pajak') {
            $hutangList = HutangPajak::where('status', HutangPajak::STATUS_DIBAYAR)->get();
            $this->info("[AP Pajak] {$hutangList->count()} hutang pajak dibayar ditemukan.");
            foreach ($hutangList as $h) {
                if ($svc->existingJurnal(SettlementJournalService::REF_AP_PAJAK_SETTLEMENT, $h->id)) {
                    $skipped++;
                    continue;
                }
                if ($dryRun) {
                    $this->line("  [dry-run] akan buat jurnal untuk hutang #{$h->id} (jumlah: {$h->jumlah_pajak})");
                    continue;
                }
                try {
                    $svc->recordApPajakSettlement($h, null, null);
                    $created++;
                    $this->line("  ✓ Hutang #{$h->id} → jurnal dibuat");
                } catch (\Throwable $e) {
                    $errors++;
                    $this->error("  ✗ Hutang #{$h->id}: {$e->getMessage()}");
                }
            }
        }

        $this->newLine();
        $this->info("Ringkasan: {$created} jurnal baru, {$skipped} dilewati (sudah ada), {$errors} error.");

        return $errors > 0 ? self::FAILURE : self::SUCCESS;
    }
}
