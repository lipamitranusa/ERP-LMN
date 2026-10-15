<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lembaga', function (Blueprint $table) {
            if (!Schema::hasColumn('lembaga', 'alamat')) {
                $table->string('alamat', 500)->nullable()->after('nama');
            }
            if (!Schema::hasColumn('lembaga', 'kota')) {
                $table->string('kota', 100)->nullable()->after('alamat');
            }
            if (!Schema::hasColumn('lembaga', 'telepon')) {
                $table->string('telepon', 30)->nullable()->after('kota');
            }
            if (!Schema::hasColumn('lembaga', 'email')) {
                $table->string('email', 100)->nullable()->after('telepon');
            }
            if (!Schema::hasColumn('lembaga', 'website')) {
                $table->string('website', 200)->nullable()->after('email');
            }
            if (!Schema::hasColumn('lembaga', 'nama_cp')) {
                $table->string('nama_cp', 150)->nullable()->after('website');
            }
            if (!Schema::hasColumn('lembaga', 'telepon_cp')) {
                $table->string('telepon_cp', 30)->nullable()->after('nama_cp');
            }
            if (!Schema::hasColumn('lembaga', 'deskripsi')) {
                $table->text('deskripsi')->nullable()->after('telepon_cp');
            }
            if (!Schema::hasColumn('lembaga', 'status')) {
                $table->enum('status', ['aktif', 'nonaktif'])->default('aktif')->after('deskripsi');
            }
            if (!Schema::hasIndex('lembaga', 'lembaga_status_index')) {
                $table->index('status');
            }
        });

        // Update existing lembaga with proper data
        DB::table('lembaga')->where('id', '00000000-0000-0000-0000-000000000001')->update([
            'alamat' => 'Jl. HR Rasuna Said Kav. C-17, Kuningan',
            'kota' => 'Jakarta Selatan',
            'telepon' => '(021) 1234-5678',
            'email' => 'info@limn.co.id',
            'website' => 'https://limn.co.id',
            'nama_cp' => 'Tim Sekretariat LIPA MITRA NUSA',
            'telepon_cp' => '0812-3456-7890',
            'deskripsi' => 'Lembaga Akreditasi Mandiri yang berdiri di bawah payung LIPA MITRA NUSA, berkomitmen meningkatkan mutu fasilitas kesehatan di Indonesia.',
            'status' => 'aktif',
        ]);

        DB::table('lembaga')->where('id', '00000000-0000-0000-0000-000000000002')->update([
            'alamat' => 'Jl. Gatot Subroto No. 22, Jakarta Pusat',
            'kota' => 'Jakarta Pusat',
            'telepon' => '(021) 9876-5432',
            'email' => 'info@lamkesn.co.id',
            'website' => 'https://lamkesn.co.id',
            'nama_cp' => 'Direktorat Akreditasi',
            'telepon_cp' => '0813-9876-5432',
            'deskripsi' => 'Lembaga Akreditasi Mandiri Kesehatan Nusantara — mengakreditasi rumah sakit, klinik, dan puskesmas di seluruh Indonesia.',
            'status' => 'aktif',
        ]);
    }

    public function down(): void
    {
        Schema::table('lembaga', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropColumn([
                'alamat', 'kota', 'telepon', 'email', 'website',
                'nama_cp', 'telepon_cp', 'deskripsi', 'status',
            ]);
        });
    }
};
