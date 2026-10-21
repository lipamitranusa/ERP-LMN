<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AkunPengguna;
use App\Models\Faskes;
use App\Models\Lembaga;
use App\Models\TenagaAhli;
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
        //
        // PENTING: baca faskes/tenaga_ahli TANPA global scope 'lembaga'.
        // Global scope filter `WHERE lembaga_id = session('lembaga_id')` —
        // session bisa berisi nilai stale (dari login user lain di browser
        // yang sama, atau request sebelumnya) yang tidak relevan dengan
        // faskes user ini. Tanpa bypass, $user->faskes bisa null padahal
        // faskes-nya ada di lembaga lain, lalu defaultLembagaId salah,
        // lalu canAccessLembaga salah menolak login.
        $user->setRelation('faskes',
            $user->faskes_id
                ? Faskes::withoutGlobalScopes()->find($user->faskes_id)
                : null
        );
        $user->setRelation('tenagaAhli',
            $user->tenaga_ahli_id
                ? TenagaAhli::withoutGlobalScopes()->find($user->tenaga_ahli_id)
                : null
        );
        $defaultLembagaId = $user->faskes?->lembaga_id
            ?? $user->tenagaAhli?->lembaga_id
            ?? $user->lembaga_id;

        // Jika client mengirim lembaga_id (last selected dari localStorage),
        // gunakan itu — user akan kembali ke lembaga yang terakhir dipilih
        $requestedLembagaId = $data['lembaga_id'] ?? null;

        // Untuk user Faskes/Surveior/Verifikator (punya faskes/TA), lembaga
        // SELALU dipaksa ke lembaga kanonik master mereka. Abaikan request
        // lembaga_id yang tidak cocok — biasanya ini localStorage stale dari
        // user lain / browser yang dipakai bergantian, bukan serangan.
        // Behavior ini konsisten dengan SetLembagaSession middleware yang
        // memaksa lembaga user Faskes di setiap request non-login.
        $hasFixedLembaga = (bool) ($user->faskes_id || $user->tenaga_ahli_id);
        if ($hasFixedLembaga && $defaultLembagaId !== null) {
            $lembagaId = $defaultLembagaId;
        } else {
            $lembagaId = $requestedLembagaId ?: $defaultLembagaId;
            // Validasi bahwa user berhak akses lembaga yang diminta
            // (saat ini semua user bisa akses semua lembaga yang ada; batasi jika perlu)
            if ($lembagaId && ! $this->canAccessLembaga($user, $lembagaId)) {
                throw ValidationException::withMessages(['lembaga_id' => ['Anda tidak memiliki akses ke lembaga yang dipilih.']]);
            }
        }
        session(['lembaga_id' => $lembagaId]);

        $lembaga = $lembagaId ? Lembaga::find($lembagaId) : null;

        return response()->json([
            'token' => $token,
            'user' => $this->payload($user->load(['role', 'faskes.jenisFaskes'])),
            'lembaga_id' => $lembagaId,
            'lembaga_nama' => $lembaga?->nama,
            'lembaga_logo_url' => $lembaga?->logo_url,
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

        if (! $this->canAccessLembaga($request->user(), $data['lembaga_id'])) {
            return response()->json(['message' => 'Anda tidak memiliki akses ke lembaga yang dipilih.'], 403);
        }
        session(['lembaga_id' => $data['lembaga_id']]);

        $user = $request->user()->load(['role', 'faskes.jenisFaskes']);
        $lembaga = Lembaga::find($data['lembaga_id']);
        return response()->json([
            'user' => $this->payload($user),
            'lembaga_id' => $data['lembaga_id'],
            'lembaga_nama' => $lembaga?->nama,
            'lembaga_logo_url' => $lembaga?->logo_url,
            'menu_actions' => $this->menuActionsFor($user),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        // Load faskes & tenaga_ahli langsung tanpa global scope — user
        // berhak lihat profilnya sendiri meskipun session lembaga berbeda
        // dari lembaga faskes/TA-nya.
        if ($user->faskes_id) {
            $faskesModel = Faskes::withoutGlobalScopes()->find($user->faskes_id);
            if ($faskesModel) {
                $faskesModel->load(['jenisFaskes' => fn($q) => $q->withoutGlobalScopes()]);
                $user->setRelation('faskes', $faskesModel);
            }
        }
        if ($user->tenaga_ahli_id) {
            $taModel = TenagaAhli::withoutGlobalScopes()->find($user->tenaga_ahli_id);
            if ($taModel) {
                $user->setRelation('tenagaAhli', $taModel);
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
        if (is_string($requestedLembagaId) && $this->canAccessLembaga($user, $requestedLembagaId)) {
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

    private function canAccessLembaga(AkunPengguna $user, string $lembagaId): bool
    {
        // Bypass global scope 'lembaga' saat membaca faskes/tenaga_ahli.
        // Alasan sama dengan yang di login(): session('lembaga_id') bisa
        // berisi nilai stale dari request lain, sehingga query ter-filter
        // dan faskes/TA jadi null padahal sebenarnya ada.
        if ($user->faskes_id) {
            $faskes = Faskes::withoutGlobalScopes()->find($user->faskes_id);
            if ($faskes && $faskes->lembaga_id === $lembagaId) {
                return true;
            }
        }
        if ($user->tenaga_ahli_id) {
            $ta = TenagaAhli::withoutGlobalScopes()->find($user->tenaga_ahli_id);
            if ($ta && $ta->lembaga_id === $lembagaId) {
                return true;
            }
        }
        // User terikat ke faskes/TA tapi lembaga tidak cocok → tolak.
        // (Tanpa baris ini, user Faskes akan jatuh ke branch Admin di bawah
        // dan bisa saja lolos kalau user.lembaga_id kebetulan cocok.)
        if ($user->faskes_id || $user->tenaga_ahli_id) {
            return false;
        }
        // Admin Lembaga / Superadmin tanpa faskes/TA: boleh akses jika
        // role Administrator, user.lembaga_id cocok, atau ada di pivot.
        return $user->role?->nama_role === 'Administrator'
            || $user->lembaga_id === $lembagaId
            || $user->lembagas()->whereKey($lembagaId)->exists();
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
