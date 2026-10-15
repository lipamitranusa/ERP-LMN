<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class PaymentSetting extends Model
{
    use HasUuids;

    protected $table = 'payment_settings';

    protected $fillable = ['kategori', 'kunci', 'nilai', 'label', 'deskripsi', 'tipe', 'options'];

    protected $casts = [
        'options' => 'array',
    ];

    /**
     * Get a setting value by key.
     */
    public static function value(string $kunci): ?string
    {
        $row = static::where('kunci', $kunci)->first();
        return $row?->nilai;
    }

    /**
     * Get a boolean setting.
     */
    public static function boolValue(string $kunci): bool
    {
        return static::value($kunci) === '1';
    }

    /**
     * Get an integer setting.
     */
    public static function intValue(string $kunci, int $default = 0): int
    {
        $v = static::value($kunci);
        return $v !== null ? (int) $v : $default;
    }

    /**
     * Get all settings as key=>value array.
     */
    public static function allValues(): array
    {
        return static::pluck('nilai', 'kunci')->all();
    }

    /**
     * Get all settings by category.
     */
    public static function byKategori(string $kategori): array
    {
        return static::where('kategori', $kategori)->get()->toArray();
    }

    /**
     * Batch update settings.
     * Terima key dengan format "kategori:kunci" atau "kunci" saja.
     */
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

    /**
     * Is the payment gateway enabled?
     */
    public static function isGatewayEnabled(): bool
    {
        return static::boolValue('enabled');
    }

    /**
     * Get the active driver name.
     */
    public static function activeDriver(): string
    {
        return static::value('driver') ?? 'fake';
    }

    /**
     * Get all settings as a flat key-value array grouped by category.
     */
    public static function allGrouped(): array
    {
        return static::all()->groupBy('kategori')->map(fn($items) => $items->pluck('nilai', 'kunci')->toArray())->toArray();
    }
}
