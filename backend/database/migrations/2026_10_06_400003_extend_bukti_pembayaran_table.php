<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bukti_pembayaran', function (Blueprint $table) {
            $table->foreignUuid('submitted_by')->nullable()->after('invoice_id')
                ->constrained('akun_pengguna')->nullOnDelete();
            $table->string('path_bukti')->nullable();
            $table->timestamp('tanggal_submit')->nullable();
            $table->timestamp('tanggal_verifikasi')->nullable();
            $table->foreignUuid('diverifikasi_oleh')->nullable()
                ->constrained('akun_pengguna')->nullOnDelete();
            $table->text('alasan_penolakan')->nullable();
            $table->string('nomor_referensi', 100)->nullable();
            $table->string('dari_rekening', 100)->nullable();
            $table->string('sumber', 30)->nullable();
            $table->timestamps();

            $table->index(['invoice_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('bukti_pembayaran', function (Blueprint $table) {
            $table->dropForeign(['submitted_by']);
            $table->dropForeign(['diverifikasi_oleh']);
            $table->dropIndex(['invoice_id', 'created_at']);
            $table->dropColumn([
                'submitted_by', 'path_bukti', 'tanggal_submit', 'tanggal_verifikasi',
                'diverifikasi_oleh', 'alasan_penolakan', 'nomor_referensi',
                'dari_rekening', 'sumber', 'created_at', 'updated_at',
            ]);
        });
    }
};
