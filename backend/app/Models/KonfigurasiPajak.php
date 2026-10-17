<?php

namespace App\Models;

use App\Traits\BelongsToLembaga;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * KonfigurasiPajak — master data tarif PPN & PPh Pasal 21.
 *
 * Mengacu pada PRD FR-5.7: tarif PPN dan PPh dikelola sebagai master data
 * yang dapat diubah oleh Keuangan tanpa perubahan kode (bukan hardcode).
 *
 * Sistem SELALU menggunakan tarif dengan `berlaku_sejak` TERBESAR yang
 * <= tanggal transaksi — lihat {@see self::activeRate()}.
 */
class KonfigurasiPajak extends Model
{
    use HasUuids, BelongsToLembaga;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'konfigurasi_pajak';
    public $timestamps = false;

    public const JENIS_PPN = 'ppn';
    public const JENIS_PPH21 = 'pph21';

    protected $fillable = [
        'id',
        'jenis_pajak',
        'tarif_persen',
        'berlaku_sejak',
        'keterangan',
        'dibuat_oleh',
        'lembaga_id',
    ];

    protected $casts = [
        'tarif_persen' => 'decimal:2',
        'berlaku_sejak' => 'date',
    ];

    public function ledgerEntries(): HasMany
    {
        return $this->hasMany(LedgerEntry::class, 'konfigurasi_pajak_id');
    }

    /**
     * Tarif aktif untuk satu jenis pajak pada tanggal tertentu.
     * Mengembalikan row dengan `berlaku_sejak` paling besar yang <= tanggal.
     */
    public static function activeRate(string $jenisPajak, ?Carbon $tanggal = null): ?self
    {
        $tanggal ??= now();

        return static::where('jenis_pajak', $jenisPajak)
            ->whereDate('berlaku_sejak', '<=', $tanggal->toDateString())
            ->orderByDesc('berlaku_sejak')
            ->orderByDesc('id')
            ->first();
    }

    /**
     * Ambil tarif_persen sebagai float (decimal-cast string ke float).
     */
    public function tarifFloat(): float
    {
        return (float) $this->tarif_persen;
    }
}
