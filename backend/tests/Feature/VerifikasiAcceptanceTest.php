<?php

namespace Tests\Feature;

use App\Models\AkunPengguna;
use App\Models\Laporan;
use App\Models\LaporanVerifikasi;
use App\Models\Lembaga;
use App\Models\NotifikasiTagihan;
use App\Models\Penugasan;
use App\Models\SiklusAkreditasi;
use App\Models\TenagaAhli;
use App\Models\VerifikasiItem;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class VerifikasiAcceptanceTest extends TestCase
{
    use RefreshDatabase;

    private ?string $testVerifikatorId = null;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        // FR-3.7: exclude demo TA from queue selection
        $demoSurveior = TenagaAhli::where('nomor_induk_surveior', 'NS-0001')->first();
        if ($demoSurveior) {
            $demoSurveior->forceFill(['status_penugasan_saat_ini' => 'sedang_bertugas'])->save();
        }
        $demoVerifikator = TenagaAhli::where('nomor_induk_surveior', 'NS-0002')->first();
        if ($demoVerifikator) {
            \App\Models\HistoriAntrianPenugasan::where('tenaga_ahli_id', $demoVerifikator->id)
                ->where('peran', 'verifikator')
                ->update(['nomor_urut' => 999]);
        }
    }

    private function actingAsAdmin(): static
    {
        return $this->actingAs(AkunPengguna::where('email', 'admin@erp.local')->firstOrFail(), 'sanctum');
    }

    private function actingAsVerifikator(): static
    {
        $user = AkunPengguna::where('tenaga_ahli_id', $this->testVerifikatorId)->firstOrFail();
        return $this->actingAs($user, 'sanctum');
    }

    private function createSiklusWithSurveyReport(): array
    {
        $lembaga = Lembaga::first();
        $faskesUser = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->first();
        $faskes = $faskesUser->faskes;

        $siklus = SiklusAkreditasi::create([
            'id' => (string) Str::uuid(),
            'faskes_id' => $faskes->id,
            'lembaga_id' => $lembaga->id,
            'tanggal_pengajuan' => now()->toDateString(),
            'status' => 'menunggu_dokumen',
            'status_kelengkapan' => 'lengkap',
            'created_at' => now(),
        ]);

        // Surveyor assignment
        $surveior = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-AC4-1',
            'nama' => 'Surveior Test',
            'peran' => 'surveior',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
        ]);

        $surveyAssignment = Penugasan::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'tenaga_ahli_id' => $surveior->id,
            'jenis' => 'survei',
            'status' => 'selesai',
        ]);

        // Survey report submitted
        $laporan = Laporan::create([
            'id' => (string) Str::uuid(),
            'penugasan_id' => $surveyAssignment->id,
            'tipe' => 'survei',
            'submitted_at' => now(),
        ]);

        // Verifikator assignment
        $verifikator = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-AC4-2',
            'nama' => 'Verifikator Test',
            'peran' => 'verifikator',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
        ]);

        $verifikasiAssignment = Penugasan::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'tenaga_ahli_id' => $verifikator->id,
            'jenis' => 'verifikasi',
            'status' => 'menunggu',
        ]);

        // Link verifikator account (create manually since verifikator@demo.local is not in AkunPenggunaSeeder)
        $verifRole = \App\Models\Role::where('nama_role', 'Verifikator')->first();
        $verifUser = AkunPengguna::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'email' => 'verif-test-' . $verifikator->id . '@test.local',
            'password_hash' => \Illuminate\Support\Facades\Hash::make('password'),
            'role_id' => $verifRole?->id,
            'nama' => 'Verifikator Test',
            'tenaga_ahli_id' => $verifikator->id,
            'faskes_id' => null,
            'status_akun' => 'Aktif',
        ]);
        $this->testVerifikatorId = $verifikator->id;

        // LaporanVerifikasi
        $lv = LaporanVerifikasi::create([
            'id' => (string) Str::uuid(),
            'laporan_id' => $laporan->id,
            'verifikasi_penugasan_id' => $verifikasiAssignment->id,
            'status_final' => 'draft',
        ]);

        return [
            'siklus' => $siklus,
            'laporan' => $laporan,
            'lv' => $lv,
            'verifikator' => $verifikator,
            'verifikasi_assignment' => $verifikasiAssignment,
        ];
    }

    // ─── AC-3: No comment on score change → blocked ───────────────────────

    public function test_ac3_score_change_without_comment_is_rejected(): void
    {
        $data = $this->createSiklusWithSurveyReport();
        $lv = $data['lv'];
        $verifikator = $data['verifikator'];

        $item = VerifikasiItem::create([
            'id' => (string) Str::uuid(),
            'laporan_verifikasi_id' => $lv->id,
            'kode_elemen' => 'EP-1.1',
            'nama_elemen' => 'Pelayanan yang人为本',
            'nilai_default' => 'MK',
            'nilai_final' => null,
            'catatan' => null,
        ]);

        // Attempt: change score without comment
        $this->actingAsVerifikator();
        $resp = $this->actingAsVerifikator()->putJson("/api/verifikasi/items/{$item->id}/nilai", [
            'nilai_final' => 'Tidak MK',
            'nilai_sesuai' => false,
            // catatan missing
        ]);

        $resp->assertStatus(422)
            ->assertJsonPath('message', 'Kolom komentar WAJIB diisi jika nilai diubah.');

        // Verify item unchanged
        $item->refresh();
        $this->assertNull($item->nilai_final);
        $this->assertNull($item->catatan);
    }

    public function test_ac3_score_change_with_comment_succeeds(): void
    {
        $data = $this->createSiklusWithSurveyReport();
        $lv = $data['lv'];

        $item = VerifikasiItem::create([
            'id' => (string) Str::uuid(),
            'laporan_verifikasi_id' => $lv->id,
            'kode_elemen' => 'EP-1.1',
            'nama_elemen' => 'Pelayanan yang人为本',
            'nilai_default' => 'MK',
            'nilai_final' => null,
        ]);

        $resp = $this->actingAsVerifikator()->putJson("/api/verifikasi/items/{$item->id}/nilai", [
            'nilai_final' => 'Tidak MK',
            'nilai_sesuai' => false,
            'catatan' => 'Berdasarkan observasi, ditemukan ketidaksesuaian dengan standar.',
        ]);

        $resp->assertOk();

        $item->refresh();
        $this->assertEquals('Tidak MK', $item->nilai_final);
        $this->assertEquals('Berdasarkan observasi, ditemukan ketidaksesuaian dengan standar.', $item->catatan);
    }

    public function test_ac3_same_value_no_comment_required(): void
    {
        $data = $this->createSiklusWithSurveyReport();
        $lv = $data['lv'];

        $item = VerifikasiItem::create([
            'id' => (string) Str::uuid(),
            'laporan_verifikasi_id' => $lv->id,
            'kode_elemen' => 'EP-2.1',
            'nama_elemen' => 'Mutu dan Keselamatan',
            'nilai_default' => 'MK',
            'nilai_final' => null,
        ]);

        // "Nilai sama" — no comment needed
        $resp = $this->actingAsVerifikator()->putJson("/api/verifikasi/items/{$item->id}/nilai-sama", []);

        $resp->assertOk();

        $item->refresh();
        $this->assertEquals('MK', $item->nilai_final);
        $this->assertTrue($item->nilai_sesuai);
        $this->assertNull($item->catatan);
    }

    public function test_ac3_cannot_finalize_with_unfilled_items(): void
    {
        $data = $this->createSiklusWithSurveyReport();
        $lv = $data['lv'];

        // Only one item filled, one still null
        VerifikasiItem::create([
            'id' => (string) Str::uuid(),
            'laporan_verifikasi_id' => $lv->id,
            'kode_elemen' => 'EP-1.1',
            'nama_elemen' => 'Pelayanan',
            'nilai_default' => 'MK',
            'nilai_final' => 'MK',
            'nilai_sesuai' => true,
        ]);
        VerifikasiItem::create([
            'id' => (string) Str::uuid(),
            'laporan_verifikasi_id' => $lv->id,
            'kode_elemen' => 'EP-2.1',
            'nama_elemen' => 'Mutu',
            'nilai_default' => 'MK',
            'nilai_final' => null, // unfilled
        ]);

        $resp = $this->actingAsVerifikator()->postJson("/api/verifikasi/{$lv->id}/final", []);

        $resp->assertStatus(422)
            ->assertJsonPath('message', 'Semua item harus terisi sebelum final.');
    }

    public function test_ac3_final_blocked_for_unauthenticated(): void
    {
        $data = $this->createSiklusWithSurveyReport();
        $lv = $data['lv'];

        $this->postJson("/api/verifikasi/{$lv->id}/final", [])->assertStatus(401);
    }

    public function test_ac3_final_blocked_without_privilege(): void
    {
        $data = $this->createSiklusWithSurveyReport();
        $lv = $data['lv'];

        $faskesUser = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->firstOrFail();
        $this->actingAs($faskesUser, 'sanctum')
            ->postJson("/api/verifikasi/{$lv->id}/final", [])
            ->assertStatus(403);
    }

    // ─── AC-4: Final locks document + triggers billing notification ──────────

    public function test_ac4_final_locks_verifikasi_permanently(): void
    {
        $data = $this->createSiklusWithSurveyReport();
        $lv = $data['lv'];

        // Fill all items
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

        // Verify locked
        $lv->refresh();
        $this->assertEquals('final', $lv->status_final);
        $this->assertNotNull($lv->finalized_at);

        // Attempt to change after final → must be blocked
        $item = $lv->items->first();
        $this->actingAsVerifikator()->putJson("/api/verifikasi/items/{$item->id}/nilai", [
            'nilai_final' => 'Tidak MK',
            'nilai_sesuai' => false,
            'catatan' => 'Attempted change after final',
        ])->assertStatus(422)
          ->assertJsonPath('message', 'Verifikasi sudah final, tidak dapat diubah.');
    }

    public function test_ac4_final_creates_notifikasi_tagihan_for_keuangan(): void
    {
        $data = $this->createSiklusWithSurveyReport();
        $lv = $data['lv'];
        $verifikasiAssignment = $data['verifikasi_assignment'];

        foreach (['EP-1.1', 'EP-2.1'] as $kode) {
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

        $this->actingAsVerifikator()->postJson("/api/verifikasi/{$lv->id}/final", []);

        $notifikasi = NotifikasiTagihan::where('penugasan_id', $verifikasiAssignment->id)->first();

        $this->assertNotNull($notifikasi, 'NotifikasiTagihan should be created');
        $this->assertEquals('honor_verifikator', $notifikasi->jenis);
        $this->assertEquals('menunggu', $notifikasi->status);
        $this->assertEquals($data['siklus']->id, $notifikasi->siklus_id);
        $this->assertArrayHasKey('verifikator_nama', $notifikasi->detail);
        $this->assertArrayHasKey('finalized_by', $notifikasi->detail);
        $this->assertArrayHasKey('jumlah_item', $notifikasi->detail);
    }

    public function test_ac4_final_updates_penugasan_to_selesai(): void
    {
        $data = $this->createSiklusWithSurveyReport();
        $lv = $data['lv'];
        $verifikasiAssignment = $data['verifikasi_assignment'];

        VerifikasiItem::create([
            'id' => (string) Str::uuid(),
            'laporan_verifikasi_id' => $lv->id,
            'kode_elemen' => 'EP-1.1',
            'nama_elemen' => 'Pelayanan',
            'nilai_default' => 'MK',
            'nilai_final' => 'MK',
            'nilai_sesuai' => true,
        ]);

        $this->actingAsVerifikator()->postJson("/api/verifikasi/{$lv->id}/final", []);

        $verifikasiAssignment->refresh();
        $this->assertEquals('selesai', $verifikasiAssignment->status);
    }

    public function test_ac4_preview_final_shows_unfilled_and_changed_items(): void
    {
        $data = $this->createSiklusWithSurveyReport();
        $lv = $data['lv'];

        VerifikasiItem::create([
            'id' => (string) Str::uuid(),
            'laporan_verifikasi_id' => $lv->id,
            'kode_elemen' => 'EP-1.1',
            'nama_elemen' => 'Pelayanan',
            'nilai_default' => 'MK',
            'nilai_final' => 'MK',
            'nilai_sesuai' => true,
        ]);
        $changed = VerifikasiItem::create([
            'id' => (string) Str::uuid(),
            'laporan_verifikasi_id' => $lv->id,
            'kode_elemen' => 'EP-2.1',
            'nama_elemen' => 'Mutu',
            'nilai_default' => 'MK',
            'nilai_final' => 'Tidak MK',
            'nilai_sesuai' => false,
            'catatan' => 'Ketidaksesuaian ditemukan.',
        ]);
        VerifikasiItem::create([
            'id' => (string) Str::uuid(),
            'laporan_verifikasi_id' => $lv->id,
            'kode_elemen' => 'EP-3.1',
            'nama_elemen' => 'Keselamatan',
            'nilai_default' => 'MK',
            'nilai_final' => null, // unfilled
        ]);

        $resp = $this->actingAsVerifikator()->getJson("/api/verifikasi/{$lv->id}/preview-final");

        $resp->assertOk()
            ->assertJsonPath('can_final', false)
            ->assertJsonPath('unfilled_count', 1)
            ->assertJsonPath('changed_count', 1)
            ->assertJsonPath('total_items', 3);

        $changedItems = $resp->json('changed_items');
        $this->assertCount(1, $changedItems);
        $this->assertEquals('EP-2.1', $changedItems[0]['kode_elemen']);
        $this->assertEquals('Tidak MK', $changedItems[0]['nilai_final']);
        $this->assertEquals('Ketidaksesuaian ditemukan.', $changedItems[0]['catatan']);
    }

    public function test_ac4_cannot_finalize_same_verifikasi_twice(): void
    {
        $data = $this->createSiklusWithSurveyReport();
        $lv = $data['lv'];

        VerifikasiItem::create([
            'id' => (string) Str::uuid(),
            'laporan_verifikasi_id' => $lv->id,
            'kode_elemen' => 'EP-1.1',
            'nama_elemen' => 'Pelayanan',
            'nilai_default' => 'MK',
            'nilai_final' => 'MK',
        ]);

        // First finalize
        $this->actingAsVerifikator()->postJson("/api/verifikasi/{$lv->id}/final", [])
            ->assertOk();

        // Second finalize attempt
        $this->actingAsVerifikator()->postJson("/api/verifikasi/{$lv->id}/final", [])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Verifikasi sudah final.');
    }

    public function test_ac4_notifikasi_tagihan_detail_contains_required_fields(): void
    {
        $data = $this->createSiklusWithSurveyReport();
        $lv = $data['lv'];

        VerifikasiItem::create([
            'id' => (string) Str::uuid(),
            'laporan_verifikasi_id' => $lv->id,
            'kode_elemen' => 'EP-1.1',
            'nama_elemen' => 'Pelayanan',
            'nilai_default' => 'MK',
            'nilai_final' => 'MK',
        ]);

        $this->actingAsVerifikator()->postJson("/api/verifikasi/{$lv->id}/final", []);

        $notifikasi = NotifikasiTagihan::where('penugasan_id', $data['verifikasi_assignment']->id)->first();

        $detail = $notifikasi->detail;
        $this->assertArrayHasKey('verifikator_id', $detail);
        $this->assertArrayHasKey('verifikator_nama', $detail);
        $this->assertArrayHasKey('siklus_id', $detail);
        $this->assertArrayHasKey('jumlah_item', $detail);
        $this->assertArrayHasKey('finalized_by', $detail);
        $this->assertArrayHasKey('finalized_at', $detail);
    }
}
