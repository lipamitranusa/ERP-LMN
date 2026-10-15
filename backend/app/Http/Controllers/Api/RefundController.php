<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\RefundRequest;
use App\Services\AuditService;
use App\Services\Refund\RefundApprovalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RefundController extends Controller
{
    public function __construct(
        private RefundApprovalService $service,
        private AuditService $audit,
    ) {}

    public function store(Request $request, Invoice $invoice): JsonResponse
    {
        $data = $request->validate([
            'nominal' => 'required|numeric|min:1',
            'alasan' => 'required|string|min:10',
        ]);

        if ((float) $data['nominal'] > (float) $invoice->total_tagihan) {
            return response()->json([
                'message' => 'Nominal refund melebihi total tagihan invoice.',
            ], 422);
        }

        $refund = RefundRequest::create([
            'invoice_id' => $invoice->id,
            'requested_by' => $request->user()->id,
            'alasan' => $data['alasan'],
            'nominal' => $data['nominal'],
            'status' => RefundRequest::STATUS_REQUESTED,
        ]);

        $this->audit->log('refund.requested', 'refund_request', $refund->id, [
            'invoice_id' => $invoice->id,
            'nominal' => (float) $refund->nominal,
        ]);

        return response()->json(['data' => $refund], 201);
    }

    public function pending(): JsonResponse
    {
        $refunds = RefundRequest::whereIn('status', [
            RefundRequest::STATUS_REQUESTED,
            RefundRequest::STATUS_APPROVED,
        ])
            ->with(['invoice.siklus.faskes', 'requester', 'approver'])
            ->orderBy('created_at')
            ->get();

        return response()->json(['data' => $refunds]);
    }

    public function approve(Request $request, RefundRequest $refund): JsonResponse
    {
        $data = $request->validate([
            'catatan' => 'nullable|string|max:1000',
        ]);

        $result = $this->service->approve($refund, $request->user()->id, $data['catatan'] ?? null);
        return response()->json(['data' => $result]);
    }

    public function reject(Request $request, RefundRequest $refund): JsonResponse
    {
        $data = $request->validate([
            'alasan' => 'required|string|min:5',
        ]);

        $result = $this->service->reject($refund, $request->user()->id, $data['alasan']);
        return response()->json(['data' => $result]);
    }

    public function execute(RefundRequest $refund): JsonResponse
    {
        $result = $this->service->execute($refund);
        return response()->json(['data' => $result]);
    }
}
