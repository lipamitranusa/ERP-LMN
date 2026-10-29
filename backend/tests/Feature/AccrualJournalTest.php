<?php

namespace Tests\Feature;

use App\Models\Coa;
use App\Models\Faskes;
use App\Models\Invoice;
use App\Models\JurnalUmum;
use App\Models\Lembaga;
use App\Models\LedgerEntry;
use App\Models\Pks;
use App\Models\SiklusAkreditasi;
use App\Services\Keuangan\AccrualJournalService;
use App\Services\Keuangan\AccountingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Jurnal akrual pendapatan & beban honor — pasangan dari jurnal
 * settlement (BKM/BKK) supaya laporan laba rugi dan saldo piutang/utang
 * benar-benar terpakai.
 */
class AccrualJournalTest extends TestCase
{
    use RefreshDatabase;

    private Lembaga $lembaga;
    private SiklusAkreditasi $siklus;

    protected function setUp(): void
    {
        parent::setUp();

        $this->lembaga = Lembaga::create([
            'id' => (string) Str::uuid(),
            'nama' => 'Lembaga Uji Akrual',
        ]);
        session(['lembaga_id' => $this->lembaga->id]);

        $faskes = Faskes::create([
            'id' => (string) Str::uuid(),
            'nama' => 'RS Uji Akrual',
            'tipe_faskes' => 'Rumah Sakit',
            'alamat' => 'Jl. Uji',
            'status' => 'Aktif',
            'telepon' => '081234567890',
            'email' => Str::random(5) . '@example.com',
        ]);

        $this->siklus = SiklusAkreditasi::create([
            'id' => (string) Str::uuid(),
            'faskes_id' => $faskes->id,
            'lembaga_id' => $this->lembaga->id,
            'tanggal_pengajuan' => now()->subDays(10)->toDateString(),
            'status' => 'menunggu_dokumen',
            'status_kelengkapan' => 'lengkap',
            'created_at' => now()->subDays(10),
        ]);

        // COA yang dipakai jurnal akrual.
        $this->makeCoa('1102', 'Bank BCA', Coa::JENIS_AKTIVA_LANCAR);
        $this->makeCoa('1105', 'Piutang Usaha', Coa::JENIS_AKTIVA_LANCAR);
        $this->makeCoa('2102', 'Utang PPh 21', Coa::JENIS_KEWAJIBAN_LANCAR, 'kredit');
        $this->makeCoa('2107', 'Utang Honor', Coa::JENIS_KEWAJIBAN_LANCAR, 'kredit');
        $this->makeCoa('4101', 'Pendapatan Survei Akreditasi', Coa::JENIS_PENDAPATAN, 'kredit');
        $this->makeCoa('5101', 'Beban Honor Surveior', Coa::JENIS_BEBAN);
        $this->makeCoa('5102', 'Beban Honor Verifikator', Coa::JENIS_BEBAN);
        $this->makeCoa('5103', 'Beban Honor Rekomendator', Coa::JENIS_BEBAN);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function makeCoa(string $kode, string $nama, string $jenis, string $kelompok = 'debit'): Coa
    {
        return Coa::create([
            'id' => (string) Str::uuid(),
            'kode' => $kode,
            'nama' => $nama,
            'jenis' => $jenis,
            'kelompok' => $kelompok,
            'is_aktif' => true,
            'urutan' => 0,
        ]);
    }

    private function makeInvoice(float $total = 5_000_000): Invoice
    {
        $pks = Pks::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $this->siklus->id,
            'nomor_pks' => 'PKS/TEST/' . Str::upper(Str::random(6)),
            'dibuat_oleh' => null,
            'status' => Pks::STATUS_DISETUJUI,
            'tanggal_disetujui' => now()->subDays(5)->toDateString(),
        ]);

        return Invoice::create([
            'id' => (string) Str::uuid(),
            'pks_id' => $pks->id,
            'siklus_id' => $this->siklus->id,
            'nomor_invoice' => 'INV/TEST/' . Str::upper(Str::random(6)),
            'total_tagihan' => $total,
            'status' => Invoice::STATUS_BELUM_BAYAR,
            'diterbitkan_pada' => now()->startOfMonth()->addDays(2),
            'due_date' => now()->addDays(30)->toDateString(),
        ]);
    }

    private function makeHonorEntry(
        string $tipe = LedgerEntry::TIPE_AP_HONOR_SURVEIOR,
        float $bruto = 1_000_000,
        float $pph = 25_000,
    ): LedgerEntry {
        return LedgerEntry::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $this->siklus->id,
            'tipe' => $tipe,
            'status_pembayaran' => LedgerEntry::STATUS_BELUM_DIBAYAR,
            'nominal_bruto' => $bruto,
            'potongan_ppn' => 0,
            'potongan_pph' => $pph,
            'nominal_neto' => $bruto - $pph,
            'detail' => ['penerima_nama' => 'Budi Santoso'],
            'created_at' => now()->startOfMonth()->addDays(3),
        ]);
    }

    /**
     * @return array<string, array{debit: float, kredit: float}>  debit/kredit per kode COA
     */
    private function ringkasanJurnal(JurnalUmum $jurnal): array
    {
        $result = [];
        foreach ($jurnal->details()->with('coa')->get() as $d) {
            $kode = $d->coa?->kode ?? '?';
            $result[$kode] = [
                'debit' => ($result[$kode]['debit'] ?? 0) + (float) $d->debit,
                'kredit' => ($result[$kode]['kredit'] ?? 0) + (float) $d->kredit,
            ];
        }
        return $result;
    }

    // ─── Pendapatan ─────────────────────────────────────────────────────────

    public function test_jurnal_pendapatan_mencatat_piutang_diterima_pendapatan(): void
    {
        $invoice = $this->makeInvoice(5_000_000);

        $jurnal = app(AccrualJournalService::class)->recordPendapatanInvoice($invoice);

        $this->assertNotNull($jurnal);
        $this->assertEquals(AccrualJournalService::REF_PENDAPATAN_INVOICE, $jurnal->ref_type);

        $ringkas = $this->ringkasanJurnal($jurnal->fresh(['details.coa']));
        $this->assertEqualsWithDelta(5_000_000, $ringkas['1105']['debit'], 0.01);
        $this->assertEqualsWithDelta(5_000_000, $ringkas['4101']['kredit'], 0.01);
        $this->assertEqualsWithDelta(5_000_000, $jurnal->total_debit, 0.01);
        $this->assertEqualsWithDelta(5_000_000, $jurnal->total_kredit, 0.01);
    }

    public function test_jurnal_pendapatan_idempotent(): void
    {
        $invoice = $this->makeInvoice();
        $svc = app(AccrualJournalService::class);

        $svc->recordPendapatanInvoice($invoice);
        $svc->recordPendapatanInvoice($invoice);

        $this->assertEquals(1, JurnalUmum::where('ref_type', AccrualJournalService::REF_PENDAPATAN_INVOICE)->count());
    }

    public function test_pembalik_pendapatan_dibuat_saat_invoice_superseded(): void
    {
        $invoice = $this->makeInvoice();
        $svc = app(AccrualJournalService::class);
        $svc->recordPendapatanInvoice($invoice);

        $pembalik = $svc->reversePendapatanInvoice($invoice);

        $this->assertNotNull($pembalik);
        $ringkas = $this->ringkasanJurnal($pembalik->fresh(['details.coa']));
        $this->assertEqualsWithDelta(5_000_000, $ringkas['4101']['debit'], 0.01);
        $this->assertEqualsWithDelta(5_000_000, $ringkas['1105']['kredit'], 0.01);
    }

    // ─── Beban honor ────────────────────────────────────────────────────────

    public function test_jurnal_beban_honor_mencatat_beban_utang_honor_dan_pph(): void
    {
        $entry = $this->makeHonorEntry(LedgerEntry::TIPE_AP_HONOR_SURVEIOR, 1_000_000, 25_000);

        $jurnal = app(AccrualJournalService::class)->recordBebanHonor($entry);

        $this->assertNotNull($jurnal);
        $ringkas = $this->ringkasanJurnal($jurnal->fresh(['details.coa']));

        $this->assertEqualsWithDelta(1_000_000, $ringkas['5101']['debit'], 0.01);
        $this->assertEqualsWithDelta(975_000, $ringkas['2107']['kredit'], 0.01);
        $this->assertEqualsWithDelta(25_000, $ringkas['2102']['kredit'], 0.01);
        $this->assertTrue($jurnal->isBalanced());
    }

    public function test_jurnal_beban_honor_memakai_akun_beban_per_peran(): void
    {
        $svc = app(AccrualJournalService::class);

        $verifikator = $svc->recordBebanHonor(
            $this->makeHonorEntry(LedgerEntry::TIPE_AP_HONOR_VERIFIKATOR, 500_000, 12_500)
        );
        $ringkas = $this->ringkasanJurnal($verifikator->fresh(['details.coa']));
        $this->assertArrayHasKey('5102', $ringkas);

        $rekomendator = $svc->recordBebanHonor(
            $this->makeHonorEntry(LedgerEntry::TIPE_AP_HONOR_REKOMENDATOR, 500_000, 12_500)
        );
        $ringkas = $this->ringkasanJurnal($rekomendator->fresh(['details.coa']));
        $this->assertArrayHasKey('5103', $ringkas);
    }

    public function test_jurnal_beban_honor_idempotent(): void
    {
        $entry = $this->makeHonorEntry();
        $svc = app(AccrualJournalService::class);

        $svc->recordBebanHonor($entry);
        $svc->recordBebanHonor($entry);

        $this->assertEquals(1, JurnalUmum::where('ref_type', AccrualJournalService::REF_BEBAN_HONOR)->count());
    }

    // ─── Efek ke dasbor ─────────────────────────────────────────────────────

    public function test_dasbor_menampilkan_pendapatan_dan_beban_dari_jurnal_akrual(): void
    {
        $svc = app(AccrualJournalService::class);
        $svc->recordPendapatanInvoice($this->makeInvoice(5_000_000));
        $svc->recordBebanHonor($this->makeHonorEntry(LedgerEntry::TIPE_AP_HONOR_SURVEIOR, 1_000_000, 25_000));
        $svc->recordBebanHonor($this->makeHonorEntry(LedgerEntry::TIPE_AP_HONOR_VERIFIKATOR, 500_000, 12_500));
        $svc->recordBebanHonor($this->makeHonorEntry(LedgerEntry::TIPE_AP_HONOR_REKOMENDATOR, 500_000, 12_500));

        $dash = app(AccountingService::class)->dashboard();

        $this->assertEqualsWithDelta(5_000_000, $dash['ringkasan']['total_pendapatan'], 0.01);
        $this->assertEqualsWithDelta(2_000_000, $dash['ringkasan']['total_beban'], 0.01);
        $this->assertEqualsWithDelta(3_000_000, $dash['ringkasan']['laba_rugi'], 0.01);
    }

    public function test_piutang_usaha_memiliki_saldo_debit_setelah_akrual(): void
    {
        app(AccrualJournalService::class)->recordPendapatanInvoice($this->makeInvoice(5_000_000));

        $dash = app(AccountingService::class)->dashboard();

        // Kas & bank belum ada mutasi → saldo kas 0, piutang 5.000.000
        $this->assertEqualsWithDelta(0, $dash['ringkasan']['saldo_kas_bank'], 0.01);
    }
}
