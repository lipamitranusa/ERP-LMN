<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Multi-lembaga untuk akun_pengguna:
     *
     * - Buat pivot table `akun_pengguna_lembaga` (user_id, lembaga_id)
     * - Buat `akun_pengguna.lembaga_id` jadi nullable (sebelumnya NOT NULL)
     *   sebagai "default" / "primary" lembaga — tetap dipakai untuk
     *   fallback session lembaga di login flow.
     * - Backfill: untuk setiap user, copy lembaga_id ke pivot.
     *
     * Setelah migration, `akun_pengguna.lembaga_id`:
     *   - Diisi = lembaga default user (dipakai login flow + fallback)
     *   - NULL  = user multi-lembaga tanpa default; login flow pilih
     *             dari pivot (atau user pilih via UI switcher)
     */
    public function up(): void
    {
        // 1. Buat pivot table
        Schema::create('akun_pengguna_lembaga', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('akun_pengguna_id')
                ->constrained('akun_pengguna')->cascadeOnDelete();
            $table->foreignUuid('lembaga_id')
                ->constrained('lembaga')->cascadeOnDelete();
            $table->timestamps();

            // 1 user hanya bisa 1 entry per lembaga (unique pair)
            $table->unique(['akun_pengguna_id', 'lembaga_id'], 'apl_user_lembaga_unique');
        });

        // 2. Drop FK constraint, drop column lembaga_id, lalu add ulang
        // sebagai nullable. Dilakukan terpisah karena Laravel's foreignUuid
        // gagal jika kolom sudah ada.
        // (Nama constraint aktual: akun_pengguna_lembaga_id_lembaga_fk)
        Schema::table('akun_pengguna', function (Blueprint $table) {
            $table->dropForeign('akun_pengguna_lembaga_id_lembaga_fk');
        });
        Schema::table('akun_pengguna', function (Blueprint $table) {
            $table->dropColumn('lembaga_id');
        });
        Schema::table('akun_pengguna', function (Blueprint $table) {
            $table->foreignUuid('lembaga_id')->nullable()
                ->constrained('lembaga')->nullOnDelete();
        });

        // 3. Backfill pivot dari akun_pengguna.lembaga_id
        $now = now();
        $rows = DB::table('akun_pengguna')
            ->whereNotNull('lembaga_id')
            ->get(['id', 'lembaga_id']);
        $inserts = $rows->map(fn ($r) => [
            'akun_pengguna_id' => $r->id,
            'lembaga_id' => $r->lembaga_id,
            'created_at' => $now,
            'updated_at' => $now,
        ])->all();
        if (! empty($inserts)) {
            DB::table('akun_pengguna_lembaga')->insert($inserts);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('akun_pengguna_lembaga');

        Schema::table('akun_pengguna', function (Blueprint $table) {
            $table->dropForeign('akun_pengguna_lembaga_id_lembaga_fk');
        });
        Schema::table('akun_pengguna', function (Blueprint $table) {
            $table->dropColumn('lembaga_id');
        });
        Schema::table('akun_pengguna', function (Blueprint $table) {
            $table->foreignUuid('lembaga_id')->nullable(false)
                ->constrained('lembaga')->restrictOnDelete();
        });
    }
};
