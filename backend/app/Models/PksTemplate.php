<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PksTemplate extends Model
{
    use HasUuids;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'pks_templates';

    protected $fillable = [
        'id',
        'jenis_faskes_id',
        'nama',
        'blade',
        'konten',
        'is_default',
        'aktif',
        'dibuat_oleh',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'aktif' => 'boolean',
    ];

    public function jenisFaskes(): BelongsTo
    {
        return $this->belongsTo(JenisFaskes::class, 'jenis_faskes_id');
    }

    public function dibuatOleh(): BelongsTo
    {
        return $this->belongsTo(AkunPengguna::class, 'dibuat_oleh');
    }

    public static function getActiveForJenisFaskes(?string $jenisFaskesId): ?self
    {
        return static::where('aktif', true)
            ->where('jenis_faskes_id', $jenisFaskesId)
            ->orderByDesc('is_default')
            ->first();
    }

    public static function getDefault(): ?self
    {
        return static::where('aktif', true)
            ->whereNull('jenis_faskes_id')
            ->where('is_default', true)
            ->first();
    }
}
