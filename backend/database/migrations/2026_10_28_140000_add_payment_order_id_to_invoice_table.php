<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('invoice', 'payment_order_id')) {
            Schema::table('invoice', function (Blueprint $table) {
                $table->string('payment_order_id', 100)->nullable()->after('payment_reference');
            });
        }

        if (! Schema::hasColumn('invoice', 'payment_qr_url')) {
            Schema::table('invoice', function (Blueprint $table) {
                $table->string('payment_qr_url', 500)->nullable()->after('payment_order_id');
            });
        }

        if (Schema::hasColumn('invoice', 'payment_order_id')) {
            Schema::table('invoice', function (Blueprint $table) {
                $index = 'invoice_payment_order_id_index';
                if (! Schema::hasIndex('invoice', $index)) {
                    $table->index('payment_order_id', 'invoice_payment_order_id_index');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('invoice', 'payment_order_id')) {
            Schema::table('invoice', function (Blueprint $table) {
                if (Schema::hasIndex('invoice', 'invoice_payment_order_id_index')) {
                    $table->dropIndex('invoice_payment_order_id_index');
                }
                $table->dropColumn(['payment_order_id', 'payment_qr_url']);
            });
        }
    }
};
