<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AkunPengguna;
use App\Models\Penugasan;
use App\Models\SuratTugas;
use App\Models\TenagaAhli;
use App\Services\AuditService;
use App\Services\Notification\PenugasanNotifier;
use App\Services\Penugasan\SuratTugasGatekeeper;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * FR-2.4 (revisi v2.2): Surat Tugas Survei dapat diterbitkan segera setelah
 * dokumen tervalidasi lengkap (FR-1.3) dan PKS disetujui (FR-2.1) — TANPA
 * menunggu status Invoice berubah menjadi Paid. Status pembayaran dipantau
 * terpisah oleh Keuangan melalui dasbor piutang.
 */
class SuratTugasIssuanceController extends Controller
{
    public function __construct(
        private SuratTugasGatekeeper $gatekeeper,
        private AuditService $audit,
        private PenugasanNotifier $notifier,
    ) {}

    public function issue(Request $request): JsonResponse
    {
        $data = $request->validate([
            'siklus_id' => 'required|uuid',
            'tenaga_ahli_id' => 'required|uuid',
            'jenis' => 'required|in:survei,verifikasi',
            'path_pdf' => 'nullable|string',
        ]);

        $siklus = \App\Models\SiklusAkreditasi::findWithLembagaCheck($data['siklus_id']);
        $tenagaAhli = TenagaAhli::findOrFail($data['tenaga_ahli_id']);

        $errors = $this->gatekeeper->canIssue($siklus);
        if (! empty($errors)) {
            return response()->json([
                'message' => 'Surat Tugas belum dapat diterbitkan.',
                'errors' => $errors,
            ], 422);
        }

        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $existingPenugasan = Penugasan::where('siklus_id', $siklus->id)
            ->where('tenaga_ahli_id', $tenagaAhli->id)
            ->where('jenis', $data['jenis'])
            ->whereNotIn('status', [Penugasan::STATUS_DIBATALKAN, Penugasan::STATUS_DITOLAK])
            ->first();
        if ($existingPenugasan) {
            return response()->json([
                'message' => 'Tenaga ahli sudah ditugaskan untuk siklus ini.',
                'data' => $existingPenugasan->load('suratTugas'),
            ], 409);
        }

        $result = DB::transaction(function () use ($siklus, $tenagaAhli, $data, $user) {
            $penugasan = Penugasan::create([
                'siklus_id' => $siklus->id,
                'tenaga_ahli_id' => $tenagaAhli->id,
                'jenis' => $data['jenis'],
                'status' => Penugasan::STATUS_MENUNGGU,
            ]);

            $nomor = sprintf(
                'ST/%s/%s/%s',
                strtoupper($data['jenis']),
                now()->format('Y'),
                strtoupper(Str::random(6))
            );

            $surat = SuratTugas::create([
                'penugasan_id' => $penugasan->id,
                'nomor_surat' => $nomor,
                'tanggal_terbit' => now()->toDateString(),
                'path_pdf' => $data['path_pdf'] ?? null,
                'diterbitkan_oleh' => $user->id,
            ]);

            $this->audit->log('surat_tugas.issued', 'surat_tugas', $surat->id, [
                'penugasan_id' => $penugasan->id,
                'siklus_id' => $siklus->id,
                'jenis' => $data['jenis'],
                'nomor_surat' => $nomor,
                'invoice_status_at_issue' => optional($siklus->invoice)->status,
            ]);

            // NFR-1: notify Tenaga Ahli (Surveior / Verifikator) tentang Surat Tugas baru.
            return [
                'penugasan' => $penugasan,
                'surat_tugas' => $surat,
            ];
        });

        // Notifikasi ke tenaga ahli (WhatsApp ke no_wa master / email fallback).
        $this->notifier->kirim($result['penugasan']);

        return response()->json([
            'data' => $result,
        ], 201);
    }
}
