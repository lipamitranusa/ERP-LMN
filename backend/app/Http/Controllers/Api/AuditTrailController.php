<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditTrail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditTrailController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = AuditTrail::query()->orderByDesc('created_at');

        if ($request->filled('aksi')) {
            $query->where('aksi', $request->string('aksi'));
        }
        if ($request->filled('target_type')) {
            $query->where('target_type', $request->string('target_type'));
        }
        if ($request->filled('target_id')) {
            $query->where('target_id', $request->string('target_id'));
        }

        $perPage = min((int) $request->integer('per_page', 50), 50);
        $items = $query->paginate($perPage);

        return response()->json($items);
    }
}