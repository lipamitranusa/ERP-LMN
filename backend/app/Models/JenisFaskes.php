<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JenisFaskes extends Model
{
    protected $table = 'jenis_faskes';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['id', 'nama', 'kode', 'deskripsi', 'status'];

    public function faskes(): HasMany
    {
        return $this->hasMany(Faskes::class, 'jenis_faskes_id');
    }

    public function biayaPerJenisFaskes(): HasMany
    {
        return $this->hasMany(BiayaPerJenisFaskes::class, 'jenis_faskes_id');
    }
}
