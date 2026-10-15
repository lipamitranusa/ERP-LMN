<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LaporanKendala extends Model
{
    use HasUuids;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'laporan_kendala';
    public $timestamps = false;

    protected static function booted(): void
    {
        static::creating(function (LaporanKendala $model) {
            if (empty($model->{$model->getKeyName()})) {
                $model->{$model->getKeyName()} = $model->newUniqueId();
            }
        });
    }

    protected $fillable = [
        'id',
        'penugasan_id',
        'tenaga_ahli_id',
        'jenis',
        'deskripsi',
        'status',
        'tanggal_laporan',
        'dilaporkan_oleh',
    ];

    protected $casts = [
        'tanggal_laporan' => 'datetime',
    ];

    public const JENIS_COI = 'conflict_of_interest';
    public const JENIS_FORCE_MAJEURE = 'force_majeure';

    public const STATUS_MENUNGGU = 'menunggu';
    public const STATUS_DIPROSES = 'diproses';
    public const STATUS_SELESAI = 'selesai';

    public function penugasan(): BelongsTo
    {
        return $this->belongsTo(Penugasan::class, 'penugasan_id');
    }

    public function tenagaAhli(): BelongsTo
    {
        return $this->belongsTo(TenagaAhli::class, 'tenaga_ahli_id');
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(AkunPengguna::class, 'dilaporkan_oleh');
    }
}
