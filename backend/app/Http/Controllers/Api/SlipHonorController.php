<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LedgerEntry;
use App\Models\TenagaAhli;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * SlipHonorController — slip honorarium individual dengan rincian
 * bruto / potongan PPN / potongan PPh / neto (AC-7).
 *
 * Setiap slip menampilkan:
 *   - Detail tenaga ahli penerima
 *   - Per-penugasan breakdown
 *   - Verifikasi AC-7 invariant per entry
 *   - Total per slip
 *
 * Privilege: "Ledger/Keuangan" / Lihat
 */
class SlipHonorController extends Controller
{
    /**
     * GET /api/ledger/slip-honor?periode=2026-10
     * Daftar slip honorarium per tenaga ahli (ringkasan).
     */
    public function index(Request $request): JsonResponse
    {
        $periode = $this->parsePeriode($request);

        $entries = LedgerEntry::query()
            ->whereIn('tipe', [
                LedgerEntry::TIPE_AP_HONOR_SURVEIOR,
                LedgerEntry::TIPE_AP_HONOR_VERIFIKATOR,
                LedgerEntry::TIPE_AP_HONOR_REKOMENDATOR,
            ])
            ->whereNotNull('penerima_tenaga_ahli_id')
            ->whereBetween('created_at', [
                Carbon::create($periode['tahun'], $periode['bulan'], 1)->startOfMonth(),
                Carbon::create($periode['tahun'], $periode['bulan'], 1)->endOfMonth(),
            ])
            ->with(['penerima', 'siklus.faskes'])
            ->orderBy('penerima_tenaga_ahli_id')
            ->orderBy('created_at')
            ->get();

        $slips = $entries->groupBy('penerima_tenaga_ahli_id')->map(function ($items, $taId) {
            $ta = $items->first()->penerima;
            $honorSurvei = $items->where('tipe', LedgerEntry::TIPE_AP_HONOR_SURVEIOR);
            $honorVerif = $items->where('tipe', LedgerEntry::TIPE_AP_HONOR_VERIFIKATOR);
            $honorRek = $items->where('tipe', LedgerEntry::TIPE_AP_HONOR_REKOMENDATOR);

            $totalBruto = (float) $items->sum('nominal_bruto');
            $totalPpn = (float) $items->sum('potongan_ppn');
            $totalPph = (float) $items->sum('potongan_pph');
            $totalNeto = (float) $items->sum('nominal_neto');
            $netoTerhitung = round($totalBruto - $totalPpn - $totalPph, 2);
            $selisihTotal = round($totalNeto - $netoTerhitung, 2);

            // AC-7 per entry
            $entriesAc7 = $items->map(fn ($e) => $this->verifyAc7($e))->values();

            return [
                'tenaga_ahli_id' => (string) $taId,
                'nama' => $ta?->nama ?? '—',
                'npwp' => $ta?->npwp,
                'nik' => $ta?->nik,
                'peran' => $ta?->peran,
                'jumlah_penugasan' => $items->count(),
                'jumlah_survei' => $honorSurvei->count(),
                'jumlah_verifikasi' => $honorVerif->count(),
                'jumlah_rekomendasi' => $honorRek->count(),
                'total_bruto' => round($totalBruto, 2),
                'total_potongan_ppn' => round($totalPpn, 2),
                'total_potongan_pph' => round($totalPph, 2),
                'total_neto' => round($totalNeto, 2),
                'ac7_total' => [
                    'neto_terhitung' => $netoTerhitung,
                    'selisih' => $selisihTotal,
                    'valid' => $selisihTotal === 0.0,
                    'rumus' => "total_neto = total_bruto − total_PPN − total_PPh",
                    'persamaan' => sprintf(
                        '%.2f = %.2f − %.2f − %.2f',
                        $netoTerhitung, $totalBruto, $totalPpn, $totalPph
                    ),
                ],
                'entries' => $entriesAc7,
            ];
        })->values();

        return response()->json([
            'data' => [
                'periode' => $periode['tahun'] . '-' . sprintf('%02d', $periode['bulan']),
                'bulan' => $periode['bulan'],
                'tahun' => $periode['tahun'],
                'jumlah_tenaga_ahli' => $slips->count(),
                'total_bruto' => round($slips->sum('total_bruto'), 2),
                'total_potongan_ppn' => round($slips->sum('total_potongan_ppn'), 2),
                'total_potongan_pph' => round($slips->sum('total_potongan_pph'), 2),
                'total_neto' => round($slips->sum('total_neto'), 2),
                'slips' => $slips,
            ],
        ]);
    }

    /**
     * GET /api/ledger/slip-honor/{tenaga_ahli_id}?periode=2026-10
     * Slip honorarium untuk satu tenaga ahli, full AC-7 breakdown.
     */
    public function show(Request $request, string $tenagaAhliId): JsonResponse
    {
        $periode = $this->parsePeriode($request);
        $ta = TenagaAhli::findOrFail($tenagaAhliId);

        $entries = LedgerEntry::query()
            ->whereIn('tipe', [
                LedgerEntry::TIPE_AP_HONOR_SURVEIOR,
                LedgerEntry::TIPE_AP_HONOR_VERIFIKATOR,
                LedgerEntry::TIPE_AP_HONOR_REKOMENDATOR,
            ])
            ->where('penerima_tenaga_ahli_id', $tenagaAhliId)
            ->whereBetween('created_at', [
                Carbon::create($periode['tahun'], $periode['bulan'], 1)->startOfMonth(),
                Carbon::create($periode['tahun'], $periode['bulan'], 1)->endOfMonth(),
            ])
            ->with(['siklus.faskes', 'konfigurasiPajak', 'pembayaranDetail'])
            ->orderBy('created_at')
            ->get();

        if ($entries->isEmpty()) {
            abort(response()->json(['message' => 'Tidak ada entry honor untuk periode ini.'], 404));
        }

        $totalBruto = (float) $entries->sum('nominal_bruto');
        $totalPpn = (float) $entries->sum('potongan_ppn');
        $totalPph = (float) $entries->sum('potongan_pph');
        $totalNeto = (float) $entries->sum('nominal_neto');

        $entriesData = $entries->map(fn ($e) => $this->entryDetail($e))->values();

        $ac7Total = $this->verifyAc7Total($totalBruto, $totalPpn, $totalPph, $totalNeto);

        return response()->json([
            'data' => [
                'tenaga_ahli' => [
                    'id' => $ta->id,
                    'nama' => $ta->nama,
                    'nomor_induk_surveior' => $ta->nomor_induk_surveior,
                    'npwp' => $ta->npwp,
                    'nik' => $ta->nik,
                    'peran' => $ta->peran,
                    'nama_pajak' => $ta->nama_pajak,
                    'alamat_pajak' => $ta->alamat_pajak,
                ],
                'periode' => $periode['tahun'] . '-' . sprintf('%02d', $periode['bulan']),
                'jumlah_penugasan' => $entries->count(),
                'entries' => $entriesData,
                'total' => [
                    'bruto' => round($totalBruto, 2),
                    'potongan_ppn' => round($totalPpn, 2),
                    'potongan_pph' => round($totalPph, 2),
                    'neto' => round($totalNeto, 2),
                ],
                'ac7' => $ac7Total,
            ],
        ]);
    }

    private function entryDetail(LedgerEntry $entry): array
    {
        $ac7 = $this->verifyAc7($entry);
        $detail = $entry->detail ?? [];

        return [
            'id' => $entry->id,
            'tipe' => $entry->tipe,
            'tipe_label' => match ($entry->tipe) {
                LedgerEntry::TIPE_AP_HONOR_SURVEIOR => 'Surveior',
                LedgerEntry::TIPE_AP_HONOR_VERIFIKATOR => 'Verifikator',
                LedgerEntry::TIPE_AP_HONOR_REKOMENDATOR => 'Rekomendator',
                default => 'Lainnya',
            },
            'siklus_id' => $entry->siklus_id,
            'faskes_nama' => $entry->siklus?->faskes?->nama,
            'siklus_nama' => $entry->siklus?->nama,
            'nominal_bruto' => (float) $entry->nominal_bruto,
            'potongan_ppn' => (float) $entry->potongan_ppn,
            'potongan_pph' => (float) $entry->potongan_pph,
            'nominal_neto' => (float) $entry->nominal_neto,
            'status_pembayaran' => $entry->status_pembayaran,
            'tanggal_dibayar' => $entry->tanggal_dibayar?->toIso8601String(),
            'nomor_bukti' => $entry->pembayaranDetail?->nomor_bukti,
            'tarif_snapshot' => $detail['tarif_snapshot'] ?? null,
            'ac7' => $ac7,
            'created_at' => $entry->created_at?->toIso8601String(),
        ];
    }

    private function verifyAc7(LedgerEntry $entry): array
    {
        $bruto = (float) $entry->nominal_bruto;
        $ppn = (float) $entry->potongan_ppn;
        $pph = (float) $entry->potongan_pph;
        $neto = (float) $entry->nominal_neto;
        $calculated = round($bruto - $ppn - $pph, 2);
        $selisih = round($neto - $calculated, 2);

        return [
            'valid' => $selisih === 0.0,
            'selisih' => $selisih,
            'rumus' => 'neto = bruto − PPN − PPh',
            'persamaan' => sprintf('%.2f = %.2f − %.2f − %.2f', $calculated, $bruto, $ppn, $pph),
        ];
    }

    private function verifyAc7Total(float $bruto, float $ppn, float $pph, float $neto): array
    {
        $calculated = round($bruto - $ppn - $pph, 2);
        $selisih = round($neto - $calculated, 2);

        return [
            'valid' => $selisih === 0.0,
            'selisih' => $selisih,
            'rumus' => 'total_neto = total_bruto − total_PPN − total_PPh',
            'persamaan' => sprintf(
                '%.2f = %.2f − %.2f − %.2f',
                $calculated, $bruto, $ppn, $pph
            ),
            'bruto' => $bruto,
            'ppn' => $ppn,
            'pph' => $pph,
            'neto_tersimpan' => $neto,
            'neto_terhitung' => $calculated,
            'badge' => $selisih === 0.0 ? 'AC-7 VALID' : 'AC-7 SELISIH!',
        ];
    }

    private function parsePeriode(Request $request): array
    {
        $periode = $request->string('periode')->toString();
        if ($periode && preg_match('/^(\d{4})-(\d{2})$/', $periode, $m)) {
            return ['tahun' => (int) $m[1], 'bulan' => (int) $m[2]];
        }
        $now = now();
        return ['tahun' => $now->year, 'bulan' => $now->month];
    }
}
