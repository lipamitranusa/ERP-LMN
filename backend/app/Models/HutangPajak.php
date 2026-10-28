<?php

namespace App\Models;

use App\Traits\ScopedToLembaga;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HutangPajak extends Model
{
    use HasUuids, ScopedToLembaga;

    protected static $lembagaScopeRelation = 'pembayaranHonor.details.ledgerEntry.siklus';

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'hutang_pajak';

    public const STATUS_BELUM_DIBAYAR = 'belum_dibayar';
    public const STATUS_DIBAYAR = 'dibayar';

    public const JENIS_PPH21_BUKAN_PEGAWAI = 'pph21_bukan_pegawai';

    protected $fillable = [
        'jenis_pajak',
        'nomor_pokok_wajib_pajak',
        'nama_wajib_pajak',
        'pembayaran_honor_id',
        'nomor_pembayaran',
        'tanggal_pembayaran_honor',
        'dpp',
        'tarif_persen',
        'jumlah_pajak',
        'status',
        'tanggal_jatuh_tempo',
        'tanggal_dibayar',
        'path_bukti_setor',
        'catatan',
        'dibuat_oleh',
        'disetujui_oleh',
        'disetujui_pada',
        'dibayar_oleh',
    ];

    protected $casts = [
        'tanggal_pembayaran_honor' => 'date',
        'tanggal_jatuh_tempo' => 'date',
        'tanggal_dibayar' => 'date',
        'disetujui_pada' => 'date',
        'dpp' => 'decimal:2',
        'tarif_persen' => 'decimal:2',
        'jumlah_pajak' => 'decimal:2',
    ];

    public function pembayaranHonor(): BelongsTo
    {
        return $this->belongsTo(PembayaranHonor::class, 'pembayaran_honor_id');
    }

    public function pembuat(): BelongsTo
    {
        return $this->belongsTo(AkunPengguna::class, 'dibuat_oleh');
    }

    public function penyetuju(): BelongsTo
    {
        return $this->belongsTo(AkunPengguna::class, 'disetujui_oleh');
    }

    public function pembayar(): BelongsTo
    {
        return $this->belongsTo(AkunPengguna::class, 'dibayar_oleh');
    }

    public function isBelumDibayar(): bool
    {
        return $this->status === self::STATUS_BELUM_DIBAYAR;
    }

    public function isDibayar(): bool
    {
        return $this->status === self::STATUS_DIBAYAR;
    }
}
