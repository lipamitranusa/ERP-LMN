<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RolePrivilege extends Model
{
    use HasFactory, HasUuids;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $table = 'role_privileges';

    public $timestamps = false;

    protected $fillable = [
        'role_id',
        'menu_action_id',
        'diizinkan',
    ];

    protected $casts = [
        'diizinkan' => 'boolean',
    ];

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_id');
    }

    public function menuAction(): BelongsTo
    {
        return $this->belongsTo(MenuAction::class, 'menu_action_id');
    }
}
