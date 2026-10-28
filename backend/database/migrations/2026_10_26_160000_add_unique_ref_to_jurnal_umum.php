<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Jurnal settlement dijamin unik per sumber (ref_type + ref_id).
 *
 * Tanpa constraint ini, dua request "Buat Bank Keluar" yang datang
 * bersamaan bisa sama-sama lolos dari pengecekan idempotency di service
 * (check-then-insert) dan menghasilkan dua jurnal untuk satu kas keluar —
 * akun Kas/Bank ter-kredit dua kali.
 *
 * Jurnal manual (ref_type NULL) tidak terpengaruh: NULL tidak dianggap
 * sama dengan NULL pada unique index di PostgreSQL maupun MySQL.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Kalau sudah ada duplikat (mis. dari sebelum constraint ini),
        // index tidak bisa dibuat — beri pesan jelas daripada error DB mentah.
        $duplikat = DB::table('jurnal_umum')
            ->whereNotNull('ref_type')
            ->whereNotNull('ref_id')
            ->select('ref_type', 'ref_id', DB::raw('count(*) as total'))
            ->groupBy('ref_type', 'ref_id')
            ->get()
            ->filter(fn ($row) => (int) $row->total > 1);

        if ($duplikat->isNotEmpty()) {
            $detail = $duplikat->map(fn ($row) => "{$row->ref_type}/{$row->ref_id} (x{$row->total})")->implode(', ');
            throw new \RuntimeException(
                "Ada jurnal settlement duplikat pada sumber: {$detail}. "
                . 'Hapus duplikatnya sebelum menambah constraint unik.'
            );
        }

        Schema::table('jurnal_umum', function (Blueprint $table) {
            $table->unique(['ref_type', 'ref_id'], 'jurnal_umum_ref_unique');
        });
    }

    public function down(): void
    {
        Schema::table('jurnal_umum', function (Blueprint $table) {
            $table->dropUnique('jurnal_umum_ref_unique');
        });
    }
};
