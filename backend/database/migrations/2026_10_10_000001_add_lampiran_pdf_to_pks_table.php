<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pks', function (Blueprint $table) {
            $table->string('path_lampiran_pdf', 500)->nullable()->after('path_pdf');
            $table->string('lampiran_nama_asli', 255)->nullable()->after('path_lampiran_pdf');
        });
    }

    public function down(): void
    {
        Schema::table('pks', function (Blueprint $table) {
            $table->dropColumn(['path_lampiran_pdf', 'lampiran_nama_asli']);
        });
    }
};
