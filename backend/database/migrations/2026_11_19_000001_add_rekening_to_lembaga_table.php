<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lembaga', function (Blueprint $table) {
            if (! Schema::hasColumn('lembaga', 'no_rekening')) {
                $table->string('no_rekening', 50)->nullable()->after('nama');
            }
            if (! Schema::hasColumn('lembaga', 'nama_bank')) {
                $table->string('nama_bank', 100)->nullable()->after('no_rekening');
            }
            if (! Schema::hasColumn('lembaga', 'atas_nama_rekening')) {
                $table->string('atas_nama_rekening', 100)->nullable()->after('nama_bank');
            }
        });
    }

    public function down(): void
    {
        Schema::table('lembaga', function (Blueprint $table) {
            $columns = ['no_rekening', 'nama_bank', 'atas_nama_rekening'];
            foreach ($columns as $column) {
                if (Schema::hasColumn('lembaga', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
