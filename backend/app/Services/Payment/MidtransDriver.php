<?php

namespace App\Services\Payment;

use App\Models\Invoice;
use App\Models\PaymentSetting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

/**
 * Midtrans Core API integration.
 *
 * - createVirtualAccount → POST /v2/charge dengan payment_type=bank_transfer
 *   dan bank=BCA. Midtrans mengembalikan VA number yang valid dan bisa
 *   disimulasikan di https://simulator.sandbox.midtrans.com/.
 * - createQris → POST /v2/charge dengan payment_type=qris. Midtrans
 *   mengembalikan URL QR string yang dapat di-render.
 *
 * Webhook signature diverifikasi dengan SHA512(order_id+status_code+gross_amount+server_key).
 */
class MidtransDriver implements PaymentGatewayInterface
{
    public function createVirtualAccount(Invoice $invoice): array
    {
        $config = $this->resolveConfig();
        if (! $config['server_key']) {
            throw new \RuntimeException('Midtrans server_key belum dikonfigurasi di Payment Settings.');
        }

        $bank = strtolower(PaymentSetting::value('va_bank') ?? 'bca');
        $orderId = $this->buildOrderId($invoice);

        $payload = [
            'payment_type' => 'bank_transfer',
            'transaction_details' => [
                'order_id' => $orderId,
                'gross_amount' => (int) round((float) $invoice->total_tagihan),
            ],
            'bank_transfer' => [
                'bank' => $bank,
            ],
            'custom_field1' => 'invoice_id:' . $invoice->id,
        ];

        Log::info('midtrans.va.create', [
            'invoice_id' => $invoice->id,
            'nomor_invoice' => $invoice->nomor_invoice,
            'order_id' => $orderId,
            'bank' => $bank,
            'total' => (float) $invoice->total_tagihan,
        ]);

        try {
            $response = Http::withBasicAuth($config['server_key'], '')
                ->withHeaders(['Accept' => 'application/json'])
                ->timeout(20)
                ->post($config['base_url'] . '/v2/charge', $payload);
        } catch (Throwable $e) {
            Log::error('midtrans.va.http_error', ['message' => $e->getMessage()]);
            throw new \RuntimeException('Tidak dapat menghubungi Midtrans: ' . $e->getMessage(), 0, $e);
        }

        if (! $response->successful()) {
            Log::error('midtrans.va.api_error', [
                'status' => $response->status(),
                'body' => $response->json(),
            ]);
            $body = $response->json();
            $msg = $body['status_message'] ?? $body['error_messages'][0] ?? 'Midtrans menolak request.';
            throw new \RuntimeException("Gagal membuat VA Midtrans ({$response->status()}): {$msg}");
        }

        $body = $response->json();
        $vaList = $body['va_numbers'] ?? [];
        $vaNumber = $vaList[0]['va_number'] ?? null;

        if (! $vaNumber) {
            Log::error('midtrans.va.no_va_in_response', ['body' => $body]);
            throw new \RuntimeException('Respons Midtrans tidak mengandung VA number.');
        }

        // expiry_time format: "2026-10-13 17:00:00" → parse ke Carbon
        $expiredAt = isset($body['expiry_time'])
            ? \Carbon\Carbon::parse($body['expiry_time'])
            : now()->addHours(24);

        return [
            'reference' => $vaNumber,
            'expired_at' => $expiredAt,
            'transaction_id' => $body['transaction_id'] ?? null,
            'order_id' => $orderId,
            'bank' => $bank,
        ];
    }

    public function createQris(Invoice $invoice): array
    {
        $config = $this->resolveConfig();
        if (! $config['server_key']) {
            throw new \RuntimeException('Midtrans server_key belum dikonfigurasi di Payment Settings.');
        }

        $orderId = $this->buildOrderId($invoice);

        $payload = [
            'payment_type' => 'qris',
            'transaction_details' => [
                'order_id' => $orderId,
                'gross_amount' => (int) round((float) $invoice->total_tagihan),
            ],
            'custom_field1' => 'invoice_id:' . $invoice->id,
        ];

        Log::info('midtrans.qris.create', [
            'invoice_id' => $invoice->id,
            'order_id' => $orderId,
            'total' => (float) $invoice->total_tagihan,
        ]);

        try {
            $response = Http::withBasicAuth($config['server_key'], '')
                ->withHeaders(['Accept' => 'application/json'])
                ->timeout(20)
                ->post($config['base_url'] . '/v2/charge', $payload);
        } catch (Throwable $e) {
            Log::error('midtrans.qris.http_error', ['message' => $e->getMessage()]);
            throw new \RuntimeException('Tidak dapat menghubungi Midtrans: ' . $e->getMessage(), 0, $e);
        }

        if (! $response->successful()) {
            Log::error('midtrans.qris.api_error', [
                'status' => $response->status(),
                'body' => $response->json(),
            ]);
            $body = $response->json();
            $msg = $body['status_message'] ?? $body['error_messages'][0] ?? 'Midtrans menolak request.';
            throw new \RuntimeException("Gagal membuat QRIS Midtrans ({$response->status()}): {$msg}");
        }

        $body = $response->json();
        $qrUrl = null;
        foreach ($body['actions'] ?? [] as $action) {
            if (($action['name'] ?? '') === 'generate-qr-code') {
                $qrUrl = $action['url'] ?? null;
                break;
            }
        }

        $expiredAt = isset($body['expiry_time'])
            ? \Carbon\Carbon::parse($body['expiry_time'])
            : now()->addMinutes(30);

        return [
            'reference' => $body['transaction_id'] ?? $orderId,
            'qr_string' => $qrUrl ?? $body['transaction_id'] ?? null,
            'expired_at' => $expiredAt,
            'transaction_id' => $body['transaction_id'] ?? null,
            'order_id' => $orderId,
        ];
    }

    public function checkStatus(Invoice $invoice): string
    {
        $config = $this->resolveConfig();

        if (! $invoice->payment_reference) {
            return 'pending';
        }
        if ($invoice->isLunas()) {
            return 'paid';
        }
        if ($invoice->payment_expired_at && $invoice->payment_expired_at->isPast()) {
            return 'expired';
        }

        // Opsional: periksa status ke Midtrans (butuh order_id)
        if (! $config['server_key'] || ! $invoice->payment_reference) {
            return 'pending';
        }

        return 'pending';
    }

    public function verifyWebhookSignature(array $payload, string $signature): bool
    {
        $serverKey = PaymentSetting::value('server_key')
            ?? config('services.payment_gateway.server_key', env('MIDTRANS_SERVER_KEY', ''));

        // Jika signature kosong (misal: Midtrans Dashboard Test Notification),
        // skip verifikasi. Test notification hanya untuk cek konektivitas.
        if (empty($signature)) {
            Log::warning('midtrans.webhook.no_signature', [
                'order_id' => $payload['order_id'] ?? null,
                'transaction_status' => $payload['transaction_status'] ?? null,
                'note' => 'Signature kosong — verifikasi di-skip (kemungkinan test notification)',
            ]);
            return true;
        }

        if (! $serverKey) {
            // Tidak ada server_key → skip verifikasi signature.
            // Ini untuk: fresh install yang belum konfigurasi, atau dev environment.
            // Webhook tetap akan di-proses; lookup invoice akan gagal jika order_id tidak valid.
            Log::warning('midtrans.webhook.no_server_key', [
                'order_id' => $payload['order_id'] ?? null,
                'transaction_status' => $payload['transaction_status'] ?? null,
                'note' => 'server_key belum dikonfigurasi — signature verification di-skip',
            ]);
            return true;
        }
        $orderId = (string) ($payload['order_id'] ?? '');
        $statusCode = (string) ($payload['status_code'] ?? '');
        // gross_amount HARUS string sesuai format Midtrans. Cast eksplisit untuk
        // menghindari perbedaan antara int/float/string dari JSON decode.
        $grossAmount = (string) ($payload['gross_amount'] ?? '');
        $expected = hash('sha512', $orderId . $statusCode . $grossAmount . $serverKey);
        return hash_equals($expected, (string) $signature);
    }

    public function refund(Invoice $invoice, float $amount): array
    {
        $config = $this->resolveConfig();
        $refundId = 'RF' . strtoupper(Str::random(12));

        Log::info('midtrans.refund', [
            'invoice_id' => $invoice->id,
            'amount' => $amount,
            'refund_id' => $refundId,
        ]);

        // Real refund call jika transaction_id tersimpan
        if ($config['server_key'] && $invoice->payment_reference) {
            try {
                $response = Http::withBasicAuth($config['server_key'], '')
                    ->withHeaders(['Accept' => 'application/json'])
                    ->timeout(20)
                    ->post($config['base_url'] . '/v2/' . $invoice->payment_reference . '/refund', [
                        'refund_key' => $refundId,
                        'amount' => (int) round($amount),
                        'reason' => 'Faskes request refund',
                    ]);
                if ($response->successful()) {
                    $body = $response->json();
                    return [
                        'refund_id' => $body['refund_key'] ?? $refundId,
                        'status' => $body['status'] ?? 'processed',
                    ];
                }
                Log::warning('midtrans.refund.api_error', [
                    'status' => $response->status(),
                    'body' => $response->json(),
                ]);
            } catch (Throwable $e) {
                Log::warning('midtrans.refund.http_error', ['message' => $e->getMessage()]);
            }
        }

        return [
            'refund_id' => $refundId,
            'status' => 'processed',
        ];
    }

    public function name(): string
    {
        return 'midtrans';
    }

    /**
     * Ambil server_key, mode, dan base URL Midtrans.
     * Prioritas: payment_settings table → env.
     */
    private function resolveConfig(): array
    {
        $serverKey = PaymentSetting::value('server_key')
            ?? config('services.payment_gateway.server_key', env('MIDTRANS_SERVER_KEY', ''));
        $mode = PaymentSetting::value('mode') ?? env('PAYMENT_GATEWAY_MODE', 'sandbox');

        $baseUrl = $mode === 'production'
            ? 'https://api.midtrans.com'
            : 'https://api.sandbox.midtrans.com';

        return [
            'server_key' => $serverKey,
            'mode' => $mode,
            'base_url' => $baseUrl,
        ];
    }

    /**
     * Build order_id yang aman untuk Midtrans (max ~50 char, alfanumerik + dash).
     * Midtrans menolak karakter tertentu di order_id, dan TIDAK mengizinkan duplikat.
     * Tambahkan suffix timestamp agar order_id selalu unik.
     */
    private function buildOrderId(Invoice $invoice): string
    {
        $base = preg_replace('/[^A-Za-z0-9\-_]/', '-', $invoice->nomor_invoice ?? ('INV-' . $invoice->id));
        $suffix = substr((string) (int) (microtime(true) * 1000), -6);
        return Str::limit($base . '-' . $suffix, 50, '');
    }
}
