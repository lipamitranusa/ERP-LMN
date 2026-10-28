<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Perbaiki unique index COA agar konsisten dengan desain multi-lembaga.
 *
 * Migration add_lembaga_constraints sudah membuat UNIQUE (lembaga_id, kode)
 * untuk coa, tapi unique index lama (kode) global tidak dilepas — sehingga
 * kode akun yang sama tidak boleh dipakai oleh lemma lain. Akibatnya master
 * akuntansi (COA + kategori jurnal) tidak bisa direplikasi ke lemma baru.
 *
 * Yang dilepas HANYA index — tidak ada data yang dihapus.
 */
return new class extends Migration
{
    public function up(): void
    {
        // MySQL tidak mendukung "DROP CONSTRAINT IF EXISTS" — harus drop
        // index-nya secara eksplisit (dan diabaikan bila tidak ada).
        if (DB::getDriverName() === 'mysql') {
            try {
                DB::statement('ALTER TABLE coa DROP INDEX coa_kode_unique');
            } catch (\Throwable) {
                // Index sudah tidak ada — abaikan.
            }

            return;
        }

        DB::statement('ALTER TABLE coa DROP CONSTRAINT IF EXISTS coa_kode_unique');
    }

    public function down(): void
    {
        // Hanya aman bila tidak ada kode yang bentrok antar lemma.
        $bentrok = DB::table('coa')
            ->select('kode')
            ->groupBy('kode')
            ->havingRaw('COUNT(*) > 1')
            ->count();

        if ($bentrok > 0) {
            throw new \RuntimeException(
                'Tidak bisa dikembalikan: ada ' . $bentrok . ' kode COA yang dipakai lebih dari satu lembaga.'
            );
        }

        DB::statement('ALTER TABLE coa ADD CONSTRAINT coa_kode_unique UNIQUE (kode)');
    }
};
