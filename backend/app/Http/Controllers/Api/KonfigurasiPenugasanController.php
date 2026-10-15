<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\KonfigurasiPenugasan;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * FR-3.8: Pengaturan Batas Penugasan per Periode.
 * Privilege: SDM & Siklus Penugasan
 */
class KonfigurasiPenugasanController extends Controller
{
    /**
     * GET /api/sdm/konfigurasi-penugasan
     */
    public function index(): JsonResponse
    {
        return response()->json(['data' => KonfigurasiPenugasan::all()]);
    }

    /**
     * PUT /api/sdm/konfigurasi-penugasan
     * Update pengaturan batas penugasan.
     */
    public function update(Request $request, AuditService $audit): JsonResponse
    {
        $data = $request->validate([
            'batas_periode_aktif' => 'sometimes|string|in:0,1',
            'batas_periode_nilai' => 'sometimes|integer|min:1|max:20',
        ]);

        $updated = [];
        foreach ($data as $kunci => $nilai) {
            $row = KonfigurasiPenugasan::where('kunci', $kunci)->first();
            if ($row) {
                $row->forceFill(['nilai' => (string) $nilai])->save();
                $updated[$kunci] = $nilai;
            }
        }

        return response()->json([
            'data' => KonfigurasiPenugasan::all(),
            'message' => empty($updated)
                ? 'Tidak ada perubahan.'
                : 'Pengaturan berhasil diperbarui.',
        ]);
    }
}
