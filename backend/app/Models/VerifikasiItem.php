<?php

namespace App\Models;

use App\Traits\ScopedToLembaga;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VerifikasiItem extends Model
{
    use HasUuids, ScopedToLembaga;

    protected static $lembagaScopeRelation = 'laporanVerifikasi.laporan.penugasan.siklus';

    protected $table = 'verifikasi_items';

    protected $fillable = [
        'id',
        'laporan_verifikasi_id',
        'kode_elemen',
        'nama_elemen',
        'nilai_default',
        'nilai_final',
        'catatan',
        'nilai_sesuai',
        'filled_at',
    ];

    protected $casts = [
        'nilai_sesuai' => 'boolean',
        'filled_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (VerifikasiItem $model) {
            if (empty($model->{$model->getKeyName()})) {
                $model->{$model->getKeyName()} = $model->newUniqueId();
            }
        });
    }

    public function laporanVerifikasi(): BelongsTo
    {
        return $this->belongsTo(LaporanVerifikasi::class);
    }

    /**
     * Apakah nilai_final berbeda dari nilai_default?
     */
    public function hasChanged(): bool
    {
        return $this->nilai_final !== null && $this->nilai_final !== $this->nilai_default;
    }

    /**
     * Apakah ada catatan wajib (FR-4.4: harus ada catatan jika nilai berubah)?
     */
    public function requiresCatatan(): bool
    {
        return $this->hasChanged() && empty($this->catatan);
    }
}
