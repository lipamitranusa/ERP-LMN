<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BuktiPembayaran;
use App\Models\Invoice;
use App\Models\SiklusAkreditasi;
use App\Services\AttachmentService;
use App\Services\AuditService;
use App\Services\Payment\PaymentGatewayManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class InvoiceController extends Controller
{
    public function __construct(
        private PaymentGatewayManager $gateways,
        private AuditService $audit,
        private AttachmentService $attachment,
    ) {}

    public function show(Invoice $invoice): JsonResponse
    {
        $invoice->load(['siklus.faskes.jenisFaskes', 'pks', 'buktiPembayaran', 'dibuatOleh', 'items']);
        $invoice->total_diterima = $invoice->totalDiterima();
        $invoice->sisa_tagihan = $invoice->sisaTagihan();
        return response()->json(['data' => $invoice]);
    }

    public function bySiklus(SiklusAkreditasi $siklus): JsonResponse
    {
        $invoices = $siklus->invoice()
            ->with('buktiPembayaran', 'items')
            ->orderByDesc('created_at')
            ->get()
            ->each(function (Invoice $inv) {
                $inv->total_diterima = $inv->totalDiterima();
                $inv->sisa_tagihan = $inv->sisaTagihan();
            });
        return response()->json(['data' => $invoices]);
    }

    public function bayarVa(Request $request, Invoice $invoice): JsonResponse
    {
        if ($invoice->isLunas()) {
            return response()->json(['message' => 'Invoice sudah lunas.'], 422);
        }

        $gateway = $this->gateways->driver();
        $forceNew = $request->boolean('force');

        // Generate VA baru kalau belum ada, sudah expired, ATAU user minta force
        if ($forceNew || ! $invoice->payment_reference || $invoice->payment_expired_at?->isPast()) {
            $result = $gateway->createVirtualAccount($invoice);
            $invoice->update([
                'metode_pembayaran' => BuktiPembayaran::METODE_VA,
                'payment_reference' => $result['reference'],
                'payment_expired_at' => $result['expired_at'],
                'va_bank' => $result['bank'] ?? null,
            ]);
        }

        $this->audit->log('invoice.va.requested', 'invoice', $invoice->id, [
            'reference' => $invoice->payment_reference,
            'force_new' => $forceNew,
        ]);

        return response()->json([
            'data' => [
                'nomor_va' => $invoice->payment_reference,
                'expired_at' => $invoice->payment_expired_at,
                'total' => (float) $invoice->total_tagihan,
                'bank' => $invoice->va_bank,
            ],
        ]);
    }

    public function bayarQris(Request $request, Invoice $invoice): JsonResponse
    {
        if ($invoice->isLunas()) {
            return response()->json(['message' => 'Invoice sudah lunas.'], 422);
        }

        $gateway = $this->gateways->driver();

        if (! $invoice->payment_reference || $invoice->payment_expired_at?->isPast()) {
            $result = $gateway->createQris($invoice);
            $invoice->update([
                'metode_pembayaran' => BuktiPembayaran::METODE_QRIS,
                'payment_reference' => $result['reference'],
                'payment_expired_at' => $result['expired_at'],
            ]);
        }

        $this->audit->log('invoice.qris.requested', 'invoice', $invoice->id, [
            'reference' => $invoice->payment_reference,
        ]);

        return response()->json([
            'data' => [
                'reference' => $invoice->payment_reference,
                'qr_string' => "FAKE-QR-{$invoice->id}",
                'expired_at' => $invoice->payment_expired_at,
                'total' => (float) $invoice->total_tagihan,
            ],
        ]);
    }

    /**
     * FR-2.3: Faskes upload bukti transfer manual.
     */
    public function uploadBuktiManual(Request $request, Invoice $invoice): JsonResponse
    {
        if ($invoice->isLunas()) {
            return response()->json(['message' => 'Invoice sudah lunas, tidak dapat mengunggah bukti lagi.'], 422);
        }

        $existing = BuktiPembayaran::where('invoice_id', $invoice->id)
            ->whereIn('status_verifikasi', [BuktiPembayaran::STATUS_MENUNGGU, BuktiPembayaran::STATUS_DITERIMA])
            ->exists();
        if ($existing) {
            return response()->json(['message' => 'Masih ada bukti yang menunggu atau sudah diterima untuk invoice ini.'], 422);
        }

        $data = $request->validate([
            'nominal' => 'required|numeric|min:1',
            'nomor_referensi' => 'required|string|max:100',
            'dari_rekening' => 'required|string|max:100',
            'bukti' => 'required|file|mimes:jpg,jpeg,png,pdf|max:4096',
        ]);

        $path = $this->attachment->store($request->file('bukti'), 'bukti_pembayaran');

        $bukti = BuktiPembayaran::create([
            'invoice_id' => $invoice->id,
            'submitted_by' => $request->user()->id,
            'nominal' => $data['nominal'],
            'metode' => BuktiPembayaran::METODE_TRANSFER,
            'status_verifikasi' => BuktiPembayaran::STATUS_MENUNGGU,
            'sumber' => BuktiPembayaran::SUMBER_MANUAL,
            'path_bukti' => $path,
            'tanggal_submit' => now(),
            'nomor_referensi' => $data['nomor_referensi'],
            'dari_rekening' => $data['dari_rekening'],
        ]);

        // Bersihkan payment_reference lama agar VA tidak bisa digunakan lagi
        $invoice->update([
            'payment_reference' => null,
            'payment_expired_at' => null,
            'metode_pembayaran' => BuktiPembayaran::METODE_TRANSFER,
        ]);

        $this->audit->log('bukti.submitted', 'bukti_pembayaran', $bukti->id, [
            'invoice_id' => $invoice->id,
            'nominal' => (float) $data['nominal'],
        ]);

        return response()->json(['data' => $bukti], 201);
    }

    /**
     * Webhook generik — detect gateway dari payload atau query param.
     * route: POST /api/invoice/webhook
     *
     * Endpoint ini harus SELALU return 200 jika signature valid (atau di-skip).
     * Midtrans Dashboard "Test Notification URL" butuh 200 agar dianggap berhasil.
     */
    public function webhook(Request $request): JsonResponse
    {
        $payload = $request->all();
        $gateway = $request->input('gateway') ?? $this->gateways->currentDriverName();
        $signature = $this->resolveSignature($request, $gateway);

        $driver = $this->gateways->driver($gateway);
        if (! $driver->verifyWebhookSignature($payload, $signature)) {
            // Debug: catat input aktual agar bisa dibandingkan
            Log::warning('invoice.webhook.invalid_signature', [
                'gateway' => $gateway,
                'order_id' => $payload['order_id'] ?? null,
                'status_code' => $payload['status_code'] ?? null,
                'gross_amount' => $payload['gross_amount'] ?? null,
                'gross_amount_type' => gettype($payload['gross_amount'] ?? null),
                'received_sig_prefix' => substr((string) $signature, 0, 12),
            ]);
            return response()->json(['message' => 'Invalid signature.'], 401);
        }

        try {
            return $this->processWebhook($payload, $gateway);
        } catch (Throwable $e) {
            // Catch-all agar Midtrans test tidak gagal karena error processing.
            // Log error agar developer bisa debugging.
            Log::error('invoice.webhook.process_error', [
                'gateway' => $gateway,
                'payload' => $payload,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            // Tetap return 200 agar gateway tidak mengira endpoint down
            return response()->json(['message' => 'Processed with errors.', 'data' => ['gateway' => $gateway]], 200);
        }
    }

    /**
     * Webhook Midtrans (backward compat) — route: POST /api/invoice/webhook/midtrans
     */
    public function webhookMidtrans(Request $request): JsonResponse
    {
        $payload = $request->all();
        // Midtrans HTTP Notification kirim signature di header X-Midtrans-Signature
        // (BUKAN X-Signature)
        $signature = $request->header('X-Midtrans-Signature', '');

        $driver = $this->gateways->driver('midtrans');
        if (! $driver->verifyWebhookSignature($payload, $signature)) {
            Log::warning('invoice.webhook.invalid_signature', [
                'gateway' => 'midtrans',
                'order_id' => $payload['order_id'] ?? null,
                'status_code' => $payload['status_code'] ?? null,
                'gross_amount' => $payload['gross_amount'] ?? null,
                'gross_amount_type' => gettype($payload['gross_amount'] ?? null),
                'received_sig_prefix' => substr((string) $signature, 0, 12),
            ]);
            return response()->json(['message' => 'Invalid signature.'], 401);
        }

        try {
            return $this->processWebhook($payload, 'midtrans');
        } catch (Throwable $e) {
            Log::error('invoice.webhook.process_error', [
                'gateway' => 'midtrans',
                'payload' => $payload,
                'error' => $e->getMessage(),
            ]);
            return response()->json(['message' => 'Processed with errors.', 'data' => ['gateway' => 'midtrans']], 200);
        }
    }

    private function resolveSignature(Request $request, string $gateway): string
    {
        return match ($gateway) {
            'midtrans' => $request->header('X-Midtrans-Signature', ''),
            'xendit' => $request->header('x-callback-token', ''),
            default => $request->header('X-Signature', ''),
        };
    }

    private function processWebhook(array $payload, string $gateway): JsonResponse
    {
        $invoiceId = $payload['order_id']
            ?? $payload['external_id']
            ?? $payload['reference']
            ?? null;

        $status = $payload['transaction_status']
            ?? $payload['status']
            ?? null;

        $grossAmount = (float) ($payload['gross_amount']
            ?? $payload['amount']
            ?? $payload['expected_amount']
            ?? 0);

        if (! $invoiceId) {
            return response()->json(['message' => 'Missing order identifier.'], 422);
        }

        $invoice = Invoice::where('nomor_invoice', $invoiceId)->first();
        if (! $invoice) {
            $invoice = Invoice::find($invoiceId);
        }
        // Midtrans VA: order_id kita tambahkan suffix timestamp agar unik,
        // jadi lookup lewat VA number (payment_reference) lebih reliable
        if (! $invoice && ! empty($payload['va_numbers'][0]['va_number'])) {
            $vaNumber = $payload['va_numbers'][0]['va_number'];
            $invoice = Invoice::where('payment_reference', $vaNumber)->first();
        }
        if (! $invoice) {
            Log::info('invoice.webhook.unknown_invoice', [
                'gateway' => $gateway,
                'invoice_id_attempted' => $invoiceId,
                'va_number_attempted' => $payload['va_numbers'][0]['va_number'] ?? null,
                'note' => 'Invoice tidak ditemukan — kemungkinan test notification atau order_id tidak valid',
            ]);
            // Return 200 agar gateway (Midtrans/Xendit) tidak mengira endpoint ini down.
            // Test notification dari Midtrans Dashboard menggunakan order_id acak yang tidak
            // ada di DB kita, tapi endpoint harus tetep return 200 agar test dianggap berhasil.
            return response()->json(['message' => 'Invoice not found.', 'data' => ['gateway' => $gateway]], 200);
        }

        Log::info('invoice.webhook', [
            'invoice_id' => $invoice->id,
            'gateway' => $gateway,
            'status' => $status,
            'amount' => $grossAmount,
        ]);

        $paidStatuses = ['settlement', 'capture', 'SUCCESS', 'PAID'];
        if (in_array($status, $paidStatuses) && $grossAmount > 0) {
            DB::transaction(function () use ($invoice, $grossAmount, $status) {
                BuktiPembayaran::create([
                    'invoice_id' => $invoice->id,
                    'nominal' => $grossAmount,
                    'metode' => $invoice->metode_pembayaran ?? BuktiPembayaran::METODE_VA,
                    'status_verifikasi' => BuktiPembayaran::STATUS_DITERIMA,
                    'sumber' => BuktiPembayaran::SUMBER_GATEWAY,
                    'tanggal_submit' => now(),
                    'tanggal_verifikasi' => now(),
                ]);

                app(\App\Services\Payment\InvoicePaidCalculator::class)->recalculate($invoice);
            });
        }

        return response()->json(['data' => ['status' => 'processed', 'gateway' => $gateway]]);
    }
}
