<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MenuAction extends Model
{
    use HasFactory, HasUuids;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $table = 'menu_actions';

    public $timestamps = false;

    protected $fillable = [
        'modul',
        'action',
    ];

    public function privileges(): HasMany
    {
        return $this->hasMany(RolePrivilege::class, 'menu_action_id');
    }
}
