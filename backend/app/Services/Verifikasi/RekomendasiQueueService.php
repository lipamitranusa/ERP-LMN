<?php

namespace App\Services\Verifikasi;

use App\Models\AkunPengguna;
use App\Models\Laporan;
use App\Models\LaporanVerifikasi;
use App\Models\Penugasan;
use App\Models\SiklusAkreditasi;
use Illuminate\Support\Str;

/**
 * Bridging service: penugasan verifikasi selesai → antrean rekomendasi.
 *
 * Jalur UI yang dipakai saat ini (PenugasanController::selesai) hanya
 * menandai penugasan selesai dan menaikkan tahap siklus — tidak pernah
 * membuat baris `laporan_verifikasi`. Akibatnya menu Rekomendasi selalu
 * kosong karena tabel itu tetap kosong.
 *
 * Service ini menutup celah tersebut: begitu verifikasi dianggap selesai,
 * laporan verifikasi dibuat berstatus 'menunggu' supaya rekomendator bisa
 * menyetujui atau menolak.
 *
 * Idempotent — aman dipanggil berulang kali.
 */
class RekomendasiQueueService
{
    public const TIPE_LAPORAN_SURVEI = 'survei';

    /**
     * Pastikan penugasan survei punya baris `laporan` (laporan hasil survei).
     * Tabel ini adalah sumber dokumen surveior pada halaman Rekomendasi.
     */
    public function ensureLaporanSurvei(Penugasan $penugasan): ?Laporan
    {
        if ($penugasan->jenis !== Penugasan::JENIS_SURVEI) {
            return null;
        }

        $existing = Laporan::where('penugasan_id', $penugasan->id)->first();
        if ($existing) {
            return $existing;
        }

        return Laporan::create([
            'id' => (string) Str::uuid(),
            'penugasan_id' => $penugasan->id,
            'tipe' => self::TIPE_LAPORAN_SURVEI,
            'submitted_at' => now(),
        ]);
    }

    /**
     * Pastikan siklus punya laporan verifikasi berstatus 'menunggu' sehingga
     * muncul di antrean rekomendator.
     *
     * Rekomendasi yang sudah diputuskan (disetujui/ditolak) tidak ditimpa.
     */
    public function ensureLaporanVerifikasi(Penugasan $penugasanVerifikasi, ?AkunPengguna $user = null): ?LaporanVerifikasi
    {
        if ($penugasanVerifikasi->jenis !== Penugasan::JENIS_VERIFIKASI) {
            return null;
        }

        $siklus = $penugasanVerifikasi->siklus;
        if (! $siklus) {
            return null;
        }

        $laporanSurvei = $this->laporanSurveiUtama($siklus);
        if (! $laporanSurvei) {
            return null;
        }

        $existing = LaporanVerifikasi::where('laporan_id', $laporanSurvei->id)->first();
        if ($existing) {
            // Rekomendasi yang sudah diputuskan (disetujui/ditolak) tidak
            // boleh dipindah ke penugasan verifikasi lain.
            $sudahDiputuskan = in_array($existing->status_rekomendasi, [
                LaporanVerifikasi::STATUS_REKOMENDASI_DISETUJUI,
                LaporanVerifikasi::STATUS_REKOMENDASI_DITOLAK,
            ], true);

            if (! $sudahDiputuskan) {
                // Laporan verifikasi yang masih draft (dibuat lewat
                // AdminVerifikasiController) difinalisasi di sini supaya
                // masuk antrean rekomendator.
                $existing->forceFill([
                    'verifikasi_penugasan_id' => $penugasanVerifikasi->id,
                    'status_final' => LaporanVerifikasi::STATUS_FINAL,
                    'finalized_at' => $existing->finalized_at ?? now(),
                    'difinalisasi_oleh' => $existing->difinalisasi_oleh ?? $user?->id,
                    'status_rekomendasi' => LaporanVerifikasi::STATUS_REKOMENDASI_MENUNGGU,
                ])->save();
            }

            return $existing;
        }

        return LaporanVerifikasi::create([
            'id' => (string) Str::uuid(),
            'laporan_id' => $laporanSurvei->id,
            'verifikasi_penugasan_id' => $penugasanVerifikasi->id,
            'status_final' => LaporanVerifikasi::STATUS_FINAL,
            'finalized_at' => now(),
            'difinalisasi_oleh' => $user?->id,
            'status_rekomendasi' => LaporanVerifikasi::STATUS_REKOMENDASI_MENUNGGU,
        ]);
    }

    /**
     * Laporan survei yang dipakai sebagai sumber dokumen surveior.
     * Prioritaskan penugasan yang sudah mengunggah laporan pengerjaan.
     */
    private function laporanSurveiUtama(SiklusAkreditasi $siklus): ?Laporan
    {
        $penugasanSurvei = Penugasan::where('siklus_id', $siklus->id)
            ->where('jenis', Penugasan::JENIS_SURVEI)
            ->where('status', Penugasan::STATUS_SELESAI)
            ->orderBy('tanggal_selesai')
            ->get();

        if ($penugasanSurvei->isEmpty()) {
            return null;
        }

        foreach ($penugasanSurvei as $p) {
            $this->ensureLaporanSurvei($p);
        }

        $terpilih = $penugasanSurvei->first(fn ($p) => $p->laporanPengerjaan()->exists())
            ?? $penugasanSurvei->first();

        return Laporan::where('penugasan_id', $terpilih->id)->first();
    }
}
