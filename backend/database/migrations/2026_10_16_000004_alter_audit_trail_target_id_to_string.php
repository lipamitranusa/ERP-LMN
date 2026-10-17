<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('audit_trail', function (Blueprint $table) {
            // target_id tidak selalu UUID — beberapa model (misal jenis_faskes)
            // menggunakan string ID. Ubah ke string(36) untuk support keduanya.
            $table->string('target_id', 36)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('audit_trail', function (Blueprint $table) {
            $table->uuid('target_id')->nullable()->change();
        });
    }
};
