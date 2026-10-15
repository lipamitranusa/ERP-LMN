<?php

namespace Database\Seeders;

use App\Models\PaymentSetting;
use Illuminate\Database\Seeder;

class PaymentSettingSeeder extends Seeder
{
    public function run(): void
    {
        $defaults = [
            // Gateway umum
            ['kategori' => 'gateway', 'kunci' => 'enabled',    'nilai' => '1',          'label' => 'Payment Gateway Aktif',          'tipe' => 'boolean', 'options' => null],
            ['kategori' => 'gateway', 'kunci' => 'driver',     'nilai' => 'midtrans',   'label' => 'Gateway Pembayaran',              'tipe' => 'select',  'options' => json_encode(['choices' => ['midtrans' => 'Midtrans', 'xendit' => 'Xendit', 'fake' => 'Fake (Development)']])],
            ['kategori' => 'gateway', 'kunci' => 'mode',       'nilai' => 'sandbox',    'label' => 'Mode',                             'tipe' => 'select',  'options' => json_encode(['choices' => ['sandbox' => 'Sandbox / Testing', 'production' => 'Production']])],

            // Midtrans
            ['kategori' => 'midtrans', 'kunci' => 'server_key',   'nilai' => '', 'label' => 'Server Key',      'tipe' => 'password', 'options' => null],
            ['kategori' => 'midtrans', 'kunci' => 'client_key',    'nilai' => '', 'label' => 'Client Key',      'tipe' => 'text',      'options' => null],
            ['kategori' => 'midtrans', 'kunci' => 'merchant_id',   'nilai' => '', 'label' => 'Merchant ID',     'tipe' => 'text',      'options' => null],
            ['kategori' => 'midtrans', 'kunci' => 'va_bank',       'nilai' => 'bca', 'label' => 'Bank Default VA', 'tipe' => 'select', 'options' => json_encode(['choices' => ['bca' => 'BCA', 'bni' => 'BNI', 'mandiri' => 'Mandiri', 'permata' => 'Permata', 'bri' => 'BRI']])],

            // Xendit
            ['kategori' => 'xendit', 'kunci' => 'api_key',         'nilai' => '', 'label' => 'API Key',          'tipe' => 'password', 'options' => null],
            ['kategori' => 'xendit', 'kunci' => 'callback_token',  'nilai' => '', 'label' => 'Callback Token',  'tipe' => 'password', 'options' => null],
            ['kategori' => 'xendit', 'kunci' => 'channel_code',    'nilai' => 'BCA', 'label' => 'Channel Code',   'tipe' => 'select',   'options' => json_encode(['choices' => ['BCA' => 'BCA', 'BNI' => 'BNI', 'MANDIRI' => 'Mandiri', 'BRI' => 'BRI', 'PERMATA' => 'Permata']])],

            // Umum
            ['kategori' => 'general', 'kunci' => 'due_days',   'nilai' => '30', 'label' => 'Hari Jatuh Tempo',  'tipe' => 'number', 'options' => json_encode(['min' => 1, 'max' => 365])],
            ['kategori' => 'general', 'kunci' => 'admin_email', 'nilai' => '',  'label' => 'Email Notifikasi Admin', 'tipe' => 'text', 'options' => null],
        ];

        foreach ($defaults as $row) {
            PaymentSetting::updateOrCreate(
                ['kategori' => $row['kategori'], 'kunci' => $row['kunci']],
                [
                    'nilai' => $row['nilai'],
                    'label' => $row['label'],
                    'tipe' => $row['tipe'],
                    'options' => $row['options'],
                ]
            );
        }
    }
}
