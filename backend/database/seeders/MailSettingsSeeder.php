<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class MailSettingsSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
[
            'id' => '01a157fe-abc5-733b-becb-bd1845736f9e',
            'kategori' => 'umum',
            'kunci' => 'enabled',
            'nilai' => '1',
            'label' => 'Email Aktif',
            'deskripsi' => null,
            'tipe' => 'boolean',
            'options' => null,
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-abc7-711b-b6ed-56e5e025d33d',
            'kategori' => 'umum',
            'kunci' => 'driver',
            'nilai' => 'smtp',
            'label' => 'Driver Pengiriman',
            'deskripsi' => null,
            'tipe' => 'select',
            'options' => '"{\\"choices\\":{\\"smtp\\":\\"SMTP (Email Biasa)\\",\\"mailgun\\":\\"Mailgun\\",\\"ses\\":\\"Amazon SES\\",\\"postmark\\":\\"Postmark\\",\\"mailtrap\\":\\"Mailtrap (Development)\\",\\"log\\":\\"Log saja (Development)\\"}}"',
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-abc9-7151-a291-9b8a7348cf51',
            'kategori' => 'smtp',
            'kunci' => 'host',
            'nilai' => '',
            'label' => 'SMTP Host',
            'deskripsi' => null,
            'tipe' => 'text',
            'options' => '"{\\"placeholder\\":\\"smtp.gmail.com \\\\\\/ mail.smtp2u.com\\"}"',
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-abcb-7036-a2c5-fa27774ad85d',
            'kategori' => 'smtp',
            'kunci' => 'port',
            'nilai' => '587',
            'label' => 'Port',
            'deskripsi' => null,
            'tipe' => 'number',
            'options' => '"{\\"min\\":1,\\"max\\":65535,\\"placeholder\\":\\"587 (TLS) atau 465 (SSL)\\"}"',
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-abcc-71ce-8fd1-c51dcfff78c4',
            'kategori' => 'smtp',
            'kunci' => 'encryption',
            'nilai' => 'tls',
            'label' => 'Enkripsi',
            'deskripsi' => null,
            'tipe' => 'select',
            'options' => '"{\\"choices\\":{\\"tls\\":\\"TLS\\",\\"ssl\\":\\"SSL\\",\\"\\":\\"Tanpa Enkripsi\\"}}"',
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-abce-7292-bc54-fe382ba979dd',
            'kategori' => 'smtp',
            'kunci' => 'username',
            'nilai' => '',
            'label' => 'Username / Email',
            'deskripsi' => null,
            'tipe' => 'text',
            'options' => '"{\\"placeholder\\":\\"noreply@lembaga.ac.id\\"}"',
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-abcf-73d5-b548-a17ac9aa926a',
            'kategori' => 'smtp',
            'kunci' => 'password',
            'nilai' => '',
            'label' => 'Password / App Password',
            'deskripsi' => null,
            'tipe' => 'password',
            'options' => '"{\\"placeholder\\":\\"Gunakan App Password untuk Gmail\\"}"',
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-abd0-7345-a9f4-28f648fd8456',
            'kategori' => 'smtp',
            'kunci' => 'from_address',
            'nilai' => '',
            'label' => 'Alamat Pengirim (From)',
            'deskripsi' => null,
            'tipe' => 'email',
            'options' => '"{\\"placeholder\\":\\"noreply@lembaga.ac.id\\"}"',
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-abd1-70c7-94a9-37a064c6b05f',
            'kategori' => 'smtp',
            'kunci' => 'from_name',
            'nilai' => 'LIPA MITRA NUSA',
            'label' => 'Nama Pengirim (From Name)',
            'deskripsi' => null,
            'tipe' => 'text',
            'options' => '"{\\"placeholder\\":\\"Lembaga Akreditasi LIPA MITRA NUSA\\"}"',
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-abd2-7209-a638-0e36d4ab0d68',
            'kategori' => 'mailgun',
            'kunci' => 'domain',
            'nilai' => '',
            'label' => 'Domain Mailgun',
            'deskripsi' => null,
            'tipe' => 'text',
            'options' => '"{\\"placeholder\\":\\"mg.lembaga.ac.id\\"}"',
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-abd4-726a-bdef-c476a54e9981',
            'kategori' => 'mailgun',
            'kunci' => 'secret',
            'nilai' => '',
            'label' => 'Mailgun Secret API Key',
            'deskripsi' => null,
            'tipe' => 'password',
            'options' => null,
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-abd5-71e7-a188-6e02f3f75c00',
            'kategori' => 'notifikasi',
            'kunci' => 'admin_email',
            'nilai' => '',
            'label' => 'Email Admin Notifikasi',
            'deskripsi' => null,
            'tipe' => 'email',
            'options' => '"{\\"placeholder\\":\\"admin@lembaga.ac.id\\"}"',
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-abd7-7213-9d6d-d02531e28e49',
            'kategori' => 'notifikasi',
            'kunci' => 'notify_on_invoice_paid',
            'nilai' => '1',
            'label' => 'Kirim notifikasi saat invoice lunas',
            'deskripsi' => null,
            'tipe' => 'boolean',
            'options' => null,
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-abd9-71d8-8e35-8808667daa5f',
            'kategori' => 'notifikasi',
            'kunci' => 'notify_on_pks_signed',
            'nilai' => '1',
            'label' => 'Kirim notifikasi saat PKS ditandatangani',
            'deskripsi' => null,
            'tipe' => 'boolean',
            'options' => null,
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-abda-73af-9f3a-5747cc11a051',
            'kategori' => 'notifikasi',
            'kunci' => 'notify_on_surat_tugas',
            'nilai' => '1',
            'label' => 'Kirim notifikasi Surat Tugas ke Surveior',
            'deskripsi' => null,
            'tipe' => 'boolean',
            'options' => null,
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ]
        ];

        foreach ($data as $item) {
            DB::table('mail_settings')->updateOrInsert(
                ['id' => $item['id']],
                $item
            );
        }
    }
}