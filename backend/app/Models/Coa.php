<?php

namespace App\Models;

use App\Traits\BelongsToLembaga;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Coa extends Model
{
    use HasUuids, BelongsToLembaga;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'coa';

    // Jenis akun (neraca / laba rugi)
    public const JENIS_AKTIVA_LANCAR = 'aktiva_lancar';
    public const JENIS_AKTIVA_TETAP = 'aktiva_tetap';
    public const JENIS_KEWAJIBAN_LANCAR = 'kewajiban_lancar';
    public const JENIS_KEWAJIBAN_JANGKA_PANJANG = 'kewajiban_jangka_panjang';
    public const JENIS_MODAL = 'modal';
    public const JENIS_PENDAPATAN = 'pendapatan';
    public const JENIS_PENDAPATAN_LAIN = 'pendapatan_lain';
    public const JENIS_BEBAN = 'beban';
    public const JENIS_BEBAN_LAIN = 'beban_lain';

    // Kelompok saldo normal
    public const KELOMPOK_DEBIT = 'debit';       // Aktiva, Beban
    public const KELOMPOK_KREDIT = 'kredit';     // Kewajiban, Modal, Pendapatan
    public const KELOMPOK_DEBIT_KREDIT = 'debit_kredit'; // Perkiraan خاص (BANK etc)

    public static array $JENIS_LABEL = [
        self::JENIS_AKTIVA_LANCAR => 'Aktiva Lancar',
        self::JENIS_AKTIVA_TETAP => 'Aktiva Tetap',
        self::JENIS_KEWAJIBAN_LANCAR => 'Kewajiban Lancar',
        self::JENIS_KEWAJIBAN_JANGKA_PANJANG => 'Kewajiban Jangka Panjang',
        self::JENIS_MODAL => 'Modal',
        self::JENIS_PENDAPATAN => 'Pendapatan',
        self::JENIS_PENDAPATAN_LAIN => 'Pendapatan Lain',
        self::JENIS_BEBAN => 'Beban',
        self::JENIS_BEBAN_LAIN => 'Beban Lain',
    ];

    public static array $KELOMPOK_LABEL = [
        self::KELOMPOK_DEBIT => 'Debit (Normal Saldo: Debit)',
        self::KELOMPOK_KREDIT => 'Kredit (Normal Saldo: Kredit)',
        self::KELOMPOK_DEBIT_KREDIT => 'Debit / Kredit',
    ];

    public static function jenisGroup(string $jenis): string
    {
        return match ($jenis) {
            self::JENIS_AKTIVA_LANCAR, self::JENIS_AKTIVA_TETAP => 'NERACA - AKTIVA',
            self::JENIS_KEWAJIBAN_LANCAR, self::JENIS_KEWAJIBAN_JANGKA_PANJANG, self::JENIS_MODAL => 'NERACA - KEWAJIBAN & MODAL',
            self::JENIS_PENDAPATAN, self::JENIS_PENDAPATAN_LAIN => 'LABA RUGI - PENDAPATAN',
            self::JENIS_BEBAN, self::JENIS_BEBAN_LAIN => 'LABA RUGI - BEBAN',
            default => 'LAINNYA',
        };
    }

    protected $fillable = [
        'kode',
        'nama',
        'jenis',
        'kelompok',
        'kategori_id',
        'is_aktif',
        'urutan',
        'deskripsi',
        'lembaga_id',
    ];

    protected $casts = [
        'is_aktif' => 'boolean',
        'urutan' => 'integer',
    ];

    public function kategori(): BelongsTo
    {
        return $this->belongsTo(KategoriJurnal::class, 'kategori_id');
    }

    public function jurnalDetails(): HasMany
    {
        return $this->hasMany(JurnalUmumDetail::class, 'coa_id');
    }

    public function scopeAktif($q)
    {
        return $q->where('is_aktif', true);
    }

    public function scopeByJenis($q, string $jenis)
    {
        return $q->where('jenis', $jenis);
    }

    public function isDebitNormal(): bool
    {
        return $this->kelompok === self::KELOMPOK_DEBIT || $this->kelompok === self::KELOMPOK_DEBIT_KREDIT;
    }
}
