<?php

namespace App\Console\Commands;

use App\Models\Penugasan;
use App\Services\Verifikasi\RekomendasiQueueService;
use Illuminate\Console\Command;

/**
 * Backfill antrean rekomendasi untuk penugasan verifikasi yang sudah
 * selesai sebelum alur ini otomatis dibuat.
 *
 * Idempotent — aman dijalankan berulang kali.
 */
class SinkronRekomendasiCommand extends Command
{
    protected $signature = 'rekomendasi:sinkron
                            {--dry-run : Tampilkan rencana tanpa menyimpan}';

    protected $description = 'Buat laporan verifikasi (antrean rekomendator) untuk penugasan verifikasi yang sudah selesai';

    public function handle(RekomendasiQueueService $svc): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $penugasanVerifikasi = Penugasan::where('jenis', Penugasan::JENIS_VERIFIKASI)
            ->where('status', Penugasan::STATUS_SELESAI)
            ->orderBy('tanggal_selesai')
            ->get();

        if ($penugasanVerifikasi->isEmpty()) {
            $this->info('Tidak ada penugasan verifikasi yang selesai.');

            return self::SUCCESS;
        }

        $dibuat = 0;
        $ada = 0;
        $gagal = 0;

        foreach ($penugasanVerifikasi as $penugasan) {
            $sudahAda = \App\Models\LaporanVerifikasi::where('verifikasi_penugasan_id', $penugasan->id)->exists();

            if ($dryRun) {
                $this->line(sprintf(
                    '  [%s] siklus %s — %s',
                    $sudahAda ? 'ada' : 'dibuat',
                    $penugasan->siklus_id,
                    $penugasan->tenagaAhli?->nama ?? '-',
                ));
                $sudahAda ? $ada++ : $dibuat++;
                continue;
            }

            try {
                $lv = $svc->ensureLaporanVerifikasi($penugasan);
                if ($lv) {
                    $dibuat++;
                    $this->info("Laporan verifikasi dibuat untuk penugasan {$penugasan->id} (status: {$lv->status_rekomendasi}).");
                } else {
                    $ada++;
                    $this->warn("Penugasan {$penugasan->id} dilewati — laporan survei belum tersedia.");
                }
            } catch (\Throwable $e) {
                $gagal++;
                $this->error("Penugasan {$penugasan->id} gagal: {$e->getMessage()}");
            }
        }

        $this->info("Selesai. Dibuat: {$dibuat}, dilewati: {$ada}, gagal: {$gagal}.");

        return $gagal > 0 ? self::FAILURE : self::SUCCESS;
    }
}
