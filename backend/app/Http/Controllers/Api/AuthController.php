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
            'lembaga_id' => 'nullable|uuid|exists:lembaga,id',
        ]);

        $login = $data['login'];

        /** @var AkunPengguna|null $user */
        $user = AkunPengguna::whereRaw('LOWER(email) = LOWER(?)', [$login])
            ->orWhereRaw('LOWER(username) = LOWER(?)', [$login])
            ->orWhereHas('tenagaAhli', fn ($q) => $q->whereRaw('LOWER(nomor_induk_surveior) = LOWER(?)', [$login]))
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

        // Resolve lembaga_id default dari user.
        //
        // PRIORITAS: faskes → tenaga_ahli → user.lembaga_id
        //
        // Alasan: untuk user yang terkait dengan faskes (Faskes) atau
        // tenaga_ahli (Surveior/Verifikator), lembaga seharusnya mengikuti
        // relasi faskes/tenaga_ahli, bukan user.lembaga_id. user.lembaga_id
        // adalah untuk Admin Lembaga / Superadmin yang tidak punya faskes/TA.
        //
        // Dengan prioritas ini, data inconsistency (user.lembaga_id ter-set ke
        // lembaga yang salah untuk Faskes/Surveior user) tidak lagi membuat
        // session lembaga salah.
        $defaultLembagaId = $user->faskes?->lembaga_id
            ?? $user->tenagaAhli?->lembaga_id
            ?? $user->lembaga_id;

        // Jika client mengirim lembaga_id (last selected dari localStorage),
        // gunakan itu — user akan kembali ke lembaga yang terakhir dipilih
        $requestedLembagaId = $data['lembaga_id'] ?? null;

        // Validasi bahwa user berhak akses lembaga yang diminta
        // (saat ini semua user bisa akses semua lembaga yang ada; batasi jika perlu)
        $lembagaId = $requestedLembagaId ?: $defaultLembagaId;
        session(['lembaga_id' => $lembagaId]);

        return response()->json([
            'token' => $token,
            'user' => $this->payload($user->load(['role', 'faskes.jenisFaskes'])),
            'lembaga_id' => $lembagaId,
            'menu_actions' => $this->menuActionsFor($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $token = $request->user()->currentAccessToken();
        if ($token) {
            $token->delete();
        }
        // Clear lembaga session
        session()->forget('lembaga_id');
        return response()->json(['message' => 'Logout berhasil.']);
    }

    public function switchLembaga(Request $request): JsonResponse
    {
        $data = $request->validate([
            'lembaga_id' => 'required|uuid|exists:lembaga,id',
        ]);

        session(['lembaga_id' => $data['lembaga_id']]);

        $user = $request->user()->load(['role', 'faskes.jenisFaskes']);
        return response()->json([
            'user' => $this->payload($user),
            'lembaga_id' => $data['lembaga_id'],
            'menu_actions' => $this->menuActionsFor($user),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        // Load faskes langsung tanpa global scope — user berhak lihat profilnya sendiri
        // meskipun session lembaga berbeda dari lembaga faskes
        if ($user->faskes_id) {
            // Bypass global scope karena session lembaga bisa berbeda dari lembaga faskes user
            $faskesModel = \App\Models\Faskes::withoutGlobalScope('lembaga')
                ->find($user->faskes_id);
            if ($faskesModel) {
                // Load jenisFaskes juga tanpa global scope
                $faskesModel->load(['jenisFaskes' => fn($q) => $q->withoutGlobalScope('lembaga')]);
                $user->setRelation('faskes', $faskesModel);
            }
        }
        $user->load('role');

        // Resolve lembaga_id sumber kebenaran:
        //   1. Lembaga_id dari request (sinkron dengan localStorage frontend) — prioritas
        //      tertinggi agar session selalu match pilihan user di UI
        //   2. Session lembaga_id (jika sudah di-set oleh login/switchLembaga)
        //   3. Default user (faskes/tenaga_ahli/user.lembaga_id) — fallback
        //
        // Alasan: sebelum fix middleware, session sering override ke default user sehingga
        // localStorage & session tidak sinkron. Update session dari request me() adalah
        // self-heal: setiap kali frontend mount, session mengikuti localStorage.
        $requestedLembagaId = $request->query('lembaga_id') ?? $request->header('X-Lembaga-Id');
        if (is_string($requestedLembagaId) && \App\Models\Lembaga::where('id', $requestedLembagaId)->exists()) {
            session(['lembaga_id' => $requestedLembagaId]);
            $lembagaId = $requestedLembagaId;
        } else {
            // Prioritas: faskes → tenaga_ahli → user.lembaga_id.
            // Lihat AuthController::login untuk rationale.
            $lembagaId = session('lembaga_id')
                ?? $user->faskes?->lembaga_id
                ?? $user->tenagaAhli?->lembaga_id
                ?? $user->lembaga_id;
        }

        return response()->json([
            'user' => $this->payload($user),
            'lembaga_id' => $lembagaId,
            'menu_actions' => $this->menuActionsFor($user),
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
            // Load jenisFaskes tanpa global scope (sudah di-bypass di me() tapi tetap aman)
            $user->faskes->load(['jenisFaskes' => fn($q) => $q->withoutGlobalScope('lembaga')]);
            $faskesData = [
                'id' => $user->faskes->id,
                'nama' => $user->faskes->nama,
                'tipe_faskes' => $user->faskes->tipe_faskes,
                'lembaga_id' => $user->faskes->lembaga_id,
                'jenis_faskes' => $user->faskes->jenisFaskes ? [
                    'id' => $user->faskes->jenisFaskes->id,
                    'kode' => $user->faskes->jenisFaskes->kode,
                    'nama' => $user->faskes->jenisFaskes->nama,
                    'lembaga_id' => $user->faskes->jenisFaskes->lembaga_id,
                ] : null,
            ];
        }

        $lembagaId = $user->lembaga_id
            ?? $user->faskes?->lembaga_id
            ?? $user->tenagaAhli?->lembaga_id;

        // Load lembaga akses (multi-lembaga via pivot). tanpa scope agar
        // bisa lihat lembaga yang sedang di-look up meski session berbeda
        if (! $user->relationLoaded('lembagas')) {
            $user->load(['lembagas' => fn($q) => $q->withoutGlobalScope('lembaga')]);
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
            'lembaga_id' => $lembagaId,
            // Daftar lembaga yang user punya akses (multi-lembaga via pivot).
            // Frontend pakai ini untuk filter dropdown switcher.
            'lembaga_ids' => $user->lembagas->pluck('id')->all(),
            'lembagas' => $user->lembagas->map(fn ($l) => [
                'id' => $l->id,
                'nama' => $l->nama,
            ])->all(),
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
