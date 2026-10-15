<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JurnalUmum extends Model
{
    use HasUuids;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'jurnal_umum';

    protected $fillable = [
        'nomor',
        'tanggal',
        'kategori_id',
        'keterangan',
        'ref_type',
        'ref_id',
        'total_debit',
        'total_kredit',
        'path_lampiran',
        'dibuat_oleh',
    ];

    protected $casts = [
        'tanggal' => 'date',
        'total_debit' => 'decimal:2',
        'total_kredit' => 'decimal:2',
    ];

    public function kategori(): BelongsTo
    {
        return $this->belongsTo(KategoriJurnal::class, 'kategori_id');
    }

    public function details(): HasMany
    {
        return $this->hasMany(JurnalUmumDetail::class, 'jurnal_umum_id');
    }

    public function pembuat(): BelongsTo
    {
        return $this->belongsTo(AkunPengguna::class, 'dibuat_oleh');
    }

    public function isBalanced(): bool
    {
        return bccomp($this->total_debit, $this->total_kredit, 2) === 0;
    }
}
