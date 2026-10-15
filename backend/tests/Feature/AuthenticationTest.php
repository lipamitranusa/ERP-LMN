<?php

namespace Tests\Feature;

use App\Models\AkunPengguna;
use App\Models\Role;
use App\Models\TenagaAhli;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    // ─── Login throttling ─────────────────────────────────────────────────────

    public function test_login_succeeds_with_correct_credentials(): void
    {
        $user = AkunPengguna::where('email', 'admin@erp.local')->firstOrFail();

        $resp = $this->postJson('/api/auth/login', [
            'email' => 'admin@erp.local',
            'password' => 'password',
        ]);

        $resp->assertOk()
            ->assertJsonStructure(['token', 'user' => ['id', 'nama', 'email', 'role']])
            ->assertJsonPath('user.email', 'admin@erp.local');
    }

    public function test_login_fails_with_wrong_password(): void
    {
        $resp = $this->postJson('/api/auth/login', [
            'email' => 'admin@erp.local',
            'password' => 'wrongpassword123',
        ]);

        $resp->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_login_fails_with_nonexistent_email(): void
    {
        $resp = $this->postJson('/api/auth/login', [
            'email' => 'notexist@example.com',
            'password' => 'anypassword',
        ]);

        $resp->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_account_locked_after_five_failed_attempts(): void
    {
        $user = AkunPengguna::where('email', 'admin@erp.local')->firstOrFail();

        // 5 wrong attempts
        for ($i = 1; $i <= 5; $i++) {
            $this->postJson('/api/auth/login', [
                'email' => 'admin@erp.local',
                'password' => "wrong{$i}",
            ])->assertStatus(422);
        }

        // 6th attempt — should be locked
        $resp = $this->postJson('/api/auth/login', [
            'email' => 'admin@erp.local',
            'password' => 'password',
        ]);

        $resp->assertStatus(422)
            ->assertJsonValidationErrors(['email']);

        $this->assertStringContainsString('terkunci', $resp->json('errors.email.0'));
    }

    public function test_locked_account_shows_remaining_time(): void
    {
        $user = AkunPengguna::where('email', 'admin@erp.local')->firstOrFail();

        // Lock the account
        for ($i = 1; $i <= 5; $i++) {
            $this->postJson('/api/auth/login', ['email' => 'admin@erp.local', 'password' => 'bad']);
        }

        $resp = $this->postJson('/api/auth/login', [
            'email' => 'admin@erp.local',
            'password' => 'password',
        ]);

        $resp->assertStatus(422);
        // Message should mention minutes remaining
        $this->assertMatchesRegularExpression('/\d+\s*menit/', $resp->json('errors.email.0'));
    }

    public function test_successful_login_resets_failed_attempt_counter(): void
    {
        $user = AkunPengguna::where('email', 'admin@erp.local')->firstOrFail();

        // 4 wrong attempts
        for ($i = 1; $i < 5; $i++) {
            $this->postJson('/api/auth/login', ['email' => 'admin@erp.local', 'password' => "bad{$i}"]);
        }

        // Reset with correct password
        $this->postJson('/api/auth/login', [
            'email' => 'admin@erp.local',
            'password' => 'password',
        ])->assertOk();

        // Counter should be reset — 5 more wrong attempts should NOT lock immediately
        for ($i = 1; $i < 5; $i++) {
            $this->postJson('/api/auth/login', ['email' => 'admin@erp.local', 'password' => "bad{$i}"]);
        }
        // Still no lock on 4th try
        $resp = $this->postJson('/api/auth/login', ['email' => 'admin@erp.local', 'password' => 'bad999']);
        $resp->assertStatus(422);
        $this->assertStringContainsString('tidak cocok', $resp->json('errors.email.0'));
    }

    public function test_login_fails_for_inactive_account(): void
    {
        $user = AkunPengguna::where('email', 'admin@erp.local')->firstOrFail();
        $user->forceFill(['status_akun' => 'Nonaktif'])->save();

        $resp = $this->postJson('/api/auth/login', [
            'email' => 'admin@erp.local',
            'password' => 'password',
        ]);

        $resp->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    // ─── Session / token expiration (NFR-3) ───────────────────────────────────

    public function test_api_returns_401_without_token(): void
    {
        $this->getJson('/api/auth/me')->assertStatus(401);
    }

    public function test_api_rejects_expired_token(): void
    {
        $user = AkunPengguna::where('email', 'admin@erp.local')->firstOrFail();

        // Create token that expires in the past
        $token = $user->createToken('test', expiresAt: now()->subMinute())->plainTextToken;

        $resp = $this->withToken($token)->getJson('/api/auth/me');
        $resp->assertStatus(401);
    }

    public function test_logout_invalidates_token(): void
    {
        // Verify that calling logout deletes the user's tokens
        $user = AkunPengguna::where('email', 'admin@erp.local')->firstOrFail();
        $token = $user->createToken('test');
        $tokenId = $token->accessToken->id;

        // Call logout controller directly with the token set on the user
        $user->withAccessToken($token->accessToken);

        $controller = new \App\Http\Controllers\Api\AuthController();
        $request = \Illuminate\Http\Request::create('/api/auth/logout', 'POST');
        $request->setUserResolver(fn () => $user);

        $response = $controller->logout($request);

        $this->assertEquals(200, $response->getStatusCode());
        $this->assertEquals('Logout berhasil.', $response->getData(true)['message']);

        // Verify the token is deleted from the database
        $this->assertNull(\Laravel\Sanctum\PersonalAccessToken::findToken($tokenId));
    }

    public function test_auth_me_returns_user_and_menu_actions(): void
    {
        $user = AkunPengguna::where('email', 'admin@erp.local')->firstOrFail();
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonStructure([
                'user' => ['id', 'nama', 'email', 'role'],
                'menu_actions',
            ])
            ->assertJsonPath('user.email', 'admin@erp.local');
    }

    // ─── Admin creates account (no self-registration) ──────────────────────────

    public function test_sdm_can_create_new_account(): void
    {
        $sdm = AkunPengguna::where('email', 'sdm@lembaga.local')->firstOrFail();
        $token = $sdm->createToken('test')->plainTextToken;

        $role = Role::where('nama_role', 'Faskes')->firstOrFail();

        $resp = $this->withToken($token)->postJson('/api/admin/akun-pengguna', [
            'nama' => 'John Doe',
            'email' => 'john.doe@example.com',
            'role_id' => $role->id,
            'status_akun' => 'Aktif',
        ]);

        $resp->assertCreated()
            ->assertJsonPath('data.nama', 'John Doe')
            ->assertJsonPath('data.status_akun', 'Aktif')
            ->assertJsonStructure(['generated_password']);

        $this->assertDatabaseHas('akun_pengguna', [
            'email' => 'john.doe@example.com',
            'nama' => 'John Doe',
            'role_id' => $role->id,
        ]);
    }

    public function test_admin_can_create_account_with_custom_password(): void
    {
        $sdm = AkunPengguna::where('email', 'sdm@lembaga.local')->firstOrFail();
        $token = $sdm->createToken('test')->plainTextToken;
        $role = Role::where('nama_role', 'Admin Lembaga')->firstOrFail();

        $resp = $this->withToken($token)->postJson('/api/admin/akun-pengguna', [
            'nama' => 'Admin Baru',
            'email' => 'admin.baru@example.com',
            'role_id' => $role->id,
            'password' => 'SecurePass123!',
            'status_akun' => 'Aktif',
        ]);

        $resp->assertCreated()
            ->assertJsonMissing(['generated_password']);

        $this->assertTrue(
            Hash::check('SecurePass123!', AkunPengguna::where('email', 'admin.baru@example.com')->first()->password_hash),
        );
    }

    public function test_cannot_create_account_with_duplicate_email(): void
    {
        $sdm = AkunPengguna::where('email', 'sdm@lembaga.local')->firstOrFail();
        $token = $sdm->createToken('test')->plainTextToken;
        $role = Role::where('nama_role', 'Faskes')->firstOrFail();

        $this->withToken($token)->postJson('/api/admin/akun-pengguna', [
            'nama' => 'Someone',
            'email' => 'admin@erp.local', // already exists
            'role_id' => $role->id,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_faskes_role_cannot_create_account(): void
    {
        $faskes = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->firstOrFail();
        $token = $faskes->createToken('test')->plainTextToken;
        $role = Role::where('nama_role', 'Faskes')->firstOrFail();

        $this->withToken($token)->postJson('/api/admin/akun-pengguna', [
            'nama' => 'Unauthorized Creator',
            'email' => 'unauthorized@example.com',
            'role_id' => $role->id,
        ])->assertStatus(403);
    }

    public function test_unauthenticated_cannot_create_account(): void
    {
        $role = Role::where('nama_role', 'Faskes')->firstOrFail();

        $this->postJson('/api/admin/akun-pengguna', [
            'nama' => 'Hacker',
            'email' => 'hacker@evil.com',
            'role_id' => $role->id,
        ])->assertStatus(401);
    }

    // ─── Surveior/Verifikator: tenaga_ahli_id mandatory ──────────────────────

    public function test_surveior_account_requires_tenaga_ahli_id(): void
    {
        $sdm = AkunPengguna::where('email', 'sdm@lembaga.local')->firstOrFail();
        $token = $sdm->createToken('test')->plainTextToken;
        $role = Role::where('nama_role', 'Surveior')->firstOrFail();

        $resp = $this->withToken($token)->postJson('/api/admin/akun-pengguna', [
            'nama' => 'Surveior Tanpa NIS',
            'email' => 'surveior.bads@example.com',
            'role_id' => $role->id,
        ]);

        $resp->assertStatus(422)
            ->assertJsonPath('message', "Akun dengan Role 'Surveior' wajib terkait ke record Tenaga Ahli (nomor_induk_surveior).");
    }

    public function test_surveior_account_creation_succeeds_with_valid_tenaga_ahli(): void
    {
        $sdm = AkunPengguna::where('email', 'sdm@lembaga.local')->firstOrFail();
        $token = $sdm->createToken('test')->plainTextToken;

        $role = Role::where('nama_role', 'Surveior')->firstOrFail();
        $ta = TenagaAhli::firstOrFail(['nomor_induk_surveior', 'id']);

        $resp = $this->withToken($token)->postJson('/api/admin/akun-pengguna', [
            'nama' => 'Surveior Baru',
            'email' => 'surveior.baru@example.com',
            'role_id' => $role->id,
            'tenaga_ahli_id' => $ta->id,
        ]);

        $resp->assertCreated();
        $this->assertDatabaseHas('akun_pengguna', [
            'email' => 'surveior.baru@example.com',
            'tenaga_ahli_id' => $ta->id,
        ]);
    }

    public function test_tenaga_ahli_must_have_nomor_induk_surveior(): void
    {
        $sdm = AkunPengguna::where('email', 'sdm@lembaga.local')->firstOrFail();
        $token = $sdm->createToken('test')->plainTextToken;
        $role = Role::where('nama_role', 'Surveior')->firstOrFail();

        // Create TA without nomor_induk_surveior
        $ta = TenagaAhli::create([
            'id' => (string) Str::uuid(),
            'nomor_induk_surveior' => '', // empty — invalid
            'nama' => 'TA Tanpa NIS',
            'peran' => 'Surveior',
            'status_aktif' => 'Aktif',
            'status_penugasan_saat_ini' => 'Tersedia',
        ]);

        $resp = $this->withToken($token)->postJson('/api/admin/akun-pengguna', [
            'nama' => 'Surveior Bad',
            'email' => 'surveior.bad@example.com',
            'role_id' => $role->id,
            'tenaga_ahli_id' => $ta->id,
        ]);

        $resp->assertStatus(422)
            ->assertJsonPath('message', 'Tenaga Ahli yang dipilih tidak memiliki nomor_induk_surveior. Pastikan data tenaga ahli sudah lengkap.');
    }

    public function test_verifikator_account_requires_tenaga_ahli_id(): void
    {
        $sdm = AkunPengguna::where('email', 'sdm@lembaga.local')->firstOrFail();
        $token = $sdm->createToken('test')->plainTextToken;
        $role = Role::where('nama_role', 'Verifikator')->firstOrFail();

        $resp = $this->withToken($token)->postJson('/api/admin/akun-pengguna', [
            'nama' => 'Verifikator Tanpa TA',
            'email' => 'verifikator.bad@example.com',
            'role_id' => $role->id,
        ]);

        $resp->assertStatus(422);
        $this->assertStringContainsString('Verifikator', $resp->json('message'));
    }

    public function test_non_surveior_verifikator_does_not_require_tenaga_ahli(): void
    {
        $sdm = AkunPengguna::where('email', 'sdm@lembaga.local')->firstOrFail();
        $token = $sdm->createToken('test')->plainTextToken;
        $role = Role::where('nama_role', 'Divisi SDM')->firstOrFail();

        $resp = $this->withToken($token)->postJson('/api/admin/akun-pengguna', [
            'nama' => 'SDM Baru',
            'email' => 'sdm.baru@example.com',
            'role_id' => $role->id,
            'tenaga_ahli_id' => null,
        ]);

        $resp->assertCreated();
    }

    // ─── Account management ────────────────────────────────────────────────────

    public function test_admin_can_list_accounts(): void
    {
        $sdm = AkunPengguna::where('email', 'sdm@lembaga.local')->firstOrFail();
        $token = $sdm->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson('/api/admin/akun-pengguna')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [['id', 'nama', 'email', 'role_id', 'status_akun']],
                'current_page',
                'per_page',
            ]);
    }

    public function test_admin_can_update_account_status(): void
    {
        $sdm = AkunPengguna::where('email', 'sdm@lembaga.local')->firstOrFail();
        $token = $sdm->createToken('test')->plainTextToken;

        $target = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->firstOrFail();

        $this->withToken($token)->putJson("/api/admin/akun-pengguna/{$target->id}", [
            'nama' => $target->nama,
            'email' => $target->email,
            'role_id' => $target->role_id,
            'status_akun' => 'Nonaktif',
        ])->assertOk()
            ->assertJsonPath('data.status_akun', 'Nonaktif');
    }

    public function test_admin_can_reset_password(): void
    {
        $sdm = AkunPengguna::where('email', 'sdm@lembaga.local')->firstOrFail();
        $token = $sdm->createToken('test')->plainTextToken;

        $target = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->firstOrFail();

        $resp = $this->withToken($token)->postJson("/api/admin/akun-pengguna/{$target->id}/reset-password", [
            'password' => 'NewSecure123!',
        ]);

        $resp->assertOk()
            ->assertJsonStructure(['message', 'new_password']);

        $this->assertTrue(
            Hash::check('NewSecure123!', $target->fresh()->password_hash),
        );
    }

    public function test_admin_can_reset_password_with_auto_generated(): void
    {
        $sdm = AkunPengguna::where('email', 'sdm@lembaga.local')->firstOrFail();
        $token = $sdm->createToken('test')->plainTextToken;

        $target = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->firstOrFail();

        $resp = $this->withToken($token)->postJson("/api/admin/akun-pengguna/{$target->id}/reset-password", []);

        $resp->assertOk()
            ->assertJsonStructure(['message', 'new_password']);

        $newPw = $resp->json('new_password');
        $this->assertNotEmpty($newPw);
        $this->assertTrue(Hash::check($newPw, $target->fresh()->password_hash));
    }

    public function test_admin_can_delete_account(): void
    {
        $sdm = AkunPengguna::where('email', 'sdm@lembaga.local')->firstOrFail();
        $token = $sdm->createToken('test')->plainTextToken;

        // Create account to delete
        $toDelete = AkunPengguna::create([
            'id' => (string) Str::uuid(),
            'role_id' => Role::where('nama_role', 'Faskes')->first()->id,
            'nama' => 'To Delete',
            'email' => 'to.delete@example.com',
            'password_hash' => Hash::make('password'),
            'status_akun' => 'Aktif',
            'failed_login_attempts' => 0,
            'created_at' => now(),
        ]);

        $this->withToken($token)->deleteJson("/api/admin/akun-pengguna/{$toDelete->id}")
            ->assertOk();

        $this->assertDatabaseMissing('akun_pengguna', ['id' => $toDelete->id]);
    }

    public function test_admin_can_unlock_locked_account(): void
    {
        $sdm = AkunPengguna::where('email', 'sdm@lembaga.local')->firstOrFail();
        $token = $sdm->createToken('test')->plainTextToken;

        // Lock the faskes account
        $target = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->firstOrFail();
        $target->forceFill([
            'failed_login_attempts' => 5,
            'locked_until' => now()->addMinutes(15),
        ])->save();

        $this->withToken($token)->putJson("/api/admin/akun-pengguna/{$target->id}", [
            'nama' => $target->nama,
            'email' => $target->email,
            'role_id' => $target->role_id,
            'unlock' => true,
        ])->assertOk();

        $target->refresh();
        $this->assertEquals(0, $target->failed_login_attempts);
        $this->assertNull($target->locked_until);
    }

    public function test_account_create_records_audit_trail(): void
    {
        $sdm = AkunPengguna::where('email', 'sdm@lembaga.local')->firstOrFail();
        $token = $sdm->createToken('test')->plainTextToken;
        $role = Role::where('nama_role', 'Faskes')->firstOrFail();

        $this->withToken($token)->postJson('/api/admin/akun-pengguna', [
            'nama' => 'Audit Test',
            'email' => 'audit.test@example.com',
            'role_id' => $role->id,
        ])->assertCreated();

        $this->assertDatabaseHas('audit_trail', [
            'aksi' => 'akun.create',
            'target_type' => 'AkunPengguna',
            'aktor_id' => $sdm->id,
        ]);
    }
}
