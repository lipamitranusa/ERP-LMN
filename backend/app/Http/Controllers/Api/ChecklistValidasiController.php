<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CatatanRevisi;
use App\Models\ChecklistValidasi;
use App\Models\SiklusAkreditasi;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * FR-1.3: Checklist validasi kelengkapan dokumen (DFO, SISDMK, ASPAK, INM, IKP).
 * FR-1.4: Kirim catatan revisi ke Faskes.
 * Privilege check: Pendaftaran & Validasi Dokumen
 */
class ChecklistValidasiController extends Controller
{
    /**
     * GET /api/pendaftaran/siklus/{siklus}/checklist
     * Ambil checklist yang sudah ada (dari seed).
     */
    public function index(SiklusAkreditasi $siklus): JsonResponse
    {
        $checklist = $siklus->checklist()->with('validator')->get();

        return response()->json(['data' => $checklist]);
    }

    /**
     * PUT /api/pendaftaran/siklus/{siklus}/checklist
     * Admin update satu atau banyak item checklist sekaligus.
     * Jika semua item 'lengkap', status_kelengkapan siklus = 'lengkap'.
     */
    public function update(Request $request, SiklusAkreditasi $siklus, AuditService $audit): JsonResponse
    {
        $items = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.jenis_dokumen' => 'required|string|in:dfo,sisdmk,aspak,inm,ikp',
            'items.*.status_validasi' => 'required|string|in:belum,lengkap,tidak_lengkap',
            'items.*.catatan_admin' => 'nullable|string|max:2000',
        ]);

        $user = $request->user();
        $updated = [];

        foreach ($items['items'] as $item) {
            $checklist = ChecklistValidasi::updateOrCreate(
                ['siklus_id' => $siklus->id, 'jenis_dokumen' => $item['jenis_dokumen']],
                [
                    'status_validasi' => $item['status_validasi'],
                    'catatan_admin' => $item['catatan_admin'] ?? null,
                    'divalidasi_oleh' => $user->id,
                    'tanggal_validasi' => now(),
                ]
            );

            $updated[] = $checklist;
        }

        $allChecklist = ChecklistValidasi::where('siklus_id', $siklus->id)->get();

        // Required document types
        $requiredTypes = ['dfo', 'sisdmk', 'aspak', 'inm', 'ikp'];
        $allComplete = collect($requiredTypes)->every(function ($type) use ($allChecklist) {
            return $allChecklist->firstWhere('jenis_dokumen', $type)?->status_validasi === 'lengkap';
        });
        $hasAny = $allChecklist->isNotEmpty();

        $siklus->forceFill([
            'status_kelengkapan' => $hasAny ? ($allComplete ? 'lengkap' : 'belum_lengkap') : 'menunggu',
            'tahapan' => $allComplete ? 3 : ($hasAny ? 2 : $siklus->tahapan ?? 1),
            'status' => $allComplete ? 'dokumen_lengkap' : ($hasAny ? 'menunggu_validasi' : $siklus->status),
            'divalidasi_oleh' => $user->id,
            'tanggal_validasi' => now(),
        ])->save();

        $after = clone $siklus;
        $after->refresh();
        $audit->record(
            'checklist.update',
            (clone $after)->forceFill(['status_kelengkapan' => 'menunggu']),
            $after,
            'SiklusAkreditasi',
            $siklus->id
        );

        return response()->json([
            'data' => $siklus->fresh()->load(['checklist.validator', 'faskes.jenisFaskes']),
            'status_kelengkapan' => $siklus->status_kelengkapan,
            'message' => $allComplete
                ? 'Semua dokumen lengkap. Status kelengkapan: Lengkap.'
                : 'Checklist diperbarui. Status kelengkapan: Belum Lengkap.',
        ]);
    }

    /**
     * GET /api/pendaftaran/siklus/{siklus}/catatan-revisi
     */
    public function catatanIndex(SiklusAkreditasi $siklus): JsonResponse
    {
        return response()->json([
            'data' => $siklus->catatanRevisi()
                ->with('creator')
                ->orderBy('tanggal_catatan', 'desc')
                ->paginate(20),
        ]);
    }

    /**
     * POST /api/pendaftaran/siklus/{siklus}/catatan-revisi
     * Admin kirim catatan revisi ke Faskes.
     */
    public function kirimCatatan(Request $request, SiklusAkreditasi $siklus, AuditService $audit): JsonResponse
    {
        $data = $request->validate([
            'catatan' => 'required|string|max:5000',
        ]);

        $catatan = CatatanRevisi::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'dibuat_oleh' => $request->user()->id,
            'catatan' => $data['catatan'],
            'tanggal_catatan' => now(),
            'dibaca_faskes' => false,
        ]);

        // Reset kelengkapan ke belum_lengkap setiap kali ada catatan revisi
        $siklus->forceFill([
            'status_kelengkapan' => 'belum_lengkap',
            'tahapan' => 1,
            'status' => 'menunggu_dokumen',
        ])->save();

        $audit->record('catatan_revisi.create', null, $catatan, 'CatatanRevisi', $catatan->id);

        $catatan->load('creator');

        return response()->json(['data' => $catatan], 201);
    }

    /**
     * PATCH /api/pendaftaran/catatan-revisi/{catatan}/baca
     * Faskes menandai catatan sebagai sudah dibaca.
     */
    public function markRead(CatatanRevisi $catatan, AuditService $audit): JsonResponse
    {
        if ($catatan->dibaca_faskes) {
            return response()->json(['data' => $catatan]);
        }

        $before = $catatan->replicate();
        $catatan->forceFill([
            'dibaca_faskes' => true,
            'dibaca_faskes_pada' => now(),
        ])->save();

        $audit->record('catatan_revisi.read', $before, $catatan->fresh(), 'CatatanRevisi', $catatan->id);

        return response()->json(['data' => $catatan->fresh()]);
    }

    /**
     * GET /api/pendaftaran/catatan-revisi/unread-count
     * Jumlah catatan belum dibaca untuk faskes yang login.
     */
    public function unreadCount(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->faskes_id) {
            return response()->json(['data' => ['count' => 0]]);
        }

        $count = CatatanRevisi::whereHas('siklus', fn ($q) => $q->where('faskes_id', $user->faskes_id))
            ->where('dibaca_faskes', false)
            ->count();

        return response()->json(['data' => ['count' => $count]]);
    }
}
