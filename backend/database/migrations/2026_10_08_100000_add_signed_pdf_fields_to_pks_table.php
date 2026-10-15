<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pks', function (Blueprint $table) {
            // Path ke file PKS yang sudah ditandatangani & distempel (upload faskes)
            $table->string('path_signed_pdf')->nullable()->after('path_docx');
            // Tanggal faskes upload signed document
            $table->timestamp('signed_uploaded_at')->nullable()->after('path_signed_pdf');
            // Admin validasi
            $table->timestamp('admin_validated_at')->nullable()->after('signed_uploaded_at');
            $table->foreignUuid('admin_validated_by')->nullable()->after('admin_validated_at')
                ->constrained('akun_pengguna')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('pks', function (Blueprint $table) {
            $table->dropForeign(['admin_validated_by']);
            $table->dropColumn([
                'path_signed_pdf',
                'signed_uploaded_at',
                'admin_validated_at',
                'admin_validated_by',
            ]);
        });
    }
};
