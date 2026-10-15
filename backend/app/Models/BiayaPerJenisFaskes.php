<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BiayaPerJenisFaskes extends Model
{
    protected $table = 'biaya_per_jenis_faskes';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'jenis_faskes_id',
        'nama_biaya',
        'deskripsi',
        'jumlah',
        'satuan',
        'tipe',
        'wajib',
        'status',
    ];

    protected $casts = [
        'jumlah' => 'decimal:2',
        'wajib' => 'boolean',
    ];

    public function jenisFaskes(): BelongsTo
    {
        return $this->belongsTo(JenisFaskes::class, 'jenis_faskes_id');
    }
}
