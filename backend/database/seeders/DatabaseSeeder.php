<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            MenuActionsTableSeeder::class,
            RolesTableSeeder::class,
            DefaultPrivilegesSeeder::class,
            LembagaSeeder::class,
            // Master data
            JenisFaskesSeeder::class,
            FaskesSeeder::class,
            BiayaPerJenisFaskesSeeder::class,
            // SDM
            TenagaAhliSeeder::class,
            // Akun (dari DB, bukan config)
            AkunPenggunaSeeder::class,
            // Template PKS
            PksTemplateSeeder::class,
            // Konfigurasi
            PaymentSettingSeeder::class,
            MailSettingSeeder::class,
            WhatsAppSettingSeeder::class,
            KonfigurasiPajakSeeder::class,
            // Akuntansi
            CoaSeeder::class,
            KategoriJurnalSeeder::class,
            MasterBiayaTenagaAhliSeeder::class,
            // Transaksi dummy
            DummyTransaksiSeeder::class,
        ]);
    }
}