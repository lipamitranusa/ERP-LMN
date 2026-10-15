<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('siklus_akreditasi', function (Blueprint $table) {
            if (!Schema::hasColumn('siklus_akreditasi', 'tahapan')) {
                $table->unsignedTinyInteger('tahapan')->nullable()->after('status_kelengkapan');
            }
            if (!Schema::hasColumn('siklus_akreditasi', 'sub_tahapan_survei')) {
                $table->unsignedTinyInteger('sub_tahapan_survei')->nullable()->after('tahapan');
            }
            if (!Schema::hasColumn('siklus_akreditasi', 'tahapan') && !Schema::hasIndex('siklus_akreditasi', 'siklus_akreditasi_tahapan_index')) {
                // noop — handled above
            }
        });

        // Backfill only if column exists and has NULL values
        if (Schema::hasColumn('siklus_akreditasi', 'tahapan')) {
            // Cek apakah invoice.siklus_id ada (ditambahkan kemudian); skip subquery jika belum
            $hasSiklusIdOnInvoice = Schema::hasColumn('invoice', 'siklus_id');
            $invoiceSubquery = $hasSiklusIdOnInvoice
                ? "WHEN EXISTS (SELECT 1 FROM invoice WHERE invoice.siklus_id = siklus_akreditasi.id AND invoice.status IN ('lunas','dibayar')) THEN 5
                    ELSE 4"
                : "ELSE 4";

            DB::statement("
                UPDATE siklus_akreditasi SET tahapan =
                    CASE
                        WHEN status IN ('selesai', 'terakreditasi') THEN 7
                        WHEN EXISTS (SELECT 1 FROM pks WHERE pks.siklus_id = siklus_akreditasi.id AND pks.status IN ('disetujui','selesai')) THEN
                            CASE
                                {$invoiceSubquery}
                            END
                        WHEN EXISTS (SELECT 1 FROM pks WHERE pks.siklus_id = siklus_akreditasi.id AND pks.status IN ('dikirim','ditandatangani')) THEN 3
                        WHEN status_kelengkapan = 'lengkap' THEN 2
                        ELSE 1
                    END
                WHERE tahapan IS NULL
            ");
        }
    }

    public function down(): void
    {
        Schema::table('siklus_akreditasi', function (Blueprint $table) {
            if (Schema::hasColumn('siklus_akreditasi', 'tahapan')) {
                $table->dropIndex(['tahapan']);
                $table->dropColumn(['tahapan', 'sub_tahapan_survei']);
            }
        });
    }
};
