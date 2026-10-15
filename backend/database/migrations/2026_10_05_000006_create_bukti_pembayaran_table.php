<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bukti_pembayaran', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('invoice_id')->constrained('invoice')->cascadeOnDelete();
            $table->decimal('nominal', 15, 2);
            $table->string('metode', 50);
            $table->string('status_verifikasi', 50);

            $table->index(['invoice_id', 'status_verifikasi']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bukti_pembayaran');
    }
};
