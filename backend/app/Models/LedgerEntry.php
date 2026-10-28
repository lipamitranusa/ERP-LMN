<?php

namespace App\Models;

use App\Traits\ScopedToLembaga;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LedgerEntry extends Model
{
    use HasUuids, ScopedToLembaga;

    protected static $lembagaScopeRelation = 'siklus';

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'ledger_entries';
    public $timestamps = false;

    protected $fillable = [
        'id',
        'siklus_id',
        'invoice_id',
        'penerima_tenaga_ahli_id',
        'konfigurasi_pajak_id',
        'tipe',
        'status_pembayaran',
        'tanggal_dibayar',
        'nominal_bruto',
        'potongan_ppn',
        'potongan_pph',
        'nominal_neto',
        'detail',
        'created_at',
    ];

    protected $casts = [
        'nominal_bruto' => 'decimal:2',
        'potongan_ppn' => 'decimal:2',
        'potongan_pph' => 'decimal:2',
        'nominal_neto' => 'decimal:2',
        'detail' => 'array',
        'created_at' => 'datetime',
        'tanggal_dibayar' => 'datetime',
    ];

    public const TIPE_PIUTANG_LUNAS = 'piutang_lunas';
    public const TIPE_REFUND = 'refund';
    public const TIPE_AP_HONOR_SURVEIOR = 'ap_honor_surveior';
    public const TIPE_AP_HONOR_VERIFIKATOR = 'ap_honor_verifikator';
    public const TIPE_AP_HONOR_REKOMENDATOR = 'ap_honor_rekomendator';
    public const TIPE_PENYESUAIAN_PKS = 'penyesuaian_pks';

    public const STATUS_BELUM_DIBAYAR = 'belum_dibayar';
    public const STATUS_LUNAS = 'lunas';
    public const STATUS_SEBAGIAN = 'sebagian';

    public function siklus(): BelongsTo
    {
        return $this->belongsTo(SiklusAkreditasi::class, 'siklus_id');
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class, 'invoice_id');
    }

    public function penerima(): BelongsTo
    {
        return $this->belongsTo(TenagaAhli::class, 'penerima_tenaga_ahli_id');
    }

    public function konfigurasiPajak(): BelongsTo
    {
        return $this->belongsTo(KonfigurasiPajak::class, 'konfigurasi_pajak_id');
    }

    public function pembayaranDetail()
    {
        return $this->hasOne(PembayaranHonorDetail::class, 'ledger_entry_id');
    }

    public function isApHonor(): bool
    {
        return in_array($this->tipe, [
            self::TIPE_AP_HONOR_SURVEIOR,
            self::TIPE_AP_HONOR_VERIFIKATOR,
            self::TIPE_AP_HONOR_REKOMENDATOR,
        ], true);
    }

    public function isBelumDibayar(): bool
    {
        return $this->status_pembayaran === self::STATUS_BELUM_DIBAYAR;
    }

    public function isLunas(): bool
    {
        return $this->status_pembayaran === self::STATUS_LUNAS;
    }
}
