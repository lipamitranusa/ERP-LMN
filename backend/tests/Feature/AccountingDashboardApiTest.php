<?php

namespace Tests\Feature;

use App\Models\AkunPengguna;
use App\Models\JurnalUmum;
use App\Models\JurnalUmumDetail;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Endpoint HTTP dasbor akuntansi — memastikan query param tahun/bulan
 * diteruskan ke service dan periode menentukan isi KPI.
 */
class AccountingDashboardApiTest extends TestCase
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

    private function makeJurnal(string $tanggal, float $debit, float $kredit, string $jenis): void
    {
        $user = AkunPengguna::where('email', 'keuangan@lembaga.local')->firstOrFail();

        $coaId = \App\Models\Coa::withoutGlobalScope('lembaga')
            ->where('lembaga_id', $user->lembaga_id)
            ->where('jenis', $jenis)
            ->first()
            ->id;

        $kasId = \App\Models\Coa::withoutGlobalScope('lembaga')
            ->where('lembaga_id', $user->lembaga_id)
            ->where('kode', '1101')
            ->first()
            ->id;

        $jurnal = JurnalUmum::withoutGlobalScope('lembaga')->create([
            'id' => (string) Str::uuid(),
            'nomor' => 'JU/API/' . Str::upper(Str::random(6)),
            'tanggal' => $tanggal,
            'keterangan' => 'Jurnal uji API',
            'total_debit' => $debit,
            'total_kredit' => $kredit,
            'dibuat_oleh' => $user->id,
            'lembaga_id' => $user->lembaga_id,
        ]);

        // Akun pendapatan/beban normalnya kredit/debit — sisilawannya di Kas.
        $baris = $debit > 0
            ? [['coa' => $kasId, 'debit' => $debit, 'kredit' => 0], ['coa' => $coaId, 'debit' => 0, 'kredit' => $kredit]]
            : [['coa' => $coaId, 'debit' => $debit, 'kredit' => 0], ['coa' => $kasId, 'debit' => 0, 'kredit' => $kredit]];

        foreach ($baris as $b) {
            JurnalUmumDetail::withoutGlobalScope('lembaga')->create([
                'id' => (string) Str::uuid(),
                'jurnal_umum_id' => $jurnal->id,
                'coa_id' => $b['coa'],
                'debit' => $b['debit'],
                'kredit' => $b['kredit'],
            ]);
        }
    }

    public function test_query_param_tahun_bulan_menentukan_periode_kpi(): void
    {
        $this->makeJurnal(now()->startOfMonth()->addDay()->toDateString(), 9_000_000, 9_000_000, 'pendapatan');

        $res = $this->actingAsKeuangan()
            ->getJson('/api/keuangan/accounting/dashboard?tahun=' . now()->year . '&bulan=' . now()->month)
            ->assertOk();

        $data = $res->json('data');
        $this->assertEquals(now()->year, $data['periode']['tahun']);
        $this->assertEquals(now()->month, $data['periode']['bulan']);
        $this->assertEquals(1, $data['ringkasan']['jumlah_jurnal']);
        $this->assertEqualsWithDelta(9_000_000, $data['ringkasan']['total_pendapatan'], 0.01);
    }

    public function test_periode_lain_tidak_mengambil_jurnal_bulan_sekarang(): void
    {
        $this->makeJurnal(now()->startOfMonth()->addDay()->toDateString(), 9_000_000, 9_000_000, 'pendapatan');

        $res = $this->actingAsKeuangan()
            ->getJson('/api/keuangan/accounting/dashboard?tahun=' . now()->subYear()->year . '&bulan=' . now()->month)
            ->assertOk();

        $data = $res->json('data');
        $this->assertEquals(0, $data['ringkasan']['jumlah_jurnal']);
        $this->assertEqualsWithDelta(0, $data['ringkasan']['total_pendapatan'], 0.01);
    }

    public function test_tahun_tanpa_bulan_mencakup_setahun(): void
    {
        $this->makeJurnal(now()->startOfMonth()->addDay()->toDateString(), 9_000_000, 9_000_000, 'pendapatan');

        $res = $this->actingAsKeuangan()
            ->getJson('/api/keuangan/accounting/dashboard?tahun=' . now()->year)
            ->assertOk();

        $data = $res->json('data');
        $this->assertNull($data['periode']['bulan']);
        $this->assertEquals(1, $data['ringkasan']['jumlah_jurnal']);
    }

    public function test_bulan_kosong_dipakai_frontend_berarti_setahun(): void
    {
        $this->makeJurnal(now()->startOfMonth()->addDay()->toDateString(), 9_000_000, 9_000_000, 'pendapatan');

        // Frontend mengirim `bulan=` (string kosong) untuk opsi "Semua Bulan".
        $res = $this->actingAsKeuangan()
            ->getJson('/api/keuangan/accounting/dashboard?tahun=' . now()->year . '&bulan=')
            ->assertOk();

        $data = $res->json('data');
        $this->assertNull($data['periode']['bulan']);
        $this->assertEquals(1, $data['ringkasan']['jumlah_jurnal']);
    }

    public function test_tanpa_query_param_tetap_berjalan(): void
    {
        $this->makeJurnal(now()->startOfMonth()->addDay()->toDateString(), 9_000_000, 9_000_000, 'pendapatan');

        $res = $this->actingAsKeuangan()
            ->getJson('/api/keuangan/accounting/dashboard')
            ->assertOk();

        $data = $res->json('data');
        $this->assertEquals(now()->year, $data['periode']['tahun']);
        $this->assertEquals(now()->month, $data['periode']['bulan']);
        $this->assertEquals(1, $data['ringkasan']['jumlah_jurnal']);
    }
}
