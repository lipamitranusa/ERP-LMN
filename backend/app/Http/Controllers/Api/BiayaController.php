<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BiayaPerJenisFaskes;
use App\Models\JenisFaskes;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * CRUD for Master Biaya per Jenis Faskes.
 * Privilege: Master Data / [Lihat|Tambah|Ubah|Hapus]
 */
class BiayaController extends Controller
{
    public function __construct(private AuditService $audit)
    {
    }

    /**
     * GET /api/master/biaya
     * Query params: jenis_faskes_id, status, q (search nama_biaya)
     */
    public function index(Request $request): JsonResponse
    {
        $query = BiayaPerJenisFaskes::with('jenisFaskes:id,kode,nama');

        if ($request->filled('jenis_faskes_id')) {
            $query->where('jenis_faskes_id', $request->string('jenis_faskes_id'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('q')) {
            $q = $request->string('q');
            $query->where('nama_biaya', 'like', "%{$q}%");
        }

        $perPage = min((int) $request->integer('per_page', 15), 50);
        $items = $query->orderBy('nama_biaya')->paginate($perPage);

        return response()->json($items);
    }

    /**
     * GET /api/master/biaya/by-jenis
     * Mengembalikan semua biaya per jenis faskes (grouped), beserta daftar jenis faskes
     */
    public function byJenis(Request $request): JsonResponse
    {
        $jenisFaskes = JenisFaskes::where('status', 'aktif')
            ->orderBy('kode')
            ->get(['id', 'kode', 'nama']);

        $biaya = BiayaPerJenisFaskes::with('jenisFaskes:id,kode,nama')
            ->where('status', 'aktif')
            ->orderBy('jenis_faskes_id')
            ->orderBy('nama_biaya')
            ->get();

        $grouped = $jenisFaskes->map(function ($jf) use ($biaya) {
            $items = $biaya->where('jenis_faskes_id', $jf->id)->values();
            return [
                'jenis_faskes' => $jf,
                'biaya' => $items,
                'total' => $items->sum(fn($b) => (float) $b->jumlah),
            ];
        });

        return response()->json(['data' => $grouped]);
    }

    /**
     * GET /api/master/biaya/{id}
     */
    public function show($id): JsonResponse
    {
        $model = BiayaPerJenisFaskes::with('jenisFaskes:id,kode,nama')->find($id);
        if (! $model) {
            return response()->json(['message' => 'Biaya tidak ditemukan.'], 404);
        }
        return response()->json(['data' => $model]);
    }

    /**
     * POST /api/master/biaya
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'jenis_faskes_id' => 'required|uuid|exists:jenis_faskes,id',
            'nama_biaya' => 'required|string|max:100',
            'deskripsi' => 'nullable|string|max:500',
            'jumlah' => 'required|numeric|min:0',
            'satuan' => 'nullable|string|max:30',
            'tipe' => 'nullable|in:tetap,per_siklus,per_sertifikat',
            'wajib' => 'nullable|boolean',
            'status' => 'nullable|in:aktif,nonaktif',
        ]);

        // Cek duplikat nama biaya per jenis faskes
        $exists = BiayaPerJenisFaskes::where('jenis_faskes_id', $data['jenis_faskes_id'])
            ->where('nama_biaya', $data['nama_biaya'])
            ->exists();
        if ($exists) {
            return response()->json([
                'message' => 'Nama biaya sudah ada untuk jenis faskes ini.',
            ], 422);
        }

        $biaya = BiayaPerJenisFaskes::create([
            'id' => (string) Str::uuid(),
            ...$data,
            'satuan' => $data['satuan'] ?? 'per_siklus',
            'tipe' => $data['tipe'] ?? 'per_siklus',
            'wajib' => $data['wajib'] ?? true,
            'status' => $data['status'] ?? 'aktif',
        ]);

        $this->audit->log('biaya.create', 'biaya_per_jenis_faskes', $biaya->id, [
            'nama_biaya' => $biaya->nama_biaya,
            'jenis_faskes_id' => $biaya->jenis_faskes_id,
            'jumlah' => $biaya->jumlah,
        ]);

        return response()->json(['data' => $biaya->load('jenisFaskes:id,kode,nama')], 201);
    }

    /**
     * PUT /api/master/biaya/{id}
     */
    public function update(Request $request, $id): JsonResponse
    {
        $model = BiayaPerJenisFaskes::find($id);
        if (! $model) {
            return response()->json(['message' => 'Biaya tidak ditemukan.'], 404);
        }

        $data = $request->validate([
            'nama_biaya' => 'required|string|max:100',
            'deskripsi' => 'nullable|string|max:500',
            'jumlah' => 'required|numeric|min:0',
            'satuan' => 'nullable|string|max:30',
            'tipe' => 'nullable|in:tetap,per_siklus,per_sertifikat',
            'wajib' => 'nullable|boolean',
            'status' => 'required|in:aktif,nonaktif',
        ]);

        // Cek duplikat nama biaya (exclude current record)
        $exists = BiayaPerJenisFaskes::where('jenis_faskes_id', $model->jenis_faskes_id)
            ->where('nama_biaya', $data['nama_biaya'])
            ->where('id', '!=', $id)
            ->exists();
        if ($exists) {
            return response()->json([
                'message' => 'Nama biaya sudah ada untuk jenis faskes ini.',
            ], 422);
        }

        $before = $model->replicate();
        $model->update($data);

        $this->audit->log('biaya.update', 'biaya_per_jenis_faskes', $model->id, [
            'before' => $before->toArray(),
            'after' => $model->toArray(),
        ]);

        return response()->json(['data' => $model->fresh()->load('jenisFaskes:id,kode,nama')]);
    }

    /**
     * DELETE /api/master/biaya/{id}
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        $model = BiayaPerJenisFaskes::find($id);
        if (! $model) {
            return response()->json(['message' => 'Biaya tidak ditemukan.'], 404);
        }

        $nama = $model->nama_biaya;
        $model->delete();

        $this->audit->log('biaya.delete', 'biaya_per_jenis_faskes', $id, [
            'nama_biaya' => $nama,
        ]);

        return response()->json(['message' => 'Biaya berhasil dihapus.']);
    }

    /**
     * GET /api/master/jenis-faskes (for dropdown)
     */
    public function jenisFaskesDropdown(): JsonResponse
    {
        $items = JenisFaskes::where('status', 'aktif')
            ->orderBy('kode')
            ->get(['id', 'kode', 'nama']);
        return response()->json(['data' => $items]);
    }
}
