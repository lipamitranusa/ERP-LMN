<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lembaga;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * CRUD for Master Data Lembaga Akreditasi.
 * Privilege: Master Data / [Lihat|Tambah|Ubah|Hapus]
 */
class LembagaController extends Controller
{
    public function __construct(private AuditService $audit) {}

    /**
     * GET /api/master/lembaga
     * List all lembaga (admin).
     */
    public function index(Request $request): JsonResponse
    {
        $query = Lembaga::query();

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('q')) {
            $q = $request->string('q');
            $query->where(fn($sq) => $sq
                ->where('nama', 'like', "%{$q}%")
                ->orWhere('nama_pt', 'like', "%{$q}%")
                ->orWhere('kota', 'like', "%{$q}%")
                ->orWhere('email', 'like', "%{$q}%")
            );
        }

        $perPage = min((int) $request->integer('per_page', 15), 50);
        $items = $query->orderBy('nama')->paginate($perPage);

        return response()->json($items);
    }

    /**
     * GET /api/master/lembaga/{lembaga}
     */
    public function show(Lembaga $lembaga): JsonResponse
    {
        return response()->json(['data' => $lembaga]);
    }

    /**
     * POST /api/master/lembaga
     */
    public function store(Request $request): JsonResponse
    {
        $data = $this->validateLembaga($request, isUpdate: false);

        $lembaga = Lembaga::create([
            'id' => (string) Str::uuid(),
            ...$data,
            'status' => $data['status'] ?? 'aktif',
            'npwp_diverifikasi_at' => $data['npwp'] ? now() : null,
        ]);

        if ($request->hasFile('logo')) {
            $lembaga->logo_path = $this->storeLogo($request->file('logo'), $lembaga->id);
            $lembaga->save();
        }

        $this->audit->log('lembaga.create', 'lembaga', $lembaga->id, [
            'nama' => $lembaga->nama,
        ]);

        return response()->json(['data' => $lembaga], 201);
    }

    /**
     * PUT /api/master/lembaga/{lembaga}
     */
    public function update(Request $request, Lembaga $lembaga): JsonResponse
    {
        $data = $this->validateLembaga($request, isUpdate: true);

        $before = $lembaga->replicate();
        // Bump verifikasi timestamp bila NPWP berubah
        if (array_key_exists('npwp', $data) && $data['npwp'] !== $lembaga->npwp) {
            $data['npwp_diverifikasi_at'] = $data['npwp'] ? now() : null;
        }
        $lembaga->update($data);

        if ($request->hasFile('logo')) {
            $oldLogo = $lembaga->logo_path;
            $lembaga->logo_path = $this->storeLogo($request->file('logo'), $lembaga->id);
            $lembaga->save();
            if ($oldLogo) $this->deleteLogo($oldLogo);
        } elseif ($request->boolean('hapus_logo') && $lembaga->logo_path) {
            $this->deleteLogo($lembaga->logo_path);
            $lembaga->logo_path = null;
            $lembaga->save();
        }

        $this->audit->log('lembaga.update', 'lembaga', $lembaga->id, [
            'before' => $before->toArray(),
            'after' => $lembaga->toArray(),
        ]);

        return response()->json(['data' => $lembaga->fresh()]);
    }

    /**
     * DELETE /api/master/lembaga/{lembaga}
     */
    public function destroy(Lembaga $lembaga): JsonResponse
    {
        // Check if lembaga is in use
        if ($lembaga->siklusAkreditasi()->exists()) {
            return response()->json([
                'message' => 'Lembaga tidak dapat dihapus karena sudah terkait dengan siklus akreditasi.',
            ], 422);
        }

        $id = $lembaga->id;
        $nama = $lembaga->nama;
        $lembaga->delete();

        $this->audit->log('lembaga.delete', 'lembaga', $id, [
            'nama' => $nama,
        ]);

        return response()->json(['message' => 'Lembaga berhasil dihapus.']);
    }

    /**
     * Validasi payload untuk create/update.
     */
    private function validateLembaga(Request $request, bool $isUpdate): array
    {
        return $request->validate([
            'nama' => 'required|string|max:255',
            'nama_pt' => 'nullable|string|max:255',
            'alamat' => 'nullable|string|max:500',
            'kota' => 'nullable|string|max:100',
            'telepon' => 'nullable|string|max:30',
            'email' => 'nullable|email|max:100',
            'website' => 'nullable|url|max:200',
            'nama_cp' => 'nullable|string|max:150',
            'telepon_cp' => 'nullable|string|max:30',
            'deskripsi' => 'nullable|string|max:5000',
            'status' => ($isUpdate ? 'required' : 'nullable') . '|in:aktif,nonaktif',
            'nama_pejabat' => 'nullable|string|max:150',
            'jabatan_pejabat' => 'nullable|string|max:150',
            // FR-5.8: NPWP pemotong pajak
            'npwp' => ['nullable', 'string', 'max:30', new \App\Rules\IndonesianNpwp()],
            'kode_kpp' => 'nullable|string|max:10',
            'alamat_pajak' => 'nullable|string|max:500',
            'kota_pajak' => 'nullable|string|max:100',
            'nama_pejabat_pajak' => 'nullable|string|max:150',
            'jabatan_pejabat_pajak' => 'nullable|string|max:100',
            'logo' => 'nullable|image|mimes:png,jpg,jpeg,svg|max:2048',
        ]);
    }

    /**
     * Simpan file logo ke disk public, mengembalikan path relatif.
     */
    private function storeLogo(\Illuminate\Http\UploadedFile $file, string $lembagaId): string
    {
        $ext = strtolower($file->getClientOriginalExtension() ?: $file->extension());
        $name = "lembaga/logos/{$lembagaId}.{$ext}";
        $file->storeAs(dirname($name), basename($name), 'public');
        return $name;
    }

    private function deleteLogo(string $path): void
    {
        \Illuminate\Support\Facades\Storage::disk('public')->delete($path);
    }
}
