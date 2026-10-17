<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JenisFaskes;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * CRUD for Master Data Jenis Faskes.
 * Privilege: Master Data / [Lihat|Tambah|Ubah|Hapus]
 */
class JenisFaskesController extends Controller
{
    public function __construct(private AuditService $audit) {}

    /**
     * GET /api/master/jenis-faskes
     */
    public function index(Request $request): JsonResponse
    {
        $query = JenisFaskes::with('lembaga:id,nama');

        // Override global scope jika user kirim lembaga_id eksplisit
        // (untuk superadmin yang ingin filter per lembaga via dropdown)
        if ($request->filled('lembaga_id')) {
            $query->withoutGlobalScope('lembaga')
                ->where('lembaga_id', $request->string('lembaga_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('q')) {
            $q = $request->string('q');
            $query->where(fn($sq) => $sq
                ->where('nama', 'like', "%{$q}%")
                ->orWhere('kode', 'like', "%{$q}%")
            );
        }

        $perPage = min((int) $request->integer('per_page', 15), 50);
        $items = $query->orderBy('kode')->paginate($perPage);

        return response()->json($items);
    }

    /**
     * GET /api/master/jenis-faskes/{jenis}
     */
    public function show($jenisFaskesId): JsonResponse
    {
        $model = JenisFaskes::find($jenisFaskesId);
        if (! $model) {
            return response()->json(['message' => 'Jenis Faskes tidak ditemukan.'], 404);
        }
        return response()->json(['data' => $model]);
    }

    /**
     * POST /api/master/jenis-faskes
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nama' => 'required|string|max:100',
            'kode' => 'nullable|string|max:30',
            'deskripsi' => 'nullable|string|max:500',
            'status' => 'nullable|in:aktif,nonaktif',
            'lembaga_id' => 'required|uuid|exists:lembaga,id',
        ]);

        // Custom unique check per lembaga (bukan global)
        if (! empty($data['kode'])) {
            $exists = \App\Models\JenisFaskes::withoutGlobalScope('lembaga')
                ->where('lembaga_id', $data['lembaga_id'])
                ->where('kode', $data['kode'])
                ->exists();
            if ($exists) {
                return response()->json([
                    'message' => 'Kode sudah digunakan untuk lembaga ini.',
                ], 422);
            }
        }

        $jenis = JenisFaskes::create([
            'id' => (string) Str::uuid(),
            ...$data,
            'status' => $data['status'] ?? 'aktif',
        ]);

        $this->audit->log('jenis_faskes.create', 'jenis_faskes', $jenis->id, [
            'nama' => $jenis->nama,
            'kode' => $jenis->kode,
            'lembaga_id' => $jenis->lembaga_id,
        ]);

        return response()->json(['data' => $jenis], 201);
    }

    /**
     * PUT /api/master/jenis-faskes/{jenis}
     */
    /**
     * PUT /api/master/jenis-faskes/{jenisFaskesId}
     */
    public function update(Request $request, $jenisFaskesId): JsonResponse
    {
        $model = JenisFaskes::find($jenisFaskesId);
        if (! $model) {
            return response()->json(['message' => 'Jenis Faskes tidak ditemukan.'], 404);
        }

        $data = $request->validate([
            'nama' => 'required|string|max:100',
            'kode' => 'nullable|string|max:30',
            'deskripsi' => 'nullable|string|max:500',
            'status' => 'required|in:aktif,nonaktif',
            'lembaga_id' => 'required|uuid|exists:lembaga,id',
        ]);

        // Custom unique check per lembaga (excluding current)
        if (! empty($data['kode'])) {
            $exists = \App\Models\JenisFaskes::withoutGlobalScope('lembaga')
                ->where('lembaga_id', $data['lembaga_id'])
                ->where('kode', $data['kode'])
                ->where('id', '!=', $jenisFaskesId)
                ->exists();
            if ($exists) {
                return response()->json([
                    'message' => 'Kode sudah digunakan untuk lembaga ini.',
                ], 422);
            }
        }

        $before = $model->replicate();
        $model->update($data);

        $this->audit->log('jenis_faskes.update', 'jenis_faskes', $model->id, [
            'before' => $before->toArray(),
            'after' => $model->toArray(),
        ]);

        return response()->json(['data' => $model->fresh()]);
    }

    /**
     * DELETE /api/master/jenis-faskes/{jenis}
     */
    public function destroy(Request $request, $jenisFaskesId): JsonResponse
    {
        \Log::info('[JenisFaskesController::destroy] id=', [$jenisFaskesId]);

        $model = JenisFaskes::find($jenisFaskesId);
        if (! $model) {
            \Log::error('[destroy] JenisFaskes not found, id=', [$jenisFaskesId]);
            return response()->json(['message' => 'Jenis Faskes tidak ditemukan.'], 404);
        }
        if ($model->faskes()->exists()) {
            return response()->json([
                'message' => 'Jenis Faskes tidak dapat dihapus karena sudah terkait dengan faskes.',
            ], 422);
        }
        if ($model->biayaPerJenisFaskes()->exists()) {
            return response()->json([
                'message' => 'Jenis Faskes tidak dapat dihapus karena sudah terkait dengan data biaya.',
            ], 422);
        }

        $id = $model->id;
        $nama = $model->nama;
        $model->delete();

        $this->audit->log('jenis_faskes.delete', 'jenis_faskes', $id, [
            'nama' => $nama,
        ]);

        return response()->json(['message' => 'Jenis Faskes berhasil dihapus.']);
    }
}
