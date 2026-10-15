<?php

namespace App\Services\Refund;

use App\Models\LedgerEntry;
use App\Models\RefundRequest;
use App\Services\AuditService;
use App\Services\Payment\PaymentGatewayManager;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RefundApprovalService
{
    public function __construct(
        private AuditService $audit,
        private PaymentGatewayManager $gateways,
    ) {}

    public function approve(RefundRequest $refund, string $approverId, ?string $catatan = null): RefundRequest
    {
        if ($refund->status !== RefundRequest::STATUS_REQUESTED) {
            throw new \DomainException("Refund tidak dalam status requested (saat ini: {$refund->status}).");
        }

        return DB::transaction(function () use ($refund, $approverId, $catatan) {
            $refund->update([
                'status' => RefundRequest::STATUS_APPROVED,
                'approved_by' => $approverId,
                'tanggal_approved' => now(),
                'catatan_approval' => $catatan,
            ]);

            $this->audit->log('refund.approved', 'refund_request', $refund->id, [
                'nominal' => (float) $refund->nominal,
                'invoice_id' => $refund->invoice_id,
            ]);

            return $refund->fresh();
        });
    }

    public function reject(RefundRequest $refund, string $approverId, string $alasan): RefundRequest
    {
        if ($refund->status !== RefundRequest::STATUS_REQUESTED) {
            throw new \DomainException("Refund tidak dalam status requested (saat ini: {$refund->status}).");
        }

        return DB::transaction(function () use ($refund, $approverId, $alasan) {
            $refund->update([
                'status' => RefundRequest::STATUS_REJECTED,
                'approved_by' => $approverId,
                'tanggal_approved' => now(),
                'catatan_approval' => $alasan,
            ]);

            $this->audit->log('refund.rejected', 'refund_request', $refund->id, [
                'alasan' => $alasan,
            ]);

            return $refund->fresh();
        });
    }

    public function execute(RefundRequest $refund): RefundRequest
    {
        if ($refund->status !== RefundRequest::STATUS_APPROVED) {
            throw new \DomainException("Refund belum disetujui (saat ini: {$refund->status}).");
        }

        $invoice = $refund->invoice;
        $gateway = $this->gateways->driver();
        $result = $gateway->refund($invoice, (float) $refund->nominal);

        return DB::transaction(function () use ($refund, $invoice, $result) {
            $ledgerEntry = LedgerEntry::create([
                'siklus_id' => $invoice->siklus_id,
                'invoice_id' => $invoice->id,
                'tipe' => LedgerEntry::TIPE_REFUND,
                'nominal_bruto' => (float) $refund->nominal,
                'potongan_ppn' => 0,
                'potongan_pph' => 0,
                'nominal_neto' => -(float) $refund->nominal,
                'created_at' => now(),
            ]);

            $refund->update([
                'status' => RefundRequest::STATUS_EXECUTED,
                'ledger_entry_id' => $ledgerEntry->id,
            ]);

            $this->audit->log('refund.executed', 'refund_request', $refund->id, [
                'refund_id' => $result['refund_id'] ?? null,
                'nominal' => (float) $refund->nominal,
                'ledger_entry_id' => $ledgerEntry->id,
            ]);

            Log::info('refund.executed', [
                'refund_id' => $refund->id,
                'invoice_id' => $invoice->id,
                'amount' => (float) $refund->nominal,
            ]);

            return $refund->fresh();
        });
    }
}
