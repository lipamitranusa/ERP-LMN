<?php

namespace Tests\Feature;

use App\Models\AkunPengguna;
use App\Models\KonfigurasiPenugasan;
use App\Models\Role;
use App\Models\TenagaAhli;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Setiap lembaga punya 1 reksa, dan reksa itu milik lembaga tersebut.
 * Default reksa dicatat per-lembaga; reksa lembaga lain tidak boleh
 * dipakai sebagai default maupun masuk daftar kandidat.
 */
class ReksaPerLembagaTest extends TestCase
{
    use RefreshDatabase;

    private const LEMBAGA_LAMDAKU = '00000000-0000-0000-0000-000000000001';
    private const LEMBAGA_LIPA = '00000000-0000-0000-0000-000000000002';

    private const KUNCI = 'default_rekomendator_user_id';

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
     * Buat reksa (akun + tenaga ahli) milik satu lembaga.
     */
    private function buatReksa(string $lembagaId, string $nama): AkunPengguna
    {
        $ta = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'RKM-' . strtoupper(substr(md5($nama), 0, 6)),
            'nama' => $nama,
            'peran' => 'rekomendator',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
            'lembaga_id' => $lembagaId,
        ]);

        $role = Role::where('nama_role', 'Rekomendator')->firstOrFail();

        $akun = AkunPengguna::create([
            'id' => (string) Str::uuid(),
            'role_id' => $role->id,
            'tenaga_ahli_id' => $ta->id,
            'nama' => $nama,
            'email' => strtolower(str_replace(' ', '', $nama)) . '@test.local',
            'password_hash' => bcrypt('password'),
            'status_akun' => 'Aktif',
            'failed_login_attempts' => 0,
            'lembaga_id' => $lembagaId,
            'created_at' => now(),
        ]);

        $akun->lembagas()->sync([$lembagaId]);

        return $akun;
    }

    private function setDefaultReksa(string $lembagaId, string $userId): void
    {
        KonfigurasiPenugasan::set(self::KUNCI, $userId, $lembagaId);
    }

    public function test_default_reksa_lembaga_lain_tidak_dipakai_untuk_lembaga_aktif(): void
    {
        $reksaLipa = $this->buatReksa(self::LEMBAGA_LIPA, 'Reksa Lipa');

        // LAMDAKU menunjuk reksa milik LIPA — tidak boleh berlaku di LAMDAKU.
        $this->setDefaultReksa(self::LEMBAGA_LAMDAKU, $reksaLipa->id);
        $this->setDefaultReksa(self::LEMBAGA_LIPA, $reksaLipa->id);

        $response = $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/rekomendator/default?lembaga_id=' . self::LEMBAGA_LAMDAKU);

        $response->assertOk()->assertJsonPath('data', null);
    }

    public function test_default_reksa_lembaga_aktif_terlihat(): void
    {
        $reksaLipa = $this->buatReksa(self::LEMBAGA_LIPA, 'Reksa Lipa');
        $this->setDefaultReksa(self::LEMBAGA_LIPA, $reksaLipa->id);

        $response = $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/rekomendator/default?lembaga_id=' . self::LEMBAGA_LIPA);

        $response->assertOk()
            ->assertJsonPath('data.email', $reksaLipa->email);
    }

    public function test_kandidat_hanya_akun_reksa_dari_lembaga_aktif(): void
    {
        $reksaLamdaku = $this->buatReksa(self::LEMBAGA_LAMDAKU, 'Reksa Lamdaku');
        $reksaLipa = $this->buatReksa(self::LEMBAGA_LIPA, 'Reksa Lipa');

        $response = $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/rekomendator/candidates?lembaga_id=' . self::LEMBAGA_LAMDAKU);

        $response->assertOk();
        $ids = collect($response->json('data'))->pluck('user_id')->all();

        $this->assertContains($reksaLamdaku->id, $ids);
        $this->assertNotContains($reksaLipa->id, $ids);
    }

    public function test_set_default_ditolak_untuk_reksa_lembaga_lain(): void
    {
        $reksaLipa = $this->buatReksa(self::LEMBAGA_LIPA, 'Reksa Lipa');

        $response = $this->actingAs($this->admin(), 'sanctum')
            ->putJson('/api/rekomendator/default?lembaga_id=' . self::LEMBAGA_LAMDAKU, [
                'user_id' => $reksaLipa->id,
            ]);

        $response->assertStatus(422);
        $this->assertNull(KonfigurasiPenugasan::nilaiPerLembaga(self::KUNCI, self::LEMBAGA_LAMDAKU));
    }

    public function test_set_default_tidak_menimpa_default_lembaga_lain(): void
    {
        $reksaLamdaku = $this->buatReksa(self::LEMBAGA_LAMDAKU, 'Reksa Lamdaku');
        $reksaLipa = $this->buatReksa(self::LEMBAGA_LIPA, 'Reksa Lipa');

        $this->setDefaultReksa(self::LEMBAGA_LIPA, $reksaLipa->id);

        $this->actingAs($this->admin(), 'sanctum')
            ->putJson('/api/rekomendator/default?lembaga_id=' . self::LEMBAGA_LAMDAKU, [
                'user_id' => $reksaLamdaku->id,
            ])
            ->assertOk();

        // Default LIPA tidak boleh ikut berubah.
        $this->assertSame(
            $reksaLipa->id,
            KonfigurasiPenugasan::nilaiPerLembaga(self::KUNCI, self::LEMBAGA_LIPA)
        );
        $this->assertSame(
            $reksaLamdaku->id,
            KonfigurasiPenugasan::nilaiPerLembaga(self::KUNCI, self::LEMBAGA_LAMDAKU)
        );
    }

    public function test_reksa_dengan_tenaga_ahli_lembaga_lain_tidak_masuk_kandidat(): void
    {
        // Akun reksa terdaftar di LAMDAKU, tapi TA-nya milik LIPA.
        $akun = $this->buatReksa(self::LEMBAGA_LAMDAKU, 'Reksa Salah');
        $akun->tenagaAhli->forceFill(['lembaga_id' => self::LEMBAGA_LIPA])->save();

        $response = $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/rekomendator/candidates?lembaga_id=' . self::LEMBAGA_LAMDAKU);

        $response->assertOk();
        $ids = collect($response->json('data'))->pluck('user_id')->all();
        $this->assertNotContains($akun->id, $ids);
    }

    public function test_akun_reksa_diselaraskan_dengan_lembaga_tenaga_ahlinya(): void
    {
        $ta = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'RKM-ALIGN',
            'nama' => 'Reksa Align',
            'peran' => 'rekomendator',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
            'lembaga_id' => self::LEMBAGA_LAMDAKU,
        ]);

        $role = Role::where('nama_role', 'Rekomendator')->firstOrFail();

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/master/akun?lembaga_id=' . self::LEMBAGA_LAMDAKU, [
                'nama' => 'Reksa Align',
                'email' => 'reksa-align@test.local',
                'role_id' => $role->id,
                'tenaga_ahli_id' => $ta->id,
                'lembaga_ids' => [self::LEMBAGA_LIPA],
                'status_akun' => 'Aktif',
            ])
            ->assertCreated();

        $akun = AkunPengguna::where('email', 'reksa-align@test.local')->firstOrFail();

        // Akun harus ikut ke lembaga TA-nya dan itu yang jadi default.
        $this->assertSame(self::LEMBAGA_LAMDAKU, $akun->lembaga_id);
        $this->assertTrue($akun->lembagas()->where('lembaga.id', self::LEMBAGA_LAMDAKU)->exists());
    }

    public function test_migration_menyesuaikan_default_reksa_ke_reksa_lembaga_tersebut(): void
    {
        $reksaLipa = $this->buatReksa(self::LEMBAGA_LIPA, 'Reksa Lipa');
        $reksaLamdaku = $this->buatReksa(self::LEMBAGA_LAMDAKU, 'Reksa Lamdaku');

        // LAMDAKU salah menunjuk reksa milik LIPA.
        $this->setDefaultReksa(self::LEMBAGA_LAMDAKU, $reksaLipa->id);
        $this->setDefaultReksa(self::LEMBAGA_LIPA, $reksaLipa->id);

        $migration = require database_path('migrations/2026_10_28_160000_cleanup_default_rekomendator_per_lembaga.php');
        $migration->up();

        // Default LAMDAKU diarahkan ke reksa LAMDAKU, default LIPA tidak berubah.
        $this->assertSame(
            $reksaLamdaku->id,
            KonfigurasiPenugasan::nilaiPerLembaga(self::KUNCI, self::LEMBAGA_LAMDAKU)
        );
        $this->assertSame(
            $reksaLipa->id,
            KonfigurasiPenugasan::nilaiPerLembaga(self::KUNCI, self::LEMBAGA_LIPA)
        );
    }

    public function test_migration_menghapus_default_reksa_lintas_lembaga_bila_tidak_ada_kandidat(): void
    {
        $reksaLipa = $this->buatReksa(self::LEMBAGA_LIPA, 'Reksa Lipa');

        // LAMDAKU tanpa reksa sendiri, tapi menunjuk reksa LIPA.
        $this->setDefaultReksa(self::LEMBAGA_LAMDAKU, $reksaLipa->id);
        $this->setDefaultReksa(self::LEMBAGA_LIPA, $reksaLipa->id);

        $migration = require database_path('migrations/2026_10_28_160000_cleanup_default_rekomendator_per_lembaga.php');
        $migration->up();

        $this->assertNull(KonfigurasiPenugasan::nilaiPerLembaga(self::KUNCI, self::LEMBAGA_LAMDAKU));
        $this->assertSame(
            $reksaLipa->id,
            KonfigurasiPenugasan::nilaiPerLembaga(self::KUNCI, self::LEMBAGA_LIPA)
        );
    }
}
