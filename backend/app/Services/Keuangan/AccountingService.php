<?php

namespace App\Services\Keuangan;

use App\Models\AuditTrail;
use App\Models\Coa;
use App\Models\KategoriJurnal;
use App\Models\JurnalUmum;
use App\Models\JurnalUmumDetail;
use App\Models\LedgerEntry;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * AccountingService — single source of truth untuk accounting module.
 *
 * Managing:
 *   - Chart of Accounts (COA)
 *   - Kategori Jurnal
 *   - Jurnal Umum (general journal entries)
 *   - General Ledger (book of accounts)
 */
class AccountingService
{
    // ═══════════════════════════════════════════════════════════════════════
    // COA
    // ═══════════════════════════════════════════════════════════════════════

    public function listCoa(array $filters = []): Collection
    {
        $q = Coa::query()->aktif();

        if (! empty($filters['jenis'])) {
            $q->where('jenis', $filters['jenis']);
        }
        if (! empty($filters['q'])) {
            $q->where(fn ($w) => $w
                ->where('kode', 'like', "%{$filters['q']}%")
                ->orWhere('nama', 'like', "%{$filters['q']}%")
            );
        }

        return $q->orderBy('kode')->get();
    }

    public function createCoa(array $data): Coa
    {
        $coa = Coa::create([
            'id' => (string) Str::uuid(),
            'kode' => $data['kode'],
            'nama' => $data['nama'],
            'jenis' => $data['jenis'],
            'kelompok' => $data['kelompok'] ?? Coa::KELOMPOK_DEBIT_KREDIT,
            'kategori_id' => $data['kategori_id'] ?? null,
            'is_aktif' => $data['is_aktif'] ?? true,
            'urutan' => $data['urutan'] ?? 0,
            'deskripsi' => $data['deskripsi'] ?? null,
        ]);

        return $coa;
    }

    public function updateCoa(string $id, array $data): ?Coa
    {
        $coa = Coa::find($id);
        if (! $coa) return null;
        $coa->update($data);
        return $coa->fresh();
    }

    public function deleteCoa(string $id): bool
    {
        $coa = Coa::find($id);
        if (! $coa) return false;
        // Check if used in journal
        if ($coa->jurnalDetails()->exists()) {
            throw new \RuntimeException('Akun sudah digunakan di jurnal umum. Nonaktifkan saja.');
        }
        $coa->delete();
        return true;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Kategori Jurnal
    // ═══════════════════════════════════════════════════════════════════════

    public function listKategori(): Collection
    {
        return KategoriJurnal::orderBy('urutan')->get();
    }

    public function createKategori(array $data): KategoriJurnal
    {
        return KategoriJurnal::create([
            'id' => (string) Str::uuid(),
            'nama' => $data['nama'],
            'jenis' => $data['jenis'],
            'urutan' => $data['urutan'] ?? 0,
            'is_aktif' => $data['is_aktif'] ?? true,
        ]);
    }

    public function updateKategori(string $id, array $data): ?KategoriJurnal
    {
        $k = KategoriJurnal::find($id);
        if (! $k) return null;
        $k->update($data);
        return $k->fresh();
    }

    public function deleteKategori(string $id): bool
    {
        $k = KategoriJurnal::find($id);
        if (! $k) return false;
        if ($k->jurnalUmum()->exists()) {
            throw new \RuntimeException('Kategori sudah digunakan di jurnal. Nonaktifkan saja.');
        }
        $k->delete();
        return true;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Jurnal Umum
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Buat jurnal umum. Array details harus berisi minimal 2 baris
     * dan total debit harus sama dengan total kredit.
     *
     * @param  array{  details: array[{coa_id, debit, kredit, keterangan}],  tanggal, kategori_id?, keterangan, ref_type?, ref_id?, userId }  $data
     * @return array{success, jurnal?, error?}
     */
    public function createJurnal(array $data): array
    {
        $details = $data['details'] ?? [];

        if (count($details) < 2) {
            return ['success' => false, 'error' => 'Minimal 2 baris jurnal.'];
        }

        $totalDebit = collect($details)->sum('debit');
        $totalKredit = collect($details)->sum('kredit');

        if (bccomp($totalDebit, $totalKredit, 2) !== 0) {
            return ['success' => false, 'error' => 'Total debit (' . number_format($totalDebit, 0) . ') harus sama dengan total kredit (' . number_format($totalKredit, 0) . ').'];
        }

        if (bccomp($totalDebit, 0, 2) === 0) {
            return ['success' => false, 'error' => 'Total transaksi tidak boleh nol.'];
        }

        // Validate all COA exist
        $coaIds = collect($details)->pluck('coa_id')->unique();
        $coaCount = Coa::whereIn('id', $coaIds)->where('is_aktif', true)->count();
        if ($coaCount !== $coaIds->count()) {
            return ['success' => false, 'error' => 'Sebagian akun tidak ditemukan atau tidak aktif.'];
        }

        return DB::transaction(function () use ($data, $details, $totalDebit, $totalKredit) {
            $kategori = ! empty($data['kategori_id'])
                ? KategoriJurnal::find($data['kategori_id'])
                : null;
            $nomor = $this->generateNomorJurnal(
                Carbon::parse($data['tanggal']),
                $kategori?->jenis
            );

            $jurnal = JurnalUmum::create([
                'id' => (string) Str::uuid(),
                'nomor' => $nomor,
                'tanggal' => $data['tanggal'],
                'kategori_id' => $data['kategori_id'] ?? null,
                'keterangan' => $data['keterangan'],
                'ref_type' => $data['ref_type'] ?? null,
                'ref_id' => $data['ref_id'] ?? null,
                'total_debit' => round($totalDebit, 2),
                'total_kredit' => round($totalKredit, 2),
                'path_lampiran' => $data['path_lampiran'] ?? null,
                'dibuat_oleh' => $data['userId'],
            ]);

            foreach ($details as $d) {
                JurnalUmumDetail::create([
                    'id' => (string) Str::uuid(),
                    'jurnal_umum_id' => $jurnal->id,
                    'coa_id' => $d['coa_id'],
                    'debit' => round((float) ($d['debit'] ?? 0), 2),
                    'kredit' => round((float) ($d['kredit'] ?? 0), 2),
                    'keterangan' => $d['keterangan'] ?? null,
                ]);
            }

            $this->audit('jurnal_umum.created', $jurnal, $data['userId'], [
                'nomor' => $nomor,
                'total_debit' => round($totalDebit, 2),
                'total_kredit' => round($totalKredit, 2),
            ]);

            Log::info('jurnal_umum.created', [
                'id' => $jurnal->id,
                'nomor' => $nomor,
                'total' => $totalDebit,
            ]);

            return ['success' => true, 'jurnal' => $jurnal->fresh(['details.coa', 'kategori'])];
        });
    }

    /**
     * Auto-generate jurnal dari transaksi kas/bank (BKM/BKK/KKM/KKK).
     *
     * Support 2 format:
     * 1. Single: { nominal, akun_counterpart } → 2 baris (kas/bank + 1 counterpart)
     * 2. Multi:  { details[] }             → baris kas/bank + N baris counterpart
     *
     * @param array{
     *   jenis: string, tanggal: string,
     *   akun_kas_bank?: string,
     *   nominal?: float, akun_counterpart?: string,
     *   details?: array, keterangan?: string,
     *   ref_type?: string, ref_id?: string, userId: string
     * } $data
     * @return array{success, jurnal?, error?}
     */
    public function autoGenerateJurnal(array $data): array
    {
        $jenis = $data['jenis'] ?? null;
        if (! in_array($jenis, ['bkm', 'bkk', 'kkm', 'kkk'])) {
            return ['success' => false, 'error' => 'Jenis transaksi tidak valid.'];
        }

        $coaBank = Coa::find($data['akun_kas_bank'] ?? null);
        if (! $coaBank || ! $coaBank->is_aktif) {
            return ['success' => false, 'error' => 'Akun Kas/Bank tidak ditemukan atau tidak aktif.'];
        }

        $kategori = KategoriJurnal::where('jenis', $jenis)->first();
        $kategoriId = $kategori?->id;
        $isDebitKas = in_array($jenis, ['bkm', 'kkm']);

        // ── Format multi-row: details[] array ──────────────────────────────
        // Setiap detail[].nominal = amount untuk baris tersebut.
        // Kas/Bank line: total = SUM(semua detail.nominal), sisi berlawanan dari jenis transaksi.
        // Contoh BKM: Kas DEBIT 400k, Detail1 KREDIT 200k, Detail2 KREDIT 200k. ✓
        $detailsRaw = $data['details'] ?? [];
        if (count($detailsRaw) > 0) {
            // Validate all COA in details
            $coaIds = collect($detailsRaw)->pluck('coa_id')->filter()->unique();
            $validCount = Coa::whereIn('id', $coaIds)->where('is_aktif', true)->count();
            if ($validCount !== $coaIds->count()) {
                return ['success' => false, 'error' => 'Sebagian akun di rincian tidak valid atau tidak aktif.'];
            }

            // Total = SUM(semua detail.nominal) — semua amounts ada di satu sisi sesuai jenis
            $totalNominal = collect($detailsRaw)->sum(fn ($r) => (float) ($r['nominal'] ?? 0));
            if ($totalNominal <= 0) {
                return ['success' => false, 'error' => 'Total nominal harus lebih dari nol.'];
            }

            // Baris Kas/Bank: total di sisi berlawanan dari jenis
            // BKM/KKM → kas masuk → kas DEBIT, counterpart KREDIT → kas di DEBIT
            // BKK/KKK → kas keluar → kas KREDIT, counterpart DEBIT → kas di KREDIT
            // Jadi: isDebitKas = (jenis == BKM/KKM) → Kas di DEBIT
            $details = [[
                'coa_id'    => $data['akun_kas_bank'],
                'debit'     => $isDebitKas ? $totalNominal : 0,
                'kredit'    => $isDebitKas ? 0 : $totalNominal,
                'keterangan' => "Kas/Bank ({$coaBank->kode} {$coaBank->nama})",
            ]];

            // Detail lines: tiap baris di KREDIT (BKM/KKM) atau DEBIT (BKK/KKK)
            foreach ($detailsRaw as $r) {
                $nominal = (float) ($r['nominal'] ?? 0);
                if ($nominal <= 0) continue;
                $details[] = [
                    'coa_id'    => $r['coa_id'],
                    'debit'     => $isDebitKas ? 0 : $nominal,
                    'kredit'    => $isDebitKas ? $nominal : 0,
                    'keterangan' => $r['keterangan'] ?? null,
                ];
            }

            return $this->createJurnal([
                'tanggal'     => $data['tanggal'],
                'kategori_id' => $kategoriId,
                'keterangan' => $data['keterangan'] ?? '',
                'details'    => $details,
                'ref_type'  => $data['ref_type'] ?? null,
                'ref_id'    => $data['ref_id'] ?? null,
                'userId'    => $data['userId'],
            ]);
        }

        // ── Format single-row (legacy) ────────────────────────────────────
        $nominal = (float) ($data['nominal'] ?? 0);
        $coaCp = Coa::find($data['akun_counterpart'] ?? null);
        if ($nominal <= 0) {
            return ['success' => false, 'error' => 'Nominal harus lebih dari nol.'];
        }
        if (! $coaCp || ! $coaCp->is_aktif) {
            return ['success' => false, 'error' => 'Akun Counterpart tidak ditemukan atau tidak aktif.'];
        }

        $details = [
            [
                'coa_id'    => $data['akun_kas_bank'],
                'debit'     => $isDebitKas ? $nominal : 0,
                'kredit'    => $isDebitKas ? 0 : $nominal,
                'keterangan' => "Kas/Bank ({$coaBank->kode} {$coaBank->nama})",
            ],
            [
                'coa_id'    => $data['akun_counterpart'],
                'debit'     => $isDebitKas ? 0 : $nominal,
                'kredit'    => $isDebitKas ? $nominal : 0,
                'keterangan' => "Counterpart ({$coaCp->kode} {$coaCp->nama})",
            ],
        ];

        return $this->createJurnal([
            'tanggal'     => $data['tanggal'],
            'kategori_id' => $kategoriId,
            'keterangan' => $data['keterangan'] ?? '',
            'details'    => $details,
            'ref_type'   => $data['ref_type'] ?? null,
            'ref_id'     => $data['ref_id'] ?? null,
            'userId'     => $data['userId'],
        ]);
    }

    public function listJurnal(array $filters = []): Collection
    {
        $q = JurnalUmum::with(['kategori', 'details.coa', 'pembuat']);

        if (! empty($filters['kategori_id'])) {
            $q->where('kategori_id', $filters['kategori_id']);
        }
        if (! empty($filters['kategori_jenis'])) {
            $q->whereHas('kategori', fn ($k) => $k->where('jenis', $filters['kategori_jenis']));
        }
        if (! empty($filters['tahun']) && ! empty($filters['bulan'])) {
            $q->whereYear('tanggal', $filters['tahun'])
              ->whereMonth('tanggal', $filters['bulan']);
        }
        if (! empty($filters['tanggal_dari']) && ! empty($filters['tanggal_sampai'])) {
            $q->whereBetween('tanggal', [$filters['tanggal_dari'], $filters['tanggal_sampai']]);
        }
        if (! empty($filters['q'])) {
            $q->where(fn ($w) => $w
                ->where('nomor', 'like', "%{$filters['q']}%")
                ->orWhere('keterangan', 'like', "%{$filters['q']}%")
            );
        }

        return $q->orderByDesc('tanggal')->orderByDesc('created_at')->limit(500)->get()
            ->map(fn (JurnalUmum $j) => $this->presentJurnal($j));
    }

    public function getJurnal(string $id): ?array
    {
        $j = JurnalUmum::with(['kategori', 'details.coa', 'pembuat'])->find($id);
        return $j ? $this->presentJurnal($j, withDetails: true) : null;
    }

    public function deleteJurnal(string $id, string $userId): bool
    {
        $j = JurnalUmum::find($id);
        if (! $j) return false;
        if ($j->ref_type) {
            throw new \RuntimeException('Jurnal berasal dari transaksi sistem. Tidak dapat dihapus.');
        }
        $j->details()->delete();
        $j->delete();
        return true;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // General Ledger
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Buku Besar — saldo per akun dalam periode tertentu.
     * Menggabungkan data dari:
     *   1. Jurnal Umum (coa_id -> jurnal_umum_detail)
     *   2. LedgerEntry lama (coa mapping -> nominal_neto/debit/kredit)
     */
    public function bukuBesar(array $filters = []): array
    {
        $coaId = $filters['coa_id'] ?? null;
        $tahun = $filters['tahun'] ?? now()->year;
        $bulan = $filters['bulan'] ?? null;

        $tanggalDari = $bulan
            ? Carbon::create($tahun, $bulan, 1)->startOfMonth()
            : Carbon::create($tahun, 1, 1)->startOfYear();

        $tanggalSampai = $bulan
            ? Carbon::create($tahun, $bulan, 1)->endOfMonth()
            : Carbon::create($tahun, 12, 31)->endOfYear();

        // Get COA (either specific or all)
        $coaQuery = Coa::query()->aktif()->orderBy('kode');
        if ($coaId) {
            $coaQuery->where('id', $coaId);
        }
        $akuns = $coaQuery->get();

        $result = [];
        foreach ($akuns as $coa) {
            $saldoAwal = $this->saldoAwal($coa, $tanggalDari);
            $mutasi = $this->mutasiPeriode($coa, $tanggalDari, $tanggalSampai);
            $saldoAkhir = bcadd($saldoAwal, $mutasi['debit'], 2) - bcadd($mutasi['kredit'], 0, 2);

            // For normal debit accounts: saldo_debit = saldoAwal + mutasiDebit - mutasiKredit
            // For normal credit accounts: saldo_kredit = saldoAwal + mutasiKredit - mutasiDebit
            $saldoNormal = $coa->isDebitNormal()
                ? ['tipe' => 'debit', 'nilai' => max(0, bcsub(bcadd($saldoAwal, $mutasi['debit'], 2), bcadd($mutasi['kredit'], 0, 2), 2))]
                : ['tipe' => 'kredit', 'nilai' => max(0, bcsub(bcadd($saldoAwal, $mutasi['kredit'], 2), bcadd($mutasi['debit'], 0, 2), 2))];

            $result[] = [
                'id' => $coa->id,
                'kode' => $coa->kode,
                'nama' => $coa->nama,
                'jenis' => $coa->jenis,
                'jenis_label' => Coa::$JENIS_LABEL[$coa->jenis] ?? $coa->jenis,
                'kelompok' => $coa->kelompok,
                'saldo_awal' => round((float) $saldoAwal, 2),
                'mutasi_debit' => round((float) $mutasi['debit'], 2),
                'mutasi_kredit' => round((float) $mutasi['kredit'], 2),
                'saldo_akhir' => round((float) $saldoAkhir, 2),
                'saldo_normal' => $saldoNormal,
            ];
        }

        return $result;
    }

    /**
     * Detail buku besar — semua baris jurnal per akun dalam periode.
     */
    public function bukuBesarDetail(string $coaId, array $filters = []): ?array
    {
        $coa = Coa::find($coaId);
        if (! $coa) return null;

        $tahun = $filters['tahun'] ?? now()->year;
        $bulan = $filters['bulan'] ?? null;

        $tanggalDari = $bulan
            ? Carbon::create($tahun, $bulan, 1)->startOfMonth()
            : Carbon::create($tahun, 1, 1)->startOfYear();

        $tanggalSampai = $bulan
            ? Carbon::create($tahun, $bulan, 1)->endOfMonth()
            : Carbon::create($tahun, 12, 31)->endOfYear();

        $saldoAwal = $this->saldoAwal($coa, $tanggalDari);

        $details = JurnalUmumDetail::with(['jurnal.kategori', 'coa'])
            ->join('jurnal_umum', 'jurnal_umum_detail.jurnal_umum_id', '=', 'jurnal_umum.id')
            ->where('jurnal_umum_detail.coa_id', $coaId)
            ->whereBetween('jurnal_umum.tanggal', [$tanggalDari->toDateString(), $tanggalSampai->toDateString()])
            ->orderBy('jurnal_umum.tanggal')
            ->orderBy('jurnal_umum.created_at')
            ->get(['jurnal_umum_detail.*'])
            ->map(fn (JurnalUmumDetail $d) => [
                'id' => $d->id,
                'jurnal_id' => $d->jurnal_umum_id,
                'nomor_jurnal' => $d->jurnal?->nomor,
                'tanggal' => $d->jurnal?->tanggal?->toDateString(),
                'keterangan_jurnal' => $d->jurnal?->keterangan,
                'kategori' => $d->jurnal?->kategori?->nama,
                'debit' => (float) $d->debit,
                'kredit' => (float) $d->kredit,
                'keterangan_baris' => $d->keterangan,
            ]);

        $mutasi = $this->mutasiPeriode($coa, $tanggalDari, $tanggalSampai);

        return [
            'coa' => [
                'id' => $coa->id,
                'kode' => $coa->kode,
                'nama' => $coa->nama,
                'jenis' => $coa->jenis,
                'jenis_label' => Coa::$JENIS_LABEL[$coa->jenis] ?? $coa->jenis,
                'kelompok' => $coa->kelompok,
            ],
            'periode' => [
                'dari' => $tanggalDari->toDateString(),
                'sampai' => $tanggalSampai->toDateString(),
                'tahun' => (int) $tahun,
                'bulan' => $bulan ? (int) $bulan : null,
            ],
            'saldo_awal' => round((float) $saldoAwal, 2),
            'total_debit' => round((float) $mutasi['debit'], 2),
            'total_kredit' => round((float) $mutasi['kredit'], 2),
            'saldo_akhir' => $coa->isDebitNormal()
                ? round(max(0, (float) bcsub(bcadd($saldoAwal, $mutasi['debit'], 2), bcadd($mutasi['kredit'], 0, 2), 2)), 2)
                : round(max(0, (float) bcsub(bcadd($saldoAwal, $mutasi['kredit'], 2), bcadd($mutasi['debit'], 0, 2), 2)), 2),
            'details' => $details,
        ];
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Dashboard
    // ═══════════════════════════════════════════════════════════════════════

    public function dashboard(): array
    {
        $now = now();
        $startMonth = $now->copy()->startOfMonth();
        $endMonth = $now->copy()->endOfMonth();

        // Total debit & kredit bulan ini dari jurnal umum
        $bulanIni = JurnalUmumDetail::whereHas('jurnal', fn ($j) => $j
            ->whereBetween('tanggal', [$startMonth->toDateString(), $endMonth->toDateString()])
        );

        $totalDebitBulan = (float) $bulanIni->clone()->sum('debit');
        $totalKreditBulan = (float) $bulanIni->clone()->sum('kredit');

        // Jumlah jurnal bulan ini
        $jumlahJurnalBulan = JurnalUmum::whereBetween('tanggal', [
            $startMonth->toDateString(), $endMonth->toDateString(),
        ])->count();

        // Saldo kas & bank (aktiva lancar)
        $kasBank = Coa::query()->aktif()
            ->whereIn('jenis', [Coa::JENIS_AKTIVA_LANCAR])
            ->get();
        $saldoKasBank = 0.0;
        foreach ($kasBank as $coa) {
            $saldoKasBank += $this->saldoAkhir($coa, $endMonth);
        }

        // Pendapatan bulan ini
        $pendapatan = Coa::query()->aktif()
            ->whereIn('jenis', [Coa::JENIS_PENDAPATAN, Coa::JENIS_PENDAPATAN_LAIN])
            ->get();
        $totalPendapatanBulan = 0.0;
        foreach ($pendapatan as $coa) {
            $totalPendapatanBulan += (float) $this->mutasiPeriode($coa, $startMonth, $endMonth)['kredit'];
        }

        // Beban bulan ini
        $beban = Coa::query()->aktif()
            ->whereIn('jenis', [Coa::JENIS_BEBAN, Coa::JENIS_BEBAN_LAIN])
            ->get();
        $totalBebanBulan = 0.0;
        foreach ($beban as $coa) {
            $totalBebanBulan += (float) $this->mutasiPeriode($coa, $startMonth, $endMonth)['debit'];
        }

        return [
            'bulan_ini' => [
                'total_debit' => $totalDebitBulan,
                'total_kredit' => $totalKreditBulan,
                'jumlah_jurnal' => $jumlahJurnalBulan,
                'saldo_kas_bank' => $saldoKasBank,
                'total_pendapatan' => $totalPendapatanBulan,
                'total_beban' => $totalBebanBulan,
                'laba_rugi_bulan' => $totalPendapatanBulan - $totalBebanBulan,
            ],
            'jumlah_coa' => Coa::query()->aktif()->count(),
            'jumlah_kategori' => KategoriJurnal::where('is_aktif', true)->count(),
            'tanggal_snapshot' => $now->toDateString(),
        ];
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Private helpers
    // ═══════════════════════════════════════════════════════════════════════

    private function saldoAwal(Coa $coa, Carbon $tanggalDari): string
    {
        $before = $tanggalDari->copy()->subDay()->toDateString();

        $jDetails = JurnalUmumDetail::where('coa_id', $coa->id)
            ->whereHas('jurnal', fn ($j) => $j->where('tanggal', '<=', $before))
            ->get();

        $totalDebit = '0';
        $totalKredit = '0';
        foreach ($jDetails as $d) {
            $totalDebit = bcadd($totalDebit, $d->debit, 2);
            $totalKredit = bcadd($totalKredit, $d->kredit, 2);
        }

        if ($coa->isDebitNormal()) {
            return bcsub($totalDebit, $totalKredit, 2);
        }
        return bcsub($totalKredit, $totalDebit, 2);
    }

    private function mutasiPeriode(Coa $coa, Carbon $dari, Carbon $sampai): array
    {
        $details = JurnalUmumDetail::where('coa_id', $coa->id)
            ->whereHas('jurnal', fn ($j) => $j
                ->whereBetween('tanggal', [$dari->toDateString(), $sampai->toDateString()])
            )
            ->get();

        return [
            'debit' => (string) $details->sum('debit'),
            'kredit' => (string) $details->sum('kredit'),
        ];
    }

    private function saldoAkhir(Coa $coa, Carbon $tanggal): string
    {
        $saldoAwal = $this->saldoAwal($coa, $tanggal->copy()->addDay());
        $mutasi = $this->mutasiPeriode($coa, $tanggal->copy()->startOfMonth(), $tanggal);
        $debit = bcadd($saldoAwal, $mutasi['debit'], 2);
        $kredit = bcadd($mutasi['kredit'], 0, 2);
        if ($coa->isDebitNormal()) {
            return bcsub($debit, $kredit, 2);
        }
        return bcsub($kredit, $debit, 2);
    }

    private function generateNomorJurnal(Carbon $tanggal, ?string $kategoriJenis = null): string
    {
        $prefix = $this->nomorPrefix($kategoriJenis);
        $prefix .= sprintf('/%04d/%02d/', $tanggal->year, $tanggal->month);
        $count = JurnalUmum::where('nomor', 'like', $prefix . '%')
            ->count();
        return $prefix . str_pad((string) ($count + 1), 4, '0', STR_PAD_LEFT);
    }

    private function nomorPrefix(?string $jenis): string
    {
        return match ($jenis) {
            'bkm'        => 'BKM',
            'bkk'        => 'BKK',
            'kkm'        => 'KKM',
            'kkk'        => 'KKK',
            'pemasukan'  => 'JU-PM',
            'pengeluaran'=> 'JU-PK',
            default      => 'JU',
        };
    }

    private function presentJurnal(JurnalUmum $j, bool $withDetails = false): array
    {
        $base = [
            'id' => $j->id,
            'nomor' => $j->nomor,
            'tanggal' => $j->tanggal?->toDateString(),
            'kategori' => $j->kategori ? [
                'id' => $j->kategori->id,
                'nama' => $j->kategori->nama,
                'jenis' => $j->kategori->jenis,
            ] : null,
            'keterangan' => $j->keterangan,
            'ref_type' => $j->ref_type,
            'total_debit' => (float) $j->total_debit,
            'total_kredit' => (float) $j->total_kredit,
            'is_balanced' => $j->isBalanced(),
            'dibuat_oleh' => $j->pembuat?->nama ?? $j->dibuat_oleh,
            'tanggal_dibuat' => $j->created_at?->toIso8601String(),
            'can_delete' => $j->ref_type === null,
        ];

        if ($withDetails) {
            $base['details'] = $j->details->map(fn (JurnalUmumDetail $d) => [
                'id' => $d->id,
                'coa' => $d->coa ? [
                    'id' => $d->coa->id,
                    'kode' => $d->coa->kode,
                    'nama' => $d->coa->nama,
                    'jenis' => $d->coa->jenis,
                ] : null,
                'debit' => (float) $d->debit,
                'kredit' => (float) $d->kredit,
                'keterangan' => $d->keterangan,
            ])->values();
        }

        return $base;
    }

    private function audit(string $aksi, JurnalUmum $j, string $userId, array $extra): void
    {
        AuditTrail::create([
            'id' => (string) Str::uuid(),
            'aktor_id' => $userId,
            'aksi' => $aksi,
            'target_type' => 'JurnalUmum',
            'target_id' => $j->id,
            'data_sebelum' => null,
            'data_sesudah' => array_merge([
                'nomor' => $j->nomor,
                'total' => (float) $j->total_debit,
            ], $extra),
            'ip_address' => request()?->ip(),
            'user_agent' => request()?->userAgent(),
        ]);
    }
}
