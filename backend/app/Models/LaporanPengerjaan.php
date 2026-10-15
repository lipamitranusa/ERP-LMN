<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LaporanPengerjaan extends Model
{
    use HasUuids;

    protected $table = 'laporan_pengerjaan';

    protected $fillable = [
        'penugasan_id',
        'path_file',
        'nama_file_asli',
        'tipe_file',
        'ukuran_file',
        'keterangan',
        'diunggah_oleh',
    ];

    public function penugasan(): BelongsTo
    {
        return $this->belongsTo(Penugasan::class, 'penugasan_id');
    }

    public function pengunggah(): BelongsTo
    {
        return $this->belongsTo(AkunPengguna::class, 'diunggah_oleh');
    }
}
