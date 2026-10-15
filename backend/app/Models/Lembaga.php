<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Lembaga extends Model
{
    use HasFactory, HasUuids;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'lembaga';
    public $timestamps = false;

    protected $fillable = [
        'nama',
        'alamat',
        'kota',
        'telepon',
        'email',
        'website',
        'nama_cp',
        'telepon_cp',
        'deskripsi',
        'logo_path',
        'status',
        'nama_pejabat',
        'jabatan_pejabat',
        'npwp',
        'kode_kpp',
        'alamat_pajak',
        'kota_pajak',
        'nama_pejabat_pajak',
        'jabatan_pejabat_pajak',
        'npwp_diverifikasi_at',
    ];

    protected $casts = [
        'npwp_diverifikasi_at' => 'datetime',
    ];

    protected $appends = ['logo_url'];

    public function getLogoUrlAttribute(): ?string
    {
        if (! $this->logo_path) return null;
        return asset('storage/' . ltrim($this->logo_path, '/'));
    }

    public function siklusAkreditasi(): HasMany
    {
        return $this->hasMany(SiklusAkreditasi::class, 'lembaga_id');
    }
}
