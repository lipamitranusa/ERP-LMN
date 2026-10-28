<?php

namespace App\Models;

use App\Traits\BelongsToLembaga;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Faskes extends Model
{
    use HasFactory, HasUuids, BelongsToLembaga;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'faskes';
    public $timestamps = false;

    protected $fillable = [
        'jenis_faskes_id',
        'lembaga_id',
        'nama',
        'no_sertifikat',
        'nomor_surat_faskes',
        'alamat',
        'kota',
        'provinsi',
        'kode_pos',
        'telepon',
        'email',
        'website',
        'nama_pimpinana',
        'telepon_pimpinana',
        'deskripsi',
        'status',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected $appends = ['jenis', 'penanggung_jawab', 'tipe_faskes'];

    // getJenisAttribute() reads this relation on every serialization, which
    // trips preventLazyLoading() outside production.
    protected $with = ['jenisFaskes'];

    public function getJenisAttribute(): ?string
    {
        return $this->jenisFaskes?->nama;
    }

    public function getPenanggungJawabAttribute(): ?string
    {
        return $this->getAttribute('nama_pimpinana');
    }

    public function getTipeFaskesAttribute(): ?string
    {
        return $this->getRawOriginal('tipe_faskes');
    }

    public function jenisFaskes(): BelongsTo
    {
        return $this->belongsTo(JenisFaskes::class, 'jenis_faskes_id');
    }

    public function lembaga(): BelongsTo
    {
        return $this->belongsTo(Lembaga::class, 'lembaga_id');
    }

    public function siklusAkreditasis(): HasMany
    {
        return $this->hasMany(SiklusAkreditasi::class, 'faskes_id');
    }

    public function akunPenggunas(): HasMany
    {
        return $this->hasMany(AkunPengguna::class, 'faskes_id');
    }
}
