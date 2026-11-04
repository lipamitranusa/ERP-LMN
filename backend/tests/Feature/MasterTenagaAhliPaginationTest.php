<?php

namespace Tests\Feature;

use App\Models\AkunPengguna;
use App\Models\TenagaAhli;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\KonfigurasiPajakSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class MasterTenagaAhliPaginationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->seed(KonfigurasiPajakSeeder::class);
    }

    private function actingAsAdmin(): static
    {
        return $this->actingAs(AkunPengguna::where('email', 'admin@erp.local')->firstOrFail(), 'sanctum');
    }

    private function createTenagaAhli(string $nama, string $lembagaId): TenagaAhli
    {
        return TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => 'NIS-'.strtoupper(Str::random(6)),
            'nama' => $nama,
            'peran' => 'surveior',
            'jenis' => 'TKPP',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'tidak_bertugas',
            'lembaga_id' => $lembagaId,
        ]);
    }

    public function test_index_returns_pagination_metadata(): void
    {
        $resp = $this->actingAsAdmin()->getJson('/api/master/tenaga-ahli');
        $resp->assertOk()
            ->assertJsonStructure(['data', 'current_page', 'last_page', 'per_page', 'total']);
    }

    public function test_index_paginates_with_per_page_and_page_params(): void
    {
        $resp = $this->actingAsAdmin()->getJson('/api/master/tenaga-ahli?per_page=2&page=1');
        $resp->assertOk()
            ->assertJsonPath('per_page', 2)
            ->assertJsonPath('current_page', 1)
            ->assertJsonCount(2, 'data');

        $page2 = $this->actingAsAdmin()->getJson('/api/master/tenaga-ahli?per_page=2&page=2');
        $page2->assertOk()
            ->assertJsonPath('current_page', 2);

        // Halaman berbeda tidak boleh mengembalikan baris yang sama
        $ids1 = collect($resp->json('data'))->pluck('id');
        $ids2 = collect($page2->json('data'))->pluck('id');
        $this->assertEmpty($ids1->intersect($ids2));
    }

    public function test_per_page_is_capped_at_200(): void
    {
        $resp = $this->actingAsAdmin()->getJson('/api/master/tenaga-ahli?per_page=5000');
        $resp->assertOk()
            ->assertJsonPath('per_page', 200);
    }

    public function test_filter_by_peran_is_applied_within_pagination(): void
    {
        $resp = $this->actingAsAdmin()->getJson('/api/master/tenaga-ahli?per_page=50&peran=verifikator');
        $resp->assertOk();
        foreach ($resp->json('data') as $row) {
            $this->assertSame('verifikator', $row['peran']);
        }
    }
}
