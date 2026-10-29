<?php

namespace Tests\Feature;

use App\Models\Coa;
use App\Models\JurnalUmum;
use App\Models\JurnalUmumDetail;
use App\Models\Lembaga;
use App\Services\Keuangan\AccountingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Dasbor akuntansi harus selalu identik dengan penjumlahan baris jurnal.
 */
class AccountingDashboardTest extends TestCase
{
    use RefreshDatabase;

    private Lembaga $lembaga;

    protected function setUp(): void
    {
        parent::setUp();

        $this->lembaga = Lembaga::create([
            'id' => (string) Str::uuid(),
            'nama' => 'Lembaga Uji Akuntansi',
        ]);

        session(['lembaga_id' => $this->lembaga->id]);
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

    /**
     * @param  array<int, array{coa: Coa, debit?: float, kredit?: float}>  $lines
     */
    private function makeJurnal(string $tanggal, array $lines, string $keterangan = 'Jurnal uji'): JurnalUmum
    {
        $totalDebit = array_sum(array_map(fn ($l) => $l['debit'] ?? 0, $lines));
        $totalKredit = array_sum(array_map(fn ($l) => $l['kredit'] ?? 0, $lines));

        $jurnal = JurnalUmum::create([
            'id' => (string) Str::uuid(),
            'nomor' => 'JU/TEST/' . Str::upper(Str::random(6)),
            'tanggal' => $tanggal,
            'keterangan' => $keterangan,
            'total_debit' => $totalDebit,
            'total_kredit' => $totalKredit,
            'dibuat_oleh' => null,
        ]);

        foreach ($lines as $line) {
            JurnalUmumDetail::create([
                'id' => (string) Str::uuid(),
                'jurnal_umum_id' => $jurnal->id,
                'coa_id' => $line['coa']->id,
                'debit' => $line['debit'] ?? 0,
                'kredit' => $line['kredit'] ?? 0,
            ]);
        }

        return $jurnal;
    }

    private function dashboard(): array
    {
        return app(AccountingService::class)->dashboard();
    }

    private function dashboardFor(?int $tahun, ?int $bulan): array
    {
        $filters = [];
        if ($tahun !== null) $filters['tahun'] = $tahun;
        if ($bulan !== null) $filters['bulan'] = $bulan;

        return app(AccountingService::class)->dashboard($filters);
    }

    // ─── Tests ───────────────────────────────────────────────────────────────

    public function test_saldo_kas_bank_sesuai_jurnal_tanpa_dobel_hitung(): void
    {
        $bank = $this->makeCoa('1102', 'Bank BCA', Coa::JENIS_AKTIVA_LANCAR);
        $piutang = $this->makeCoa('1105', 'Piutang Usaha', Coa::JENIS_AKTIVA_LANCAR);
        $utang = $this->makeCoa('2107', 'Utang Honor', Coa::JENIS_KEWAJIBAN_LANCAR, 'kredit');

        $tanggal = now()->startOfMonth()->addDays(2)->toDateString();

        // Dr Bank 5.000.000 / Cr Piutang 5.000.000
        $this->makeJurnal($tanggal, [
            ['coa' => $bank, 'debit' => 5_000_000],
            ['coa' => $piutang, 'kredit' => 5_000_000],
        ]);

        // Dr Utang Honor 1.000.000 / Cr Bank 1.000.000
        $this->makeJurnal($tanggal, [
            ['coa' => $utang, 'debit' => 1_000_000],
            ['coa' => $bank, 'kredit' => 1_000_000],
        ]);

        $dash = $this->dashboard();

        // Bank = 5.000.000 - 1.000.000 (tidak boleh 8.000.000 / dobel hitung)
        $this->assertEqualsWithDelta(4_000_000, $dash['ringkasan']['saldo_kas_bank'], 0.01);
    }

    public function test_saldo_kas_bank_tidak_memasuk_akun_non_kas(): void
    {
        $bank = $this->makeCoa('1102', 'Bank BCA', Coa::JENIS_AKTIVA_LANCAR);
        $piutang = $this->makeCoa('1105', 'Piutang Usaha', Coa::JENIS_AKTIVA_LANCAR);

        $this->makeJurnal(now()->startOfMonth()->addDay()->toDateString(), [
            ['coa' => $bank, 'debit' => 5_000_000],
            ['coa' => $piutang, 'kredit' => 5_000_000],
        ]);

        $dash = $this->dashboard();

        // Piutang (kredit 5.000.000) bukan kas → saldo kas tetap 5.000.000
        $this->assertEqualsWithDelta(5_000_000, $dash['ringkasan']['saldo_kas_bank'], 0.01);
    }

    public function test_total_debit_kredit_dan_jumlah_jurnal_sesuai_daftar_jurnal(): void
    {
        $bank = $this->makeCoa('1102', 'Bank BCA', Coa::JENIS_AKTIVA_LANCAR);
        $piutang = $this->makeCoa('1105', 'Piutang Usaha', Coa::JENIS_AKTIVA_LANCAR);

        $tanggal = now()->startOfMonth()->addDays(2)->toDateString();
        $this->makeJurnal($tanggal, [
            ['coa' => $bank, 'debit' => 5_000_000],
            ['coa' => $piutang, 'kredit' => 5_000_000],
        ]);
        $this->makeJurnal($tanggal, [
            ['coa' => $piutang, 'debit' => 500_000],
            ['coa' => $bank, 'kredit' => 500_000],
        ]);

        $dash = $this->dashboard();

        $this->assertEquals(2, $dash['ringkasan']['jumlah_jurnal']);
        $this->assertEqualsWithDelta(5_500_000, $dash['ringkasan']['total_debit'], 0.01);
        $this->assertEqualsWithDelta(5_500_000, $dash['ringkasan']['total_kredit'], 0.01);
    }

    public function test_pendapatan_beban_dan_laba_rugi_dihitung_dari_jurnal(): void
    {
        $kas = $this->makeCoa('1101', 'Kas', Coa::JENIS_AKTIVA_LANCAR);
        $pendapatan = $this->makeCoa('4001', 'Pendapatan Jasa Akreditasi', Coa::JENIS_PENDAPATAN, 'kredit');
        $beban = $this->makeCoa('5001', 'Beban Honor Surveior', Coa::JENIS_BEBAN);

        $tanggal = now()->startOfMonth()->addDays(3)->toDateString();
        $this->makeJurnal($tanggal, [
            ['coa' => $kas, 'debit' => 10_000_000],
            ['coa' => $pendapatan, 'kredit' => 10_000_000],
        ]);
        $this->makeJurnal($tanggal, [
            ['coa' => $beban, 'debit' => 4_000_000],
            ['coa' => $kas, 'kredit' => 4_000_000],
        ]);

        $dash = $this->dashboard();

        $this->assertEqualsWithDelta(10_000_000, $dash['ringkasan']['total_pendapatan'], 0.01);
        $this->assertEqualsWithDelta(4_000_000, $dash['ringkasan']['total_beban'], 0.01);
        $this->assertEqualsWithDelta(6_000_000, $dash['ringkasan']['laba_rugi'], 0.01);
        $this->assertEqualsWithDelta(6_000_000, $dash['ringkasan']['saldo_kas_bank'], 0.01);
    }

    public function test_jurnal_bulan_lalu_tidak_masuk_kpi_bulan_ini_tetapi_masuk_saldo(): void
    {
        $bank = $this->makeCoa('1102', 'Bank BCA', Coa::JENIS_AKTIVA_LANCAR);
        $piutang = $this->makeCoa('1105', 'Piutang Usaha', Coa::JENIS_AKTIVA_LANCAR);

        $lalu = now()->subMonthNoOverflow()->startOfMonth()->addDay()->toDateString();
        $this->makeJurnal($lalu, [
            ['coa' => $bank, 'debit' => 3_000_000],
            ['coa' => $piutang, 'kredit' => 3_000_000],
        ]);

        $dash = $this->dashboard();

        // KPI bulan ini: jurnal bulan lalu tidak termasuk
        $this->assertEquals(0, $dash['ringkasan']['jumlah_jurnal']);
        $this->assertEqualsWithDelta(0, $dash['ringkasan']['total_debit'], 0.01);

        // Saldo kas & bank bersifat kumulatif → 3.000.000
        $this->assertEqualsWithDelta(3_000_000, $dash['ringkasan']['saldo_kas_bank'], 0.01);
    }

    public function test_dasbor_tidak_mencakup_jurnal_lembaga_lain(): void
    {
        $bank = $this->makeCoa('1102', 'Bank BCA', Coa::JENIS_AKTIVA_LANCAR);
        $piutang = $this->makeCoa('1105', 'Piutang Usaha', Coa::JENIS_AKTIVA_LANCAR);

        $this->makeJurnal(now()->startOfMonth()->addDay()->toDateString(), [
            ['coa' => $bank, 'debit' => 1_000_000],
            ['coa' => $piutang, 'kredit' => 1_000_000],
        ]);

        // Jurnal lembaga lain
        $lain = Lembaga::create(['id' => (string) Str::uuid(), 'nama' => 'Lembaga Lain']);
        $bankLain = Coa::withoutGlobalScope('lembaga')->create([
            'id' => (string) Str::uuid(),
            'kode' => '1102',
            'nama' => 'Bank BCA',
            'jenis' => Coa::JENIS_AKTIVA_LANCAR,
            'kelompok' => 'debit',
            'is_aktif' => true,
            'urutan' => 0,
            'lembaga_id' => $lain->id,
        ]);
        $piutangLain = Coa::withoutGlobalScope('lembaga')->create([
            'id' => (string) Str::uuid(),
            'kode' => '1105',
            'nama' => 'Piutang Usaha',
            'jenis' => Coa::JENIS_AKTIVA_LANCAR,
            'kelompok' => 'debit',
            'is_aktif' => true,
            'urutan' => 0,
            'lembaga_id' => $lain->id,
        ]);

        session(['lembaga_id' => $lain->id]);
        $this->makeJurnal(now()->startOfMonth()->addDay()->toDateString(), [
            ['coa' => $bankLain, 'debit' => 7_000_000],
            ['coa' => $piutangLain, 'kredit' => 7_000_000],
        ]);

        session(['lembaga_id' => $this->lembaga->id]);
        $dash = $this->dashboard();

        $this->assertEquals(1, $dash['ringkasan']['jumlah_jurnal']);
        $this->assertEqualsWithDelta(1_000_000, $dash['ringkasan']['total_debit'], 0.01);
        $this->assertEqualsWithDelta(1_000_000, $dash['ringkasan']['saldo_kas_bank'], 0.01);
    }

    // ─── Filter periode ──────────────────────────────────────────────────────

    public function test_kpi_dibatasi_periode_yang_dipilih(): void
    {
        $kas = $this->makeCoa('1101', 'Kas', Coa::JENIS_AKTIVA_LANCAR);
        $pendapatan = $this->makeCoa('4001', 'Pendapatan Jasa Akreditasi', Coa::JENIS_PENDAPATAN, 'kredit');
        $beban = $this->makeCoa('5001', 'Beban Honor Surveior', Coa::JENIS_BEBAN);

        // Jurnal di bulan berjalan (mis. Oktober 2026)
        $bulanIni = now()->startOfMonth()->addDay()->toDateString();
        $this->makeJurnal($bulanIni, [
            ['coa' => $kas, 'debit' => 10_000_000],
            ['coa' => $pendapatan, 'kredit' => 10_000_000],
        ]);

        // Jurnal 2 bulan lalu
        $lalu = now()->subMonthsNoOverflow(2)->startOfMonth()->addDay()->toDateString();
        $this->makeJurnal($lalu, [
            ['coa' => $beban, 'debit' => 4_000_000],
            ['coa' => $kas, 'kredit' => 4_000_000],
        ]);

        // Periode saat ini → hanya jurnal bulan berjalan
        $dash = $this->dashboardFor(now()->year, now()->month);
        $this->assertEquals(1, $dash['ringkasan']['jumlah_jurnal']);
        $this->assertEqualsWithDelta(10_000_000, $dash['ringkasan']['total_pendapatan'], 0.01);
        $this->assertEqualsWithDelta(0, $dash['ringkasan']['total_beban'], 0.01);

        // Periode 2 bulan lalu → hanya jurnal lama
        $dashLama = $this->dashboardFor(now()->subMonthsNoOverflow(2)->year, now()->subMonthsNoOverflow(2)->month);
        $this->assertEquals(1, $dashLama['ringkasan']['jumlah_jurnal']);
        $this->assertEqualsWithDelta(0, $dashLama['ringkasan']['total_pendapatan'], 0.01);
        $this->assertEqualsWithDelta(4_000_000, $dashLama['ringkasan']['total_beban'], 0.01);

        // Periode penuh satu tahun → kedua jurnal
        $dashTahun = $this->dashboardFor(now()->year, null);
        $this->assertEquals(2, $dashTahun['ringkasan']['jumlah_jurnal']);
        $this->assertEqualsWithDelta(10_000_000, $dashTahun['ringkasan']['total_pendapatan'], 0.01);
        $this->assertEqualsWithDelta(4_000_000, $dashTahun['ringkasan']['total_beban'], 0.01);
    }

    public function test_periode_kosong_tidak_mengganggu_perilaku_lama(): void
    {
        $kas = $this->makeCoa('1101', 'Kas', Coa::JENIS_AKTIVA_LANCAR);
        $pendapatan = $this->makeCoa('4001', 'Pendapatan Jasa Akreditasi', Coa::JENIS_PENDAPATAN, 'kredit');

        $this->makeJurnal(now()->startOfMonth()->addDay()->toDateString(), [
            ['coa' => $kas, 'debit' => 7_000_000],
            ['coa' => $pendapatan, 'kredit' => 7_000_000],
        ]);

        // Tanpa filter → bulan berjalan (default lama)
        $dash = $this->dashboard();
        $this->assertEquals(1, $dash['ringkasan']['jumlah_jurnal']);
        $this->assertEqualsWithDelta(7_000_000, $dash['ringkasan']['total_pendapatan'], 0.01);
        $this->assertEquals(now()->month, $dash['periode']['bulan']);
        $this->assertEquals(now()->year, $dash['periode']['tahun']);
    }
}
