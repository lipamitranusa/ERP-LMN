<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class RoleController extends Controller
{
    public function index(): JsonResponse
    {
        $roles = Role::with(['privileges' => fn ($q) => $q->where('diizinkan', true), 'privileges.menuAction'])
            ->orderBy('is_default', 'desc')
            ->orderBy('nama_role')
            ->get()
            ->map(fn (Role $role) => [
                'id' => $role->id,
                'nama_role' => $role->nama_role,
                'is_default' => $role->is_default,
                'guard_name' => 'web',
                'privileges' => $role->privileges
                    ->map(fn ($p) => optional($p->menuAction)->modul . '/' . optional($p->menuAction)->action)
                    ->filter()
                    ->values(),
            ]);

        return response()->json(['data' => $roles]);
    }

    public function store(Request $request, AuditService $audit): JsonResponse
    {
        $data = $request->validate([
            'nama_role' => 'required|string|max:100|unique:roles,nama_role',
            'is_default' => 'sometimes|boolean',
        ]);

        $role = Role::create([
            'id' => (string) Str::uuid(),
            'nama_role' => $data['nama_role'],
            'is_default' => $data['is_default'] ?? false,
        ]);

        $audit->record('role.create', null, $role, 'Role', $role->id);
        return response()->json(['data' => $role], 201);
    }

    public function show(Role $role): JsonResponse
    {
        return response()->json(['data' => $role]);
    }

    public function update(Request $request, Role $role, AuditService $audit): JsonResponse
    {
        $data = $request->validate([
            'nama_role' => "required|string|max:100|unique:roles,nama_role,{$role->id}",
            'is_default' => 'sometimes|boolean',
        ]);

        $before = $role->replicate();
        $role->update($data);
        $audit->record('role.update', $before, $role->fresh(), 'Role', $role->id);

        return response()->json(['data' => $role]);
    }

    public function destroy(Role $role, AuditService $audit): JsonResponse
    {
        // Prevent deletion of role with assigned users
        if ($role->accounts()->exists()) {
            return response()->json([
                'message' => 'Role tidak dapat dihapus karena masih memiliki akun pengguna yang terikat.',
            ], 422);
        }

        $before = $role->replicate();
        $role->delete();
        $audit->record('role.delete', $before, null, 'Role', $role->id);
        return response()->json(['message' => 'Role dihapus.']);
    }
}