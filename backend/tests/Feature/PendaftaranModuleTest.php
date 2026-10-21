<?php

namespace Tests\Feature;

use App\Models\AkunPengguna;
use App\Models\CatatanRevisi;
use App\Models\ChecklistValidasi;
use App\Models\DokumenPermohonan;
use App\Models\Lembaga;
use App\Models\SiklusAkreditasi;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class PendaftaranModuleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->seed(DatabaseSeeder::class);
    }

    // ─── Helper ─────────────────────────────────────────────────────────────

    private function actingAsFaskes(): static
    {
        $user = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->firstOrFail();
        return $this->actingAs($user, 'sanctum');
    }

    private function actingAsAdmin(): static
    {
        $user = AkunPengguna::where('email', 'admin@erp.local')->firstOrFail();
        return $this->actingAs($user, 'sanctum');
    }

    // ─── FR-1.1: Form permohonan ───────────────────────────────────────────

    public function test_faskes_can_create_permohonan(): void
    {
        $lembaga = Lembaga::first();
        $faskes = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->firstOrFail()->faskes;

        $resp = $this->actingAsFaskes()->postJson('/api/pendaftaran/siklus', [
            'lembaga_id' => $lembaga->id,
            'tanggal_permohonan_survei' => now()->addDays(30)->toDateString(),
            'dfo_data' => [
                'nama_penganggung_jawab' => 'Dr. John Doe',
                'jabatan' => 'Direktur Utama',
                'kontak' => '081234567890',
            ],
        ]);

        $resp->assertCreated()
            ->assertJsonPath('data.status', 'menunggu_dokumen')
            ->assertJsonPath('data.status_kelengkapan', 'menunggu')
            ->assertJsonPath('data.dfo_data.nama_penganggung_jawab', 'Dr. John Doe');

        $this->assertDatabaseHas('siklus_akreditasi', [
            'faskes_id' => $faskes->id,
            'lembaga_id' => $lembaga->id,
            'status' => 'menunggu_dokumen',
        ]);
    }

    public function test_non_faskes_account_can_create_siklus_for_any_faskes(): void
    {
        $lembaga = Lembaga::first();
        $faskesId = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->first()->faskes_id;

        $resp = $this->actingAsAdmin()->postJson('/api/pendaftaran/siklus', [
            'faskes_id' => $faskesId,
            'lembaga_id' => $lembaga->id,
            'tanggal_permohonan_survei' => now()->addDays(30)->toDateString(),
        ]);

        $resp->assertCreated();
    }

    public function test_create_permohonan_requires_valid_lembaga(): void
    {
        $resp = $this->actingAsFaskes()->postJson('/api/pendaftaran/siklus', [
            'lembaga_id' => (string) Str::uuid(),
            'tanggal_permohonan_survei' => now()->addDays(10)->toDateString(),
        ]);

        $resp->assertStatus(422)
            ->assertJsonValidationErrors(['lembaga_id']);
    }

    public function test_faskes_can_view_own_siklus(): void
    {
        $lembaga = Lembaga::first();
        $faskesId = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->first()->faskes_id;

        $siklus = SiklusAkreditasi::create([
            'id' => (string) Str::uuid(),
            'faskes_id' => $faskesId,
            'lembaga_id' => $lembaga->id,
            'tanggal_pengajuan' => now()->toDateString(),
            'status' => 'menunggu_dokumen',
            'status_kelengkapan' => 'menunggu',
            'created_at' => now(),
        ]);

        $resp = $this->actingAsFaskes()->getJson("/api/pendaftaran/siklus/{$siklus->id}");

        $resp->assertOk()
            ->assertJsonPath('data.id', $siklus->id);
    }

    public function test_faskes_cannot_view_other_faskes_siklus(): void
    {
        // Admin membuat siklus untuk faskes yang berbeda
        $otherFaskes = \App\Models\Faskes::create([
            'id' => (string) Str::uuid(),
            'nama' => 'RS Other',
            'tipe_faskes' => 'Rumah Sakit',
            'alamat' => 'Jl. Other 1',
            'status' => 'Aktif',
        ]);

        $lembaga = Lembaga::first();
        $siklus = SiklusAkreditasi::create([
            'id' => (string) Str::uuid(),
            'faskes_id' => $otherFaskes->id,
            'lembaga_id' => $lembaga->id,
            'tanggal_pengajuan' => now()->toDateString(),
            'status' => 'menunggu_dokumen',
            'status_kelengkapan' => 'menunggu',
            'created_at' => now(),
        ]);

        // Faskes@demo tidak bisa lihat siklus RS Other
        $this->actingAsFaskes()->getJson("/api/pendaftaran/siklus/{$siklus->id}")
            ->assertStatus(403);
    }

    public function test_list_lembaga_returns_all_lembaga(): void
    {
        $this->actingAsFaskes()->getJson('/api/pendaftaran/lembaga')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'nama']]]);
    }

    // ─── FR-1.2: Upload dokumen ───────────────────────────────────────────

    public function test_upload_document(): void
    {
        $lembaga = Lembaga::first();
        $faskesId = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->first()->faskes_id;

        $siklus = SiklusAkreditasi::create([
            'id' => (string) Str::uuid(),
            'faskes_id' => $faskesId,
            'lembaga_id' => $lembaga->id,
            'tanggal_pengajuan' => now()->toDateString(),
            'status' => 'menunggu_dokumen',
            'status_kelengkapan' => 'menunggu',
            'created_at' => now(),
        ]);

        $file = UploadedFile::fake()->create('surat_permohonan.pdf', 1024, 'application/pdf');

        $resp = $this->actingAsFaskes()->postJson("/api/pendaftaran/siklus/{$siklus->id}/dokumen", [
            'jenis_dokumen' => 'surat_permohonan',
            'file' => $file,
        ]);

        $resp->assertCreated()
            ->assertJsonPath('data.jenis_dokumen', 'surat_permohonan')
            ->assertJsonPath('data.versi', 1)
            ->assertJsonPath('data.nama_file_asli', 'surat_permohonan.pdf');

        $this->assertDatabaseHas('dokumen_permohonan', [
            'siklus_id' => $siklus->id,
            'jenis_dokumen' => 'surat_permohonan',
            'versi' => 1,
        ]);
    }

    public function test_upload_rejects_invalid_mime_type(): void
    {
        $lembaga = Lembaga::first();
        $faskesId = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->first()->faskes_id;

        $siklus = SiklusAkreditasi::create([
            'id' => (string) Str::uuid(),
            'faskes_id' => $faskesId,
            'lembaga_id' => $lembaga->id,
            'tanggal_pengajuan' => now()->toDateString(),
            'status' => 'menunggu_dokumen',
            'status_kelengkapan' => 'menunggu',
            'created_at' => now(),
        ]);

        $file = UploadedFile::fake()->create('malware.exe', 512, 'application/x-msdownload');

        $this->actingAsFaskes()->postJson("/api/pendaftaran/siklus/{$siklus->id}/dokumen", [
            'jenis_dokumen' => 'surat_permohonan',
            'file' => $file,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    public function test_upload_rejects_invalid_jenis_dokumen(): void
    {
        $lembaga = Lembaga::first();
        $faskesId = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->first()->faskes_id;

        $siklus = SiklusAkreditasi::create([
            'id' => (string) Str::uuid(),
            'faskes_id' => $faskesId,
            'lembaga_id' => $lembaga->id,
            'tanggal_pengajuan' => now()->toDateString(),
            'status' => 'menunggu_dokumen',
            'status_kelengkapan' => 'menunggu',
            'created_at' => now(),
        ]);

        $file = UploadedFile::fake()->create('doc.pdf', 512, 'application/pdf');

        $this->actingAsFaskes()->postJson("/api/pendaftaran/siklus/{$siklus->id}/dokumen", [
            'jenis_dokumen' => 'invalid_type',
            'file' => $file,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['jenis_dokumen']);
    }

    // ─── FR-1.5: Versioning dokumen ────────────────────────────────────────

    public function test_reupload_increments_version(): void
    {
        $lembaga = Lembaga::first();
        $faskesId = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->first()->faskes_id;

        $siklus = SiklusAkreditasi::create([
            'id' => (string) Str::uuid(),
            'faskes_id' => $faskesId,
            'lembaga_id' => $lembaga->id,
            'tanggal_pengajuan' => now()->toDateString(),
            'status' => 'menunggu_dokumen',
            'status_kelengkapan' => 'menunggu',
            'created_at' => now(),
        ]);

        // Upload versi 1
        $file1 = UploadedFile::fake()->create('surat_v1.pdf', 512, 'application/pdf');
        $this->actingAsFaskes()->postJson("/api/pendaftaran/siklus/{$siklus->id}/dokumen", [
            'jenis_dokumen' => 'surat_permohonan',
            'file' => $file1,
        ])->assertCreated()
            ->assertJsonPath('data.versi', 1);

        // Upload versi 2 (revisi)
        $file2 = UploadedFile::fake()->create('surat_v2.pdf', 512, 'application/pdf');
        $resp = $this->actingAsFaskes()->postJson("/api/pendaftaran/siklus/{$siklus->id}/dokumen", [
            'jenis_dokumen' => 'surat_permohonan',
            'file' => $file2,
        ])->assertCreated()
            ->assertJsonPath('data.versi', 2);

        // Versi 3
        $file3 = UploadedFile::fake()->create('surat_v3.pdf', 512, 'application/pdf');
        $this->actingAsFaskes()->postJson("/api/pendaftaran/siklus/{$siklus->id}/dokumen", [
            'jenis_dokumen' => 'surat_permohonan',
            'file' => $file3,
        ])->assertCreated()
            ->assertJsonPath('data.versi', 3);

        // Semua 3 versi tersimpan
        $this->assertEquals(3, DokumenPermohonan::where('siklus_id', $siklus->id)
            ->where('jenis_dokumen', 'surat_permohonan')->count());
    }

    public function test_versions_endpoint_returns_all_versions(): void
    {
        $lembaga = Lembaga::first();
        $faskesId = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->first()->faskes_id;

        $siklus = SiklusAkreditasi::create([
            'id' => (string) Str::uuid(),
            'faskes_id' => $faskesId,
            'lembaga_id' => $lembaga->id,
            'tanggal_pengajuan' => now()->toDateString(),
            'status' => 'menunggu_dokumen',
            'status_kelengkapan' => 'menunggu',
            'created_at' => now(),
        ]);

        // Create 2 versions directly
        DokumenPermohonan::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'jenis_dokumen' => 'self_assessment',
            'versi' => 1,
            'nama_file_asli' => 'sa_v1.pdf',
            'path_file' => 'dokumen/sa_v1.pdf',
            'ukuran_file' => 1024,
            'mime_type' => 'application/pdf',
            'diunggah_oleh' => AkunPengguna::first()->id,
            'tanggal_unduh' => now(),
        ]);

        $v2Id = (string) Str::uuid();
        DokumenPermohonan::create([
            'id' => $v2Id,
            'siklus_id' => $siklus->id,
            'jenis_dokumen' => 'self_assessment',
            'versi' => 2,
            'nama_file_asli' => 'sa_v2.pdf',
            'path_file' => 'dokumen/sa_v2.pdf',
            'ukuran_file' => 2048,
            'mime_type' => 'application/pdf',
            'diunggah_oleh' => AkunPengguna::first()->id,
            'tanggal_unduh' => now(),
        ]);

        $resp = $this->actingAsFaskes()->getJson("/api/pendaftaran/dokumen/{$v2Id}/versions");

        $resp->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.versi', 2)
            ->assertJsonPath('data.1.versi', 1);
    }

    public function test_faskes_cannot_delete_document(): void
    {
        $lembaga = Lembaga::first();
        $faskesId = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->first()->faskes_id;

        $siklus = SiklusAkreditasi::create([
            'id' => (string) Str::uuid(),
            'faskes_id' => $faskesId,
            'lembaga_id' => $lembaga->id,
            'tanggal_pengajuan' => now()->toDateString(),
            'status' => 'menunggu_dokumen',
            'status_kelengkapan' => 'menunggu',
            'created_at' => now(),
        ]);

        $dokumen = DokumenPermohonan::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'jenis_dokumen' => 'dfo',
            'versi' => 1,
            'nama_file_asli' => 'dfo.pdf',
            'path_file' => 'dokumen/dfo.pdf',
            'ukuran_file' => 1024,
            'mime_type' => 'application/pdf',
            'diunggah_oleh' => AkunPengguna::first()->id,
            'tanggal_unduh' => now(),
        ]);

        // Faskes role only has L, T, U — no Hapus
        $this->actingAsFaskes()->deleteJson("/api/pendaftaran/dokumen/{$dokumen->id}")
            ->assertStatus(403);
    }

    // ─── FR-1.3: Checklist validasi ───────────────────────────────────────

    public function test_admin_can_update_checklist(): void
    {
        $lembaga = Lembaga::first();
        $faskesId = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->first()->faskes_id;

        $siklus = SiklusAkreditasi::create([
            'id' => (string) Str::uuid(),
            'faskes_id' => $faskesId,
            'lembaga_id' => $lembaga->id,
            'tanggal_pengajuan' => now()->toDateString(),
            'status' => 'menunggu_dokumen',
            'status_kelengkapan' => 'menunggu',
            'created_at' => now(),
        ]);

        $resp = $this->actingAsAdmin()->putJson("/api/pendaftaran/siklus/{$siklus->id}/checklist", [
            'items' => [
                ['jenis_dokumen' => 'dfo', 'status_validasi' => 'lengkap', 'catatan_admin' => null],
                ['jenis_dokumen' => 'sisdmk', 'status_validasi' => 'lengkap', 'catatan_admin' => 'OK'],
                ['jenis_dokumen' => 'aspak', 'status_validasi' => 'tidak_lengkap', 'catatan_admin' => 'File corrupt'],
                ['jenis_dokumen' => 'inm', 'status_validasi' => 'belum', 'catatan_admin' => null],
                ['jenis_dokumen' => 'ikp', 'status_validasi' => 'lengkap', 'catatan_admin' => null],
            ],
        ]);

        $resp->assertOk()
            ->assertJsonPath('status_kelengkapan', 'belum_lengkap');

        // Status lengkap HANYA jika ketiga dokumen wajib (dfo, surat_permohonan,
        // self_assessment) lengkap. Dokumen pendukung boleh menyusul.
        $this->actingAsAdmin()->putJson("/api/pendaftaran/siklus/{$siklus->id}/checklist", [
            'items' => [
                ['jenis_dokumen' => 'dfo', 'status_validasi' => 'lengkap'],
                ['jenis_dokumen' => 'surat_permohonan', 'status_validasi' => 'lengkap'],
                ['jenis_dokumen' => 'self_assessment', 'status_validasi' => 'lengkap'],
                ['jenis_dokumen' => 'sisdmk', 'status_validasi' => 'lengkap'],
                ['jenis_dokumen' => 'aspak', 'status_validasi' => 'lengkap'],
                ['jenis_dokumen' => 'inm', 'status_validasi' => 'lengkap'],
                ['jenis_dokumen' => 'ikp', 'status_validasi' => 'lengkap'],
            ],
        ])->assertJsonPath('status_kelengkapan', 'lengkap');
    }

    public function test_checklist_completeness_sets_siklus_status(): void
    {
        $lembaga = Lembaga::first();
        $faskesId = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->first()->faskes_id;

        $siklus = SiklusAkreditasi::create([
            'id' => (string) Str::uuid(),
            'faskes_id' => $faskesId,
            'lembaga_id' => $lembaga->id,
            'tanggal_pengajuan' => now()->toDateString(),
            'status' => 'menunggu_dokumen',
            'status_kelengkapan' => 'menunggu',
            'created_at' => now(),
        ]);

        $this->actingAsAdmin()->putJson("/api/pendaftaran/siklus/{$siklus->id}/checklist", [
            'items' => [
                ['jenis_dokumen' => 'dfo', 'status_validasi' => 'lengkap'],
            ],
        ]);

        $siklus->refresh();
        $this->assertEquals('belum_lengkap', $siklus->status_kelengkapan);
    }

    public function test_supporting_docs_complete_without_wajib_keeps_status_belum_lengkap(): void
    {
        // Dokumen pendukung (SISDMK/ASPAK/INM/IKP) lengkap tapi 2 dokumen
        // wajib masih belum → status TIDAK boleh naik ke 'lengkap'.
        $lembaga = Lembaga::first();
        $faskesId = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->first()->faskes_id;

        $siklus = SiklusAkreditasi::create([
            'id' => (string) Str::uuid(),
            'faskes_id' => $faskesId,
            'lembaga_id' => $lembaga->id,
            'tanggal_pengajuan' => now()->toDateString(),
            'status' => 'menunggu_dokumen',
            'status_kelengkapan' => 'menunggu',
            'created_at' => now(),
        ]);

        $this->actingAsAdmin()->putJson("/api/pendaftaran/siklus/{$siklus->id}/checklist", [
            'items' => [
                ['jenis_dokumen' => 'sisdmk', 'status_validasi' => 'lengkap'],
                ['jenis_dokumen' => 'aspak', 'status_validasi' => 'lengkap'],
                ['jenis_dokumen' => 'inm', 'status_validasi' => 'lengkap'],
                ['jenis_dokumen' => 'ikp', 'status_validasi' => 'lengkap'],
            ],
        ])->assertJsonPath('status_kelengkapan', 'belum_lengkap');

        // Baru lengkapi ketiga wajib → status menjadi lengkap.
        $resp = $this->actingAsAdmin()->putJson("/api/pendaftaran/siklus/{$siklus->id}/checklist", [
            'items' => [
                ['jenis_dokumen' => 'dfo', 'status_validasi' => 'lengkap'],
                ['jenis_dokumen' => 'surat_permohonan', 'status_validasi' => 'lengkap'],
                ['jenis_dokumen' => 'self_assessment', 'status_validasi' => 'lengkap'],
            ],
        ]);
        $resp->assertJsonPath('status_kelengkapan', 'lengkap');

        $siklus->refresh();
        $this->assertEquals('lengkap', $siklus->status_kelengkapan);
        // Cek listing wajib belum-lengkap kini kosong.
        $resp->assertJsonPath('dokumen_wajib_belum_lengkap', []);
    }

    // ─── FR-1.4: Catatan revisi ─────────────────────────────────────────────

    public function test_admin_can_send_revision_notes(): void
    {
        $lembaga = Lembaga::first();
        $faskesId = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->first()->faskes_id;

        $siklus = SiklusAkreditasi::create([
            'id' => (string) Str::uuid(),
            'faskes_id' => $faskesId,
            'lembaga_id' => $lembaga->id,
            'tanggal_pengajuan' => now()->toDateString(),
            'status' => 'menunggu_dokumen',
            'status_kelengkapan' => 'menunggu',
            'created_at' => now(),
        ]);

        $resp = $this->actingAsAdmin()->postJson("/api/pendaftaran/siklus/{$siklus->id}/catatan-revisi", [
            'catatan' => 'Mohon lengkapi Dokumen SISDMK dan perbaiki DFO.',
        ]);

        $resp->assertCreated()
            ->assertJsonPath('data.catatan', 'Mohon lengkapi Dokumen SISDMK dan perbaiki DFO.')
            ->assertJsonPath('data.dibaca_faskes', false);

        // Kirim catatan reset kelengkapan ke belum_lengkap
        $siklus->refresh();
        $this->assertEquals('belum_lengkap', $siklus->status_kelengkapan);
    }

    public function test_catatan_revisi_creates_audit_trail(): void
    {
        $lembaga = Lembaga::first();
        $faskesId = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->first()->faskes_id;
        $admin = AkunPengguna::where('email', 'admin@erp.local')->first();

        $siklus = SiklusAkreditasi::create([
            'id' => (string) Str::uuid(),
            'faskes_id' => $faskesId,
            'lembaga_id' => $lembaga->id,
            'tanggal_pengajuan' => now()->toDateString(),
            'status' => 'menunggu_dokumen',
            'status_kelengkapan' => 'menunggu',
            'created_at' => now(),
        ]);

        $this->actingAsAdmin()->postJson("/api/pendaftaran/siklus/{$siklus->id}/catatan-revisi", [
            'catatan' => 'Perbaiki DFO.',
        ])->assertCreated();

        $this->assertDatabaseHas('audit_trail', [
            'aksi' => 'catatan_revisi.create',
            'target_type' => 'CatatanRevisi',
            'aktor_id' => $admin->id,
        ]);
    }

    public function test_faskes_can_mark_catatan_as_read(): void
    {
        $lembaga = Lembaga::first();
        $faskesId = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->first()->faskes_id;

        $siklus = SiklusAkreditasi::create([
            'id' => (string) Str::uuid(),
            'faskes_id' => $faskesId,
            'lembaga_id' => $lembaga->id,
            'tanggal_pengajuan' => now()->toDateString(),
            'status' => 'menunggu_dokumen',
            'status_kelengkapan' => 'menunggu',
            'created_at' => now(),
        ]);

        $catatan = CatatanRevisi::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'dibuat_oleh' => AkunPengguna::where('email', 'admin@erp.local')->first()->id,
            'catatan' => 'Revisi DFO.',
            'tanggal_catatan' => now(),
            'dibaca_faskes' => false,
        ]);

        $resp = $this->actingAsFaskes()->patchJson("/api/pendaftaran/catatan-revisi/{$catatan->id}/baca");

        $resp->assertOk()
            ->assertJsonPath('data.dibaca_faskes', true);

        $catatan->refresh();
        $this->assertTrue($catatan->dibaca_faskes);
        $this->assertNotNull($catatan->dibaca_faskes_pada);
    }

    public function test_unread_count_returns_correct_number(): void
    {
        $faskesId = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->first()->faskes_id;
        $lembaga = Lembaga::first();

        $siklus = SiklusAkreditasi::create([
            'id' => (string) Str::uuid(),
            'faskes_id' => $faskesId,
            'lembaga_id' => $lembaga->id,
            'tanggal_pengajuan' => now()->toDateString(),
            'status' => 'menunggu_dokumen',
            'status_kelengkapan' => 'menunggu',
            'created_at' => now(),
        ]);

        // Kirim 3 catatan, 2 belum dibaca
        $adminId = AkunPengguna::where('email', 'admin@erp.local')->first()->id;
        foreach (range(1, 3) as $i) {
            $catatan = CatatanRevisi::create([
                'id' => (string) Str::uuid(),
                'siklus_id' => $siklus->id,
                'dibuat_oleh' => $adminId,
                'catatan' => "Catatan {$i}",
                'tanggal_catatan' => now(),
                'dibaca_faskes' => $i <= 1,
                'dibaca_faskes_pada' => $i <= 1 ? now() : null,
            ]);
        }

        $this->actingAsFaskes()->getJson('/api/pendaftaran/catatan-revisi/unread-count')
            ->assertOk()
            ->assertJsonPath('data.count', 2);
    }

    // ─── Privilege check (AC-10) ────────────────────────────────────────────

    public function test_unauthenticated_cannot_access_pendaftaran_endpoints(): void
    {
        $this->getJson('/api/pendaftaran/siklus')->assertStatus(401);
        $this->postJson('/api/pendaftaran/siklus', [])->assertStatus(401);
    }

    public function test_faskes_cannot_delete_siklus_with_dokumen(): void
    {
        $lembaga = Lembaga::first();
        $faskesId = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->first()->faskes_id;

        $siklus = SiklusAkreditasi::create([
            'id' => (string) Str::uuid(),
            'faskes_id' => $faskesId,
            'lembaga_id' => $lembaga->id,
            'tanggal_pengajuan' => now()->toDateString(),
            'status' => 'menunggu_dokumen',
            'status_kelengkapan' => 'menunggu',
            'created_at' => now(),
        ]);

        DokumenPermohonan::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'jenis_dokumen' => 'dfo',
            'versi' => 1,
            'nama_file_asli' => 'dfo.pdf',
            'path_file' => 'dokumen/dfo.pdf',
            'ukuran_file' => 1024,
            'mime_type' => 'application/pdf',
            'diunggah_oleh' => AkunPengguna::first()->id,
            'tanggal_unduh' => now(),
        ]);

        $this->actingAsFaskes()->deleteJson("/api/pendaftaran/siklus/{$siklus->id}")
            ->assertStatus(403);
    }

    public function test_admin_can_delete_siklus(): void
    {
        $lembaga = Lembaga::first();

        $siklus = SiklusAkreditasi::create([
            'id' => (string) Str::uuid(),
            'faskes_id' => AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->first()->faskes_id,
            'lembaga_id' => $lembaga->id,
            'tanggal_pengajuan' => now()->toDateString(),
            'status' => 'menunggu_dokumen',
            'status_kelengkapan' => 'menunggu',
            'created_at' => now(),
        ]);

        $this->actingAsAdmin()->deleteJson("/api/pendaftaran/siklus/{$siklus->id}")
            ->assertOk();

        $this->assertDatabaseMissing('siklus_akreditasi', ['id' => $siklus->id]);
    }

    public function test_dokumen_list_shows_only_latest_versions(): void
    {
        $lembaga = Lembaga::first();
        $faskesId = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->first()->faskes_id;
        $uploaderId = AkunPengguna::first()->id;

        $siklus = SiklusAkreditasi::create([
            'id' => (string) Str::uuid(),
            'faskes_id' => $faskesId,
            'lembaga_id' => $lembaga->id,
            'tanggal_pengajuan' => now()->toDateString(),
            'status' => 'menunggu_dokumen',
            'status_kelengkapan' => 'menunggu',
            'created_at' => now(),
        ]);

        // Create 3 versions of the same document
        foreach ([1, 2, 3] as $v) {
            DokumenPermohonan::create([
                'id' => (string) Str::uuid(),
                'siklus_id' => $siklus->id,
                'jenis_dokumen' => 'dfo',
                'versi' => $v,
                'nama_file_asli' => "dfo_v{$v}.pdf",
                'path_file' => "dokumen/dfo_v{$v}.pdf",
                'ukuran_file' => 1024 * $v,
                'mime_type' => 'application/pdf',
                'diunggah_oleh' => $uploaderId,
                'tanggal_unduh' => now(),
            ]);
        }

        $resp = $this->actingAsFaskes()->getJson("/api/pendaftaran/siklus/{$siklus->id}/dokumen");

        $resp->assertOk();
        $this->assertEquals(1, $resp->json('meta.total'));
        $this->assertEquals(3, $resp->json('data.0.versi'));
    }
}
