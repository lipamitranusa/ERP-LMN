<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PembayaranHonor extends Model
{
    use HasUuids;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'pembayaran_honor';

    public const STATUS_DRAFT = 'draft';
    public const STATUS_DISETUJUI = 'disetujui';
    public const STATUS_DIBATALKAN = 'dibatalkan';

    public const METODE_TRANSFER = 'transfer_bank';
    public const METODE_TUNAI = 'tunai';
    public const METODE_LAINNYA = 'lainnya';

    protected $fillable = [
        'id',
        'nomor_pembayaran',
        'tanggal_pembayaran',
        'metode',
        'bank_pengirim',
        'nomor_rekening_tujuan',
        'atas_nama',
        'total_nominal',
        'status',
        'dibuat_oleh',
        'disetujui_oleh',
        'tanggal_disetujui',
        'dibatalkan_oleh',
        'tanggal_dibatalkan',
        'alasan_batal',
        'catatan',
        'path_bukti_transfer',
    ];

    protected $casts = [
        'tanggal_pembayaran' => 'date',
        'tanggal_disetujui' => 'datetime',
        'tanggal_dibatalkan' => 'datetime',
        'total_nominal' => 'decimal:2',
    ];

    public function details(): HasMany
    {
        return $this->hasMany(PembayaranHonorDetail::class, 'pembayaran_honor_id');
    }

    public function pembuat(): BelongsTo
    {
        return $this->belongsTo(AkunPengguna::class, 'dibuat_oleh');
    }

    public function penyetuju(): BelongsTo
    {
        return $this->belongsTo(AkunPengguna::class, 'disetujui_oleh');
    }

    public function pembatal(): BelongsTo
    {
        return $this->belongsTo(AkunPengguna::class, 'dibatalkan_oleh');
    }

    public function isDraft(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }

    public function isDisetujui(): bool
    {
        return $this->status === self::STATUS_DISETUJUI;
    }

    public function isDibatalkan(): bool
    {
        return $this->status === self::STATUS_DIBATALKAN;
    }
}