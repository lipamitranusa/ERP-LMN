<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lembaga;
use App\Services\Keuangan\BuktiPotongService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * FR-5.8 + FR-5.9 — Penerbitan bukti potong pajak per periode.
 *
 * Privilege: "Ledger/Keuangan" (Lihat, Ekspor)
 */
class BuktiPotongController extends Controller
{
    public function __construct(private BuktiPotongService $service) {}

    /**
     * GET /api/keuangan/bukti-potong?periode=2026-10
     * Rekap bukti potong PPh 21 per Tenaga Ahli untuk satu periode.
     */
    public function rekap(Request $request): JsonResponse
    {
        $periode = $this->parsePeriode($request);

        $rekap = $this->service->rekapPerTenagaAhli($periode['tahun'], $periode['bulan']);
        $gap = $this->service->gapNpwpPerTenagaAhli($periode['tahun'], $periode['bulan']);
        $ringkasan = $this->service->ringkasanPeriode($periode['tahun'], $periode['bulan']);
        $ringkasan['jumlah_belum_siap_export'] = $gap->count();
        $ringkasan['siap_export'] = $gap->count() === 0 && $rekap->count() > 0;

        return response()->json([
            'data' => [
                'ringkasan' => $ringkasan,
                'rekap' => $rekap,
                'gap_npwp' => $gap,
            ],
        ]);
    }

    /**
     * GET /api/keuangan/bukti-potong/gap-report?periode=2026-10
     * Laporan Tenaga Ahli yang NPWP/identitas pajaknya belum lengkap
     * untuk bukti potong pada periode tersebut (FR-5.8 + FR-5.9).
     *
     * Privilege: Ledger/Keuangan / Lihat.
     */
    public function gapReport(Request $request): JsonResponse
    {
        $periode = $this->parsePeriode($request);
        $gap = $this->service->gapNpwpPerTenagaAhli($periode['tahun'], $periode['bulan']);

        return response()->json([
            'data' => [
                'periode' => $periode['periode'],
                'jumlah_belum_lengkap' => $gap->count(),
                'daftar_tenaga_ahli' => $gap,
            ],
        ]);
    }

    /**
     * GET /api/keuangan/bukti-potong/export-xml?periode=YYYY-MM&lembaga_id=...
     * Ekspor bukti potong ke XML BP21 untuk Coretax DJP (FR-5.9).
     *
     * Format output mengikuti `docs/BP21_Template.xml` — satu <Bp21>
     * per transaksi honor yang sudah dibayar (lunas) pada periode
     * tersebut. Header <TIN> menggunakan NPWP Lembaga (wajib diisi
     * Keuangan via Master Lembaga sebelum export pertama).
     */
    public function exportXml(Request $request): Response
    {
        $periode = $this->parsePeriode($request);

        // Lembaga aktif: param `lembaga_id` (opsional), fallback ke
        // baris Lembaga pertama. NPWP Lembaga WAJIB valid sebelum export
        // ke Coretax (lihat LembagaSeeder TODO).
        $lembaga = $request->filled('lembaga_id')
            ? Lembaga::find($request->string('lembaga_id')->toString())
            : Lembaga::orderBy('id')->first();

        $xml = $this->service->toCoretaxXml(
            tahun: $periode['tahun'],
            bulan: $periode['bulan'],
            lembaga: $lembaga,
        );

        $filename = sprintf('Bp21-%s.xml', $periode['periode']);
        return response($xml, 200, [
            'Content-Type' => 'application/xml; charset=utf-8',
            'Content-Disposition' => "attachment; filename=\"$filename\"",
        ]);
    }

    /**
     * Parse query string `periode=YYYY-MM` menjadi komponen tahun+bulan.
     * Default ke bulan berjalan jika tidak diberikan.
     */
    private function parsePeriode(Request $request): array
    {
        $periode = $request->string('periode')->toString();
        if ($periode && preg_match('/^(\d{4})-(\d{2})$/', $periode, $m)) {
            $tahun = (int) $m[1];
            $bulan = (int) $m[2];
        } else {
            $now = now();
            $tahun = $now->year;
            $bulan = $now->month;
            $periode = sprintf('%04d-%02d', $tahun, $bulan);
        }

        if ($bulan < 1 || $bulan > 12) {
            abort(response()->json(['message' => 'Bulan harus antara 1 dan 12.'], 422));
        }

        return [
            'periode' => $periode,
            'tahun' => $tahun,
            'bulan' => $bulan,
        ];
    }
}
