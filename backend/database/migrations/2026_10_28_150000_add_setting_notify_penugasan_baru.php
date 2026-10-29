<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Sakelar notifikasi WhatsApp untuk penugasan baru tenaga ahli.
 *
 * Muncul di tab "Notifikasi" (Pengaturan WhatsApp) — saat OFF, notifikasi
 * WhatsApp penugasan baru tidak dikirim ke tenaga ahli.
 */
return new class extends Migration
{
    public function up(): void
    {
        $exists = DB::table('whatsapp_settings')
            ->where('kategori', 'notifikasi')
            ->where('kunci', 'notify_penugasan_baru')
            ->exists();

        if ($exists) {
            return;
        }

        DB::table('whatsapp_settings')->insert([
            'id' => '01a157fe-ac0e-732c-9d57-26c2f246c480',
            'kategori' => 'notifikasi',
            'kunci' => 'notify_penugasan_baru',
            'nilai' => '1',
            'label' => 'Penugasan baru tenaga ahli',
            'deskripsi' => 'Kirim notifikasi WhatsApp ke tenaga ahli saat admin menugaskan tenaga ahli untuk survei/verifikasi.',
            'tipe' => 'boolean',
            'options' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('whatsapp_settings')
            ->where('kategori', 'notifikasi')
            ->where('kunci', 'notify_penugasan_baru')
            ->delete();
    }
};
