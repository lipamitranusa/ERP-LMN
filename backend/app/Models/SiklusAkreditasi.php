<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasOneThrough;

class SiklusAkreditasi extends Model
{
    use HasFactory, HasUuids;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'siklus_akreditasi';
    public $timestamps = false;

    protected $fillable = [
        'id',
        'faskes_id',
        'lembaga_id',
        'tanggal_pengajuan',
        'tanggal_permohonan_survei',
        'dfo_data',
        'status',
        'status_kelengkapan',
        'tahapan',
        'sub_tahapan_survei',
        'divalidasi_oleh',
        'tanggal_validasi',
        'created_at',
    ];

    protected $casts = [
        'dfo_data' => 'array',
        'tanggal_pengajuan' => 'date',
        'tanggal_permohonan_survei' => 'date',
        'tanggal_validasi' => 'datetime',
        'tahapan' => 'integer',
        'sub_tahapan_survei' => 'integer',
    ];

    public function faskes(): BelongsTo
    {
        return $this->belongsTo(Faskes::class, 'faskes_id');
    }

    public function lembaga(): BelongsTo
    {
        return $this->belongsTo(Lembaga::class, 'lembaga_id');
    }

    public function validator(): BelongsTo
    {
        return $this->belongsTo(AkunPengguna::class, 'divalidasi_oleh');
    }

    public function dokumen(): HasMany
    {
        return $this->hasMany(DokumenPermohonan::class, 'siklus_id');
    }

    public function checklist(): HasMany
    {
        return $this->hasMany(ChecklistValidasi::class, 'siklus_id');
    }

    public function catatanRevisi(): HasMany
    {
        return $this->hasMany(CatatanRevisi::class, 'siklus_id');
    }

    public function pks(): HasOne
    {
        return $this->hasOne(Pks::class, 'siklus_id');
    }

    public function invoice(): HasOne
    {
        return $this->hasOne(Invoice::class, 'siklus_id');
    }

    public function suratTugas(): HasOneThrough
    {
        return $this->hasOneThrough(
            \App\Models\SuratTugas::class,
            \App\Models\Penugasan::class,
            'siklus_id',
            'penugasan_id',
            'id',
            'id',
        );
    }

    public function historiPergantian(): HasMany
    {
        return $this->hasMany(HistoriPergantianPenugasan::class, 'siklus_id');
    }

    public function penugasanVerifikasi(): HasMany
    {
        return $this->hasMany(\App\Models\Penugasan::class, 'siklus_id');
    }

    public function laporanVerifikasi(): HasManyThrough
    {
        return $this->hasManyThrough(
            \App\Models\LaporanVerifikasi::class,
            \App\Models\Penugasan::class,
            'siklus_id',
            'verifikasi_penugasan_id',
            'id',
            'id',
        );
    }

    public function isComplete(): bool
    {
        return $this->status_kelengkapan === 'lengkap';
    }

    /**
     * Derive tahapan (1-7) based on siklus status and related records.
     * Used by Faskes Portal stepper.
     *
     * Stage mapping:
     *  1 = Pendaftaran
     *  2 = Validasi
     *  3 = Kontrak
     *  4 = Pembayaran
     *  5 = Survei
     *  6 = Verifikasi
     *  7 = Selesai
     */
    public function getTahapanAttribute(): int
    {
        // If DB has explicit value, use it (overrides everything)
        if ($this->attributes['tahapan'] !== null) {
            return (int) $this->attributes['tahapan'];
        }

        // Otherwise derive from status + relationships
        $status = $this->status;
        $kelengkapan = $this->status_kelengkapan;
        $pks = $this->pks ?? ($this->relationLoaded('pks') ? $this->pks : null);
        $invoice = $this->invoice ?? ($this->relationLoaded('invoice') ? $this->invoice : null);
        $suratTugas = $this->suratTugas ?? ($this->relationLoaded('suratTugas') ? $this->suratTugas : null);

        // Stage 7: Selesai
        if ($status === 'selesai' || $status === 'terakreditasi') {
            return 7;
        }

        // Stage 6: Verifikasi (survei done, verifikasi in progress or done)
        if ($suratTugas && ($status === 'verifikasi' || $status === 'selesai')) {
            return 6;
        }

        // Stage 5: Survei (surat tugas issued)
        if ($suratTugas && in_array($status, ['aktif', 'survei', 'verifikasi'])) {
            return 5;
        }

        // Stage 4: Pembayaran (PKS selesai divalidasi, invoice issued or paid)
        if ($pks?->isSelesai() || $pks?->isDisetujui()) {
            if ($invoice && in_array($invoice->status, ['lunas', 'dibayar'])) {
                return 5;
            }
            return 4;
        }

        // Stage 3: Kontrak (PKS exists, waiting for signature or admin validation)
        if ($pks && in_array($pks->status, ['dikirim', 'ditandatangani'])) {
            return 3;
        }

        // Stage 2: Validasi (documents submitted, waiting for admin validation)
        if ($kelengkapan === 'lengkap' || $status === 'menunggu_persetujuan') {
            return 2;
        }

        // Stage 1: Pendaftaran (initial)
        return 1;
    }
}
