<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Backfill `siklus_aknumbered.tahapan` yang masih NULL.
 *
 * Kolom `tahapan` nullable membuat accessor getTahapanAttribute() ikut
 * dijalankan saat model diserialisasi. Accessor tersebut membaca relasi
 * `pks` — dan relasi yang belum di-eager load memicu lazy loading
 * (LazyLoadingViolationException) → HTTP 500 saat daftar siklus dirender.
 *
 * Ditulis dengan query builder (bukan raw SQL) supaya jalan di PostgreSQL
 * (dev) maupun MySQL (test).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('siklus_akreditasi', 'tahapan')) {
            return;
        }

        $rows = DB::table('siklus_akreditasi')
            ->whereNull('tahapan')
            ->select(['id', 'status', 'status_kelengkapan'])
            ->get();

        foreach ($rows as $row) {
            DB::table('siklus_akreditasi')
                ->where('id', $row->id)
                ->update(['tahapan' => $this->derive($row->id, $row->status, $row->status_kelengkapan)]);
        }

        $this->setDefault();
    }

    public function down(): void
    {
        // Backfill tidak bisa dibalik secara bermakna — kolom tetap ada.
    }

    /**
     * Default kolom = 1 (Pendaftaran) supaya insert yang tidak menyertakan
     * `tahapan` tidak menghasilkan NULL.
     */
    private function setDefault(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE siklus_akreditasi ALTER COLUMN tahapan SET DEFAULT 1');
        } elseif ($driver === 'mysql') {
            DB::statement('ALTER TABLE siklus_akreditasi MODIFY tahapan TINYINT UNSIGNED NULL DEFAULT 1');
        } else {
            Schema::table('siklus_akreditasi', function (Blueprint $table) {
                $table->unsignedTinyInteger('tahapan')->nullable()->default(1)->change();
            });
        }
    }

    /**
     * Tahapan (1-7) dari status + pks + invoice — cerminan aturan yang
     * sama dengan accessor SiklusAkreditasi::getTahapanAttribute().
     */
    private function derive(string $siklusId, ?string $status, ?string $kelengkapan): int
    {
        if (in_array($status, ['selesai', 'terakreditasi'], true)) {
            return 7;
        }

        $pks = DB::table('pks')->where('siklus_id', $siklusId)->first();

        if ($pks && in_array($pks->status, ['disetujui', 'selesai'], true)) {
            $invoiceLunas = DB::table('invoice')
                ->where('siklus_id', $siklusId)
                ->whereIn('status', ['lunas', 'dibayar'])
                ->exists();

            return $invoiceLunas ? 5 : 4;
        }

        if ($pks && in_array($pks->status, ['dikirim', 'ditandatangani'], true)) {
            return 3;
        }

        if ($kelengkapan === 'lengkap' || $status === 'menunggu_persetujuan') {
            return 2;
        }

        return 1;
    }
};
