<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Fase 1 — Multi-Lembaga: Tambah kolom lembaga_id (nullable) ke semua entitas
     * yang sebelumnya global.
     *
     * Tidak ada constraint FK/NOT NULL di fase ini — itu fase 3.
     * Tidak ada backfill data di fase ini — itu fase 7.
     *
     * Entitas yang DISKIP (sudah scoped atau tidak perlu):
     *   - roles          → global, tidak discope
     *   - faskes         → sudah punya lembaga_id
     *   - siklus_akreditasi → sudah punya lembaga_id via faskes
     */
    public function up(): void
    {
        Schema::table('jenis_faskes', function (Blueprint $table) {
            $table->uuid('lembaga_id')->nullable()->after('deskripsi');
            $table->index('lembaga_id');
        });

        Schema::table('tenaga_ahli', function (Blueprint $table) {
            $table->uuid('lembaga_id')->nullable()->after('atas_nama_rekening');
            $table->index('lembaga_id');
        });

        Schema::table('akun_pengguna', function (Blueprint $table) {
            $table->uuid('lembaga_id')->nullable()->after('tenaga_ahli_id');
            $table->index('lembaga_id');
        });

        Schema::table('master_biaya_tenaga_ahli', function (Blueprint $table) {
            $table->uuid('lembaga_id')->nullable()->after('aktif');
            $table->index('lembaga_id');
        });

        Schema::table('konfigurasi_pajak', function (Blueprint $table) {
            $table->uuid('lembaga_id')->nullable()->after('dibuat_oleh');
            $table->index('lembaga_id');
        });

        Schema::table('biaya_per_jenis_faskes', function (Blueprint $table) {
            $table->uuid('lembaga_id')->nullable()->after('status');
            $table->index('lembaga_id');
        });

        Schema::table('audit_trail', function (Blueprint $table) {
            $table->uuid('lembaga_id')->nullable()->after('user_agent');
            $table->index('lembaga_id');
        });

        Schema::table('coa', function (Blueprint $table) {
            $table->uuid('lembaga_id')->nullable()->after('deskripsi');
            $table->index('lembaga_id');
        });

        Schema::table('jurnal_umum', function (Blueprint $table) {
            $table->uuid('lembaga_id')->nullable()->after('dibuat_oleh');
            $table->index('lembaga_id');
        });

        Schema::table('kategori_jurnal', function (Blueprint $table) {
            $table->uuid('lembaga_id')->nullable()->after('is_aktif');
            $table->index('lembaga_id');
        });
    }

    public function down(): void
    {
        Schema::table('jenis_faskes', fn (Blueprint $t) => $t->dropIndex(['lembaga_id'])->dropColumn('lembaga_id'));
        Schema::table('tenaga_ahli', fn (Blueprint $t) => $t->dropIndex(['lembaga_id'])->dropColumn('lembaga_id'));
        Schema::table('akun_pengguna', fn (Blueprint $t) => $t->dropIndex(['lembaga_id'])->dropColumn('lembaga_id'));
        Schema::table('master_biaya_tenaga_ahli', fn (Blueprint $t) => $t->dropIndex(['lembaga_id'])->dropColumn('lembaga_id'));
        Schema::table('konfigurasi_pajak', fn (Blueprint $t) => $t->dropIndex(['lembaga_id'])->dropColumn('lembaga_id'));
        Schema::table('biaya_per_jenis_faskes', fn (Blueprint $t) => $t->dropIndex(['lembaga_id'])->dropColumn('lembaga_id'));
        Schema::table('audit_trail', fn (Blueprint $t) => $t->dropIndex(['lembaga_id'])->dropColumn('lembaga_id'));
        Schema::table('coa', fn (Blueprint $t) => $t->dropIndex(['lembaga_id'])->dropColumn('lembaga_id'));
        Schema::table('jurnal_umum', fn (Blueprint $t) => $t->dropIndex(['lembaga_id'])->dropColumn('lembaga_id'));
        Schema::table('kategori_jurnal', fn (Blueprint $t) => $t->dropIndex(['lembaga_id'])->dropColumn('lembaga_id'));
    }
};
