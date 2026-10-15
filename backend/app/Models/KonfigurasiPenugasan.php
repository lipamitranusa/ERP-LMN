<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KonfigurasiPenugasan extends Model
{
    protected $table = 'konfigurasi_penugasan';
    public $timestamps = true;

    protected $fillable = ['kunci', 'nilai', 'deskripsi'];

    public static function value(string $kunci): ?string
    {
        $row = static::where('kunci', $kunci)->first();
        return $row?->nilai;
    }

    public static function boolValue(string $kunci): bool
    {
        return static::value($kunci) === '1';
    }

    public static function intValue(string $kunci, int $default = 0): int
    {
        $v = static::value($kunci);
        return $v !== null ? (int) $v : $default;
    }

    public static function allSettings(): array
    {
        return static::pluck('nilai', 'kunci')->all();
    }
}
