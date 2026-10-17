<?php

namespace App\Models;

use App\Traits\BelongsToLembaga;
use Illuminate\Database\Eloquent\Model;

class KonfigurasiPenugasan extends Model
{
    use BelongsToLembaga;

    protected $table = 'konfigurasi_penugasan';
    public $timestamps = true;

    protected $fillable = ['lembaga_id', 'kunci', 'nilai', 'deskripsi'];

    /**
     * Ambil nilai konfigurasi. Tanpa lembaga_id: cari row global
     * (lembaga_id NULL). Dengan lembaga_id: cari row per-lembaga
     * tersebut — fallback ke global jika tidak ada.
     */
    public static function value(string $kunci, ?string $lembagaId = null): ?string
    {
        $lembagaId ??= session('lembaga_id');

        // 1) Cari per-lembaga dulu (jika ada session lembaga)
        if ($lembagaId !== null) {
            $row = static::where('kunci', $kunci)
                ->where('lembaga_id', $lembagaId)
                ->first();
            if ($row) {
                return $row->nilai;
            }
        }

        // 2) Fallback ke global (lembaga_id NULL)
        $row = static::where('kunci', $kunci)
            ->whereNull('lembaga_id')
            ->first();
        return $row?->nilai;
    }

    /**
     * Set/upsert nilai konfigurasi. Jika lembagaId null, set sebagai
     * global (lembaga_id NULL). Jika tidak, simpan per-lembaga.
     */
    public static function set(string $kunci, ?string $nilai, ?string $lembagaId = null, ?string $deskripsi = null): void
    {
        $row = static::where('kunci', $kunci)
            ->where(function ($q) use ($lembagaId) {
                $q->whereNull('lembaga_id');
                if ($lembagaId !== null) {
                    $q->orWhere('lembaga_id', $lembagaId);
                }
            })
            ->first();

        if ($row) {
            $row->forceFill([
                'nilai' => $nilai,
                'lembaga_id' => $lembagaId,
                'deskripsi' => $deskripsi ?? $row->deskripsi,
            ])->save();
        } else {
            static::create([
                'kunci' => $kunci,
                'nilai' => $nilai,
                'lembaga_id' => $lembagaId,
                'deskripsi' => $deskripsi,
            ]);
        }
    }

    public static function boolValue(string $kunci, ?string $lembagaId = null): bool
    {
        return static::value($kunci, $lembagaId) === '1';
    }

    public static function intValue(string $kunci, int $default = 0, ?string $lembagaId = null): int
    {
        $v = static::value($kunci, $lembagaId);
        return $v !== null ? (int) $v : $default;
    }

    public static function allSettings(): array
    {
        return static::pluck('nilai', 'kunci')->all();
    }
}
