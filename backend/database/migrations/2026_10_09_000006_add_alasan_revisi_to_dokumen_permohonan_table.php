<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dokumen_permohonan', function (Blueprint $table) {
            $table->text('alasan_revisi')->nullable()->after('mime_type');
        });
    }

    public function down(): void
    {
        Schema::table('dokumen_permohonan', function (Blueprint $table) {
            $table->dropColumn('alasan_revisi');
        });
    }
};
