<?php

namespace App\Models;

use App\Traits\BelongsToLembaga;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AuditTrail extends Model
{
    use HasFactory, HasUuids, BelongsToLembaga;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $table = 'audit_trail';

    public $timestamps = false;

    protected $fillable = [
        'aktor_id',
        'aksi',
        'target_type',
        'target_id',
        'data_sebelum',
        'data_sesudah',
        'ip_address',
        'user_agent',
        'lembaga_id',
    ];

    protected $casts = [
        'data_sebelum' => 'array',
        'data_sesudah' => 'array',
        'created_at' => 'datetime',
    ];
}
