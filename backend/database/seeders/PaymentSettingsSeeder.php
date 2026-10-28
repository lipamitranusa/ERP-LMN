<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PaymentSettingsSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
[
            'id' => '01a157fe-ab74-71e9-8680-211f64f18072',
            'kategori' => 'gateway',
            'kunci' => 'enabled',
            'nilai' => '1',
            'label' => 'Payment Gateway Aktif',
            'deskripsi' => null,
            'tipe' => 'boolean',
            'options' => null,
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-ab98-71c2-8320-c3e2939b23a7',
            'kategori' => 'gateway',
            'kunci' => 'driver',
            'nilai' => 'midtrans',
            'label' => 'Gateway Pembayaran',
            'deskripsi' => null,
            'tipe' => 'select',
            'options' => '"{\\"choices\\":{\\"midtrans\\":\\"Midtrans\\",\\"xendit\\":\\"Xendit\\",\\"fake\\":\\"Fake (Development)\\"}}"',
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-ab9b-71b8-8990-0acc09e86bbc',
            'kategori' => 'gateway',
            'kunci' => 'mode',
            'nilai' => 'sandbox',
            'label' => 'Mode',
            'deskripsi' => null,
            'tipe' => 'select',
            'options' => '"{\\"choices\\":{\\"sandbox\\":\\"Sandbox \\\\\\/ Testing\\",\\"production\\":\\"Production\\"}}"',
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-ab9c-71f3-be85-026119ce92ae',
            'kategori' => 'midtrans',
            'kunci' => 'server_key',
            'nilai' => '',
            'label' => 'Server Key',
            'deskripsi' => null,
            'tipe' => 'password',
            'options' => null,
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-ab9d-70a5-b827-bdf86b196902',
            'kategori' => 'midtrans',
            'kunci' => 'client_key',
            'nilai' => '',
            'label' => 'Client Key',
            'deskripsi' => null,
            'tipe' => 'text',
            'options' => null,
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-ab9f-7386-a2ee-905500f707f9',
            'kategori' => 'midtrans',
            'kunci' => 'merchant_id',
            'nilai' => '',
            'label' => 'Merchant ID',
            'deskripsi' => null,
            'tipe' => 'text',
            'options' => null,
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-aba0-704d-8066-1375b9379d9b',
            'kategori' => 'midtrans',
            'kunci' => 'va_bank',
            'nilai' => 'bca',
            'label' => 'Bank Default VA',
            'deskripsi' => null,
            'tipe' => 'select',
            'options' => '"{\\"choices\\":{\\"bca\\":\\"BCA\\",\\"bni\\":\\"BNI\\",\\"mandiri\\":\\"Mandiri\\",\\"permata\\":\\"Permata\\",\\"bri\\":\\"BRI\\"}}"',
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-aba1-7221-9d1b-4327aefe2033',
            'kategori' => 'xendit',
            'kunci' => 'api_key',
            'nilai' => '',
            'label' => 'API Key',
            'deskripsi' => null,
            'tipe' => 'password',
            'options' => null,
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-aba2-72b0-b54c-3b9f91247ea7',
            'kategori' => 'xendit',
            'kunci' => 'callback_token',
            'nilai' => '',
            'label' => 'Callback Token',
            'deskripsi' => null,
            'tipe' => 'password',
            'options' => null,
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-aba3-7218-a38e-5984f03b931f',
            'kategori' => 'xendit',
            'kunci' => 'channel_code',
            'nilai' => 'BCA',
            'label' => 'Channel Code',
            'deskripsi' => null,
            'tipe' => 'select',
            'options' => '"{\\"choices\\":{\\"BCA\\":\\"BCA\\",\\"BNI\\":\\"BNI\\",\\"MANDIRI\\":\\"Mandiri\\",\\"BRI\\":\\"BRI\\",\\"PERMATA\\":\\"Permata\\"}}"',
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-aba5-70f1-bc4d-ebc48e674b2d',
            'kategori' => 'general',
            'kunci' => 'due_days',
            'nilai' => '30',
            'label' => 'Hari Jatuh Tempo',
            'deskripsi' => null,
            'tipe' => 'number',
            'options' => '"{\\"min\\":1,\\"max\\":365}"',
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-aba6-70b7-9ed8-34a919db38b6',
            'kategori' => 'general',
            'kunci' => 'admin_email',
            'nilai' => '',
            'label' => 'Email Notifikasi Admin',
            'deskripsi' => null,
            'tipe' => 'text',
            'options' => null,
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ]
        ];

        foreach ($data as $item) {
            DB::table('payment_settings')->updateOrInsert(
                ['id' => $item['id']],
                $item
            );
        }
    }
}