<?php

namespace App\Services\Payment;

use App\Models\Invoice;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * In-memory gateway for development & testing. No external HTTP calls.
 *
 * createVirtualAccount / createQris succeed immediately with synthetic
 * references. The webhooks that mark paid are simulated by a separate
 * test helper (PaymentWebhookTest), not by this class.
 */
class FakeGateway implements PaymentGatewayInterface
{
    public function createVirtualAccount(Invoice $invoice): array
    {
        $reference = 'FAKE-VA-' . strtoupper(Str::random(10));
        $expiredAt = now()->addHours(24);

        Log::debug('fake.va.created', [
            'invoice_id' => $invoice->id,
            'reference' => $reference,
        ]);

        return [
            'reference' => $reference,
            'expired_at' => $expiredAt,
        ];
    }

    public function createQris(Invoice $invoice): array
    {
        $reference = 'FAKE-QRIS-' . strtoupper(Str::random(10));
        $qrString = 'FAKE-QR-' . $invoice->id;
        $expiredAt = now()->addMinutes(30);

        Log::debug('fake.qris.created', [
            'invoice_id' => $invoice->id,
            'reference' => $reference,
        ]);

        return [
            'reference' => $reference,
            'qr_string' => $qrString,
            'expired_at' => $expiredAt,
        ];
    }

    public function checkStatus(Invoice $invoice): string
    {
        if ($invoice->isLunas()) {
            return 'paid';
        }
        if (! $invoice->payment_reference) {
            return 'pending';
        }
        if ($invoice->payment_expired_at && $invoice->payment_expired_at->isPast()) {
            return 'expired';
        }
        return 'pending';
    }

    public function fetchStatus(Invoice $invoice): ?array
    {
        return null;
    }

    public function verifyWebhookSignature(array $payload, string $signature): bool
    {
        return $signature === 'fake-signature-' . ($payload['order_id'] ?? '');
    }

    public function refund(Invoice $invoice, float $amount): array
    {
        $refundId = 'FAKE-RF-' . strtoupper(Str::random(8));
        Log::debug('fake.refund', ['invoice_id' => $invoice->id, 'amount' => $amount, 'refund_id' => $refundId]);
        return ['refund_id' => $refundId, 'status' => 'processed'];
    }

    public function name(): string
    {
        return 'fake';
    }
}
