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

class TmpDiagTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_diag(): void
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

        $entry = app(LedgerService::class)->catatHonorSurveior($penugasan, 2_500_000.0);

        $result = app(ApHonorService::class)->createPayment(
            ledgerEntryIds: [$entry->id],
            paymentMeta: ['tanggal_pembayaran' => now()->toDateString(), 'metode' => PembayaranHonor::METODE_TRANSFER],
            userId: $user->id,
        );
        dump(['create_success' => $result['success'], 'error' => $result['error'] ?? null]);
        $pembayaran = $result['pembayaran'];

        $res = $this->actingAs($user, 'sanctum')
            ->getJson('/api/keuangan/ap-honor/payments')
            ->assertOk();

        $rows = $res->json('data');
        dump([
            'row_count' => is_array($rows) ? count($rows) : 'NOT_ARRAY',
            'row_ids' => is_array($rows) ? array_map(fn ($r) => $r['id'] ?? null, $rows) : null,
            'payment_id' => $pembayaran->id,
            'session' => session('lembaga_id'),
        ]);

        $this->assertTrue(true);
    }
}
