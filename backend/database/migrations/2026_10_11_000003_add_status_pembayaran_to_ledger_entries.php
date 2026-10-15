<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tambah kolom status_pembayaran pada ledger_entries (FR-5.2/5.3 + AP flow).
 *
 * Status pembayaran honor (AP):
 *   - belum_dibayar (default) — entry honor baru dari Penugasan::selesai / Final
 *   - lunas — sudah dibayar lunas via pembayaran_honor
 *
 * Status turunan (untuk kemungkinan nanti):
 *   - sebagian — pembayaran parsial (belum diimplementasi, reserved)
 *
 * Index untuk query AP dashboard (status_pembayaran + created_at).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ledger_entries', function (Blueprint $table) {
            if (! Schema::hasColumn('ledger_entries', 'status_pembayaran')) {
                $table->string('status_pembayaran', 20)
                    ->default('belum_dibayar')
                    ->after('tipe')
                    ->comment('belum_dibayar | lunas | sebagian — hanya berlaku utk AP honor');
            }
            if (! Schema::hasColumn('ledger_entries', 'tanggal_dibayar')) {
                $table->timestamp('tanggal_dibayar')->nullable()
                    ->after('status_pembayaran')
                    ->comment('Timestamps saat AP honor dilunasi');
            }

            $table->index(['status_pembayaran', 'created_at'], 'le_status_pembayaran_created_at_idx');
            $table->index(['tipe', 'status_pembayaran'], 'le_tipe_status_pembayaran_idx');
        });
    }

    public function down(): void
    {
        Schema::table('ledger_entries', function (Blueprint $table) {
            $table->dropIndex('le_status_pembayaran_created_at_idx');
            $table->dropIndex('le_tipe_status_pembayaran_idx');
            $table->dropColumn(['status_pembayaran', 'tanggal_dibayar']);
        });
    }
};
