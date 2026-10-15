<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Faskes;
use App\Models\JenisFaskes;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;

/**
 * CRUD for Master Data Faskes (institusi kesehatan).
 * Privilege: Master Data / [Lihat|Tambah|Ubah|Hapus]
 */
class FaskesController extends Controller
{
    public function __construct(private AuditService $audit) {}

    /**
     * GET /api/master/faskes
     */
    public function index(Request $request): JsonResponse
    {
        $query = Faskes::with('jenisFaskes:id,kode,nama');

        if ($request->filled('jenis_faskes_id')) {
            $query->where('jenis_faskes_id', $request->string('jenis_faskes_id'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('q')) {
            $q = $request->string('q');
            $query->where(fn($sq) => $sq
                ->where('nama', 'like', "%{$q}%")
                ->orWhere('kota', 'like', "%{$q}%")
                ->orWhere('email', 'like', "%{$q}%")
            );
        }

        $perPage = min((int) $request->integer('per_page', 15), 50);
        $items = $query->orderBy('nama')->paginate($perPage);

        return response()->json($items);
    }

    /**
     * GET /api/master/faskes/{faskes}
     */
    public function show(Faskes $faskes): JsonResponse
    {
        $faskes->load('jenisFaskes:id,kode,nama');
        return response()->json(['data' => $faskes]);
    }

    /**
     * POST /api/master/faskes
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'jenis_faskes_id' => [
                'nullable',
                Rule::when(
                    fn($r) => filled($r->input('jenis_faskes_id')),
                    'exists:jenis_faskes,id',
                ),
            ],
            'nama' => 'required|string|max:200',
            'no_sertifikat' => 'nullable|string|max:50',
            'nomor_surat_faskes' => 'nullable|string|max:100',
            'alamat' => 'nullable|string|max:500',
            'kota' => 'nullable|string|max:100',
            'provinsi' => 'nullable|string|max:100',
            'kode_pos' => 'nullable|string|max:10',
            'telepon' => 'nullable|string|max:30',
            'email' => 'nullable|email|max:100',
            'website' => 'nullable|url|max:200',
            'nama_pimpinan' => 'nullable|string|max:150',
            'telepon_pimpinan' => 'nullable|string|max:30',
            'deskripsi' => 'nullable|string|max:5000',
            'status' => 'nullable|in:aktif,nonaktif',
        ]);

        // Normalize empty string to null
        if (isset($data['jenis_faskes_id']) && $data['jenis_faskes_id'] === '') {
            $data['jenis_faskes_id'] = null;
        }

        $faskes = Faskes::create([
            'id' => (string) Str::uuid(),
            ...$data,
            'status' => $data['status'] ?? 'aktif',
        ]);

        $this->audit->log('faskes.create', 'faskes', $faskes->id, [
            'nama' => $faskes->nama,
        ]);

        return response()->json(['data' => $faskes->load('jenisFaskes:id,kode,nama')], 201);
    }

    /**
     * PUT /api/master/faskes/{faskes}
     */
    public function update(Request $request, Faskes $faskes): JsonResponse
    {
        $data = $request->validate([
            'jenis_faskes_id' => [
                'nullable',
                Rule::when(
                    fn($r) => filled($r->input('jenis_faskes_id')),
                    'exists:jenis_faskes,id',
                ),
            ],
            'nama' => 'required|string|max:200',
            'no_sertifikat' => 'nullable|string|max:50',
            'nomor_surat_faskes' => 'nullable|string|max:100',
            'alamat' => 'nullable|string|max:500',
            'kota' => 'nullable|string|max:100',
            'provinsi' => 'nullable|string|max:100',
            'kode_pos' => 'nullable|string|max:10',
            'telepon' => 'nullable|string|max:30',
            'email' => 'nullable|email|max:100',
            'website' => 'nullable|url|max:200',
            'nama_pimpinan' => 'nullable|string|max:150',
            'telepon_pimpinan' => 'nullable|string|max:30',
            'deskripsi' => 'nullable|string|max:5000',
            'status' => 'required|in:aktif,nonaktif',
        ]);

        // Normalize empty string to null
        if (isset($data['jenis_faskes_id']) && $data['jenis_faskes_id'] === '') {
            $data['jenis_faskes_id'] = null;
        }

        $before = $faskes->replicate();
        $faskes->update($data);

        $this->audit->log('faskes.update', 'faskes', $faskes->id, [
            'before' => $before->toArray(),
            'after' => $faskes->toArray(),
        ]);

        return response()->json(['data' => $faskes->fresh()->load('jenisFaskes:id,kode,nama')]);
    }

    /**
     * DELETE /api/master/faskes/{faskes}
     */
    public function destroy(Faskes $faskes): JsonResponse
    {
        if ($faskes->akunPenggunas()->exists()) {
            return response()->json([
                'message' => 'Faskes tidak dapat dihapus karena sudah terkait dengan akun pengguna.',
            ], 422);
        }

        if ($faskes->siklusAkreditasis()->exists()) {
            return response()->json([
                'message' => 'Faskes tidak dapat dihapus karena sudah terkait dengan siklus akreditasi.',
            ], 422);
        }

        $id = $faskes->id;
        $nama = $faskes->nama;
        $faskes->delete();

        $this->audit->log('faskes.delete', 'faskes', $id, [
            'nama' => $nama,
        ]);

        return response()->json(['message' => 'Faskes berhasil dihapus.']);
    }

    /**
     * GET /api/master/faskes/dropdown
     */
    public function dropdown(Request $request): JsonResponse
    {
        $query = Faskes::where('status', 'aktif')
            ->with('jenisFaskes:id,kode,nama')
            ->orderBy('nama');

        if ($request->filled('jenis_faskes_id')) {
            $query->where('jenis_faskes_id', $request->string('jenis_faskes_id'));
        }

        return response()->json(['data' => $query->get(['id', 'jenis_faskes_id', 'nama', 'kota'])]);
    }

    /**
     * GET /api/master/faskes/template
     * Download CSV template for batch import.
     */
    public function template(): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="template_faskes.csv"',
        ];

        $columns = [
            'nama', 'jenis_faskes_nama', 'no_sertifikat', 'nomor_surat_faskes',
            'alamat', 'kota', 'provinsi', 'kode_pos',
            'telepon', 'email', 'website',
            'nama_pimpinan', 'telepon_pimpinan', 'deskripsi', 'status',
        ];

        $callback = function () use ($columns) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, $columns);
            fputcsv($handle, [
                'RSUD Dr. Soetomo', 'Rumah Sakit',
                '', '', 'Jl. Utama No.1', 'Surabaya', 'Jawa Timur', '60112',
                '(031) 5501234', 'info@rsud-soetomo.id', '',
                'dr. John Doe', '081234567890', '', 'aktif',
            ]);
            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * POST /api/master/faskes/import
     * Batch import faskes dari CSV.
     */
    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:5120',
        ]);

        $file = $request->file('file');
        $handle = fopen($file->getRealPath(), 'r');

        $headers = fgetcsv($handle);
        if (! $headers) {
            fclose($handle);
            return response()->json(['message' => 'File CSV tidak valid atau kosong.'], 422);
        }
        $headers = array_map(fn ($h) => trim(strtolower($h)), $headers);

        $results = ['success' => 0, 'failed' => 0, 'rows' => []];
        $rowNumber = 1;

        while (($row = fgetcsv($handle)) !== false) {
            $rowNumber++;
            if (count($row) === 1 && empty(trim($row[0]))) continue;

            $data = array_combine($headers, $row);
            if (! $data) {
                $results['rows'][] = ['row' => $rowNumber, 'status' => 'failed', 'message' => 'Format baris tidak valid.'];
                $results['failed']++;
                continue;
            }

            $errors = [];
            $nama = trim($data['nama'] ?? '');
            $jenisNama = trim($data['jenis_faskes_nama'] ?? '');
            $email = trim($data['email'] ?? '');
            $website = trim($data['website'] ?? '');
            $status = strtolower(trim($data['status'] ?? 'aktif'));

            if (empty($nama)) $errors[] = 'nama wajib diisi.';
            if (! in_array($status, ['aktif', 'nonaktif'], true)) $errors[] = "status harus aktif atau nonaktif.";
            if (! empty($email) && ! filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'format email tidak valid.';
            if (! empty($website) && ! filter_var($website, FILTER_VALIDATE_URL) && ! str_starts_with($website, 'http')) {
                // Allow missing scheme
                if (! preg_match('/^https?:\/\/.+/', $website)) {
                    $errors[] = 'website harus URL yang valid (contoh: https://faskes.id).';
                }
            }

            if (! empty($errors)) {
                $results['rows'][] = [
                    'row' => $rowNumber, 'status' => 'failed',
                    'nama' => $nama ?: '?', 'message' => implode(' ', $errors),
                ];
                $results['failed']++;
                continue;
            }

            // Resolve jenis_faskes_id
            $jenisFaskesId = null;
            if (! empty($jenisNama)) {
                $jenis = JenisFaskes::where('nama', 'like', "%{$jenisNama}%")
                    ->orWhere('kode', $jenisNama)
                    ->first();
                if (! $jenis) {
                    $results['rows'][] = [
                        'row' => $rowNumber, 'status' => 'failed',
                        'nama' => $nama,
                        'message' => "Jenis faskes '$jenisNama' tidak ditemukan di master jenis faskes.",
                    ];
                    $results['failed']++;
                    continue;
                }
                $jenisFaskesId = $jenis->id;
            }

            // Check duplicate nama (case-insensitive)
            $exists = Faskes::whereRaw('LOWER(nama) = ?', [strtolower($nama)])->exists();
            if ($exists) {
                $results['rows'][] = [
                    'row' => $rowNumber, 'status' => 'failed',
                    'nama' => $nama,
                    'message' => "Faskes dengan nama '$nama' sudah terdaftar.",
                ];
                $results['failed']++;
                continue;
            }

            try {
                $faskes = Faskes::create([
                    'id' => (string) Str::uuid(),
                    'jenis_faskes_id' => $jenisFaskesId,
                    'nama' => $nama,
                    'no_sertifikat' => trim($data['no_sertifikat'] ?? '') ?: null,
                    'nomor_surat_faskes' => trim($data['nomor_surat_faskes'] ?? '') ?: null,
                    'alamat' => trim($data['alamat'] ?? '') ?: null,
                    'kota' => trim($data['kota'] ?? '') ?: null,
                    'provinsi' => trim($data['provinsi'] ?? '') ?: null,
                    'kode_pos' => trim($data['kode_pos'] ?? '') ?: null,
                    'telepon' => trim($data['telepon'] ?? '') ?: null,
                    'email' => $email ?: null,
                    'website' => $website ?: null,
                    'nama_pimpinan' => trim($data['nama_pimpinan'] ?? '') ?: null,
                    'telepon_pimpinan' => trim($data['telepon_pimpinan'] ?? '') ?: null,
                    'deskripsi' => trim($data['deskripsi'] ?? '') ?: null,
                    'status' => $status,
                ]);

                $this->audit->log('faskes.create', 'faskes', $faskes->id, [
                    'nama' => $faskes->nama,
                    'sumber' => 'import_csv',
                ]);

                $results['rows'][] = [
                    'row' => $rowNumber, 'status' => 'success',
                    'nama' => $nama,
                    'message' => 'Berhasil diimport.',
                ];
                $results['success']++;
            } catch (\Throwable $e) {
                $results['rows'][] = [
                    'row' => $rowNumber, 'status' => 'failed',
                    'nama' => $nama,
                    'message' => 'Error: ' . $e->getMessage(),
                ];
                $results['failed']++;
            }
        }

        fclose($handle);

        return response()->json([
            'message' => "Import selesai. {$results['success']} berhasil, {$results['failed']} gagal.",
            'results' => $results,
        ]);
    }
}
