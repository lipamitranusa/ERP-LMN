<?php

namespace Tests\Feature;

use App\Models\AkunPengguna;
use App\Models\Faskes;
use App\Models\Invoice;
use App\Models\NotifikasiTagihan;
use App\Models\Penugasan;
use App\Models\SiklusAkreditasi;
use App\Models\TenagaAhli;
use App\Services\Notification\InvoiceReminderService;
use App\Services\Notification\Notifier;
use Carbon\Carbon;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Tests\TestCase;

class NotificationReminderTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        // Push demo Surveior out of eligible queue
        $demoSurveior = TenagaAhli::where('nomor_induk_surveior', 'NS-0001')->first();
        if ($demoSurveior) {
            $demoSurveior->forceFill(['status_penugasan_saat_ini' => 'sedang_bertugas'])->save();
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function makeSiklusWithPenugasan(
        string $invoiceStatus = Invoice::STATUS_BELUM_BAYAR,
        ?string $dueDateOffset = '-1 day',  // default: 1 hari lewat (overdue)
        string $penugasanStatus = Penugasan::STATUS_SEDANG_BERTUGAS,
        ?string $faskesPhone = '081234567890',
        ?string $faskesEmail = 'rs.demo@example.com',
    ): array {
        $faskes = Faskes::create([
            'id' => (string) Str::uuid(),
            'nama' => 'RS Test Faskes',
            'tipe_faskes' => 'Rumah Sakit',
            'alamat' => 'Jl. Test',
            'status' => 'Aktif',
            'telepon' => $faskesPhone,
            'email' => $faskesEmail,
        ]);

        $lembagaId = \App\Models\Lembaga::first()->id;
        $siklus = SiklusAkreditasi::create([
            'id' => (string) Str::uuid(),
            'faskes_id' => $faskes->id,
            'lembaga_id' => $lembagaId,
            'tanggal_pengajuan' => now()->subDays(20)->toDateString(),
            'status' => 'survei_berjalan',
            'status_kelengkapan' => 'lengkap',
            'created_at' => now()->subDays(20),
        ]);

        $surveior = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-TEST-' . Str::random(4),
            'nama' => 'Surveior Test',
            'peran' => 'surveior',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
        ]);

        $penugasan = Penugasan::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'tenaga_ahli_id' => $surveior->id,
            'jenis' => Penugasan::JENIS_SURVEI,
            'status' => $penugasanStatus,
        ]);

        // Create real PKS to satisfy foreign key on invoice
        $pks = \App\Models\Pks::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'nomor_pks' => 'PKS/NOTIF/' . strtoupper(Str::random(4)),
            'dibuat_oleh' => AkunPengguna::first()->id,
            'status' => \App\Models\Pks::STATUS_DISETUJUI,
            'tanggal_disetujui' => now()->subDays(20)->toDateString(),
        ]);

        $invoice = Invoice::create([
            'id' => (string) Str::uuid(),
            'pks_id' => $pks->id,
            'siklus_id' => $siklus->id,
            'nomor_invoice' => 'INV/NOTIF/' . strtoupper(Str::random(4)),
            'dibuat_oleh' => AkunPengguna::first()->id,
            'total_tagihan' => 5_000_000,
            'status' => $invoiceStatus,
            'diterbitkan_pada' => now()->subDays(20),
            'due_date' => $dueDateOffset ? Carbon::parse($dueDateOffset)->toDateString() : null,
        ]);

        return [$siklus, $penugasan, $invoice, $faskes];
    }

    // ─── AC-9: Overdue reminder fires when survei is berjalan ──────────────

    public function test_ac9_overdue_reminder_sent_when_survei_berjalan(): void
    {
        [$siklus, $penugasan, $invoice, $faskes] = $this->makeSiklusWithPenugasan(
            invoiceStatus: Invoice::STATUS_BELUM_BAYAR,
            dueDateOffset: '-2 days',
            penugasanStatus: Penugasan::STATUS_SEDANG_BERTUGAS,
        );

        $service = app(InvoiceReminderService::class);
        $result = $service->processOverdueReminders();

        $this->assertEquals(1, $result['count'], 'Overdue reminder harus terkirim.');
        $this->assertEquals(0, $result['errors']);
        $this->assertDatabaseHas('notifikasi_tagihan', [
            'siklus_id' => $siklus->id,
            'jenis' => NotifikasiTagihan::JENIS_TAGIHAN_OVERDUE,
            'status' => NotifikasiTagihan::STATUS_TERKIRIM,
        ]);
    }

    public function test_ac9_overdue_reminder_NOT_sent_when_survei_not_running(): void
    {
        // Penugasan belum mulai (status: menunggu) — bukan "sedang_bertugas"
        [$siklus, $penugasan, $invoice, $faskes] = $this->makeSiklusWithPenugasan(
            invoiceStatus: Invoice::STATUS_BELUM_BAYAR,
            dueDateOffset: '-2 days',
            penugasanStatus: Penugasan::STATUS_MENUNGGU,
        );

        $service = app(InvoiceReminderService::class);
        $result = $service->processOverdueReminders();

        $this->assertEquals(0, $result['count'], 'Tidak boleh kirim reminder jika survei belum berjalan.');
        $this->assertDatabaseMissing('notifikasi_tagihan', [
            'siklus_id' => $siklus->id,
            'jenis' => NotifikasiTagihan::JENIS_TAGIHAN_OVERDUE,
        ]);
    }

    public function test_ac9_overdue_reminder_NOT_sent_when_invoice_already_lunas(): void
    {
        [$siklus, $penugasan, $invoice, $faskes] = $this->makeSiklusWithPenugasan(
            invoiceStatus: Invoice::STATUS_LUNAS,
            dueDateOffset: '-2 days',
            penugasanStatus: Penugasan::STATUS_SEDANG_BERTUGAS,
        );

        $service = app(InvoiceReminderService::class);
        $result = $service->processOverdueReminders();

        $this->assertEquals(0, $result['count'], 'Tidak kirim reminder untuk invoice yang sudah lunas.');
    }

    public function test_ac9_overdue_is_idempotent_per_invoice(): void
    {
        [$siklus, $penugasan, $invoice, $faskes] = $this->makeSiklusWithPenugasan(
            invoiceStatus: Invoice::STATUS_BELUM_BAYAR,
            dueDateOffset: '-2 days',
        );

        $service = app(InvoiceReminderService::class);
        $service->processOverdueReminders();
        $service->processOverdueReminders();
        $service->processOverdueReminders();

        $count = NotifikasiTagihan::where('siklus_id', $siklus->id)
            ->where('jenis', NotifikasiTagihan::JENIS_TAGIHAN_OVERDUE)
            ->count();
        $this->assertEquals(1, $count, 'Reminder overdue harus idempotent per invoice.');
    }

    // ─── H-3 / H-1 reminder logic ──────────────────────────────────────────

    public function test_h3_reminder_sent_three_days_before_due_date(): void
    {
        $this->travelTo(Carbon::parse('2026-10-10'));
        [$siklus, $penugasan, $invoice, $faskes] = $this->makeSiklusWithPenugasan(
            invoiceStatus: Invoice::STATUS_BELUM_BAYAR,
            dueDateOffset: '2026-10-13',  // H+3
            penugasanStatus: Penugasan::STATUS_SEDANG_BERTUGAS,
        );

        $service = app(InvoiceReminderService::class);
        $result = $service->processDailyReminders();

        $this->assertEquals(1, $result['count'], 'Errors: ' . $result['errors'] . ' Invoice due: ' . $invoice->due_date->toDateString());
        $this->assertDatabaseHas('notifikasi_tagihan', [
            'siklus_id' => $siklus->id,
            'jenis' => NotifikasiTagihan::JENIS_TAGIHAN_H3,
            'status' => NotifikasiTagihan::STATUS_TERKIRIM,
        ]);
        $this->travelBack();
    }

    public function test_h1_reminder_sent_one_day_before_due_date(): void
    {
        $this->travelTo(Carbon::parse('2026-10-10'));
        [$siklus, $penugasan, $invoice, $faskes] = $this->makeSiklusWithPenugasan(
            invoiceStatus: Invoice::STATUS_BELUM_BAYAR,
            dueDateOffset: '2026-10-11',
            penugasanStatus: Penugasan::STATUS_SEDANG_BERTUGAS,
        );

        $service = app(InvoiceReminderService::class);
        $result = $service->processDailyReminders();

        $this->assertEquals(1, $result['count']);
        $this->assertDatabaseHas('notifikasi_tagihan', [
            'siklus_id' => $siklus->id,
            'jenis' => NotifikasiTagihan::JENIS_TAGIHAN_H1,
        ]);
        $this->travelBack();
    }

    public function test_h3_reminder_NOT_sent_on_unrelated_day(): void
    {
        $this->travelTo(Carbon::parse('2026-10-05'));  // jauh dari due date
        [$siklus, $penugasan, $invoice, $faskes] = $this->makeSiklusWithPenugasan(
            dueDateOffset: '2026-10-13',
            penugasanStatus: Penugasan::STATUS_SEDANG_BERTUGAS,
        );

        $service = app(InvoiceReminderService::class);
        $result = $service->processDailyReminders();

        $this->assertEquals(0, $result['count']);
        $this->travelBack();
    }

    // ─── WhatsApp → Email fallback (NFR-1) ─────────────────────────────────

    public function test_whatsapp_failure_falls_back_to_email(): void
    {
        // Force WhatsApp to fail by giving it an invalid phone.
        [$siklus, $penugasan, $invoice, $faskes] = $this->makeSiklusWithPenugasan(
            faskesPhone: 'invalid',  // WhatsApp normalizer akan menolak
            faskesEmail: 'rs.demo@example.com',
        );

        $notifier = app(Notifier::class);
        $result = $notifier->sendWithFallback(
            recipientPhone: 'invalid',
            recipientEmail: 'rs.demo@example.com',
            subject: 'Test subject',
            message: 'Test message body',
            siklusId: $siklus->id,
            jenis: 'test_fallback',
        );

        $this->assertEquals('terkirim', $result['status']);
        $this->assertEquals('email', $result['channel']);
        $this->assertDatabaseHas('notifikasi_tagihan', [
            'siklus_id' => $siklus->id,
            'channel' => NotifikasiTagihan::CHANNEL_EMAIL,
            'status' => NotifikasiTagihan::STATUS_TERKIRIM,
        ]);
    }

    public function test_whatsapp_succeeds_when_phone_valid(): void
    {
        [$siklus, $penugasan, $invoice, $faskes] = $this->makeSiklusWithPenugasan(
            faskesPhone: '081234567890',
            faskesEmail: 'rs.demo@example.com',
        );

        // In Fase 1, WhatsApp without real credentials logs as "ok" (log_only mode).
        $notifier = app(Notifier::class);
        $result = $notifier->sendWithFallback(
            recipientPhone: '081234567890',
            recipientEmail: 'rs.demo@example.com',
            subject: 'Test',
            message: 'Body',
            siklusId: $siklus->id,
            jenis: 'test_ok',
        );

        $this->assertEquals('terkirim', $result['status']);
        $this->assertEquals('whatsapp', $result['channel']);
    }

    public function test_both_whatsapp_and_email_failure_marks_gagal_with_retry_scheduled(): void
    {
        [$siklus, $penugasan, $invoice, $faskes] = $this->makeSiklusWithPenugasan(
            faskesPhone: 'invalid',
            faskesEmail: 'not-an-email',  // also invalid
        );

        $notifier = app(Notifier::class);
        $result = $notifier->sendWithFallback(
            recipientPhone: 'invalid',
            recipientEmail: 'not-an-email',
            subject: 'Test',
            message: 'Body',
            siklusId: $siklus->id,
            jenis: 'test_gagal',
        );

        $this->assertEquals('gagal', $result['status']);
        $this->assertEquals(1, $result['error'] ? 1 : 0);

        $notif = NotifikasiTagihan::find($result['notifikasi_id']);
        $this->assertEquals(NotifikasiTagihan::STATUS_GAGAL, $notif->status);
        $this->assertEquals(1, $notif->attempt_count);
        $this->assertNotNull($notif->next_retry_at, 'next_retry_at harus di-set untuk skenario retry Bab 8.');
        $this->assertTrue($notif->next_retry_at->isFuture());
    }

    public function test_bab8_retry_recovers_failed_notification(): void
    {
        // First attempt: invalid phone, invalid email → gagal
        [$siklus, $penugasan, $invoice, $faskes] = $this->makeSiklusWithPenugasan(
            faskesPhone: 'invalid',
            faskesEmail: 'not-an-email',
        );

        $notifier = app(Notifier::class);
        $first = $notifier->sendWithFallback(
            recipientPhone: 'invalid',
            recipientEmail: 'not-an-email',
            subject: 'Test',
            message: 'Body',
            siklusId: $siklus->id,
            jenis: 'test_retry',
        );
        $this->assertEquals('gagal', $first['status']);

        // Now fix Faskes contact (simulate data correction) and force retry time
        $faskes->update([
            'telepon' => '081234567890',
            'email' => 'rs.demo@example.com',
        ]);
        $notif = NotifikasiTagihan::find($first['notifikasi_id']);
        $notif->update(['next_retry_at' => now()->subMinute()]);

        $result = $notifier->retry($notif);
        $this->assertEquals('terkirim', $result['status']);
        $this->assertContains($result['channel'], ['whatsapp', 'email']);
    }

    public function test_retry_skipped_when_next_retry_in_future(): void
    {
        [$siklus, $penugasan, $invoice, $faskes] = $this->makeSiklusWithPenugasan(
            faskesPhone: 'invalid', faskesEmail: 'not-an-email',
        );

        $notifier = app(Notifier::class);
        $first = $notifier->sendWithFallback(
            recipientPhone: 'invalid', recipientEmail: 'not-an-email',
            subject: 'Test', message: 'Body',
            siklusId: $siklus->id, jenis: 'test_skip',
        );

        // next_retry_at masih di masa depan (default +5 menit)
        $service = app(InvoiceReminderService::class);
        $recovered = $service->processRetries();
        $this->assertEquals(0, $recovered, 'Tidak boleh retry sebelum next_retry_at.');
    }

    public function test_retry_stops_after_max_attempts(): void
    {
        [$siklus, $penugasan, $invoice, $faskes] = $this->makeSiklusWithPenugasan(
            faskesPhone: 'invalid', faskesEmail: 'not-an-email',
        );

        // Buat notifikasi yang sudah attempt_count = MAX
        $notif = NotifikasiTagihan::create([
            'siklus_id' => $siklus->id,
            'jenis' => 'test_max',
            'channel' => 'whatsapp',
            'recipient' => 'invalid',
            'status' => NotifikasiTagihan::STATUS_GAGAL,
            'attempt_count' => Notifier::MAX_ATTEMPTS,
            'next_retry_at' => now()->subDay(),
            'payload' => ['subject' => 'S', 'message' => 'M'],
        ]);

        $service = app(InvoiceReminderService::class);
        $recovered = $service->processRetries();
        $this->assertEquals(0, $recovered, 'Tidak boleh retry setelah MAX_ATTEMPTS.');
    }

    // ─── Integration: Bukti ditolak triggers Faskes notification ───────────

    public function test_bukti_ditolak_triggers_faskes_notification(): void
    {
        [$siklus, $penugasan, $invoice, $faskes] = $this->makeSiklusWithPenugasan(
            faskesPhone: '081234567890', faskesEmail: 'rs.demo@example.com',
        );

        \App\Models\BuktiPembayaran::create([
            'id' => (string) Str::uuid(),
            'invoice_id' => $invoice->id,
            'submitted_by' => AkunPengguna::first()->id,
            'nominal' => 1_000_000,
            'metode' => \App\Models\BuktiPembayaran::METODE_TRANSFER,
            'status_verifikasi' => \App\Models\BuktiPembayaran::STATUS_MENUNGGU,
            'sumber' => \App\Models\BuktiPembayaran::SUMBER_MANUAL,
            'tanggal_submit' => now(),
        ]);

        $bukti = $invoice->buktiPembayaran()->first();
        $admin = AkunPengguna::where('email', 'admin@erp.local')->firstOrFail();
        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/bukti/{$bukti->id}/verifikasi", [
                'status' => 'ditolak',
                'alasan_penolakan' => 'Nominal tidak sesuai tagihan.',
            ])
            ->assertOk();

        $this->assertDatabaseHas('notifikasi_tagihan', [
            'siklus_id' => $siklus->id,
            'jenis' => 'bukti_ditolak',
            'status' => NotifikasiTagihan::STATUS_TERKIRIM,
        ]);
    }

    public function test_bukti_diterima_penuh_triggers_invoice_lunas_notification(): void
    {
        [$siklus, $penugasan, $invoice, $faskes] = $this->makeSiklusWithPenugasan(
            faskesPhone: '081234567890', faskesEmail: 'rs.demo@example.com',
        );

        \App\Models\BuktiPembayaran::create([
            'id' => (string) Str::uuid(),
            'invoice_id' => $invoice->id,
            'submitted_by' => AkunPengguna::first()->id,
            'nominal' => 5_000_000,
            'metode' => \App\Models\BuktiPembayaran::METODE_TRANSFER,
            'status_verifikasi' => \App\Models\BuktiPembayaran::STATUS_MENUNGGU,
            'sumber' => \App\Models\BuktiPembayaran::SUMBER_MANUAL,
            'tanggal_submit' => now(),
        ]);

        $bukti = $invoice->buktiPembayaran()->first();
        $admin = AkunPengguna::where('email', 'admin@erp.local')->firstOrFail();
        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/bukti/{$bukti->id}/verifikasi", ['status' => 'diterima'])
            ->assertOk();

        $this->assertDatabaseHas('notifikasi_tagihan', [
            'siklus_id' => $siklus->id,
            'jenis' => 'invoice_lunas',
        ]);
    }
}
