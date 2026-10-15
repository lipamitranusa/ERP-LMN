<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenaga_ahli', function (Blueprint $table) {
            $table->string('no_rekening', 50)->nullable()->after('kode_objek_pajak');
            $table->string('nama_bank', 100)->nullable()->after('no_rekening');
            $table->string('atas_nama_rekening', 100)->nullable()->after('nama_bank');
        });
    }

    public function down(): void
    {
        Schema::table('tenaga_ahli', function (Blueprint $table) {
            $table->dropColumn(['no_rekening', 'nama_bank', 'atas_nama_rekening']);
        });
    }
};
