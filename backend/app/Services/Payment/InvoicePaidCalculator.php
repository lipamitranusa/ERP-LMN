<?php

namespace App\Services\Payment;

use App\Models\BuktiPembayaran;
use App\Models\Invoice;
use App\Models\LedgerEntry;
use App\Services\AuditService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * FR-2.5: Invoice marked Paid only when accumulated accepted payments
 * reach full total_tagihan. AC-5: partial payment MUST NOT mark Paid.
 *
 * Called every time a BuktiPembayaran transitions to "diterima".
 */
class InvoicePaidCalculator
{
    public function __construct(private AuditService $audit) {}

    /**
     * Recalculate the invoice status and create a Ledger Entry if it
     * just became fully paid. Returns the resulting status.
     */
    public function recalculate(Invoice $invoice): string
    {
        return DB::transaction(function () use ($invoice) {
            $invoice->refresh();
            $totalDiterima = $invoice->totalDiterima();
            $totalTagihan = (float) $invoice->total_tagihan;

            $previousStatus = $invoice->status;

            if ($totalDiterima >= $totalTagihan && $totalTagihan > 0) {
                $invoice->status = Invoice::STATUS_LUNAS;
                $invoice->tanggal_lunas = $invoice->tanggal_lunas ?? now();
            } elseif ($totalDiterima > 0) {
                $invoice->status = Invoice::STATUS_SEBAGIAN;
            } else {
                $invoice->status = Invoice::STATUS_BELUM_BAYAR;
            }

            $invoice->save();

            if ($invoice->status === Invoice::STATUS_LUNAS && $previousStatus !== Invoice::STATUS_LUNAS) {
                $this->createPiutangLunasEntry($invoice, $totalDiterima);
                $this->audit->log('invoice.paid', 'invoice', $invoice->id, [
                    'nomor_invoice' => $invoice->nomor_invoice,
                    'total_tagihan' => $totalTagihan,
                    'total_diterima' => $totalDiterima,
                ]);
                Log::info('invoice.lunas', ['invoice_id' => $invoice->id]);

                // Promote siklus ke tahap 5 (Survei) — invoice lunas artinya siap untuk
                // diterbitkan surat tugas survei.
                $siklus = $invoice->siklus;
                if ($siklus && (int) $siklus->tahapan < 5) {
                    $siklus->forceFill([
                        'tahapan' => 5,
                        'status' => 'aktif',
                    ])->save();
                    Log::info('siklus.promoted', [
                        'siklus_id' => $siklus->id,
                        'from_tahapan' => 4,
                        'to_tahapan' => 5,
                        'reason' => 'invoice_lunas',
                    ]);
                }
            }

            return $invoice->status;
        });
    }

    private function createPiutangLunasEntry(Invoice $invoice, float $amount): LedgerEntry
    {
        return LedgerEntry::create([
            'siklus_id' => $invoice->siklus_id,
            'invoice_id' => $invoice->id,
            'tipe' => LedgerEntry::TIPE_PIUTANG_LUNAS,
            'nominal_bruto' => $amount,
            'potongan_ppn' => 0,
            'potongan_pph' => 0,
            'nominal_neto' => $amount,
            'created_at' => now(),
        ]);
    }
}
