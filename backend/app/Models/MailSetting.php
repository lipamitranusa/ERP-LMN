<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class MailSetting extends Model
{
    use HasUuids;

    protected $table = 'mail_settings';

    protected $fillable = ['kategori', 'kunci', 'nilai', 'label', 'deskripsi', 'tipe', 'options'];

    protected $casts = [
        'options' => 'array',
    ];

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

    public static function allGrouped(): array
    {
        return static::all()->groupBy('kategori')->map(fn ($items) => $items->values()->toArray())->toArray();
    }

    public static function updateBatch(array $values): int
    {
        $updated = 0;
        foreach ($values as $compositeKey => $nilai) {
            if (str_contains($compositeKey, ':')) {
                [$kategori, $kunci] = explode(':', $compositeKey, 2);
                $row = static::where('kategori', $kategori)->where('kunci', $kunci)->first();
            } else {
                $row = static::where('kunci', $compositeKey)->first();
            }
            if ($row) {
                $row->forceFill(['nilai' => (string) $nilai])->save();
                $updated++;
            }
        }
        return $updated;
    }

    public static function isEnabled(): bool
    {
        return static::boolValue('enabled');
    }

    public static function driver(): string
    {
        return static::value('driver') ?? 'smtp';
    }
}
