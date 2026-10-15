<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('akun_pengguna', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('role_id')->constrained('roles')->restrictOnDelete();
            $table->foreignUuid('faskes_id')->nullable()->constrained('faskes')->nullOnDelete();
            $table->foreignUuid('tenaga_ahli_id')->nullable()->constrained('tenaga_ahli')->nullOnDelete();
            $table->string('nama', 255);
            $table->string('email', 255)->unique();
            $table->string('password_hash', 255);
            $table->string('status_akun', 50);
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('last_login_at')->nullable();

            $table->index(['role_id', 'status_akun']);
            $table->index('faskes_id');
            $table->index('tenaga_ahli_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('akun_pengguna');
    }
};
