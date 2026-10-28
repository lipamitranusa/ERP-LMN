<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Sanctum default migration membuat tokenable_id sebagai BIGINT untuk User
        // model auto-increment. AkunPengguna memakai UUID (CHAR(36)), sehingga
        // kolom harus diubah ke string. morphs() index juga perlu di-rebuild.
        Schema::table('personal_access_tokens', function ($table) {
            $table->dropIndex(['tokenable_type', 'tokenable_id']);
        });

        // Ubah tipe kolom lewat raw SQL karena Laravel Blueprint tidak support
        // perubahan tipe langsung untuk indexed morphs columns.
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE personal_access_tokens ALTER COLUMN tokenable_id TYPE VARCHAR(36), ALTER COLUMN tokenable_id SET NOT NULL');
        } else {
            DB::statement('ALTER TABLE personal_access_tokens MODIFY tokenable_id VARCHAR(36) NOT NULL');
        }

        Schema::table('personal_access_tokens', function ($table) {
            $table->index(['tokenable_type', 'tokenable_id'], 'personal_access_tokens_tokenable_index');
        });
    }

    public function down(): void
    {
        Schema::table('personal_access_tokens', function ($table) {
            $table->dropIndex('personal_access_tokens_tokenable_index');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE personal_access_tokens ALTER COLUMN tokenable_id TYPE BIGINT, ALTER COLUMN tokenable_id SET NOT NULL');
        } else {
            DB::statement('ALTER TABLE personal_access_tokens MODIFY tokenable_id BIGINT NOT NULL');
        }

        Schema::table('personal_access_tokens', function ($table) {
            $table->index(['tokenable_type', 'tokenable_id']);
        });
    }
};