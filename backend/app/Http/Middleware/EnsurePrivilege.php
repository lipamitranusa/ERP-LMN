<?php

namespace App\Http\Middleware;

use App\Models\AkunPengguna;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * AC-10: Menolak request jika Role pengguna tidak memiliki privilege
 * untuk modul+action yang diminta route. Wajib ditegakkan di back-end.
 *
 * Pemakaian: ->middleware('privilege:Pendaftaran & Validasi Dokumen,Lihat')
 *
 * Untuk modul dengan spasi (&), panggil dari route sebagai:
 *   ->middleware('privilege:' . urlencode($modul) . ',Lihat')
 * atau pakai placeholder di route definition.
 */
class EnsurePrivilege
{
    public function handle(Request $request, Closure $next, string $modul, string $action): Response
    {
        /** @var AkunPengguna|null $user */
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Tidak terautentikasi.'], 401);
        }

        // Eager load role if missing
        if (! $user->relationLoaded('role')) {
            $user->load('role');
        }

        $hasPriv = $user->hasPrivilege($modul, $action);

        \Log::channel('single')->info('PRIV DEBUG', [
            'modul' => $modul,
            'action' => $action,
            'user_id' => $user->id,
            'user_email' => $user->email,
            'role_id' => $user->role_id,
            'role' => $user->role?->nama_role,
            'hasPriv' => $hasPriv,
        ]);

        if (! $hasPriv) {
            \Log::channel('single')->info('PRIV DENIED', ['user' => $user->email, 'modul' => $modul, 'action' => $action]);
            return response()->json([
                'message' => 'Anda tidak memiliki hak akses untuk aksi ini.',
                'modul' => $modul,
                'action' => $action,
            ], 403);
        }

        \Log::channel('single')->info('PRIV ALLOWED', ['user' => $user->email, 'modul' => $modul, 'action' => $action]);
        return $next($request);
    }
}
