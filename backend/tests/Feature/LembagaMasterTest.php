<?php

namespace Tests\Feature;

use App\Models\AkunPengguna;
use App\Models\Lembaga;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LembagaMasterTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_admin_dapat_update_lembaga_dengan_rekening_dan_website_kosong(): void
    {
        $admin = AkunPengguna::where('email', 'admin@erp.local')->firstOrFail();
        $lembaga = Lembaga::findOrFail('00000000-0000-0000-0000-000000000001');

        $response = $this->actingAs($admin, 'sanctum')
            ->withSession(['lembaga_id' => '00000000-0000-0000-0000-000000000002'])
            ->putJson("/api/master/lembaga/{$lembaga->id}?lembaga_id=00000000-0000-0000-0000-000000000002", [
                'nama' => $lembaga->nama,
                'nama_pt' => $lembaga->nama_pt,
                'alamat' => $lembaga->alamat,
                'kota' => $lembaga->kota,
                'telepon' => $lembaga->telepon,
                'email' => $lembaga->email,
                'website' => 'https://',
                'status' => 'aktif',
                'npwp' => '00.000.000.0-000.000',
                'no_rekening' => '1234567890',
                'nama_bank' => 'Bank BCA',
                'atas_nama_rekening' => 'LAMDAKU',
            ]);

        $response->assertOk()
            ->assertJsonPath('data.no_rekening', '1234567890')
            ->assertJsonPath('data.nama_bank', 'Bank BCA')
            ->assertJsonPath('data.atas_nama_rekening', 'LAMDAKU')
            ->assertJsonPath('data.website', null);
    }
}
