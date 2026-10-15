<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('jenis_faskes', function (Blueprint $table) {
            $table->string('id', 30)->change();
        });
    }

    public function down(): void
    {
        Schema::table('jenis_faskes', function (Blueprint $table) {
            $table->uuid('id')->change();
        });
    }
};
