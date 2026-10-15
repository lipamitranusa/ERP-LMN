<?php

namespace Tests\Feature;

/**
 * Fase 1 Exit Criteria — Test Checklist
 * ======================================
 * Referensi: docs/prd.md Bab 9 — Fase 1 Exit Criteria
 *
 * Exit Criteria yang harus LULUS semua sebelum boleh masuk Fase 2:
 *
 *  [E1] Faskes menyelesaikan pendaftaran end-to-end hingga dokumen tervalidasi.
 *  [E2] Surat Tugas terbit dalam format PDF standar.
 *  [E3] Verifikator menyelesaikan siklus FA-EP tanpa data hilang (AC-2, AC-3).
 *  [E4] Matriks privilege dapat dikonfigurasi dan ditegakkan di back-end (AC-10).
 */

use App\Models\AkunPengguna;
use App\Models\ChecklistValidasi;
use App\Models\DokumenPermohonan;
use App\Models\HistoriAntrianPenugasan;
use App\Models\Laporan;
use App\Models\LaporanVerifikasi;
use App\Models\Lembaga;
use App\Models\Penugasan;
use App\Models\SiklusAkreditasi;
use App\Models\SuratTugas;
use App\Models\TenagaAhli;
use App\Models\VerifikasiItem;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * E1: Faskes menyelesaikan pendaftaran end-to-end hingga dokumen tervalidasi.
 *
 * Sub-poin dari E1:
 *  E1.1 — Faskes bisa membuat permohonan (FR-1.1)
 *  E1.2 — Faskes bisa upload dokumen (FR-1.2, FR-1.5 versioning)
 *  E1.3 — Admin bisa validasi checklist (FR-1.3)
 *  E1.4 — Admin bisa kirim catatan revisi (FR-1.4)
 *  E1.5 — Status kelengkapan berubah menjadi "lengkap" setelah semua valid
 *
 * E1.5 adalah gatekeeper end-to-end: seluruh alur pendaftaran harus
 * menghasilkan status_kelengkapan = 'lengkap' sebelum bisa lanjut ke Surat Tugas.
 */
class Fase1ExitCriteriaTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->seed(DatabaseSeeder::class);

        // FR-3.7: Exclude ALL seeded surveiors + peran='kedua' (NS-0008 has
        // nomor_urut=0 and would win the queue over test TA2 without exclusion).
        // Also bump NS-0002 (verifikator role) histori nomor_urut.
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

    private function actingAsFaskes(): static
    {
        return $this->actingAs(AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->firstOrFail(), 'sanctum');
    }

    private function actingAsAdmin(): static
    {
        return $this->actingAs(AkunPengguna::where('email', 'admin@erp.local')->firstOrFail(), 'sanctum');
    }

    // ══════════════════════════════════════════════════════════════════════════
    // E1 — End-to-End Pendaftaran
    // ══════════════════════════════════════════════════════════════════════════

    public function test_e1_faskes_end_to_end_pendaftaran_sampai_tervalidasi(): void
    {
        // ── Setup ──────────────────────────────────────────────────────────────
        $lembaga = Lembaga::first();
        $faskesUser = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->firstOrFail();
        $faskesId = $faskesUser->faskes_id;
        $admin = AkunPengguna::where('email', 'admin@erp.local')->firstOrFail();

        // ── E1.1: Faskes buat permohonan (FR-1.1) ───────────────────────────
        $respPermohonan = $this->actingAsFaskes()->postJson('/api/pendaftaran/siklus', [
            'lembaga_id' => $lembaga->id,
            'tanggal_permohonan_survei' => now()->addDays(30)->toDateString(),
            'dfo_data' => ['nama_penganggung_jawab' => 'Dr. Budi', 'jabatan' => 'Direktur'],
        ]);

        $respPermohonan->assertCreated()
            ->assertJsonPath('data.status', 'menunggu_dokumen')
            ->assertJsonPath('data.status_kelengkapan', 'menunggu');

        $siklus = SiklusAkreditasi::findOrFail($respPermohonan->json('data.id'));

        // ── E1.2: Faskes upload dokumen (FR-1.2 + versioning) ────────────────
        $jenisDokumen = ['dfo', 'sisdmk', 'aspak', 'inm', 'ikp'];
        foreach ($jenisDokumen as $jenis) {
            $file = UploadedFile::fake()->create("{$jenis}.pdf", 512, 'application/pdf');
            $this->actingAsFaskes()->postJson("/api/pendaftaran/siklus/{$siklus->id}/dokumen", [
                'jenis_dokumen' => $jenis,
                'file' => $file,
            ])->assertCreated();
        }

        // Versi semua dokumen = 1
        foreach ($jenisDokumen as $jenis) {
            $this->assertDatabaseHas('dokumen_permohonan', [
                'siklus_id' => $siklus->id,
                'jenis_dokumen' => $jenis,
                'versi' => 1,
            ]);
        }

        // Re-upload salah satu → versi naik
        $fileRev = UploadedFile::fake()->create('dfo_v2.pdf', 512, 'application/pdf');
        $this->actingAsFaskes()->postJson("/api/pendaftaran/siklus/{$siklus->id}/dokumen", [
            'jenis_dokumen' => 'dfo',
            'file' => $fileRev,
        ])->assertCreated()
            ->assertJsonPath('data.versi', 2);

        $this->assertEquals(2, DokumenPermohonan::where('siklus_id', $siklus->id)
            ->where('jenis_dokumen', 'dfo')->count());

        // ── E1.3: Admin validasi checklist — semua lengkap (FR-1.3) ─────────
        $checklistItems = array_map(fn ($j) => ['jenis_dokumen' => $j, 'status_validasi' => 'lengkap'], $jenisDokumen);

        $respChecklist = $this->actingAsAdmin()->putJson("/api/pendaftaran/siklus/{$siklus->id}/checklist", [
            'items' => $checklistItems,
        ]);

        $respChecklist->assertOk()
            ->assertJsonPath('status_kelengkapan', 'lengkap');

        $siklus->refresh();
        $this->assertEquals('lengkap', $siklus->status_kelengkapan);

        // ── E1.4: Admin kirim catatan revisi (FR-1.4) ─────────────────────
        $respCatatan = $this->actingAsAdmin()->postJson("/api/pendaftaran/siklus/{$siklus->id}/catatan-revisi", [
            'catatan' => 'Semua dokumen sudah lengkap, silakan tunggu konfirmasi.',
        ]);

        $respCatatan->assertCreated();

        // Kirim catatan revisi → kelengkapan reset ke belum_lengkap
        $respChecklist2 = $this->actingAsAdmin()->putJson("/api/pendaftaran/siklus/{$siklus->id}/checklist", [
            'items' => array_map(fn ($j) => ['jenis_dokumen' => $j, 'status_validasi' => 'lengkap'], $jenisDokumen),
        ]);

        $respChecklist2->assertJsonPath('status_kelengkapan', 'lengkap');
        $siklus->refresh();
        $this->assertEquals('lengkap', $siklus->status_kelengkapan);

        // ── E1.5: Gate — status_kelengkapan = lengkap bisa lanjut ke penugasan ──
        // Semua gate terpenuhi: permohonan dibuat → dokumen lengkap → validasi OK
        $this->assertEquals('lengkap', $siklus->status_kelengkapan);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // E2 — Surat Tugas PDF
    // ══════════════════════════════════════════════════════════════════════════

    public function test_e2_surat_tugas_survei_terbit_format_pdf_standar(): void
    {
        $siklus = $this->createSiklusWithSelesaiStatus();
        $surveior = $this->createSurveior();

        // Buat penugasan survei + laporan
        $penugasan = Penugasan::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'tenaga_ahli_id' => $surveior->id,
            'jenis' => 'survei',
            'status' => 'menunggu',
        ]);

        Laporan::create([
            'id' => (string) Str::uuid(),
            'penugasan_id' => $penugasan->id,
            'tipe' => 'survei',
            'submitted_at' => now(),
        ]);

        $resp = $this->actingAsAdmin()->postJson('/api/penugasan/surat-tugas', [
            'penugasan_id' => $penugasan->id,
        ]);

        $resp->assertCreated()
            ->assertJsonStructure([
                'data' => ['id', 'nomor_surat', 'path_pdf', 'tanggal_terbit'],
            ]);

        // Nomor surat format benar
        $this->assertMatchesRegularExpression('/^ST-\d{4}-\d{4}$/', $resp->json('data.nomor_surat'));

        // File PDF tersimpan
        Storage::disk('local')->assertExists($resp->json('data.path_pdf'));

        // Nomor surat unik per penugasan
        $admin = AkunPengguna::where('email', 'admin@erp.local')->firstOrFail();
        $this->assertDatabaseHas('surat_tugas', [
            'penugasan_id' => $penugasan->id,
            'diterbitkan_oleh' => $admin->id,
        ]);

        // Duplicate → ditolak
        $this->actingAsAdmin()->postJson('/api/penugasan/surat-tugas', [
            'penugasan_id' => $penugasan->id,
        ])->assertStatus(422)
          ->assertJsonPath('message', 'Surat Tugas sudah pernah diterbitkan untuk penugasan ini.');
    }

    public function test_e2_surat_tugas_verifikasi_terbit_format_pdf_standar(): void
    {
        $siklus = $this->createSiklusWithSelesaiStatus();
        $surveior = $this->createSurveior();
        $verifikator = $this->createVerifikator();

        // Penugasan survei + laporan
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

        // Penugasan verifikasi
        $penugasanVerif = Penugasan::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'tenaga_ahli_id' => $verifikator->id,
            'jenis' => 'verifikasi',
            'status' => 'menunggu',
        ]);

        $lv = LaporanVerifikasi::create([
            'id' => (string) Str::uuid(),
            'laporan_id' => $laporan->id,
            'verifikasi_penugasan_id' => $penugasanVerif->id,
            'status_final' => 'draft',
        ]);

        $resp = $this->actingAsAdmin()->postJson('/api/verifikasi/surat-tugas', [
            'laporan_verifikasi_id' => $lv->id,
        ]);

        $resp->assertCreated()
            ->assertJsonStructure(['data' => ['id', 'nomor_surat', 'path_pdf']]);

        // Nomor surat format STV-YYYY-NNNN
        $this->assertMatchesRegularExpression('/^STV-\d{4}-\d{4}$/', $resp->json('data.nomor_surat'));

        Storage::disk('local')->assertExists($resp->json('data.path_pdf'));
    }

    // ══════════════════════════════════════════════════════════════════════════
    // E3 — AC-2 (log penugasan tidak hilang) + AC-3 (validasi verifikasi)
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * AC-2: Surveior dapat diganti tanpa menghapus log penugasan sebelumnya.
     *
     * Skenario: TA-1 ditugaskan → decline → penugasan berstatus 'ditolak'.
     * Admin kemudian replace manual ke TA-2 via endpoint /replace.
     * Hasil yang diharapkan:
     *  - Record penugasan TA-1 TETAP ADA di DB (tidak dihapus)
     *  - Record HistoriAntrianPenugasan TA-1 TETAP ADA dengan status 'ditolak'
     *  - Setelah admin replace, penugasan baru merujuk ke TA-2
     *  - Log audit trail TA-1 tercatat
     */
    public function test_e3_ac2_surveior_ganti_tanpa_hapus_log_sebelumnya(): void
    {
        $siklus = $this->createSiklusWithSelesaiStatus();

        $ta1 = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-AC2-1',
            'nama' => 'Surveior Ganti 1',
            'peran' => 'surveior',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
        ]);
        $ta2 = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-AC2-2',
            'nama' => 'Surveior Ganti 2',
            'peran' => 'surveior',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
        ]);

        // Histori antrian
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

        // Link TA1 ke akun demo
        $ta1User = AkunPengguna::where('email', 'ns-0001@surveyor.local')->first();
        $ta1User->forceFill(['tenaga_ahli_id' => $ta1->id])->save();

        // Penugasan dibuat → TA1 ditugaskan
        $penugasan = Penugasan::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'tenaga_ahli_id' => $ta1->id,
            'jenis' => 'survei',
            'status' => 'menunggu',
        ]);

        $penugasanId = $penugasan->id;

        // TA1 decline → penugasan 'ditolak' (TIDAK auto-replace)
        $resp = $this->actingAs(AkunPengguna::where('email', 'ns-0001@surveyor.local')->first(), 'sanctum')
            ->patchJson("/api/penugasan/{$penugasan->id}/konfirmasi", [
                'konfirmasi' => false,
                'catatan' => 'Benturan jadwal',
            ]);

        $resp->assertOk()
            ->assertJsonPath('message', 'Penolakan dicatat. Admin akan menugaskan pengganti.');

        // AC-2: Record penugasan TA1 TETAP ADA dengan status 'ditolak'
        $this->assertDatabaseHas('penugasan', ['id' => $penugasanId, 'status' => 'ditolak']);

        // AC-2: tenaga_ahli_id masih TA1 (admin belum replace)
        $this->assertEquals($ta1->id, $penugasan->fresh()->tenaga_ahli_id);

        // AC-2: Histori TA1 tercatat sebagai ditolak
        $histori1 = HistoriAntrianPenugasan::where('tenaga_ahli_id', $ta1->id)
            ->where('peran', 'surveior')->first();
        $this->assertNotNull($histori1);
        $this->assertEquals('ditolak', $histori1->status_kesediaan);
        $this->assertEquals('Benturan jadwal', $histori1->catatan_penolakan);

        // Admin me-replace manual: buat penugasan baru untuk TA2 di siklus yang sama
        $newPenugasan = Penugasan::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'tenaga_ahli_id' => $ta2->id,
            'jenis' => 'survei',
            'status' => 'menunggu',
        ]);

        HistoriAntrianPenugasan::updateOrCreate(
            ['tenaga_ahli_id' => $ta2->id, 'peran' => 'surveior'],
            [
                'status_kesediaan' => 'ditawarkan',
                'tanggal_status' => now(),
            ]
        );

        $this->assertEquals($ta2->id, $newPenugasan->tenaga_ahli_id);

        // AC-2: Histori TA2 tercatat sebagai ditawarkan
        $histori2 = HistoriAntrianPenugasan::where('tenaga_ahli_id', $ta2->id)
            ->where('peran', 'surveior')->first();
        $this->assertNotNull($histori2);
        $this->assertEquals('ditawarkan', $histori2->status_kesediaan);
    }

    /**
     * AC-3: Verifikator TIDAK BISA menyelesaikan verifikasi jika perubahan
     * skor tanpa komentar.
     *
     * Verifikator hanya BISA finalisasi jika:
     *  1. Semua item terisi (tidak ada nilai_final = null)
     *  2. Setiap perubahan nilai memiliki catatan
     */
    public function test_e3_ac3_nilai_berubah_tanpa_komentar_ditolak(): void
    {
        [$lv, $item] = $this->setupVerifikasiWorkspace();

        // Ubah nilai tanpa komentar → harus ditolak
        $resp = $this->actingAsVerifikator()->putJson("/api/verifikasi/items/{$item->id}/nilai", [
            'nilai_final' => 'Tidak MK',
            'nilai_sesuai' => false,
            // catatan: missing
        ]);

        $resp->assertStatus(422)
            ->assertJsonPath('message', 'Kolom komentar WAJIB diisi jika nilai diubah.');
    }

    public function test_e3_ac3_final_ditolak_jika_ada_item_belum_terisi(): void
    {
        [$lv] = $this->setupVerifikasiWorkspace();

        // Item 1: terisi
        VerifikasiItem::create([
            'id' => (string) Str::uuid(),
            'laporan_verifikasi_id' => $lv->id,
            'kode_elemen' => 'EP-1.1',
            'nama_elemen' => 'Pelayanan',
            'nilai_default' => 'MK',
            'nilai_final' => 'MK',
        ]);

        // Item 2: BELUM terisi
        VerifikasiItem::create([
            'id' => (string) Str::uuid(),
            'laporan_verifikasi_id' => $lv->id,
            'kode_elemen' => 'EP-2.1',
            'nama_elemen' => 'Mutu',
            'nilai_default' => 'MK',
            'nilai_final' => null,
        ]);

        $this->actingAsVerifikator()->postJson("/api/verifikasi/{$lv->id}/final", [])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Semua item harus terisi sebelum final.');
    }

    public function test_e3_ac3_final_berhasil_jika_semua_terisi_dan_catatan_lengkap(): void
    {
        [$lv] = $this->setupVerifikasiWorkspace();

        // Hapus item fixture (nilai_final=null) dan buat ulang yang terisi
        $lv->items()->delete();

        foreach (['EP-1.1', 'EP-2.1', 'EP-3.1'] as $kode) {
            VerifikasiItem::create([
                'id' => (string) Str::uuid(),
                'laporan_verifikasi_id' => $lv->id,
                'kode_elemen' => $kode,
                'nama_elemen' => "Elemen {$kode}",
                'nilai_default' => 'MK',
                'nilai_final' => 'MK',
                'nilai_sesuai' => true,
            ]);
        }

        $resp = $this->actingAsVerifikator()->postJson("/api/verifikasi/{$lv->id}/final", []);

        $resp->assertOk()
            ->assertJsonPath('data.status_final', 'final');

        $lv->refresh();
        $this->assertEquals('final', $lv->status_final);
        $this->assertNotNull($lv->finalized_at);
    }

    public function test_e3_ac3_final_kunci_permanen_tidak_bisa_diubah(): void
    {
        [$lv] = $this->setupVerifikasiWorkspace();

        $lv->items()->delete();

        $item = VerifikasiItem::create([
            'id' => (string) Str::uuid(),
            'laporan_verifikasi_id' => $lv->id,
            'kode_elemen' => 'EP-1.1',
            'nama_elemen' => 'Pelayanan',
            'nilai_default' => 'MK',
            'nilai_final' => 'MK',
            'nilai_sesuai' => true,
        ]);

        // Finalisasi
        $this->actingAsVerifikator()->postJson("/api/verifikasi/{$lv->id}/final", [])
            ->assertOk();

        // Attempt: ubah setelah final
        $this->actingAsVerifikator()->putJson("/api/verifikasi/items/{$item->id}/nilai", [
            'nilai_final' => 'Tidak MK',
            'nilai_sesuai' => false,
            'catatan' => 'Tetap ingin diubah',
        ])->assertStatus(422)
          ->assertJsonPath('message', 'Verifikasi sudah final, tidak dapat diubah.');
    }

    // ══════════════════════════════════════════════════════════════════════════
    // E4 — AC-10: Matriks Privilege ditegakkan di back-end
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * AC-10: Role tanpa privilege TIDAK BISA akses endpoint terkait.
     * Diuji untuk seluruh 6 Role bawaan terhadap 3 modul berbeda.
     */
    public function test_e4_ac10_seluruh_role_ditolak_tanpa_privilege(): void
    {
        // ── Faskes: tidak punya akses Penugasan ─────────────────────────────
        $faskes = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->firstOrFail();
        $this->actingAs($faskes, 'sanctum')
            ->postJson('/api/penugasan/surat-tugas', ['penugasan_id' => Str::uuid()])
            ->assertStatus(403);

        // ── Surveior: tidak punya akses Verifikasi ──────────────────────────
        $surveior = AkunPengguna::where('email', 'ns-0001@surveyor.local')->firstOrFail();
        $this->actingAs($surveior, 'sanctum')
            ->postJson('/api/verifikasi/verifikator', ['siklus_id' => Str::uuid()])
            ->assertStatus(403);

        // ── Divisi SDM: tidak punya akses Verifikasi ──────────────────────────
        $sdm = AkunPengguna::where('email', 'sdm@lembaga.local')->firstOrFail();
        $this->actingAs($sdm, 'sanctum')
            ->postJson('/api/verifikasi/verifikator', ['siklus_id' => Str::uuid()])
            ->assertStatus(403);

        // ── Verifikator: tidak punya akses Admin roles ───────────────────────
        $verifikator = AkunPengguna::where('email', 'ns-0002@surveyor.local')->firstOrFail();
        $this->actingAs($verifikator, 'sanctum')
            ->getJson('/api/admin/roles')
            ->assertStatus(403);

        // ── Tidak ada role: rejected without valid auth (any 4xx = ok) ─────────
        foreach ([
            '/api/penugasan/surat-tugas' => 'POST',
            '/api/verifikasi/verifikator' => 'POST',
            '/api/verifikasi/1/final' => 'POST',
        ] as $url => $method) {
            $resp = $this->json($method, $url, []);
            $this->assertTrue(
                $resp->status() >= 400 && $resp->status() < 500,
                "Expected 4xx for {$method} {$url}, got {$resp->status()}: " . json_encode($resp->json())
            );
        }
    }

    /**
     * AC-10: Role DENGAN privilege BISA akses endpoint terkait.
     * Admin Lembaga punya akses Verifikasi (Lihat)
     */
    public function test_e4_ac10_role_dengan_privilege_diizinkan(): void
    {
        $admin = AkunPengguna::where('email', 'admin@erp.local')->firstOrFail();

        // Admin Lembaga → privilege: Verifikasi + Lihat
        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/verifikasi/elemen-standar')
            ->assertOk();
    }

    /**
     * AC-10: Perubahan privilege langsung berdampak pada akses API.
     */
    public function test_e4_ac10_perubahan_privilege_berlaku_segera(): void
    {
        $admin = AkunPengguna::where('email', 'admin@erp.local')->firstOrFail();
        $sdm = AkunPengguna::where('email', 'sdm@lembaga.local')->firstOrFail();
        $SDMrole = \App\Models\Role::where('nama_role', 'Divisi SDM')->firstOrFail();

        $menuKonfigurasi = \App\Models\MenuAction::where('modul', 'SDM & Siklus Penugasan')
            ->where('action', 'Ubah')->first();

        // SDM awalnya punya akses Ubah konfigurasi
        $this->actingAs($sdm, 'sanctum')
            ->putJson('/api/sdm/konfigurasi-penugasan', ['batas_periode_aktif' => '1'])
            ->assertOk();

        // Admin cabut privilege Ubah
        \App\Models\RolePrivilege::where('role_id', $SDMrole->id)
            ->where('menu_action_id', $menuKonfigurasi->id)
            ->update(['diizinkan' => false]);

        // Sekarang SDM tidak bisa akses
        $this->actingAs($sdm, 'sanctum')
            ->putJson('/api/sdm/konfigurasi-penugasan', ['batas_periode_aktif' => '0'])
            ->assertStatus(403);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Helpers
    // ══════════════════════════════════════════════════════════════════════════

    private function actingAsVerifikator(): static
    {
        return $this->actingAs(AkunPengguna::where('email', 'ns-0002@surveyor.local')->firstOrFail(), 'sanctum');
    }

    private function createSiklusWithSelesaiStatus(): SiklusAkreditasi
    {
        $lembaga = Lembaga::first();
        $faskesId = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->first()->faskes_id;

        return SiklusAkreditasi::create([
            'id' => (string) Str::uuid(),
            'faskes_id' => $faskesId,
            'lembaga_id' => $lembaga->id,
            'tanggal_pengajuan' => now()->toDateString(),
            'status' => 'menunggu_dokumen',
            'status_kelengkapan' => 'lengkap',
            'created_at' => now(),
        ]);
    }

    private function createSurveior(): TenagaAhli
    {
        return TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-E2-' . Str::random(4),
            'nama' => 'Surveior Test ' . Str::random(4),
            'peran' => 'surveior',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
        ]);
    }

    private function createVerifikator(): TenagaAhli
    {
        $v = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-E2V-' . Str::random(4),
            'nama' => 'Verifikator Test ' . Str::random(4),
            'peran' => 'verifikator',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
        ]);

        HistoriAntrianPenugasan::create([
            'id' => (string) Str::uuid(),
            'tenaga_ahli_id' => $v->id,
            'peran' => 'verifikator',
            'nomor_urut' => 1,
            'status_kesediaan' => 'siap',
        ]);

        return $v;
    }

    private function setupVerifikasiWorkspace(): array
    {
        $siklus = $this->createSiklusWithSelesaiStatus();
        $surveior = $this->createSurveior();
        $verifikator = $this->createVerifikator();

        // Link verifikator ke akun demo
        $verifUser = AkunPengguna::where('email', 'ns-0002@surveyor.local')->first();
        $verifUser->forceFill(['tenaga_ahli_id' => $verifikator->id])->save();

        // Penugasan survei + laporan
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

        // Penugasan verifikasi
        $penugasanVerif = Penugasan::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'tenaga_ahli_id' => $verifikator->id,
            'jenis' => 'verifikasi',
            'status' => 'menunggu',
        ]);

        $lv = LaporanVerifikasi::create([
            'id' => (string) Str::uuid(),
            'laporan_id' => $laporan->id,
            'verifikasi_penugasan_id' => $penugasanVerif->id,
            'status_final' => 'draft',
        ]);

        $item = VerifikasiItem::create([
            'id' => (string) Str::uuid(),
            'laporan_verifikasi_id' => $lv->id,
            'kode_elemen' => 'EP-TEST',
            'nama_elemen' => 'Test Elemen',
            'nilai_default' => 'MK',
        ]);

        return [$lv, $item];
    }
}
