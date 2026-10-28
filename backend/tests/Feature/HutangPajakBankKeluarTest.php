<?php

namespace Tests\Feature;

use App\Models\AkunPengguna;
use App\Models\HutangPajak;
use App\Models\JurnalUmum;
use App\Models\Lembaga;
use App\Models\LedgerEntry;
use App\Models\Penugasan;
use App\Models\PembayaranHonor;
use App\Models\SiklusAkreditasi;
use App\Models\TenagaAhli;
use App\Services\Keuangan\ApHonorService;
use App\Services\Keuangan\HutangPajakService;
use App\Services\Keuangan\LedgerService;
use App\Services\Keuangan\SettlementJournalService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Kas Keluar (AP) — hutang pajak PPh 21.
 *
 * Aturan yang diuji:
 *   1. Tandai lunas TIDAK membuat jurnal otomatis — kredit bank hanya sah
 *      setelah setor PPh benar-benar keluar dari rekening.
 *   2. POST /api/keuangan/settlement/bank-keluar-pajak membuat jurnal
 *      Dr. Utang PPh 21 (2102) / Cr. Kas-Bank, kategori BKK.
 *   3. Idempotent — klik kedua tidak menghasilkan jurnal ganda.
 *   4. Hutang yang belum dibayar ditolak (422).
 *   5. Daftar hutang pajak menampilkan status jurnal (sudah_dijurnal).
 */
class HutangPajakBankKeluarTest extends TestCase
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
     * Buat siklus + honor entry Surveior, lalu hutang pajak PPh 21 yang
     * berasal dari pembayaran honor tersebut.
     *
     * @return array{0: HutangPajak, 1: PembayaranHonor}
     */
    private function createHutangPajak(): array
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
            'nomor_induk_surveior' => 'NIS-PAJ-' . strtoupper(Str::random(5)),
            'nama' => 'Surveior Pajak',
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

        // Buat pembayaran honor dan setujui — ini yang memunculkan hutang
        // pajak (PPh 21 dipotong dari honor).
        $svc = app(ApHonorService::class);
        $created = $svc->createPayment(
            ledgerEntryIds: [$entry->id],
            paymentMeta: [
                'tanggal_pembayaran' => now()->toDateString(),
                'metode' => PembayaranHonor::METODE_TRANSFER,
            ],
            userId: $user->id,
        );
        $this->assertTrue($created['success'], $created['error'] ?? 'createPayment gagal');

        $svc->approvePayment($created['pembayaran']->id, $user->id);

        $hutang = HutangPajak::where('pembayaran_honor_id', $created['pembayaran']->id)->first();
        $this->assertNotNull($hutang, 'Hutang pajak PPh 21 harus dibuat saat honor disetujui.');

        return [$hutang, $created['pembayaran']];
    }

    public function test_tandai_lunas_tidak_membuat_jurnal_otomatis(): void
    {
        [$hutang] = $this->createHutangPajak();

        $result = app(HutangPajakService::class)->markAsPaid(
            hutangId: $hutang->id,
            userId: AkunPengguna::where('email', 'keuangan@lembaga.local')->firstOrFail()->id,
        );

        $this->assertTrue($result['success']);

        // Hutang sudah lunas, tapi jurnal BELUM ada — setor PPh harus
        // dikonfirmasi dulu oleh tim Keuangan (sama seperti AR & AP Honor).
        $this->assertDatabaseHas('hutang_pajak', [
            'id' => $hutang->id,
            'status' => HutangPajak::STATUS_DIBAYAR,
        ]);
        $this->assertDatabaseMissing('jurnal_umum', [
            'ref_type' => SettlementJournalService::REF_AP_PAJAK_SETTLEMENT,
            'ref_id' => $hutang->id,
        ]);
    }

    public function test_bank_keluar_membuat_jurnal_dr_utang_pph21_cr_kas_bank(): void
    {
        [$hutang] = $this->createHutangPajak();

        app(HutangPajakService::class)->markAsPaid(
            hutangId: $hutang->id,
            userId: AkunPengguna::where('email', 'keuangan@lembaga.local')->firstOrFail()->id,
        );

        $this->actingAsKeuangan()
            ->postJson('/api/keuangan/settlement/bank-keluar-pajak', ['hutang_pajak_id' => $hutang->id])
            ->assertOk()
            ->assertJsonPath('data.created_count', 1);

        $jurnal = JurnalUmum::where('ref_type', SettlementJournalService::REF_AP_PAJAK_SETTLEMENT)
            ->where('ref_id', $hutang->id)
            ->firstOrFail();

        $this->assertTrue($jurnal->isBalanced(), 'Jurnal bank keluar harus balanced.');
        $this->assertEquals((float) $hutang->jumlah_pajak, (float) $jurnal->total_debit);
        $this->assertEquals((float) $hutang->jumlah_pajak, (float) $jurnal->total_kredit);

        $details = $jurnal->details()->with('coa')->get();

        $debit = $details->firstWhere('coa.kode', SettlementJournalService::COA_UTANG_PPH21);
        $kredit = $details->firstWhere('coa.kode', SettlementJournalService::COA_BANK_BCA);

        $this->assertNotNull($debit, 'Detail debit harus akun 2102 (Utang PPh 21).');
        $this->assertNotNull($kredit, 'Detail kredit harus akun 1102 (Bank BCA).');
        $this->assertEquals((float) $hutang->jumlah_pajak, (float) $debit->debit);
        $this->assertEquals((float) $hutang->jumlah_pajak, (float) $kredit->kredit);

        // Kategori jurnal harus BKK (Bank Keluar)
        $this->assertEquals('bkk', $jurnal->kategori?->jenis);
    }

    public function test_bank_keluar_adalah_idempotent(): void
    {
        [$hutang] = $this->createHutangPajak();

        app(HutangPajakService::class)->markAsPaid(
            hutangId: $hutang->id,
            userId: AkunPengguna::where('email', 'keuangan@lembaga.local')->firstOrFail()->id,
        );

        $this->actingAsKeuangan()
            ->postJson('/api/keuangan/settlement/bank-keluar-pajak', ['hutang_pajak_id' => $hutang->id])
            ->assertOk();

        // Klik kedua → 200 dengan created_count 0 + jurnal yang sudah ada.
        // Bukan error: dobel posting dicegah idempotency service + unique
        // index (ref_type, ref_id), dan UI tetap bisa menampilkan nomor
        // jurnal tanpa perlu refresh manual.
        $this->actingAsKeuangan()
            ->postJson('/api/keuangan/settlement/bank-keluar-pajak', ['hutang_pajak_id' => $hutang->id])
            ->assertOk()
            ->assertJsonPath('data.created_count', 0)
            ->assertJsonPath('data.skipped_count', 1);

        $this->assertSame(1, JurnalUmum::where('ref_type', SettlementJournalService::REF_AP_PAJAK_SETTLEMENT)
            ->where('ref_id', $hutang->id)
            ->count());
    }

    public function test_bank_keluar_ditolak_untuk_hutang_belum_dibayar(): void
    {
        [$hutang] = $this->createHutangPajak();

        $this->actingAsKeuangan()
            ->postJson('/api/keuangan/settlement/bank-keluar-pajak', ['hutang_pajak_id' => $hutang->id])
            ->assertStatus(422);

        $this->assertDatabaseMissing('jurnal_umum', [
            'ref_type' => SettlementJournalService::REF_AP_PAJAK_SETTLEMENT,
            'ref_id' => $hutang->id,
        ]);
    }

    public function test_daftar_hutang_pajak_menampilkan_status_jurnal(): void
    {
        [$hutang] = $this->createHutangPajak();

        app(HutangPajakService::class)->markAsPaid(
            hutangId: $hutang->id,
            userId: AkunPengguna::where('email', 'keuangan@lembaga.local')->firstOrFail()->id,
        );

        // Sebelum jurnal dibuat → belum_dijurnal
        $res = $this->actingAsKeuangan()->getJson('/api/keuangan/hutang-pajak')->assertOk();
        $row = collect($res->json('data.entries'))->firstWhere('id', $hutang->id);
        $this->assertNotNull($row);
        $this->assertFalse($row['sudah_dijurnal']);
        $this->assertNull($row['jurnal_nomor']);

        $this->actingAsKeuangan()
            ->postJson('/api/keuangan/settlement/bank-keluar-pajak', ['hutang_pajak_id' => $hutang->id])
            ->assertOk();

        // Setelah jurnal dibuat → sudah_dijurnal + nomor jurnal
        $res = $this->actingAsKeuangan()->getJson('/api/keuangan/hutang-pajak')->assertOk();
        $row = collect($res->json('data.entries'))->firstWhere('id', $hutang->id);
        $this->assertTrue($row['sudah_dijurnal']);
        $this->assertNotNull($row['jurnal_nomor']);
    }

    public function test_detail_hutang_pajak_menampilkan_status_jurnal(): void
    {
        [$hutang] = $this->createHutangPajak();

        app(HutangPajakService::class)->markAsPaid(
            hutangId: $hutang->id,
            userId: AkunPengguna::where('email', 'keuangan@lembaga.local')->firstOrFail()->id,
        );

        $res = $this->actingAsKeuangan()
            ->getJson('/api/keuangan/hutang-pajak/' . $hutang->id)
            ->assertOk();

        $this->assertFalse($res->json('data.sudah_dijurnal'));

        $this->actingAsKeuangan()
            ->postJson('/api/keuangan/settlement/bank-keluar-pajak', ['hutang_pajak_id' => $hutang->id])
            ->assertOk();

        $res = $this->actingAsKeuangan()
            ->getJson('/api/keuangan/hutang-pajak/' . $hutang->id)
            ->assertOk();

        $this->assertTrue($res->json('data.sudah_dijurnal'));
        $this->assertNotNull($res->json('data.jurnal_nomor'));
    }
}
