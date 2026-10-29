<?php

namespace App\Models;

use App\Traits\ScopedToLembaga;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Penugasan extends Model
{
    use HasUuids, ScopedToLembaga;

    protected static $lembagaScopeRelation = 'siklus';

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'penugasan';

    protected static function booted(): void
    {
        static::creating(function (Penugasan $model) {
            if (empty($model->{$model->getKeyName()})) {
                $model->{$model->getKeyName()} = $model->newUniqueId();
            }
        });
    }

    protected $fillable = [
        'id',
        'siklus_id',
        'tenaga_ahli_id',
        'jenis',
        'status',
        'tanggal_mulai_survei',
        'tanggal_selesai_survei',
        'tanggal_selesai',
    ];

    public const STATUS_MENUNGGU = 'menunggu';
    public const STATUS_SEDANG_BERTUGAS = 'sedang_bertugas';
    public const STATUS_SELESAI = 'selesai';
    public const STATUS_DIBATALKAN = 'dibatalkan';
    public const STATUS_DITOLAK = 'ditolak';
    public const STATUS_DIGANTIKAN = 'digantikan'; // digantikan oleh surveyor lain (admin replace)

    public const JENIS_SURVEI = 'survei';
    public const JENIS_VERIFIKASI = 'verifikasi';
    public const JENIS_REKOMENDASI = 'rekomendasi';

    public function siklus(): BelongsTo
    {
        return $this->belongsTo(SiklusAkreditasi::class, 'siklus_id')
            ->withoutGlobalScope('lembaga');
    }

    public function tenagaAhli(): BelongsTo
    {
        return $this->belongsTo(TenagaAhli::class, 'tenaga_ahli_id')
            ->withoutGlobalScope('lembaga');
    }

    public function laporan(): HasOne
    {
        return $this->hasOne(Laporan::class, 'penugasan_id');
    }

    public function suratTugas(): HasOne
    {
        return $this->hasOne(SuratTugas::class, 'penugasan_id');
    }

    public function laporanKendala(): HasMany
    {
        return $this->hasMany(LaporanKendala::class, 'penugasan_id');
    }

    public function laporanPengerjaan(): HasOne
    {
        return $this->hasOne(LaporanPengerjaan::class, 'penugasan_id');
    }

    public function isSedangBertugas(): bool
    {
        return $this->status === self::STATUS_SEDANG_BERTUGAS;
    }

    public function isSelesai(): bool
    {
        return $this->status === self::STATUS_SELESAI;
    }
}
