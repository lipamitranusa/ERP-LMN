<?php

namespace App\Traits;

use Illuminate\Database\Eloquent\Builder;

/**
 * Global scope untuk entitas yang TIDAK punya kolom `lembaga_id` sendiri,
 * tetapi bisa ditelusuri ke `siklus_akreditasi.lembaga_id` lewat rantai relasi.
 *
 * Scope TIDAK berlaku jika:
 * - session('lembaga_id') null (superadmin yang belum memilih lembaga)
 * - kode memanggil withoutGlobalScope('lembaga') secara eksplisit
 *
 * Implementer cukup menetapkan relasi berantai pada properti statik
 * `$lembagaScopeRelation`:
 *
 *   protected $lembagaScopeRelation = 'siklus';                    // Invoice
 *   protected $lembagaScopeRelation = 'invoice.siklus';              // InvoiceItem
 *   protected $lembagaScopeRelation = 'details.ledgerEntry.siklus';  // PembayaranHonor
 */
trait ScopedToLembaga
{
    public static function bootScopedToLembaga(): void
    {
        static::addGlobalScope('lembaga', function (Builder $q) {
            $lembagaId = session('lembaga_id');
            if ($lembagaId === null) {
                return;
            }
            $q->whereHas(static::lemmaScopeRelation(), function ($sub) use ($lembagaId) {
                $sub->where('lembaga_id', $lembagaId);
            });
        });
    }

    /**
     * Rantai relasi menuju SiklusAkreditasi (atau model ber-lembaga_id lain).
     */
    public static function lemmaScopeRelation(): string
    {
        return static::$lembagaScopeRelation;
    }
}
