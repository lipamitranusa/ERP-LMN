<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PembayaranHonorDetail extends Model
{
    use HasUuids;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'pembayaran_honor_detail';

    protected $fillable = [
        'id',
        'pembayaran_honor_id',
        'ledger_entry_id',
        'nominal_dibayar',
    ];

    protected $casts = [
        'nominal_dibayar' => 'decimal:2',
    ];

    public function pembayaran(): BelongsTo
    {
        return $this->belongsTo(PembayaranHonor::class, 'pembayaran_honor_id');
    }

    public function ledgerEntry(): BelongsTo
    {
        return $this->belongsTo(LedgerEntry::class, 'ledger_entry_id');
    }
}