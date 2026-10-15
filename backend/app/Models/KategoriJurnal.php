<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class KategoriJurnal extends Model
{
    use HasUuids;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'kategori_jurnal';

    public const JENIS_PEMASUKAN = 'pemasukan';
    public const JENIS_PENGELUARAN = 'pengeluaran';
    public const JENIS_ADJUSTMENT = 'adjustment';

    // ── Jenis transaksi spesifik ──────────────────────────────────────────────
    public const JENIS_BKM = 'bkm';   // Bukti Kas Masuk Bank
    public const JENIS_BKK = 'bkk';   // Bukti Kas Keluar Bank
    public const JENIS_KKM = 'kkm';   // Kas Kecil Masuk
    public const JENIS_KKK = 'kkk';   // Kas Kecil Keluar

    public static array $JENIS_LABEL = [
        self::JENIS_PEMASUKAN       => 'Pemasukan',
        self::JENIS_PENGELUARAN     => 'Pengeluaran',
        self::JENIS_ADJUSTMENT      => 'Adjustment / Koreksi',
        self::JENIS_BKM             => 'Bank Masuk (BKM)',
        self::JENIS_BKK             => 'Bank Keluar (BKK)',
        self::JENIS_KKM             => 'Kas Kecil Masuk (KKM)',
        self::JENIS_KKK             => 'Kas Kecil Keluar (KKK)',
    ];

    public static array $JENIS_KATEGORI = [
        // Non-spesifik
        'adjustment'  => 'Adjustment / Koreksi',
        'pemasukan'   => 'Pemasukan Umum',
        'pengeluaran' => 'Pengeluaran Umum',
        // Spesifik
        'bkm'         => 'Bank Masuk (BKM)',
        'bkk'         => 'Bank Keluar (BKK)',
        'kkm'         => 'Kas Kecil Masuk (KKM)',
        'kkk'         => 'Kas Kecil Keluar (KKK)',
    ];

    protected $fillable = [
        'nama',
        'jenis',
        'urutan',
        'is_aktif',
    ];

    protected $casts = [
        'is_aktif' => 'boolean',
        'urutan'   => 'integer',
    ];

    public function jurnalUmum(): HasMany
    {
        return $this->hasMany(JurnalUmum::class, 'kategori_id');
    }
}
