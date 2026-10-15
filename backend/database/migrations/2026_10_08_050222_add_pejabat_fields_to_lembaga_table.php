<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('lembaga', function (Blueprint $table) {
            if (!Schema::hasColumn('lembaga', 'nama_pejabat')) {
                $table->string('nama_pejabat', 200)->nullable()->after('nama_cp');
            }
            if (!Schema::hasColumn('lembaga', 'jabatan_pejabat')) {
                $table->string('jabatan_pejabat', 100)->nullable()->after('nama_pejabat');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lembaga', function (Blueprint $table) {
            $table->dropColumn(['nama_pejabat', 'jabatan_pejabat']);
        });
    }
};
