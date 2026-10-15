<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Tambah siklus_id ke tabel invoice jika belum ada
        // (sebelumnya field ini diasumsikan sudah ada di migration lain yang tidak terdefinisi)
        if (! Schema::hasColumn('invoice', 'siklus_id')) {
            Schema::table('invoice', function (Blueprint $table) {
                $table->foreignUuid('siklus_id')->nullable()->after('pks_id')->constrained('siklus_akreditasi')->nullOnDelete();
                $table->index('siklus_id');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('invoice', 'siklus_id')) {
            Schema::table('invoice', function (Blueprint $table) {
                $table->dropForeign(['siklus_id']);
                $table->dropIndex(['siklus_id']);
                $table->dropColumn('siklus_id');
            });
        }
    }
};
