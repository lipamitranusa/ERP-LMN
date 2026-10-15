<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Keuangan\PiutangService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PiutangController extends Controller
{
    public function __construct(private PiutangService $service) {}

    /**
     * GET /api/piutang/dasbor
     *
     * Snapshot lengkap: KPI ringkasan, aging buckets, top Faskes,
     * dan daftar invoice piutang. Filter opsional via query string:
     *   ?status=belum_bayar|sebagian
     *   ?jatuh_tempo=1
     *   ?faskes_id=<uuid>
     */
    public function dasbor(Request $request): JsonResponse
    {
        $filters = array_filter([
            'status' => $request->string('status')->toString() ?: null,
            'jatuh_tempo' => $request->boolean('jatuh_tempo'),
            'faskes_id' => $request->string('faskes_id')->toString() ?: null,
        ], fn ($v) => $v !== null && $v !== false && $v !== '');

        return response()->json([
            'data' => $this->service->snapshot($filters),
        ]);
    }

    public function kpi(): JsonResponse
    {
        return response()->json(['data' => $this->service->kpiSummary()]);
    }

    public function aging(): JsonResponse
    {
        return response()->json(['data' => $this->service->agingBuckets()]);
    }

    /**
     * GET /api/piutang/{id}
     * Detail satu invoice dengan histori pembayaran.
     */
    public function show(string $id): JsonResponse
    {
        $data = $this->service->detail($id);
        if (! $data) {
            return response()->json(['message' => 'Invoice tidak ditemukan.'], 404);
        }
        return response()->json(['data' => $data]);
    }
}
