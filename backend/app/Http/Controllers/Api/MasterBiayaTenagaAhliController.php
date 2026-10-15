<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JenisFaskes;
use App\Models\KonfigurasiPajak;
use App\Models\MasterBiayaTenagaAhli;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Master biaya honor tenaga ahli (FR-5.2/5.3 + 5.7).
 *
 * Privilege: "Penugasan" — hanya Administrator yang punya modul ini.
 * Tarif PPN tetap mengikuti KonfigurasiPajak (master terpisah).
 *
 * Setiap row mendefinisikan bruto honor untuk kombinasi
 * (peran, tipe_faskes). Saat honor dicatat, sistem lookup row aktif
 * dan menghitung PPN/PPh via HonorCalculator.
 */
class MasterBiayaTenagaAhliController extends Controller
{
    public function __construct(private AuditService $audit) {}

    /**
     * GET /api/penugasan/master-biaya
     * List master biaya (filter opsional peran, tipe_faskes, aktif).
     * Response: { data, jenis_faskes_tersedia, tarif_pajak_aktif }
     */
    public function index(Request $request): JsonResponse
    {
        $query = MasterBiayaTenagaAhli::query()->orderBy('peran')->orderBy('tipe_faskes');

        if ($peran = $request->string('peran')->toString()) {
            $query->where('peran', $peran);
        }
        if ($tipe = $request->string('tipe_faskes')->toString()) {
            $query->where('tipe_faskes', $tipe);
        }
        if ($request->has('aktif')) {
            $query->where('aktif', $request->string('aktif')->toString() === '1');
        }

        // Dedupe by kode — JENIS_FASKES.kode historically tidak punya unique
        // index sehingga seed awal (migration) + JenisFaskesSeeder bisa
        // men-duplikasi baris dengan kode sama. Ambil satu per kode,
        // prefer baris yang terakhir diperbarui agar perubahan manual
        // melalui Master Faskes tidak hilang.
        // Sertakan `id` di response — dipakai sebagai React `key` di
        // dropdown supaya stabil lintas render walau terjadi perubahan
        // urutan/sortir.
        $jenisFaskes = JenisFaskes::all(['id', 'kode', 'nama', 'status'])
            ->sortByDesc('updated_at')
            ->unique('kode')
            ->values();
        $tarifPajak = [
            'ppn' => KonfigurasiPajak::activeRate(KonfigurasiPajak::JENIS_PPN),
            'pph21' => KonfigurasiPajak::activeRate(KonfigurasiPajak::JENIS_PPH21),
        ];

        return response()->json([
            'data' => $query->get(),
            'jenis_faskes_tersedia' => $jenisFaskes,
            'tarif_pajak_aktif' => $tarifPajak,
        ]);
    }

    /**
     * POST /api/penugasan/master-biaya
     * Buat entry baru. Jika kombinasi (peran, tipe_faskes) sudah ada
     * dan aktif, tolak dengan 409. Untuk replace, nonaktifkan yang lama dulu.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'peran' => 'required|in:surveior,verifikator,rekomendator',
            'tipe_faskes' => 'required|string|max:20',
            'tarif_dasar' => 'required|numeric|min:0',
            'keterangan' => 'nullable|string|max:500',
            'aktif' => 'sometimes|boolean',
        ]);

        // Validasi tipe_faskes ada di master
        if (! JenisFaskes::where('kode', $data['tipe_faskes'])->exists()) {
            return response()->json([
                'message' => "Tipe faskes '{$data['tipe_faskes']}' tidak ditemukan di master jenis_faskes.",
            ], 422);
        }

        $user = $request->user();
        $aktif = array_key_exists('aktif', $data) ? (bool) $data['aktif'] : true;

        $row = DB::transaction(function () use ($data, $user, $aktif) {
            // Jika aktif=true, pastikan tidak ada row aktif duplikat
            if ($aktif) {
                $exists = MasterBiayaTenagaAhli::where('peran', $data['peran'])
                    ->where('tipe_faskes', $data['tipe_faskes'])
                    ->where('aktif', true)
                    ->exists();
                if ($exists) {
                    abort(response()->json([
                        'message' => "Master biaya untuk peran={$data['peran']} tipe_faskes={$data['tipe_faskes']} sudah ada dan aktif. Nonaktifkan dulu untuk replace.",
                    ], 409));
                }
            }

            $row = MasterBiayaTenagaAhli::create([
                'id' => (string) Str::uuid(),
                'peran' => $data['peran'],
                'tipe_faskes' => $data['tipe_faskes'],
                'tarif_dasar' => $data['tarif_dasar'],
                'keterangan' => $data['keterangan'] ?? null,
                'aktif' => $aktif,
            ]);

            $this->audit->log('master_biaya_ta.created', 'master_biaya_tenaga_ahli', $row->id, [
                'peran' => $row->peran,
                'tipe_faskes' => $row->tipe_faskes,
                'tarif_dasar' => (float) $row->tarif_dasar,
                'aktif' => $row->aktif,
                'aktor' => $user?->id,
            ]);

            return $row;
        });

        return response()->json(['data' => $row], 201);
    }

    /**
     * GET /api/penugasan/master-biaya/{id}
     */
    public function show(MasterBiayaTenagaAhli $masterBiaya): JsonResponse
    {
        return response()->json(['data' => $masterBiaya]);
    }

    /**
     * PUT /api/penugasan/master-biaya/{id}
     * Koreksi administratif (tarif, keterangan, aktif).
     */
    public function update(Request $request, MasterBiayaTenagaAhli $masterBiaya): JsonResponse
    {
        $data = $request->validate([
            'tarif_dasar' => 'sometimes|numeric|min:0',
            'keterangan' => 'nullable|string|max:500',
            'aktif' => 'sometimes|boolean',
        ]);

        $user = $request->user();
        $before = $masterBiaya->only(['tarif_dasar', 'keterangan', 'aktif']);

        // Jika diaktifkan, pastikan tidak ada row aktif lain untuk kombinasi yang sama
        if (array_key_exists('aktif', $data) && $data['aktif'] && ! $masterBiaya->aktif) {
            $exists = MasterBiayaTenagaAhli::where('peran', $masterBiaya->peran)
                ->where('tipe_faskes', $masterBiaya->tipe_faskes)
                ->where('aktif', true)
                ->where('id', '!=', $masterBiaya->id)
                ->exists();
            if ($exists) {
                return response()->json([
                    'message' => 'Sudah ada master biaya aktif lain untuk kombinasi yang sama.',
                ], 409);
            }
        }

        $masterBiaya->update($data);

        if ($before !== $masterBiaya->only(['tarif_dasar', 'keterangan', 'aktif'])) {
            $this->audit->log('master_biaya_ta.updated', 'master_biaya_tenaga_ahli', $masterBiaya->id, [
                'sebelum' => $before,
                'sesudah' => $masterBiaya->only(['tarif_dasar', 'keterangan', 'aktif']),
                'aktor' => $user?->id,
            ]);
        }

        return response()->json(['data' => $masterBiaya->fresh()]);
    }

    /**
     * DELETE /api/penugasan/master-biaya/{id}
     * Soft behavior: set nonaktif (audit-preserved). Hard delete via DB only.
     */
    public function destroy(MasterBiayaTenagaAhli $masterBiaya): JsonResponse
    {
        $user = request()->user();
        $this->audit->log('master_biaya_ta.deactivated', 'master_biaya_tenaga_ahli', $masterBiaya->id, [
            'aktor' => $user?->id,
        ]);
        $masterBiaya->forceFill(['aktif' => false])->save();

        return response()->json(['message' => 'Master biaya dinonaktifkan.']);
    }
}
