<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('faskes', function (Blueprint $table) {
            if (!Schema::hasColumn('faskes', 'nomor_surat_faskes')) {
                $table->string('nomor_surat_faskes', 100)->nullable()->after('no_sertifikat');
            }
        });
    }

    public function down(): void
    {
        Schema::table('faskes', function (Blueprint $table) {
            if (Schema::hasColumn('faskes', 'nomor_surat_faskes')) {
                $table->dropColumn('nomor_surat_faskes');
            }
        });
    }
};
