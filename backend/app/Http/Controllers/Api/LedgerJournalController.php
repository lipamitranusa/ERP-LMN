<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditTrail;
use App\Models\LedgerEntry;
use App\Models\SiklusAkreditasi;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * LedgerJournalController — buku besar lengkap Ledger Entry (AC-6).
 *
 * Menampilkan seluruh Ledger Entry dari Fase 1–2 secara tertelusuri.
 * Setiap entry memiliki link ke audit trail-nya.
 *
 * Privilege: "Ledger/Keuangan" / Lihat
 */
class LedgerJournalController extends Controller
{
    /**
     * GET /api/ledger/journal
     * Buku besar lengkap dengan filter tipe, periode, dan Faskes.
     */
    public function journal(Request $request): JsonResponse
    {
        $query = LedgerEntry::query()
            ->with([
                'siklus.faskes',
                'invoice',
                'penerima',
                'konfigurasiPajak',
            ])
            ->orderByDesc('created_at');

        // Filter tipe
        if ($request->filled('tipe')) {
            $tipes = explode(',', $request->string('tipe'));
            $query->whereIn('tipe', $tipes);
        }

        // Filter periode
        if ($request->filled('dari')) {
            $query->whereDate('created_at', '>=', $request->date('dari'));
        }
        if ($request->filled('sampai')) {
            $query->whereDate('created_at', '<=', $request->date('sampai'));
        }

        // Filter faskes (via siklus)
        if ($request->filled('faskes_id')) {
            $query->where('siklus_id', $request->integer('faskes_id'));
        }

        // Filter status pembayaran
        if ($request->filled('status')) {
            $query->where('status_pembayaran', $request->string('status'));
        }

        // Pencarian
        if ($request->filled('q')) {
            $q = $request->string('q');
            $query->where(function ($sub) use ($q) {
                $sub->whereJsonContains('detail->penugasan_id', $q)
                    ->orWhereJsonContains('detail->tenaga_ahli_id', $q)
                    ->orWhere('id', 'like', "%$q%")
                    ->orWhereHas('penerima', fn($r) => $r->where('nama', 'like', "%$q%"))
                    ->orWhereHas('siklus.faskes', fn($r) => $r->where('nama', 'like', "%$q%"));
            });
        }

        $total = $query->count();
        $entries = $query
            ->paginate($request->integer('per_page', 25));

        // Hitung saldo berjalan
        $allIds = LedgerEntry::query()
            ->when($request->filled('dari'), fn($q) => $q->whereDate('created_at', '<', $request->date('dari')))
            ->orderBy('created_at')
            ->pluck('id')
            ->toArray();
        $saldoAwal = 0.0;
        foreach ($allIds as $id) {
            $e = LedgerEntry::find($id);
            if ($e->tipe === LedgerEntry::TIPE_PIUTANG_LUNAS || $e->tipe === LedgerEntry::TIPE_REFUND) {
                $saldoAwal += (float) $e->nominal_neto;
            } else {
                $saldoAwal -= (float) $e->nominal_bruto;
            }
        }

        return response()->json([
            'data' => [
                'entries' => $entries->items(),
                'saldo_awal' => round($saldoAwal, 2),
                'pagination' => [
                    'current_page' => $entries->currentPage(),
                    'last_page' => $entries->lastPage(),
                    'per_page' => $entries->perPage(),
                    'total' => $entries->total(),
                ],
            ],
        ]);
    }

    /**
     * GET /api/ledger/entry/{id}
     * Detail satu Ledger Entry dengan trace lengkap dan audit trail.
     */
    public function entry(string $id): JsonResponse
    {
        $entry = LedgerEntry::with([
            'siklus.faskes',
            'invoice',
            'penerima',
            'konfigurasiPajak',
            'pembayaranDetail',
        ])->findOrFail($id);

        // Audit trail terkait
        $auditTrail = AuditTrail::where('target_type', 'LedgerEntry')
            ->where('target_id', $id)
            ->orderBy('created_at')
            ->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'aksi' => $a->aksi,
                'aktor_id' => $a->aktor_id,
                'data_sebelum' => $a->data_sebelum,
                'data_sesudah' => $a->data_sesudah,
                'ip_address' => $a->ip_address,
                'user_agent' => $a->user_agent,
                'created_at' => $a->created_at?->toIso8601String(),
            ]);

        // AC-7 invariant verification
        $ac7Valid = $this->verifyAc7($entry);

        // Detail trace
        $trace = $this->buildTrace($entry);

        // Entries terkait di siklus yang sama
        $relatedEntries = LedgerEntry::where('siklus_id', $entry->siklus_id)
            ->where('id', '!=', $id)
            ->with('penerima')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(fn ($e) => [
                'id' => $e->id,
                'tipe' => $e->tipe,
                'nominal_neto' => (float) $e->nominal_neto,
                'nominal_bruto' => (float) $e->nominal_bruto,
                'penerima_nama' => $e->penerima?->nama,
                'created_at' => $e->created_at?->toIso8601String(),
            ]);

        return response()->json([
            'data' => [
                'entry' => [
                    'id' => $entry->id,
                    'tipe' => $entry->tipe,
                    'tipe_label' => $this->tipeLabel($entry->tipe),
                    'siklus_id' => $entry->siklus_id,
                    'invoice_id' => $entry->invoice_id,
                    'penerima_tenaga_ahli_id' => $entry->penerima_tenaga_ahli_id,
                    'konfigurasi_pajak_id' => $entry->konfigurasi_pajak_id,
                    'status_pembayaran' => $entry->status_pembayaran,
                    'tanggal_dibayar' => $entry->tanggal_dibayar?->toIso8601String(),
                    'nominal_bruto' => (float) $entry->nominal_bruto,
                    'potongan_ppn' => (float) $entry->potongan_ppn,
                    'potongan_pph' => (float) $entry->potongan_pph,
                    'nominal_neto' => (float) $entry->nominal_neto,
                    'detail' => $entry->detail,
                    'created_at' => $entry->created_at?->toIso8601String(),
                ],
                'siklus' => $entry->siklus ? [
                    'id' => $entry->siklus->id,
                    'nama' => $entry->siklus->nama,
                    'faskes_nama' => $entry->siklus->faskes?->nama,
                    'status' => $entry->siklus->status,
                    'tanggal_pengajuan' => $entry->siklus->tanggal_pengajuan,
                ] : null,
                'invoice' => $entry->invoice ? [
                    'id' => $entry->invoice->id,
                    'nomor_invoice' => $entry->invoice->nomor_invoice,
                    'status' => $entry->invoice->status,
                    'total_tagihan' => (float) $entry->invoice->total_tagihan,
                    'total_diterima' => (float) $entry->invoice->totalDiterima(),
                ] : null,
                'penerima' => $entry->penerima ? [
                    'id' => $entry->penerima->id,
                    'nama' => $entry->penerima->nama,
                    'npwp' => $entry->penerima->npwp,
                    'nik' => $entry->penerima->nik,
                    'peran' => $entry->penerima->peran,
                ] : null,
                'konfigurasi_pajak' => $entry->konfigurasiPajak ? [
                    'id' => $entry->konfigurasiPajak->id,
                    'jenis_pajak' => $entry->konfigurasiPajak->jenis_pajak,
                    'tarif_persen' => (float) $entry->konfigurasiPajak->tarif_persen,
                    'berlaku_sejak' => $entry->konfigurasiPajak->berlaku_sejak,
                ] : null,
                'pembayaran_detail' => $entry->pembayaranDetail ? [
                    'id' => $entry->pembayaranDetail->id,
                    'nomor_bukti' => $entry->pembayaranDetail->nomor_bukti,
                    'tanggal_bayar' => $entry->pembayaranDetail->tanggal_bayar?->toIso8601String(),
                ] : null,
                'ac7' => $ac7Valid,
                'trace' => $trace,
                'related_entries' => $relatedEntries,
                'audit_trail' => $auditTrail,
            ],
        ]);
    }

    /**
     * AC-7 invariant: neto = bruto - PPN - PPh (tanpa selisih).
     */
    private function verifyAc7(LedgerEntry $entry): array
    {
        $bruto = (float) $entry->nominal_bruto;
        $ppn = (float) $entry->potongan_ppn;
        $pph = (float) $entry->potongan_pph;
        $neto = (float) $entry->nominal_neto;
        $calculated = round($bruto - $ppn - $pph, 2);
        $selisih = round($neto - $calculated, 2);

        return [
            'bruto' => $bruto,
            'ppn' => $ppn,
            'pph' => $pph,
            'neto_tersimpan' => $neto,
            'neto_terhitung' => $calculated,
            'selisih' => $selisih,
            'valid' => $selisih === 0.0,
            'rumus' => "neto = bruto − PPN − PPh",
            'persamaan' => sprintf('%.2f = %.2f − %.2f − %.2f', $calculated, $bruto, $ppn, $pph),
        ];
    }

    /**
     * Build human-readable trace untuk satu entry.
     */
    private function buildTrace(LedgerEntry $entry): array
    {
        $detail = $entry->detail ?? [];
        $steps = [];

        switch ($entry->tipe) {
            case LedgerEntry::TIPE_PIUTANG_LUNAS:
                $steps[] = [
                    'urutan' => 1,
                    'kejadian' => 'Invoice lunas (pembayaran Faskes diterima)',
                    'sumber' => 'Invoice #' . ($entry->invoice?->nomor_invoice ?? $entry->invoice_id),
                    'detail' => 'Nominal diterima: Rp ' . number_format($entry->nominal_neto, 0, ',', '.'),
                ];
                break;

            case LedgerEntry::TIPE_AP_HONOR_SURVEIOR:
                $steps[] = [
                    'urutan' => 1,
                    'kejadian' => 'Penugasan survei selesai',
                    'sumber' => 'Penugasan ID: ' . ($detail['penugasan_id'] ?? '—'),
                    'detail' => 'Honor bruto: Rp ' . number_format($entry->nominal_bruto, 0, ',', '.'),
                ];
                $steps[] = [
                    'urutan' => 2,
                    'kejadian' => 'Pajak dihitung otomatis (FR-5.6)',
                    'sumber' => 'HonorCalculator',
                    'detail' => 'PPN: Rp ' . number_format($entry->potongan_ppn, 0, ',', '.')
                        . ' · PPh: Rp ' . number_format($entry->potongan_pph, 0, ',', '.'),
                ];
                $steps[] = [
                    'urutan' => 3,
                    'kejadian' => 'AP Honor Surveior dicatat',
                    'sumber' => 'LedgerService::catatHonorSurveior',
                    'detail' => 'Neto dibayar: Rp ' . number_format($entry->nominal_neto, 0, ',', '.'),
                ];
                break;

            case LedgerEntry::TIPE_AP_HONOR_VERIFIKATOR:
                $steps[] = [
                    'urutan' => 1,
                    'kejadian' => 'Verifikasi Final (FR-5.3)',
                    'sumber' => 'Penugasan ID: ' . ($detail['penugasan_id'] ?? '—'),
                    'detail' => 'Honor bruto: Rp ' . number_format($entry->nominal_bruto, 0, ',', '.'),
                ];
                $steps[] = [
                    'urutan' => 2,
                    'kejadian' => 'Pajak dihitung otomatis (FR-5.6)',
                    'sumber' => 'HonorCalculator',
                    'detail' => 'PPN: Rp ' . number_format($entry->potongan_ppn, 0, ',', '.')
                        . ' · PPh: Rp ' . number_format($entry->potongan_pph, 0, ',', '.'),
                ];
                $steps[] = [
                    'urutan' => 3,
                    'kejadian' => 'Rekomendator menyetujui (FR-5.x)',
                    'sumber' => 'RekomendasiController::setujui',
                    'detail' => 'Memicu pencatatan AP honor 3 peran sekaligus.',
                ];
                $steps[] = [
                    'urutan' => 4,
                    'kejadian' => 'AP Honor Verifikator dicatat',
                    'sumber' => 'LedgerService::triggerHonorSetelahRekomendasi',
                    'detail' => 'Neto dibayar: Rp ' . number_format($entry->nominal_neto, 0, ',', '.'),
                ];
                break;

            case LedgerEntry::TIPE_AP_HONOR_REKOMENDATOR:
                $steps[] = [
                    'urutan' => 1,
                    'kejadian' => 'Rekomendator menyetujui laporan verifikasi',
                    'sumber' => 'Penugasan ID: ' . ($detail['penugasan_id'] ?? '—'),
                    'detail' => 'Honor bruto: Rp ' . number_format($entry->nominal_bruto, 0, ',', '.'),
                ];
                $steps[] = [
                    'urutan' => 2,
                    'kejadian' => 'Pajak dihitung otomatis (FR-5.6)',
                    'sumber' => 'HonorCalculator',
                    'detail' => 'PPN: Rp ' . number_format($entry->potongan_ppn, 0, ',', '.')
                        . ' · PPh: Rp ' . number_format($entry->potongan_pph, 0, ',', '.'),
                ];
                $steps[] = [
                    'urutan' => 3,
                    'kejadian' => 'AP Honor Rekomendator dicatat',
                    'sumber' => 'LedgerService::triggerHonorSetelahRekomendasi',
                    'detail' => 'Neto dibayar: Rp ' . number_format($entry->nominal_neto, 0, ',', '.'),
                ];
                break;

            case LedgerEntry::TIPE_PENYESUAIAN_PKS:
                $steps[] = [
                    'urutan' => 1,
                    'kejadian' => 'PKS direvisi / dibatalkan setelah Invoice terbit',
                    'sumber' => 'Invoice #' . ($entry->invoice?->nomor_invoice ?? $entry->invoice_id),
                    'detail' => 'Invoice lama ditandai superseded (FR-5.5)',
                ];
                $steps[] = [
                    'urutan' => 2,
                    'kejadian' => 'Ledger Entry penyesuaian dibuat',
                    'sumber' => 'LedgerService::tandaiInvoiceSuperseded',
                    'detail' => 'Reversal: Rp ' . number_format(abs($entry->nominal_neto), 0, ',', '.'),
                ];
                break;

            case LedgerEntry::TIPE_REFUND:
                $steps[] = [
                    'urutan' => 1,
                    'kejadian' => 'Refund disetujui oleh Keuangan',
                    'sumber' => 'Invoice #' . ($entry->invoice?->nomor_invoice ?? $entry->invoice_id),
                    'detail' => 'Jumlah refund: Rp ' . number_format(abs($entry->nominal_neto), 0, ',', '.'),
                ];
                break;
        }

        return $steps;
    }

    private function tipeLabel(string $tipe): string
    {
        return match ($tipe) {
            LedgerEntry::TIPE_PIUTANG_LUNAS => 'Pemasukan (Piutang Lunas)',
            LedgerEntry::TIPE_AP_HONOR_SURVEIOR => 'AP Honor Surveior',
            LedgerEntry::TIPE_AP_HONOR_VERIFIKATOR => 'AP Honor Verifikator',
            LedgerEntry::TIPE_AP_HONOR_REKOMENDATOR => 'AP Honor Rekomendator',
            LedgerEntry::TIPE_PENYESUAIAN_PKS => 'Penyesuaian PKS',
            LedgerEntry::TIPE_REFUND => 'Refund',
            default => $tipe,
        };
    }
}
