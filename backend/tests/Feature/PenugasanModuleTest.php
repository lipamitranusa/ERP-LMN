<?php

namespace Tests\Feature;

use App\Models\AkunPengguna;
use App\Models\Faskes;
use App\Models\HistoriAntrianPenugasan;
use App\Models\KonfigurasiPenugasan;
use App\Models\Lembaga;
use App\Models\LaporanKendala;
use App\Models\Penugasan;
use App\Models\SiklusAkreditasi;
use App\Models\SuratTugas;
use App\Models\TenagaAhli;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class PenugasanModuleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->seed(DatabaseSeeder::class);

        // FR-3.7: Exclude ALL seeded surveiors from queue tests by marking them as
        // "sedang_bertugas". Seed data creates NS-0001 through NS-0005 as aktif
        // surveiors with their own HistoriAntrianPenugasan entries. NS-0008 (peran='kedua')
        // also needs exclusion since it has nomor_urut=0 and would win over test TAs.
        // We must exclude all of them so only the test-created TA1/TA2 appear in the eligible queue.
        // Verifikator (NS-0002 role) has no FR-3.7 block, so we just bump their
        // histori nomor_urut to 999 to ensure test verifikators win the sort.
        $demoSurveiors = TenagaAhli::whereIn('nomor_induk_surveior', [
            'NS-0001', 'NS-0003', 'NS-0004', 'NS-0005', 'NS-0008',
        ])->where('status_penugasan_saat_ini', '!=', 'sedang_bertugas')->get();
        foreach ($demoSurveiors as $demo) {
            $demo->forceFill(['status_penugasan_saat_ini' => 'sedang_bertugas'])->save();
            HistoriAntrianPenugasan::where('tenaga_ahli_id', $demo->id)
                ->where('peran', 'surveior')
                ->update(['nomor_urut' => 999]);
        }
        $demoVerifikator = TenagaAhli::where('nomor_induk_surveior', 'NS-0002')->first();
        if ($demoVerifikator) {
            HistoriAntrianPenugasan::where('tenaga_ahli_id', $demoVerifikator->id)
                ->where('peran', 'verifikator')
                ->update(['nomor_urut' => 999]);
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function actingAsAdmin(): static
    {
        return $this->actingAs(AkunPengguna::where('email', 'admin@erp.local')->firstOrFail(), 'sanctum');
    }

    private function actingAsSurveior(): static
    {
        $user = AkunPengguna::where('email', 'ns-0001@surveyor.local')->firstOrFail();
        return $this->actingAs($user, 'sanctum');
    }

    private function actingAsVerifikator(): static
    {
        $user = AkunPengguna::where('email', 'ns-0002@surveyor.local')->firstOrFail();
        return $this->actingAs($user, 'sanctum');
    }

    private function actingAsSDM(): static
    {
        $user = AkunPengguna::where('email', 'sdm@lembaga.local')->firstOrFail();
        return $this->actingAs($user, 'sanctum');
    }

    private function createSiklus(): SiklusAkreditasi
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

    // ─── FR-3.1: Surat Tugas PDF ─────────────────────────────────────────────

    public function test_admin_can_issue_surat_tugas_pdf(): void
    {
        $siklus = $this->createSiklus();
        $surveior = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-001',
            'nama' => 'Dr. Surveior Satu',
            'peran' => 'surveior',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
        ]);

        $penugasan = Penugasan::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'tenaga_ahli_id' => $surveior->id,
            'jenis' => 'survei',
            'status' => 'menunggu',
        ]);

        $resp = $this->actingAsAdmin()->postJson('/api/penugasan/surat-tugas', [
            'penugasan_id' => $penugasan->id,
        ]);

        $resp->assertCreated()
            ->assertJsonPath('data.penugasan_id', $penugasan->id);

        $this->assertDatabaseHas('surat_tugas', [
            'penugasan_id' => $penugasan->id,
            'diterbitkan_oleh' => AkunPengguna::where('email', 'admin@erp.local')->first()->id,
        ]);

        Storage::disk('local')->assertExists($resp->json('data.path_pdf'));
    }

    public function test_surat_tugas_generates_sequential_nomor_surat(): void
    {
        $siklus = $this->createSiklus();
        $surveior = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-001',
            'nama' => 'Dr. Surveior Satu',
            'peran' => 'surveior',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
        ]);

        for ($i = 1; $i <= 3; $i++) {
            $p = Penugasan::create([
                'id' => (string) Str::uuid(),
                'siklus_id' => $siklus->id,
                'tenaga_ahli_id' => $surveior->id,
                'jenis' => 'survei',
                'status' => 'menunggu',
            ]);

            $resp = $this->actingAsAdmin()->postJson('/api/penugasan/surat-tugas', [
                'penugasan_id' => $p->id,
            ]);
            $resp->assertCreated();
        }

        $all = SuratTugas::all();
        $this->assertEquals(3, $all->count());
        $this->assertStringContainsString('ST-', $all[0]->nomor_surat);
    }

    public function test_duplicate_surat_tugas_for_same_penugasan_rejected(): void
    {
        $siklus = $this->createSiklus();
        $surveior = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-001',
            'nama' => 'Dr. Surveior Satu',
            'peran' => 'surveior',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
        ]);

        $penugasan = Penugasan::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'tenaga_ahli_id' => $surveior->id,
            'jenis' => 'survei',
            'status' => 'menunggu',
        ]);

        $this->actingAsAdmin()->postJson('/api/penugasan/surat-tugas', [
            'penugasan_id' => $penugasan->id,
        ])->assertCreated();

        $this->actingAsAdmin()->postJson('/api/penugasan/surat-tugas', [
            'penugasan_id' => $penugasan->id,
        ])->assertStatus(422)
            ->assertJsonPath('message', 'Surat Tugas sudah pernah diterbitkan untuk penugasan ini.');
    }

    // ─── FR-3.2: Laporan Kendala (CoI / Force Majeure) ───────────────────────

    public function test_surveior_can_submit_conflict_of_interest_report(): void
    {
        $siklus = $this->createSiklus();
        $surveior = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-001',
            'nama' => 'Dr. Surveior Satu',
            'peran' => 'surveior',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'sedang_bertugas',
        ]);

        // Link surveior account
        $surveiorUser = AkunPengguna::where('email', 'ns-0001@surveyor.local')->first();
        $surveiorUser->forceFill(['tenaga_ahli_id' => $surveior->id])->save();

        $penugasan = Penugasan::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'tenaga_ahli_id' => $surveior->id,
            'jenis' => 'survei',
            'status' => 'sedang_bertugas',
        ]);

        $resp = $this->actingAsSurveior()->postJson('/api/penugasan/kendala', [
            'penugasan_id' => $penugasan->id,
            'jenis' => 'conflict_of_interest',
            'deskripsi' => 'Faskes ini memiliki hubungan keluarga dengan saya.',
        ]);

        $resp->assertCreated()
            ->assertJsonPath('data.jenis', 'conflict_of_interest')
            ->assertJsonPath('data.status', 'menunggu');

        $this->assertDatabaseHas('laporan_kendala', [
            'penugasan_id' => $penugasan->id,
            'jenis' => 'conflict_of_interest',
            'status' => 'menunggu',
        ]);
    }

    public function test_surveior_can_submit_force_majeure_report(): void
    {
        $siklus = $this->createSiklus();
        $surveior = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-002',
            'nama' => 'Dr. Surveior Dua',
            'peran' => 'surveior',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'sedang_bertugas',
        ]);

        $surveiorUser = AkunPengguna::where('email', 'ns-0001@surveyor.local')->first();
        $surveiorUser->forceFill(['tenaga_ahli_id' => $surveior->id])->save();

        $penugasan = Penugasan::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'tenaga_ahli_id' => $surveior->id,
            'jenis' => 'survei',
            'status' => 'sedang_bertugas',
        ]);

        $resp = $this->actingAsSurveior()->postJson('/api/penugasan/kendala', [
            'penugasan_id' => $penugasan->id,
            'jenis' => 'force_majeure',
            'deskripsi' => 'Gempa bumi di daerah setempat, akses jalan terputus.',
        ]);

        $resp->assertCreated()
            ->assertJsonPath('data.jenis', 'force_majeure');
    }

    public function test_admin_can_mark_kendala_as_proses(): void
    {
        $siklus = $this->createSiklus();
        $surveior = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-003',
            'nama' => 'Dr. Surveior Tiga',
            'peran' => 'surveior',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'sedang_bertugas',
        ]);

        $surveiorUser = AkunPengguna::where('email', 'ns-0001@surveyor.local')->first();
        $surveiorUser->forceFill(['tenaga_ahli_id' => $surveior->id])->save();

        $penugasan = Penugasan::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'tenaga_ahli_id' => $surveior->id,
            'jenis' => 'survei',
            'status' => 'sedang_bertugas',
        ]);

        $kendala = LaporanKendala::create([
            'id' => (string) Str::uuid(),
            'penugasan_id' => $penugasan->id,
            'tenaga_ahli_id' => $surveior->id,
            'jenis' => 'conflict_of_interest',
            'deskripsi' => 'Conflict of interest.',
            'status' => 'menunggu',
            'tanggal_laporan' => now(),
            'dilaporkan_oleh' => $surveiorUser->id,
        ]);

        $resp = $this->actingAsAdmin()->patchJson("/api/penugasan/kendala/{$kendala->id}/proses");

        $resp->assertOk()
            ->assertJsonPath('data.status', 'diproses');
    }

    // ─── FR-3.3 / FR-3.4 / FR-3.5: Penugasan & Konfirmasi ─────────────────

    public function test_assign_surveior_auto_offers_to_first_queue_candidate(): void
    {
        $siklus = $this->createSiklus();

        $ta1 = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-A1',
            'nama' => 'Surveior A',
            'peran' => 'surveior',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
        ]);

        $ta2 = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-A2',
            'nama' => 'Surveior B',
            'peran' => 'surveior',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
        ]);

        // Set queue order: TA1 is first
        HistoriAntrianPenugasan::create([
            'id' => (string) Str::uuid(),
            'tenaga_ahli_id' => $ta1->id,
            'peran' => 'surveior',
            'nomor_urut' => 1,
            'status_kesediaan' => 'siap',
        ]);
        HistoriAntrianPenugasan::create([
            'id' => (string) Str::uuid(),
            'tenaga_ahli_id' => $ta2->id,
            'peran' => 'surveior',
            'nomor_urut' => 2,
            'status_kesediaan' => 'siap',
        ]);

        $resp = $this->actingAsAdmin()->postJson('/api/penugasan', [
            'siklus_id' => $siklus->id,
            'jenis' => 'survei',
        ]);

        $resp->assertCreated()
            ->assertJsonPath('data.tenaga_ahli_id', $ta1->id)
            ->assertJsonPath('data.status', 'menunggu');
    }

    public function test_surveior_can_confirm_availability(): void
    {
        $siklus = $this->createSiklus();
        $surveior = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-B1',
            'nama' => 'Surveior B',
            'peran' => 'surveior',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
        ]);

        $surveiorUser = AkunPengguna::where('email', 'ns-0001@surveyor.local')->first();
        $surveiorUser->forceFill(['tenaga_ahli_id' => $surveior->id])->save();

        $penugasan = Penugasan::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'tenaga_ahli_id' => $surveior->id,
            'jenis' => 'survei',
            'status' => 'menunggu',
        ]);

        $resp = $this->actingAsSurveior()->patchJson("/api/penugasan/{$penugasan->id}/konfirmasi", [
            'konfirmasi' => true,
        ]);

        $resp->assertOk()
            ->assertJsonPath('data.status', 'sedang_bertugas');

        $surveior->refresh();
        $this->assertEquals('sedang_bertugas', $surveior->status_penugasan_saat_ini);
    }

    public function test_surveior_can_decline_requires_admin_to_replace(): void
    {
        $siklus = $this->createSiklus();

        $ta1 = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-C1',
            'nama' => 'Surveior C1',
            'peran' => 'surveior',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
        ]);
        $ta2 = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-C2',
            'nama' => 'Surveior C2',
            'peran' => 'surveior',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
        ]);

        $surveiorUser = AkunPengguna::where('email', 'ns-0001@surveyor.local')->first();
        $surveiorUser->forceFill(['tenaga_ahli_id' => $ta1->id])->save();

        // Queue: TA1 = 1, TA2 = 2
        HistoriAntrianPenugasan::create([
            'id' => (string) Str::uuid(),
            'tenaga_ahli_id' => $ta1->id,
            'peran' => 'surveior',
            'nomor_urut' => 1,
            'status_kesediaan' => 'ditawarkan',
        ]);
        HistoriAntrianPenugasan::create([
            'id' => (string) Str::uuid(),
            'tenaga_ahli_id' => $ta2->id,
            'peran' => 'surveior',
            'nomor_urut' => 2,
            'status_kesediaan' => 'siap',
        ]);

        $penugasan = Penugasan::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'tenaga_ahli_id' => $ta1->id,
            'jenis' => 'survei',
            'status' => 'menunggu',
        ]);

        // TA1 declines
        $resp = $this->actingAsSurveior()->patchJson("/api/penugasan/{$penugasan->id}/konfirmasi", [
            'konfirmasi' => false,
            'catatan' => 'Benturan jadwal.',
        ]);

        $resp->assertOk()
            ->assertJsonPath('message', 'Penolakan dicatat. Admin akan menugaskan pengganti.');

        // Penugasan harus berstatus 'ditolak' (bukan auto-replace ke TA2)
        $penugasan->refresh();
        $this->assertEquals('ditolak', $penugasan->status, 'Penugasan harus ditolak (tidak auto-replace)');
        $this->assertEquals($ta1->id, $penugasan->tenaga_ahli_id, 'Tenaga ahli tidak boleh berubah otomatis');

        // Penolakan tercatat di histori
        $histori1 = HistoriAntrianPenugasan::where('tenaga_ahli_id', $ta1->id)->first();
        $this->assertEquals('ditolak', $histori1->status_kesediaan);
        $this->assertEquals('Benturan jadwal.', $histori1->catatan_penolakan);

        // AC: TA yang menolak di-reset ke tidak_bertugas (bisa ditugas di siklus lain)
        $ta1->refresh();
        $this->assertEquals(
            'tidak_bertugas',
            $ta1->status_penugasan_saat_ini,
            'TA yang menolak harus di-reset ke tidak_bertugas agar bisa ditugas di siklus lain'
        );

        // AC: TA kedua TIDAK boleh otomatis berstatus menunggu
        $ta2->refresh();
        $this->assertEquals(
            'tidak_bertugas',
            $ta2->status_penugasan_saat_ini,
            'TA kedua TIDAK boleh otomatis di-set menunggu (admin yang harus tunjuk)'
        );
    }

    public function test_decline_marks_penugasan_ditolak(): void
    {
        // Behavior baru: surveyor decline → penugasan 'ditolak', admin wajib tunjuk ulang
        $siklus = $this->createSiklus();
        $ta1 = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-D1',
            'nama' => 'Surveior D1',
            'peran' => 'surveior',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
        ]);

        $surveiorUser = AkunPengguna::where('email', 'ns-0001@surveyor.local')->first();
        $surveiorUser->forceFill(['tenaga_ahli_id' => $ta1->id])->save();

        $penugasan = Penugasan::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'tenaga_ahli_id' => $ta1->id,
            'jenis' => 'survei',
            'status' => 'menunggu',
        ]);

        $resp = $this->actingAsSurveior()->patchJson("/api/penugasan/{$penugasan->id}/konfirmasi", [
            'konfirmasi' => false,
        ]);

        $resp->assertOk()
            ->assertJsonPath('message', 'Penolakan dicatat. Admin akan menugaskan pengganti.');

        $penugasan->refresh();
        $this->assertEquals('ditolak', $penugasan->status);
    }

    public function test_complete_assignment_resets_surveior_status(): void
    {
        $siklus = $this->createSiklus();
        $surveior = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-E1',
            'nama' => 'Surveior E',
            'peran' => 'surveior',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'sedang_bertugas',
        ]);

        $surveiorUser = AkunPengguna::where('email', 'ns-0001@surveyor.local')->first();
        $surveiorUser->forceFill(['tenaga_ahli_id' => $surveior->id])->save();

        $penugasan = Penugasan::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'tenaga_ahli_id' => $surveior->id,
            'jenis' => 'survei',
            'status' => 'sedang_bertugas',
        ]);

        $this->actingAsAdmin()->putJson("/api/penugasan/{$penugasan->id}/selesai")
            ->assertOk()
            ->assertJsonPath('data.status', 'selesai');

        $surveior->refresh();
        $this->assertEquals('tidak_bertugas', $surveior->status_penugasan_saat_ini);
    }

    // ─── FR-3.7 / AC-8: Surveior "Sedang Bertugas" cannot be assigned ──────

    public function test_ac8_surveior_sedang_bertugas_cannot_be_assigned(): void
    {
        $siklus = $this->createSiklus();

        $ta1 = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-F1',
            'nama' => 'Surveior F1',
            'peran' => 'surveior',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'sedang_bertugas', // AC-8: BLOKED
        ]);

        $ta2 = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-F2',
            'nama' => 'Surveior F2',
            'peran' => 'surveior',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas', // OK
        ]);

        HistoriAntrianPenugasan::create([
            'id' => (string) Str::uuid(),
            'tenaga_ahli_id' => $ta1->id,
            'peran' => 'surveior',
            'nomor_urut' => 1,
            'status_kesediaan' => 'siap',
        ]);
        HistoriAntrianPenugasan::create([
            'id' => (string) Str::uuid(),
            'tenaga_ahli_id' => $ta2->id,
            'peran' => 'surveior',
            'nomor_urut' => 2,
            'status_kesediaan' => 'siap',
        ]);

        $resp = $this->actingAsAdmin()->postJson('/api/penugasan', [
            'siklus_id' => $siklus->id,
            'jenis' => 'survei',
        ]);

        $resp->assertCreated()
            ->assertJsonPath('data.tenaga_ahli_id', $ta2->id) // TA1 skipped, TA2 assigned
            ->assertJsonPath('data.status', 'menunggu');
    }

    public function test_ac8_verifikator_can_have_multiple_concurrent_assignments(): void
    {
        $siklus = $this->createSiklus();

        $verifikator = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-G1',
            'nama' => 'Verifikator G',
            'peran' => 'verifikator',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'sedang_bertugas', // Same status — no block
        ]);

        HistoriAntrianPenugasan::create([
            'id' => (string) Str::uuid(),
            'tenaga_ahli_id' => $verifikator->id,
            'peran' => 'verifikator',
            'nomor_urut' => 1,
            'status_kesediaan' => 'siap',
        ]);

        // Create survei + report so verification guard passes
        $surveior = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-G1-S',
            'nama' => 'Surveior G1',
            'peran' => 'surveior',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'selesai',
        ]);
        $penugasanSurvei = Penugasan::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'tenaga_ahli_id' => $surveior->id,
            'jenis' => 'survei',
            'status' => 'selesai',
        ]);
        $laporanSurvei = \App\Models\LaporanPengerjaan::create([
            'id' => (string) Str::uuid(),
            'penugasan_id' => $penugasanSurvei->id,
            'tanggal_laporan' => now()->toDateString(),
            'path_file' => 'dummy/path/laporan.pdf',
            'nama_file_asli' => 'laporan_survei.pdf',
            'diunggah_oleh' => AkunPengguna::first()->id,
        ]);

        // Assignment 1: sedang bertugas
        $p1 = Penugasan::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'tenaga_ahli_id' => $verifikator->id,
            'jenis' => 'verifikasi',
            'status' => 'sedang_bertugas',
        ]);

        // Assignment 2: should still be eligible (Verifikator tidak diblokir)
        $resp = $this->actingAsAdmin()->postJson('/api/penugasan', [
            'siklus_id' => $siklus->id,
            'jenis' => 'verifikasi',
        ]);

        $this->assertNotEquals(422, $resp->status(), 'Got 422: ' . $resp->json('message'));
        $resp->assertCreated();
        // Verifikator NIS-G1 already has aktif verifikasi on this siklus → skipped.
        // Next eligible is NS-0006 or NS-0007 (both from seeder with nomor_urut=0).
        $this->assertNotEquals($verifikator->id, $resp->json('data.tenaga_ahli_id'),
            'Should select a different verifikator, not the one with active verifikasi on this siklus.');
    }

    public function test_eligible_candidates_excludes_non_aktif(): void
    {
        $siklus = $this->createSiklus();

        $taAktif = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-H1',
            'nama' => 'Surveior H1',
            'peran' => 'surveior',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
        ]);
        $taNonaktif = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-H2',
            'nama' => 'Surveior H2',
            'peran' => 'surveior',
            'status_aktif' => 'Nonaktif', // NONAKTIF
            'status_penugasan_saat_ini' => 'tidak_bertugas',
        ]);

        HistoriAntrianPenugasan::create([
            'id' => (string) Str::uuid(),
            'tenaga_ahli_id' => $taAktif->id,
            'peran' => 'surveior',
            'nomor_urut' => 1,
            'status_kesediaan' => 'siap',
        ]);
        HistoriAntrianPenugasan::create([
            'id' => (string) Str::uuid(),
            'tenaga_ahli_id' => $taNonaktif->id,
            'peran' => 'surveior',
            'nomor_urut' => 1,
            'status_kesediaan' => 'siap',
        ]);

        $resp = $this->actingAsAdmin()->postJson('/api/penugasan', [
            'siklus_id' => $siklus->id,
            'jenis' => 'survei',
        ]);

        $resp->assertCreated()
            ->assertJsonPath('data.tenaga_ahli_id', $taAktif->id);
    }

    // ─── FR-3.8: Batas Penugasan per Periode ────────────────────────────────

    public function test_batas_periode_deactivated_allows_unlimited(): void
    {
        // Default: batas_periode_aktif = 0 (nonaktif)
        $siklus = $this->createSiklus();
        $ta = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-I1',
            'nama' => 'Surveior I',
            'peran' => 'surveior',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
            'batas_penugasan_per_periode' => 1,
        ]);

        HistoriAntrianPenugasan::create([
            'id' => (string) Str::uuid(),
            'tenaga_ahli_id' => $ta->id,
            'peran' => 'surveior',
            'nomor_urut' => 1,
            'status_kesediaan' => 'siap',
        ]);

        // With batas nonaktif, should still be assigned even though batas=1
        $resp = $this->actingAsAdmin()->postJson('/api/penugasan', [
            'siklus_id' => $siklus->id,
            'jenis' => 'survei',
        ]);

        $resp->assertCreated()
            ->assertJsonPath('data.tenaga_ahli_id', $ta->id);
    }

    public function test_batas_periode_activated_3_queues_third_surveior(): void
    {
        // Aktifkan batas = 3
        $cfg = KonfigurasiPenugasan::where('kunci', 'batas_periode_aktif')->first();
        $cfg->forceFill(['nilai' => '1'])->save();
        $cfgNilai = KonfigurasiPenugasan::where('kunci', 'batas_periode_nilai')->first();
        $cfgNilai->forceFill(['nilai' => '3'])->save();

        $siklus = $this->createSiklus();

        $tas = [];
        foreach (range(1, 3) as $i) {
            $ta = TenagaAhli::create([
                'id' => (string) Str::uuid(),
                'nomor_induk_surveior' => "NIS-J{$i}",
                'nama' => "Surveior J{$i}",
                'peran' => 'surveior',
                'status_aktif' => 'Aktif',
                'status_penugasan_saat_ini' => 'tidak_bertugas',
                'batas_penugasan_per_periode' => 3,
            ]);
            $tas[] = $ta;

            HistoriAntrianPenugasan::create([
                'id' => (string) Str::uuid(),
                'tenaga_ahli_id' => $ta->id,
                'peran' => 'surveior',
                'nomor_urut' => $i,
                'status_kesediaan' => 'siap',
            ]);
        }

        // Buat 3 penugasan aktif per TA (setiap TA mencapai batas=3)
        foreach ($tas as $ta) {
            for ($j = 0; $j < 3; $j++) {
                Penugasan::create([
                    'id' => (string) Str::uuid(),
                    'siklus_id' => $siklus->id,
                    'tenaga_ahli_id' => $ta->id,
                    'jenis' => 'survei',
                    'status' => 'sedang_bertugas',
                ]);
            }
        }

        // 4th assignment: none eligible (all 3 TAs reached their batas of 3)
        $resp = $this->actingAsAdmin()->postJson('/api/penugasan', [
            'siklus_id' => $siklus->id,
            'jenis' => 'survei',
        ]);

        $resp->assertStatus(422)
            ->assertJsonPath('message', 'Tidak ada kandidat eligible tersedia di antrian.');
    }

    public function test_sdm_can_toggle_batas_periode_setting(): void
    {
        $resp = $this->actingAsSDM()->putJson('/api/sdm/konfigurasi-penugasan', [
            'batas_periode_aktif' => '1',
            'batas_periode_nilai' => '5',
        ]);

        $resp->assertOk()
            ->assertJsonPath('data.0.nilai', '1')
            ->assertJsonPath('data.1.nilai', '5');
    }

    public function test_sdm_can_deactivate_batas_periode(): void
    {
        $resp = $this->actingAsSDM()->putJson('/api/sdm/konfigurasi-penugasan', [
            'batas_periode_aktif' => '0',
        ]);

        $resp->assertOk()
            ->assertJsonPath('data.0.nilai', '0');
    }

    // ─── Privilege checks (AC-10) ────────────────────────────────────────────

    public function test_unauthenticated_cannot_access_penugasan_endpoints(): void
    {
        $this->postJson('/api/penugasan', [])->assertStatus(401);
        $this->postJson('/api/penugasan/surat-tugas', [])->assertStatus(401);
        $this->postJson('/api/penugasan/kendala', [])->assertStatus(401);
    }

    public function test_non_privileged_role_cannot_issue_surat_tugas(): void
    {
        // Faskes role has no Penugasan privilege
        $faskesUser = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->firstOrFail();

        $siklus = $this->createSiklus();
        $surveior = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-K1',
            'nama' => 'Surveior K',
            'peran' => 'surveior',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
        ]);

        $penugasan = Penugasan::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'tenaga_ahli_id' => $surveior->id,
            'jenis' => 'survei',
            'status' => 'menunggu',
        ]);

        $this->actingAs($faskesUser, 'sanctum')
            ->postJson('/api/penugasan/surat-tugas', ['penugasan_id' => $penugasan->id])
            ->assertStatus(403);
    }

    // ─── AC-8 / FR-3.7: Dropdown endpoint excludes Surveior "Sedang Bertugas" but allows Verifikator ──

    public function test_ac8_dropdown_excludes_surveior_sedang_bertugas(): void
    {
        $surveiorBusy = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-AC8-S1',
            'nama' => 'Surveior Sibuk',
            'peran' => 'surveior',
            'jenis' => 'TKPP',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'sedang_bertugas', // FR-3.7: excluded
        ]);
        $surveiorFree = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-AC8-S2',
            'nama' => 'Surveior Tersedia',
            'peran' => 'surveior',
            'jenis' => 'TKSDU',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
        ]);

        $resp = $this->actingAsAdmin()
            ->getJson('/api/admin/tenaga-ahli?peran=surveior&exclude_bertugas=1');

        $resp->assertOk();
        $ids = collect($resp->json('data'))->pluck('id')->all();
        $this->assertNotContains($surveiorBusy->id, $ids, 'Surveior sedang_bertugas harus di-exclude');
        $this->assertContains($surveiorFree->id, $ids, 'Surveior tidak_bertugas harus muncul');
    }

    public function test_ac8_dropdown_allows_verifikator_with_sedang_bertugas(): void
    {
        $verifBusy = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-AC8-V1',
            'nama' => 'Verifikator Sibuk',
            'peran' => 'verifikator',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'sedang_bertugas', // FR-3.7: NOT excluded
        ]);

        $resp = $this->actingAsAdmin()
            ->getJson('/api/admin/tenaga-ahli?peran=verifikator');

        $resp->assertOk();
        $ids = collect($resp->json('data'))->pluck('id')->all();
        $this->assertContains($verifBusy->id, $ids, 'Verifikator sedang_bertugas BOLEH muncul (FR-3.7 pengecualian)');
    }

    public function test_ac8_dropdown_allows_surveior_after_selesai(): void
    {
        // Surveior yang sudah menyelesaikan penugasan (status_penugasan_saat_ini=tidak_bertugas)
        // BOLEH muncul lagi di dropdown.
        $surveiorSelesai = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-AC8-SF1',
            'nama' => 'Surveior Selesai Tugas',
            'peran' => 'surveior',
            'jenis' => 'TKPP',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas', // sudah tidak bertugas
        ]);

        $resp = $this->actingAsAdmin()
            ->getJson('/api/admin/tenaga-ahli?peran=surveior&jenis=TKPP');

        $resp->assertOk();
        $ids = collect($resp->json('data'))->pluck('id')->all();
        $this->assertContains(
            $surveiorSelesai->id,
            $ids,
            'Surveior yang sudah selesai (tidak_bertugas) harus muncul lagi di dropdown'
        );
    }

    public function test_ac8_dropdown_excludes_surveior_menunggu_and_sedang_bertugas(): void
    {
        $taMenunggu = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-AC8-MN',
            'nama' => 'Surveior Menunggu',
            'peran' => 'surveior',
            'jenis' => 'TKPP',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'menunggu', // FR-3.7: excluded
        ]);
        $taBertugas = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-AC8-SB',
            'nama' => 'Surveior Sedang Bertugas',
            'peran' => 'surveior',
            'jenis' => 'TKPP',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'sedang_bertugas', // FR-3.7: excluded
        ]);
        $taTersedia = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-AC8-TR',
            'nama' => 'Surveior Tersedia',
            'peran' => 'surveior',
            'jenis' => 'TKPP',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
        ]);

        $resp = $this->actingAsAdmin()
            ->getJson('/api/admin/tenaga-ahli?peran=surveior&jenis=TKPP');

        $resp->assertOk();
        $ids = collect($resp->json('data'))->pluck('id')->all();
        $this->assertNotContains($taMenunggu->id, $ids, 'Surveior menunggu harus di-exclude');
        $this->assertNotContains($taBertugas->id, $ids, 'Surveior sedang_bertugas harus di-exclude');
        $this->assertContains($taTersedia->id, $ids, 'Surveior tidak_bertugas harus muncul');
    }

    public function test_appoint_marks_surveior_status_menunggu(): void
    {
        // Setelah appoint, status_penugasan_saat_ini surveyor harus menjadi 'menunggu'
        // (sehingga surveyor tidak muncul lagi di dropdown)
        $siklus = $this->createSiklus();

        $taTkpp = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-AP-TKPP',
            'nama' => 'TKPP Tester',
            'peran' => 'surveior',
            'jenis' => 'TKPP',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
        ]);
        $taTksdu = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-AP-TKSDU',
            'nama' => 'TKSDU Tester',
            'peran' => 'surveior',
            'jenis' => 'TKSDU',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
        ]);

        $this->actingAsAdmin()->postJson('/api/penugasan/appoint', [
            'siklus_id' => $siklus->id,
            'jenis' => 'survei',
            'tenaga_ahli_ids' => [$taTkpp->id, $taTksdu->id],
        ])->assertOk();

        $taTkpp->refresh();
        $taTksdu->refresh();
        $this->assertEquals('menunggu', $taTkpp->status_penugasan_saat_ini, 'TKPP harus di-set menunggu setelah appoint');
        $this->assertEquals('menunggu', $taTksdu->status_penugasan_saat_ini, 'TKSDU harus di-set menunggu setelah appoint');

        // Sekarang harus di-exclude dari dropdown
        $resp = $this->actingAsAdmin()
            ->getJson('/api/admin/tenaga-ahli?peran=surveior&jenis=TKPP');
        $ids = collect($resp->json('data'))->pluck('id')->all();
        $this->assertNotContains($taTkpp->id, $ids, 'TKPP yang sudah di-appoint tidak boleh muncul di dropdown');
    }

    public function test_ac8_replace_endpoint_respects_occupied_surveior(): void
    {
        // Skenario: replace surveior lama dengan yang baru, tapi yang baru sedang bertugas → harus ditolak
        $siklus = $this->createSiklus();

        $surveiorLama = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-AC8-RL',
            'nama' => 'Surveior Lama',
            'peran' => 'surveior',
            'jenis' => 'TKPP',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
        ]);
        $surveiorPengganti = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-AC8-RP',
            'nama' => 'Surveior Pengganti Sibuk',
            'peran' => 'surveior',
            'jenis' => 'TKPP',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'sedang_bertugas', // Sibuk → tidak boleh dipilih
        ]);

        $penugasan = Penugasan::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'tenaga_ahli_id' => $surveiorLama->id,
            'jenis' => 'survei',
            'status' => 'menunggu',
        ]);

        $resp = $this->actingAsAdmin()->postJson("/api/penugasan/{$penugasan->id}/replace", [
            'tenaga_ahli_baru_id' => $surveiorPengganti->id,
        ]);

        $resp->assertStatus(422)
            ->assertJsonFragment(['message' => 'Tenaga ahli Surveior Pengganti Sibuk sedang bertugas di siklus lain dan tidak dapat dipilih.']);
    }
}
