<?php

namespace Tests\Feature;

use App\Models\AkunPengguna;
use App\Models\Faskes;
use App\Models\Invoice;
use App\Models\KonfigurasiPenugasan;
use App\Models\Laporan;
use App\Models\LaporanVerifikasi;
use App\Models\Penugasan;
use App\Models\Pks;
use App\Models\Role;
use App\Models\SiklusAkreditasi;
use App\Models\TenagaAhli;
use App\Services\Keuangan\LedgerService;
use App\Services\Rekomendasi\DefaultReksaService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Status siklus pada daftar pendaftaran.
 *
 * Kolom `status` siklus hanya ditulis oleh alur kontrak & pembayaran, sehingga
 * siklus yang sudah diverifikasi dan disetujui reksa masih terbaca "Aktif".
 * Penanda tuntas yang dipakai API adalah `tahapan` (>= 7).
 */
class SiklusStatusTuntasTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    private function actingAsAdmin(): static
    {
        return $this->actingAs(AkunPengguna::where('email', 'admin@erp.local')->firstOrFail(), 'sanctum');
    }

    /**
     * Lembaga & faskes milik admin, supaya data uji terlihat oleh session
     * global scope yang dipakai endpoint pendaftaran.
     */
    private function lemmaDanFaskes(): array
    {
        $lembagaId = AkunPengguna::where('email', 'admin@erp.local')->firstOrFail()->lembaga_id;
        $faskes = Faskes::where('lembaga_id', $lembagaId)->firstOrFail();

        return [$lembagaId, $faskes];
    }

    private function buatSiklus(string $status, ?int $tahapan, ?string $statusInvoice = null): SiklusAkreditasi
    {
        [$lembagaId, $faskes] = $this->lemmaDanFaskes();

        $siklus = SiklusAkreditasi::create([
            'id' => (string) Str::uuid(),
            'faskes_id' => $faskes->id,
            'lembaga_id' => $lembagaId,
            'tanggal_pengajuan' => now()->toDateString(),
            'status' => $status,
            'tahapan' => $tahapan,
            'status_kelengkapan' => 'lengkap',
            'created_at' => now(),
        ]);

        if ($statusInvoice !== null) {
            $pks = Pks::create([
                'id' => (string) Str::uuid(),
                'siklus_id' => $siklus->id,
                'nomor_pks' => 'PKS/TEST/'.strtoupper(Str::random(6)),
                'dibuat_oleh' => AkunPengguna::where('email', 'admin@erp.local')->firstOrFail()->id,
                'status' => Pks::STATUS_DISETUJUI,
                'tanggal_disetujui' => now()->toDateString(),
                'tanda_tangan_pada' => now(),
                'nama_penandatangan' => 'Dr. Test Faskes',
                'jabatan_penandatangan' => 'Direktur',
            ]);

            Invoice::create([
                'id' => (string) Str::uuid(),
                'pks_id' => $pks->id,
                'siklus_id' => $siklus->id,
                'nomor_invoice' => 'INV/'.strtoupper(Str::random(8)),
                'dibuat_oleh' => AkunPengguna::where('email', 'admin@erp.local')->firstOrFail()->id,
                'total_tagihan' => 1000000,
                'status' => $statusInvoice,
                'diterbitkan_pada' => now(),
                'due_date' => now()->addDays(30)->toDateString(),
                'tanggal_lunas' => now(),
            ]);
        }

        return $siklus;
    }

    private function statusDiDaftarPendaftaran(string $siklusId): ?string
    {
        $resp = $this->actingAsAdmin()->getJson('/api/pendaftaran/siklus');
        $resp->assertOk();

        $baris = collect($resp->json('data'))->firstWhere('id', $siklusId);

        return $baris['status'] ?? null;
    }

    public function test_siklus_tuntas_ditampilkan_sebagai_selesai(): void
    {
        // Status 'aktif' sisa dari alur pembayaran; verifikasi & reksa sudah lewat.
        $siklus = $this->buatSiklus('aktif', 7, 'lunas');

        $this->assertSame('selesai', $this->statusDiDaftarPendaftaran($siklus->id));
    }

    public function test_detail_siklus_tuntas_ditampilkan_sebagai_selesai(): void
    {
        $siklus = $this->buatSiklus('aktif', 7, 'lunas');

        $resp = $this->actingAsAdmin()->getJson("/api/pendaftaran/siklus/{$siklus->id}");

        $resp->assertOk()->assertJsonPath('data.status', 'selesai');
    }

    public function test_siklus_yang_masih_berjalan_menampilkan_status_aslinya(): void
    {
        $siklus = $this->buatSiklus('aktif', 5);

        $this->assertSame('aktif', $this->statusDiDaftarPendaftaran($siklus->id));
    }

    /**
     * Dashboard harus menampilkan status siklus yang sama dengan Pendaftaran
     * dan Kontrak & Invoicing — kalau tidak, user melihat "Aktif" di Dashboard
     * tapi "Selesai" di halaman lain untuk siklus yang sama.
     */
    public function test_dashboard_menampilkan_status_sama_dengan_pendaftaran(): void
    {
        $siklus = $this->buatSiklus('aktif', 7, 'lunas');

        $resp = $this->actingAsAdmin()->getJson('/api/admin/dashboard');
        $resp->assertOk();

        $baris = collect($resp->json('recent_siklus'))->firstWhere('id', $siklus->id);

        $this->assertNotNull($baris, 'Siklus tidak muncul di daftar dashboard.');
        $this->assertSame('selesai', $baris['status']);
    }

    public function test_dashboard_menampilkan_status_asli_siklus_yang_masih_berjalan(): void
    {
        $siklus = $this->buatSiklus('aktif', 5);

        $resp = $this->actingAsAdmin()->getJson('/api/admin/dashboard');
        $resp->assertOk();

        $baris = collect($resp->json('recent_siklus'))->firstWhere('id', $siklus->id);

        $this->assertNotNull($baris, 'Siklus tidak muncul di daftar dashboard.');
        $this->assertSame('aktif', $baris['status']);
    }

    public function test_siklus_menunggu_pembayaran_dengan_invoice_lunas_menampilkan_status_invoice(): void
    {
        $siklus = $this->buatSiklus('menunggu_pembayaran', 4, 'lunas');

        $this->assertSame('lunas', $this->statusDiDaftarPendaftaran($siklus->id));
    }

    public function test_persetujuan_reksa_menandai_siklus_selesai(): void
    {
        [$lv, $siklus] = $this->buatLaporanVerifikasiTuntas();

        // Ledger honor di-mock: yang diuji di sini adalah penandaan siklus.
        $this->mock(LedgerService::class)->shouldReceive('triggerHonorSetelahRekomendasi')
            ->once()
            ->andReturn(['entries' => [], 'notifikasi' => null]);

        $reksa = $this->buatReksa($siklus->lembaga_id);
        KonfigurasiPenugasan::set(DefaultReksaService::KUNCI, $reksa->id, $siklus->lembaga_id);

        $resp = $this->actingAs($reksa, 'sanctum')
            ->postJson("/api/rekomendasi/{$lv->id}/setujui");

        $resp->assertOk();

        $siklus->refresh();
        $this->assertSame('selesai', $siklus->status);
        $this->assertSame(7, (int) $siklus->tahapan);
    }

    /**
     * Laporan verifikasi final yang siklusnya belum ditandai selesai.
     */
    private function buatLaporanVerifikasiTuntas(): array
    {
        [$lembagaId, $faskes] = $this->lemmaDanFaskes();

        $siklus = SiklusAkreditasi::create([
            'id' => (string) Str::uuid(),
            'faskes_id' => $faskes->id,
            'lembaga_id' => $lembagaId,
            'tanggal_pengajuan' => now()->toDateString(),
            'status' => 'aktif',
            'tahapan' => 7,
            'status_kelengkapan' => 'lengkap',
            'created_at' => now(),
        ]);

        $surveior = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-ST-'.strtoupper(Str::random(6)),
            'nama' => 'Surveior Status Test',
            'peran' => 'surveior',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
            'lembaga_id' => $lembagaId,
        ]);

        $penugasanSurvei = Penugasan::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'tenaga_ahli_id' => $surveior->id,
            'jenis' => 'survei',
            'status' => 'selesai',
        ]);

        $laporan = Laporan::create([
            'id' => (string) Str::uuid(),
            'penugasan_id' => $penugasanSurvei->id,
            'tipe' => 'survei',
            'submitted_at' => now(),
        ]);

        $verifikator = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-ST-'.strtoupper(Str::random(6)),
            'nama' => 'Verifikator Status Test',
            'peran' => 'verifikator',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
            'lembaga_id' => $lembagaId,
        ]);

        $penugasanVerifikasi = Penugasan::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'tenaga_ahli_id' => $verifikator->id,
            'jenis' => 'verifikasi',
            'status' => 'selesai',
        ]);

        $lv = LaporanVerifikasi::create([
            'id' => (string) Str::uuid(),
            'laporan_id' => $laporan->id,
            'verifikasi_penugasan_id' => $penugasanVerifikasi->id,
            'status_final' => LaporanVerifikasi::STATUS_FINAL,
            'finalized_at' => now(),
            'status_rekomendasi' => LaporanVerifikasi::STATUS_REKOMENDASI_MENUNGGU,
        ]);

        return [$lv, $siklus];
    }

    /**
     * Reksa milik satu lembaga, dibuat lengkap dengan tenaga ahlinya.
     */
    private function buatReksa(string $lembagaId): AkunPengguna
    {
        $ta = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'RKS-'.strtoupper(Str::random(6)),
            'nama' => 'Reksa Status Test',
            'peran' => 'rekomendator',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
            'lembaga_id' => $lembagaId,
        ]);

        $role = Role::where('nama_role', DefaultReksaService::ROLE_REKSA)->firstOrFail();

        $akun = AkunPengguna::create([
            'id' => (string) Str::uuid(),
            'role_id' => $role->id,
            'tenaga_ahli_id' => $ta->id,
            'nama' => 'Reksa Status Test',
            'email' => 'reksa-status-'.strtolower(Str::random(8)).'@test.local',
            'password_hash' => bcrypt('password'),
            'status_akun' => 'Aktif',
            'failed_login_attempts' => 0,
            'lembaga_id' => $lembagaId,
            'created_at' => now(),
        ]);

        $akun->lembagas()->sync([$lembagaId]);

        return $akun;
    }
}
