<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Akun pengguna pada aplikasi ini memakai UUID, tetapi kolom
     * `sessions.user_id` dibuat oleh migrasi default Laravel sebagai
     * `foreignId` (bigint). Setiap request terautentikasi menulis baris
     * session dengan user_id berupa UUID, sehingga PostgreSQL menolak dengan
     * "invalid input syntax for type bigint" dan seluruh endpoint API
     * membalas 500.
     *
     * Perbaiki dengan mengubah tipe kolom menjadi varchar(36).
     */
    public function up(): void
    {
        Schema::table('sessions', function (Blueprint $table) {
            $table->string('user_id', 36)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('sessions', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable()->change();
        });
    }
};
