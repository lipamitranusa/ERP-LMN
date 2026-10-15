<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvoiceItem extends Model
{
    protected $table = 'invoice_items';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'invoice_id',
        'biaya_id',
        'nama_biaya',
        'deskripsi',
        'jumlah',
        'satuan',
        'tipe',
        'wajib',
    ];

    protected $casts = [
        'jumlah' => 'decimal:2',
        'wajib' => 'boolean',
    ];

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class, 'invoice_id');
    }

    public function biaya(): BelongsTo
    {
        return $this->belongsTo(BiayaPerJenisFaskes::class, 'biaya_id');
    }
}
