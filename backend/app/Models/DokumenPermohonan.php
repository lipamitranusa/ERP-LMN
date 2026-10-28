<?php

namespace App\Models;

use App\Traits\ScopedToLembaga;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DokumenPermohonan extends Model
{
    use HasUuids, ScopedToLembaga;

    protected static $lembagaScopeRelation = 'siklus';

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'dokumen_permohonan';
    public $timestamps = false;

    protected static function booted(): void
    {
        static::creating(function (DokumenPermohonan $model) {
            if (empty($model->{$model->getKeyName()})) {
                $model->{$model->getKeyName()} = $model->newUniqueId();
            }
        });
    }

    protected $fillable = [
        'id',
        'siklus_id',
        'jenis_dokumen',
        'versi',
        'nama_file_asli',
        'path_file',
        'ukuran_file',
        'mime_type',
        'alasan_revisi',
        'diunggah_oleh',
        'tanggal_unduh',
    ];

    protected $casts = [
        'versi' => 'integer',
        'ukuran_file' => 'integer',
        'tanggal_unduh' => 'datetime',
    ];

    public function siklus(): BelongsTo
    {
        return $this->belongsTo(SiklusAkreditasi::class, 'siklus_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(AkunPengguna::class, 'diunggah_oleh');
    }
}
