<?php

namespace App\Services\Keuangan;

use App\Models\BuktiPembayaran;
use App\Models\Faskes;
use App\Models\Invoice;
use App\Models\SiklusAkreditasi;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Dasbor Piutang — berjalan independen dari alur penugasan.
 *
 * PRD v2.2 (catatan risiko 5.2): "Surat Tugas kini bisa terbit sebelum Invoice
 * lunas, namun risiko piutang tak tertagih tetap dimitigasi lewat dasbor
 * piutang real-time (FR-5.4)." Dasbor ini adalah satu-satunya sumber
 * kebenaran status piutang Faskes — tidak bergantung pada status
 * penugasan / survei.
 *
 * Invariant: hanya Invoice dengan status BUKAN 'lunas' & BUKAN 'refunded'
 * yang dihitung sebagai piutang aktif. Invoice superseded dihitung
 * terpisah (historis).
 */
class PiutangService
{
    /**
     * Ringkasan untuk kartu KPI di header dasbor.
     */
    public function kpiSummary(): array
    {
        $today = Carbon::today();

        // Total piutang aktif (belum lunas, bukan refunded/superseded)
        $activeInvoices = Invoice::whereNotIn('status', [
            Invoice::STATUS_LUNAS, Invoice::STATUS_REFUNDED, Invoice::STATUS_SUPERSEDED,
        ])->get(['id', 'total_tagihan', 'status', 'due_date']);

        $totalPiutang = 0.0;
        $totalDiterima = 0.0;
        $countJatuhTempo = 0;
        $countSebagian = 0;
        $countBelumBayar = 0;
        $nilaiJatuhTempo = 0.0;

        foreach ($activeInvoices as $inv) {
            $tagihan = (float) $inv->total_tagihan;
            $diterima = (float) $inv->buktiPembayaran()
                ->where('status_verifikasi', BuktiPembayaran::STATUS_DITERIMA)
                ->sum('nominal');
            $sisa = max(0, $tagihan - $diterima);

            $totalPiutang += $sisa;
            $totalDiterima += $diterima;

            $isJatuhTempo = $inv->due_date && Carbon::parse($inv->due_date)->lt($today);
            if ($isJatuhTempo && $sisa > 0) {
                $countJatuhTempo++;
                $nilaiJatuhTempo += $sisa;
            }
            if ($inv->status === Invoice::STATUS_SEBAGIAN) $countSebagian++;
            if ($inv->status === Invoice::STATUS_BELUM_BAYAR) $countBelumBayar++;
        }

        $totalLunasBulanIni = (float) Invoice::where('status', Invoice::STATUS_LUNAS)
            ->whereMonth('tanggal_lunas', $today->month)
            ->whereYear('tanggal_lunas', $today->year)
            ->sum('total_tagihan');

        return [
            'total_piutang_aktif' => round($totalPiutang, 2),
            'total_diterima_aktif' => round($totalDiterima, 2),
            'jumlah_invoice_aktif' => $activeInvoices->count(),
            'jumlah_jatuh_tempo' => $countJatuhTempo,
            'nilai_jatuh_tempo' => round($nilaiJatuhTempo, 2),
            'jumlah_sebagian' => $countSebagian,
            'jumlah_belum_bayar' => $countBelumBayar,
            'total_lunas_bulan_ini' => round($totalLunasBulanIni, 2),
            'tanggal_snapshot' => $today->toDateString(),
        ];
    }

    /**
     * Age bucket — pengelompokan piutang berdasarkan berapa hari
     * melewati due date. Standar akuntansi: 0-30, 31-60, 61-90, >90.
     */
    public function agingBuckets(): array
    {
        $today = Carbon::today();
        $activeInvoices = Invoice::whereIn('status', [
            Invoice::STATUS_BELUM_BAYAR, Invoice::STATUS_SEBAGIAN,
        ])->whereNotNull('due_date')->get();

        $buckets = [
            'belum_jatuh_tempo' => ['count' => 0, 'nilai' => 0.0],
            '0_30' => ['count' => 0, 'nilai' => 0.0],
            '31_60' => ['count' => 0, 'nilai' => 0.0],
            '61_90' => ['count' => 0, 'nilai' => 0.0],
            '>90' => ['count' => 0, 'nilai' => 0.0],
        ];

        foreach ($activeInvoices as $inv) {
            $tagihan = (float) $inv->total_tagihan;
            $diterima = (float) $inv->buktiPembayaran()
                ->where('status_verifikasi', BuktiPembayaran::STATUS_DITERIMA)
                ->sum('nominal');
            $sisa = max(0, $tagihan - $diterima);
            if ($sisa <= 0) continue;

            $daysOverdue = (int) $today->diffInDays(Carbon::parse($inv->due_date), false) * -1;

            if ($daysOverdue <= 0) {
                $buckets['belum_jatuh_tempo']['count']++;
                $buckets['belum_jatuh_tempo']['nilai'] += $sisa;
            } elseif ($daysOverdue <= 30) {
                $buckets['0_30']['count']++;
                $buckets['0_30']['nilai'] += $sisa;
            } elseif ($daysOverdue <= 60) {
                $buckets['31_60']['count']++;
                $buckets['31_60']['nilai'] += $sisa;
            } elseif ($daysOverdue <= 90) {
                $buckets['61_90']['count']++;
                $buckets['61_90']['nilai'] += $sisa;
            } else {
                $buckets['>90']['count']++;
                $buckets['>90']['nilai'] += $sisa;
            }
        }

        foreach ($buckets as $k => $v) {
            $buckets[$k]['nilai'] = round($v['nilai'], 2);
        }

        return $buckets;
    }

    /**
     * Breakdown per Faskes (top yang punya piutang terbesar).
     */
    public function perFaskes(int $limit = 20): array
    {
        $rows = DB::table('invoice')
            ->join('siklus_akreditasi', 'siklus_akreditasi.id', '=', 'invoice.siklus_id')
            ->join('faskes', 'faskes.id', '=', 'siklus_akreditasi.faskes_id')
            ->leftJoin('bukti_pembayaran', function ($join) {
                $join->on('bukti_pembayaran.invoice_id', '=', 'invoice.id')
                    ->where('bukti_pembayaran.status_verifikasi', '=', BuktiPembayaran::STATUS_DITERIMA);
            })
            ->whereIn('invoice.status', [Invoice::STATUS_BELUM_BAYAR, Invoice::STATUS_SEBAGIAN])
            ->groupBy('faskes.id', 'faskes.nama', 'faskes.tipe_faskes', 'faskes.telepon', 'faskes.email')
            ->select([
                'faskes.id as faskes_id',
                'faskes.nama as faskes_nama',
                'faskes.tipe_faskes',
                'faskes.telepon',
                'faskes.email',
                DB::raw('COUNT(DISTINCT invoice.id) as jumlah_invoice'),
                DB::raw('SUM(invoice.total_tagihan) as total_tagihan'),
                DB::raw('COALESCE(SUM(bukti_pembayaran.nominal), 0) as total_diterima'),
            ])
            ->orderByDesc(DB::raw('SUM(invoice.total_tagihan) - COALESCE(SUM(bukti_pembayaran.nominal), 0)'))
            ->limit($limit)
            ->get();

        return $rows->map(function ($row) {
            $row->total_tagihan = round((float) $row->total_tagihan, 2);
            $row->total_diterima = round((float) $row->total_diterima, 2);
            $row->sisa_piutang = round($row->total_tagihan - $row->total_diterima, 2);
            return $row;
        })->all();
    }

    /**
     * Daftar invoice piutang yang detail, dengan filter opsional.
     */
    public function invoiceList(array $filters = []): array
    {
        // Piutang aktif: belum_bayar & sebagian (PRD Bab 3 node AE).
        // Termasuk lunas agar filter "Lunas" bisa menampilkan invoice lunas.
        $baseStatuses = [Invoice::STATUS_BELUM_BAYAR, Invoice::STATUS_SEBAGIAN];
        if (($filters['status'] ?? null) === Invoice::STATUS_LUNAS) {
            $baseStatuses = [Invoice::STATUS_LUNAS];
        }
        $query = Invoice::with(['siklus.faskes', 'pks', 'buktiPembayaran'])
            ->whereIn('status', $baseStatuses);

        if (! empty($filters['status']) && $filters['status'] !== Invoice::STATUS_LUNAS) {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['jatuh_tempo']) && $filters['jatuh_tempo'] === true) {
            $query->whereDate('due_date', '<', Carbon::today());
        }

        if (! empty($filters['faskes_id'])) {
            $query->whereHas('siklus', function ($q) use ($filters) {
                $q->where('faskes_id', $filters['faskes_id']);
            });
        }

        $invoices = $query->orderBy('due_date')->limit(100)->get();

        return $invoices->map(function (Invoice $inv) {
            $diterima = (float) $inv->buktiPembayaran()
                ->where('status_verifikasi', BuktiPembayaran::STATUS_DITERIMA)
                ->sum('nominal');
            $sisa = max(0, (float) $inv->total_tagihan - $diterima);
            $today = Carbon::today();
            $hariOverdue = $inv->due_date
                ? (int) $today->diffInDays(Carbon::parse($inv->due_date), false) * -1
                : 0;

            return [
                'id' => $inv->id,
                'nomor_invoice' => $inv->nomor_invoice,
                'faskes_id' => $inv->siklus?->faskes_id,
                'faskes_nama' => $inv->siklus?->faskes?->nama,
                'faskes_telepon' => $inv->siklus?->faskes?->telepon,
                'faskes_email' => $inv->siklus?->faskes?->email,
                'siklus_id' => $inv->siklus_id,
                'pks_id' => $inv->pks_id,
                'total_tagihan' => (float) $inv->total_tagihan,
                'total_diterima' => round($diterima, 2),
                'sisa_piutang' => round($sisa, 2),
                'status' => $inv->status,
                'status_display' => $this->statusDisplay($inv->status, $hariOverdue, $sisa),
                'due_date' => $inv->due_date?->toDateString(),
                'tanggal_lunas' => $inv->tanggal_lunas?->toDateString(),
                'hari_overdue' => $hariOverdue,
                'bukti_pembayaran' => $inv->buktiPembayaran()
                    ->orderBy('created_at', 'desc')
                    ->get()
                    ->map(fn ($b) => [
                        'id' => $b->id,
                        'nominal' => (float) $b->nominal,
                        'metode' => $b->metode,
                        'status_verifikasi' => $b->status_verifikasi,
                        'tanggal' => $b->created_at?->toDateString(),
                        'diverifikasi_oleh' => $b->diverifikasi_oleh,
                    ])
                    ->all(),
            ];
        })->all();
    }

    /**
     * Snapshot lengkap untuk dasbor — dipanggil sekali per request.
     */
    public function snapshot(array $filters = []): array
    {
        return [
            'kpi' => $this->kpiSummary(),
            'aging' => $this->agingBuckets(),
            'per_faskes' => $this->perFaskes(),
            'invoice_list' => $this->invoiceList($filters),
        ];
    }

    /**
     * Status display label sesuai PRD Bab 3 node AE:
     * - Belum Bayar  → belum_bayar, belum lewat due_date
     * - Jatuh Tempo  → belum_bayar/sebagian, SUDAH lewat due_date (hariOverdue > 0)
     * - Parsial      → sebagian, belum lewat due_date
     * - Lunas        → lunas
     */
    public function statusDisplay(string $status, int $hariOverdue, float $sisa): string
    {
        if ($status === Invoice::STATUS_LUNAS) return 'lunas';
        if ($status === Invoice::STATUS_REFUNDED) return 'refunded';
        if ($status === Invoice::STATUS_SUPERSEDED) return 'superseded';
        if ($status === Invoice::STATUS_EXPIRED) return 'expired';

        // Piutang aktif
        if ($hariOverdue > 0) return 'jatuh_tempo';
        if ($status === Invoice::STATUS_SEBAGIAN) return 'parsial';
        if ($status === Invoice::STATUS_BELUM_BAYAR) return 'belum_bayar';

        return 'belum_bayar';
    }

    /**
     * Detail satu invoice dengan histori pembayaran lengkap.
     */
    public function detail(string $id): ?array
    {
        $inv = Invoice::with(['siklus.faskes', 'pks', 'dibuatOleh', 'buktiPembayaran.verifier'])
            ->where('id', $id)
            ->first();

        if (! $inv) return null;

        $diterima = $inv->totalDiterima();
        $sisa = $inv->sisaTagihan();
        $today = Carbon::today();
        $hariOverdue = $inv->due_date
            ? (int) $today->diffInDays(Carbon::parse($inv->due_date), false) * -1
            : 0;

        return [
            'id' => $inv->id,
            'nomor_invoice' => $inv->nomor_invoice,
            'status' => $inv->status,
            'status_display' => $this->statusDisplay($inv->status, $hariOverdue, $sisa),
            'total_tagihan' => (float) $inv->total_tagihan,
            'total_diterima' => round($diterima, 2),
            'sisa_piutang' => round($sisa, 2),
            'due_date' => $inv->due_date?->toDateString(),
            'tanggal_lunas' => $inv->tanggal_lunas?->toDateString(),
            'diterbitkan_pada' => $inv->diterbitkan_pada?->toDateString(),
            'hari_overdue' => $hariOverdue,
            'metode_pembayaran' => $inv->metode_pembayaran,
            'payment_reference' => $inv->payment_reference,
            'payment_expired_at' => $inv->payment_expired_at?->toDateTimeString(),
            'keterangan' => $inv->keterangan,
            'dibuat_oleh_nama' => $inv->dibuatOleh?->nama,
            'faskes' => $inv->siklus?->faskes ? [
                'id' => $inv->siklus->faskes->id,
                'nama' => $inv->siklus->faskes->nama,
                'tipe_faskes' => $inv->siklus->faskes->tipe_faskes,
                'alamat' => $inv->siklus->faskes->alamat,
                'telepon' => $inv->siklus->faskes->telepon,
                'email' => $inv->siklus->faskes->email,
            ] : null,
            'siklus' => $inv->siklus ? [
                'id' => $inv->siklus->id,
                'status' => $inv->siklus->status,
                'tanggal_pengajuan' => $inv->siklus->tanggal_pengajuan?->toDateString(),
            ] : null,
            'bukti_pembayaran' => $inv->buktiPembayaran()
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(fn ($b) => [
                    'id' => $b->id,
                    'nominal' => (float) $b->nominal,
                    'metode' => $b->metode,
                    'status_verifikasi' => $b->status_verifikasi,
                    'tanggal' => $b->created_at?->toDateString(),
                    'diverifikasi_oleh_nama' => $b->verifier?->nama,
                    'keterangan' => $b->keterangan,
                ])
                ->all(),
        ];
    }
}
