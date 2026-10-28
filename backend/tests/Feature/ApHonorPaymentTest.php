<?php

namespace Tests\Feature;

use App\Models\AkunPengguna;
use App\Models\Lembaga;
use App\Models\Laporan;
use App\Models\LaporanVerifikasi;
use App\Models\LedgerEntry;
use App\Models\Penugasan;
use App\Models\PembayaranHonor;
use App\Models\SiklusAkreditasi;
use App\Models\TenagaAhli;
use App\Services\Keuangan\ApHonorService;
use App\Services\Keuangan\LedgerService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Pembayaran honor — daftar, detail, edit, dan validasi persetujuan.
 *
 * Aturan yang diuji:
 *   1. GET daftar pembayaran tidak boleh 500 (semua relasi wajib eager-load
 *      karena lazy loading dinonaktifkan).
 *   2. Detail pembayaran mengembalikan payload di dalam { data: ... } lengkap
 *      dengan line item — ini yang dipakai form Edit.
 *   3. Edit draft pembayaran mengembalikan data yang sudah terisi.
 *   4. Persetujuan ditolak bila total header tidak sama dengan jumlah line item.
 */
class ApHonorPaymentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    private function actingAsKeuangan(): static
    {
        return $this->actingAs(AkunPengguna::where('email', 'keuangan@lembaga.local')->firstOrFail(), 'sanctum');
    }

    private function keuanganId(): string
    {
        return AkunPengguna::where('email', 'keuangan@lembaga.local')->firstOrFail()->id;
    }

    /**
     * Honor entry Surveior yang siap dibayar (belum_dibayar) dan sudah lolos
     * gate outstanding (siklus → laporan verifikasi dengan rekomendasi
     * disetujui).
     */
    private function createHonorOutstanding(): LedgerEntry
    {
        $user = AkunPengguna::where('email', 'keuangan@lembaga.local')->firstOrFail();
        $lembaga = Lembaga::find($user->lembaga_id) ?? Lembaga::first();
        $faskes = AkunPengguna::whereNotNull('faskes_id')->first()?->faskes;

        $siklus = SiklusAkreditasi::create([
            'id' => (string) Str::uuid(),
            'faskes_id' => $faskes->id,
            'lembaga_id' => $lembaga->id,
            'tanggal_pengajuan' => now()->toDateString(),
            'status' => 'aktif',
            'status_kelengkapan' => 'lengkap',
        ]);

        $surveior = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-AP-' . strtoupper(Str::random(5)),
            'nama' => 'Surveior AP Honor',
            'peran' => 'surveior',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
        ]);

        $penugasan = Penugasan::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'tenaga_ahli_id' => $surveior->id,
            'jenis' => Penugasan::JENIS_SURVEI,
            'status' => Penugasan::STATUS_SEDANG_BERTUGAS,
        ]);

        // Rekomendasi sudah disetujui — tanpa ini honor tidak lolos gate
        // outstanding dan tidak pernah muncul di daftar.
        $laporan = Laporan::create([
            'id' => (string) Str::uuid(),
            'penugasan_id' => $penugasan->id,
            'tipe' => 'verifikasi',
            'submitted_at' => now(),
        ]);

        LaporanVerifikasi::create([
            'id' => (string) Str::uuid(),
            'laporan_id' => $laporan->id,
            'verifikasi_penugasan_id' => $penugasan->id,
            'status_final' => LaporanVerifikasi::STATUS_FINAL,
            'status_rekomendasi' => LaporanVerifikasi::STATUS_REKOMENDASI_DISETUJUI,
        ]);

        return app(LedgerService::class)->catatHonorSurveior($penugasan, 2_500_000.0);
    }

    private function createDraftPayment(LedgerEntry $entry): PembayaranHonor
    {
        $result = app(ApHonorService::class)->createPayment(
            ledgerEntryIds: [$entry->id],
            paymentMeta: [
                'tanggal_pembayaran' => now()->toDateString(),
                'metode' => PembayaranHonor::METODE_TRANSFER,
            ],
            userId: $this->keuanganId(),
        );

        $this->assertTrue($result['success'], $result['error'] ?? 'createPayment gagal');

        return $result['pembayaran'];
    }

    public function test_daftar_pembayaran_tidak_gagal_dan_memuat_field_validasi(): void
    {
        $entry = $this->createHonorOutstanding();
        $pembayaran = $this->createDraftPayment($entry);

        $res = $this->actingAsKeuangan()
            ->getJson('/api/keuangan/ap-honor/payments')
            ->assertOk();

        $row = collect($res->json('data'))->firstWhere('id', $pembayaran->id);

        $this->assertNotNull($row, 'Pembayaran draft harus muncul di daftar riwayat.');
        $this->assertTrue($row['konsisten'], 'Total header harus sama dengan jumlah line item.');
        $this->assertEquals((float) $pembayaran->total_nominal, (float) $row['total_detail']);
        $this->assertNotNull($row['dibatalkan_oleh'] ?? null);
    }

    public function test_detail_pembayaran_mengembalikan_data_dan_line_item(): void
    {
        $entry = $this->createHonorOutstanding();
        $pembayaran = $this->createDraftPayment($entry);

        $res = $this->actingAsKeuangan()
            ->getJson("/api/keuangan/ap-honor/payments/{$pembayaran->id}")
            ->assertOk();

        $data = $res->json('data');

        $this->assertSame($pembayaran->id, $data['id']);
        $this->assertSame($pembayaran->nomor_pembayaran, $data['nomor_pembayaran']);
        $this->assertSame('draft', $data['status']);
        $this->assertNotEmpty($data['details'], 'Detail pembayaran harus berisi line item honor.');
        $this->assertSame($entry->id, $data['details'][0]['ledger_entry_id']);
    }

    public function test_edit_draft_pembayaran_mengembalikan_data_terisi(): void
    {
        $entry = $this->createHonorOutstanding();
        $pembayaran = $this->createDraftPayment($entry);

        $res = $this->actingAsKeuangan()
            ->patchJson("/api/keuangan/ap-honor/payments/{$pembayaran->id}", [
                'tanggal_pembayaran' => now()->subDays(3)->toDateString(),
                'metode' => PembayaranHonor::METODE_TUNAI,
                'bank_pengirim' => 'BCA',
                'catatan' => 'Dibayar di teller',
            ])
            ->assertOk();

        $data = $res->json('data');

        $this->assertSame('tunai', $data['metode']);
        $this->assertSame('BCA', $data['bank_pengirim']);
        $this->assertSame('Dibayar di teller', $data['catatan']);
        $this->assertSame(now()->subDays(3)->toDateString(), $data['tanggal_pembayaran']);
        $this->assertNotEmpty($data['details'], 'Line item harus tetap ada setelah edit.');
    }

    public function test_approve_ditolak_bila_total_tidak_sesuai_line_item(): void
    {
        $entry = $this->createHonorOutstanding();
        $pembayaran = $this->createDraftPayment($entry);

        // Total header sengaja dirusak supaya tidak sama dengan jumlah line item.
        PembayaranHonor::where('id', $pembayaran->id)->update(['total_nominal' => 1_000_000]);

        $result = app(ApHonorService::class)->approvePayment($pembayaran->id, $this->keuanganId());

        $this->assertFalse($result['success']);
        $this->assertStringContainsString('tidak sesuai', $result['error']);

        // Honor tidak boleh jadi lunas kalau pembayaran ditolak.
        $this->assertDatabaseHas('ledger_entries', [
            'id' => $entry->id,
            'status_pembayaran' => LedgerEntry::STATUS_BELUM_DIBAYAR,
        ]);
    }

    public function test_approve_ditolak_bila_honor_sudah_lunas(): void
    {
        $entry = $this->createHonorOutstanding();
        $pembayaran = $this->createDraftPayment($entry);

        LedgerEntry::where('id', $entry->id)->update(['status_pembayaran' => LedgerEntry::STATUS_LUNAS]);

        $result = app(ApHonorService::class)->approvePayment($pembayaran->id, $this->keuanganId());

        $this->assertFalse($result['success']);
        $this->assertStringContainsString('lunas', $result['error']);
    }

    /**
     * Honor yang sudah masuk sebuah pembayaran (draft) tidak boleh muncul
     * lagi di daftar outstanding — kalau tetap muncul, user bisa memilihnya
     * ulang dan pembayaran kedua akan bentrok dengan UNIQUE constraint
     * pembayaran_honor_detail.ledger_entry_id.
     */
    public function test_honor_dalam_pembayaran_tidak_muncul_di_daftar_outstanding(): void
    {
        $entry = $this->createHonorOutstanding();
        $this->createDraftPayment($entry);

        $res = $this->actingAsKeuangan()
            ->getJson('/api/keuangan/ap-honor/outstanding')
            ->assertOk();

        $ids = collect($res->json('data.entries'))->pluck('id');

        $this->assertFalse(
            $ids->contains($entry->id),
            'Honor yang sudah termasuk pembayaran tidak boleh muncul di daftar outstanding.'
        );
    }

    /**
     * Honor yang pembayarannya sudah dibatalkan (detail dihapus) harus
     * kembali muncul di daftar outstanding supaya bisa dibayar ulang.
     */
    public function test_honor_kembali_muncul_setelah_pembayaran_dibatalkan(): void
    {
        $entry = $this->createHonorOutstanding();
        $pembayaran = $this->createDraftPayment($entry);

        app(ApHonorService::class)->cancelPayment($pembayaran->id, $this->keuanganId(), 'Salah input');

        $res = $this->actingAsKeuangan()
            ->getJson('/api/keuangan/ap-honor/outstanding')
            ->assertOk();

        $ids = collect($res->json('data.entries'))->pluck('id');

        $this->assertTrue(
            $ids->contains($entry->id),
            'Honor harus kembali muncul di daftar outstanding setelah pembayaran dibatalkan.'
        );
    }

    /**
     * Honor yang pembayarannya sudah disetujui (divalidasi) tidak boleh
     * muncul lagi di daftar outstanding.
     */
    public function test_honor_yang_sudah_divalidasi_tidak_muncul_di_daftar_outstanding(): void
    {
        $entry = $this->createHonorOutstanding();
        $pembayaran = $this->createDraftPayment($entry);

        $result = app(ApHonorService::class)->approvePayment($pembayaran->id, $this->keuanganId());
        $this->assertTrue($result['success'], $result['error'] ?? 'approvePayment gagal');

        $res = $this->actingAsKeuangan()
            ->getJson('/api/keuangan/ap-honor/outstanding')
            ->assertOk();

        $ids = collect($res->json('data.entries'))->pluck('id');

        $this->assertFalse(
            $ids->contains($entry->id),
            'Honor yang pembayarannya sudah disetujui tidak boleh muncul di daftar outstanding.'
        );
    }

    /**
     * Menambahkan honor yang sudah ada di pembayaran lain harus ditolak
     * dengan pesan yang jelas, bukan error UNIQUE constraint dari database.
     */
    public function test_membuat_pembayaran_ditolak_bila_honor_sudah_dalam_pembayaran_lain(): void
    {
        $entry = $this->createHonorOutstanding();
        $this->createDraftPayment($entry);

        $res = $this->actingAsKeuangan()
            ->postJson('/api/keuangan/ap-honor/payments', [
                'ledger_entry_ids' => [$entry->id],
                'tanggal_pembayaran' => now()->toDateString(),
                'metode' => PembayaranHonor::METODE_TRANSFER,
            ])
            ->assertStatus(422);

        $this->assertStringContainsString('pembayaran lain', $res->json('message'));
    }
}
