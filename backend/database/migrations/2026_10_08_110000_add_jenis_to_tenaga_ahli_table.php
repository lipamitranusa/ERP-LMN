<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenaga_ahli', function (Blueprint $table) {
            // Jenis surveyor: TKPP (Tenaga Kredensial Penilai Puncak) atau TKSDU (Tenaga Kredensial Surveyor Dasar/Domain Umum)
            $table->string('jenis', 20)->nullable()->after('peran')->index();
        });
    }

    public function down(): void
    {
        Schema::table('tenaga_ahli', function (Blueprint $table) {
            $table->dropIndex(['jenis']);
            $table->dropColumn('jenis');
        });
    }
};
