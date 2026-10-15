<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Role extends Model
{
    use HasFactory, HasUuids;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $table = 'roles';

    public $timestamps = false;

    protected $fillable = [
        'nama_role',
        'is_default',
    ];

    protected $casts = [
        'is_default' => 'boolean',
    ];

    public function privileges(): HasMany
    {
        return $this->hasMany(RolePrivilege::class, 'role_id');
    }

    public function menuActions(): HasMany
    {
        return $this->hasMany(RolePrivilege::class, 'role_id')->where('diizinkan', true);
    }

    public function accounts(): HasMany
    {
        return $this->hasMany(AkunPengguna::class, 'role_id');
    }

    public function hasPrivilege(string $modul, string $action): bool
    {
        return $this->privileges()
            ->where('diizinkan', true)
            ->whereHas('menuAction', fn ($q) => $q->where('modul', $modul)->where('action', $action))
            ->exists();
    }
}
