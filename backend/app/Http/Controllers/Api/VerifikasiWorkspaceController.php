<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AkunPengguna;
use App\Models\Laporan;
use App\Models\LaporanVerifikasi;
use App\Models\Penugasan;
use App\Models\TenagaAhli;
use App\Models\VerifikasiItem;
use App\Services\AuditService;
use App\Services\Keuangan\LedgerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * FR-4.2, FR-4.3, FR-4.4, FR-4.5, FR-4.6: Verifikasi Workspace.
 * Privilege: "Verifikasi"
 */
class VerifikasiWorkspaceController extends Controller
{
    /**
     * GET /api/verifikasi/workspace/{laporanVerifikasi}
     * Ambil workspace verifikasi (FR-4.2: split-screen data).
     */
    public function show(LaporanVerifikasi $laporanVerifikasi): JsonResponse
    {
        $lv = $laporanVerifikasi->load(['items', 'laporan.penugasan.tenagaAhli']);

        return response()->json([
            'data' => $lv,
            'meta' => [
                'status_final' => $lv->status_final,
                'is_locked' => $lv->isFinal(),
                'all_items_filled' => $lv->allItemsFilled(),
            ],
        ]);
    }

    /**
     * PUT /api/verifikasi/items/{item}/nilai
     * FR-4.3: Set nilai sama (jika sesuai) atau ubah nilai + wajib isi komentar.
     * FR-4.4: Validasi wajib komentar jika nilai berubah.
     * Payload: { "nilai_final": "MK", "nilai_sesuai": true|false, "catatan": "..." }
     */
    public function updateNilai(Request $request, VerifikasiItem $item, AuditService $audit): JsonResponse
    {
        $lv = $item->laporanVerifikasi;

        if ($lv->isFinal()) {
            return response()->json(['message' => 'Verifikasi sudah final, tidak dapat diubah.'], 422);
        }

        $data = $request->validate([
            'nilai_final' => 'required|string|max:20',
            'nilai_sesuai' => 'sometimes|boolean',
            'catatan' => 'nullable|string|max:5000',
        ]);

        $nilaiChanged = $data['nilai_final'] !== $item->nilai_default;

        // FR-4.4: Wajib komentar jika nilai berubah (AC-3)
        if ($nilaiChanged && empty($data['catatan'])) {
            return response()->json([
                'message' => 'Kolom komentar WAJIB diisi jika nilai diubah.',
                'errors' => ['catatan' => ['Komentar diperlukan untuk perubahan nilai.']],
            ], 422);
        }

        $item->forceFill([
            'nilai_final' => $data['nilai_final'],
            'nilai_sesuai' => $data['nilai_sesuai'] ?? ($data['nilai_final'] === $item->nilai_default),
            'catatan' => $data['catatan'] ?? null,
            'filled_at' => $item->filled_at ?? now(),
        ])->save();

        $audit->record('verifikasi.nilai_ubah', null, $item, 'VerifikasiItem', $item->id);

        return response()->json([
            'data' => $item->fresh(),
            'message' => $nilaiChanged
                ? 'Nilai diperbarui.'
                : 'Nilai disamakan dengan default.',
        ]);
    }

    /**
     * PUT /api/verifikasi/items/{item}/nilai-sama
     * FR-4.3: Opsi "nilai sama" — langsung set nilai_final = nilai_default.
     * Tidak memerlukan komentar karena tidak ada perubahan.
     */
    public function nilaiSama(Request $request, VerifikasiItem $item, AuditService $audit): JsonResponse
    {
        $lv = $item->laporanVerifikasi;

        if ($lv->isFinal()) {
            return response()->json(['message' => 'Verifikasi sudah final, tidak dapat diubah.'], 422);
        }

        $item->forceFill([
            'nilai_final' => $item->nilai_default,
            'nilai_sesuai' => true,
            'catatan' => null,
            'filled_at' => $item->filled_at ?? now(),
        ])->save();

        $audit->record('verifikasi.nilai_sama', null, $item, 'VerifikasiItem', $item->id);

        return response()->json([
            'data' => $item->fresh(),
            'message' => 'Nilai disamakan dengan FA.',
        ]);
    }

    /**
     * POST /api/verifikasi/{laporanVerifikasi}/final
     * FR-4.5: Kunci hasil verifikasi permanen.
     * FR-4.6: Dialog konfirmasi (handled di frontend; endpoint ini mengasumsikan
     *         konfirmasi sudah dilakukan).
     * AC-4: Trigger notifikasi tagihan honor ke Keuangan.
     */
    public function finalize(Request $request, LaporanVerifikasi $laporanVerifikasi, AuditService $audit): JsonResponse
    {
        $lv = $laporanVerifikasi->load(['laporan.penugasan.tenagaAhli', 'items', 'verifikasiPenugasan']);

        if ($lv->isFinal()) {
            return response()->json(['message' => 'Verifikasi sudah final.'], 422);
        }

        // AC-3: Semua item harus terisi sebelum final
        $unfilled = $lv->items->whereNull('nilai_final');
        if ($unfilled->isNotEmpty()) {
            return response()->json([
                'message' => 'Semua item harus terisi sebelum final.',
                'unfilled_count' => $unfilled->count(),
            ], 422);
        }

        $user = $request->user();

        // Lock permanent
        $lv->forceFill([
            'status_final' => LaporanVerifikasi::STATUS_FINAL,
            'finalized_at' => now(),
            'difinalisasi_oleh' => $user->id,
            'status_rekomendasi' => LaporanVerifikasi::STATUS_REKOMENDASI_MENUNGGU,
        ])->save();

        $audit->record('verifikasi.final', null, $lv, 'LaporanVerifikasi', $lv->id);

        // Update penugasan verifikasi & siklus → selesai (tahapan 7)
        $verifikasiPenugasan = $lv->verifikasiPenugasan;
        $verifikasiPenugasan->forceFill(['status' => Penugasan::STATUS_SELESAI])->save();

        $siklus = $verifikasiPenugasan->siklus;
        $siklus->forceFill([
            'status' => 'selesai',
            'tahapan' => 7,
        ])->save();

        $audit->record('siklus.verifikasi_selesai', null, $siklus, 'SiklusAkreditasi', $siklus->id);

        // AP honor (surveior + verifikator + rekomendator) + NotifikasiTagihan
        // TIDAK dibuat di sini lagi — ditunda sampai rekomendator menyetujui.
        // Lihat LedgerService::triggerHonorSetelahRekomendasi.

        return response()->json([
            'data' => $lv->fresh(['items', 'verifikasiPenugasan.tenagaAhli']),
            'message' => 'Verifikasi difinalisasi. Menunggu rekomendasi rekomendator.',
        ]);
    }

    /**
     * GET /api/verifikasi/{laporanVerifikasi}/preview-final
     * FR-4.6: Preview sebelum final — untuk dialog konfirmasi di frontend.
     */
    public function previewFinal(LaporanVerifikasi $laporanVerifikasi): JsonResponse
    {
        $lv = $laporanVerifikasi->load(['items', 'laporan.penugasan.tenagaAhli']);

        $unfilled = $lv->items->filter(fn ($i) => $i->nilai_final === null);
        $changedItems = $lv->items->filter(fn ($i) => $i->nilai_final !== null && $i->nilai_final !== $i->nilai_default);

        return response()->json([
            'can_final' => $lv->isDraft() && $unfilled->isEmpty(),
            'unfilled_count' => $unfilled->count(),
            'changed_count' => $changedItems->count(),
            'changed_items' => $changedItems->values()->map(fn ($i) => [
                'kode_elemen' => $i->kode_elemen,
                'nama_elemen' => $i->nama_elemen,
                'nilai_default' => $i->nilai_default,
                'nilai_final' => $i->nilai_final,
                'catatan' => $i->catatan,
            ]),
            'total_items' => $lv->items->count(),
        ]);
    }
}
