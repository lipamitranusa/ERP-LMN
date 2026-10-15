<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AkunPengguna;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    private const MAX_ATTEMPTS = 5;
    private const LOCK_MINUTES = 15;

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'login' => 'required|string',
            'password' => 'required|string',
        ]);

        $login = $data['login'];

        /** @var AkunPengguna|null $user */
        $user = AkunPengguna::where('email', $login)
            ->orWhere('username', $login)
            ->orWhereHas('tenagaAhli', fn ($q) => $q->where('nomor_induk_surveior', $login))
            ->first();

        // Account locked?
        if ($user && $user->isLocked()) {
            $remaining = now()->diffInMinutes($user->locked_until, false);
            throw ValidationException::withMessages([
                'login' => ["Akun terkunci sementara. Coba lagi dalam {$remaining} menit."],
            ]);
        }

        // Invalid credentials
        if (! $user || ! Hash::check($data['password'], $user->password_hash)) {
            if ($user) {
                $user->incrementFailedLoginAttempts(self::MAX_ATTEMPTS, self::LOCK_MINUTES);
            }
            throw ValidationException::withMessages([
                'login' => ['Kredensial tidak cocok.'],
            ]);
        }

        // Account inactive
        if (! $user->canLogin()) {
            throw ValidationException::withMessages([
                'login' => ['Akun nonaktif atau terkunci. Hubungi administrator.'],
            ]);
        }

        // Success — reset counters
        $user->resetFailedLoginAttempts();
        $user->forceFill(['last_login_at' => now()])->save();
        $token = $user->createToken('api')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $this->payload($user->load(['role', 'faskes.jenisFaskes'])),
            'menu_actions' => $this->menuActionsFor($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $token = $request->user()->currentAccessToken();
        if ($token) {
            $token->delete();
        }
        return response()->json(['message' => 'Logout berhasil.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $this->payload($request->user()->load(['role', 'faskes.jenisFaskes'])),
            'menu_actions' => $this->menuActionsFor($request->user()),
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'string', 'min:8', 'max:72', 'different:current_password'],
            'new_password_confirmation' => ['required', 'string', 'same:new_password'],
        ], [
            'new_password.different' => 'Password baru tidak boleh sama dengan password lama.',
            'new_password_confirmation.same' => 'Konfirmasi password baru tidak cocok.',
        ]);

        $user = $request->user();

        if (! Hash::check($data['current_password'], $user->password_hash)) {
            return response()->json([
                'message' => 'Password lama salah.',
            ], 422);
        }

        $user->forceFill([
            'password_hash' => Hash::make($data['new_password']),
        ])->save();

        // Invalidate all other tokens (force re-login on other devices)
        $user->currentAccessToken()?->delete();

        return response()->json(['message' => 'Password berhasil diubah. Silakan login ulang.']);
    }

    private function payload(AkunPengguna $user): array
    {
        $faskesData = null;
        if ($user->faskes) {
            $user->faskes->load('jenisFaskes:id,kode,nama');
            $faskesData = [
                'id' => $user->faskes->id,
                'nama' => $user->faskes->nama,
                'tipe_faskes' => $user->faskes->tipe_faskes,
                'jenis_faskes' => $user->faskes->jenisFaskes ? [
                    'id' => $user->faskes->jenisFaskes->id,
                    'kode' => $user->faskes->jenisFaskes->kode,
                    'nama' => $user->faskes->jenisFaskes->nama,
                ] : null,
            ];
        }

        return [
            'id' => $user->id,
            'nama' => $user->nama,
            'username' => $user->username,
            'email' => $user->email,
            'role' => $user->role?->nama_role,
            'faskes_id' => $user->faskes_id,
            'faskes' => $faskesData,
            'tenaga_ahli_id' => $user->tenaga_ahli_id,
            'tenaga_ahli_nik' => $user->tenagaAhli?->nomor_induk_surveior,
        ];
    }

    private function menuActionsFor(AkunPengguna $user): array
    {
        return $user->role?->privileges()
            ->where('diizinkan', true)
            ->with('menuAction')
            ->get()
            ->map(fn ($p) => [
                'modul' => $p->menuAction->modul,
                'action' => $p->menuAction->action,
            ])
            ->all() ?? [];
    }
}
