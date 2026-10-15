<?php

namespace App\Services\Payment;

use App\Models\Invoice;
use App\Models\PaymentSetting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class XenditDriver implements PaymentGatewayInterface
{
    private function apiKey(): string
    {
        return PaymentSetting::value('api_key') ?? '';
    }

    private function channelCode(): string
    {
        return PaymentSetting::value('channel_code') ?? 'BCA';
    }

    private function isProduction(): bool
    {
        return strtolower(PaymentSetting::value('is_production') ?? '0') === '1';
    }

    private function baseUrl(): string
    {
        return 'https://api.xendit.co';
    }

    private function authHeaders(): array
    {
        return [
            'Authorization' => 'Basic ' . base64_encode($this->apiKey() . ':'),
            'Content-Type' => 'application/json',
        ];
    }

    public function createVirtualAccount(Invoice $invoice): array
    {
        $dueDays = PaymentSetting::intValue('due_days', 24);
        $expiredAt = now()->addHours($dueDays)->toIso8601String();

        $payload = [
            'external_id' => $invoice->nomor_invoice,
            'bank_code' => $this->channelCode(),
            'name' => $invoice->siklus?->faskes?->nama ?? 'Faskes',
            'expected_amount' => (int) $invoice->total_tagihan,
            'expiration_date' => $expiredAt,
            'is_single_use' => true,
        ];

        try {
            $response = Http::withHeaders($this->authHeaders())
                ->post("{$this->baseUrl()}/callback_virtual_accounts", $payload);

            $body = $response->json();

            Log::info('xendit.va.create', [
                'invoice_id' => $invoice->id,
                'nomor_invoice' => $invoice->nomor_invoice,
                'status' => $response->status(),
                'response' => $body,
            ]);

            if (! $response->successful()) {
                Log::error('xendit.va.create.failed', ['body' => $body]);
                throw new \RuntimeException($body['message'] ?? 'Xendit VA creation failed');
            }

            return [
                'reference' => $body['account_number'],
                'expired_at' => \Carbon\Carbon::parse($body['expiration_date']),
            ];
        } catch (\Exception $e) {
            Log::error('xendit.va.error', ['msg' => $e->getMessage()]);
            throw $e;
        }
    }

    public function createQris(Invoice $invoice): array
    {
        $dueMinutes = 30;
        $expiredAt = now()->addMinutes($dueMinutes)->toIso8601String();

        $payload = [
            'external_id' => 'QR-' . $invoice->nomor_invoice,
            'type' => 'DYNAMIC',
            'callback_url' => route('invoice.webhook.xendit'),
            'amount' => (int) $invoice->total_tagihan,
            'expires_at' => $expiredAt,
        ];

        try {
            $response = Http::withHeaders($this->authHeaders())
                ->post("{$this->baseUrl()}/qr_codes", $payload);

            $body = $response->json();

            Log::info('xendit.qris.create', [
                'invoice_id' => $invoice->id,
                'nomor_invoice' => $invoice->nomor_invoice,
                'status' => $response->status(),
            ]);

            if (! $response->successful()) {
                throw new \RuntimeException($body['message'] ?? 'Xendit QR creation failed');
            }

            return [
                'reference' => $body['id'],
                'qr_string' => $body['qr_string'] ?? '',
                'expires_at' => \Carbon\Carbon::parse($body['expires_at']),
            ];
        } catch (\Exception $e) {
            Log::error('xendit.qris.error', ['msg' => $e->getMessage()]);
            throw $e;
        }
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

    public function verifyWebhookSignature(array $payload, string $signature): bool
    {
        $token = PaymentSetting::value('callback_token');
        if (! $token) {
            return false;
        }
        return hash_equals($token, $signature);
    }

    public function refund(Invoice $invoice, float $amount): array
    {
        $refundId = 'XND-' . strtoupper(Str::random(12));

        Log::info('xendit.refund', [
            'invoice_id' => $invoice->id,
            'amount' => $amount,
            'refund_id' => $refundId,
        ]);

        return [
            'refund_id' => $refundId,
            'status' => 'processed',
        ];
    }

    public function name(): string
    {
        return 'xendit';
    }
}
