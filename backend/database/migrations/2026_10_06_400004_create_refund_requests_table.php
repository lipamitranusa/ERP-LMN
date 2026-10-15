<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('refund_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('invoice_id')->constrained('invoice')->cascadeOnDelete();
            $table->foreignUuid('requested_by')->constrained('akun_pengguna')->restrictOnDelete();
            $table->foreignUuid('approved_by')->nullable()->constrained('akun_pengguna')->nullOnDelete();
            $table->text('alasan');
            $table->decimal('nominal', 15, 2);
            $table->string('status', 30)->default('requested');
            $table->timestamp('tanggal_approved')->nullable();
            $table->text('catatan_approval')->nullable();
            $table->foreignUuid('ledger_entry_id')->nullable()
                ->constrained('ledger_entries')->nullOnDelete();
            $table->timestamps();

            $table->index(['invoice_id', 'status']);
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('refund_requests');
    }
};
