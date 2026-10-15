<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('faskes', function (Blueprint $table) {
            $table->string('telepon', 30)->nullable()->after('alamat');
            $table->string('email', 100)->nullable()->after('telepon');
        });
    }

    public function down(): void
    {
        Schema::table('faskes', function (Blueprint $table) {
            $table->dropColumn(['telepon', 'email']);
        });
    }
};
