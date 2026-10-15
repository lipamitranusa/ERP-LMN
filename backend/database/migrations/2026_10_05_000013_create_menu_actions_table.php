<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('menu_actions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('modul', 100);
            $table->string('action', 50);

            $table->unique(['modul', 'action']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('menu_actions');
    }
};
