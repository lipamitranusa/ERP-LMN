<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * Template isi pesan notifikasi.
 *
 * Satu baris = satu kombinasi kanal (channel) + jenis notifikasi (jenis).
 * Template yang belum ada di tabel ini akan memakai format bawaan yang
 * didefinisikan di `config/notifikasi.php` → `templates`.
 *
 * Placeholder ditulis dalam kurung kurawal ganda: {{nama_faskes}}
 */
class NotifikasiTemplate extends Model
{
    use HasUuids;

    protected $table = 'notifikasi_template';

    protected $fillable = [
        'id',
        'channel',
        'jenis',
        'subject',
        'body',
        'aktif',
    ];

    protected $casts = [
        'aktif' => 'boolean',
    ];

    public const CHANNEL_WHATSAPP = 'whatsapp';
    public const CHANNEL_EMAIL = 'email';

    /**
     * Template kanal + jenis tertentu, null bila belum pernah disimpan.
     */
    public static function findFor(string $channel, string $jenis): ?self
    {
        return static::where('channel', $channel)->where('jenis', $jenis)->first();
    }
}
