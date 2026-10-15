<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('invoice_id');
            $table->uuid('biaya_id')->nullable();
            $table->string('nama_biaya', 100);
            $table->text('deskripsi')->nullable();
            $table->decimal('jumlah', 14, 2);
            $table->string('satuan', 30)->default('per_siklus');
            $table->string('tipe', 30)->default('per_siklus');
            $table->boolean('wajib')->default(true);
            $table->timestamps();

            $table->foreign('invoice_id')
                ->references('id')
                ->on('invoice')
                ->cascadeOnDelete();

            $table->foreign('biaya_id')
                ->references('id')
                ->on('biaya_per_jenis_faskes')
                ->nullOnDelete();

            $table->index('invoice_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_items');
    }
};
