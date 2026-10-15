<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SuratTugas extends Model
{
    use HasUuids;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'surat_tugas';
    public $timestamps = false;

    protected static function booted(): void
    {
        static::creating(function (SuratTugas $model) {
            if (empty($model->{$model->getKeyName()})) {
                $model->{$model->getKeyName()} = $model->newUniqueId();
            }
        });
    }

    protected $fillable = [
        'id',
        'penugasan_id',
        'nomor_surat',
        'tanggal_terbit',
        'path_pdf',
        'diunduh_pada',
        'diterbitkan_oleh',
    ];

    protected $casts = [
        'tanggal_terbit' => 'date',
        'diunduh_pada' => 'datetime',
    ];

    public function penugasan(): BelongsTo
    {
        return $this->belongsTo(Penugasan::class, 'penugasan_id');
    }

    public function penerbit(): BelongsTo
    {
        return $this->belongsTo(AkunPengguna::class, 'diterbitkan_oleh');
    }
}
