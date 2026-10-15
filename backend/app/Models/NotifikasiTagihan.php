<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotifikasiTagihan extends Model
{
    use HasUuids;

    protected $table = 'notifikasi_tagihan';

    public const JENIS_HONOR_SURVEIOR = 'honor_surveior';
    public const JENIS_HONOR_VERIFIKATOR = 'honor_verifikator';
    public const JENIS_TAGIHAN_H3 = 'tagihan_h3';
    public const JENIS_TAGIHAN_H1 = 'tagihan_h1';
    public const JENIS_TAGIHAN_OVERDUE = 'tagihan_overdue';
    public const JENIS_PENUGASAN_BARU = 'penugasan_baru';

    public const STATUS_MENUNGGU = 'menunggu';
    public const STATUS_TERKIRIM = 'terkirim';
    public const STATUS_GAGAL = 'gagal';

    public const CHANNEL_WHATSAPP = 'whatsapp';
    public const CHANNEL_EMAIL = 'email';

    public $timestamps = true;

    protected $fillable = [
        'id',
        'siklus_id',
        'penugasan_id',
        'jenis',
        'channel',
        'recipient',
        'status',
        'dibuat_pada',
        'dikirim_pada',
        'detail',
        'payload',
        'error_message',
        'attempt_count',
        'next_retry_at',
    ];

    protected $casts = [
        'dibuat_pada' => 'datetime',
        'dikirim_pada' => 'datetime',
        'detail' => 'array',
        'payload' => 'array',
        'next_retry_at' => 'datetime',
        'attempt_count' => 'integer',
    ];

    protected static function booted(): void
    {
        static::creating(function (NotifikasiTagihan $model) {
            if (empty($model->{$model->getKeyName()})) {
                $model->{$model->{$model->getKeyName()}} = $model->newUniqueId();
            }
            if (empty($model->status)) {
                $model->status = self::STATUS_MENUNGGU;
            }
            if (empty($model->dibuat_pada)) {
                $model->dibuat_pada = now();
            }
        });
    }

    public function siklus(): BelongsTo
    {
        return $this->belongsTo(SiklusAkreditasi::class);
    }

    public function penugasan(): BelongsTo
    {
        return $this->belongsTo(Penugasan::class);
    }
}
