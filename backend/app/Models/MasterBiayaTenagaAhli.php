<?php

namespace App\Models;

use App\Traits\BelongsToLembaga;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MasterBiayaTenagaAhli extends Model
{
    use HasUuids, BelongsToLembaga;

    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = true;

    protected $table = 'master_biaya_tenaga_ahli';

    public const PERAN_SURVEIOR = 'surveior';
    public const PERAN_VERIFIKATOR = 'verifikator';
    public const PERAN_REKOMENDATOR = 'rekomendator';

    protected $fillable = [
        'id',
        'peran',
        'tipe_faskes',
        'tarif_dasar',
        'keterangan',
        'aktif',
        'lembaga_id',
    ];

    protected $casts = [
        'tarif_dasar' => 'decimal:2',
        'aktif' => 'boolean',
    ];

    public function jenisFaskes(): BelongsTo
    {
        return $this->belongsTo(JenisFaskes::class, 'tipe_faskes', 'kode');
    }

    /**
     * Lookup bruto honor untuk kombinasi peran + tipe_faskes.
     * Hanya mengembalikan row aktif. Return null jika tidak ada.
     */
    public static function resolveBruto(string $peran, ?string $tipeFaskes): ?self
    {
        if (! $tipeFaskes) {
            return null;
        }
        return static::where('peran', $peran)
            ->where('tipe_faskes', $tipeFaskes)
            ->where('aktif', true)
            ->first();
    }
}
