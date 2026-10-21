<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChecklistValidasi;
use App\Models\DokumenPermohonan;
use App\Models\SiklusAkreditasi;
use App\Services\AttachmentService;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * FR-1.2: Upload Surat Permohonan Survei & Self Assessment.
 * FR-1.5: Versioning dokumen setiap kali Faskes re-upload setelah revisi.
 * Privilege check: Pendaftaran & Validasi Dokumen
 */
class DokumenPermohonanController extends Controller
{
    private const ALLOWED_MIME_TYPES = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    private const MAX_FILE_SIZE_KB = 10 * 1024; // 10 MB

    /**
     * GET /api/pendaftaran/siklus/{siklus}/dokumen
     * Latest version per jenis_dokumen.
     */
    public function index(SiklusAkreditasi $siklus): JsonResponse
    {
        $all = DokumenPermohonan::where('siklus_id', $siklus->id)
            ->orderBy('jenis_dokumen')
            ->orderBy('versi', 'desc')
            ->get()
            ->groupBy('jenis_dokumen')
            ->map(fn ($group) => $group->first());

        $dokumen = $all->values();

        return response()->json([
            'data' => $dokumen,
            'meta' => ['total' => $dokumen->count()],
        ]);
    }

    /**
     * GET /api/pendaftaran/siklus/{siklus}/dokumen/{dokumen}
     */
    public function show(DokumenPermohonan $dokumen): JsonResponse
    {
        $dokumen->load('uploader');
        return response()->json(['data' => $dokumen]);
    }

    /**
     * GET /api/pendaftaran/siklus/{siklus}/dokumen/{dokumen}/versions
     * Semua versi dokumen tertentu (FR-1.5).
     */
    public function versions(DokumenPermohonan $dokumen): JsonResponse
    {
        $versions = DokumenPermohonan::with('uploader')
            ->where('siklus_id', $dokumen->siklus_id)
            ->where('jenis_dokumen', $dokumen->jenis_dokumen)
            ->orderBy('versi', 'desc')
            ->get();

        return response()->json(['data' => $versions]);
    }

    /**
     * Dokumen wajib = sumber kebenaran tunggal, dipakai bersama oleh
     * gate upload di sini dan gate checklist (ChecklistValidasi).
     */
    private const REQUIRED_JENIS = ChecklistValidasi::JENIS_WAJIB;

    /**
     * POST /api/pendaftaran/siklus/{siklus}/dokumen
     * Upload dokumen. Jika jenis+dokumen sudah ada, increment versi (FR-1.5).
     * Otomatis set status_kelengkapan = 'lengkap' jika semua dokumen wajib sudah terunggah.
     */
    public function store(Request $request, SiklusAkreditasi $siklus, AttachmentService $attachment, AuditService $audit): JsonResponse
    {
        $data = $request->validate([
            'jenis_dokumen' => [
                'required',
                'string',
                'in:surat_permohonan,self_assessment,dfo,sisdmk,aspak,inm,ikp',
            ],
            'file' => [
                'required',
                'file',
                'mimetypes:' . implode(',', self::ALLOWED_MIME_TYPES),
                'max:' . self::MAX_FILE_SIZE_KB,
            ],
            'alasan_revisi' => [
                'nullable',
                'string',
                'max:1000',
            ],
        ]);

        $file = $data['file'];
        $jenis = $data['jenis_dokumen'];

        // Hitung versi berikutnya
        $latestVersion = DokumenPermohonan::where('siklus_id', $siklus->id)
            ->where('jenis_dokumen', $jenis)
            ->max('versi');

        $versiBaru = ($latestVersion ?? 0) + 1;

        // Simpan file ke R2
        $path = $attachment->store($file, 'dokumen');

        $dokumen = DokumenPermohonan::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'jenis_dokumen' => $jenis,
            'versi' => $versiBaru,
            'nama_file_asli' => $file->getClientOriginalName(),
            'path_file' => $path,
            'ukuran_file' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
            'alasan_revisi' => $data['alasan_revisi'] ?? null,
            'diunggah_oleh' => $request->user()->id,
            'tanggal_unduh' => now(),
        ]);

        $audit->record('dokumen.upload', null, $dokumen, 'DokumenPermohonan', $dokumen->id);

        $dokumen->load('uploader');

        // ── Auto-update status_kelengkapan jika semua wajib sudah terunggah ──
        $uploadedKinds = DokumenPermohonan::where('siklus_id', $siklus->id)
            ->distinct()
            ->pluck('jenis_dokumen')
            ->toArray();
        $semuaWajibAda = empty(array_diff(self::REQUIRED_JENIS, $uploadedKinds));
        if ($semuaWajibAda && $siklus->status_kelengkapan !== 'lengkap') {
            $siklus->update(['status_kelengkapan' => 'lengkap']);
        }

        return response()->json([
            'data' => $dokumen,
            'status_kelengkapan' => $siklus->fresh()->status_kelengkapan,
            'message' => $versiBaru > 1
                ? "Dokumen {$jenis} diunggah sebagai versi {$versiBaru}."
                : 'Dokumen berhasil diunggah.',
        ], 201);
    }

    /**
     * DELETE /api/pendaftaran/dokumen/{dokumen}
     * Hapus versi tertentu. Tidak menghapus versi lain.
     */
    public function destroy(DokumenPermohonan $dokumen, AttachmentService $attachment, AuditService $audit): JsonResponse
    {
        $before = $dokumen->replicate();

        // Hapus file fisik dari R2
        $attachment->delete($dokumen->path_file);

        $dokumen->delete();
        $audit->record('dokumen.delete', $before, null, 'DokumenPermohonan', $before->id);

        return response()->json(['message' => 'Versi dokumen dihapus.']);
    }

    /**
     * GET /api/pendaftaran/dokumen/{dokumen}/download
     */
    public function download(DokumenPermohonan $dokumen, AttachmentService $attachment): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        return $attachment->response($dokumen->path_file, $dokumen->nama_file_asli);
    }

    /**
     * GET /api/pendaftaran/dokumen/{dokumen}/serve
     * Serve file inline untuk preview (iframe/img embed).
     */
    public function serve(DokumenPermohonan $dokumen, AttachmentService $attachment)
    {
        $disk = \Illuminate\Support\Facades\Storage::disk('r2');

        abort_unless($disk->exists($dokumen->path_file), 404, 'File tidak ditemukan.');

        $mime = $disk->mimeType($dokumen->path_file) ?? 'application/octet-stream';

        return response($disk->get($dokumen->path_file), 200, [
            'Content-Type' => $mime,
            'Content-Disposition' => 'inline; filename="' . $dokumen->nama_file_asli . '"',
            'Content-Length' => $disk->size($dokumen->path_file),
        ]);
    }
}
