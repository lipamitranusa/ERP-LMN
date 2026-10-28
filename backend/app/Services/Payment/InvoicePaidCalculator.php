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

                $this->syncSiklusStatus($invoice, Invoice::STATUS_LUNAS);
            } elseif ($invoice->status !== $previousStatus) {
                // Pembayaran mundur (bukti ditolak/dibatalkan) → status siklus
                // kembali ke tahap menunggu pembayaran.
                $this->revertSiklusStatus($invoice);
            }

            return $invoice->status;
        });
    }

    /**
     * Sinkronkan status siklus dengan status pembayaran invoice.
     *
     * - Siklus masih di tahap pembayaran (tahapan < 5) → naik ke tahap 5
     *   (siap survei) dengan status 'aktif'.
     * - Siklus sudah lanjut ke tahap berikutnya tapi status-nya masih
     *   'menunggu_pembayaran' → samakan dengan status invoice ('lunas'),
     *   supaya daftar pendaftaran tidak menampilkan status pembayaran basi.
     */
    private function syncSiklusStatus(Invoice $invoice, string $statusInvoice): void
    {
        $siklus = $invoice->relationLoaded('siklus')
            ? $invoice->siklus
            : $invoice->siklus()->withoutGlobalScope('lembaga')->first();

        if (! $siklus) {
            return;
        }

        $update = [];
        if ((int) $siklus->tahapan < 5) {
            $update = ['tahapan' => 5, 'status' => 'aktif'];
        } elseif ($siklus->status === 'menunggu_pembayaran') {
            $update = ['status' => $statusInvoice];
        }

        if (! $update) {
            return;
        }

        $siklus->forceFill($update)->save();
        Log::info('siklus.promoted', [
            'siklus_id' => $siklus->id,
            'from_tahapan' => $siklus->getOriginal('tahapan'),
            'to_tahapan' => $siklus->tahapan,
            'status' => $siklus->status,
            'reason' => 'invoice_' . $statusInvoice,
        ]);
    }

    private function revertSiklusStatus(Invoice $invoice): void
    {
        $siklus = $invoice->relationLoaded('siklus')
            ? $invoice->siklus
            : $invoice->siklus()->withoutGlobalScope('lembaga')->first();

        if (! $siklus || $siklus->status !== 'lunas') {
            return;
        }

        $siklus->forceFill(['status' => 'menunggu_pembayaran'])->save();
        Log::info('siklus.status_reverted', [
            'siklus_id' => $siklus->id,
            'invoice_id' => $invoice->id,
            'reason' => 'invoice_not_lunas',
        ]);
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
