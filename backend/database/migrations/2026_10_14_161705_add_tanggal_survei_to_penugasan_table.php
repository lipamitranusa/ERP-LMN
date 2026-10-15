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
        Schema::table('penugasan', function (Blueprint $table) {
            $table->date('tanggal_mulai_survei')->nullable()->after('status');
            $table->date('tanggal_selesai_survei')->nullable()->after('tanggal_mulai_survei');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('penugasan', function (Blueprint $table) {
            $table->dropColumn(['tanggal_mulai_survei', 'tanggal_selesai_survei']);
        });
    }
};
