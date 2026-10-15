<?php

namespace Tests\Feature;

use App\Models\AkunPengguna;
use App\Models\BuktiPembayaran;
use App\Models\Invoice;
use App\Models\LedgerEntry;
use App\Models\Lembaga;
use App\Models\Pks;
use App\Models\RefundRequest;
use App\Models\SiklusAkreditasi;
use App\Models\SuratTugas;
use App\Models\TenagaAhli;
use App\Services\Payment\InvoicePaidCalculator;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class KontrakPaymentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->seed(DatabaseSeeder::class);

        // FR-3.7: push demo surveior out of queue so test TA wins
        $demoSurveior = TenagaAhli::where('nomor_induk_surveior', 'NS-0001')->first();
        if ($demoSurveior) {
            $demoSurveior->forceFill(['status_penugasan_saat_ini' => 'sedang_bertugas'])->save();
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function actingAsAdmin(): static
    {
        return $this->actingAs(AkunPengguna::where('email', 'admin@erp.local')->firstOrFail(), 'sanctum');
    }

    private function actingAsFaskes(): static
    {
        return $this->actingAs(AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->firstOrFail(), 'sanctum');
    }

    private function actingAsKeuangan(): static
    {
        $user = AkunPengguna::where('email', 'keuangan@lembaga.local')->firstOrFail();
        return $this->actingAs($user, 'sanctum');
    }

    private function createSiklusLengkap(): SiklusAkreditasi
    {
        $lembaga = Lembaga::first();
        $faskes = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->first()->faskes;

        return SiklusAkreditasi::create([
            'id' => (string) Str::uuid(),
            'faskes_id' => $faskes->id,
            'lembaga_id' => $lembaga->id,
            'tanggal_pengajuan' => now()->toDateString(),
            'status' => 'menunggu_dokumen',
            'status_kelengkapan' => 'lengkap',
            'created_at' => now(),
        ]);
    }

    private function createPksDisetujui(SiklusAkreditasi $siklus): Pks
    {
        return Pks::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'nomor_pks' => 'PKS/TEST/' . strtoupper(Str::random(6)),
            'dibuat_oleh' => AkunPengguna::where('email', 'admin@erp.local')->first()->id,
            'status' => Pks::STATUS_DISETUJUI,
            'tanggal_disetujui' => now()->toDateString(),
            'tanda_tangan_pada' => now(),
            'nama_penandatangan' => 'Dr. Test Faskes',
            'jabatan_penandatangan' => 'Direktur',
        ]);
    }

    private function createInvoice(SiklusAkreditasi $siklus, float $total = 5_000_000, string $status = Invoice::STATUS_BELUM_BAYAR): Invoice
    {
        return Invoice::create([
            'id' => (string) Str::uuid(),
            'pks_id' => optional($siklus->pks)->id ?? $this->createPksDisetujui($siklus)->id,
            'siklus_id' => $siklus->id,
            'nomor_invoice' => 'INV/TEST/' . strtoupper(Str::random(6)),
            'dibuat_oleh' => AkunPengguna::where('email', 'admin@erp.local')->first()->id,
            'total_tagihan' => $total,
            'status' => $status,
            'diterbitkan_pada' => now(),
            'due_date' => now()->addDays(30)->toDateString(),
        ]);
    }

    // ─── FR-2.1: PKS draf & tanda tangan ────────────────────────────────────

    public function test_admin_can_create_pks_draft(): void
    {
        $siklus = $this->createSiklusLengkap();
        $resp = $this->actingAsAdmin()->postJson("/api/kontrak/siklus/{$siklus->id}/draf");

        $resp->assertCreated();
        $this->assertDatabaseHas('pks', [
            'siklus_id' => $siklus->id,
            'status' => Pks::STATUS_DRAFT,
        ]);
    }

    public function test_cannot_create_pks_if_documents_incomplete(): void
    {
        $lembaga = Lembaga::first();
        $faskes = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->first()->faskes;
        $siklus = SiklusAkreditasi::create([
            'id' => (string) Str::uuid(),
            'faskes_id' => $faskes->id,
            'lembaga_id' => $lembaga->id,
            'tanggal_pengajuan' => now()->toDateString(),
            'status' => 'menunggu_dokumen',
            'status_kelengkapan' => 'menunggu',
            'created_at' => now(),
        ]);

        $this->actingAsAdmin()
            ->postJson("/api/kontrak/siklus/{$siklus->id}/draf")
            ->assertStatus(422);
    }

    public function test_faskes_can_sign_pks_and_invoice_is_issued_automatically(): void
    {
        $siklus = $this->createSiklusLengkap();
        $adminResp = $this->actingAsAdmin()->postJson("/api/kontrak/siklus/{$siklus->id}/draf");
        $pksId = $adminResp->json('data.id');
        $this->actingAsAdmin()->postJson("/api/kontrak/{$pksId}/kirim");

        $ttd = UploadedFile::fake()->image('ttd.png', 800, 400);
        $signedPdf = UploadedFile::fake()->create('signed.pdf', 512, 'application/pdf');
        $resp = $this->actingAsFaskes()->postJson("/api/kontrak/{$pksId}/tanda-tangan", [
            'nama_penandatangan' => 'Dr. Test Faskes',
            'jabatan_penandatangan' => 'Direktur Utama',
            'nik_penandatangan' => '3174012345670001',
            'tanda_tangan' => $ttd,
            'signed_pdf' => $signedPdf,
            'setuju' => true,
        ]);

        $resp->assertOk()
            ->assertJsonPath('data.status', Pks::STATUS_DITANDATANGANI);

        // Invoice issued only after admin validates the signed PKS
        $validasiResp = $this->actingAsAdmin()->postJson("/api/kontrak/{$pksId}/validate-signed");
        $validasiResp->assertOk()
            ->assertJsonPath('invoice.status', Invoice::STATUS_BELUM_BAYAR)
            ->assertJsonPath('invoice.siklus_id', $siklus->id);

        $this->assertDatabaseHas('invoice', [
            'pks_id' => $pksId,
            'siklus_id' => $siklus->id,
            'status' => Invoice::STATUS_BELUM_BAYAR,
        ]);
    }

    // ─── AC-5: Cicilan tidak menandai Lunas ─────────────────────────────────

    public function test_invoice_partial_payment_does_not_mark_paid(): void
    {
        $siklus = $this->createSiklusLengkap();
        $this->createPksDisetujui($siklus);
        $invoice = $this->createInvoice($siklus, total: 5_000_000);

        BuktiPembayaran::create([
            'id' => (string) Str::uuid(),
            'invoice_id' => $invoice->id,
            'submitted_by' => AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->first()->id,
            'nominal' => 2_000_000,
            'metode' => BuktiPembayaran::METODE_TRANSFER,
            'status_verifikasi' => BuktiPembayaran::STATUS_DITERIMA,
            'sumber' => BuktiPembayaran::SUMBER_MANUAL,
            'tanggal_submit' => now(),
            'tanggal_verifikasi' => now(),
            'nomor_referensi' => 'TRX-001',
            'dari_rekening' => 'BCA 1234567890',
        ]);

        $newStatus = app(InvoicePaidCalculator::class)->recalculate($invoice);
        $invoice->refresh();

        $this->assertEquals(Invoice::STATUS_SEBAGIAN, $newStatus);
        $this->assertEquals(Invoice::STATUS_SEBAGIAN, $invoice->status);
        $this->assertNull($invoice->tanggal_lunas);
        $this->assertDatabaseMissing('ledger_entries', [
            'invoice_id' => $invoice->id,
            'tipe' => LedgerEntry::TIPE_PIUTANG_LUNAS,
        ]);
    }

    public function test_invoice_full_payment_marks_lunas_and_creates_ledger_entry(): void
    {
        $siklus = $this->createSiklusLengkap();
        $this->createPksDisetujui($siklus);
        $invoice = $this->createInvoice($siklus, total: 5_000_000);

        BuktiPembayaran::create([
            'id' => (string) Str::uuid(),
            'invoice_id' => $invoice->id,
            'submitted_by' => AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->first()->id,
            'nominal' => 2_000_000,
            'metode' => BuktiPembayaran::METODE_TRANSFER,
            'status_verifikasi' => BuktiPembayaran::STATUS_DITERIMA,
            'sumber' => BuktiPembayaran::SUMBER_MANUAL,
            'tanggal_submit' => now(),
            'tanggal_verifikasi' => now(),
            'nomor_referensi' => 'TRX-001',
            'dari_rekening' => 'BCA 1234567890',
        ]);
        BuktiPembayaran::create([
            'id' => (string) Str::uuid(),
            'invoice_id' => $invoice->id,
            'submitted_by' => AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->first()->id,
            'nominal' => 3_000_000,
            'metode' => BuktiPembayaran::METODE_TRANSFER,
            'status_verifikasi' => BuktiPembayaran::STATUS_DITERIMA,
            'sumber' => BuktiPembayaran::SUMBER_MANUAL,
            'tanggal_submit' => now(),
            'tanggal_verifikasi' => now(),
            'nomor_referensi' => 'TRX-002',
            'dari_rekening' => 'BCA 1234567890',
        ]);

        app(InvoicePaidCalculator::class)->recalculate($invoice);
        $invoice->refresh();

        $this->assertEquals(Invoice::STATUS_LUNAS, $invoice->status);
        $this->assertNotNull($invoice->tanggal_lunas);
        $this->assertDatabaseHas('ledger_entries', [
            'invoice_id' => $invoice->id,
            'tipe' => LedgerEntry::TIPE_PIUTANG_LUNAS,
            'nominal_bruto' => 5_000_000,
            'nominal_neto' => 5_000_000,
        ]);
    }

    // ─── FR-2.7: Tolak bukti + notifikasi ───────────────────────────────────

    public function test_admin_can_reject_bukti_with_reason(): void
    {
        $siklus = $this->createSiklusLengkap();
        $this->createPksDisetujui($siklus);
        $invoice = $this->createInvoice($siklus, total: 5_000_000);

        $bukti = BuktiPembayaran::create([
            'id' => (string) Str::uuid(),
            'invoice_id' => $invoice->id,
            'submitted_by' => AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->first()->id,
            'nominal' => 1_000_000,
            'metode' => BuktiPembayaran::METODE_TRANSFER,
            'status_verifikasi' => BuktiPembayaran::STATUS_MENUNGGU,
            'sumber' => BuktiPembayaran::SUMBER_MANUAL,
            'tanggal_submit' => now(),
            'nomor_referensi' => 'TRX-BAD',
            'dari_rekening' => 'BCA',
        ]);

        $resp = $this->actingAsAdmin()->postJson("/api/bukti/{$bukti->id}/verifikasi", [
            'status' => 'ditolak',
            'alasan_penolakan' => 'Nominal tidak sesuai dengan tagihan.',
        ]);

        $resp->assertOk();
        $this->assertDatabaseHas('bukti_pembayaran', [
            'id' => $bukti->id,
            'status_verifikasi' => BuktiPembayaran::STATUS_DITOLAK,
            'alasan_penolakan' => 'Nominal tidak sesuai dengan tagihan.',
        ]);
    }

    public function test_faskes_can_reupload_after_rejection(): void
    {
        $siklus = $this->createSiklusLengkap();
        $this->createPksDisetujui($siklus);
        $invoice = $this->createInvoice($siklus, total: 5_000_000);

        $bukti = BuktiPembayaran::create([
            'id' => (string) Str::uuid(),
            'invoice_id' => $invoice->id,
            'submitted_by' => AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->first()->id,
            'nominal' => 1_000_000,
            'metode' => BuktiPembayaran::METODE_TRANSFER,
            'status_verifikasi' => BuktiPembayaran::STATUS_DITOLAK,
            'sumber' => BuktiPembayaran::SUMBER_MANUAL,
            'tanggal_submit' => now(),
            'tanggal_verifikasi' => now(),
            'alasan_penolakan' => 'Nominal tidak sesuai',
        ]);

        $resp = $this->actingAsFaskes()->postJson("/api/invoice/{$invoice->id}/bukti-manual", [
            'nominal' => 5_000_000,
            'nomor_referensi' => 'TRX-NEW',
            'dari_rekening' => 'BCA 9999',
            'bukti' => UploadedFile::fake()->create('bukti.pdf', 100),
        ]);

        $resp->assertCreated();
        $this->assertEquals(2, $invoice->buktiPembayaran()->count());
    }

    // ─── FR-2.4 (AC-1): Surat Tugas tanpa tunggu Paid ───────────────────────

    public function test_surat_tugas_can_issue_without_invoice_paid(): void
    {
        $siklus = $this->createSiklusLengkap();
        $this->createPksDisetujui($siklus);

        // Invoice diterbitkan TAPI belum dibayar (status: belum_bayar)
        $invoice = $this->createInvoice($siklus, total: 5_000_000, status: Invoice::STATUS_BELUM_BAYAR);
        $this->assertEquals(Invoice::STATUS_BELUM_BAYAR, $invoice->status);

        $surveior = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-001',
            'nama' => 'Dr. Surveior Satu',
            'peran' => 'surveior',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
        ]);

        $resp = $this->actingAsAdmin()->postJson('/api/surat-tugas/terbit', [
            'siklus_id' => $siklus->id,
            'tenaga_ahli_id' => $surveior->id,
            'jenis' => 'survei',
        ]);

        $resp->assertCreated()
            ->assertJsonPath('data.penugasan.siklus_id', $siklus->id)
            ->assertJsonPath('data.surat_tugas.nomor_surat', fn ($v) => is_string($v) && str_starts_with($v, 'ST/SURVEI/'));

        $this->assertDatabaseHas('penugasan', [
            'siklus_id' => $siklus->id,
            'tenaga_ahli_id' => $surveior->id,
            'jenis' => 'survei',
        ]);
        $this->assertDatabaseHas('surat_tugas', [
            'penugasan_id' => $resp->json('data.penugasan.id'),
        ]);
    }

    public function test_surat_tugas_blocked_when_documents_incomplete(): void
    {
        $lembaga = Lembaga::first();
        $faskes = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->first()->faskes;
        $siklus = SiklusAkreditasi::create([
            'id' => (string) Str::uuid(),
            'faskes_id' => $faskes->id,
            'lembaga_id' => $lembaga->id,
            'tanggal_pengajuan' => now()->toDateString(),
            'status' => 'menunggu_dokumen',
            'status_kelengkapan' => 'menunggu',
            'created_at' => now(),
        ]);

        $surveior = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-002',
            'nama' => 'Dr. Test',
            'peran' => 'surveior',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
        ]);

        $this->actingAsAdmin()
            ->postJson('/api/surat-tugas/terbit', [
                'siklus_id' => $siklus->id,
                'tenaga_ahli_id' => $surveior->id,
                'jenis' => 'survei',
            ])
            ->assertStatus(422)
            ->assertJsonPath('errors.0', 'Dokumen Faskes belum tervalidasi lengkap (FR-1.3).');
    }

    public function test_surat_tugas_blocked_when_pks_not_signed(): void
    {
        $siklus = $this->createSiklusLengkap();
        // PKS dibuat tapi belum disetujui
        Pks::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'nomor_pks' => 'PKS/DRAFT/001',
            'dibuat_oleh' => AkunPengguna::where('email', 'admin@erp.local')->first()->id,
            'status' => Pks::STATUS_DIKIRIM,
        ]);
        $this->createInvoice($siklus);

        $surveior = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-003',
            'nama' => 'Dr. Test',
            'peran' => 'surveior',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
        ]);

        $this->actingAsAdmin()
            ->postJson('/api/surat-tugas/terbit', [
                'siklus_id' => $siklus->id,
                'tenaga_ahli_id' => $surveior->id,
                'jenis' => 'survei',
            ])
            ->assertStatus(422)
            ->assertJsonPath('errors.0', 'PKS belum disetujui Faskes (status: dikirim).');
    }

    // ─── FR-2.8: Refund state machine ───────────────────────────────────────

    public function test_refund_state_machine_full_flow(): void
    {
        $siklus = $this->createSiklusLengkap();
        $this->createPksDisetujui($siklus);
        $invoice = $this->createInvoice($siklus, total: 5_000_000);

        // 1. Request refund
        $req = $this->actingAsAdmin()->postJson("/api/refund/invoice/{$invoice->id}", [
            'nominal' => 5_000_000,
            'alasan' => 'Faskes double bayar karena error sistem pembayaran.',
        ]);
        $req->assertCreated();
        $refundId = $req->json('data.id');
        $this->assertEquals(RefundRequest::STATUS_REQUESTED, $req->json('data.status'));

        // 2. Approve
        $app = $this->actingAsKeuangan()->postJson("/api/refund/{$refundId}/approve", [
            'catatan' => 'Disetujui oleh Keuangan.',
        ]);
        $app->assertOk();
        $this->assertEquals(RefundRequest::STATUS_APPROVED, $app->json('data.status'));

        // 3. Execute
        $exec = $this->actingAsKeuangan()->postJson("/api/refund/{$refundId}/execute");
        $exec->assertOk();
        $this->assertEquals(RefundRequest::STATUS_EXECUTED, $exec->json('data.status'));
        $this->assertNotNull($exec->json('data.ledger_entry_id'));

        $this->assertDatabaseHas('ledger_entries', [
            'invoice_id' => $invoice->id,
            'tipe' => LedgerEntry::TIPE_REFUND,
        ]);
    }

    public function test_refund_cannot_be_executed_without_approval(): void
    {
        $siklus = $this->createSiklusLengkap();
        $this->createPksDisetujui($siklus);
        $invoice = $this->createInvoice($siklus, total: 5_000_000);

        $req = $this->actingAsAdmin()->postJson("/api/refund/invoice/{$invoice->id}", [
            'nominal' => 1_000_000,
            'alasan' => 'Sebagian dari pembayaran salah nominal',
        ]);
        $refundId = $req->json('data.id');

        $this->assertNotNull($refundId, 'Refund should have been created.');
        $this->actingAsKeuangan()
            ->postJson("/api/refund/{$refundId}/execute")
            ->assertStatus(500);
    }

    public function test_refund_cannot_exceed_paid_amount(): void
    {
        $siklus = $this->createSiklusLengkap();
        $this->createPksDisetujui($siklus);
        $invoice = $this->createInvoice($siklus, total: 5_000_000);

        $this->actingAsAdmin()
            ->postJson("/api/refund/invoice/{$invoice->id}", [
                'nominal' => 99_999_999,
                'alasan' => 'Menguji batas refund yang valid',
            ])
            ->assertStatus(422);
    }
}
