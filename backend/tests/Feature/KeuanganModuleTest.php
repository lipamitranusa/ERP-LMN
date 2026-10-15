<?php

namespace Tests\Feature;

use App\Models\AkunPengguna;
use App\Models\BuktiPembayaran;
use App\Models\Invoice;
use App\Models\KonfigurasiPajak;
use App\Models\Laporan;
use App\Models\LaporanVerifikasi;
use App\Models\Lembaga;
use App\Models\LedgerEntry;
use App\Models\Penugasan;
use App\Models\Pks;
use App\Models\SiklusAkreditasi;
use App\Models\TenagaAhli;
use App\Models\VerifikasiItem;
use App\Services\Keuangan\BuktiPotongService;
use App\Services\Keuangan\HonorCalculator;
use App\Services\Keuangan\LedgerService;
use App\Services\Keuangan\ReconciliationService;
use App\Services\Payment\InvoicePaidCalculator;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * AC-7: Nominal neto pada Ledger Entry honor harus selalu sama dengan
 * nominal bruto dikurangi total potongan PPN dan PPh yang dihitung
 * sistem — tidak boleh ada selisih yang tidak tercatat.
 *
 * Pengujian dilakukan pada layer:
 *   - Unit: HonorCalculator (langsung)
 *   - Feature: LedgerService + controller hooks (Surveior & Verifikator)
 *   - Feature: Reconciliation snapshot
 *   - Feature: Bukti potong PPh 21 per periode
 *   - Feature: PKS superseded (FR-5.5)
 */
class KeuanganModuleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        // Exclude demo TA from queue
        $demoSurveior = TenagaAhli::where('nomor_induk_surveior', 'NS-0001')->first();
        if ($demoSurveior) {
            $demoSurveior->forceFill(['status_penugasan_saat_ini' => 'sedang_bertugas'])->save();
        }
    }

    private function actingAsAdmin(): static
    {
        return $this->actingAs(AkunPengguna::where('email', 'admin@erp.local')->firstOrFail(), 'sanctum');
    }

    private function actingAsKeuangan(): static
    {
        return $this->actingAs(AkunPengguna::where('email', 'keuangan@lembaga.local')->firstOrFail(), 'sanctum');
    }

    private function actingAsVerifikator(): static
    {
        // Verifikator login via akun tenaga ahli, bukan email fixed
        $verifAkun = AkunPengguna::whereHas('tenagaAhli', fn($q) => $q->where('peran', 'verifikator'))->first();
        return $this->actingAs($verifAkun, 'sanctum');
    }

    private function createSiklusLengkap(): SiklusAkreditasi
    {
        $lembaga = Lembaga::first();
        $faskesAkun = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')
            ->orWhereNotNull('faskes_id')->first();
        $faskes = $faskesAkun?->faskes;

        return SiklusAkreditasi::create([
            'id' => (string) Str::uuid(),
            'faskes_id' => $faskes->id,
            'lembaga_id' => $lembaga->id,
            'tanggal_pengajuan' => now()->toDateString(),
            'status' => 'aktif',
            'status_kelengkapan' => 'lengkap',
        ]);
    }

    private function createPksDisetujui(SiklusAkreditasi $siklus): Pks
    {
        return Pks::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'nomor_pks' => 'PKS/TEST/' . strtoupper(Str::random(6)),
            'dibuat_oleh' => AkunPengguna::where('email', 'admin@erp.local')->first()->id,
            'status' => Pks::STATUS_DISETUJUI,
            'tanggal_disetujui' => now()->toDateString(),
            'tanda_tangan_pada' => now(),
            'nama_penandatangan' => 'Dr. Test Faskes',
            'jabatan_penandatangan' => 'Direktur',
        ]);
    }

    private function createInvoice(SiklusAkreditasi $siklus, float $total = 5_000_000, string $status = Invoice::STATUS_BELUM_BAYAR): Invoice
    {
        return Invoice::create([
            'id' => (string) Str::uuid(),
            'pks_id' => $siklus->pks?->id ?? $this->createPksDisetujui($siklus)->id,
            'siklus_id' => $siklus->id,
            'nomor_invoice' => 'INV/TEST/' . strtoupper(Str::random(6)),
            'dibuat_oleh' => AkunPengguna::where('email', 'admin@erp.local')->first()->id,
            'total_tagihan' => $total,
            'status' => $status,
            'diterbitkan_pada' => now(),
            'due_date' => now()->addDays(30)->toDateString(),
        ]);
    }

    // ─── AC-7: HonorCalculator — invariant nominal_neto = bruto - PPN - PPh ──

    public function test_ac7_honor_calculator_invariant_at_default_brackets(): void
    {
        $calc = app(HonorCalculator::class);

        // Honor bruto dihitung progresif per PP 58/2023 (5/15/25/30/35)
        // dengan DPP = 50% × bruto. PPN tidak dipotong dari honor
        // (PPN adalah pajak OUTPUT, bukan dipotong dari penerima).
        // Untuk bruto ≤ 120M → DPP ≤ 60M → bracket 5% saja.
        $cases = [
            [1_000_000,    0,    25_000,   975_000],    // DPP 500k,   PPh 5% × 500k  = 25k
            [5_000_000,    0,   125_000,  4_875_000],   // DPP 2.5M,   PPh 5% × 2.5M  = 125k
            [2_500_000,    0,    62_500,  2_437_500],   // DPP 1.25M,  PPh 5% × 1.25M = 62.5k
            [1_500_000,    0,    37_500,  1_462_500],   // DPP 750k,   PPh 5% × 750k  = 37.5k
            [100_000_000,  0, 2_500_000, 97_500_000],   // DPP 50M,    PPh 5% × 50M   = 2.5M
        ];

        foreach ($cases as [$bruto, $expectedPpn, $expectedPph, $expectedNeto]) {
            $r = $calc->hitungHonor($bruto);
            $this->assertEquals($bruto, $r['bruto'], "Bruto untuk {$bruto}");
            $this->assertEquals($expectedPpn, $r['potongan_ppn'], "PPN untuk bruto {$bruto}");
            $this->assertEquals($expectedPph, $r['potongan_pph'], "PPh untuk bruto {$bruto}");
            // AC-7 invariant
            $this->assertEquals(
                $expectedNeto,
                $r['nominal_neto'],
                "INVARIANT AC-7 GAGAL untuk bruto {$bruto}: neto={$r['nominal_neto']}, bruto - PPN - PPh = " . ($bruto - $r['potongan_ppn'] - $r['potongan_pph']),
            );
            $this->assertEquals(
                round($bruto - $r['potongan_ppn'] - $r['potongan_pph'], 2),
                $r['nominal_neto'],
                'AC-7: nominal_neto harus sama dengan bruto - PPN - PPh.',
            );
        }
    }

    public function test_ac7_progressive_brackets_across_all_tiers_pp58_2023(): void
    {
        // Verifikasi bahwa PPh progresif melompat bracket dengan benar
        // per PP 58/2023 jo. PER-16/PJ/2023 (5/15/25/30/35).
        $calc = app(HonorCalculator::class);

        // bruto 200M → DPP 100M (lewat 60M, di bawah 250M)
        // PPh = 60M × 5% + 40M × 15% = 3M + 6M = 9M
        $r = $calc->hitungHonor(200_000_000);
        $this->assertEquals(9_000_000, $r['potongan_pph'], 'PPh bruto 200M: 5%+15% brackets');
        $this->assertEquals(191_000_000, $r['nominal_neto']);

        // bruto 600M → DPP 300M (lewat 250M, di bawah 500M)
        // PPh = 60M × 5% + 190M × 15% + 50M × 25% = 3M + 28.5M + 12.5M = 44M
        $r = $calc->hitungHonor(600_000_000);
        $this->assertEquals(44_000_000, $r['potongan_pph'], 'PPh bruto 600M: 5%+15%+25% brackets');
        $this->assertEquals(556_000_000, $r['nominal_neto']);

        // bruto 1.2B → DPP 600M (lewat 500M, di bawah 5B)
        // PPh = 60M × 5% + 190M × 15% + 250M × 25% + 100M × 30% = 124M
        $r = $calc->hitungHonor(1_200_000_000);
        $this->assertEquals(124_000_000, $r['potongan_pph'], 'PPh bruto 1.2B: 5%+15%+25%+30% brackets');
        $this->assertEquals(1_076_000_000, $r['nominal_neto']);

        // bruto 12B → DPP 6B (lewat 5B)
        // PPh = 60M × 5% + 190M × 15% + 250M × 25% + 4.5B × 30% + 1B × 35%
        //     = 3M + 28.5M + 62.5M + 1,350M + 350M = 1,794M
        $r = $calc->hitungHonor(12_000_000_000);
        $this->assertEquals(1_794_000_000, $r['potongan_pph'], 'PPh bruto 12B: semua 5 brackets');
        $this->assertEquals(10_206_000_000, $r['nominal_neto']);
    }

    public function test_ac7_invariant_holds_with_zero_bruto(): void
    {
        $r = app(HonorCalculator::class)->hitungHonor(0);
        $this->assertEquals(0, $r['bruto']);
        $this->assertEquals(0, $r['potongan_ppn']);
        $this->assertEquals(0, $r['potongan_pph']);
        $this->assertEquals(0, $r['nominal_neto']);
        $this->assertEquals($r['bruto'] - $r['potongan_ppn'] - $r['potongan_pph'], $r['nominal_neto']);
    }

    public function test_ac7_honor_ppn_snapshot_reflects_active_config(): void
    {
        // Catatan: PPN tidak dipotong dari honor (output tax, bukan potong
        // dari penerima — lihat HonorCalculator). PPN config tetap di-load
        // untuk audit snapshot via $r['pajak']['ppn']['tarif_persen'].
        // Test ini memastikan snapshot PPN yang diambil HonorCalculator
        // benar-benar berasal dari KonfigurasiPajak aktif pada tanggal
        // transaksi (mendukung migrasi 11% → 12% di 2025 dst).
        KonfigurasiPajak::create([
            'id' => (string) Str::uuid(),
            'jenis_pajak' => KonfigurasiPajak::JENIS_PPN,
            'tarif_persen' => 12.00,
            'berlaku_sejak' => now()->addDay()->toDateString(),
            'keterangan' => 'PPN 12% (masa depan, simulasi)',
        ]);

        $r1 = app(HonorCalculator::class)->hitungHonor(1_000_000); // hari ini → PPN 11%
        $this->assertEquals(11.0, $r1['pajak']['ppn']['tarif_persen'], 'Snapshot PPN hari ini = 11%');
        $this->assertEquals(0, $r1['potongan_ppn'], 'PPN tidak dipotong dari honor');

        $r2 = app(HonorCalculator::class)->hitungHonor(1_000_000, now()->addDay()); // besok → PPN 12%
        $this->assertEquals(12.0, $r2['pajak']['ppn']['tarif_persen'], 'Snapshot PPN besok = 12%');
        $this->assertEquals(0, $r2['potongan_ppn'], 'PPN tetap tidak dipotong dari honor');

        // PPh selalu progresif (PP 58/2023), tidak bergantung pada config
        $this->assertEquals($r1['potongan_pph'], $r2['potongan_pph'],
            'PPh progresif tidak berubah saat tarif PPN berubah');
    }

    public function test_ac7_negative_bruto_rejected(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        app(HonorCalculator::class)->hitungHonor(-1);
    }

    // ─── AC-7: LedgerService — entry honor yang dihitung sistem ──────────

    public function test_ac7_ledger_entry_honor_surveior_invariant_holds(): void
    {
        $siklus = $this->createSiklusLengkap();
        $this->createPksDisetujui($siklus);
        $this->createInvoice($siklus);

        $surveior = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-AC7-S',
            'nama' => 'Surveior AC7',
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

        $bruto = 2_500_000.0;
        $entry = app(LedgerService::class)->catatHonorSurveior($penugasan, $bruto);

        $this->assertNotNull($entry);
        $this->assertEquals(LedgerEntry::TIPE_AP_HONOR_SURVEIOR, $entry->tipe);
        $this->assertEquals($bruto, (float) $entry->nominal_bruto);
        // PPN tidak dipotong dari honor (output tax)
        $this->assertEquals(0.0, (float) $entry->potongan_ppn);
        // PPh progresif 5% × DPP (50% × 2.5M = 1.25M) = 62.500
        $this->assertEquals(62_500, (float) $entry->potongan_pph);
        $this->assertEquals(2_437_500, (float) $entry->nominal_neto);

        // AC-7 invariant
        $this->assertEquals(
            (float) $entry->nominal_bruto - (float) $entry->potongan_ppn - (float) $entry->potongan_pph,
            (float) $entry->nominal_neto,
            'AC-7: nominal_neto pada LedgerEntry honor Surveior harus sama dengan bruto - PPN - PPh.',
        );
    }

    public function test_ac7_ledger_entry_honor_verifikator_invariant_holds(): void
    {
        $siklus = $this->createSiklusLengkap();
        $this->createPksDisetujui($siklus);
        $this->createInvoice($siklus);

        $verifikator = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-AC7-V',
            'nama' => 'Verifikator AC7',
            'peran' => 'verifikator',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
        ]);

        // Buat laporan survei + penugasan verifikasi + laporan_verifikasi
        // Penugasan survei harus dibuat dulu (Laporan FK ke penugasan) dan
        // tenaga_ahli_id-nya harus valid.
        $surveiorDummy = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-AC7-DUMMY',
            'nama' => 'Sur Dummy',
            'peran' => 'surveior',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
        ]);

        $penugasanSur = Penugasan::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'tenaga_ahli_id' => $surveiorDummy->id,
            'jenis' => Penugasan::JENIS_SURVEI,
            'status' => Penugasan::STATUS_SELESAI,
        ]);

        $laporan = Laporan::create([
            'id' => (string) Str::uuid(),
            'penugasan_id' => $penugasanSur->id,
            'tipe' => 'survei',
            'submitted_at' => now(),
        ]);

        $penugasanVer = Penugasan::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'tenaga_ahli_id' => $verifikator->id,
            'jenis' => Penugasan::JENIS_VERIFIKASI,
            'status' => Penugasan::STATUS_MENUNGGU,
        ]);

        $lv = LaporanVerifikasi::create([
            'id' => (string) Str::uuid(),
            'laporan_id' => $laporan->id,
            'verifikasi_penugasan_id' => $penugasanVer->id,
            'status_final' => 'draft',
        ]);

        $bruto = 1_500_000.0;
        $entry = app(LedgerService::class)->catatHonorVerifikator($lv, $bruto);

        $this->assertNotNull($entry);
        $this->assertEquals(LedgerEntry::TIPE_AP_HONOR_VERIFIKATOR, $entry->tipe);
        $this->assertEquals($bruto, (float) $entry->nominal_bruto);
        // PPN tidak dipotong dari honor
        $this->assertEquals(0.0, (float) $entry->potongan_ppn);
        // PPh progresif 5% × DPP (50% × 1.5M = 750k) = 37.500
        $this->assertEquals(37_500, (float) $entry->potongan_pph);
        $this->assertEquals(1_462_500, (float) $entry->nominal_neto);

        // AC-7 invariant
        $this->assertEquals(
            (float) $entry->nominal_bruto - (float) $entry->potongan_ppn - (float) $entry->potongan_pph,
            (float) $entry->nominal_neto,
            'AC-7: nominal_neto pada LedgerEntry honor Verifikator harus sama dengan bruto - PPN - PPh.',
        );
    }

    public function test_ac7_idempotent_honor_entry_not_duplicated(): void
    {
        $siklus = $this->createSiklusLengkap();
        $this->createPksDisetujui($siklus);
        $this->createInvoice($siklus);

        $surveior = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-AC7-IDEM',
            'nama' => 'Surveior Idem',
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

        $svc = app(LedgerService::class);
        $first = $svc->catatHonorSurveior($penugasan, 2_500_000);
        $second = $svc->catatHonorSurveior($penugasan, 2_500_000);
        $third = $svc->catatHonorSurveior($penugasan, 99_999_999);

        $this->assertNotNull($first);
        $this->assertEquals($first->id, $second->id, 'Second call harus return entry yang sama');
        $this->assertEquals($first->id, $third->id, 'Third call dengan bruto berbeda harus tetap return entry yang sama');
        $this->assertEquals(1, LedgerEntry::where('siklus_id', $siklus->id)
            ->where('tipe', LedgerEntry::TIPE_AP_HONOR_SURVEIOR)->count());
    }

    public function test_ac7_honor_verifikator_created_on_final_button(): void
    {
        $siklus = $this->createSiklusLengkap();
        $this->createPksDisetujui($siklus);
        $this->createInvoice($siklus);

        $verifikatorUser = AkunPengguna::whereHas('tenagaAhli', fn($q) => $q->where('peran', 'verifikator'))->first();

        $verifikator = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-AC7-VF',
            'nama' => 'Verifikator Final',
            'peran' => 'verifikator',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
        ]);
        $verifikatorUser->forceFill(['tenaga_ahli_id' => $verifikator->id])->save();

        // Penugasan survei dummy agar FK Laporan terpenuhi
        $surDummy = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-AC7-VDUM',
            'nama' => 'Sur verif-dummy',
            'peran' => 'surveior',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
        ]);
        $penugasanSur = Penugasan::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'tenaga_ahli_id' => $surDummy->id,
            'jenis' => Penugasan::JENIS_SURVEI,
            'status' => Penugasan::STATUS_SELESAI,
        ]);

        $laporan = Laporan::create([
            'id' => (string) Str::uuid(),
            'penugasan_id' => $penugasanSur->id,
            'tipe' => 'survei',
            'submitted_at' => now(),
        ]);

        $penugasanVer = Penugasan::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'tenaga_ahli_id' => $verifikator->id,
            'jenis' => Penugasan::JENIS_VERIFIKASI,
            'status' => Penugasan::STATUS_MENUNGGU,
        ]);

        $lv = LaporanVerifikasi::create([
            'id' => (string) Str::uuid(),
            'laporan_id' => $laporan->id,
            'verifikasi_penugasan_id' => $penugasanVer->id,
            'status_final' => 'draft',
        ]);

        VerifikasiItem::create([
            'id' => (string) Str::uuid(),
            'laporan_verifikasi_id' => $lv->id,
            'kode_elemen' => 'EP-1.1',
            'nama_elemen' => 'Pelayanan',
            'nilai_default' => 'MK',
            'nilai_final' => 'MK',
            'nilai_sesuai' => true,
        ]);

        $resp = $this->actingAsVerifikator()->postJson("/api/verifikasi/{$lv->id}/final", []);
        $resp->assertOk();

        $entry = LedgerEntry::where('siklus_id', $siklus->id)
            ->where('tipe', LedgerEntry::TIPE_AP_HONOR_VERIFIKATOR)
            ->first();
        $this->assertNotNull($entry, 'LedgerEntry honor Verifikator harus dibuat saat tombol Final');
        $this->assertEquals(
            (float) $entry->nominal_bruto - (float) $entry->potongan_ppn - (float) $entry->potongan_pph,
            (float) $entry->nominal_neto,
            'AC-7: invariant harus tetap berlaku setelah Final hook.',
        );
    }

    public function test_ac7_piutang_lunas_entry_when_invoice_fully_paid(): void
    {
        $siklus = $this->createSiklusLengkap();
        $this->createPksDisetujui($siklus);
        $invoice = $this->createInvoice($siklus, total: 5_000_000);

        BuktiPembayaran::create([
            'id' => (string) Str::uuid(),
            'invoice_id' => $invoice->id,
            'submitted_by' => AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->first()->id,
            'nominal' => 5_000_000,
            'metode' => BuktiPembayaran::METODE_TRANSFER,
            'status_verifikasi' => BuktiPembayaran::STATUS_DITERIMA,
            'sumber' => BuktiPembayaran::SUMBER_MANUAL,
            'tanggal_submit' => now(),
            'tanggal_verifikasi' => now(),
        ]);

        app(InvoicePaidCalculator::class)->recalculate($invoice);
        $invoice->refresh();

        $entry = LedgerEntry::where('invoice_id', $invoice->id)
            ->where('tipe', LedgerEntry::TIPE_PIUTANG_LUNAS)
            ->first();
        $this->assertNotNull($entry);
        $this->assertEquals(5_000_000, (float) $entry->nominal_bruto);
        $this->assertEquals(0, (float) $entry->potongan_ppn);
        $this->assertEquals(0, (float) $entry->potongan_pph);
        $this->assertEquals(5_000_000, (float) $entry->nominal_neto);
        // AC-7: bruto - PPN - PPh = neto (PPN & PPh = 0 untuk piutang)
        $this->assertEquals(
            (float) $entry->nominal_bruto - (float) $entry->potongan_ppn - (float) $entry->potongan_pph,
            (float) $entry->nominal_neto,
        );
    }

    // ─── FR-5.5: PKS revisi/batalkan → Invoice superseded ───────────────

    public function test_pks_revisi_after_invoice_marks_invoice_superseded(): void
    {
        $siklus = $this->createSiklusLengkap();
        $pks = $this->createPksDisetujui($siklus);
        $invoice = $this->createInvoice($siklus, total: 5_000_000);

        $resp = $this->actingAsAdmin()->postJson("/api/kontrak/{$pks->id}/revisi", [
            'alasan' => 'Faskes meminta perubahan ruang lingkup.',
        ]);

        $resp->assertOk();
        $invoice->refresh();
        $this->assertEquals(Invoice::STATUS_SUPERSEDED, $invoice->status);

        $adjustment = LedgerEntry::where('invoice_id', $invoice->id)
            ->where('tipe', LedgerEntry::TIPE_PENYESUAIAN_PKS)
            ->first();
        $this->assertNotNull($adjustment, 'Ledger Entry penyesuaian_pks harus dibuat');
        $this->assertEquals(5_000_000, (float) $adjustment->nominal_bruto);
        $this->assertEquals(-5_000_000, (float) $adjustment->nominal_neto, 'Penyesuaian bernilai negatif = reversal');
    }

    public function test_pks_revisi_idempotent_no_double_adjustment(): void
    {
        $siklus = $this->createSiklusLengkap();
        $pks = $this->createPksDisetujui($siklus);
        $invoice = $this->createInvoice($siklus, total: 5_000_000);

        // Revisi pertama → invoice jadi superseded
        $this->actingAsAdmin()->postJson("/api/kontrak/{$pks->id}/revisi", ['alasan' => 'A'])->assertOk();
        // Coba revisi lagi → harus 422 karena status sudah 'direvisi'
        $r2 = $this->actingAsAdmin()->postJson("/api/kontrak/{$pks->id}/revisi", ['alasan' => 'B']);
        $r2->assertStatus(422);

        $count = LedgerEntry::where('invoice_id', $invoice->id)
            ->where('tipe', LedgerEntry::TIPE_PENYESUAIAN_PKS)
            ->count();
        $this->assertEquals(1, $count, 'Hanya boleh ada satu entry penyesuaian per invoice');
    }

    // ─── FR-5.4: Reconciliation snapshot ─────────────────────────────────

    public function test_reconciliation_laba_proyek_equals_pemasukan_minus_honor(): void
    {
        $siklus = $this->createSiklusLengkap();
        $this->createPksDisetujui($siklus);
        $invoice = $this->createInvoice($siklus, total: 10_000_000, status: Invoice::STATUS_LUNAS);
        $invoice->update(['tanggal_lunas' => now()]);

        // FR-5.1: bukti pembayaran diterima → piutang_lunas terhitung.
        BuktiPembayaran::create([
            'id' => (string) Str::uuid(),
            'invoice_id' => $invoice->id,
            'submitted_by' => AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->first()->id,
            'nominal' => 10_000_000,
            'metode' => BuktiPembayaran::METODE_TRANSFER,
            'status_verifikasi' => BuktiPembayaran::STATUS_DITERIMA,
            'sumber' => BuktiPembayaran::SUMBER_MANUAL,
            'tanggal_submit' => now(),
            'tanggal_verifikasi' => now(),
        ]);
        app(LedgerService::class)->catatPiutangLunas($invoice);

        // Catat honor Surveior + Verifikator (idempotent manual)
        $svc = app(LedgerService::class);
        $sur = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-R-S',
            'nama' => 'S', 'peran' => 'surveior', 'status_aktif' => 'Aktif', 'status_penugasan_saat_ini' => 'tidak_bertugas',
        ]);
        $ver = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-R-V',
            'nama' => 'V', 'peran' => 'verifikator', 'status_aktif' => 'Aktif', 'status_penugasan_saat_ini' => 'tidak_bertugas',
        ]);
        $pSur = Penugasan::create([
            'id' => (string) Str::uuid(), 'siklus_id' => $siklus->id,
            'tenaga_ahli_id' => $sur->id, 'jenis' => 'survei', 'status' => 'selesai',
        ]);
        $pVer = Penugasan::create([
            'id' => (string) Str::uuid(), 'siklus_id' => $siklus->id,
            'tenaga_ahli_id' => $ver->id, 'jenis' => 'verifikasi', 'status' => 'selesai',
        ]);
        $svc->catatHonorSurveior($pSur, 2_500_000);
        $svc->catatHonorVerifikatorByPenugasan($pVer, 1_500_000);

        $recon = app(ReconciliationService::class)->kpi();

        $this->assertEquals(10_000_000.0, $recon['pemasukan']);
        $this->assertEquals(2_500_000.0, $recon['honor_surveior_bruto']);
        $this->assertEquals(1_500_000.0, $recon['honor_verifikator_bruto']);
        $this->assertEquals(4_000_000.0, $recon['honor_total_bruto']);
        $this->assertEquals(6_000_000.0, $recon['laba_proyek'], 'Laba = Pemasukan - Σ honor');
    }

    public function test_reconciliation_laba_minus_honor_includes_penyesuaian(): void
    {
        $siklus = $this->createSiklusLengkap();
        $pks = $this->createPksDisetujui($siklus);
        $invoice = $this->createInvoice($siklus, total: 10_000_000, status: Invoice::STATUS_LUNAS);
        $invoice->update(['tanggal_lunas' => now()]);

        BuktiPembayaran::create([
            'id' => (string) Str::uuid(),
            'invoice_id' => $invoice->id,
            'submitted_by' => AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->first()->id,
            'nominal' => 10_000_000,
            'metode' => BuktiPembayaran::METODE_TRANSFER,
            'status_verifikasi' => BuktiPembayaran::STATUS_DITERIMA,
            'sumber' => BuktiPembayaran::SUMBER_MANUAL,
            'tanggal_submit' => now(),
            'tanggal_verifikasi' => now(),
        ]);
        // Catat piutang_lunas (FR-5.1) — pemicu Pemasukan di rekonsiliasi
        app(LedgerService::class)->catatPiutangLunas($invoice);

        // Tandai PKS direvisi → adjustment -10jt
        app(LedgerService::class)->tandaiInvoiceSuperseded($invoice, 'Test revisi', $pks->id);

        $recon = app(ReconciliationService::class)->kpi();
        // Pemasukan: piutang_lunas 10jt + adjustment -10jt = 0
        $this->assertEquals(0.0, $recon['pemasukan'], 'Pemasukan setelah adjustment = 0');
    }

    // ─── FR-5.8: Bukti Potong per periode ────────────────────────────────

    public function test_bukti_potong_rekap_per_tenaga_ahli(): void
    {
        $siklus = $this->createSiklusLengkap();
        $this->createPksDisetujui($siklus);
        $this->createInvoice($siklus);

        $svc = app(LedgerService::class);
        $sur = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-BP-S',
            'nama' => 'Sur BP', 'peran' => 'surveior', 'status_aktif' => 'Aktif', 'status_penugasan_saat_ini' => 'tidak_bertugas',
        ]);
        $p1 = Penugasan::create([
            'id' => (string) Str::uuid(), 'siklus_id' => $siklus->id,
            'tenaga_ahli_id' => $sur->id, 'jenis' => 'survei', 'status' => 'selesai',
        ]);
        $entry = $svc->catatHonorSurveior($p1, 2_500_000);
        $entry->update(['status_pembayaran' => LedgerEntry::STATUS_LUNAS, 'tanggal_dibayar' => now()]);

        $rekap = app(BuktiPotongService::class)->rekapPerTenagaAhli(now()->year, now()->month);
        $this->assertCount(1, $rekap);
        $row = $rekap->first();
        $this->assertEquals('NIS-BP-S', $row['nomor_induk_surveior']);
        $this->assertEquals(2_500_000, $row['total_bruto']);
        // PPN = 0 (PPN adalah pajak OUTPUT, bukan dipotong dari honor — HonorCalculator::hitungHonor)
        $this->assertEquals(0.0, (float) $row['total_potongan_ppn']);
        // PPh 21 progresif 5% × DPP (50% × bruto) = 5% × 1.250.000 = 62.500
        $this->assertEquals(62_500, $row['total_potongan_pph']);
        // neto = bruto - PPN - PPh = 2.500.000 - 0 - 62.500
        $this->assertEquals(2_437_500, $row['total_neto']);
    }

    public function test_bukti_potong_xml_export_bp21_format(): void
    {
        $siklus = $this->createSiklusLengkap();
        $this->createPksDisetujui($siklus);
        $this->createInvoice($siklus);

        $svc = app(LedgerService::class);
        $sur = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-XML',
            'nama' => 'Sur XML', 'peran' => 'surveior', 'status_aktif' => 'Aktif', 'status_penugasan_saat_ini' => 'tidak_bertugas',
            // FR-5.9: identitas pajak untuk BP21
            'npwp' => '123456789012000',
            'nama_pajak' => 'Sur XML',
            'kode_objek_pajak' => '21-100-01',
            'status_ptkp' => 'TK/0',
            'kode_kpp' => '011001',
        ]);
        $p = Penugasan::create([
            'id' => (string) Str::uuid(), 'siklus_id' => $siklus->id,
            'tenaga_ahli_id' => $sur->id, 'jenis' => 'survei', 'status' => 'selesai',
        ]);
        $entry = $svc->catatHonorSurveior($p, 2_500_000);
        $entry->update(['status_pembayaran' => LedgerEntry::STATUS_LUNAS, 'tanggal_dibayar' => now()]);

        $lembaga = Lembaga::first();
        $lembaga->update(['npwp' => '012345678901000', 'kode_kpp' => '011001']);

        $xml = app(BuktiPotongService::class)->toCoretaxXml(now()->year, now()->month, $lembaga);
        // Root element & namespace sesuai docs/BP21_Template.xml
        $this->assertStringContainsString('<Bp21Bulk', $xml);
        $this->assertStringContainsString('xsi:noNamespaceSchemaLocation="schema.xsd"', $xml);
        $this->assertStringContainsString('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"', $xml);
        // Header TIN = NPWP Lembaga
        $this->assertStringContainsString('<TIN>012345678901000</TIN>', $xml);
        // Satu Bp21 per honor entry
        $this->assertStringContainsString('<Bp21>', $xml);
        $this->assertStringContainsString('<CounterpartTin>123456789012000</CounterpartTin>', $xml);
        $this->assertStringContainsString('<IDPlaceOfBusinessActivityOfIncomeRecipient>011001</IDPlaceOfBusinessActivityOfIncomeRecipient>', $xml);
        $this->assertStringContainsString('<StatusTaxExemption>TK/0</StatusTaxExemption>', $xml);
        $this->assertStringContainsString('<TaxObjectCode>21-100-01</TaxObjectCode>', $xml);
        // Gross = nominal bruto (2500000)
        $this->assertStringContainsString('<Gross>2500000.0000000</Gross>', $xml);
        // Deemed = 0
        $this->assertStringContainsString('<Deemed>0.0000000</Deemed>', $xml);
        // Rate = effective PPh ((62500 / 2500000) * 100) = 2.5
        $this->assertStringContainsString('<Rate>2.5000000</Rate>', $xml);
        // KPP perusahaan (6 digit, padded)
        $this->assertStringContainsString('<IDPlaceOfBusinessActivity>011001</IDPlaceOfBusinessActivity>', $xml);
        // WithholdingDate from tanggal_dibayar
        $this->assertMatchesRegularExpression('/<WithholdingDate>\d{4}-\d{2}-\d{2}<\/WithholdingDate>/', $xml);
    }

    public function test_bukti_potong_gap_melaporkan_ptkp_dan_kpp(): void
    {
        $siklus = $this->createSiklusLengkap();
        $this->createPksDisetujui($siklus);
        $this->createInvoice($siklus);

        $svc = app(LedgerService::class);
        $sur = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-GAP',
            'nama' => 'Sur Gap', 'peran' => 'surveior', 'status_aktif' => 'Aktif', 'status_penugasan_saat_ini' => 'tidak_bertugas',
            // NPWP ada tapi PTKP & KPP kosong → harus masuk gap
            'npwp' => '123456789012000',
            'nama_pajak' => 'Sur Gap',
            'kode_objek_pajak' => '21-100-01',
        ]);
        $p = Penugasan::create([
            'id' => (string) Str::uuid(), 'siklus_id' => $siklus->id,
            'tenaga_ahli_id' => $sur->id, 'jenis' => 'survei', 'status' => 'selesai',
        ]);
        $entry = $svc->catatHonorSurveior($p, 2_500_000);
        $entry->update(['status_pembayaran' => LedgerEntry::STATUS_LUNAS, 'tanggal_dibayar' => now()]);

        $gap = app(BuktiPotongService::class)->gapNpwpPerTenagaAhli(now()->year, now()->month);
        $row = $gap->first();
        $this->assertNotNull($row, 'TA dengan PTKP/KPP kosong harus masuk gap');
        $this->assertContains('status_ptkp_kosong', $row['masalah']);
        $this->assertContains('kode_kpp_kosong', $row['masalah']);
    }

    // ─── FR-5.7: KonfigurasiPajak CRUD API ───────────────────────────────

    public function test_konfigurasi_pajak_aktif_returns_current_rates(): void
    {
        $resp = $this->actingAsKeuangan()->getJson('/api/keuangan/konfigurasi-pajak/aktif');
        $resp->assertOk()
            ->assertJsonPath('data.ppn.jenis_pajak', KonfigurasiPajak::JENIS_PPN)
            ->assertJsonPath('data.pph21.jenis_pajak', KonfigurasiPajak::JENIS_PPH21);
    }

    public function test_konfigurasi_pajak_store_creates_new_rate(): void
    {
        $resp = $this->actingAsKeuangan()->postJson('/api/keuangan/konfigurasi-pajak', [
            'jenis_pajak' => 'ppn',
            'tarif_persen' => 12.00,
            'berlaku_sejak' => '2027-01-01',
            'keterangan' => 'PPN naik jadi 12% mulai 2027',
        ]);
        $resp->assertCreated();
        $this->assertDatabaseHas('konfigurasi_pajak', [
            'jenis_pajak' => 'ppn',
            'tarif_persen' => 12.00,
            'berlaku_sejak' => '2027-01-01',
        ]);
    }

    public function test_konfigurasi_pajak_faskes_role_cannot_access(): void
    {
        $faskes = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->firstOrFail();
        $this->actingAs($faskes, 'sanctum')
            ->getJson('/api/keuangan/konfigurasi-pajak')
            ->assertStatus(403);
    }

    // ─── FR-5.4: API endpoint smoke test ────────────────────────────────

    public function test_dasbor_rekonsiliasi_direktur_can_access(): void
    {
        $direktur = AkunPengguna::where('email', 'direktur@lembaga.local')->firstOrFail();
        $this->actingAs($direktur, 'sanctum')
            ->getJson('/api/dasbor/rekonsiliasi')
            ->assertOk()
            ->assertJsonPath('data.kpi.pemasukan', 0);
    }
}
