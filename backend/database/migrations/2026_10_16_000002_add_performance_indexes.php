<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Prioritas tinggi: kolom yang sering muncul di WHERE, JOIN, ORDER BY.
     * Index composit untuk query yang menyaring 2+ kolom sekaligus.
     */
    public function up(): void
    {
        // === penugasan — filter by jenis + status + siklus_id ===
        Schema::table('penugasan', function (Blueprint $table) {
            $table->index(['jenis', 'status'], 'penugasan_jenis_status_idx');
            $table->index(['status'], 'penugasan_status_idx');
            $table->index(['siklus_id', 'jenis'], 'penugasan_siklus_jenis_idx');
        });

        // === siklus_akreditasi — filter + sort ===
        Schema::table('siklus_akreditasi', function (Blueprint $table) {
            $table->index(['status'], 'siklus_status_idx');
            $table->index(['created_at'], 'siklus_created_idx');
        });

        // === invoice — filter by status + siklus ===
        Schema::table('invoice', function (Blueprint $table) {
            $table->index(['status'], 'invoice_status_idx');
            $table->index(['siklus_id'], 'invoice_siklus_idx');
            $table->index(['status', 'siklus_id'], 'invoice_status_siklus_idx');
        });

        // === bukti_pembayaran — kolom: status_verifikasi, bukan status ===
        Schema::table('bukti_pembayaran', function (Blueprint $table) {
            $table->index(['status_verifikasi'], 'bukti_status_verifikasi_idx');
            $table->index(['invoice_id'], 'bukti_invoice_idx');
        });

        // === faskes — search + filter ===
        Schema::table('faskes', function (Blueprint $table) {
            $table->index(['status'], 'faskes_status_idx');
            $table->index(['jenis_faskes_id'], 'faskes_jenis_idx');
        });

        // === tenaga_ahli — filter by peran + status_aktif ===
        Schema::table('tenaga_ahli', function (Blueprint $table) {
            $table->index(['peran'], 'ta_peran_idx');
            $table->index(['status_aktif'], 'ta_status_aktif_idx');
        });

        // === jurnal_umum — date range scan ===
        Schema::table('jurnal_umum', function (Blueprint $table) {
            $table->index(['tanggal'], 'jurnal_tanggal_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('penugasan', fn (Blueprint $t) => $t->dropIndex(['penugasan_jenis_status_idx', 'penugasan_status_idx', 'penugasan_siklus_jenis_idx']));
        Schema::table('siklus_akreditasi', fn (Blueprint $t) => $t->dropIndex(['siklus_status_idx', 'siklus_created_idx']));
        Schema::table('invoice', fn (Blueprint $t) => $t->dropIndex(['invoice_status_idx', 'invoice_siklus_idx', 'invoice_status_siklus_idx']));
        Schema::table('bukti_pembayaran', fn (Blueprint $t) => $t->dropIndex(['bukti_status_verifikasi_idx', 'bukti_invoice_idx']));
        Schema::table('faskes', fn (Blueprint $t) => $t->dropIndex(['faskes_status_idx', 'faskes_jenis_idx']));
        Schema::table('tenaga_ahli', fn (Blueprint $t) => $t->dropIndex(['ta_peran_idx', 'ta_status_aktif_idx']));
        Schema::table('jurnal_umum', fn (Blueprint $t) => $t->dropIndex(['jurnal_tanggal_idx']));
    }
};
