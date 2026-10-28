<?php

namespace App\Models;

use App\Traits\ScopedToLembaga;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Laporan extends Model
{
    use HasUuids, ScopedToLembaga;

    protected static $lembagaScopeRelation = 'penugasan.siklus';

    protected $table = 'laporan';

    protected $fillable = [
        'id',
        'penugasan_id',
        'tipe',
        'submitted_at',
    ];

    protected $casts = [
        'submitted_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (Laporan $model) {
            if (empty($model->{$model->getKeyName()})) {
                $model->{$model->getKeyName()} = $model->newUniqueId();
            }
        });
    }

    public function penugasan(): BelongsTo
    {
        return $this->belongsTo(Penugasan::class);
    }

    public function laporanVerifikasi(): HasOne
    {
        return $this->hasOne(LaporanVerifikasi::class);
    }
}
