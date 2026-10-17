<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TenagaAhli;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Read-only controller untuk dropdown tenaga ahli.
 */
class TenagaAhliController extends Controller
{
    /**
     * GET /api/admin/tenaga-ahli
     * Daftar tenaga ahli untuk dropdown penugasan.
     * Query params:
     *   - peran   : 'surveior' | 'verifikator' (opsional)
     *   - jenis   : 'TKPP' | 'TKSDU' (opsional, hanya untuk surveior)
     *   - exclude_bertugas : '1' untuk exclude yang sedang punya penugasan aktif
     *                        (menunggu / sedang_bertugas).
     *                        Default: '1' untuk surveior, '0' untuk verifikator.
     *                        Override dengan ?exclude_bertugas=0 / =1 jika perlu.
     */
    public function dropdown(Request $request): JsonResponse
    {
        // Jika ada siklus_id, filter surveyor berdasarkan lembaga siklus tersebut.
        // Ini mengoverride global scope BelongsToLembaga yang mem-filter
        // berdasarkan session['lembaga_id'] — yang mungkin stale/salah.
        $siklusLembagaId = null;
        if ($request->filled('siklus_id')) {
            // Bypass global scope saat cari siklus — siklus tidak menggunakan BelongsToLembaga,
            // tapi jika session['lembaga_id'] salah, query ini bisareturn null
            // (jarang terjadi, tapi amanhill untuk konsistensi).
            $siklus = \App\Models\SiklusAkreditasi::find($request->string('siklus_id'));
            $siklusLembagaId = $siklus?->lembaga_id;
        }

        $query = TenagaAhli::query();

        if ($siklusLembagaId !== null) {
            // Bypass global scope, lalu filter berdasarkan lembaga siklus
            $query->withoutGlobalScope('lembaga')
                ->where('lembaga_id', $siklusLembagaId);
        }

        $query->where('status_aktif', TenagaAhli::STATUS_AKTIF);

        // Filter peran
        $peran = $request->string('peran')->toString();
        $isSurveior = false;
        if ($peran === TenagaAhli::PERAN_SURVEIOR) {
            $query->whereIn('peran', [TenagaAhli::PERAN_SURVEIOR, TenagaAhli::PERAN_KEDUA]);
            $isSurveior = true;
        } elseif ($peran === TenagaAhli::PERAN_VERIFIKATOR) {
            $query->whereIn('peran', [TenagaAhli::PERAN_VERIFIKATOR, TenagaAhli::PERAN_KEDUA]);
        }

        // Filter jenis (hanya untuk surveior)
        $jenis = $request->string('jenis')->toString();
        if (in_array($jenis, [TenagaAhli::JENIS_TKPP, TenagaAhli::JENIS_TKSDU], true)) {
            $query->where('jenis', $jenis);
        }

        // FR-3.7: Surveior dengan status menunggu/diterima (sedang_bertugas) tidak boleh dipilih lagi.
        // Verifikator boleh menerima multiple penugasan (tidak ada pengecualian).
        $explicit = $request->has('exclude_bertugas');
        $excludeBertugas = $explicit
            ? $request->string('exclude_bertugas')->toString() !== '0'
            : $isSurveior; // default: true untuk surveior, false untuk verifikator/tanpa peran

        if ($excludeBertugas) {
            $query->where('status_penugasan_saat_ini', '!=', TenagaAhli::STATUS_SEDANG_BERTUGAS)
                  ->where('status_penugasan_saat_ini', '!=', 'menunggu');
        }

        $list = $query
            ->orderBy('nama')
            ->get(['id', 'nomor_induk_surveior', 'nama', 'peran', 'jenis', 'status_aktif', 'status_penugasan_saat_ini'])
            ->map(fn ($ta) => [
                'id' => $ta->id,
                'nomor_induk_surveior' => $ta->nomor_induk_surveior,
                'nama' => $ta->nama,
                'role' => $ta->peran,           // alias untuk kompatibilitas frontend
                'peran' => $ta->peran,
                'jenis' => $ta->jenis,          // TKPP / TKSDU / null
                'status_aktif' => $ta->status_aktif,
                'status_penugasan_saat_ini' => $ta->status_penugasan_saat_ini,
            ]);

        return response()->json(['data' => $list]);
    }
}
