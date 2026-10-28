<?php

namespace Tests\Feature;

use App\Models\AkunPengguna;
use App\Models\JurnalUmum;
use App\Models\Lembaga;
use App\Models\LedgerEntry;
use App\Models\Penugasan;
use App\Models\PembayaranHonor;
use App\Models\SiklusAkreditasi;
use App\Models\TenagaAhli;
use App\Services\Keuangan\ApHonorService;
use App\Services\Keuangan\LedgerService;
use App\Services\Keuangan\SettlementJournalService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Kas Keluar (AP) — jurnal Bank Keluar dibuat EKSPLISIT oleh tim Keuangan,
 * mirroring alur Kas Masuk (AR).
 *
 * Aturan yang diuji:
 *   1. Approve pembayaran honor TIDAK lagi membuat jurnal otomatis —
 *      kredit bank hanya sah setelah kas keluar dikonfirmasi ke rekening.
 *   2. POST /api/keuangan/settlement/bank-keluar membuat jurnal
 *      Dr. Utang Honor (2107) / Cr. Kas-Bank, kategori BKK.
 *   3. Idempotent — klik kedua tidak menghasilkan jurnal ganda.
 *   4. Pembayaran yang belum disetujui ditolak (422).
 *   5. Pembatalan pembayaran yang sudah dijurnal membuat jurnal pembalik.
 */
class ApKasKeluarTest extends TestCase
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

    /**
     * Buat satu siklus + honor entry Surveior yang siap dibayar.
     *
     * @return array{0: SiklusAkreditasi, 1: LedgerEntry}
     */
    private function createHonorOutstanding(): array
    {
        // Siklus dibuat pada lemma user keuangan — supaya konsisten dengan
        // session('lembaga_id') saat request (guard lemma di controller).
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
            'nomor_induk_surveior' => 'NIS-KK-' . strtoupper(Str::random(5)),
            'nama' => 'Surveior Kas Keluar',
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

        $entry = app(LedgerService::class)->catatHonorSurveior($penugasan, 2_500_000.0);

        return [$siklus, $entry];
    }

    /**
     * Buat pembayaran honor draft dari satu ledger entry.
     */
    private function createDraftPayment(LedgerEntry $entry): PembayaranHonor
    {
        $svc = app(ApHonorService::class);
        $result = $svc->createPayment(
            ledgerEntryIds: [$entry->id],
            paymentMeta: [
                'tanggal_pembayaran' => now()->toDateString(),
                'metode' => PembayaranHonor::METODE_TRANSFER,
            ],
            userId: AkunPengguna::where('email', 'keuangan@lembaga.local')->firstOrFail()->id,
        );

        $this->assertTrue($result['success'], $result['error'] ?? 'createPayment gagal');

        return $result['pembayaran'];
    }

    public function test_approve_pembayaran_honor_tidak_membuat_jurnal_otomatis(): void
    {
        [, $entry] = $this->createHonorOutstanding();
        $pembayaran = $this->createDraftPayment($entry);

        $result = app(ApHonorService::class)->approvePayment(
            $pembayaran->id,
            AkunPengguna::where('email', 'keuangan@lembaga.local')->firstOrFail()->id,
        );

        $this->assertTrue($result['success']);

        // Honor sudah lunas, tapi jurnal BELUM ada — kas keluar harus
        // dikonfirmasi dulu oleh tim Keuangan (sama seperti AR).
        $this->assertDatabaseHas('ledger_entries', [
            'id' => $entry->id,
            'status_pembayaran' => LedgerEntry::STATUS_LUNAS,
        ]);
        $this->assertDatabaseMissing('jurnal_umum', [
            'ref_type' => SettlementJournalService::REF_AP_HONOR_SETTLEMENT,
            'ref_id' => $pembayaran->id,
        ]);
    }

    public function test_bank_keluar_membuat_jurnal_dr_utang_honor_cr_kas_bank(): void
    {
        [, $entry] = $this->createHonorOutstanding();
        $pembayaran = $this->createDraftPayment($entry);

        app(ApHonorService::class)->approvePayment(
            $pembayaran->id,
            AkunPengguna::where('email', 'keuangan@lembaga.local')->firstOrFail()->id,
        );

        $this->actingAsKeuangan()
            ->postJson('/api/keuangan/settlement/bank-keluar', ['pembayaran_id' => $pembayaran->id])
            ->assertOk()
            ->assertJsonPath('data.created_count', 1);

        $this->assertDatabaseHas('jurnal_umum', [
            'ref_type' => SettlementJournalService::REF_AP_HONOR_SETTLEMENT,
            'ref_id' => $pembayaran->id,
        ]);

        $jurnal = JurnalUmum::where('ref_type', SettlementJournalService::REF_AP_HONOR_SETTLEMENT)
            ->where('ref_id', $pembayaran->id)
            ->firstOrFail();

        $this->assertTrue($jurnal->isBalanced(), 'Jurnal bank keluar harus balanced.');
        $this->assertEquals((float) $pembayaran->total_nominal, (float) $jurnal->total_debit);
        $this->assertEquals((float) $pembayaran->total_nominal, (float) $jurnal->total_kredit);

        $details = $jurnal->details()->with('coa')->get();

        $debit = $details->firstWhere('coa.kode', '2107');
        $kredit = $details->firstWhere('coa.kode', '1102');

        $this->assertNotNull($debit, 'Detail debit harus akun 2107 (Utang Honor).');
        $this->assertNotNull($kredit, 'Detail kredit harus akun 1102 (Bank BCA).');
        $this->assertEquals((float) $pembayaran->total_nominal, (float) $debit->debit);
        $this->assertEquals((float) $pembayaran->total_nominal, (float) $kredit->kredit);

        // Kategori jurnal harus BKK (Bank Keluar)
        $this->assertEquals('bkk', $jurnal->kategori?->jenis);
    }

    public function test_bank_keluar_adalah_idempotent(): void
    {
        [, $entry] = $this->createHonorOutstanding();
        $pembayaran = $this->createDraftPayment($entry);

        app(ApHonorService::class)->approvePayment(
            $pembayaran->id,
            AkunPengguna::where('email', 'keuangan@lembaga.local')->firstOrFail()->id,
        );

        $this->actingAsKeuangan()
            ->postJson('/api/keuangan/settlement/bank-keluar', ['pembayaran_id' => $pembayaran->id])
            ->assertOk();

        // Klik kedua tidak boleh menambah jurnal
        $this->actingAsKeuangan()
            ->postJson('/api/keuangan/settlement/bank-keluar', ['pembayaran_id' => $pembayaran->id])
            ->assertOk()
            ->assertJsonPath('data.created_count', 0)
            ->assertJsonPath('data.skipped_count', 1);

        $this->assertSame(1, JurnalUmum::where('ref_type', SettlementJournalService::REF_AP_HONOR_SETTLEMENT)
            ->where('ref_id', $pembayaran->id)
            ->count());
    }

    public function test_bank_keluar_ditolak_untuk_pembayaran_belum_disetujui(): void
    {
        [, $entry] = $this->createHonorOutstanding();
        $pembayaran = $this->createDraftPayment($entry);

        $this->actingAsKeuangan()
            ->postJson('/api/keuangan/settlement/bank-keluar', ['pembayaran_id' => $pembayaran->id])
            ->assertStatus(422);

        $this->assertDatabaseMissing('jurnal_umum', [
            'ref_type' => SettlementJournalService::REF_AP_HONOR_SETTLEMENT,
            'ref_id' => $pembayaran->id,
        ]);
    }

    public function test_pembatalan_pembayaran_yang_sudah_dijurnal_membuat_jurnal_pembalik(): void
    {
        [, $entry] = $this->createHonorOutstanding();
        $pembayaran = $this->createDraftPayment($entry);
        $userId = AkunPengguna::where('email', 'keuangan@lembaga.local')->firstOrFail()->id;

        app(ApHonorService::class)->approvePayment($pembayaran->id, $userId);

        $this->actingAsKeuangan()
            ->postJson('/api/keuangan/settlement/bank-keluar', ['pembayaran_id' => $pembayaran->id])
            ->assertOk();

        $result = app(ApHonorService::class)->cancelPayment($pembayaran->id, $userId, 'Salah bayar');
        $this->assertTrue($result['success']);

        // Jurnal pembalik: Dr Kas/Bank, Cr Utang Honor
        $this->assertDatabaseHas('jurnal_umum', [
            'ref_type' => SettlementJournalService::REF_AP_HONOR_REVERSAL,
            'ref_id' => $pembayaran->id,
        ]);

        // Honor kembali ke belum_dibayar
        $this->assertDatabaseHas('ledger_entries', [
            'id' => $entry->id,
            'status_pembayaran' => LedgerEntry::STATUS_BELUM_DIBAYAR,
        ]);
    }

    public function test_daftar_kas_keluar_menampilkan_status_jurnal(): void
    {
        [, $entry] = $this->createHonorOutstanding();
        $pembayaran = $this->createDraftPayment($entry);
        $userId = AkunPengguna::where('email', 'keuangan@lembaga.local')->firstOrFail()->id;

        app(ApHonorService::class)->approvePayment($pembayaran->id, $userId);

        // Sebelum jurnal dibuat → belum_dijurnal
        $res = $this->actingAsKeuangan()->getJson('/api/keuangan/ap-honor/kas-keluar')->assertOk();
        $row = collect($res->json('data.data'))->firstWhere('id', $pembayaran->id);
        $this->assertNotNull($row);
        $this->assertFalse($row['sudah_dijurnal']);
        $this->assertNull($row['jurnal_nomor']);

        $this->actingAsKeuangan()
            ->postJson('/api/keuangan/settlement/bank-keluar', ['pembayaran_id' => $pembayaran->id])
            ->assertOk();

        // Setelah jurnal dibuat → sudah_dijurnal + nomor jurnal
        $res = $this->actingAsKeuangan()->getJson('/api/keuangan/ap-honor/kas-keluar')->assertOk();
        $row = collect($res->json('data.data'))->firstWhere('id', $pembayaran->id);
        $this->assertTrue($row['sudah_dijurnal']);
        $this->assertNotNull($row['jurnal_nomor']);
    }
}
