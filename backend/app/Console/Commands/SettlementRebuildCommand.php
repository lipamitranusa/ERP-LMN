<?php

namespace App\Console\Commands;

use App\Models\BuktiPembayaran;
use App\Models\HutangPajak;
use App\Models\Invoice;
use App\Models\LedgerEntry;
use App\Models\PembayaranHonor;
use App\Services\Keuangan\AccrualJournalService;
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
                            {--scope=all : all|ar|ap_honor|ap_pajak|akrual}
                            {--dry-run : Tampilkan rencana tanpa membuat jurnal}';

    protected $description = 'Backfill jurnal settlement AP/AR dan jurnal akrual yang hilang (idempotent)';

    public function handle(
        SettlementJournalService $svc,
        AccrualJournalService $accrual,
    ): int {
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

        if ($scope === 'all' || $scope === 'akrual') {
            $this->rebuildAkrual($accrual, $dryRun, $created, $skipped, $errors);
        }

        $this->newLine();
        $this->info("Ringkasan: {$created} jurnal baru, {$skipped} dilewati (sudah ada), {$errors} error.");

        return $errors > 0 ? self::FAILURE : self::SUCCESS;
    }

    /**
     * Backfill jurnal akrual: pengakuan pendapatan (invoice terbit) dan
     * beban honor (ledger entry honor), plus pembalik pendapatan untuk
     * invoice yang di-supersede.
     */
    private function rebuildAkrual(
        AccrualJournalService $accrual,
        bool $dryRun,
        int &$created,
        int &$skipped,
        int &$errors,
    ): void {
        $invoiceList = Invoice::where('total_tagihan', '>', 0)
            ->where('status', '!=', Invoice::STATUS_SUPERSEDED)
            ->get();
        $this->info("[Akrual] {$invoiceList->count()} invoice aktif ditemukan.");

        foreach ($invoiceList as $invoice) {
            if ($accrual->sudahAdaJurnalPendapatan($invoice)) {
                $skipped++;
                continue;
            }
            if ($dryRun) {
                $this->line("  [dry-run] akan buat jurnal pendapatan untuk invoice {$invoice->nomor_invoice} (total: {$invoice->total_tagihan})");
                continue;
            }
            try {
                $accrual->recordPendapatanInvoice($invoice);
                $created++;
                $this->line("  ✓ Invoice {$invoice->nomor_invoice} → jurnal pendapatan dibuat");
            } catch (\Throwable $e) {
                $errors++;
                $this->error("  ✗ Invoice {$invoice->nomor_invoice}: {$e->getMessage()}");
            }
        }

        $entryList = LedgerEntry::whereIn('tipe', [
            LedgerEntry::TIPE_AP_HONOR_SURVEIOR,
            LedgerEntry::TIPE_AP_HONOR_VERIFIKATOR,
            LedgerEntry::TIPE_AP_HONOR_REKOMENDATOR,
        ])->get();
        $this->info("[Akrual] {$entryList->count()} entry honor ditemukan.");

        foreach ($entryList as $entry) {
            if ($accrual->sudahAdaJurnalBebanHonor($entry)) {
                $skipped++;
                continue;
            }
            if ($dryRun) {
                $this->line("  [dry-run] akan buat jurnal beban honor untuk entry {$entry->id} (bruto: {$entry->nominal_bruto})");
                continue;
            }
            try {
                $accrual->recordBebanHonor($entry);
                $created++;
                $this->line("  ✓ Entry honor {$entry->id} → jurnal beban dibuat");
            } catch (\Throwable $e) {
                $errors++;
                $this->error("  ✗ Entry honor {$entry->id}: {$e->getMessage()}");
            }
        }

        // Invoice superseded → pembalik pengakuan pendapatan.
        $superseded = Invoice::where('status', Invoice::STATUS_SUPERSEDED)->get();
        foreach ($superseded as $invoice) {
            if (! $accrual->sudahAdaJurnalPendapatan($invoice)) {
                continue;
            }
            if ($accrual->sudahAdaJurnalPembalikPendapatan($invoice)) {
                $skipped++;
                continue;
            }
            if ($dryRun) {
                $this->line("  [dry-run] akan buat jurnal pembalik pendapatan untuk invoice {$invoice->nomor_invoice}");
                continue;
            }
            try {
                $accrual->reversePendapatanInvoice($invoice);
                $created++;
                $this->line("  ✓ Invoice {$invoice->nomor_invoice} → jurnal pembalik pendapatan dibuat");
            } catch (\Throwable $e) {
                $errors++;
                $this->error("  ✗ Invoice {$invoice->nomor_invoice}: {$e->getMessage()}");
            }
        }
    }
}
