<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HistoriAntrianPenugasan extends Model
{
    use HasUuids;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'histori_antrian_penugasan';
    public $timestamps = false;

    protected static function booted(): void
    {
        static::creating(function (HistoriAntrianPenugasan $model) {
            if (empty($model->{$model->getKeyName()})) {
                $model->{$model->getKeyName()} = $model->newUniqueId();
            }
        });
    }

    protected $fillable = [
        'id',
        'tenaga_ahli_id',
        'peran',
        'nomor_urut',
        'status_kesediaan',
        'tanggal_status',
        'catatan_penolakan',
        'ditugaskan_oleh',
    ];

    protected $casts = [
        'nomor_urut' => 'integer',
        'tanggal_status' => 'datetime',
    ];

    public const STATUS_SIAP = 'siap';
    public const STATUS_DITAWARKAN = 'ditawarkan';
    public const STATUS_DITERIMA = 'diterima';
    public const STATUS_DITOLAK = 'ditolak';
    public const STATUS_SEDANG_BERTUGAS = 'sedang_bertugas';

    public const PERAN_SURVEIOR = 'surveior';
    public const PERAN_VERIFIKATOR = 'verifikator';

    public function tenagaAhli(): BelongsTo
    {
        return $this->belongsTo(TenagaAhli::class, 'tenaga_ahli_id');
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(AkunPengguna::class, 'ditugaskan_oleh');
    }
}
