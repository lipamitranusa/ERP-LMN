<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Pks extends Model
{
    use HasUuids;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'pks';

    protected $fillable = [
        'id',
        'siklus_id',
        'nomor_pks',
        'dibuat_oleh',
        'status',
        'tanggal_disetujui',
        'draf_dikirim_pada',
        'tanda_tangan_pada',
        'path_pdf',
        'path_docx',
        'path_tanda_tangan',
        'path_lampiran_pdf',
        'lampiran_nama_asli',
        'nama_penandatangan',
        'jabatan_penandatangan',
        'nik_penandatangan',
        'konten_pks',
        // Signed document fields
        'path_signed_pdf',
        'signed_uploaded_at',
        'admin_validated_at',
        'admin_validated_by',
    ];

    protected $casts = [
        'tanggal_disetujui' => 'date',
        'draf_dikirim_pada' => 'datetime',
        'tanda_tangan_pada' => 'datetime',
        'signed_uploaded_at' => 'datetime',
        'admin_validated_at' => 'datetime',
        'konten_pks' => 'array',
    ];

    public const STATUS_DRAFT = 'draft';
    public const STATUS_DIKIRIM = 'dikirim';
    public const STATUS_DITANDATANGANI = 'ditandatangani';
    public const STATUS_DISETUJUI = 'disetujui';
    public const STATUS_DITOLAK = 'ditolak';
    public const STATUS_EXPIRED = 'expired';

    public function siklus(): BelongsTo
    {
        return $this->belongsTo(SiklusAkreditasi::class, 'siklus_id');
    }

    public function dibuatOleh(): BelongsTo
    {
        return $this->belongsTo(AkunPengguna::class, 'dibuat_oleh');
    }

    public function invoice(): HasOne
    {
        return $this->hasOne(Invoice::class, 'pks_id');
    }

    public function adminValidator(): BelongsTo
    {
        return $this->belongsTo(AkunPengguna::class, 'admin_validated_by');
    }

    public function isDisetujui(): bool
    {
        return $this->status === self::STATUS_DISETUJUI;
    }

    public function isSelesai(): bool
    {
        return $this->status === 'selesai';
    }
}
