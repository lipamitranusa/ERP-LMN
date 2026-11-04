<?php

namespace Tests\Feature;

use App\Models\AkunPengguna;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SwitchLembagaSessionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    private function admin(): AkunPengguna
    {
        return AkunPengguna::where('email', 'admin@erp.local')->firstOrFail();
    }

    private function lemmaKedua(): string
    {
        return $this->admin()
            ->lembagas()
            ->withoutGlobalScope('lembaga')
            ->where('nama', 'LAMDAKU')
            ->firstOrFail()
            ->id;
    }

    public function test_user_tetap_terautentikasi_di_lembaga_kedua(): void
    {
        $token = $this->admin()->createToken('test')->plainTextToken;

        session(['lembaga_id' => $this->lemmaKedua()]);

        $this->withToken($token)->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.email', 'admin@erp.local');
    }

    public function test_login_tetap_berhasil_saat_session_di_lembaga_kedua(): void
    {
        session(['lembaga_id' => $this->lemmaKedua()]);

        $this->postJson('/api/auth/login', [
            'login' => 'admin@erp.local',
            'password' => 'password',
        ])->assertOk();
    }

    public function test_setelah_switch_lembaga_me_tetap_200(): void
    {
        $token = $this->admin()->createToken('test')->plainTextToken;

        $this->withToken($token)->postJson('/api/auth/switch-lembaga', [
            'lembaga_id' => $this->lemmaKedua(),
        ])->assertOk();

        $this->withToken($token)->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.email', 'admin@erp.local');
    }
}
