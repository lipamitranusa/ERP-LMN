<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
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
        'nama_pt',
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
        'default_bank_coa_id',
    ];

    protected $casts = [
        'npwp_diverifikasi_at' => 'datetime',
    ];

    protected $appends = ['logo_url'];

    public function getLogoUrlAttribute(): ?string
    {
        if (! $this->logo_path) return null;
        // Relative path so the browser uses the same origin/proxy as the API calls.
        // Vite proxy forwards /api/* to the Laravel backend.
        return "/api/master/lembaga/{$this->id}/logo";
    }

    public function siklusAkreditasi(): HasMany
    {
        return $this->hasMany(SiklusAkreditasi::class, 'lembaga_id');
    }

    public function jenisFaskes(): HasMany
    {
        return $this->hasMany(JenisFaskes::class, 'lembaga_id');
    }

    public function tenagaAhli(): HasMany
    {
        return $this->hasMany(TenagaAhli::class, 'lembaga_id');
    }

    public function akunPengguna(): HasMany
    {
        return $this->hasMany(AkunPengguna::class, 'lembaga_id');
    }

    public function masterBiayaTenagaAhli(): HasMany
    {
        return $this->hasMany(MasterBiayaTenagaAhli::class, 'lembaga_id');
    }

    public function konfigurasiPajak(): HasMany
    {
        return $this->hasMany(KonfigurasiPajak::class, 'lembaga_id');
    }

    public function biayaPerJenisFaskes(): HasMany
    {
        return $this->hasMany(BiayaPerJenisFaskes::class, 'lembaga_id');
    }

    public function coa(): HasMany
    {
        return $this->hasMany(Coa::class, 'lembaga_id');
    }

    public function kategoriJurnal(): HasMany
    {
        return $this->hasMany(KategoriJurnal::class, 'lembaga_id');
    }

    public function jurnalUmum(): HasMany
    {
        return $this->hasMany(JurnalUmum::class, 'lembaga_id');
    }
}
