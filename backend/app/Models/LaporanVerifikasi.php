<?php

namespace App\Models;

use App\Traits\ScopedToLembaga;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LaporanVerifikasi extends Model
{
    use HasUuids, ScopedToLembaga;

    protected static $lembagaScopeRelation = 'laporan.penugasan.siklus';

    protected $table = 'laporan_verifikasi';

    public const STATUS_DRAFT = 'draft';
    public const STATUS_FINAL = 'final';

    public const STATUS_REKOMENDASI_MENUNGGU = 'menunggu';
    public const STATUS_REKOMENDASI_DISETUJUI = 'disetujui';
    public const STATUS_REKOMENDASI_DITOLAK = 'ditolak';

    protected $fillable = [
        'id',
        'laporan_id',
        'verifikasi_penugasan_id',
        'rekomendasi_penugasan_id',
        'status_final',
        'finalized_at',
        'difinalisasi_oleh',
        'status_rekomendasi',
        'direkomendasikan_at',
        'catatan_rekomendasi',
    ];

    protected $casts = [
        'finalized_at' => 'datetime',
        'direkomendasikan_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (LaporanVerifikasi $model) {
            if (empty($model->{$model->getKeyName()})) {
                $model->{$model->getKeyName()} = $model->newUniqueId();
            }
            if (empty($model->status_final)) {
                $model->status_final = self::STATUS_DRAFT;
            }
        });
    }

    public function laporan(): BelongsTo
    {
        return $this->belongsTo(Laporan::class);
    }

    public function verifikasiPenugasan(): BelongsTo
    {
        return $this->belongsTo(Penugasan::class, 'verifikasi_penugasan_id');
    }

    public function rekomendasiPenugasan(): BelongsTo
    {
        return $this->belongsTo(Penugasan::class, 'rekomendasi_penugasan_id');
    }

    public function difinalisasiOleh(): BelongsTo
    {
        return $this->belongsTo(AkunPengguna::class, 'difinalisasi_oleh');
    }

    public function items(): HasMany
    {
        return $this->hasMany(VerifikasiItem::class, 'laporan_verifikasi_id');
    }

    public function isDraft(): bool
    {
        return $this->status_final === self::STATUS_DRAFT;
    }

    public function isFinal(): bool
    {
        return $this->status_final === self::STATUS_FINAL;
    }

    public function allItemsFilled(): bool
    {
        return $this->items()->whereNull('nilai_final')->count() === 0;
    }

    public function rekomendasiMenunggu(): bool
    {
        return $this->status_rekomendasi === self::STATUS_REKOMENDASI_MENUNGGU;
    }

    public function rekomendasiDisetujui(): bool
    {
        return $this->status_rekomendasi === self::STATUS_REKOMENDASI_DISETUJUI;
    }

    public function rekomendasiDitolak(): bool
    {
        return $this->status_rekomendasi === self::STATUS_REKOMENDASI_DITOLAK;
    }
}
