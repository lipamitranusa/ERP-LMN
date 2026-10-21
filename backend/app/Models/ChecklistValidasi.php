<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChecklistValidasi extends Model
{
    use HasUuids;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'checklist_validasi';
    public $timestamps = false;

    protected static function booted(): void
    {
        static::creating(function (ChecklistValidasi $model) {
            if (empty($model->{$model->getKeyName()})) {
                $model->{$model->getKeyName()} = $model->newUniqueId();
            }
        });
    }

    protected $fillable = [
        'id',
        'siklus_id',
        'jenis_dokumen',
        'status_validasi',
        'catatan_admin',
        'divalidasi_oleh',
        'tanggal_validasi',
    ];

    protected $casts = [
        'tanggal_validasi' => 'datetime',
    ];

    public const STATUS_BELUM = 'belum';
    public const STATUS_LENGKAP = 'lengkap';
    public const STATUS_TIDAK_LENGKAP = 'tidak_lengkap';

    public const JENIS_DOKUMEN = [
        'dfo' => 'Screenshot DFO',
        'surat_permohonan' => 'Surat Permohonan',
        'self_assessment' => 'Self Assessment',
        'sisdmk' => 'SISDMK',
        'aspak' => 'ASPAK',
        'inm' => 'INM',
        'ikp' => 'IKP',
    ];

    /**
     * Dokumen wajib: bila ketiganya `lengkap`, siklus dianggap tervalidasi
     * dan boleh lanjut ke tahap Kontrak & Invoicing.
     *
     * SISDMK/ASPAK/INM/IKP adalah dokumen pendukung — boleh dilengkapi
     * menyusul tanpa menghalangi advance tahap.
     */
    public const JENIS_WAJIB = [
        'dfo',
        'surat_permohonan',
        'self_assessment',
    ];

    public function siklus(): BelongsTo
    {
        return $this->belongsTo(SiklusAkreditasi::class, 'siklus_id');
    }

    public function validator(): BelongsTo
    {
        return $this->belongsTo(AkunPengguna::class, 'divalidasi_oleh');
    }

    public function isComplete(): bool
    {
        return $this->status_validasi === self::STATUS_LENGKAP;
    }
}
