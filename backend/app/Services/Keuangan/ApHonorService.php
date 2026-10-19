<?php

namespace App\Services\Keuangan;

use App\Models\AuditTrail;
use App\Models\LedgerEntry;
use App\Models\PembayaranHonor;
use App\Models\PembayaranHonorDetail;
use App\Models\TenagaAhli;
use App\Services\AttachmentService;
use App\Services\Keuangan\HutangPajakService;
use App\Services\Keuangan\SettlementJournalService;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * ApHonorService — Accounts Payable untuk honor Surveior/Verifikator.
 *
 * Mengelola alur pembayaran honor (FR-5.2/5.3 + AP operasional):
 *   1. Honor entry tercipta otomatis via LedgerService (status_pembayaran=belum_dibayar)
 *   2. Keuangan membuat pembayaran (draft) — memilih N honor entry
 *   3. Keuangan menyetujui pembayaran → status=draft→disetujui, honor.status=lunas
 *   4. (Atau) Keuangan membatalkan draft → tidak ada perubahan status honor
 *   5. Honor yang sudah lunas masuk hitungan bukti potong PPh 21 (BuktiPotongService)
 *
 * Invariants:
 *   - Satu honor entry hanya boleh di satu pembayaran (DB UNIQUE on ledger_entry_id)
 *   - total_nominal = SUM(detail.nominal_dibayar) (di-check saat approve)
 *   - status_pembayaran honor berubah ke 'lunas' hanya saat pembayaran disetujui
 *   - Pembatalan pembayaran yang sudah disetujui → honor kembali ke 'belum_dibayar'
 */
class ApHonorService
{
    // ─── List / Query ─────────────────────────────────────────────────────

    /**
     * Daftar honor entry yang belum dibayar (status_pembayaran = 'belum_dibayar')
     * dan bertipe AP honor. Filter opsional: peran, penerima_id, periode.
     */
    public function listOutstanding(array $filters = []): Collection
    {
        $query = LedgerEntry::query()
            ->with(['penerima', 'siklus.faskes', 'konfigurasiPajak'])
            ->whereIn('tipe', [
                LedgerEntry::TIPE_AP_HONOR_SURVEIOR,
                LedgerEntry::TIPE_AP_HONOR_VERIFIKATOR,
                LedgerEntry::TIPE_AP_HONOR_REKOMENDATOR,
            ])
            ->where('status_pembayaran', LedgerEntry::STATUS_BELUM_DIBAYAR);

        if (isset($filters['peran']) && in_array($filters['peran'], ['surveior', 'verifikator', 'rekomendator'], true)) {
            $tipeMap = [
                'surveior' => LedgerEntry::TIPE_AP_HONOR_SURVEIOR,
                'verifikator' => LedgerEntry::TIPE_AP_HONOR_VERIFIKATOR,
                'rekomendator' => LedgerEntry::TIPE_AP_HONOR_REKOMENDATOR,
            ];
            $query->where('tipe', $tipeMap[$filters['peran']]);
        }
        if (! empty($filters['penerima_id'])) {
            $query->where('penerima_tenaga_ahli_id', $filters['penerima_id']);
        }
        if (! empty($filters['siklus_id'])) {
            $query->where('siklus_id', $filters['siklus_id']);
        }
        if (! empty($filters['tahun']) && ! empty($filters['bulan'])) {
            $start = Carbon::create($filters['tahun'], $filters['bulan'], 1)->startOfMonth();
            $end = $start->copy()->endOfMonth();
            $query->whereBetween('created_at', [$start, $end]);
        }
        if (! empty($filters['q'])) {
            $q = $filters['q'];
            $query->where(function ($w) use ($q) {
                $w->whereHas('penerima', fn ($p) => $p
                    ->where('nama', 'like', "%{$q}%")
                    ->orWhere('nomor_induk_surveior', 'like', "%{$q}%")
                )->orWhereHas('siklus.faskes', fn ($f) => $f->where('nama', 'like', "%{$q}%"));
            });
        }

        // GATE: hanya tampilkan honor jika siklus terkait sudah disetujui rekomendator.
        // Entry diciptakan via LedgerService::triggerHonorSetelahRekomendasi() yang dipanggil
        // SAAT rekomendator menekan "Setujui" di RekomendasiWorkspace. Guard ini bersifat
        // defensif — memastikan entry tidak tampil jika LaporanVerifikasi terkait belum/disetujui.
        $query->whereHas('siklus', function ($s) {
            $s->whereHas('laporanVerifikasi', function ($lv) {
                $lv->where('status_rekomendasi', 'disetujui');
            });
        });

        return $query
            ->orderBy('created_at')
            ->orderBy('penerima_tenaga_ahli_id')
            ->get()
            ->map(fn (LedgerEntry $e) => $this->presentOutstandingEntry($e));
    }

    /**
     * Rekap per-penerima dari semua entry honor yang belum dibayar.
     * Dipakai untuk batching pembayaran dan untuk dashboard "per penerima".
     */
    public function outstandingPerTenagaAhli(array $filters = []): Collection
    {
        $entries = $this->listOutstanding($filters);
        return $entries->groupBy('penerima.tenaga_ahli_id')->map(function (Collection $items, $taId) {
            $first = $items->first();
            return [
                'tenaga_ahli_id' => $taId,
                'nomor_induk_surveior' => $first['penerima']['nomor_induk_surveior'] ?? null,
                'nama' => $first['penerima']['nama'] ?? null,
                'peran' => match ($first['tipe']) {
                    LedgerEntry::TIPE_AP_HONOR_SURVEIOR => 'surveior',
                    LedgerEntry::TIPE_AP_HONOR_VERIFIKATOR => 'verifikator',
                    LedgerEntry::TIPE_AP_HONOR_REKOMENDATOR => 'rekomendator',
                    default => 'unknown',
                },
                'jumlah_penugasan' => $items->count(),
                'total_bruto' => round($items->sum('nominal_bruto'), 2),
                'total_potongan_ppn' => round($items->sum('potongan_ppn'), 2),
                'total_potongan_pph' => round($items->sum('potongan_pph'), 2),
                'total_neto' => round($items->sum('nominal_neto'), 2),
                'entry_ids' => $items->pluck('id')->all(),
            ];
        })->values();
    }

    /**
     * Riwayat pembayaran (header) — diurut terbaru.
     */
    public function listPayments(array $filters = []): Collection
    {
        $query = PembayaranHonor::with(['details.ledgerEntry.penerima', 'pembuat', 'penyetuju']);

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (! empty($filters['tahun']) && ! empty($filters['bulan'])) {
            $start = Carbon::create($filters['tahun'], $filters['bulan'], 1)->startOfMonth();
            $end = $start->copy()->endOfMonth();
            $query->whereBetween('tanggal_pembayaran', [$start->toDateString(), $end->toDateString()]);
        }

        return $query
            ->orderByDesc('tanggal_pembayaran')
            ->orderByDesc('created_at')
            ->limit(200)
            ->get()
            ->map(fn (PembayaranHonor $p) => $this->presentPayment($p));
    }

    public function getPayment(string $pembayaranId): ?array
    {
        $p = PembayaranHonor::with(['details.ledgerEntry.penerima', 'details.ledgerEntry.siklus.faskes', 'pembuat', 'penyetuju', 'pembatal'])
            ->find($pembayaranId);
        return $p ? $this->presentPayment($p, withDetails: true) : null;
    }

    // ─── Dashboard / KPI ──────────────────────────────────────────────────

    /**
     * Snapshot untuk dasbor AP Keuangan — KPI, aging, top penerima.
     */
    public function dashboardSnapshot(): array
    {
        $outstanding = LedgerEntry::whereIn('tipe', [
                LedgerEntry::TIPE_AP_HONOR_SURVEIOR,
                LedgerEntry::TIPE_AP_HONOR_VERIFIKATOR,
                LedgerEntry::TIPE_AP_HONOR_REKOMENDATOR,
            ])
            ->where('status_pembayaran', LedgerEntry::STATUS_BELUM_DIBAYAR)
            ->whereHas('siklus', function ($s) {
                $s->whereHas('laporanVerifikasi', function ($lv) {
                    $lv->where('status_rekomendasi', 'disetujui');
                });
            });

        $kpi = [
            'total_ap_outstanding' => (float) $outstanding->sum('nominal_neto'),
            'jumlah_honor_belum_dibayar' => $outstanding->count(),
            'jumlah_surveior_outstanding' => (clone $outstanding)->where('tipe', LedgerEntry::TIPE_AP_HONOR_SURVEIOR)->count(),
            'jumlah_verifikator_outstanding' => (clone $outstanding)->where('tipe', LedgerEntry::TIPE_AP_HONOR_VERIFIKATOR)->count(),
            'jumlah_rekomendator_outstanding' => (clone $outstanding)->where('tipe', LedgerEntry::TIPE_AP_HONOR_REKOMENDATOR)->count(),
        ];

        $startOfMonth = now()->startOfMonth();
        $endOfMonth = now()->endOfMonth();
        $kpi['total_dibayar_bulan_ini'] = (float) PembayaranHonor::where('status', PembayaranHonor::STATUS_DISETUJUI)
            ->whereBetween('tanggal_pembayaran', [$startOfMonth->toDateString(), $endOfMonth->toDateString()])
            ->sum('total_nominal');
        $kpi['jumlah_pembayaran_bulan_ini'] = PembayaranHonor::where('status', PembayaranHonor::STATUS_DISETUJUI)
            ->whereBetween('tanggal_pembayaran', [$startOfMonth->toDateString(), $endOfMonth->toDateString()])
            ->count();

        return [
            'kpi' => $kpi,
            'aging' => $this->apAging($outstanding),
            'top_penerima' => $this->apTopPenerima($outstanding),
            'tanggal_snapshot' => now()->toDateString(),
        ];
    }

    /**
     * Aging buckets untuk AP outstanding, dihitung dari created_at
     * entry honor (tanggal honor menjadi tagihan).
     */
    private function apAging($query): array
    {
        $now = now();
        $entries = $query->get(['id', 'nominal_neto', 'created_at']);
        $buckets = [
            '0_30' => ['nilai' => 0.0, 'count' => 0, 'label' => '0-30 hari'],
            '31_60' => ['nilai' => 0.0, 'count' => 0, 'label' => '31-60 hari'],
            '61_90' => ['nilai' => 0.0, 'count' => 0, 'label' => '61-90 hari'],
            '>90' => ['nilai' => 0.0, 'count' => 0, 'label' => '>90 hari'],
        ];
        foreach ($entries as $e) {
            $days = (int) $now->diffInDays(Carbon::parse($e->created_at), false) * -1; // positive = days ago
            $days = max(0, $days);
            $key = match (true) {
                $days <= 30 => '0_30',
                $days <= 60 => '31_60',
                $days <= 90 => '61_90',
                default => '>90',
            };
            $buckets[$key]['nilai'] += (float) $e->nominal_neto;
            $buckets[$key]['count'] += 1;
        }
        foreach ($buckets as $k => $b) {
            $buckets[$k]['nilai'] = round($b['nilai'], 2);
        }
        return $buckets;
    }

    private function apTopPenerima($query): Collection
    {
        return $query
            ->selectRaw('penerima_tenaga_ahli_id, COUNT(*) as jumlah, SUM(nominal_neto) as total')
            ->groupBy('penerima_tenaga_ahli_id')
            ->orderByDesc('total')
            ->limit(10)
            ->get()
            ->map(function ($row) {
                $ta = TenagaAhli::find($row->penerima_tenaga_ahli_id);
                return [
                    'tenaga_ahli_id' => $row->penerima_tenaga_ahli_id,
                    'nomor_induk_surveior' => $ta?->nomor_induk_surveior,
                    'nama' => $ta?->nama,
                    'jumlah_honor' => (int) $row->jumlah,
                    'total_neto' => round((float) $row->total, 2),
                ];
            });
    }

    // ─── Mutation: Create / Approve / Cancel ──────────────────────────────

    /**
     * Buat pembayaran draft. Honor-honor yang dipilih akan di-"lock"
     * (cek status masih belum_dibayar). Jika ada yang sudah lunas atau
     * tidak ditemukan, return null + error message.
     *
     * @param  string[]  $ledgerEntryIds
     * @return array{success: bool, pembayaran?: PembayaranHonor, error?: string}
     */
    public function createPayment(
        array $ledgerEntryIds,
        array $paymentMeta,
        string $userId,
        $buktiTransferFile = null,
    ): array {
        if (empty($ledgerEntryIds)) {
            return ['success' => false, 'error' => 'Pilih minimal satu honor entry untuk dibayar.'];
        }

        $entries = LedgerEntry::whereIn('id', $ledgerEntryIds)
            ->whereIn('tipe', [
                LedgerEntry::TIPE_AP_HONOR_SURVEIOR,
                LedgerEntry::TIPE_AP_HONOR_VERIFIKATOR,
                LedgerEntry::TIPE_AP_HONOR_REKOMENDATOR,
            ])
            ->get();

        if ($entries->count() !== count($ledgerEntryIds)) {
            return ['success' => false, 'error' => 'Sebagian honor entry tidak ditemukan atau bukan AP honor.'];
        }

        $notPayable = $entries->filter(fn ($e) => ! $e->isBelumDibayar());
        if ($notPayable->isNotEmpty()) {
            return [
                'success' => false,
                'error' => 'Sebagian entry sudah lunas: ' . $notPayable->pluck('id')->take(3)->implode(', '),
            ];
        }

        return DB::transaction(function () use ($entries, $paymentMeta, $userId, $buktiTransferFile) {
            $total = round((float) $entries->sum('nominal_neto'), 2);
            $nomor = $this->generateNomorPembayaran(Carbon::parse($paymentMeta['tanggal_pembayaran'] ?? now()));

            $pathBukti = null;
            if ($buktiTransferFile) {
                $attachment = new AttachmentService();
                $pathBukti = $attachment->store($buktiTransferFile, 'bukti_pembayaran');
            }

            $p = PembayaranHonor::create([
                'id' => (string) Str::uuid(),
                'nomor_pembayaran' => $nomor,
                'tanggal_pembayaran' => $paymentMeta['tanggal_pembayaran'] ?? now()->toDateString(),
                'metode' => $paymentMeta['metode'] ?? PembayaranHonor::METODE_TRANSFER,
                'bank_pengirim' => $paymentMeta['bank_pengirim'] ?? null,
                'nomor_rekening_tujuan' => $paymentMeta['nomor_rekening_tujuan'] ?? null,
                'atas_nama' => $paymentMeta['atas_nama'] ?? null,
                'total_nominal' => $total,
                'status' => PembayaranHonor::STATUS_DRAFT,
                'dibuat_oleh' => $userId,
                'catatan' => $paymentMeta['catatan'] ?? null,
                'path_bukti_transfer' => $pathBukti,
            ]);

            foreach ($entries as $e) {
                PembayaranHonorDetail::create([
                    'id' => (string) Str::uuid(),
                    'pembayaran_honor_id' => $p->id,
                    'ledger_entry_id' => $e->id,
                    'nominal_dibayar' => (float) $e->nominal_neto,
                ]);
            }

            $this->audit('ap_honor.payment_created', $p, $userId, [
                'nomor_pembayaran' => $nomor,
                'jumlah_line_item' => $entries->count(),
                'total_nominal' => $total,
                'metode' => $p->metode,
            ]);

            Log::info('ap_honor.payment_created', [
                'pembayaran_id' => $p->id,
                'nomor' => $nomor,
                'total' => $total,
                'lines' => $entries->count(),
            ]);

            return ['success' => true, 'pembayaran' => $p->fresh(['details'])];
        });
    }

    /**
     * Setujui pembayaran: ubah status → disetujui, setujui_oleh, tanggal_disetujui.
     * Update semua honor entry terkait → status_pembayaran='lunas', tanggal_dibayar.
     * Idempotent: pembayaran yang sudah disetujui tidak diproses ulang.
     */
    public function approvePayment(string $pembayaranId, string $userId): array
    {
        return DB::transaction(function () use ($pembayaranId, $userId) {
            $p = PembayaranHonor::with('details')->lockForUpdate()->find($pembayaranId);
            if (! $p) {
                return ['success' => false, 'error' => 'Pembayaran tidak ditemukan.'];
            }
            if ($p->status === PembayaranHonor::STATUS_DISETUJUI) {
                return ['success' => true, 'pembayaran' => $p, 'info' => 'Pembayaran sudah disetujui sebelumnya.'];
            }
            if ($p->status === PembayaranHonor::STATUS_DIBATALKAN) {
                return ['success' => false, 'error' => 'Pembayaran sudah dibatalkan, tidak dapat disetujui.'];
            }

            $p->update([
                'status' => PembayaranHonor::STATUS_DISETUJUI,
                'disetujui_oleh' => $userId,
                'tanggal_disetujui' => now(),
            ]);

            $detailIds = $p->details->pluck('ledger_entry_id');
            LedgerEntry::whereIn('id', $detailIds)
                ->where('status_pembayaran', LedgerEntry::STATUS_BELUM_DIBAYAR)
                ->update([
                    'status_pembayaran' => LedgerEntry::STATUS_LUNAS,
                    'tanggal_dibayar' => $p->tanggal_pembayaran,
                ]);

            // Buat hutang pajak PPh 21 untuk setiap penerima honor
            $hutangService = new HutangPajakService();
            $hutangService->createFromPembayaran($p, $userId);

            // Settlement AP Honor — catat jurnal umum (Dr Utang Honor, Cr Bank)
            // agar kas keluar dan pelunasan hutang honor tercatat di buku besar
            // sesuai prinsip double-entry.
            $settlementService = new SettlementJournalService();
            $settlementService->recordApHonorSettlement(
                pembayaran: $p,
                userId: $userId,
            );

            $this->audit('ap_honor.payment_approved', $p, $userId, [
                'nomor_pembayaran' => $p->nomor_pembayaran,
                'jumlah_line_item' => $p->details->count(),
                'total_nominal' => (float) $p->total_nominal,
            ]);

            Log::info('ap_honor.payment_approved', [
                'pembayaran_id' => $p->id,
                'total' => (float) $p->total_nominal,
            ]);

            return ['success' => true, 'pembayaran' => $p->fresh(['details'])];
        });
    }

    /**
     * Batalkan pembayaran. Jika masih draft → hapus detail & pembayaran.
     * Jika sudah disetujui → tandai dibatalkan, KEMBALIKAN status honor
     * ke belum_dibayar (pembayaran bisa diulang/dikoreksi).
     */
    public function cancelPayment(string $pembayaranId, string $userId, string $alasan): array
    {
        return DB::transaction(function () use ($pembayaranId, $userId, $alasan) {
            $p = PembayaranHonor::with('details')->lockForUpdate()->find($pembayaranId);
            if (! $p) {
                return ['success' => false, 'error' => 'Pembayaran tidak ditemukan.'];
            }
            if ($p->status === PembayaranHonor::STATUS_DIBATALKAN) {
                return ['success' => true, 'pembayaran' => $p, 'info' => 'Pembayaran sudah dibatalkan sebelumnya.'];
            }

            $wasApproved = $p->status === PembayaranHonor::STATUS_DISETUJUI;
            $detailIds = $p->details->pluck('ledger_entry_id');

            $p->update([
                'status' => PembayaranHonor::STATUS_DIBATALKAN,
                'dibatalkan_oleh' => $userId,
                'tanggal_dibatalkan' => now(),
                'alasan_batal' => $alasan,
            ]);

            // Kembalikan honor ke belum_dibayar HANYA jika pembayaran sudah
            // disetujui (jadi rollback). Jika masih draft, honor tetap
            // belum_dibayar (tidak berubah).
            if ($wasApproved) {
                LedgerEntry::whereIn('id', $detailIds)
                    ->update([
                        'status_pembayaran' => LedgerEntry::STATUS_BELUM_DIBAYAR,
                        'tanggal_dibayar' => null,
                    ]);
            }

            // Hapus detail rows agar honor entry bisa dimasukkan ke
            // pembayaran baru. Audit trail tetap mencatat pembatalan
            // via aksi 'ap_honor.payment_cancelled' di atas.
            PembayaranHonorDetail::where('pembayaran_honor_id', $p->id)->delete();

            $this->audit('ap_honor.payment_cancelled', $p, $userId, [
                'nomor_pembayaran' => $p->nomor_pembayaran,
                'alasan' => $alasan,
                'was_approved' => $wasApproved,
            ]);

            Log::info('ap_honor.payment_cancelled', [
                'pembayaran_id' => $p->id,
                'was_approved' => $wasApproved,
                'alasan' => $alasan,
            ]);

            return ['success' => true, 'pembayaran' => $p->fresh(['details'])];
        });
    }

    // ─── Helpers ──────────────────────────────────────────────────────────

    /**
     * Generate nomor pembayaran dengan format BYR/YYYY/MM/NNNN
     * — urut per bulan, reset tiap bulan.
     */
    private function generateNomorPembayaran(Carbon $tanggal): string
    {
        $prefix = sprintf('BYR/%04d/%02d/', $tanggal->year, $tanggal->month);
        $count = PembayaranHonor::whereYear('tanggal_pembayaran', $tanggal->year)
            ->whereMonth('tanggal_pembayaran', $tanggal->month)
            ->count();
        return $prefix . str_pad((string) ($count + 1), 4, '0', STR_PAD_LEFT);
    }

    private function audit(string $aksi, PembayaranHonor $p, string $userId, array $extra): void
    {
        AuditTrail::create([
            'id' => (string) Str::uuid(),
            'aktor_id' => $userId,
            'aksi' => $aksi,
            'target_type' => 'PembayaranHonor',
            'target_id' => $p->id,
            'data_sebelum' => null,
            'data_sesudah' => array_merge([
                'nomor_pembayaran' => $p->nomor_pembayaran,
                'status' => $p->status,
                'total_nominal' => (float) $p->total_nominal,
            ], $extra),
            'ip_address' => request()?->ip(),
            'user_agent' => request()?->userAgent(),
        ]);
    }

    private function presentOutstandingEntry(LedgerEntry $e): array
    {
        $hariOutstanding = (int) now()->diffInDays(Carbon::parse($e->created_at), false) * -1;
        return [
            'id' => $e->id,
            'tipe' => $e->tipe,
            'status_pembayaran' => $e->status_pembayaran,
            'tanggal_honor' => $e->created_at?->toDateString(),
            'hari_outstanding' => max(0, $hariOutstanding),
            'nominal_bruto' => (float) $e->nominal_bruto,
            'dpp' => round((float) $e->nominal_bruto * 0.5, 2),
            'potongan_ppn' => 0.0,
            'potongan_pph' => (float) $e->potongan_pph,
            'nominal_neto' => (float) $e->nominal_neto,
            'penerima' => $e->penerima ? [
                'tenaga_ahli_id' => $e->penerima->id,
                'nomor_induk_surveior' => $e->penerima->nomor_induk_surveior,
                'nama' => $e->penerima->nama,
                'peran' => $e->penerima->peran,
                'npwp' => $e->penerima->npwp,
                'nama_pajak' => $e->penerima->nama_pajak,
                'no_rekening' => $e->penerima->no_rekening,
                'nama_bank' => $e->penerima->nama_bank,
                'atas_nama_rekening' => $e->penerima->atas_nama_rekening,
            ] : null,
            'siklus' => $e->siklus ? [
                'id' => $e->siklus->id,
                'faskes_nama' => $e->siklus->faskes?->nama,
            ] : null,
            'penugasan_id' => $e->detail['penugasan_id'] ?? null,
        ];
    }

    private function presentPayment(PembayaranHonor $p, bool $withDetails = false): array
    {
        $base = [
            'id' => $p->id,
            'nomor_pembayaran' => $p->nomor_pembayaran,
            'tanggal_pembayaran' => $p->tanggal_pembayaran?->toDateString(),
            'metode' => $p->metode,
            'bank_pengirim' => $p->bank_pengirim,
            'nomor_rekening_tujuan' => $p->nomor_rekening_tujuan,
            'atas_nama' => $p->atas_nama,
            'total_nominal' => (float) $p->total_nominal,
            'status' => $p->status,
            'dibuat_oleh' => $p->pembuat?->nama ?? $p->dibuat_oleh,
            'dibuat_pada' => $p->created_at?->toIso8601String(),
            'disetujui_oleh' => $p->penyetuju?->nama ?? $p->disetujui_oleh,
            'tanggal_disetujui' => $p->tanggal_disetujui?->toIso8601String(),
            'dibatalkan_oleh' => $p->pembatal?->nama ?? $p->dibatalkan_oleh,
            'tanggal_dibatalkan' => $p->tanggal_dibatalkan?->toIso8601String(),
            'alasan_batal' => $p->alasan_batal,
            'catatan' => $p->catatan,
            'path_bukti_transfer' => $p->path_bukti_transfer,
            'url_bukti_transfer' => $p->path_bukti_transfer
                ? (new AttachmentService())->signedUrl($p->path_bukti_transfer, 1440)
                : null,
            'jumlah_line_item' => $p->details->count(),
        ];
        if ($withDetails) {
            $base['details'] = $p->details->map(function (PembayaranHonorDetail $d) {
                $e = $d->ledgerEntry;
                return [
                    'id' => $d->id,
                    'ledger_entry_id' => $d->ledger_entry_id,
                    'nominal_dibayar' => (float) $d->nominal_dibayar,
                    'nominal_bruto' => (float) ($e->nominal_bruto ?? 0),
                    'dpp' => round((float) ($e->nominal_bruto ?? 0) * 0.5, 2),
                    'potongan_ppn' => 0.0,
                    'potongan_pph' => (float) ($e->potongan_pph ?? 0),
                    'penerima' => $e?->penerima ? [
                        'nama' => $e->penerima->nama,
                        'nomor_induk_surveior' => $e->penerima->nomor_induk_surveior,
                        'peran' => $e->penerima->peran,
                    ] : null,
                    'siklus_faskes_nama' => $e?->siklus?->faskes?->nama,
                    'tanggal_honor' => $e?->created_at?->toDateString(),
                ];
            })->values();
        }
        return $base;
    }
}