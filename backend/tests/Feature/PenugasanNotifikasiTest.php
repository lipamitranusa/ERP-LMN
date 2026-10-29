<?php

namespace Tests\Feature;

use App\Models\AkunPengguna;
use App\Models\Faskes;
use App\Models\SiklusAkreditasi;
use App\Models\TenagaAhli;
use App\Models\WhatsAppSetting;
use App\Services\Notification\WhatsAppChannel;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Mockery;
use Tests\TestCase;

/**
 * Notifikasi "penugasan baru" ke tenaga ahli.
 *
 * Saat admin menugaskan tenaga ahli, sistem harus mengirim notifikasi
 * WhatsApp ke nomor WA pada master tenaga ahli (`tenaga_ahli.no_wa`).
 * Sakelarnya ada di tab "Notifikasi" (Pengaturan WhatsApp).
 */
class PenugasanNotifikasiTest extends TestCase
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

    private function lemmaId(): string
    {
        return $this->admin()->lembaga_id ?? \App\Models\Lembaga::first()->id;
    }

    private function createSiklus(): SiklusAkreditasi
    {
        $faskes = Faskes::create([
            'id' => (string) Str::uuid(),
            'nama' => 'RS Notifikasi',
            'tipe_faskes' => 'Rumah Sakit',
            'alamat' => 'Jl. Test No. 1',
            'status' => 'Aktif',
            'telepon' => '081200000000',
            'email' => 'rs-notif@example.com',
            'lembaga_id' => $this->lemmaId(),
        ]);

        return SiklusAkreditasi::create([
            'id' => (string) Str::uuid(),
            'faskes_id' => $faskes->id,
            'lembaga_id' => $this->lemmaId(),
            'tanggal_pengajuan' => now()->toDateString(),
            'status' => 'menunggu_dokumen',
            'status_kelengkapan' => 'lengkap',
            'created_at' => now(),
        ]);
    }

    private function createTenagaAhli(string $kode, string $nama, string $noWa, string $jenis): TenagaAhli
    {
        return TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => $kode,
            'nama' => $nama,
            'no_wa' => $noWa,
            'peran' => 'surveior',
            'jenis' => $jenis,
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
            'lembaga_id' => $this->lemmaId(),
        ]);
    }

    public function test_appoint_mengirim_notifikasi_whatsapp_ke_no_wa_master_tenaga_ahli(): void
    {
        $siklus = $this->createSiklus();
        $taTkpp = $this->createTenagaAhli('NIS-NOTIF-TKPP', 'TKPP Notifikasi', '081234567890', TenagaAhli::JENIS_TKPP);
        $taTksdu = $this->createTenagaAhli('NIS-NOTIF-TKSDU', 'TKSDU Notifikasi', '081298765432', TenagaAhli::JENIS_TKSDU);

        $terkirim = [];
        $wa = Mockery::mock(WhatsAppChannel::class);
        $wa->shouldReceive('send')->twice()->andReturnUsing(function ($to, $subject, $message) use (&$terkirim) {
            $terkirim[] = compact('to', 'subject', 'message');
            return true;
        });
        $wa->shouldReceive('getLastError')->andReturn(null);
        $this->app->instance(WhatsAppChannel::class, $wa);

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/penugasan/appoint', [
                'siklus_id' => $siklus->id,
                'jenis' => 'survei',
                'tenaga_ahli_ids' => [$taTkpp->id, $taTksdu->id],
            ])
            ->assertOk();

        $this->assertCount(2, $terkirim, 'Setiap tenaga ahli yang ditugaskan harus dikabari.');
        $this->assertSame('081234567890', $terkirim[0]['to']);
        $this->assertSame('081298765432', $terkirim[1]['to']);
        $this->assertStringContainsString('TKPP Notifikasi', $terkirim[0]['message']);
        $this->assertStringContainsString('RS Notifikasi', $terkirim[0]['message']);

        $this->assertDatabaseHas('notifikasi_tagihan', [
            'jenis' => 'penugasan_baru',
            'recipient' => '081234567890',
            'status' => 'terkirim',
        ]);
    }

    public function test_notifikasi_penugasan_tidak_dikirim_kalau_setting_whatsapp_dimatikan(): void
    {
        WhatsAppSetting::updateOrCreate(
            ['kategori' => 'notifikasi', 'kunci' => 'notify_penugasan_baru'],
            ['nilai' => '0']
        );

        $siklus = $this->createSiklus();
        $taTkpp = $this->createTenagaAhli('NIS-NOTIF-OFF-TKPP', 'TKPP Notifikasi Mati', '081234567890', TenagaAhli::JENIS_TKPP);
        $taTksdu = $this->createTenagaAhli('NIS-NOTIF-OFF-TKSDU', 'TKSDU Notifikasi Mati', '081298765432', TenagaAhli::JENIS_TKSDU);

        $wa = Mockery::mock(WhatsAppChannel::class);
        $wa->shouldNotReceive('send');
        $this->app->instance(WhatsAppChannel::class, $wa);

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/penugasan/appoint', [
                'siklus_id' => $siklus->id,
                'jenis' => 'survei',
                'tenaga_ahli_ids' => [$taTkpp->id, $taTksdu->id],
            ])
            ->assertOk();

        $this->assertDatabaseMissing('notifikasi_tagihan', [
            'jenis' => 'penugasan_baru',
            'status' => 'terkirim',
        ]);
    }
}
