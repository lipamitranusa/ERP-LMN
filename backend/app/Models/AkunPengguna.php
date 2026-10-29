<?php

namespace App\Models;

use App\Traits\BelongsToLembaga;
use Illuminate\Contracts\Auth\Authenticatable as AuthenticatableContract;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Auth\Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class AkunPengguna extends Model implements AuthenticatableContract
{
    use Authenticatable, HasApiTokens, HasFactory, HasUuids, Notifiable, BelongsToLembaga;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $table = 'akun_pengguna';

    public $timestamps = false;

    protected $fillable = [
        'role_id',
        'faskes_id',
        'tenaga_ahli_id',
        'nama',
        'username',
        'email',
        'password_hash',
        'status_akun',
        'failed_login_attempts',
        'locked_until',
        'last_login_at',
        'lembaga_id',
    ];

    protected $hidden = [
        'password_hash',
    ];

    protected $casts = [
        'last_login_at' => 'datetime',
        'locked_until' => 'datetime',
        'failed_login_attempts' => 'integer',
    ];

    public function getAuthPassword(): string
    {
        return $this->password_hash;
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_id');
    }

    public function faskes(): BelongsTo
    {
        return $this->belongsTo(Faskes::class, 'faskes_id');
    }

    public function tenagaAhli(): BelongsTo
    {
        return $this->belongsTo(TenagaAhli::class, 'tenaga_ahli_id');
    }

    /**
     * Many-to-many: daftar lembaga yang menjadi scope user ini.
     * User multi-lembaga bisa berada di beberapa lembaga sekaligus.
     * Source of truth untuk scope per-lembaga.
     */
    public function lembagas(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(Lembaga::class, 'akun_pengguna_lembaga', 'akun_pengguna_id', 'lembaga_id')
            ->withTimestamps();
    }

    public function siklusAkreditasi(): HasMany
    {
        return $this->hasMany(SiklusAkreditasi::class, 'divalidasi_oleh');
    }

    public function hasPrivilege(string $modul, string $action): bool
    {
        return $this->role?->hasPrivilege($modul, $action) ?? false;
    }

    public function isLocked(): bool
    {
        return $this->locked_until !== null && $this->locked_until->isFuture();
    }

    public function resetFailedLoginAttempts(): void
    {
        $this->forceFill([
            'failed_login_attempts' => 0,
            'locked_until' => null,
        ])->save();
    }

    public function incrementFailedLoginAttempts(int $maxAttempts = 5, int $lockMinutes = 15): void
    {
        $attempts = $this->failed_login_attempts + 1;
        if ($attempts >= $maxAttempts) {
            $this->forceFill([
                'failed_login_attempts' => $attempts,
                'locked_until' => now()->addMinutes($lockMinutes),
            ])->save();
        } else {
            $this->forceFill(['failed_login_attempts' => $attempts])->save();
        }
    }

    /**
     * Apakah akun ini milik lembaga tertentu — lewat default `lembaga_id`
     * atau lewat pivot multi-lembaga.
     */
    public function belongsToLembaga(?string $lembagaId): bool
    {
        if ($lembagaId === null) {
            return true;
        }
        if ($this->lembaga_id === $lembagaId) {
            return true;
        }
        return $this->lembagas()->where('lembaga.id', $lembagaId)->exists();
    }

    /**
     * Apakah akun + tenaga ahlinya konsisten dengan satu lembaga.
     *
     * Reksa honor dibayar ke tenaga ahli reksa, jadi bila akun reksa
     * menunjuk TA milik lembaga lain, honor-nya akan masuk ke lembaga
     * yang salah. Kasus seperti itu dianggap tidak selaras.
     */
    public function selarasDenganLembaga(?string $lembagaId): bool
    {
        if (! $this->belongsToLembaga($lembagaId)) {
            return false;
        }
        if ($lembagaId === null || ! $this->tenaga_ahli_id) {
            return true;
        }

        $taLembagaId = $this->tenagaAhliTanpaScope()?->lembaga_id;
        return $taLembagaId === null || $taLembagaId === $lembagaId;
    }

    /**
     * Tenaga ahli milik akun ini, di luar global scope 'lembaga' — supaya
     * pemeriksaan selaras tidak terpengaruh lembaga session saat ini.
     */
    public function tenagaAhliTanpaScope(): ?TenagaAhli
    {
        if (! $this->tenaga_ahli_id) {
            return null;
        }

        return TenagaAhli::withoutGlobalScope('lembaga')->find($this->tenaga_ahli_id);
    }

    public function canLogin(): bool
    {
        return $this->status_akun === 'Aktif' && ! $this->isLocked();
    }
}
