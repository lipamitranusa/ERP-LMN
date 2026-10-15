<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pks_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('jenis_faskes_id', 36)->nullable()->comment('null = template default/fallback');
            $table->string('nama', 100);
            $table->string('blade', 100)->comment('nama file blade tanpa .blade.php');
            $table->longText('konten')->comment('isi template blade');
            $table->boolean('is_default')->default(false)->comment('template default untuk jenis_faskes ini');
            $table->boolean('aktif')->default(true);
            $table->uuid('dibuat_oleh')->nullable();
            $table->timestamps();

            $table->foreign('jenis_faskes_id')->references('id')->on('jenis_faskes')->nullOnDelete();
            $table->index(['jenis_faskes_id', 'aktif']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pks_templates');
    }
};
