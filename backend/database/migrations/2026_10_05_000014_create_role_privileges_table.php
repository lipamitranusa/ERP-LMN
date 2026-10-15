<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('role_privileges', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('role_id')->constrained('roles')->cascadeOnDelete();
            $table->foreignUuid('menu_action_id')->constrained('menu_actions')->cascadeOnDelete();
            $table->boolean('diizinkan')->default(false);

            $table->unique(['role_id', 'menu_action_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('role_privileges');
    }
};
