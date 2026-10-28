<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RolesSeeder::class,
            MenuActionsSeeder::class,
            RolePrivilegesSeeder::class,
            LembagaSeeder::class,
            JenisFaskesSeeder::class,
            FaskesSeeder::class,
            TenagaAhliSeeder::class,
            KategoriJurnalSeeder::class,
            CoaSeeder::class,
            ReplikasiMasterAkuntansiSeeder::class,
            KonfigurasiPajakSeeder::class,
            MasterBiayaTenagaAhliSeeder::class,
            BiayaPerJenisFaskesSeeder::class,
            // Akun WAJIB di-seed sebelum seeder transaksi (pks, invoice,
            // checklist, ...) — kolom FK seperti pks.dibuat_oleh dan
            // invoice.dibuat_oleh menunjuk akun_pengguna.id. Kalau akun
            // di-seed belakangan, insert transaksi gagal FK.
            AkunPenggunaSeeder::class,
            AkunPenggunaLembagaSeeder::class,
            SiklusAkreditasiSeeder::class,
            PksSeeder::class,
            InvoiceSeeder::class,
            InvoiceItemsSeeder::class,
            PenugasanSeeder::class,
            SuratTugasSeeder::class,
            HistoriAntrianPenugasanSeeder::class,
            DokumenPermohonanSeeder::class,
            ChecklistValidasiSeeder::class,
            LaporanPengerjaanSeeder::class,
            KonfigurasiPenugasanSeeder::class,
            PksTemplatesSeeder::class,
            PaymentSettingsSeeder::class,
            MailSettingsSeeder::class,
            WhatsappSettingsSeeder::class,
        ]);
    }
}