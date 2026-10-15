<?php

namespace Tests\Feature;

use App\Models\AkunPengguna;
use App\Models\BuktiPembayaran;
use App\Models\Invoice;
use App\Models\Lembaga;
use App\Models\LedgerEntry;
use App\Models\PaymentSetting;
use App\Models\Pks;
use App\Models\SiklusAkreditasi;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class PaymentWebhookTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        // Set Midtrans server_key agar signature verification aktif di test
        PaymentSetting::updateOrCreate(
            ['kategori' => 'midtrans', 'kunci' => 'server_key'],
            ['nilai' => 'test-server-key-for-unit-tests', 'label' => 'Server Key', 'tipe' => 'password', 'options' => null]
        );
        PaymentSetting::updateOrCreate(
            ['kategori' => 'gateway', 'kunci' => 'enabled'],
            ['nilai' => '1', 'label' => 'Payment Gateway Aktif', 'tipe' => 'boolean', 'options' => null]
        );
        PaymentSetting::updateOrCreate(
            ['kategori' => 'gateway', 'kunci' => 'driver'],
            ['nilai' => 'midtrans', 'label' => 'Gateway Pembayaran', 'tipe' => 'select', 'options' => null]
        );
    }

    private function createInvoiceWithVa(): Invoice
    {
        $lembaga = Lembaga::first();
        $faskes = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->first()->faskes;
        $siklus = SiklusAkreditasi::create([
            'id' => (string) Str::uuid(),
            'faskes_id' => $faskes->id,
            'lembaga_id' => $lembaga->id,
            'tanggal_pengajuan' => now()->toDateString(),
            'status' => 'menunggu_dokumen',
            'status_kelengkapan' => 'lengkap',
            'created_at' => now(),
        ]);
        $pks = Pks::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'nomor_pks' => 'PKS/TEST/VA',
            'status' => Pks::STATUS_DISETUJUI,
            'tanggal_disetujui' => now()->toDateString(),
        ]);

        return Invoice::create([
            'id' => (string) Str::uuid(),
            'pks_id' => $pks->id,
            'siklus_id' => $siklus->id,
            'nomor_invoice' => 'INV/WEBHOOK/' . strtoupper(Str::random(4)),
            'dibuat_oleh' => AkunPengguna::where('email', 'admin@erp.local')->first()->id,
            'total_tagihan' => 5_000_000,
            'status' => Invoice::STATUS_BELUM_BAYAR,
            'metode_pembayaran' => BuktiPembayaran::METODE_VA,
            'payment_reference' => 'FAKE-VA-1234567890',
            'payment_expired_at' => now()->addHours(24),
            'diterbitkan_pada' => now(),
            'due_date' => now()->addDays(30)->toDateString(),
        ]);
    }

    public function test_va_request_returns_reference(): void
    {
        $invoice = $this->createInvoiceWithVa();
        $user = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->firstOrFail();

        $resp = $this->actingAs($user, 'sanctum')
            ->postJson("/api/invoice/{$invoice->id}/bayar-va");

        $resp->assertOk();
        $this->assertNotEmpty($resp->json('data.nomor_va'));
    }

    public function test_webhook_settlement_marks_invoice_lunas(): void
    {
        $invoice = $this->createInvoiceWithVa();
        $serverKey = 'test-server-key-for-unit-tests';
        $orderId = $invoice->nomor_invoice;
        $statusCode = '200';
        $grossAmount = '5000000.00';
        $signature = hash('sha512', $orderId . $statusCode . $grossAmount . $serverKey);

        $payload = [
            'order_id' => $orderId,
            'status_code' => $statusCode,
            'transaction_status' => 'settlement',
            'gross_amount' => $grossAmount,
        ];

        $resp = $this->postJson('/api/invoice/webhook/midtrans', $payload, [
            'X-Signature' => $signature,
        ]);

        $resp->assertOk();
        $invoice->refresh();
        $this->assertEquals(Invoice::STATUS_LUNAS, $invoice->status);
        $this->assertDatabaseHas('ledger_entries', [
            'invoice_id' => $invoice->id,
            'tipe' => LedgerEntry::TIPE_PIUTANG_LUNAS,
            'nominal_bruto' => 5_000_000,
        ]);
    }

    public function test_webhook_rejects_invalid_signature(): void
    {
        $invoice = $this->createInvoiceWithVa();
        $resp = $this->postJson('/api/invoice/webhook/midtrans', [
            'order_id' => $invoice->nomor_invoice,
            'status_code' => '200',
            'transaction_status' => 'settlement',
            'gross_amount' => '5000000.00',
        ], ['X-Midtrans-Signature' => 'wrong-signature-value']);

        $resp->assertStatus(401);
    }

    public function test_webhook_unknown_invoice_returns_200(): void
    {
        $serverKey = 'test-server-key-for-unit-tests';
        $orderId = 'INV/UNKNOWN/001';
        $statusCode = '200';
        $grossAmount = '5000000.00';
        $signature = hash('sha512', $orderId . $statusCode . $grossAmount . $serverKey);

        $resp = $this->postJson('/api/invoice/webhook/midtrans', [
            'order_id' => $orderId,
            'status_code' => $statusCode,
            'transaction_status' => 'settlement',
            'gross_amount' => $grossAmount,
        ], ['X-Signature' => $signature]);

        // Unknown invoice → 200 (bukan 404) agar Midtrans test notification tidak gagal
        $resp->assertOk();
        $resp->assertJson(['message' => 'Invoice not found.']);
    }
}
