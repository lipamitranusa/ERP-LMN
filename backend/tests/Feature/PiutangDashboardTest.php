<?php

namespace Tests\Feature;

use App\Models\AkunPengguna;
use App\Models\BuktiPembayaran;
use App\Models\Faskes;
use App\Models\Invoice;
use App\Models\Lembaga;
use App\Models\Penugasan;
use App\Models\Pks;
use App\Models\SiklusAkreditasi;
use App\Services\Keuangan\PiutangService;
use Carbon\Carbon;
use Database\Seeders\AkunPenggunaSeeder;
use Database\Seeders\DefaultPrivilegesSeeder;
use Database\Seeders\FaskesSeeder;
use Database\Seeders\KonfigurasiPajakSeeder;
use Database\Seeders\LembagaSeeder;
use Database\Seeders\MenuActionsTableSeeder;
use Database\Seeders\RolesTableSeeder;
use Database\Seeders\TenagaAhliSeeder;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class PiutangDashboardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Seed ONLY the structural seeders needed for privilege/auth tests.
        // Skip DummyTransaksiSeeder which creates extra invoices that pollute
        // the isolated test DB and inflate PiutangService counts.
        $this->seed([
            MenuActionsTableSeeder::class,
            RolesTableSeeder::class,
            DefaultPrivilegesSeeder::class,
            LembagaSeeder::class,
            FaskesSeeder::class,
            TenagaAhliSeeder::class,
            AkunPenggunaSeeder::class,
            KonfigurasiPajakSeeder::class,
        ]);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function makeFaskes(string $name = 'RS Test'): Faskes
    {
        return Faskes::create([
            'id' => (string) Str::uuid(),
            'nama' => $name,
            'tipe_faskes' => 'Rumah Sakit',
            'alamat' => 'Jl. Test',
            'status' => 'Aktif',
            'telepon' => '081234567890',
            'email' => Str::random(5) . '@example.com',
        ]);
    }

    private function makeInvoice(
        Faskes $faskes,
        float $total = 5_000_000,
        string $status = Invoice::STATUS_BELUM_BAYAR,
        ?string $dueDate = null,
        float $diterima = 0,
    ): Invoice {
        $lembaga = Lembaga::first();
        $siklus = SiklusAkreditasi::create([
            'id' => (string) Str::uuid(),
            'faskes_id' => $faskes->id,
            'lembaga_id' => $lembaga->id,
            'tanggal_pengajuan' => now()->subDays(20)->toDateString(),
            'status' => 'menunggu_dokumen',
            'status_kelengkapan' => 'lengkap',
            'created_at' => now()->subDays(20),
        ]);
        $pks = Pks::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'nomor_pks' => 'PKS/TEST/' . strtoupper(Str::random(4)),
            'dibuat_oleh' => AkunPengguna::first()->id,
            'status' => Pks::STATUS_DISETUJUI,
            'tanggal_disetujui' => now()->subDays(20)->toDateString(),
        ]);
        $invoice = Invoice::create([
            'id' => (string) Str::uuid(),
            'pks_id' => $pks->id,
            'siklus_id' => $siklus->id,
            'nomor_invoice' => 'INV/PIUTANG/' . strtoupper(Str::random(4)),
            'dibuat_oleh' => AkunPengguna::first()->id,
            'total_tagihan' => $total,
            'status' => $status,
            'diterbitkan_pada' => now()->subDays(20),
            'due_date' => $dueDate ?? now()->subDays(1)->toDateString(),
        ]);

        if ($diterima > 0) {
            BuktiPembayaran::create([
                'id' => (string) Str::uuid(),
                'invoice_id' => $invoice->id,
                'submitted_by' => AkunPengguna::first()->id,
                'nominal' => $diterima,
                'metode' => BuktiPembayaran::METODE_TRANSFER,
                'status_verifikasi' => BuktiPembayaran::STATUS_DITERIMA,
                'sumber' => BuktiPembayaran::SUMBER_MANUAL,
                'tanggal_submit' => now()->subDays(5),
                'tanggal_verifikasi' => now()->subDays(5),
            ]);
        }
        return $invoice;
    }

    // ─── AC-1: Dasbor piutang independen dari alur penugasan ──────────────

    public function test_ac1_piutang_reflects_invoice_status_regardless_of_penugasan(): void
    {
        // Setup: invoice belum_bayar, TIDAK ada penugasan
        $faskes = $this->makeFaskes('RS Independence Test');
        $invoice = $this->makeInvoice($faskes, total: 5_000_000, status: Invoice::STATUS_BELUM_BAYAR);

        $service = app(PiutangService::class);
        $snapshot = $service->snapshot();

        // Invoice muncul di dasbor meskipun TIDAK ada Penugasan sama sekali
        $found = collect($snapshot['invoice_list'])->firstWhere('id', $invoice->id);
        $this->assertNotNull($found, 'Invoice piutang harus muncul di dasbor meskipun tidak ada penugasan.');
        $this->assertEquals(5_000_000, $found['sisa_piutang']);
    }

    public function test_ac1_piutang_includes_overdue_even_if_penugasan_dibatalkan(): void
    {
        // Setup: invoice overdue + penugasan dibatalkan
        $faskes = $this->makeFaskes('RS Overdue Test');
        $invoice = $this->makeInvoice($faskes, total: 5_000_000, dueDate: now()->subDays(15)->toDateString());
        $surveior = \App\Models\TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-CANCEL-' . Str::random(4),
            'nama' => 'Surveior Cancel',
            'peran' => 'surveior',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
        ]);
        Penugasan::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $invoice->siklus_id,
            'tenaga_ahli_id' => $surveior->id,
            'jenis' => Penugasan::JENIS_SURVEI,
            'status' => Penugasan::STATUS_DIBATALKAN,  // ← dibatalkan
        ]);

        $service = app(PiutangService::class);
        $kpi = $service->kpiSummary();

        // Invoice tetap dihitung piutang meskipun penugasan dibatalkan
        $this->assertEquals(5_000_000, $kpi['total_piutang_aktif']);
        $this->assertEquals(1, $kpi['jumlah_jatuh_tempo']);
        $this->assertEquals(5_000_000, $kpi['nilai_jatuh_tempo']);
    }

    public function test_piutang_excludes_lunas_invoices(): void
    {
        $faskes = $this->makeFaskes('RS Lunas Test');
        $lunas = $this->makeInvoice($faskes, total: 5_000_000, status: Invoice::STATUS_LUNAS, diterima: 5_000_000);
        $lunas->update(['tanggal_lunas' => now()]);
        $this->makeInvoice($faskes, total: 3_000_000, status: Invoice::STATUS_BELUM_BAYAR);

        $service = app(PiutangService::class);
        $kpi = $service->kpiSummary();

        $this->assertEquals(1, $kpi['jumlah_invoice_aktif']);
        $this->assertEquals(3_000_000, $kpi['total_piutang_aktif']);
        $this->assertEquals(5_000_000, $kpi['total_lunas_bulan_ini']);
    }

    public function test_piutang_excludes_refunded_invoices(): void
    {
        $faskes = $this->makeFaskes('RS Refunded Test');
        $this->makeInvoice($faskes, total: 5_000_000, status: Invoice::STATUS_REFUNDED);
        $this->makeInvoice($faskes, total: 2_000_000, status: Invoice::STATUS_BELUM_BAYAR);

        $service = app(PiutangService::class);
        $kpi = $service->kpiSummary();
        $this->assertEquals(1, $kpi['jumlah_invoice_aktif']);
    }

    public function test_piutang_excludes_superseded_invoices(): void
    {
        $faskes = $this->makeFaskes('RS Superseded');
        $this->makeInvoice($faskes, total: 4_000_000, status: Invoice::STATUS_SUPERSEDED);
        $this->makeInvoice($faskes, total: 6_000_000, status: Invoice::STATUS_BELUM_BAYAR);

        $service = app(PiutangService::class);
        $kpi = $service->kpiSummary();
        $this->assertEquals(1, $kpi['jumlah_invoice_aktif']);
    }

    public function test_sebagian_status_counted_as_piutang(): void
    {
        $faskes = $this->makeFaskes('RS Sebagian');
        $this->makeInvoice($faskes, total: 5_000_000, status: Invoice::STATUS_SEBAGIAN, diterima: 2_000_000);

        $service = app(PiutangService::class);
        $kpi = $service->kpiSummary();
        $this->assertEquals(1, $kpi['jumlah_invoice_aktif']);
        $this->assertEquals(1, $kpi['jumlah_sebagian']);
        $this->assertEquals(3_000_000, $kpi['total_piutang_aktif']);  // 5jt - 2jt
    }

    // ─── Aging buckets ─────────────────────────────────────────────────────

    public function test_aging_buckets_classify_correctly(): void
    {
        $f = $this->makeFaskes('RS Aging');
        // 5 hari overdue
        $this->makeInvoice($f, total: 1_000_000, dueDate: now()->subDays(5)->toDateString());
        // 45 hari overdue
        $this->makeInvoice($f, total: 2_000_000, dueDate: now()->subDays(45)->toDateString());
        // 75 hari overdue
        $this->makeInvoice($f, total: 3_000_000, dueDate: now()->subDays(75)->toDateString());
        // 100 hari overdue
        $this->makeInvoice($f, total: 4_000_000, dueDate: now()->subDays(100)->toDateString());
        // belum jatuh tempo
        $this->makeInvoice($f, total: 500_000, dueDate: now()->addDays(10)->toDateString());

        $service = app(PiutangService::class);
        $aging = $service->agingBuckets();

        $this->assertEquals(1, $aging['0_30']['count']);
        $this->assertEquals(1_000_000, $aging['0_30']['nilai']);
        $this->assertEquals(1, $aging['31_60']['count']);
        $this->assertEquals(2_000_000, $aging['31_60']['nilai']);
        $this->assertEquals(1, $aging['61_90']['count']);
        $this->assertEquals(3_000_000, $aging['61_90']['nilai']);
        $this->assertEquals(1, $aging['>90']['count']);
        $this->assertEquals(4_000_000, $aging['>90']['nilai']);
        $this->assertEquals(1, $aging['belum_jatuh_tempo']['count']);
        $this->assertEquals(500_000, $aging['belum_jatuh_tempo']['nilai']);
    }

    // ─── Per-Faskes breakdown ──────────────────────────────────────────────

    public function test_per_faskes_aggregated_and_sorted_by_sisa(): void
    {
        $f1 = $this->makeFaskes('RS Besar Piutang');
        $f2 = $this->makeFaskes('RS Kecil Piutang');
        $this->makeInvoice($f1, total: 8_000_000, status: Invoice::STATUS_BELUM_BAYAR);
        $this->makeInvoice($f1, total: 2_000_000, status: Invoice::STATUS_BELUM_BAYAR);
        $this->makeInvoice($f2, total: 1_000_000, status: Invoice::STATUS_BELUM_BAYAR);

        $service = app(PiutangService::class);
        $rows = $service->perFaskes();

        $this->assertCount(2, $rows);
        $this->assertEquals('RS Besar Piutang', $rows[0]->faskes_nama);
        $this->assertEquals(10_000_000, $rows[0]->sisa_piutang);
        $this->assertEquals(2, $rows[0]->jumlah_invoice);
        $this->assertEquals('RS Kecil Piutang', $rows[1]->faskes_nama);
        $this->assertEquals(1_000_000, $rows[1]->sisa_piutang);
    }

    public function test_per_faskes_deducts_accepted_payments(): void
    {
        $f = $this->makeFaskes('RS Partial');
        $this->makeInvoice($f, total: 5_000_000, status: Invoice::STATUS_SEBAGIAN, diterima: 2_000_000);

        $service = app(PiutangService::class);
        $rows = $service->perFaskes();
        $this->assertEquals(3_000_000, $rows[0]->sisa_piutang);
    }

    // ─── Hari overdue computation ──────────────────────────────────────────

    public function test_hari_overdue_correctly_calculated(): void
    {
        $f = $this->makeFaskes('RS Hari');
        $inv = $this->makeInvoice($f, total: 1_000_000, dueDate: now()->subDays(30)->toDateString());

        $service = app(PiutangService::class);
        $list = $service->invoiceList();
        $found = collect($list)->firstWhere('id', $inv->id);
        $this->assertEquals(30, $found['hari_overdue']);
    }

    // ─── Privilege: hanya Admin Lembaga & Direktur/Keuangan ────────────────

    public function test_direktur_can_access_dasbor(): void
    {
        $direktur = AkunPengguna::where('email', 'direktur@lembaga.local')->firstOrFail();
        $this->actingAs($direktur, 'sanctum')
            ->getJson('/api/piutang/dasbor')
            ->assertOk();
    }

    public function test_keuangan_can_access_dasbor(): void
    {
        $keuangan = AkunPengguna::where('email', 'keuangan@lembaga.local')->firstOrFail();
        $this->actingAs($keuangan, 'sanctum')
            ->getJson('/api/piutang/dasbor')
            ->assertOk();
    }

    public function test_admin_lembaga_can_access_dasbor(): void
    {
        $admin = AkunPengguna::where('email', 'admin@erp.local')->firstOrFail();
        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/piutang/dasbor')
            ->assertOk();
    }

    public function test_surveior_cannot_access_dasbor(): void
    {
        $surveior = AkunPengguna::where('email', 'ns-0001@surveyor.local')->firstOrFail();
        $this->actingAs($surveior, 'sanctum')
            ->getJson('/api/piutang/dasbor')
            ->assertStatus(403);
    }

    public function test_verifikator_cannot_access_dasbor(): void
    {
        $verifikator = AkunPengguna::where('email', 'ns-0002@surveyor.local')->firstOrFail();
        $this->actingAs($verifikator, 'sanctum')
            ->getJson('/api/piutang/dasbor')
            ->assertStatus(403);
    }

    public function test_faskes_cannot_access_dasbor(): void
    {
        $faskes = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->firstOrFail();
        $this->actingAs($faskes, 'sanctum')
            ->getJson('/api/piutang/dasbor')
            ->assertStatus(403);
    }

    public function test_sdm_cannot_access_dasbor(): void
    {
        $sdm = AkunPengguna::where('email', 'sdm@lembaga.local')->firstOrFail();
        $this->actingAs($sdm, 'sanctum')
            ->getJson('/api/piutang/dasbor')
            ->assertStatus(403);
    }

    // ─── Filter via API ─────────────────────────────────────────────────────

    public function test_api_filter_by_status(): void
    {
        $f = $this->makeFaskes('RS Filter');
        $this->makeInvoice($f, total: 1_000_000, status: Invoice::STATUS_BELUM_BAYAR);
        $this->makeInvoice($f, total: 2_000_000, status: Invoice::STATUS_SEBAGIAN, diterima: 500_000);

        $admin = AkunPengguna::where('email', 'admin@erp.local')->firstOrFail();
        $resp = $this->actingAs($admin, 'sanctum')->getJson('/api/piutang/dasbor?status=sebagian');
        $resp->assertOk()
            ->assertJsonPath('data.invoice_list.0.status', 'sebagian');
    }

    public function test_api_filter_jatuh_tempo(): void
    {
        $f = $this->makeFaskes('RS Filter Overdue');
        $this->makeInvoice($f, total: 1_000_000, dueDate: now()->subDays(10)->toDateString());
        $this->makeInvoice($f, total: 2_000_000, dueDate: now()->addDays(10)->toDateString());

        $admin = AkunPengguna::where('email', 'admin@erp.local')->firstOrFail();
        $resp = $this->actingAs($admin, 'sanctum')->getJson('/api/piutang/dasbor?jatuh_tempo=1');
        $resp->assertOk();
        $list = $resp->json('data.invoice_list');
        foreach ($list as $inv) {
            $this->assertGreaterThan(0, $inv['hari_overdue'], "Filtered invoice harus overdue: {$inv['nomor_invoice']}");
        }
    }

    // ─── Independence regression: penugasan_cancel不影响 piutang ──────────

    public function test_penugasan_dibatalkan_tidak_mempengaruhi_piutang(): void
    {
        $f = $this->makeFaskes('RS Regression');
        $inv = $this->makeInvoice($f, total: 5_000_000, status: Invoice::STATUS_BELUM_BAYAR);
        $ta = \App\Models\TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-REG-' . Str::random(4),
            'nama' => 'Test',
            'peran' => 'surveior',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
        ]);
        Penugasan::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $inv->siklus_id,
            'tenaga_ahli_id' => $ta->id,
            'jenis' => Penugasan::JENIS_SURVEI,
            'status' => Penugasan::STATUS_DITOLAK,
        ]);

        $service = app(PiutangService::class);
        $kpi = $service->kpiSummary();
        $this->assertEquals(5_000_000, $kpi['total_piutang_aktif']);
    }
}
