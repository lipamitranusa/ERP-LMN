<?php

namespace App\Models;

use App\Traits\ScopedToLembaga;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BuktiPembayaran extends Model
{
    use HasUuids, ScopedToLembaga;

    protected static $lembagaScopeRelation = 'invoice.siklus';

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'bukti_pembayaran';

    protected $fillable = [
        'id',
        'invoice_id',
        'submitted_by',
        'diverifikasi_oleh',
        'nominal',
        'metode',
        'status_verifikasi',
        'path_bukti',
        'tanggal_submit',
        'tanggal_verifikasi',
        'alasan_penolakan',
        'nomor_referensi',
        'dari_rekening',
        'sumber',
    ];

    protected $casts = [
        'nominal' => 'decimal:2',
        'tanggal_submit' => 'datetime',
        'tanggal_verifikasi' => 'datetime',
    ];

    public const STATUS_MENUNGGU = 'menunggu';
    public const STATUS_DITERIMA = 'diterima';
    public const STATUS_DITOLAK = 'ditolak';

    public const SUMBER_GATEWAY = 'gateway';
    public const SUMBER_MANUAL = 'manual';

    public const METODE_VA = 'virtual_account';
    public const METODE_QRIS = 'qris';
    public const METODE_TRANSFER = 'transfer_manual';

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class, 'invoice_id');
    }

    public function submitter(): BelongsTo
    {
        return $this->belongsTo(AkunPengguna::class, 'submitted_by');
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(AkunPengguna::class, 'diverifikasi_oleh');
    }

    public function isDiterima(): bool
    {
        return $this->status_verifikasi === self::STATUS_DITERIMA;
    }

    public function isDitolak(): bool
    {
        return $this->status_verifikasi === self::STATUS_DITOLAK;
    }

    public function isOverdue(int $maxHours = 24): bool
    {
        if ($this->status_verifikasi !== self::STATUS_MENUNGGU) {
            return false;
        }
        if (! $this->tanggal_submit) {
            return false;
        }
        return $this->tanggal_submit->lt(now()->subHours($maxHours));
    }
}
