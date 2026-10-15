<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HistoriPergantianPenugasan extends Model
{
    use HasFactory, HasUuids;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'histori_pergantian_penugasan';
    public $timestamps = false;

    protected static function booted(): void
    {
        static::creating(function (HistoriPergantianPenugasan $model) {
            if (empty($model->{$model->getKeyName()})) {
                $model->{$model->getKeyName()} = $model->newUniqueId();
            }
        });
    }

    protected $fillable = [
        'id',
        'siklus_id',
        'jenis',
        'penugasan_lama_id',
        'penugasan_baru_id',
        'tenaga_ahli_lama_id',
        'tenaga_ahli_baru_id',
        'alasan',
        'diganti_oleh',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function siklus(): BelongsTo
    {
        return $this->belongsTo(SiklusAkreditasi::class, 'siklus_id');
    }

    public function penugasanLama(): BelongsTo
    {
        return $this->belongsTo(Penugasan::class, 'penugasan_lama_id');
    }

    public function penugasanBaru(): BelongsTo
    {
        return $this->belongsTo(Penugasan::class, 'penugasan_baru_id');
    }

    public function tenagaAhliLama(): BelongsTo
    {
        return $this->belongsTo(TenagaAhli::class, 'tenaga_ahli_lama_id');
    }

    public function tenagaAhliBaru(): BelongsTo
    {
        return $this->belongsTo(TenagaAhli::class, 'tenaga_ahli_baru_id');
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(AkunPengguna::class, 'diganti_oleh');
    }
}
