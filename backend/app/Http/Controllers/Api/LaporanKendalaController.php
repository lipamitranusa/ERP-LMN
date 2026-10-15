<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AkunPengguna;
use App\Models\LaporanKendala;
use App\Models\Penugasan;
use App\Models\SiklusAkreditasi;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * FR-3.2: Form pelaporan kendala (CoI/Force Majeure) oleh Surveior.
 * Privilege: Penugasan
 */
class LaporanKendalaController extends Controller
{
    /**
     * GET /api/penugasan/siklus/{siklus}/kendala
     * Admin melihat daftar kendala untuk siklus tertentu.
     */
    public function index(SiklusAkreditasi $siklus): JsonResponse
    {
        $kendala = LaporanKendala::with(['penugasan.tenagaAhli', 'reporter'])
            ->whereHas('penugasan', fn ($q) => $q->where('siklus_id', $siklus->id))
            ->orderBy('tanggal_laporan', 'desc')
            ->paginate(20);

        return response()->json($kendala);
    }

    /**
     * GET /api/penugasan/kendala/saya
     * Surveior melihat daftar kendala yang dilaporkan olehnya.
     */
    public function saya(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->tenaga_ahli_id) {
            return response()->json(['data' => []]);
        }

        $kendala = LaporanKendala::with(['penugasan.siklus.faskes', 'penugasan.tenagaAhli'])
            ->where('tenaga_ahli_id', $user->tenaga_ahli_id)
            ->orderBy('tanggal_laporan', 'desc')
            ->paginate(20);

        return response()->json($kendala);
    }

    /**
     * POST /api/penugasan/kendala
     * Surveior melaporkan kendala (CoI atau Force Majeure).
     * FR-3.2, FR-3.3 (triggers alur penggantian).
     */
    public function store(Request $request, AuditService $audit): JsonResponse
    {
        $user = $request->user();

        if (! $user->tenaga_ahli_id) {
            abort(response()->json(['message' => 'Akun ini tidak terkait dengan tenaga ahli.'], 403));
        }

        $data = $request->validate([
            'penugasan_id' => 'required|uuid|exists:penugasan,id',
            'jenis' => 'required|string|in:conflict_of_interest,force_majeure',
            'deskripsi' => 'required|string|max:5000',
        ]);

        $penugasan = Penugasan::findOrFail($data['penugasan_id']);

        // Hanya tenaga ahli yang ditugaskan pada penugasan ini yang bisa melapor
        if ($penugasan->tenaga_ahli_id !== $user->tenaga_ahli_id) {
            abort(response()->json(['message' => 'Tidak diizinkan.'], 403));
        }

        $kendala = LaporanKendala::create([
            'id' => (string) Str::uuid(),
            'penugasan_id' => $penugasan->id,
            'tenaga_ahli_id' => $user->tenaga_ahli_id,
            'jenis' => $data['jenis'],
            'deskripsi' => $data['deskripsi'],
            'status' => LaporanKendala::STATUS_MENUNGGU,
            'tanggal_laporan' => now(),
            'dilaporkan_oleh' => $user->id,
        ]);

        $audit->record('kendala.lapor', null, $kendala, 'LaporanKendala', $kendala->id);

        $kendala->load(['penugasan.siklus.faskes', 'tenagaAhli']);

        return response()->json(['data' => $kendala], 201);
    }

    /**
     * GET /api/penugasan/kendala/{kendala}
     */
    public function show(LaporanKendala $kendala): JsonResponse
    {
        $kendala->load(['penugasan.siklus.faskes', 'tenagaAhli', 'reporter']);
        return response()->json(['data' => $kendala]);
    }

    /**
     * PATCH /api/penugasan/kendala/{kendala}/proses
     * Admin menandai kendala sebagai sedang diproses (FR-3.3).
     */
    public function proses(LaporanKendala $kendala, AuditService $audit): JsonResponse
    {
        $kendala->forceFill(['status' => LaporanKendala::STATUS_DIPROSES])->save();

        $audit->record('kendala.proses', null, $kendala, 'LaporanKendala', $kendala->id);

        return response()->json(['data' => $kendala->fresh()]);
    }
}
