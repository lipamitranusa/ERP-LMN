<?php

namespace App\Models;

use App\Traits\ScopedToLembaga;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Invoice extends Model
{
    use HasUuids, ScopedToLembaga;

    protected static $lembagaScopeRelation = 'siklus';

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'invoice';

    protected $fillable = [
        'id',
        'pks_id',
        'siklus_id',
        'nomor_invoice',
        'total_tagihan',
        'status',
        'due_date',
        'diterbitkan_pada',
        'dibuat_oleh',
        'keterangan',
        'metode_pembayaran',
        'payment_reference',
        'payment_expired_at',
        'tanggal_lunas',
        'va_bank',
    ];

    protected $casts = [
        'total_tagihan' => 'decimal:2',
        'due_date' => 'date',
        'diterbitkan_pada' => 'datetime',
        'payment_expired_at' => 'datetime',
        'tanggal_lunas' => 'datetime',
    ];

    public const STATUS_BELUM_BAYAR = 'belum_bayar';
    public const STATUS_SEBAGIAN = 'sebagian';
    public const STATUS_LUNAS = 'lunas';
    public const STATUS_EXPIRED = 'expired';
    public const STATUS_REFUNDED = 'refunded';
    public const STATUS_SUPERSEDED = 'superseded';

    public function pks(): BelongsTo
    {
        return $this->belongsTo(Pks::class, 'pks_id');
    }

    public function siklus(): BelongsTo
    {
        return $this->belongsTo(SiklusAkreditasi::class, 'siklus_id');
    }

    public function dibuatOleh(): BelongsTo
    {
        return $this->belongsTo(AkunPengguna::class, 'dibuat_oleh');
    }

    public function buktiPembayaran(): HasMany
    {
        return $this->hasMany(BuktiPembayaran::class, 'invoice_id');
    }

    public function refundRequests(): HasMany
    {
        return $this->hasMany(RefundRequest::class, 'invoice_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class, 'invoice_id');
    }

    public function isLunas(): bool
    {
        return $this->status === self::STATUS_LUNAS;
    }

    public function isSebagian(): bool
    {
        return $this->status === self::STATUS_SEBAGIAN;
    }

    public function totalDiterima(): float
    {
        return (float) $this->buktiPembayaran()
            ->where('status_verifikasi', BuktiPembayaran::STATUS_DITERIMA)
            ->sum('nominal');
    }

    public function sisaTagihan(): float
    {
        return max(0, (float) $this->total_tagihan - $this->totalDiterima());
    }
}
