<?php

namespace App\Models;

use App\Traits\BelongsToLembaga;
use Illuminate\Database\Eloquent\Builder;
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
    use HasFactory, HasUuids, BelongsToLembaga;

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

    /**
     * Status siklus yang menandakan seluruh tahapan akreditasi telah selesai.
     */
    public const STATUS_TUNTAS = ['selesai', 'terakreditasi'];

    /**
     * Status invoice yang dianggap pembayaran sudah lunas.
     */
    public const INVOICE_LUNAS = ['lunas', 'dibayar'];

    public function isComplete(): bool
    {
        return $this->status_kelengkapan === 'lengkap';
    }

    /**
     * Seluruh tahapan akreditasi sudah selesai?
     *
     * Penanda utama adalah kolom `tahapan` = 7. Penutupan verifikasi melalui
     * VerifikasiWorkspaceController men-set status 'selesai', sedangkan
     * penyelesaian penugasan verifikasi (PenugasanController) hanya menaikkan
     * `tahapan` tanpa mengubah status — sehingga status siklus pada siklus
     * yang sudah tuntas bisa berupa 'lunas' atau 'verifikasi'.
     */
    public function isTahapanSelesai(): bool
    {
        $tahapan = (int) ($this->attributes['tahapan'] ?? 0);

        return $tahapan >= 7 || in_array($this->status, self::STATUS_TUNTAS, true);
    }

    /**
     * Siklus dianggap tuntas (masuk histori) bila seluruh tahapan selesai
     * DAN pembayaran invoice sudah lunas.
     */
    public function isSelesaiLengkap(): bool
    {
        if (! $this->isTahapanSelesai()) {
            return false;
        }

        $invoice = $this->relationLoaded('invoice') ? $this->invoice : $this->invoice()->first();

        return $invoice && in_array($invoice->status, self::INVOICE_LUNAS, true);
    }

    /**
     * Scope: siklus yang sudah masuk histori (tuntas + lunas).
     */
    public function scopeSelesaiLengkap(Builder $query): Builder
    {
        return $query->where(function (Builder $q) {
            $q->whereRaw('COALESCE(siklus_akreditasi.tahapan, 0) >= 7')
                ->orWhereIn('siklus_akreditasi.status', self::STATUS_TUNTAS);
        })->whereHas('invoice', fn ($q) => $q->whereIn('status', self::INVOICE_LUNAS));
    }

    /**
     * Scope: siklus yang masih berjalan (belum masuk histori).
     */
    public function scopeBelumSelesaiLengkap(Builder $query): Builder
    {
        return $query->where(function (Builder $q) {
            $q->where(function (Builder $inner) {
                $inner->whereRaw('COALESCE(siklus_akreditasi.tahapan, 0) < 7')
                    ->where(function (Builder $s) {
                        $s->whereNull('siklus_akreditasi.status')
                            ->orWhereNotIn('siklus_akreditasi.status', self::STATUS_TUNTAS);
                    });
            })->orWhereDoesntHave('invoice', fn ($iq) => $iq->whereIn('status', self::INVOICE_LUNAS));
        });
    }

    /**
     * Lookup siklus by ID dengan validasi lembaga yang informatif.
     *
     * Berbeda dengan findOrFail(), method ini bypass global scope lembaga
     * untuk lookup awal agar bisa mendeteksi siklus yang ada di lembaga
     * lain dari session user — lalu mengembalikan error 403 dengan pesan
     * yang jelas ("Siklus ini milik lembaga X, Anda sedang di Y")
     * alih-alih 404 generik "No query results".
     *
     * Gunakan method ini di endpoint admin yang menerima siklus_id via
     * request body (POST/PUT/PATCH) — terutama yang diakses via UI yang
     * menampilkan daftar siklus dari session lembaga aktif.
     */
    public static function findWithLembagaCheck(string $id): self
    {
        $siklus = static::withoutGlobalScope('lembaga')->find($id);
        if (! $siklus) {
            abort(response()->json(['message' => 'Siklus tidak ditemukan.'], 404));
        }

        $sessionLembagaId = session('lembaga_id');
        if ($sessionLembagaId !== null && $siklus->lembaga_id !== $sessionLembagaId) {
            $lembagaName = $siklus->lembaga?->nama ?? 'lain';
            abort(response()->json([
                'message' => "Siklus ini milik lembaga \"{$lembagaName}\". Anda sedang di lembaga lain. Silakan pindah lembaga melalui menu Lembaga di header.",
            ], 403));
        }

        return $siklus;
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
        if (($this->attributes['tahapan'] ?? null) !== null) {
            return (int) $this->attributes['tahapan'];
        }

        // Otherwise derive from status + relationships
        $status = $this->status;
        $kelengkapan = $this->status_kelengkapan;
        // Relasi hanya boleh dibaca bila SUDAH di-eager load. Mengakses
        // relasi yang belum loaded di dalam accessor akan memicu lazy load
        // → LazyLoadingViolationException saat model diserialisasi jadi JSON
        // (kolom `tahapan` NULL = accessor ini ikut jalan).
        $pks = $this->relationLoaded('pks') ? $this->getRelation('pks') : null;
        $invoice = $this->relationLoaded('invoice') ? $this->getRelation('invoice') : null;
        $suratTugas = $this->relationLoaded('suratTugas') ? $this->getRelation('suratTugas') : null;

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
