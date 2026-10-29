<?php

namespace App\Services\Payment;

use App\Models\Invoice;

interface PaymentGatewayInterface
{
    /**
     * Create a virtual account for the invoice. Returns a reference
     * (VA number) that the Faskes can pay at any bank.
     *
     * @return array{reference: string, expired_at: \DateTimeInterface}
     */
    public function createVirtualAccount(Invoice $invoice): array;

    /**
     * Create a QRIS charge for the invoice. Returns a reference
     * (QR string or transaction id) and expiry.
     *
     * @return array{reference: string, qr_string: string, expired_at: \DateTimeInterface}
     */
    public function createQris(Invoice $invoice): array;

    /**
     * Check the current payment status from the gateway.
     * Returns one of: pending, paid, expired, failed.
     */
    public function checkStatus(Invoice $invoice): string;

    /**
     * Ambil payload status mentah dari gateway (null bila gateway tidak mendukung).
     * Dipakai sebagai fallback saat webhook tidak sampai.
     */
    public function fetchStatus(Invoice $invoice): ?array;

    /**
     * Verify the webhook signature.
     */
    public function verifyWebhookSignature(array $payload, string $signature): bool;

    /**
     * Refund a paid transaction.
     */
    public function refund(Invoice $invoice, float $amount): array;

    /**
     * Driver name (used in logs & config).
     */
    public function name(): string;
}
