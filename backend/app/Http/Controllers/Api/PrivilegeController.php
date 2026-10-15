<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditTrail;
use App\Models\MenuAction;
use App\Models\Role;
use App\Models\RolePrivilege;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * FR-6.2, FR-6.3: Ubah matriks privilege per Role.
 * Endpoint ini menerima payload berisi daftar (menu_action_id, diizinkan)
 * dan melakukan replace total untuk role tertentu.
 */
class PrivilegeController extends Controller
{
    /**
     * GET /api/admin/privilege-matrix
     * Full matrix: semua modul+action, semua role, dan status diizinkan-nya.
     * Dipakai oleh halaman Matriks Privilege.
     */
    public function matrixAll(): JsonResponse
    {
        $roles = Role::orderBy('is_default', 'desc')
            ->orderBy('nama_role')
            ->get()
            ->map(fn (Role $r) => [
                'id' => $r->id,
                'nama_role' => $r->nama_role,
                'is_default' => $r->is_default,
            ]);

        $modules = MenuAction::orderBy('modul')
            ->orderBy('action')
            ->get()
            ->groupBy('modul')
            ->map(fn ($actions, $modul) => [
                'modul' => $modul,
                'actions' => $actions->map(fn ($a) => [
                    'id' => $a->id,
                    'action' => $a->action,
                ])->values()->all(),
            ])
            ->values()
            ->all();

        // Build privilege lookup: [role_id][menu_action_id] => diizinkan
        $privilegeMap = RolePrivilege::where('diizinkan', true)
            ->get(['role_id', 'menu_action_id'])
            ->groupBy('role_id')
            ->map(fn ($rows) => $rows->pluck('menu_action_id')->flip()->toArray())
            ->toArray();

        return response()->json([
            'roles' => $roles,
            'modules' => $modules,
            'privilege_map' => $privilegeMap,
        ]);
    }

    /**
     * GET /api/admin/roles/{role}/privileges
     * Privilege detail untuk satu role — dipakai oleh modal edit privilege.
     */
    public function matrix(Role $role): JsonResponse
    {
        $items = RolePrivilege::where('role_id', $role->id)
            ->with('menuAction')
            ->get();

        return response()->json([
            'role' => $role,
            'data' => $items,
        ]);
    }

    public function update(Request $request, Role $role, AuditService $audit): JsonResponse
    {
        $payload = $request->validate([
            'privileges' => 'required|array',
            'privileges.*.menu_action_id' => 'required|uuid',
            'privileges.*.diizinkan' => 'required|boolean',
        ]);

        $before = RolePrivilege::where('role_id', $role->id)
            ->get(['menu_action_id', 'diizinkan'])
            ->map(fn ($r) => ['menu_action_id' => $r->menu_action_id, 'diizinkan' => (bool) $r->diizinkan])
            ->values()
            ->all();

        $touched = [];
        foreach ($payload['privileges'] as $row) {
            $priv = RolePrivilege::updateOrCreate(
                [
                    'role_id' => $role->id,
                    'menu_action_id' => $row['menu_action_id'],
                ],
                ['diizinkan' => $row['diizinkan']],
            );
            $touched[] = $priv->id;
        }

        $after = RolePrivilege::where('role_id', $role->id)
            ->get(['menu_action_id', 'diizinkan'])
            ->map(fn ($r) => ['menu_action_id' => $r->menu_action_id, 'diizinkan' => (bool) $r->diizinkan])
            ->values()
            ->all();

        AuditTrail::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'aktor_id' => $request->user()?->id,
            'aksi' => 'privilege.update',
            'target_type' => 'Role',
            'target_id' => $role->id,
            'data_sebelum' => ['privileges' => $before],
            'data_sesudah' => ['privileges' => $after],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);

        return response()->json([
            'message' => 'Matriks privilege diperbarui.',
            'updated_count' => count($touched),
        ]);
    }
}