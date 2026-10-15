<?php

namespace Tests\Unit;

use App\Models\MenuAction;
use App\Models\Role;
use App\Models\RolePrivilege;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RolePrivilegeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_faskes_role_has_pendaftaran_view_privilege(): void
    {
        $role = Role::where('nama_role', 'Faskes')->firstOrFail();
        $this->assertTrue($role->hasPrivilege('Pendaftaran & Validasi Dokumen', 'Lihat'));
    }

    public function test_faskes_role_does_not_have_dasbor_eksekutif_privilege(): void
    {
        $role = Role::where('nama_role', 'Faskes')->firstOrFail();
        $this->assertFalse($role->hasPrivilege('Dasbor Eksekutif', 'Lihat'));
    }

    public function test_surveior_role_has_penugasan_edit_privilege(): void
    {
        $role = Role::where('nama_role', 'Surveior')->firstOrFail();
        $this->assertTrue($role->hasPrivilege('Penugasan', 'Ubah'));
    }

    public function test_surveior_role_does_not_have_penugasan_create_privilege(): void
    {
        $role = Role::where('nama_role', 'Surveior')->firstOrFail();
        $this->assertFalse($role->hasPrivilege('Penugasan', 'Tambah'));
    }

    public function test_direktur_role_has_ledger_access(): void
    {
        $role = Role::where('nama_role', 'Direktur/Keuangan')->first();
        $this->assertNotNull($role, 'Direktur/Keuangan role should exist after seeding');
        $this->assertTrue($role->hasPrivilege('Ledger/Keuangan', 'Lihat'));
        $this->assertTrue($role->hasPrivilege('Ledger/Keuangan', 'Ekspor'));
    }

    public function test_admin_role_has_all_privilege_module_access(): void
    {
        $role = Role::where('nama_role', 'Admin Lembaga')->firstOrFail();

        $modules = [
            'Pendaftaran & Validasi Dokumen',
            'Kontrak & Invoicing',
            'Penugasan',
            'SDM & Siklus Penugasan',
        ];

        foreach ($modules as $modul) {
            $this->assertTrue(
                $role->hasPrivilege($modul, 'Lihat'),
                "Admin should have Lihat on {$modul}",
            );
        }
    }

    public function test_role_privilege_relationship_loaded_correctly(): void
    {
        $role = Role::where('nama_role', 'Verifikator')->firstOrFail();
        $privileges = $role->privileges()->with('menuAction')->get();

        $this->assertGreaterThan(0, $privileges->count());
        $verifikasiPrivs = $privileges->filter(fn($p) =>
            ($p->menuAction->modul ?? '') === 'Verifikasi'
        );
        $this->assertGreaterThan(0, $verifikasiPrivs->count());
    }

    public function test_default_roles_are_seeded(): void
    {
        $expectedRoles = [
            'Faskes',
            'Admin Lembaga',
            'Surveior',
            'Verifikator',
            'Divisi SDM',
            'Direktur/Keuangan',
        ];

        $count = 0;
        foreach ($expectedRoles as $nama) {
            $role = Role::where('nama_role', $nama)->first();
            $this->assertNotNull($role, "Role {$nama} should exist after seeding");
            $this->assertTrue($role->is_default, "Role {$nama} should be default");
            $count++;
        }
        $this->assertEquals(count($expectedRoles), $count);
    }

    public function test_menu_actions_count_is_56(): void
    {
        // 9 modules x 7 actions = 63
        $count = MenuAction::count();
        $this->assertEquals(63, $count);
    }

    public function test_role_privilege_can_be_created_via_relationship(): void
    {
        $role = Role::where('nama_role', 'Divisi SDM')->firstOrFail();
        $menu = MenuAction::where('modul', 'Ledger/Keuangan')
            ->where('action', 'Lihat')
            ->firstOrFail();

        RolePrivilege::create([
            'role_id' => $role->id,
            'menu_action_id' => $menu->id,
            'diizinkan' => true,
        ]);

        $this->assertTrue($role->fresh()->hasPrivilege('Ledger/Keuangan', 'Lihat'));
    }
}
