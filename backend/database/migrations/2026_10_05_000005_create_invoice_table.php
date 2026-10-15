<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('pks_id')->constrained('pks')->cascadeOnDelete();
            $table->decimal('total_tagihan', 15, 2);
            $table->date('due_date')->nullable();
            $table->string('status', 50);

            $table->index('status');
            $table->index('due_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice');
    }
};
