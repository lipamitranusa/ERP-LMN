<?php

namespace App\Models;

use App\Traits\ScopedToLembaga;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CatatanRevisi extends Model
{
    use HasUuids, ScopedToLembaga;

    protected static $lembagaScopeRelation = 'siklus';

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'catatan_revisi';
    public $timestamps = false;

    protected static function booted(): void
    {
        static::creating(function (CatatanRevisi $model) {
            if (empty($model->{$model->getKeyName()})) {
                $model->{$model->getKeyName()} = $model->newUniqueId();
            }
        });
    }

    protected $fillable = [
        'id',
        'siklus_id',
        'dibuat_oleh',
        'catatan',
        'tanggal_catatan',
        'dibaca_faskes',
        'dibaca_faskes_pada',
    ];

    protected $casts = [
        'dibaca_faskes' => 'boolean',
        'tanggal_catatan' => 'datetime',
        'dibaca_faskes_pada' => 'datetime',
    ];

    public function siklus(): BelongsTo
    {
        return $this->belongsTo(SiklusAkreditasi::class, 'siklus_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(AkunPengguna::class, 'dibuat_oleh');
    }
}
