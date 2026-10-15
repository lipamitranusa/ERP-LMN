<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Keuangan\HutangPajakService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * HutangPajakController — REST API untuk tracking hutang PPh 21
 * yang dipotong dari honor Surveior/Verifikator/Rekomendator.
 *
 * Privilege: "Ledger/Keuangan"
 *   - Lihat: list & detail hutang pajak
 *   - Ubah: tandai lunas + upload bukti setor
 */
class HutangPajakController extends Controller
{
    public function __construct(private HutangPajakService $service) {}

    /**
     * GET /api/keuangan/hutang-pajak/dashboard
     * KPI ringkasan.
     */
    public function dashboard(): JsonResponse
    {
        return response()->json(['data' => $this->service->dashboard()]);
    }

    /**
     * GET /api/keuangan/hutang-pajak
     * Daftar hutang pajak. Query: ?status=, ?tahun=&bulan=, ?q=
     */
    public function index(Request $request): JsonResponse
    {
        $filters = array_filter([
            'status' => $request->string('status')->toString() ?: null,
            'jenis_pajak' => $request->string('jenis_pajak')->toString() ?: null,
            'tahun' => $request->integer('tahun') ?: null,
            'bulan' => $request->integer('bulan') ?: null,
            'q' => $request->string('q')->toString() ?: null,
        ], fn ($v) => $v !== null && $v !== '');

        $data = $this->service->list($filters);
        $total = $data->sum('jumlah_pajak');

        return response()->json([
            'data' => [
                'entries' => $data,
                'ringkasan' => [
                    'total_pajak' => round($total, 2),
                    'jumlah' => $data->count(),
                ],
            ],
        ]);
    }

    /**
     * GET /api/keuangan/hutang-pajak/{id}
     * Detail satu hutang pajak + pembayaran honor terkait.
     */
    public function show(string $id): JsonResponse
    {
        $data = $this->service->get($id);
        if (! $data) {
            return response()->json(['message' => 'Hutang pajak tidak ditemukan.'], 404);
        }
        return response()->json(['data' => $data]);
    }

    /**
     * POST /api/keuangan/hutang-pajak/{id}/lunas
     * Tandai lunas + upload bukti setor PPh.
     * Body: { tanggal_dibayar?, bukti_setor?: file, catatan?: string }
     */
    public function markLunas(Request $request, string $id): JsonResponse
    {
        $userId = $request->user()?->id;
        if (! $userId) {
            return response()->json(['message' => 'Tidak terautentikasi.'], 401);
        }

        $tanggal = $request->filled('tanggal_dibayar')
            ? \Carbon\Carbon::parse($request->input('tanggal_dibayar'))
            : null;

        $buktiFile = $request->file('bukti_setor');

        $result = $this->service->markAsPaid(
            hutangId: $id,
            userId: $userId,
            tanggalDibayar: $tanggal,
            buktiSetorFile: $buktiFile,
            catatan: $request->string('catatan')->toString() ?: null,
        );

        if (! $result['success']) {
            return response()->json(['message' => $result['error']], 422);
        }

        return response()->json(['data' => $this->service->get($result['hutang']->id)]);
    }
}
