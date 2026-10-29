<?php

namespace Tests\Feature;

use App\Models\AkunPengguna;
use App\Models\NotifikasiTagihan;
use App\Models\NotifikasiTemplate;
use App\Services\Notification\NotifikasiTemplateService;
use App\Services\Notification\Notifier;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Pengaturan "Format Pesan" — isi pesan notifikasi per kanal.
 *
 * Menguji:
 *   - API daftar/simpan/pratinjau/reset template
 *   - Placeholder {{variabel}} ter-render dengan data nyata
 *   - Notifikasi yang dimatikan admin TIDAK dikirim
 *   - Format bawaan (belum ada override) tetap dipakai
 */
class NotifikasiTemplateTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    private function admin(): AkunPengguna
    {
        return AkunPengguna::where('email', 'admin@erp.local')->firstOrFail();
    }

    /**
     * ID lembaga milik user yang login — global scope 'lembaga' menyaring
     * siklus/faskes berdasarkan nilai ini.
     */
    private function lembagaId(): string
    {
        return $this->admin()->lembaga_id ?? \App\Models\Lembaga::first()->id;
    }

    // ─── API: daftar template ────────────────────────────────────────────

    public function test_admin_daftar_template_untuk_kedua_kanal(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/notifikasi-template')
            ->assertOk()
            ->assertJsonStructure(['data' => ['whatsapp', 'email']])
            ->assertJsonCount(8, 'data.whatsapp')
            ->assertJsonCount(8, 'data.email');
    }

    public function test_template_per_kanal_menyertakan_variabel_dan_label(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/notifikasi-template/whatsapp')
            ->assertOk()
            ->assertJsonPath('data.0.jenis', 'tagihan_h3')
            ->assertJsonPath('data.0.label', 'Pengingat Tagihan H-3')
            ->assertJsonPath('data.0.aktif', true)
            ->assertJsonStructure([
                'data' => [['channel', 'jenis', 'subject', 'body', 'aktif', 'variables' => ['nama_faskes' => ['label', 'contoh']]]],
            ]);
    }

    public function test_kanal_tidak_dikenal_ditolak(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/notifikasi-template/sms')
            ->assertStatus(422);
    }

    public function test_role_tanpa_privilege_ditolak(): void
    {
        $faskes = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->firstOrFail();

        $this->actingAs($faskes, 'sanctum')
            ->getJson('/api/notifikasi-template')
            ->assertStatus(403);
    }

    // ─── API: simpan & reset ─────────────────────────────────────────────

    public function test_admin_bisa_menyimpan_template_pesan(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->putJson('/api/notifikasi-template', [
                'values' => [
                    'whatsapp:tagihan_h3' => [
                        'subject' => 'H3 {{nomor_invoice}}',
                        'body' => 'Halo {{nama_faskes}}, tagihan {{total_tagihan}}.',
                        'aktif' => true,
                    ],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('updated', 1);

        $this->assertDatabaseHas('notifikasi_template', [
            'channel' => 'whatsapp',
            'jenis' => 'tagihan_h3',
            'subject' => 'H3 {{nomor_invoice}}',
            'body' => 'Halo {{nama_faskes}}, tagihan {{total_tagihan}}.',
        ]);
    }

    public function test_template_tersimpan_muncul_di_daftar_dengan_penanda_diubah(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->putJson('/api/notifikasi-template', [
                'values' => [
                    'email:invoice_lunas' => ['subject' => 'Lunas!', 'body' => 'Selesai.'],
                ],
            ])
            ->assertOk();

        $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/notifikasi-template/email')
            ->assertOk()
            ->assertJsonPath('data.4.jenis', 'invoice_lunas')
            ->assertJsonPath('data.4.subject', 'Lunas!')
            ->assertJsonPath('data.4.customized', true);
    }

    public function test_reset_mengembalikan_template_ke_format_bawaan(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->putJson('/api/notifikasi-template', [
                'values' => ['whatsapp:tagihan_h1' => ['body' => 'Custom']],
            ])
            ->assertOk();

        $this->assertDatabaseHas('notifikasi_template', [
            'channel' => 'whatsapp',
            'jenis' => 'tagihan_h1',
        ]);

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/notifikasi-template/reset', [
                'channel' => 'whatsapp',
                'jenis' => 'tagihan_h1',
            ])
            ->assertOk();

        $this->assertDatabaseMissing('notifikasi_template', [
            'channel' => 'whatsapp',
            'jenis' => 'tagihan_h1',
        ]);
    }

    // ─── API: pratinjau ──────────────────────────────────────────────────

    public function test_pratinjau_merender_placeholder_dengan_data_contoh(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/notifikasi-template/preview', [
                'channel' => 'whatsapp',
                'jenis' => 'tagihan_h3',
                'subject' => 'Tagihan {{nomor_invoice}}',
                'body' => 'Halo {{nama_faskes}}, total {{total_tagihan}}.',
            ])
            ->assertOk()
            ->assertJsonPath('data.subject', 'Tagihan INV/2026/0001')
            ->assertJsonPath('data.body', 'Halo RS Srcaba, total 5.000.000.');
    }

    public function test_pratinjau_menandai_variabel_yang_tidak_ada_datanya(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/notifikasi-template/preview', [
                'channel' => 'whatsapp',
                'jenis' => 'tagihan_h3',
                'subject' => 'Subjek',
                'body' => 'Halo {{variabel_hilang}}.',
            ])
            ->assertOk()
            ->assertJsonPath('data.missing', ['variabel_hilang']);
    }

    public function test_pratinjau_menolak_jenis_yang_tidak_didukung_kanal(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/notifikasi-template/preview', [
                'channel' => 'email',
                'jenis' => 'jenis_tidak_ada',
            ])
            ->assertStatus(422);
    }

    // ─── Service: render placeholder ─────────────────────────────────────

    public function test_service_render_mengganti_placeholder_dengan_nilai(): void
    {
        $service = app(NotifikasiTemplateService::class);

        $out = $service->render('Halo {{nama}}, total {{total}}.', [
            'nama' => 'RS Srcaba',
            'total' => '5.000.000',
        ]);

        $this->assertEquals('Halo RS Srcaba, total 5.000.000.', $out);
    }

    public function test_service_render_mengabaikan_placeholder_yang_tidak_dikenal(): void
    {
        $service = app(NotifikasiTemplateService::class);

        $out = $service->render('Halo {{nama}}, {{tidak_ada}}.', ['nama' => 'RS']);

        $this->assertEquals('Halo RS, .', $out);
    }

    public function test_service_missing_placeholders_mendeteksi_variabel_kosong(): void
    {
        $service = app(NotifikasiTemplateService::class);

        $missing = $service->missingPlaceholders('{{a}} {{b}} {{a}}', ['a' => 'isi']);

        $this->assertEquals(['b'], $missing);
    }

    // ─── Service: status kanal ───────────────────────────────────────────

    public function test_status_aktif_untuk_kanal_yang_mendukung_jenis(): void
    {
        $service = app(NotifikasiTemplateService::class);

        $this->assertEquals('active', $service->status('whatsapp', 'tagihan_h3'));
        $this->assertEquals('active', $service->status('email', 'tagihan_h3'));
    }

    public function test_status_not_supported_untuk_jenis_yang_tidak_ada_di_kanal(): void
    {
        $service = app(NotifikasiTemplateService::class);

        $this->assertEquals('not_supported', $service->status('whatsapp', 'jenis_ngawur'));
    }

    public function test_status_disabled_setelah_admin_mematikan_notifikasi(): void
    {
        $service = app(NotifikasiTemplateService::class);

        NotifikasiTemplate::updateOrCreate(
            ['channel' => 'whatsapp', 'jenis' => 'tagihan_h3'],
            ['aktif' => false]
        );

        $this->assertEquals('disabled', $service->status('whatsapp', 'tagihan_h3'));
        $this->assertNull($service->compose('whatsapp', 'tagihan_h3', ['nama_faskes' => 'RS']));
    }

    public function test_compose_tidak_mengubah_isi_pesan_dokumen_yang_bukan_teks_bebas(): void
    {
        $service = app(NotifikasiTemplateService::class);

        // Email invoice berisi dokumen HTML — hanya subjek yang di-template.
        $out = $service->compose('email', 'tagihan_invoice', [
            'nomor_invoice' => 'INV/1',
            'nama_faskes' => 'RS Srcaba',
        ], ['body' => '<html>Dokumen invoice</html>']);

        $this->assertEquals('Invoice INV/1 — RS Srcaba', $out['subject']);
        $this->assertEquals('<html>Dokumen invoice</html>', $out['body']);
    }

    public function test_compose_memakai_template_tersimpan_bukan_format_bawaan(): void
    {
        NotifikasiTemplate::updateOrCreate(
            ['channel' => 'whatsapp', 'jenis' => 'tagihan_h3'],
            ['subject' => 'Subjek Baru', 'body' => 'Isi Baru {{nama_faskes}}']
        );

        $service = app(NotifikasiTemplateService::class);

        $out = $service->compose('whatsapp', 'tagihan_h3', ['nama_faskes' => 'RS Srcaba']);

        $this->assertEquals('Subjek Baru', $out['subject']);
        $this->assertEquals('Isi Baru RS Srcaba', $out['body']);
    }

    public function test_template_bawaan_dirender_dengan_nilai_konteks(): void
    {
        $service = app(NotifikasiTemplateService::class);

        $out = $service->compose('whatsapp', 'tagihan_h3', [
            'nama_faskes' => 'RS Srcaba',
            'nomor_invoice' => 'INV/9',
            'total_tagihan' => '5.000.000',
            'due_date' => '13 Oktober 2026',
            'hari_ke_jatuh_tempo' => '3',
            'nama_lembaga' => 'Lembaga Akreditasi',
        ]);

        $this->assertStringContainsString('RS Srcaba', $out['body']);
        $this->assertStringContainsString('INV/9', $out['body']);
        $this->assertStringContainsString('5.000.000', $out['body']);
        $this->assertStringContainsString('13 Oktober 2026', $out['body']);
        $this->assertEmpty($out['missing']);
    }

    // ─── Integrasi Notifier: template dipakai saat kirim ─────────────────

    public function test_notifier_menggunakan_template_pesan_saat_mengirim(): void
    {
        NotifikasiTemplate::updateOrCreate(
            ['channel' => 'whatsapp', 'jenis' => 'tagihan_h3'],
            [
                'subject' => 'Subjek Kustom',
                'body' => 'Halo {{nama_faskes}}, bayar {{total_tagihan}}.',
            ]
        );

        $notif = $this->makeFailedNotification();

        $result = app(Notifier::class)->sendWithFallback(
            recipientPhone: '081234567890',
            recipientEmail: 'rs@example.com',
            subject: 'Subjek Default',
            message: 'Pesan default',
            siklusId: $notif['siklus_id'],
            jenis: 'tagihan_h3',
            context: [
                'nama_faskes' => 'RS Srcaba',
                'total_tagihan' => '5.000.000',
            ],
        );

        $this->assertEquals('terkirim', $result['status']);

        $stored = NotifikasiTagihan::find($result['notifikasi_id']);
        $this->assertEquals('Subjek Kustom', $stored->payload['subject']);
        $this->assertEquals('Halo RS Srcaba, bayar 5.000.000.', $stored->payload['message']);
    }

    public function test_payload_gagal_menyimpan_context_agar_retry_merender_placeholders(): void
    {
        $notif = $this->makeFailedNotification();

        // Kirim ke kanal yang pasti gagal (nomor & email tidak valid).
        $result = app(Notifier::class)->sendWithFallback(
            recipientPhone: 'invalid',
            recipientEmail: 'not-an-email',
            subject: 'Subjek',
            message: 'Pesan',
            siklusId: $notif['siklus_id'],
            jenis: 'tagihan_h3',
            context: ['nama_faskes' => 'RS Srcaba'],
        );

        $this->assertEquals('gagal', $result['status']);

        $stored = NotifikasiTagihan::find($result['notifikasi_id']);
        $this->assertIsArray($stored->payload['context']);
        $this->assertEquals('RS Srcaba', $stored->payload['context']['nama_faskes']);
    }

    public function test_notifikasi_yang_dimatikan_tidak_masuk_antrean_retry(): void
    {
        NotifikasiTemplate::updateOrCreate(
            ['channel' => 'whatsapp', 'jenis' => 'tagihan_h3'],
            ['aktif' => false]
        );
        NotifikasiTemplate::updateOrCreate(
            ['channel' => 'email', 'jenis' => 'tagihan_h3'],
            ['aktif' => false]
        );

        $notif = $this->makeFailedNotification();

        $result = app(Notifier::class)->sendWithFallback(
            recipientPhone: '081234567890',
            recipientEmail: 'rs@example.com',
            subject: 'Subjek',
            message: 'Pesan',
            siklusId: $notif['siklus_id'],
            jenis: 'tagihan_h3',
        );

        $this->assertEquals('gagal', $result['status']);

        $stored = NotifikasiTagihan::find($result['notifikasi_id']);
        $this->assertEquals(Notifier::MAX_ATTEMPTS, $stored->attempt_count);
        $this->assertNull($stored->next_retry_at);
    }

    // ─── Integrasi controller: template dipakai saat kirim tagihan ─────────

    public function test_tagihan_whatsapp_memakai_template_tersimpan(): void
    {
        $invoice = $this->makeInvoice();

        NotifikasiTemplate::updateOrCreate(
            ['channel' => 'whatsapp', 'jenis' => 'tagihan_invoice'],
            [
                'subject' => 'Tagihan {{nomor_invoice}}',
                'body' => 'Halo {{nama_faskes}}, tagihan Anda Rp {{total_tagihan}}.',
            ]
        );

        $terkirim = null;
        $wa = \Mockery::mock(\App\Services\Notification\WhatsAppChannel::class);
        $wa->shouldReceive('send')->once()->andReturnUsing(function ($to, $subject, $message) use (&$terkirim) {
            $terkirim = compact('to', 'subject', 'message');
            return true;
        });
        $wa->shouldReceive('getLastError')->andReturn(null);
        $this->app->instance(\App\Services\Notification\WhatsAppChannel::class, $wa);

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson("/api/invoice/{$invoice->id}/tagihan/send", ['channel' => 'whatsapp'])
            ->assertOk();

        $this->assertNotNull($terkirim, 'Pesan WhatsApp tidak terkirim.');
        $this->assertSame('Tagihan '.$invoice->nomor_invoice, $terkirim['subject']);
        $this->assertSame('Halo RS Template Test, tagihan Anda Rp 5.000.000.', $terkirim['message']);
    }

    public function test_tagihan_whatsapp_yang_dimatikan_tidak_dikirim(): void
    {
        $invoice = $this->makeInvoice();

        NotifikasiTemplate::updateOrCreate(
            ['channel' => 'whatsapp', 'jenis' => 'tagihan_invoice'],
            ['aktif' => false]
        );

        $wa = \Mockery::mock(\App\Services\Notification\WhatsAppChannel::class);
        $wa->shouldNotReceive('send');
        $this->app->instance(\App\Services\Notification\WhatsAppChannel::class, $wa);

        $res = $this->actingAs($this->admin(), 'sanctum')
            ->postJson("/api/invoice/{$invoice->id}/tagihan/send", ['channel' => 'whatsapp'])
            ->assertOk();

        $hasil = collect($res->json('data.results'))->firstWhere('channel', 'whatsapp');

        $this->assertSame('gagal', $hasil['status']);
        $this->assertStringContainsString('dimatikan', $hasil['error']);
        $this->assertDatabaseMissing('notifikasi_tagihan', [
            'jenis' => 'tagihan_invoice',
            'status' => 'terkirim',
        ]);
    }

    /**
     * Siklus + faskes minimal untuk persist notifikasi.
     */
    private function makeFailedNotification(): array
    {
        $faskes = \App\Models\Faskes::create([
            'id' => (string) Str::uuid(),
            'nama' => 'RS Template Test',
            'tipe_faskes' => 'Rumah Sakit',
            'alamat' => 'Jl. Test',
            'status' => 'Aktif',
            'telepon' => '081234567890',
            'email' => 'rs@example.com',
        ]);

        $siklus = \App\Models\SiklusAkreditasi::create([
            'id' => (string) Str::uuid(),
            'faskes_id' => $faskes->id,
            'lembaga_id' => $this->lembagaId(),
            'tanggal_pengajuan' => now()->subDays(5)->toDateString(),
            'status' => 'survei_berjalan',
            'status_kelengkapan' => 'lengkap',
            'created_at' => now()->subDays(5),
        ]);

        return ['siklus_id' => $siklus->id, 'faskes' => $faskes];
    }

    /**
     * Invoice siap-kirim (faskes + siklus + pks + invoice).
     */
    private function makeInvoice(): \App\Models\Invoice
    {
        $faskes = \App\Models\Faskes::create([
            'id' => (string) Str::uuid(),
            'nama' => 'RS Template Test',
            'tipe_faskes' => 'Rumah Sakit',
            'alamat' => 'Jl. Test',
            'status' => 'Aktif',
            'telepon' => '081234567890',
            'email' => 'rs@example.com',
            'lembaga_id' => $this->lembagaId(),
        ]);

        $siklus = \App\Models\SiklusAkreditasi::create([
            'id' => (string) Str::uuid(),
            'faskes_id' => $faskes->id,
            'lembaga_id' => $this->lembagaId(),
            'tanggal_pengajuan' => now()->subDays(5)->toDateString(),
            'status' => 'survei_berjalan',
            'status_kelengkapan' => 'lengkap',
            'created_at' => now()->subDays(5),
        ]);

        $pks = \App\Models\Pks::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'nomor_pks' => 'PKS/TPL/'.strtoupper(Str::random(4)),
            'dibuat_oleh' => $this->admin()->id,
            'status' => \App\Models\Pks::STATUS_DISETUJUI,
            'tanggal_disetujui' => now()->subDays(5)->toDateString(),
        ]);

        return \App\Models\Invoice::create([
            'id' => (string) Str::uuid(),
            'pks_id' => $pks->id,
            'siklus_id' => $siklus->id,
            'nomor_invoice' => 'INV/TPL/'.strtoupper(Str::random(4)),
            'dibuat_oleh' => $this->admin()->id,
            'total_tagihan' => 5_000_000,
            'status' => \App\Models\Invoice::STATUS_BELUM_BAYAR,
            'diterbitkan_pada' => now()->subDays(5),
            'due_date' => now()->addDays(12)->toDateString(),
        ]);
    }
}
