<?php

namespace App\Services\Keuangan;

use App\Models\KonfigurasiPajak;
use Illuminate\Support\Carbon;
use InvalidArgumentException;

/**
 * HonorCalculator — komponen penghitungan PPN & PPh Pasal 21 atas honor.
 *
 * Mengacu pada:
 * - PPN: tarif dari master data KonfigurasiPajak (PRD FR-5.7).
 *   Untuk honor tenaga ahli (bukan PKP), PPN tidak dipotong karena PPN
 *   adalah pajak OUTPUT yang dipungut perusahaan dari Faskes (PKP),
 *   BUKAN pajak yang dipotong dari honor penerima.
 * - PPh 21 Bukan Pegawai: DPP = 50% × bruto, tarif progresif per
 *   PP 58/2023 jo. PER-16/PJ/2023 (berlaku sejak tahun pajak 2024,
 *   menggantikan kurva 5/10/15/25/30 lama di UU PPh Pasal 17):
 *     DPP ≤ 60.000.000         → 5%
 *     DPP 60.000.001 - 250jt   → 15%
 *     DPP 250.000.001 - 500jt  → 25%
 *     DPP 500.000.001 - 5 M    → 30%
 *     DPP > 5.000.000.000      → 35%
 *
 * Catatan: tiap pembayaran honor diperlakukan sebagai transaksi tunggal
 * (bukan kumulatif bulanan), karena merupakan fee/imbalan jasa bukan
 * penghasilan teratur bulanan. Akumulasi PTKP/bracket tahunan tidak
 * diterapkan di sini — Tenaga Ahli non-Pegawai umumnya menerima
 * honor tidak rutin.
 *
 * INVARIANT (AC-7):
 *   nominal_neto = nominal_bruto - potongan_ppn - potongan_pph
 */
class HonorCalculator
{
    /**
     * Hasil kalkulasi honor.
     *
     * @property-read float $bruto       Nominal bruto honor (basis hitung).
     * @property-read float $potongan_ppn Potongan PPN yang ditagihkan/dipungut.
     * @property-read float $potongan_pph Potongan PPh 21 Bukan Pegawai yang dipotong.
     * @property-read float $nominal_neto Nominal neto yang dibayarkan ke penerima.
     * @property-read array $pajak       Snapshot tarif (id+tarif) yang dipakai.
     */
    public function hitungHonor(
        float $nominalBruto,
        ?Carbon $tanggal = null,
        ?KonfigurasiPajak $ppnOverride = null,
        ?KonfigurasiPajak $pphOverride = null,
    ): array {
        if ($nominalBruto < 0) {
            throw new InvalidArgumentException('Nominal bruto tidak boleh negatif.');
        }

        $tanggal ??= now();

        $ppn = $ppnOverride ?? KonfigurasiPajak::activeRate(KonfigurasiPajak::JENIS_PPN, $tanggal);
        $pph = $pphOverride ?? KonfigurasiPajak::activeRate(KonfigurasiPajak::JENIS_PPH21, $tanggal);

        // PPN tidak dipotong dari honor — PPN adalah pajak OUTPUT yang dipungut
        // oleh Lembaga dari tagihan Faskes (invoice). Bruto yang dibayarkan
        // ke surveyor/tenaga ahli TIDAK berkurang karena PPN. (Penerima honor
        // adalah individu/non-PKP, tidak memungut PPN.)
        // Konfigurasi PPN tetap di-load untuk audit snapshot jika ada perubahan
        // regulasi (mis. 11% → 12% di 2025).
        $potonganPpn = 0.0;

        // PPh 21 Bukan Pegawai: DPP = 50% × bruto, tarif progresif PP 58/2023
        $potonganPph = $this->hitungPPhProgresif($nominalBruto);

        // neto = bruto - PPh (PPN tidak mengurangi honor)
        $nominalNeto = round($nominalBruto - $potonganPph, 2);

        return [
            'bruto' => round($nominalBruto, 2),
            'potongan_ppn' => $potonganPpn,
            'potongan_pph' => $potonganPph,
            'nominal_neto' => $nominalNeto,
            'pajak' => [
                'ppn' => $ppn ? [
                    'id' => $ppn->id,
                    'tarif_persen' => $ppn->tarifFloat(),
                    'berlaku_sejak' => $ppn->berlaku_sejak?->toDateString(),
                    'note' => 'Snapshot saja — PPN tidak dipotong dari honor.',
                ] : null,
                'pph' => [
                    // PPh 21 dihitung progresif (PP 58/2023), bukan dari
                    // master KonfigurasiPajak. Snapshot 'tarif_persen'
                    // dilaporkan sebagai effective rate (PPh / bruto × 100)
                    // untuk konsistensi dengan output BP21 <Rate>.
                    'tarif_persen' => $nominalBruto > 0
                        ? round(($potonganPph / $nominalBruto) * 100, 7)
                        : 0.0,
                    'berlaku_sejak' => $pph?->berlaku_sejak?->toDateString(),
                    'metode' => 'progresif_bukan_pegawai_pp58_2023',
                    'dpp_persen' => 50,
                    'brackets' => [
                        ['max_dpp' => 60_000_000, 'tarif' => 5],
                        ['max_dpp' => 250_000_000, 'tarif' => 15],
                        ['max_dpp' => 500_000_000, 'tarif' => 25],
                        ['max_dpp' => 5_000_000_000, 'tarif' => 30],
                        ['max_dpp' => null, 'tarif' => 35],
                    ],
                ],
            ],
        ];
    }

    /**
     * Hitung PPh Pasal 21 Bukan Pegawai dengan DPP = 50% × bruto
     * dan tarif progresif per PP 58/2023 jo. PER-16/PJ/2023
     * (menggantikan kurva lama UU PPh Pasal 17).
     *
     * Bracket (DPP = 50% × bruto):
     *   0          - 60.000.000    → 5%
     *   60.000.001 - 250.000.000   → 15%
     *   250.000.001 - 500.000.000  → 25%
     *   500.000.001 - 5.000.000.000 → 30%
     *   > 5.000.000.000            → 35%
     *
     * Karena honor bersifat one-time, DPP dihitung per transaksi
     * tanpa akumulasi tahunan.
     */
    private function hitungPPhProgresif(float $bruto): float
    {
        $dpp = $bruto * 0.5; // DPP = 50% × bruto

        $pph = 0.0;

        if ($dpp <= 60_000_000) {
            $pph = $dpp * 0.05;
        } elseif ($dpp <= 250_000_000) {
            $pph = 60_000_000 * 0.05;
            $sisa = $dpp - 60_000_000;
            $pph += $sisa * 0.15;
        } elseif ($dpp <= 500_000_000) {
            $pph = 60_000_000 * 0.05;
            $pph += (250_000_000 - 60_000_000) * 0.15;
            $sisa = $dpp - 250_000_000;
            $pph += $sisa * 0.25;
        } elseif ($dpp <= 5_000_000_000) {
            $pph = 60_000_000 * 0.05;
            $pph += (250_000_000 - 60_000_000) * 0.15;
            $pph += (500_000_000 - 250_000_000) * 0.25;
            $sisa = $dpp - 500_000_000;
            $pph += $sisa * 0.30;
        } else {
            $pph = 60_000_000 * 0.05;
            $pph += (250_000_000 - 60_000_000) * 0.15;
            $pph += (500_000_000 - 250_000_000) * 0.25;
            $pph += (5_000_000_000 - 500_000_000) * 0.30;
            $sisa = $dpp - 5_000_000_000;
            $pph += $sisa * 0.35;
        }

        return round($pph, 2);
    }
}
