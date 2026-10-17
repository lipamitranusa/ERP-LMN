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

    public function canLogin(): bool
    {
        return $this->status_akun === 'Aktif' && ! $this->isLocked();
    }
}
