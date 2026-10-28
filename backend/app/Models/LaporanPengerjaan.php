<?php

namespace App\Models;

use App\Traits\ScopedToLembaga;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LaporanPengerjaan extends Model
{
    use HasUuids, ScopedToLembaga;

    protected static $lembagaScopeRelation = 'penugasan.siklus';

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

    protected $appends = ['url'];

    public function getUrlAttribute(): string
    {
        if (! $this->path_file) {
            return '';
        }
        $baseUrl = env('CLOUDFLARE_R2_URL', 'https://pub.r2.dev');
        $bucket = env('CLOUDFLARE_R2_BUCKET', '');
        return rtrim($baseUrl, '/') . '/' . ltrim($bucket . '/' . $this->path_file, '/');
    }
}
