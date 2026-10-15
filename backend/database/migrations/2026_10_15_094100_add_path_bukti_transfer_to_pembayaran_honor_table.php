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
        Schema::table('pembayaran_honor', function (Blueprint $table) {
            $table->string('path_bukti_transfer', 500)->nullable()->after('catatan');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pembayaran_honor', function (Blueprint $table) {
            $table->dropColumn('path_bukti_transfer');
        });
    }
};
