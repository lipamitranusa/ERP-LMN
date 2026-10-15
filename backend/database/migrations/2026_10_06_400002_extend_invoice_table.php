<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Idempotent: kolom tertentu mungkin sudah ada dari schema yang berkembang
        // secara manual (lihat histori DB pengembangan). Tambah hanya jika belum ada.
        Schema::table('invoice', function (Blueprint $table) {
            if (! Schema::hasColumn('invoice', 'nomor_invoice')) {
                $table->string('nomor_invoice', 50)->nullable()->unique()->after('id');
            }
            if (! Schema::hasColumn('invoice', 'diterbitkan_pada')) {
                $table->timestamp('diterbitkan_pada')->nullable();
            }
            if (! Schema::hasColumn('invoice', 'dibuat_oleh')) {
                $table->foreignUuid('dibuat_oleh')->nullable()->after('pks_id')
                    ->constrained('akun_pengguna')->nullOnDelete();
            }
            if (! Schema::hasColumn('invoice', 'siklus_id')) {
                $table->foreignUuid('siklus_id')->nullable()->after('pks_id')
                    ->constrained('siklus_akreditasi')->cascadeOnDelete();
            }
            if (! Schema::hasColumn('invoice', 'keterangan')) {
                $table->text('keterangan')->nullable();
            }
            if (! Schema::hasColumn('invoice', 'metode_pembayaran')) {
                $table->string('metode_pembayaran', 30)->nullable();
            }
            if (! Schema::hasColumn('invoice', 'payment_reference')) {
                $table->string('payment_reference', 100)->nullable();
            }
            if (! Schema::hasColumn('invoice', 'payment_expired_at')) {
                $table->timestamp('payment_expired_at')->nullable();
            }
            if (! Schema::hasColumn('invoice', 'tanggal_lunas')) {
                $table->timestamp('tanggal_lunas')->nullable();
            }
            if (! Schema::hasColumn('invoice', 'created_at')) {
                $table->timestamps();
            }
        });
    }

    public function down(): void
    {
        Schema::table('invoice', function (Blueprint $table) {
            if (Schema::hasColumn('invoice', 'dibuat_oleh')) {
                $table->dropForeign(['dibuat_oleh']);
            }
            if (Schema::hasColumn('invoice', 'siklus_id')) {
                $table->dropForeign(['siklus_id']);
            }
            $table->dropIndex(['siklus_id', 'status']);
            $table->dropIndex(['payment_reference']);
            $table->dropColumn([
                'nomor_invoice', 'diterbitkan_pada', 'dibuat_oleh', 'siklus_id',
                'keterangan', 'metode_pembayaran', 'payment_reference',
                'payment_expired_at', 'tanggal_lunas', 'created_at', 'updated_at',
            ]);
        });
    }
};
