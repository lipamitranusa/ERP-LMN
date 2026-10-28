<?php

namespace App\Models;

use App\Traits\BelongsToLembaga;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TenagaAhli extends Model
{
    use HasFactory, HasUuids, BelongsToLembaga;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'tenaga_ahli';
    public $timestamps = false;

    protected static function booted(): void
    {
        static::creating(function (TenagaAhli $model) {
            if (empty($model->{$model->getKeyName()})) {
                $model->{$model->getKeyName()} = $model->newUniqueId();
            }
        });
    }

    protected $fillable = [
        'id',
        'nomor_induk_surveior',
        'nama',
        'no_wa',
        'peran',
        'jenis',
        'status_aktif',
        'status_penugasan_saat_ini',
        'batas_penugasan_per_periode',
        'npwp',
        'nik',
        'nama_pajak',
        'alamat_pajak',
        'kota_pajak',
        'kode_objek_pajak',
        // FR-5.9 — identitas pajak untuk bukti potong BP21
        'status_ptkp',
        'kode_kpp',
        'no_rekening',
        'nama_bank',
        'atas_nama_rekening',
        'npwp_diverifikasi_at',
        'lembaga_id',
    ];

    /**
     * Daftar status PTKP yang valid sesuai format Coretax BP21
     * (<StatusTaxExemption>). Lihat BuktiPotongService::toCoretaxXml().
     */
    public const STATUS_PTKP_OPTIONS = [
        'TK/0', 'TK/1', 'TK/2', 'TK/3',
        'K/0', 'K/1', 'K/2', 'K/3',
    ];

    /**
     * Default status PTKP untuk Tenaga Ahli baru yang belum diinput manual.
     * TK/0 (Tidak Kawin, 0 tanggungan) = PTKP minimal, paling konservatif.
     */
    public const STATUS_PTKP_DEFAULT = 'TK/0';

    protected $casts = [
        'batas_penugasan_per_periode' => 'integer',
        'npwp_diverifikasi_at' => 'datetime',
    ];

    public const STATUS_AKTIF = 'Aktif';
    public const STATUS_NONAKTIF = 'Nonaktif';
    public const STATUS_CUTI = 'Cuti';
    public const STATUS_RESIGN = 'Resign';

    public const PERAN_SURVEIOR = 'surveior';
    public const PERAN_VERIFIKATOR = 'verifikator';
    public const PERAN_REKOMENDATOR = 'rekomendator';
    public const PERAN_KEDUA = 'kedua'; // bisa jadi keduanya

    // Jenis surveyor (FR-3.1: setiap siklus butuh 2 surveyor beda jenis)
    public const JENIS_TKPP = 'TKPP';   // Tenaga Kredensial Penilai Puncak
    public const JENIS_TKSDU = 'TKSDU'; // Tenaga Kredensial Surveyor Dasar/Domain Umum

    public const STATUS_TIDAK_BERTUGAS = 'tidak_bertugas';
    public const STATUS_SEDANG_BERTUGAS = 'sedang_bertugas';

    public function akunPengguna(): HasMany
    {
        return $this->hasMany(AkunPengguna::class, 'tenaga_ahli_id');
    }

    public function penugasan(): HasMany
    {
        return $this->hasMany(Penugasan::class, 'tenaga_ahli_id');
    }

    public function historiAntrian(): HasMany
    {
        return $this->hasMany(HistoriAntrianPenugasan::class, 'tenaga_ahli_id');
    }

    public function isAktif(): bool
    {
        return $this->status_aktif === self::STATUS_AKTIF;
    }

    public function isSedangBertugas(): bool
    {
        return $this->status_penugasan_saat_ini === self::STATUS_SEDANG_BERTUGAS;
    }

    public function isSurveior(): bool
    {
        return $this->peran === self::PERAN_SURVEIOR || $this->peran === self::PERAN_KEDUA;
    }

    public function isVerifikator(): bool
    {
        return $this->peran === self::PERAN_VERIFIKATOR || $this->peran === self::PERAN_KEDUA;
    }

    public function isTKPP(): bool
    {
        return $this->jenis === self::JENIS_TKPP;
    }

    public function isTKSDU(): bool
    {
        return $this->jenis === self::JENIS_TKSDU;
    }
}
