<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AkunPengguna;
use App\Models\KonfigurasiPenugasan;
use App\Models\LaporanVerifikasi;
use App\Models\Penugasan;
use App\Models\TenagaAhli;
use App\Services\AuditService;
use App\Services\Keuangan\LedgerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Alur rekomendasi (FR-5.x):
 *   1. Verifikator finalize → laporan_verifikasi.status_rekomendasi = 'menunggu'
 *   2. Rekomendator (1 user default) melihat di menu Rekomendasi
 *   3. Rekomendator review → Setujui / Tolak
 *      - Setujui: status_rekomendasi = 'disetujui' → AP honor (surveior + verifikator + rekomendator)
 *      - Tolak:   status_rekomendasi = 'ditolak' + catatan
 *
 * Default rekomendator diset di Pengaturan Rekomendator (key
 * `default_rekomendator_user_id` di konfigurasi_penugasan).
 *
 * Privilege:
 *   - Pengaturan: 'Rekomendasi' (Ubah) — admin/keuangan boleh lihat
 *   - Approve/Tolak: hanya default rekomendator (cek di controller)
 */
class RekomendasiController extends Controller
{
    public const KUNCI_DEFAULT_REKOMENDATOR = 'default_rekomendator_user_id';

    public function __construct(
        private AuditService $audit,
        private LedgerService $ledger,
    ) {}

    /**
     * GET /api/rekomendasi
     * Daftar laporan verifikasi yang menunggu rekomendasi.
     * Privilege: Rekomendasi, Lihat
     */
    public function index(Request $request): JsonResponse
    {
        $lv = LaporanVerifikasi::with([
            'laporan.penugasan.siklus.faskes.jenisFaskes',
            'laporan.penugasan.siklus.lembaga',
            'verifikasiPenugasan.tenagaAhli',
        ])
            ->where('status_final', LaporanVerifikasi::STATUS_FINAL)
            ->where(function ($q) {
                $q->whereNull('status_rekomendasi')
                  ->orWhereIn('status_rekomendasi', [
                      LaporanVerifikasi::STATUS_REKOMENDASI_MENUNGGU,
                      LaporanVerifikasi::STATUS_REKOMENDASI_DITOLAK,
                  ]);
            })
            ->when(session('lembaga_id'), fn ($q, $lembagaId) => $q->whereHas(
                'laporan.penugasan.siklus',
                fn ($sub) => $sub->where('lembaga_id', $lembagaId)
            ))
            ->orderByDesc('finalized_at')
            ->get();

        return response()->json(['data' => $lv]);
    }

    /**
     * GET /api/rekomendasi/{laporanVerifikasi}
     * Detail laporan verifikasi + dokumen pendukung dari surveior & verifikator.
     * Privilege: Rekomendasi, Lihat
     */
    public function show(LaporanVerifikasi $laporanVerifikasi): JsonResponse
    {
        $this->guardLembaga($laporanVerifikasi);

        $lv = $laporanVerifikasi->load([
            'laporan.penugasan.tenagaAhli',
            'laporan.penugasan.siklus.faskes.jenisFaskes',
            'laporan.penugasan.siklus.lembaga',
            'laporan.penugasan.laporanPengerjaan',
            'verifikasiPenugasan.tenagaAhli',
        ]);

        $data = $lv->toArray();
        // Semua surveior yang ditugaskan pada siklus ini (survei = 1 TKPP + 1 TKSDU).
        $data['surveyor'] = $this->getSurveyor($lv);
        // Sertakan info default rekomendator untuk konteks
        $data['default_rekomendator'] = $this->getDefaultRekomendator();

        return response()->json(['data' => $data]);
    }

    /**
     * GET /api/rekomendasi/history
     * Riwayat siklus yang rekomendasinya sudah diputuskan (disetujui / ditolak).
     * Privilege: Rekomendasi, Lihat
     */
    public function history(Request $request): JsonResponse
    {
        $query = LaporanVerifikasi::with([
            'laporan.penugasan.siklus.faskes.jenisFaskes',
            'laporan.penugasan.siklus.lembaga',
            'verifikasiPenugasan.tenagaAhli',
        ])
            ->withCount('items')
            ->whereIn('status_rekomendasi', [
                LaporanVerifikasi::STATUS_REKOMENDASI_DISETUJUI,
                LaporanVerifikasi::STATUS_REKOMENDASI_DITOLAK,
            ])
            ->when(session('lembaga_id'), fn ($q, $lembagaId) => $q->whereHas(
                'laporan.penugasan.siklus',
                fn ($sub) => $sub->where('lembaga_id', $lembagaId)
            ));

        if ($request->filled('status')) {
            $query->where('status_rekomendasi', $request->string('status'));
        }

        if ($request->filled('q')) {
            $term = $request->string('q')->toString();
            $query->whereHas(
                'laporan.penugasan.siklus.faskes',
                fn ($fq) => $fq->where('nama', 'like', '%' . $term . '%')
            );
        }

        $perPage = min((int) $request->integer('per_page', 15), 50);
        $items = $query->orderByDesc('direkomendasikan_at')->paginate($perPage);

        // Nama surveior per siklus (1 query, bukan N+1 per baris)
        $siklusIds = $items->getCollection()
            ->map(fn ($lv) => $lv->laporan?->penugasan?->siklus_id)
            ->filter()
            ->unique()
            ->values()
            ->all();

        $surveyors = Penugasan::with('tenagaAhli')
            ->whereIn('siklus_id', $siklusIds)
            ->where('jenis', Penugasan::JENIS_SURVEI)
            ->where('status', '!=', Penugasan::STATUS_DIGANTIKAN)
            ->get()
            ->groupBy('siklus_id')
            ->map(fn ($list) => $list->map(fn ($p) => [
                'nama' => $p->tenagaAhli?->nama,
                'peran' => $p->tenagaAhli?->peran,
                'jenis_tenaga_ahli' => $p->tenagaAhli?->jenis,
            ])->sortBy(fn ($s) => $s['jenis_tenaga_ahli'] === TenagaAhli::JENIS_TKPP ? 0 : 1)->values()->toArray());

        $items->getCollection()->transform(function ($lv) use ($surveyors) {
            $siklus = $lv->laporan?->penugasan?->siklus;

            return [
                'id' => $lv->id,
                'siklus_id' => $siklus?->id,
                'faskes_nama' => $siklus?->faskes?->nama,
                'faskes_jenis' => $siklus?->faskes?->jenisFaskes?->nama,
                'lembaga_nama' => $siklus?->lembaga?->nama,
                'siklus_status' => $siklus?->status,
                'siklus_tahapan' => $siklus?->tahapan,
                'tanggal_validasi' => $siklus?->tanggal_validasi?->toIso8601String(),
                'surveyors' => $surveyors[$siklus?->id] ?? [],
                'verifikator_nama' => $lv->verifikasiPenugasan?->tenagaAhli?->nama,
                'status_rekomendasi' => $lv->status_rekomendasi,
                'direkomendasikan_at' => $lv->direkomendasikan_at?->toIso8601String(),
                'catatan_rekomendasi' => $lv->catatan_rekomendasi,
                'finalized_at' => $lv->finalized_at?->toIso8601String(),
                'jumlah_item_verifikasi' => $lv->items_count,
            ];
        });

        return response()->json($items);
    }

    /**
     * Daftar surveior pada siklus laporan verifikasi ini.
     * Survei selalu ditugaskan ke 2 tenaga ahli (1 TKPP + 1 TKSDU), masing-masing
     * dengan penugasan dan laporan pengerjaannya sendiri.
     */
    private function getSurveyor(LaporanVerifikasi $lv): array
    {
        $siklus = $lv->laporan?->penugasan?->siklus;
        if (! $siklus) {
            return [];
        }

        $list = Penugasan::with(['tenagaAhli', 'laporan', 'laporanPengerjaan'])
            ->where('siklus_id', $siklus->id)
            ->where('jenis', Penugasan::JENIS_SURVEI)
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'nama' => $p->tenagaAhli?->nama,
                'peran' => $p->tenagaAhli?->peran,
                'jenis_tenaga_ahli' => $p->tenagaAhli?->jenis,
                'nomor_induk_surveior' => $p->tenagaAhli?->nomor_induk_surveior,
                'status' => $p->status,
                'submitted_at' => $p->laporan?->submitted_at?->toIso8601String(),
                'keterangan' => $p->laporanPengerjaan?->keterangan,
            ])
            ->sortBy([
                // Penugasan yang sudah digantikan tampil paling akhir
                fn ($a, $b) => ($a['status'] === Penugasan::STATUS_DIGANTIKAN ? 1 : 0)
                    <=> ($b['status'] === Penugasan::STATUS_DIGANTIKAN ? 1 : 0),
                // TKPP lebih dulu, lalu TKSDU
                fn ($a, $b) => ($a['jenis_tenaga_ahli'] === TenagaAhli::JENIS_TKPP ? 0 : 1)
                    <=> ($b['jenis_tenaga_ahli'] === TenagaAhli::JENIS_TKPP ? 0 : 1),
            ])
            ->values();

        return $list->toArray();
    }

    /**
     * GET /api/rekomendator/default
     * Ambil user default rekomendator + profil singkat.
     * Privilege: Rekomendasi, Lihat
     */
    public function getDefault(Request $request): JsonResponse
    {
        $user = $this->getDefaultRekomendator();
        return response()->json(['data' => $user]);
    }

    /**
     * GET /api/rekomendator/candidates
     * Daftar user dengan role Rekomendator (untuk dropdown edit).
     * Di-scope ke lembaga aktif session agar admin hanya bisa pilih
     * rekomendator dari lembaganya sendiri.
     * Privilege: Rekomendasi, Lihat
     */
    public function getCandidates(Request $request): JsonResponse
    {
        $roleId = \App\Models\Role::where('nama_role', 'Rekomendator')->value('id');
        $query = AkunPengguna::withoutGlobalScope('lembaga')
            ->with(['tenagaAhli' => fn ($q) => $q->withoutGlobalScope('lembaga')])
            ->where('role_id', $roleId)
            ->where('status_akun', 'Aktif');

        // Filter per-lembaga: kandidat rekomendator milik lembaga aktif —
        // baik sebagai lembaga default akun maupun via pivot multi-lembaga.
        $sessionLembagaId = session('lembaga_id');
        if ($sessionLembagaId !== null) {
            $query->where(function ($q) use ($sessionLembagaId) {
                $q->where('lembaga_id', $sessionLembagaId)
                  ->orWhereHas('lembagas', fn ($sq) => $sq->where('lembaga.id', $sessionLembagaId));
            });
        }

        $users = $query
            ->orderBy('nama')
            ->get()
            ->map(fn ($u) => [
                'user_id' => $u->id,
                'nama' => $u->nama,
                'email' => $u->email,
                'status_akun' => $u->status_akun,
                'tenaga_ahli_id' => $u->tenaga_ahli_id,
                'tenaga_ahli' => $u->tenagaAhli ? [
                    'id' => $u->tenagaAhli->id,
                    'nama' => $u->tenagaAhli->nama,
                    'nomor_induk_surveior' => $u->tenagaAhli->nomor_induk_surveior,
                    'peran' => $u->tenagaAhli->peran,
                    'no_rekening' => $u->tenagaAhli->no_rekening,
                    'nama_bank' => $u->tenagaAhli->nama_bank,
                    'atas_nama_rekening' => $u->tenagaAhli->atas_nama_rekening,
                ] : null,
            ]);

        $lembagaAktif = $sessionLembagaId
            ? \App\Models\Lembaga::find($sessionLembagaId)
            : null;

        return response()->json([
            'data' => $users,
            'lembaga' => $lembagaAktif ? [
                'id' => $lembagaAktif->id,
                'nama' => $lembagaAktif->nama,
            ] : null,
        ]);
    }

    /**
     * PUT /api/rekomendator/default
     * Set user default rekomendator untuk lembaga aktif. Otorisasi lewat
     * privilege `Rekomendasi,Ubah` (route middleware). Bisa disetel oleh
     * Administrator atau Rekomendator.
     */
    public function setDefault(Request $request): JsonResponse
    {
        $data = $request->validate([
            'user_id' => 'required|uuid|exists:akun_pengguna,id',
        ]);

        $target = AkunPengguna::withoutGlobalScope('lembaga')->with('role')->findOrFail($data['user_id']);
        if ($target->role?->nama_role !== 'Rekomendator') {
            return response()->json([
                'message' => 'User yang dipilih harus memiliki role Rekomendator.',
            ], 422);
        }

        // Verifikasi user Rekomendator harus milik lembaga yang sama dengan session
        // (default akun atau pivot multi-lembaga)
        $sessionLembagaId = session('lembaga_id');
        $belongsToLembaga = $target->lembaga_id === $sessionLembagaId
            || ($sessionLembagaId !== null
                && $target->lembagas()->where('lembaga.id', $sessionLembagaId)->exists());
        if ($sessionLembagaId !== null && ! $belongsToLembaga) {
            return response()->json([
                'message' => 'User Rekomendator yang dipilih bukan milik lembaga Anda saat ini.',
            ], 422);
        }

        // Upsert per-lembaga: setiap lembaga punya 1 default rekomendator sendiri
        KonfigurasiPenugasan::set(
            self::KUNCI_DEFAULT_REKOMENDATOR,
            $data['user_id'],
            $sessionLembagaId,
            "Default rekomendator untuk lembaga aktif (auto-muncul di menu Rekomendasi setelah verifikator finalize)."
        );

        $this->audit->record(
            'rekomendator.default.set',
            null,
            $target,
            'AkunPengguna',
            $target->id,
        );

        return response()->json([
            'data' => $this->getDefaultRekomendator(),
            'message' => "Default rekomendator disetel ke {$target->nama}.",
        ]);
    }

    /**
     * POST /api/rekomendasi/{laporanVerifikasi}/setujui
     * Rekomendator menyetujui verifikasi. AP honor 3 peran dicatat.
     * Hanya default rekomendator yang boleh memanggil.
     * Privilege: Rekomendasi, Setujui
     */
    public function setujui(Request $request, LaporanVerifikasi $laporanVerifikasi): JsonResponse
    {
        $lv = $laporanVerifikasi;
        $user = $request->user();

        $this->guardLembaga($lv);

        // Otorisasi: hanya default rekomendator untuk LEMBAGA AKTIF SESSION
        // (tiap lembaga punya rekomendator sendiri, lookup via session lembaga_id)
        $defaultUserId = KonfigurasiPenugasan::value(self::KUNCI_DEFAULT_REKOMENDATOR);
        if (! $defaultUserId || $user->id !== $defaultUserId) {
            $lembagaName = session('lembaga_id') ? (\App\Models\Lembaga::find(session('lembaga_id'))?->nama ?? 'lembaga ini') : 'lembaga ini';
            return response()->json([
                'message' => "Hanya default rekomendator untuk lembaga {$lembagaName} yang dapat menyetujui.",
            ], 403);
        }

        if ($lv->rekomendasiDisetujui()) {
            return response()->json([
                'message' => 'Rekomendasi sudah disetujui sebelumnya.',
            ], 422);
        }

        $lv->forceFill([
            'status_rekomendasi' => LaporanVerifikasi::STATUS_REKOMENDASI_DISETUJUI,
            'direkomendasikan_at' => now(),
        ])->save();

        // Trigger pencatatan 3 AP honor
        try {
            $result = $this->ledger->triggerHonorSetelahRekomendasi($lv);
        } catch (\Throwable $e) {
            \Log::error('rekomendasi.setujui.trigger_failed', [
                'laporan_verifikasi_id' => $lv->id,
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'message' => 'Rekomendasi disetujui, tetapi pencatatan AP honor gagal: ' . $e->getMessage(),
            ], 500);
        }

        $this->audit->record(
            'rekomendasi.setujui',
            null,
            $lv->fresh(),
            'LaporanVerifikasi',
            $lv->id,
        );

        return response()->json([
            'data' => $lv->fresh([
                'laporan.penugasan.siklus.faskes',
                'verifikasiPenugasan.tenagaAhli',
            ]),
            'entries' => array_map(
                fn ($e) => $e ? ['id' => $e->id, 'tipe' => $e->tipe, 'nominal_neto' => $e->nominal_neto] : null,
                $result['entries'],
            ),
            'message' => 'Rekomendasi disetujui. AP honor untuk surveior, verifikator, dan rekomendator sudah dicatat.',
        ]);
    }

    /**
     * POST /api/rekomendasi/{laporanVerifikasi}/tolak
     * Rekomendator menolak verifikasi dengan catatan wajib.
     * Privilege: Rekomendasi, Setujui
     */
    public function tolak(Request $request, LaporanVerifikasi $laporanVerifikasi): JsonResponse
    {
        $data = $request->validate([
            'catatan' => 'required|string|min:5|max:2000',
        ]);

        $lv = $laporanVerifikasi;
        $user = $request->user();

        $this->guardLembaga($lv);

        $defaultUserId = KonfigurasiPenugasan::value(self::KUNCI_DEFAULT_REKOMENDATOR);
        if (! $defaultUserId || $user->id !== $defaultUserId) {
            $lembagaName = session('lembaga_id') ? (\App\Models\Lembaga::find(session('lembaga_id'))?->nama ?? 'lembaga ini') : 'lembaga ini';
            return response()->json([
                'message' => "Hanya default rekomendator untuk lembaga {$lembagaName} yang dapat menolak.",
            ], 403);
        }

        if ($lv->rekomendasiDisetujui()) {
            return response()->json([
                'message' => 'Tidak dapat menolak rekomendasi yang sudah disetujui.',
            ], 422);
        }

        $lv->forceFill([
            'status_rekomendasi' => LaporanVerifikasi::STATUS_REKOMENDASI_DITOLAK,
            'direkomendasikan_at' => now(),
            'catatan_rekomendasi' => $data['catatan'],
        ])->save();

        $this->audit->record(
            'rekomendasi.tolak',
            null,
            $lv->fresh(),
            'LaporanVerifikasi',
            $lv->id,
        );

        return response()->json([
            'data' => $lv->fresh(),
            'message' => 'Rekomendasi ditolak. Verifikator/admin perlu menindaklanjuti catatan.',
        ]);
    }

    /**
     * Pastikan laporan verifikasi yang diakses berada di lembaga aktif
     * session. Menolak dengan 403 agar rekomendator satu lembaga tidak
     * bisa menyetujui verifikasi lembaga lain.
     */
    private function guardLembaga(LaporanVerifikasi $lv): void
    {
        $lembagaId = session('lembaga_id');
        if ($lembagaId === null) {
            return;
        }

        $lv->loadMissing([
            'laporan.penugasan.siklus',
            'verifikasiPenugasan.siklus',
        ]);

        $lembagaPemilik = $lv->laporan?->penugasan?->siklus?->lembaga_id
            ?? $lv->verifikasiPenugasan?->siklus?->lembaga_id;

        if ($lembagaPemilik === null || $lembagaPemilik === $lembagaId) {
            return;
        }

        $nama = \App\Models\Lembaga::find($lembagaPemilik)?->nama ?? 'lain';

        abort(response()->json([
            'message' => "Laporan verifikasi ini milik lembaga \"{$nama}\". Anda sedang di lembaga lain.",
        ], 403));
    }

    /**
     * Ambil profil default rekomendator untuk lembaga aktif session.
     * Lookup KonfigurasiPenugasan otomatis memfilter by session lembaga
     * (tiap lembaga punya rekomendator sendiri). Return null jika belum
     * disetel untuk lembaga tersebut.
     */
    private function getDefaultRekomendator(): ?array
    {
        $userId = KonfigurasiPenugasan::value(self::KUNCI_DEFAULT_REKOMENDATOR);
        if (! $userId) {
            return null;
        }
        $u = AkunPengguna::withoutGlobalScope('lembaga')
            ->with(['role', 'tenagaAhli' => fn ($q) => $q->withoutGlobalScope('lembaga')])
            ->find($userId);
        if (! $u) {
            return null;
        }
        return [
            'user_id' => $u->id,
            'nama' => $u->nama,
            'email' => $u->email,
            'role' => $u->role?->nama_role,
            'tenaga_ahli_id' => $u->tenaga_ahli_id,
            'tenaga_ahli' => $u->tenagaAhli ? [
                'id' => $u->tenagaAhli->id,
                'nama' => $u->tenagaAhli->nama,
                'nomor_induk_surveior' => $u->tenagaAhli->nomor_induk_surveior,
                'peran' => $u->tenagaAhli->peran,
                'no_rekening' => $u->tenagaAhli->no_rekening,
                'nama_bank' => $u->tenagaAhli->nama_bank,
                'atas_nama_rekening' => $u->tenagaAhli->atas_nama_rekening,
            ] : null,
        ];
    }
}
