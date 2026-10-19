<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Akun kas/bank default per Lembaga — dipakai oleh
     * SettlementJournalService untuk menentukan sisi Debit/Kredit
     * akun Kas-Bank pada jurnal pelunasan AP/AR yang auto-generated.
     *
     * NULL = service fallback ke COA kode '1102' (Bank BCA) bila ada,
     * atau '1101' (Kas) jika keduanya tidak ada.
     */
    public function up(): void
    {
        Schema::table('lembaga', function (Blueprint $table) {
            if (! Schema::hasColumn('lembaga', 'default_bank_coa_id')) {
                $table->uuid('default_bank_coa_id')->nullable()->after('npwp_diverifikasi_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('lembaga', function (Blueprint $table) {
            if (Schema::hasColumn('lembaga', 'default_bank_coa_id')) {
                $table->dropColumn('default_bank_coa_id');
            }
        });
    }
};
