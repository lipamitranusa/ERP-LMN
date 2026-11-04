<?php

namespace App\Traits;

use App\Models\Lembaga;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Trait untuk entitas yang discope per-lembaga.
 *
 * 自动 menambahkan:
 * - kolom `lembaga_id` ke fillable
 * - relasi `lembaga()`
 * - global scope: `WHERE lembaga_id = session('lembaga_id')`
 *
 * Scope TIDAK berlaku jika:
 * - session('lembaga_id') null (superadmin yang belum pilih lembaga)
 * - kode memanggil withoutGlobalScope('lembaga') secara eksplisit
 */
trait BelongsToLembaga
{
    public static function bootBelongsToLembaga(): void
    {
        // Global scope — filter otomatis per lembaga
        static::addGlobalScope('lembaga', function ($q) {
            $lembagaId = session('lembaga_id');
            if ($lembagaId !== null) {
                static::applyLembagaScope($q, $lembagaId);
            }
        });

        // Auto-set lembaga_id saat create, dari session.
        // Hanya set jika session punya nilai (superadmin tanpa pilihan → biarkan null).
        static::creating(function ($model) {
            if (empty($model->lembaga_id)) {
                $sessionId = session('lembaga_id');
                if ($sessionId !== null) {
                    $model->lembaga_id = $sessionId;
                }
            }
        });
    }

    /**
     * Filter global scope 'lembaga'. Model yang punya akses ke lebih dari satu
     * lembaga (mis. lewat pivot) dapat override method ini.
     */
    protected static function applyLembagaScope($q, string $lembagaId): void
    {
        $q->where($q->getModel()->getTable() . '.lembaga_id', $lembagaId);
    }

    public function lembaga(): BelongsTo
    {
        return $this->belongsTo(Lembaga::class, 'lembaga_id');
    }
}
