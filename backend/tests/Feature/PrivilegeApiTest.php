<?php

namespace Tests\Feature;

use App\Models\AkunPengguna;
use App\Models\AuditTrail;
use App\Models\MenuAction;
use App\Models\Role;
use App\Models\RolePrivilege;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PrivilegeApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    // ─── AC-10: Role tanpa privilege DITOLAK di level API ─────────────────────

    public function test_role_without_privilege_is_denied_at_api_level(): void
    {
        // Faskes role → tidak punya akses ke Pengaturan Hak Akses
        $faskes = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->firstOrFail();

        // GET roles → 403
        $this->actingAs($faskes, 'sanctum')
            ->getJson('/api/admin/roles')
            ->assertStatus(403)
            ->assertJsonPath('modul', 'Pengaturan Hak Akses')
            ->assertJsonPath('action', 'Lihat');

        // GET dashboard (Dasbor Eksekutif) → 403
        $this->actingAs($faskes, 'sanctum')
            ->getJson('/api/dashboard')
            ->assertStatus(403)
            ->assertJsonPath('modul', 'Dasbor Eksekutif');
    }

    public function test_unauthenticated_request_is_rejected_with_401(): void
    {
        $this->getJson('/api/admin/roles')->assertStatus(401);
        $this->postJson('/api/admin/roles', ['nama_role' => 'Test'])->assertStatus(401);
    }

    public function test_surveior_can_access_own_module_but_not_others(): void
    {
        $surveior = AkunPengguna::where('email', 'ns-0001@surveyor.local')->firstOrFail();

        // Penugasan → 200
        $this->actingAs($surveior, 'sanctum')
            ->getJson('/api/penugasan-list')
            ->assertOk()
            ->assertJsonPath('modul', 'Penugasan');

        // Dasbor Eksekutif → 403
        $this->actingAs($surveior, 'sanctum')
            ->getJson('/api/dashboard')
            ->assertStatus(403)
            ->assertJsonPath('modul', 'Dasbor Eksekutif');
    }

    public function test_faskes_can_access_own_module(): void
    {
        $faskes = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->firstOrFail();

        $this->actingAs($faskes, 'sanctum')
            ->getJson('/api/faskes-list')
            ->assertOk();
    }

    public function test_admin_can_list_roles_and_view_privilege_matrix(): void
    {
        $admin = AkunPengguna::where('email', 'admin@erp.local')->firstOrFail();

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/roles')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'nama_role', 'is_default']]]);

        $role = Role::where('nama_role', 'Admin Lembaga')->firstOrFail();
        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/roles/{$role->id}/privileges")
            ->assertOk()
            ->assertJsonStructure(['role', 'data' => [['id', 'menu_action_id', 'diizinkan']]]);
    }

    // ─── CRUD Role (FR-6.2, FR-6.3) ───────────────────────────────────────────

    public function test_admin_can_create_custom_role(): void
    {
        $admin = AkunPengguna::where('email', 'admin@erp.local')->firstOrFail();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/roles', [
                'nama_role' => 'Custom Auditor',
                'is_default' => false,
            ])
            ->assertCreated()
            ->assertJsonPath('data.nama_role', 'Custom Auditor')
            ->assertJsonPath('data.is_default', false);

        $this->assertDatabaseHas('roles', ['nama_role' => 'Custom Auditor']);
    }

    public function test_admin_cannot_create_duplicate_role_name(): void
    {
        $admin = AkunPengguna::where('email', 'admin@erp.local')->firstOrFail();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/roles', ['nama_role' => 'Faskes'])
            ->assertStatus(422);
    }

    public function test_admin_can_update_role(): void
    {
        $admin = AkunPengguna::where('email', 'admin@erp.local')->firstOrFail();
        $role = Role::where('nama_role', 'Divisi SDM')->firstOrFail();

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/roles/{$role->id}", ['nama_role' => 'Divisi SDM Updated'])
            ->assertOk()
            ->assertJsonPath('data.nama_role', 'Divisi SDM Updated');
    }

    public function test_admin_can_delete_non_default_role(): void
    {
        $admin = AkunPengguna::where('email', 'admin@erp.local')->firstOrFail();

        // Buat role kustom dulu
        $customRole = Role::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'nama_role' => 'Role Deletable',
            'is_default' => false,
        ]);

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/admin/roles/{$customRole->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Role dihapus.');

        $this->assertDatabaseMissing('roles', ['id' => $customRole->id]);
    }

    public function test_cannot_delete_role_with_assigned_users(): void
    {
        $admin = AkunPengguna::where('email', 'admin@erp.local')->firstOrFail();
        $role = Role::where('nama_role', 'Faskes')->firstOrFail();

        // Faskes user exists → deletion should be blocked with 422
        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/admin/roles/{$role->id}")
            ->assertStatus(422)
            ->assertJsonPath('message', 'Role tidak dapat dihapus karena masih memiliki akun pengguna yang terikat.');
    }

    // ─── Audit Trail untuk perubahan privilege (FR-6.5, NFR-2) ─────────────────

    public function test_privilege_change_creates_audit_trail(): void
    {
        $admin = AkunPengguna::where('email', 'admin@erp.local')->firstOrFail();
        $faskesRole = Role::where('nama_role', 'Faskes')->firstOrFail();
        $menu = MenuAction::where('modul', 'Kontrak & Invoicing')
            ->where('action', 'Lihat')
            ->firstOrFail();

        // Pastikan Faskes awalnya punya privilege
        $this->assertTrue(
            RolePrivilege::where('role_id', $faskesRole->id)
                ->where('menu_action_id', $menu->id)
                ->where('diizinkan', true)
                ->exists(),
        );

        // Ubah privilege
        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/roles/{$faskesRole->id}/privileges", [
                'privileges' => [
                    ['menu_action_id' => $menu->id, 'dizheimer' => false],
                ],
            ]);

        // Perbaikan: gunakan payload yang benar
        $resp = $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/roles/{$faskesRole->id}/privileges", [
                'privileges' => [
                    ['menu_action_id' => $menu->id, 'diizinkan' => false],
                ],
            ]);

        $resp->assertOk()
            ->assertJsonPath('message', 'Matriks privilege diperbarui.');

        // Audit trail tercatat
        $audit = AuditTrail::where('aksi', 'privilege.update')
            ->where('target_type', 'Role')
            ->where('target_id', $faskesRole->id)
            ->latest('created_at')
            ->first();

        $this->assertNotNull($audit, 'Audit trail entry for privilege.update should exist');
        $this->assertEquals($admin->id, $audit->aktor_id);
        $this->assertNotNull($audit->data_sebelum);
        $this->assertNotNull($audit->data_sesudah);
        $this->assertEquals('privilege.update', $audit->aksi);
        $this->assertEquals('Role', $audit->target_type);

        // Faskes kehilangan privilege setelah perubahan
        $this->assertFalse(
            RolePrivilege::where('role_id', $faskesRole->id)
                ->where('menu_action_id', $menu->id)
                ->where('diizinkan', true)
                ->exists(),
        );
    }

    public function test_audit_trail_records_aktor_id_and_target_type(): void
    {
        $admin = AkunPengguna::where('email', 'admin@erp.local')->firstOrFail();
        $verifikatorRole = Role::where('nama_role', 'Verifikator')->firstOrFail();
        $menuTambah = MenuAction::where('modul', 'Verifikasi')->where('action', 'Tambah')->firstOrFail();

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/roles/{$verifikatorRole->id}/privileges", [
                'privileges' => [
                    ['menu_action_id' => $menuTambah->id, 'diizinkan' => true],
                ],
            ])
            ->assertOk();

        $audit = AuditTrail::where('aksi', 'privilege.update')
            ->where('target_id', $verifikatorRole->id)
            ->latest('created_at')
            ->firstOrFail();

        $this->assertEquals($admin->id, $audit->aktor_id);
        $this->assertEquals('Role', $audit->target_type);
        $this->assertIsArray($audit->data_sebelum);
        $this->assertIsArray($audit->data_sesudah);
    }

    public function test_role_create_creates_audit_trail(): void
    {
        $admin = AkunPengguna::where('email', 'admin@erp.local')->firstOrFail();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/roles', [
                'nama_role' => 'Custom Role Test',
                'is_default' => false,
            ])
            ->assertCreated();

        $audit = AuditTrail::where('aksi', 'role.create')
            ->latest('created_at')
            ->firstOrFail();

        $this->assertEquals('Role', $audit->target_type);
        $this->assertEquals($admin->id, $audit->aktor_id);
        $this->assertNotEmpty($audit->data_sesudah);
        $this->assertEquals('Custom Role Test', $audit->data_sesudah['nama_role'] ?? null);
    }

    public function test_role_delete_creates_audit_trail(): void
    {
        $admin = AkunPengguna::where('email', 'admin@erp.local')->firstOrFail();

        // Buat role kustom dulu (tanpa akun terkait)
        $customRole = Role::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'nama_role' => 'Role To Delete',
            'is_default' => false,
        ]);

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/admin/roles/{$customRole->id}")
            ->assertOk();

        $audit = AuditTrail::where('aksi', 'role.delete')
            ->latest('created_at')
            ->firstOrFail();

        $this->assertEquals('Role', $audit->target_type);
        $this->assertEquals($admin->id, $audit->aktor_id);
        $this->assertNotEmpty($audit->data_sebelum);
    }

    public function test_privilege_change_affects_api_access_immediately(): void
    {
        $admin = AkunPengguna::where('email', 'admin@erp.local')->firstOrFail();
        $faskes = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->firstOrFail();
        $faskesRole = Role::where('nama_role', 'Faskes')->firstOrFail();

        // Faskes awalnya bisa akses modul Pendaftaran
        $this->actingAs($faskes, 'sanctum')
            ->getJson('/api/faskes-list')
            ->assertOk();

        // Admin cabut privilege Lihat dari modul Pendaftaran
        $menu = MenuAction::where('modul', 'Pendaftaran & Validasi Dokumen')
            ->where('action', 'Lihat')
            ->firstOrFail();

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/roles/{$faskesRole->id}/privileges", [
                'privileges' => [
                    ['menu_action_id' => $menu->id, 'diizinkan' => false],
                ],
            ])
            ->assertOk();

        // Sekarang Faskes tidak bisa akses → 403
        $this->actingAs($faskes, 'sanctum')
            ->getJson('/api/faskes-list')
            ->assertStatus(403)
            ->assertJsonPath('modul', 'Pendaftaran & Validasi Dokumen')
            ->assertJsonPath('action', 'Lihat');
    }

    public function test_audit_trail_endpoint_requires_privilege(): void
    {
        $faskes = AkunPengguna::where('email', 'klinik-sejahtera@faskes.local')->firstOrFail();

        $this->actingAs($faskes, 'sanctum')
            ->getJson('/api/admin/audit-trail')
            ->assertStatus(403);
    }

    public function test_audit_trail_endpoint_returns_paginated_results(): void
    {
        $admin = AkunPengguna::where('email', 'admin@erp.local')->firstOrFail();

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/audit-trail')
            ->assertOk()
            ->assertJsonStructure([
                'data',
                'current_page',
                'per_page',
            ]);
    }

    public function test_menu_actions_endpoint_returns_all_modules_and_actions(): void
    {
        $admin = AkunPengguna::where('email', 'admin@erp.local')->firstOrFail();

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/menu-actions')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'modul', 'action']]]);

        // 9 modules x 7 actions = 63 entries
        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/menu-actions')
            ->assertOk()
            ->assertJsonCount(63, 'data');
    }

    public function test_privilege_matrix_shows_entire_role_privileges(): void
    {
        $admin = AkunPengguna::where('email', 'admin@erp.local')->firstOrFail();
        $direkturRole = Role::where('nama_role', 'Direktur/Keuangan')->firstOrFail();

        $resp = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/roles/{$direkturRole->id}/privileges")
            ->assertOk();

        $data = $resp->json('data');

        // Director has Ledger/Keuangan access → should have entries
        $ledgerEntries = array_filter($data, fn($item) =>
            str_contains($item['menu_action']['modul'] ?? '', 'Ledger')
        );
        $this->assertNotEmpty($ledgerEntries);
    }

    public function test_role_without_privilege_on_dashboard_is_rejected(): void
    {
        $direktur = AkunPengguna::where('email', 'direktur@lembaga.local')->firstOrFail();

        // Direksi punya akses Dasbor Eksekutif → 200
        $this->actingAs($direktur, 'sanctum')
            ->getJson('/api/dashboard')
            ->assertOk();

        // Nonaktifkan privilege Dasbor Eksekutif untuk Direksi
        $admin = AkunPengguna::where('email', 'admin@erp.local')->firstOrFail();
        $direkturRole = Role::where('nama_role', 'Direktur/Keuangan')->first();
        if (! $direkturRole) {
            $direkturRole = Role::where('nama_role', 'Direktur/Keuangan')->first();
        }
        $menu = MenuAction::where('modul', 'Dasbor Eksekutif')->where('action', 'Lihat')->first();

        if ($direkturRole && $menu) {
            RolePrivilege::where('role_id', $direkturRole->id)
                ->where('menu_action_id', $menu->id)
                ->update(['diizinkan' => false]);

            // Sekarang harus ditolak
            $this->actingAs($direktur, 'sanctum')
                ->getJson('/api/dashboard')
                ->assertStatus(403);
        }
    }

    public function test_creating_role_with_is_default_true(): void
    {
        $admin = AkunPengguna::where('email', 'admin@erp.local')->firstOrFail();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/roles', [
                'nama_role' => 'Auditor Eksternal',
                'is_default' => true,
            ])
            ->assertCreated()
            ->assertJsonPath('data.is_default', true);
    }

    public function test_menu_actions_are_listed_by_module_and_action(): void
    {
        $admin = AkunPengguna::where('email', 'admin@erp.local')->firstOrFail();

        $resp = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/menu-actions')
            ->assertOk();

        $data = $resp->json('data');

        // Verify first entry has required fields
        $this->assertArrayHasKey('id', $data[0]);
        $this->assertArrayHasKey('modul', $data[0]);
        $this->assertArrayHasKey('action', $data[0]);
    }
}
