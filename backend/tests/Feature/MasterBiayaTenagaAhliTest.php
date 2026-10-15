<?php

namespace Tests\Feature;

use App\Models\AkunPengguna;
use App\Models\Faskes;
use App\Models\JenisFaskes;
use App\Models\Lembaga;
use App\Models\MasterBiayaTenagaAhli;
use App\Models\Penugasan;
use App\Models\SiklusAkreditasi;
use App\Models\TenagaAhli;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\KonfigurasiPajakSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class MasterBiayaTenagaAhliTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->seed(KonfigurasiPajakSeeder::class);
    }

    private function actingAsAdmin(): static
    {
        return $this->actingAs(AkunPengguna::where('email', 'admin@erp.local')->firstOrFail(), 'sanctum');
    }

    public function test_admin_can_list_master_biaya(): void
    {
        $resp = $this->actingAsAdmin()->getJson('/api/penugasan/master-biaya');
        $resp->assertOk()
            ->assertJsonStructure(['data', 'jenis_faskes_tersedia', 'tarif_pajak_aktif']);
    }

    public function test_admin_can_create_master_biaya(): void
    {
        $resp = $this->actingAsAdmin()->postJson('/api/penugasan/master-biaya', [
            'peran' => 'surveior',
            'tipe_faskes' => 'KLINIK',
            'tarif_dasar' => 3000000,
            'keterangan' => 'Test entry',
        ]);
        $resp->assertStatus(201)
            ->assertJsonPath('data.peran', 'surveior')
            ->assertJsonPath('data.tipe_faskes', 'KLINIK')
            ->assertJsonPath('data.tarif_dasar', '3000000.00')
            ->assertJsonPath('data.aktif', true);
    }

    public function test_create_duplicate_active_returns_409(): void
    {
        MasterBiayaTenagaAhli::create([
            'id' => (string) Str::uuid(),
            'peran' => 'surveior',
            'tipe_faskes' => 'KLINIK',
            'tarif_dasar' => 3000000,
            'aktif' => true,
        ]);

        $resp = $this->actingAsAdmin()->postJson('/api/penugasan/master-biaya', [
            'peran' => 'surveior',
            'tipe_faskes' => 'KLINIK',
            'tarif_dasar' => 3500000,
        ]);
        $resp->assertStatus(409);
    }

    public function test_create_with_invalid_tipe_faskes_returns_422(): void
    {
        $resp = $this->actingAsAdmin()->postJson('/api/penugasan/master-biaya', [
            'peran' => 'surveior',
            'tipe_faskes' => 'INVALID',
            'tarif_dasar' => 1000000,
        ]);
        $resp->assertStatus(422);
    }

    public function test_admin_can_update_tarif_dasar(): void
    {
        $row = MasterBiayaTenagaAhli::create([
            'id' => (string) Str::uuid(),
            'peran' => 'verifikator',
            'tipe_faskes' => 'PUSKESMAS',
            'tarif_dasar' => 1500000,
            'aktif' => true,
        ]);

        $resp = $this->actingAsAdmin()->putJson("/api/penugasan/master-biaya/{$row->id}", [
            'tarif_dasar' => 2000000,
        ]);
        $resp->assertOk()
            ->assertJsonPath('data.tarif_dasar', '2000000.00');
    }

    public function test_deactivate_sets_aktif_false(): void
    {
        $row = MasterBiayaTenagaAhli::create([
            'id' => (string) Str::uuid(),
            'peran' => 'verifikator',
            'tipe_faskes' => 'PUSKESMAS',
            'tarif_dasar' => 1500000,
            'aktif' => true,
        ]);

        $resp = $this->actingAsAdmin()->deleteJson("/api/penugasan/master-biaya/{$row->id}");
        $resp->assertOk();

        $row->refresh();
        $this->assertFalse($row->aktif);
    }

    public function test_resolve_bruto_returns_active_row(): void
    {
        MasterBiayaTenagaAhli::create([
            'id' => (string) Str::uuid(),
            'peran' => 'surveior',
            'tipe_faskes' => 'KLINIK',
            'tarif_dasar' => 5000000,
            'aktif' => true,
        ]);
        MasterBiayaTenagaAhli::create([
            'id' => (string) Str::uuid(),
            'peran' => 'surveior',
            'tipe_faskes' => 'KLINIK',
            'tarif_dasar' => 9999999,
            'aktif' => false, // inactive, harus di-skip
        ]);

        $resolved = MasterBiayaTenagaAhli::resolveBruto('surveior', 'KLINIK');
        $this->assertNotNull($resolved);
        $this->assertEquals('5000000.00', (string) $resolved->tarif_dasar);
    }

    public function test_resolve_bruto_returns_null_if_no_match(): void
    {
        $resolved = MasterBiayaTenagaAhli::resolveBruto('surveior', 'KLINIK');
        $this->assertNull($resolved);
    }

    public function test_ledger_service_uses_master_biaya_when_present(): void
    {
        // Setup siklus dengan faskes tipe KLINIK
        $faskes = Faskes::first();
        $faskes->forceFill(['jenis_faskes_id' => JenisFaskes::where('kode', 'KLINIK')->first()->id])->save();

        $siklus = SiklusAkreditasi::create([
            'id' => (string) Str::uuid(),
            'faskes_id' => $faskes->id,
            'lembaga_id' => Lembaga::first()->id,
            'tanggal_pengajuan' => now()->toDateString(),
            'status' => 'aktif',
            'status_kelengkapan' => 'lengkap',
        ]);

        $ta = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-MB-TEST',
            'nama' => 'TA Test MB',
            'peran' => 'surveior',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'sedang_bertugas',
        ]);

        $penugasan = Penugasan::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'tenaga_ahli_id' => $ta->id,
            'jenis' => 'survei',
            'status' => 'selesai',
        ]);

        // Master biaya: Surveior KLINIK bruto 5jt
        MasterBiayaTenagaAhli::create([
            'id' => (string) Str::uuid(),
            'peran' => 'surveior',
            'tipe_faskes' => 'KLINIK',
            'tarif_dasar' => 5000000,
            'aktif' => true,
        ]);

        $ledger = app(\App\Services\Keuangan\LedgerService::class);
        $entry = $ledger->catatHonorSurveior($penugasan);

        $this->assertNotNull($entry);
        $this->assertEquals(5000000.00, (float) $entry->nominal_bruto);
        // PPN tidak dipotong dari honor (penerima individu/non-PKP)
        $this->assertEquals(0, (float) $entry->potongan_ppn);
        // PPh progresif 5% × DPP (50% × 5jt = 2.5jt) = 125.000
        $this->assertEquals(125000.00, (float) $entry->potongan_pph);
        // Net = 5jt - 0 - 125rb = 4.875jt
        $this->assertEquals(4875000.00, (float) $entry->nominal_neto);
    }
}
