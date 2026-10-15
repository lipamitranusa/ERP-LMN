<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Make notifikasi_tagihan.penugasan_id nullable + drop the FK.
     * Invoice reminders (FR-5.4a) and bukti-approval notifications are
     * not tied to a specific penugasan — they reference a siklus only.
     */
    public function up(): void
    {
        // Drop FK, change to nullable, recreate FK as nullable.
        $driver = DB::getDriverName();
        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE notifikasi_tagihan DROP FOREIGN KEY notifikasi_tagihan_penugasan_id_foreign');
            DB::statement('ALTER TABLE notifikasi_tagihan MODIFY penugasan_id CHAR(36) NULL');
            DB::statement('ALTER TABLE notifikasi_tagihan ADD CONSTRAINT notifikasi_tagihan_penugasan_id_foreign FOREIGN KEY (penugasan_id) REFERENCES penugasan (id) ON DELETE CASCADE');
        } else {
            Schema::table('notifikasi_tagihan', function (Blueprint $table) {
                $table->dropForeign(['penugasan_id']);
                $table->foreignUuid('penugasan_id')->nullable()->change()->constrained('penugasan')->cascadeOnDelete();
            });
        }
    }

    public function down(): void
    {
        $driver = DB::getDriverName();
        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE notifikasi_tagihan DROP FOREIGN KEY notifikasi_tagihan_penugasan_id_foreign');
            DB::statement('ALTER TABLE notifikasi_tagihan MODIFY penugasan_id CHAR(36) NOT NULL');
            DB::statement('ALTER TABLE notifikasi_tagihan ADD CONSTRAINT notifikasi_tagihan_penugasan_id_foreign FOREIGN KEY (penugasan_id) REFERENCES penugasan (id) ON DELETE CASCADE');
        } else {
            Schema::table('notifikasi_tagihan', function (Blueprint $table) {
                $table->dropForeign(['penugasan_id']);
                $table->foreignUuid('penugasan_id')->nullable(false)->change()->constrained('penugasan')->cascadeOnDelete();
            });
        }
    }
};
