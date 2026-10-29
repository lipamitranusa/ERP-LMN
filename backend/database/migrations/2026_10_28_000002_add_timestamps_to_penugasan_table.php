<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $hasCreatedAt = Schema::hasColumn('penugasan', 'created_at');

        Schema::table('penugasan', function (Blueprint $table) use ($hasCreatedAt) {
            if (! $hasCreatedAt) {
                $table->timestamp('created_at')->nullable();
                $table->timestamp('updated_at')->nullable();
            }
        });

        // Backfill baris lama: penugasan dibuat bersama siklusnya, jadi
        // created_at diambil dari siklus_akreditasi.created_at.
        DB::table('penugasan')
            ->whereNull('created_at')
            ->orderBy('id')
            ->chunk(200, function ($rows) {
                foreach ($rows as $row) {
                    $created = DB::table('siklus_akreditasi')
                        ->where('id', $row->siklus_id)
                        ->value('created_at');

                    DB::table('penugasan')
                        ->where('id', $row->id)
                        ->update([
                            'created_at' => $created ?? now(),
                            'updated_at' => $created ?? now(),
                        ]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('penugasan', function (Blueprint $table) {
            $table->dropColumn(['created_at', 'updated_at']);
        });
    }
};
