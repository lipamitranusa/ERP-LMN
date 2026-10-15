<?php

namespace App\Services\Keuangan;

use App\Models\AuditTrail;
use App\Models\HutangPajak;
use App\Models\LedgerEntry;
use App\Models\PembayaranHonor;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * HutangPajakService — melacak hutang PPh 21 yang dipotong dari honor
 * Surveior/Verifikator/Rekomendator.
 *
 * Alur:
 *   1. Pembayaran honor disetujui (approvePayment)
 *      → trigger otomatis bikin HutangPajak per penerima TA
 *   2. Keuangan melihat daftar hutang di menu Hutang Pajak
 *   3. Keuangan bayar/setor PPh ke Ditjen Pajak → upload bukti setor
 *   4. Pajak lunas
 */
class HutangPajakService
{
    /**
     * Trigger saat approvePayment: buat HutangPajak untuk setiap
     * line item honor yang dipotong PPh.
     *
     * @param  PembayaranHonor  $pembayaran
     * @param  string  $userId  user yang approve
     * @return Collection<HutangPajak>
     */
    public function createFromPembayaran(PembayaranHonor $pembayaran, string $userId): Collection
    {
        $entries = LedgerEntry::with('penerima')
            ->whereIn('tipe', [
                LedgerEntry::TIPE_AP_HONOR_SURVEIOR,
                LedgerEntry::TIPE_AP_HONOR_VERIFIKATOR,
                LedgerEntry::TIPE_AP_HONOR_REKOMENDATOR,
            ])
            ->whereIn('status_pembayaran', [
                LedgerEntry::STATUS_LUNAS,
                LedgerEntry::STATUS_BELUM_DIBAYAR,
            ])
            ->whereHas('pembayaranDetail', fn ($d) => $d
                ->where('pembayaran_honor_id', $pembayaran->id))
            ->get();

        $hutangList = collect();

        foreach ($entries as $e) {
            $pph = (float) ($e->potongan_pph ?? 0);
            if ($pph <= 0) {
                continue;
            }

            $dpp = (float) $e->nominal_bruto * 0.5;
            $penerima = $e->penerima;

            // Jatuh tempo = akhir bulan berikutnya
            $tanggalHonor = Carbon::parse($e->tanggal_dibayar ?? $e->created_at);
            $jatuhTempo = $tanggalHonor->copy()->addMonthNoOverflow(1)->endOfMonth()->toDateString();

            $hutang = HutangPajak::create([
                'id' => (string) Str::uuid(),
                'jenis_pajak' => HutangPajak::JENIS_PPH21_BUKAN_PEGAWAI,
                'nomor_pokok_wajib_pajak' => $penerima?->npwp ?? null,
                'nama_wajib_pajak' => $penerima?->nama ?? null,
                'pembayaran_honor_id' => $pembayaran->id,
                'nomor_pembayaran' => $pembayaran->nomor_pembayaran,
                'tanggal_pembayaran_honor' => $tanggalHonor->toDateString(),
                'dpp' => round($dpp, 2),
                'tarif_persen' => $this->effectiveTariff($dpp),
                'jumlah_pajak' => $pph,
                'status' => HutangPajak::STATUS_BELUM_DIBAYAR,
                'tanggal_jatuh_tempo' => $jatuhTempo,
                'dibuat_oleh' => $userId,
            ]);

            $hutangList->push($hutang);

            $this->audit('hutang_pajak.created', $hutang, $userId, [
                'pembayaran_honor_id' => $pembayaran->id,
                'jumlah_pajak' => $pph,
            ]);
        }

        Log::info('hutang_pajak.bulk_created', [
            'pembayaran_id' => $pembayaran->id,
            'jumlah' => $hutangList->count(),
            'total_pajak' => $hutangList->sum('jumlah_pajak'),
        ]);

        return $hutangList;
    }

    /**
     * Hitung tarif efektif PPh dari DPP (bracket).
     */
    private function effectiveTariff(float $dpp): float
    {
        if ($dpp <= 60_000_000) {
            return 5.0;
        }
        if ($dpp <= 250_000_000) {
            return 10.0;
        }
        if ($dpp <= 500_000_000) {
            return 15.0;
        }
        return 25.0;
    }

    /**
     * List semua hutang pajak dengan filter.
     */
    public function list(array $filters = []): Collection
    {
        $query = HutangPajak::with(['pembayaranHonor', 'pembuat', 'pembayar']);

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (! empty($filters['jenis_pajak'])) {
            $query->where('jenis_pajak', $filters['jenis_pajak']);
        }
        if (! empty($filters['tahun']) && ! empty($filters['bulan'])) {
            $start = Carbon::create($filters['tahun'], $filters['bulan'], 1)->startOfMonth();
            $end = $start->copy()->endOfMonth();
            $query->whereBetween('tanggal_pembayaran_honor', [$start->toDateString(), $end->toDateString()]);
        }
        if (! empty($filters['q'])) {
            $q = $filters['q'];
            $query->where(function ($w) use ($q) {
                $w->where('nama_wajib_pajak', 'like', "%{$q}%")
                    ->orWhere('nomor_pokok_wajib_pajak', 'like', "%{$q}%")
                    ->orWhere('nomor_pembayaran', 'like', "%{$q}%");
            });
        }

        return $query
            ->orderByDesc('tanggal_pembayaran_honor')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (HutangPajak $h) => $this->present($h));
    }

    /**
     * Ambil satu hutang pajak dengan relasi lengkap.
     */
    public function get(string $id): ?array
    {
        $h = HutangPajak::with([
            'pembayaranHonor.details.ledgerEntry.penerima',
            'pembuat',
            'penyetuju',
            'pembayar',
        ])->find($id);

        return $h ? $this->present($h, withDetails: true) : null;
    }

    /**
     * Tandai hutang pajak sebagai lunas (dibayar ke Ditjen Pajak).
     *
     * @return array{success: bool, hutang?: HutangPajak, error?: string}
     */
    public function markAsPaid(
        string $hutangId,
        string $userId,
        ?Carbon $tanggalDibayar = null,
        $buktiSetorFile = null,
        ?string $catatan = null,
    ): array {
        $hutang = HutangPajak::find($hutangId);
        if (! $hutang) {
            return ['success' => false, 'error' => 'Hutang pajak tidak ditemukan.'];
        }
        if ($hutang->status === HutangPajak::STATUS_DIBAYAR) {
            return ['success' => true, 'hutang' => $hutang, 'info' => 'Sudah lunas.'];
        }

        return DB::transaction(function () use ($hutang, $userId, $tanggalDibayar, $buktiSetorFile, $catatan) {
            $pathBukti = $hutang->path_bukti_setor;
            if ($buktiSetorFile) {
                $attachment = new \App\Services\AttachmentService();
                $pathBukti = $attachment->store($buktiSetorFile, 'bukti_potong');
            }

            $hutang->update([
                'status' => HutangPajak::STATUS_DIBAYAR,
                'tanggal_dibayar' => ($tanggalDibayar ?? now())->toDateString(),
                'dibayar_oleh' => $userId,
                'path_bukti_setor' => $pathBukti,
                'catatan' => $catatan ?? $hutang->catatan,
            ]);

            $this->audit('hutang_pajak.paid', $hutang, $userId, [
                'jumlah_pajak' => (float) $hutang->jumlah_pajak,
                'tanggal_dibayar' => $hutang->tanggal_dibayar,
            ]);

            Log::info('hutang_pajak.paid', [
                'hutang_id' => $hutang->id,
                'jumlah' => (float) $hutang->jumlah_pajak,
            ]);

            return ['success' => true, 'hutang' => $hutang->fresh()];
        });
    }

    /**
     * KPI ringkasan hutang pajak.
     */
    public function dashboard(): array
    {
        $belum = HutangPajak::where('status', HutangPajak::STATUS_BELUM_DIBAYAR);
        $sudah = HutangPajak::where('status', HutangPajak::STATUS_DIBAYAR);

        return [
            'total_belum_dibayar' => (float) $belum->sum('jumlah_pajak'),
            'jumlah_belum_dibayar' => $belum->count(),
            'total_dibayar_bulan_ini' => (float) HutangPajak::where('status', HutangPajak::STATUS_DIBAYAR)
                ->whereMonth('tanggal_dibayar', now()->month)
                ->whereYear('tanggal_dibayar', now()->year)
                ->sum('jumlah_pajak'),
            'jumlah_dibayar_bulan_ini' => HutangPajak::where('status', HutangPajak::STATUS_DIBAYAR)
                ->whereMonth('tanggal_dibayar', now()->month)
                ->whereYear('tanggal_dibayar', now()->year)
                ->count(),
            'total_seluruh' => (float) HutangPajak::sum('jumlah_pajak'),
            'tanggal_snapshot' => now()->toDateString(),
        ];
    }

    // ─── Presenters ─────────────────────────────────────────────────────────

    private function present(HutangPajak $h, bool $withDetails = false): array
    {
        $base = [
            'id' => $h->id,
            'jenis_pajak' => $h->jenis_pajak,
            'jenis_pajak_label' => 'PPh Pasal 21 Bukan Pegawai',
            'nomor_pokok_wajib_pajak' => $h->nomor_pokok_wajib_pajak,
            'nama_wajib_pajak' => $h->nama_wajib_pajak,
            'pembayaran_honor_id' => $h->pembayaran_honor_id,
            'nomor_pembayaran' => $h->nomor_pembayaran,
            'tanggal_pembayaran_honor' => $h->tanggal_pembayaran_honor?->toDateString(),
            'dpp' => (float) $h->dpp,
            'tarif_persen' => (float) $h->tarif_persen,
            'jumlah_pajak' => (float) $h->jumlah_pajak,
            'status' => $h->status,
            'tanggal_jatuh_tempo' => $h->tanggal_jatuh_tempo?->toDateString(),
            'tanggal_dibayar' => $h->tanggal_dibayar?->toDateString(),
            'path_bukti_setor' => $h->path_bukti_setor,
            'url_bukti_setor' => $h->path_bukti_setor
                ? (new \App\Services\AttachmentService())->signedUrl($h->path_bukti_setor, 1440)
                : null,
            'catatan' => $h->catatan,
            'dibuat_oleh' => $h->pembuat?->nama ?? $h->dibuat_oleh,
            'dibayar_oleh' => $h->pembayar?->nama ?? $h->dibayar_oleh,
            'tanggal_dibuat' => $h->created_at?->toIso8601String(),
        ];

        if ($withDetails) {
            $base['pembayaran_honor'] = $h->pembayaranHonor ? [
                'id' => $h->pembayaranHonor->id,
                'nomor_pembayaran' => $h->pembayaranHonor->nomor_pembayaran,
                'tanggal_pembayaran' => $h->pembayaranHonor->tanggal_pembayaran?->toDateString(),
                'total_nominal' => (float) $h->pembayaranHonor->total_nominal,
                'status' => $h->pembayaranHonor->status,
                'details' => $h->pembayaranHonor->details->map(fn ($d) => [
                    'id' => $d->id,
                    'ledger_entry_id' => $d->ledger_entry_id,
                    'nominal_dibayar' => (float) $d->nominal_dibayar,
                    'penerima' => $d->ledgerEntry?->penerima ? [
                        'nama' => $d->ledgerEntry->penerima->nama,
                        'nomor_induk_surveior' => $d->ledgerEntry->penerima->nomor_induk_surveior,
                    ] : null,
                ])->values(),
            ] : null;
        }

        return $base;
    }

    private function audit(string $aksi, HutangPajak $h, string $userId, array $extra): void
    {
        AuditTrail::create([
            'id' => (string) Str::uuid(),
            'aktor_id' => $userId,
            'aksi' => $aksi,
            'target_type' => 'HutangPajak',
            'target_id' => $h->id,
            'data_sebelum' => null,
            'data_sesudah' => array_merge([
                'jumlah_pajak' => (float) $h->jumlah_pajak,
                'status' => $h->status,
            ], $extra),
            'ip_address' => request()?->ip(),
            'user_agent' => request()?->userAgent(),
        ]);
    }
}
