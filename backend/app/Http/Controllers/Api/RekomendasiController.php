<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AkunPengguna;
use App\Models\KonfigurasiPenugasan;
use App\Models\LaporanVerifikasi;
use App\Models\Penugasan;
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
        $lv = $laporanVerifikasi->load([
            'laporan.penugasan.tenagaAhli',
            'laporan.penugasan.siklus.faskes.jenisFaskes',
            'laporan.penugasan.siklus.lembaga',
            'laporan.penugasan.laporanPengerjaan',
            'verifikasiPenugasan.tenagaAhli',
            'items',
        ]);

        $data = $lv->toArray();
        // Sertakan info default rekomendator untuk konteks
        $data['default_rekomendator'] = $this->getDefaultRekomendator();

        return response()->json(['data' => $data]);
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
     * Privilege: Rekomendasi, Lihat
     */
    public function getCandidates(Request $request): JsonResponse
    {
        $roleId = \App\Models\Role::where('nama_role', 'Rekomendator')->value('id');
        $users = AkunPengguna::with(['tenagaAhli'])
            ->where('role_id', $roleId)
            ->where('status_akun', 'Aktif')
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
                ] : null,
            ]);

        return response()->json(['data' => $users]);
    }

    /**
     * PUT /api/rekomendator/default
     * Set user default rekomendator. Otorisasi lewat privilege
     * `Rekomendasi,Ubah` (route middleware). Bisa disetel oleh Administrator
     * atau Rekomendator.
     */
    public function setDefault(Request $request): JsonResponse
    {
        $data = $request->validate([
            'user_id' => 'required|uuid|exists:akun_pengguna,id',
        ]);

        $target = AkunPengguna::with('role')->findOrFail($data['user_id']);
        if ($target->role?->nama_role !== 'Rekomendator') {
            return response()->json([
                'message' => 'User yang dipilih harus memiliki role Rekomendator.',
            ], 422);
        }

        // Upsert
        $row = KonfigurasiPenugasan::where('kunci', self::KUNCI_DEFAULT_REKOMENDATOR)->first();
        if ($row) {
            $row->forceFill(['nilai' => $data['user_id']])->save();
        } else {
            KonfigurasiPenugasan::create([
                'kunci' => self::KUNCI_DEFAULT_REKOMENDATOR,
                'nilai' => $data['user_id'],
                'deskripsi' => 'User default yang menjadi rekomendator (auto-muncul di menu Rekomendasi setelah verifikator finalize).',
            ]);
        }

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

        // Otorisasi: hanya default rekomendator
        $defaultUserId = KonfigurasiPenugasan::value(self::KUNCI_DEFAULT_REKOMENDATOR);
        if (! $defaultUserId || $user->id !== $defaultUserId) {
            return response()->json([
                'message' => 'Hanya default rekomendator yang dapat menyetujui.',
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

        $defaultUserId = KonfigurasiPenugasan::value(self::KUNCI_DEFAULT_REKOMENDATOR);
        if (! $defaultUserId || $user->id !== $defaultUserId) {
            return response()->json([
                'message' => 'Hanya default rekomendator yang dapat menolak.',
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
     * Ambil profil default rekomendator dari konfigurasi_penugasan.
     * Return null jika belum disetel.
     */
    private function getDefaultRekomendator(): ?array
    {
        $userId = KonfigurasiPenugasan::value(self::KUNCI_DEFAULT_REKOMENDATOR);
        if (! $userId) {
            return null;
        }
        $u = AkunPengguna::with(['role', 'tenagaAhli'])->find($userId);
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
            ] : null,
        ];
    }
}
