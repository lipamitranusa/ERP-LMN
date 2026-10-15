<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Keuangan\ReconciliationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * FR-5.4 — Dasbor rekonsiliasi Direktur.
 *
 * Privilege: "Dasbor Eksekutif" (Lihat)
 *
 * Endpoint:
 *   GET /api/dasbor/rekonsiliasi             — snapshot lengkap
 *   GET /api/dasbor/rekonsiliasi/kpi         — KPI ringkasan
 *   GET /api/dasbor/rekonsiliasi/per-faskes  — baris per Faskes
 */
class ReconciliationController extends Controller
{
    public function __construct(private ReconciliationService $service) {}

    public function snapshot(Request $request): JsonResponse
    {
        $filters = $this->parseFilters($request);
        return response()->json(['data' => $this->service->snapshot($filters)]);
    }

    public function kpi(Request $request): JsonResponse
    {
        $filters = $this->parseFilters($request);
        return response()->json(['data' => $this->service->kpi($filters)]);
    }

    public function perFaskes(Request $request): JsonResponse
    {
        $filters = $this->parseFilters($request);
        return response()->json(['data' => $this->service->perFaskes($filters)]);
    }

    private function parseFilters(Request $request): array
    {
        $filters = [];
        if ($dari = $request->string('dari')->toString()) {
            $filters['dari'] = $dari;
        }
        if ($sampai = $request->string('sampai')->toString()) {
            $filters['sampai'] = $sampai;
        }
        return $filters;
    }
}
