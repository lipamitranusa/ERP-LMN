<?php

namespace App\Services\Keuangan;

use App\Models\Invoice;
use App\Models\LedgerEntry;
use App\Models\SiklusAkreditasi;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * ReconciliationService — Dasbor rekonsiliasi laba/rugi per Faskes.
 *
 * Mengacu pada PRD FR-5.4: Dasbor eksekutif bagi Direktur untuk
 * rekonsiliasi proyek — Pemasukan − honor Surveior & Verifikator.
 *
 * Sumber kebenaran rekonsiliasi:
 *   - Pemasukan: sum(nominal_neto) LedgerEntry tipe piutang_lunas
 *                dikurangi tipe penyesuaian_pks (negatif) dan refund.
 *   - Honor Surveior: sum(nominal_bruto) LedgerEntry tipe ap_honor_surveior
 *   - Honor Verifikator: sum(nominal_bruto) LedgerEntry tipe ap_honor_verifikator
 *   - Laba proyek: Pemasukan − Σ(honor Surveior + honor Verifikator)
 */
class ReconciliationService
{
    /**
     * Ringkasan KPI untuk kartu dasbor Direktur.
     */
    public function kpi(array $filters = []): array
    {
        $tanggal = $this->resolveTanggal($filters);

        $pemasukan = $this->pemasukanTotal($tanggal);
        $honorSurveior = $this->honorTotal(LedgerEntry::TIPE_AP_HONOR_SURVEIOR, $tanggal);
        $honorVerifikator = $this->honorTotal(LedgerEntry::TIPE_AP_HONOR_VERIFIKATOR, $tanggal);
        $potonganPpn = $this->pajakTotal('potongan_ppn', $tanggal);
        $potonganPph = $this->pajakTotal('potongan_pph', $tanggal);

        $totalHonor = $honorSurveior + $honorVerifikator;

        return [
            'periode' => $tanggal ? [
                'dari' => $tanggal['dari']->toDateString(),
                'sampai' => $tanggal['sampai']->toDateString(),
            ] : null,
            'pemasukan' => round($pemasukan, 2),
            'honor_surveior_bruto' => round($honorSurveior, 2),
            'honor_verifikator_bruto' => round($honorVerifikator, 2),
            'honor_total_bruto' => round($totalHonor, 2),
            'potongan_ppn' => round($potonganPpn, 2),
            'potongan_pph' => round($potonganPph, 2),
            'laba_proyek' => round($pemasukan - $totalHonor, 2),
            'margin_persen' => $pemasukan > 0
                ? round(($pemasukan - $totalHonor) / $pemasukan * 100, 2)
                : 0.0,
            'jumlah_siklus_aktif' => SiklusAkreditasi::whereIn('status', ['aktif', 'verifikasi', 'selesai'])
                ->when($tanggal, function ($q) use ($tanggal) {
                    $q->whereBetween('tanggal_pengajuan', [$tanggal['dari']->toDateString(), $tanggal['sampai']->toDateString()]);
                })
                ->count(),
        ];
    }

    /**
     * Rekonsiliasi per Faskes (satu baris = satu Faskes, agregat seluruh siklus).
     * Output sudah diurut descending by laba_proyek.
     */
    public function perFaskes(array $filters = []): array
    {
        $tanggal = $this->resolveTanggal($filters);

        $rows = DB::table('siklus_akreditasi')
            ->join('faskes', 'faskes.id', '=', 'siklus_akreditasi.faskes_id')
            ->leftJoin('invoice', 'invoice.siklus_id', '=', 'siklus_akreditasi.id')
            ->leftJoin('ledger_entries as le_pemasukan', function ($join) {
                $join->on('le_pemasukan.siklus_id', '=', 'siklus_akreditasi.id')
                    ->whereIn('le_pemasukan.tipe', [
                        LedgerEntry::TIPE_PIUTANG_LUNAS,
                        LedgerEntry::TIPE_PENYESUAIAN_PKS,
                        LedgerEntry::TIPE_REFUND,
                    ]);
            })
            ->leftJoin('ledger_entries as le_surveior', function ($join) {
                $join->on('le_surveior.siklus_id', '=', 'siklus_akreditasi.id')
                    ->where('le_surveior.tipe', '=', LedgerEntry::TIPE_AP_HONOR_SURVEIOR);
            })
            ->leftJoin('ledger_entries as le_verifikator', function ($join) {
                $join->on('le_verifikator.siklus_id', '=', 'siklus_akreditasi.id')
                    ->where('le_verifikator.tipe', '=', LedgerEntry::TIPE_AP_HONOR_VERIFIKATOR);
            })
            ->when($lembagaId = session('lembaga_id'), function ($q) use ($lembagaId) {
                $q->where('siklus_akreditasi.lembaga_id', $lembagaId);
            })
            ->when($tanggal, function ($q) use ($tanggal) {
                $q->whereBetween('siklus_akreditasi.tanggal_pengajuan', [
                    $tanggal['dari']->toDateString(),
                    $tanggal['sampai']->toDateString(),
                ]);
            })
            ->groupBy('faskes.id', 'faskes.nama', 'faskes.tipe_faskes')
            ->select([
                'faskes.id as faskes_id',
                'faskes.nama as faskes_nama',
                'faskes.tipe_faskes',
                DB::raw('COUNT(DISTINCT siklus_akreditasi.id) as jumlah_siklus'),
                DB::raw('COALESCE(SUM(le_pemasukan.nominal_neto), 0) as total_pemasukan'),
                DB::raw('COALESCE(SUM(le_surveior.nominal_bruto), 0) as total_honor_surveior'),
                DB::raw('COALESCE(SUM(le_verifikator.nominal_bruto), 0) as total_honor_verifikator'),
                DB::raw('COALESCE(SUM(le_surveior.potongan_ppn), 0) + COALESCE(SUM(le_verifikator.potongan_ppn), 0) as total_potongan_ppn'),
                DB::raw('COALESCE(SUM(le_surveior.potongan_pph), 0) + COALESCE(SUM(le_verifikator.potongan_pph), 0) as total_potongan_pph'),
            ])
            ->orderByDesc(DB::raw('COALESCE(SUM(le_pemasukan.nominal_neto), 0) - COALESCE(SUM(le_surveior.nominal_bruto), 0) - COALESCE(SUM(le_verifikator.nominal_bruto), 0)'))
            ->limit(100)
            ->get();

        return $rows->map(function ($row) {
            $pemasukan = (float) $row->total_pemasukan;
            $honorSurveior = (float) $row->total_honor_surveior;
            $honorVerifikator = (float) $row->total_honor_verifikator;
            $totalHonor = $honorSurveior + $honorVerifikator;
            $row->total_pemasukan = round($pemasukan, 2);
            $row->total_honor_surveior = round($honorSurveior, 2);
            $row->total_honor_verifikator = round($honorVerifikator, 2);
            $row->total_honor = round($totalHonor, 2);
            $row->total_potongan_ppn = round((float) $row->total_potongan_ppn, 2);
            $row->total_potongan_pph = round((float) $row->total_potongan_pph, 2);
            $row->laba_proyek = round($pemasukan - $totalHonor, 2);
            $row->margin_persen = $pemasukan > 0
                ? round(($pemasukan - $totalHonor) / $pemasukan * 100, 2)
                : 0.0;
            return $row;
        })->all();
    }

    /**
     * Snapshot lengkap untuk dasbor Direktur.
     */
    public function snapshot(array $filters = []): array
    {
        return [
            'kpi' => $this->kpi($filters),
            'per_faskes' => $this->perFaskes($filters),
        ];
    }

    // ─── helpers ───────────────────────────────────────────────────────────

    private function resolveTanggal(array $filters): ?array
    {
        if (empty($filters['dari']) || empty($filters['sampai'])) {
            return null; // sepanjang waktu
        }

        return [
            'dari' => Carbon::parse($filters['dari'])->startOfDay(),
            'sampai' => Carbon::parse($filters['sampai'])->endOfDay(),
        ];
    }

    private function pemasukanTotal(?array $tanggal): float
    {
        // piutang_lunas = pemasukan (+), penyesuaian_pks = reversal (-), refund = (-)
        $q = LedgerEntry::whereIn('tipe', [
            LedgerEntry::TIPE_PIUTANG_LUNAS,
            LedgerEntry::TIPE_PENYESUAIAN_PKS,
            LedgerEntry::TIPE_REFUND,
        ]);

        if ($tanggal) {
            $q->whereBetween('created_at', [$tanggal['dari'], $tanggal['sampai']]);
        }

        return (float) $q->sum('nominal_neto');
    }

    private function honorTotal(string $tipe, ?array $tanggal): float
    {
        $q = LedgerEntry::where('tipe', $tipe);
        if ($tanggal) {
            $q->whereBetween('created_at', [$tanggal['dari'], $tanggal['sampai']]);
        }
        return (float) $q->sum('nominal_bruto');
    }

    private function pajakTotal(string $kolom, ?array $tanggal): float
    {
        $q = LedgerEntry::whereIn('tipe', [
            LedgerEntry::TIPE_AP_HONOR_SURVEIOR,
            LedgerEntry::TIPE_AP_HONOR_VERIFIKATOR,
        ]);
        if ($tanggal) {
            $q->whereBetween('created_at', [$tanggal['dari'], $tanggal['sampai']]);
        }
        return (float) $q->sum($kolom);
    }
}
