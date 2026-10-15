<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ledger_entries', function (Blueprint $table) {
            // Snapshot JSON untuk metadata honor (penugasan_id, tarif_snapshot, dll)
            // — disimpan sebagai JSON agar audit trail tidak hilang.
            if (! Schema::hasColumn('ledger_entries', 'detail')) {
                $table->json('detail')->nullable()->after('nominal_neto');
            }
            // Referensi eksplisit ke Tenaga Ahli penerima honor
            // (berguna untuk Bukti Potong per periode — FR-5.8).
            if (! Schema::hasColumn('ledger_entries', 'penerima_tenaga_ahli_id')) {
                $table->foreignUuid('penerima_tenaga_ahli_id')->nullable()
                    ->after('invoice_id')
                    ->constrained('tenaga_ahli')->nullOnDelete();
            }
            $table->index('penerima_tenaga_ahli_id');
            $table->index('tipe');
        });
    }

    public function down(): void
    {
        Schema::table('ledger_entries', function (Blueprint $table) {
            if (Schema::hasColumn('ledger_entries', 'penerima_tenaga_ahli_id')) {
                $table->dropForeign(['penerima_tenaga_ahli_id']);
            }
            $table->dropColumn(['detail', 'penerima_tenaga_ahli_id']);
        });
    }
};
