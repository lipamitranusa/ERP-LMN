<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ledger_entries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('siklus_id')->constrained('siklus_akreditasi')->cascadeOnDelete();
            $table->foreignUuid('invoice_id')->nullable()->constrained('invoice')->nullOnDelete();
            $table->foreignUuid('konfigurasi_pajak_id')->nullable()->constrained('konfigurasi_pajak')->nullOnDelete();
            $table->string('tipe', 50);
            $table->decimal('nominal_bruto', 15, 2);
            $table->decimal('potongan_ppn', 15, 2)->default(0);
            $table->decimal('potongan_pph', 15, 2)->default(0);
            $table->decimal('nominal_neto', 15, 2);
            $table->timestamp('created_at')->useCurrent();

            $table->index(['siklus_id', 'tipe']);
            $table->index('invoice_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ledger_entries');
    }
};
