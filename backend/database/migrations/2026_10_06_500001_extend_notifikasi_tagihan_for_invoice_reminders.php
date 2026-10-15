<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notifikasi_tagihan', function (Blueprint $table) {
            $table->string('channel', 20)->nullable()->after('jenis');
            $table->string('recipient', 100)->nullable()->after('channel');
            $table->text('error_message')->nullable()->after('dikirim_pada');
            $table->unsignedTinyInteger('attempt_count')->default(0)->after('error_message');
            $table->timestamp('next_retry_at')->nullable()->after('attempt_count');
            $table->json('payload')->nullable()->after('detail');

            $table->index('channel');
            $table->index('next_retry_at');
            $table->index(['status', 'next_retry_at']);
        });
    }

    public function down(): void
    {
        Schema::table('notifikasi_tagihan', function (Blueprint $table) {
            $table->dropIndex(['channel']);
            $table->dropIndex(['next_retry_at']);
            $table->dropIndex(['status', 'next_retry_at']);
            $table->dropColumn(['channel', 'recipient', 'error_message', 'attempt_count', 'next_retry_at', 'payload']);
        });
    }
};
