<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoice', function (Blueprint $table) {
            if (! Schema::hasColumn('invoice', 'va_bank')) {
                $table->string('va_bank', 20)->nullable()->after('payment_expired_at')
                    ->comment('Kode bank VA (bca/bni/mandiri/bri/permata)');
            }
        });
    }

    public function down(): void
    {
        Schema::table('invoice', function (Blueprint $table) {
            if (Schema::hasColumn('invoice', 'va_bank')) {
                $table->dropColumn('va_bank');
            }
        });
    }
};
