<?php

namespace Database\Seeders;

use App\Models\MailSetting;
use Illuminate\Database\Seeder;

class MailSettingSeeder extends Seeder
{
    public function run(): void
    {
        $defaults = [
            // Umum
            [
                'kategori' => 'umum',
                'kunci' => 'enabled',
                'nilai' => '1',
                'label' => 'Email Aktif',
                'tipe' => 'boolean',
                'options' => null,
            ],
            [
                'kategori' => 'umum',
                'kunci' => 'driver',
                'nilai' => 'smtp',
                'label' => 'Driver Pengiriman',
                'tipe' => 'select',
                'options' => json_encode([
                    'choices' => [
                        'smtp' => 'SMTP (Email Biasa)',
                        'mailgun' => 'Mailgun',
                        'ses' => 'Amazon SES',
                        'postmark' => 'Postmark',
                        'mailtrap' => 'Mailtrap (Development)',
                        'log' => 'Log saja (Development)',
                    ],
                ]),
            ],
            // SMTP
            [
                'kategori' => 'smtp',
                'kunci' => 'host',
                'nilai' => '',
                'label' => 'SMTP Host',
                'tipe' => 'text',
                'options' => json_encode(['placeholder' => 'smtp.gmail.com / mail.smtp2u.com']),
            ],
            [
                'kategori' => 'smtp',
                'kunci' => 'port',
                'nilai' => '587',
                'label' => 'Port',
                'tipe' => 'number',
                'options' => json_encode(['min' => 1, 'max' => 65535, 'placeholder' => '587 (TLS) atau 465 (SSL)']),
            ],
            [
                'kategori' => 'smtp',
                'kunci' => 'encryption',
                'nilai' => 'tls',
                'label' => 'Enkripsi',
                'tipe' => 'select',
                'options' => json_encode(['choices' => [
                    'tls' => 'TLS',
                    'ssl' => 'SSL',
                    '' => 'Tanpa Enkripsi',
                ]]),
            ],
            [
                'kategori' => 'smtp',
                'kunci' => 'username',
                'nilai' => '',
                'label' => 'Username / Email',
                'tipe' => 'text',
                'options' => json_encode(['placeholder' => 'noreply@lembaga.ac.id']),
            ],
            [
                'kategori' => 'smtp',
                'kunci' => 'password',
                'nilai' => '',
                'label' => 'Password / App Password',
                'tipe' => 'password',
                'options' => json_encode(['placeholder' => 'Gunakan App Password untuk Gmail']),
            ],
            [
                'kategori' => 'smtp',
                'kunci' => 'from_address',
                'nilai' => '',
                'label' => 'Alamat Pengirim (From)',
                'tipe' => 'email',
                'options' => json_encode(['placeholder' => 'noreply@lembaga.ac.id']),
            ],
            [
                'kategori' => 'smtp',
                'kunci' => 'from_name',
                'nilai' => 'LIPA MITRA NUSA',
                'label' => 'Nama Pengirim (From Name)',
                'tipe' => 'text',
                'options' => json_encode(['placeholder' => 'Lembaga Akreditasi LIPA MITRA NUSA']),
            ],
            // Mailgun
            [
                'kategori' => 'mailgun',
                'kunci' => 'domain',
                'nilai' => '',
                'label' => 'Domain Mailgun',
                'tipe' => 'text',
                'options' => json_encode(['placeholder' => 'mg.lembaga.ac.id']),
            ],
            [
                'kategori' => 'mailgun',
                'kunci' => 'secret',
                'nilai' => '',
                'label' => 'Mailgun Secret API Key',
                'tipe' => 'password',
                'options' => null,
            ],
            // Umum - notifikasi
            [
                'kategori' => 'notifikasi',
                'kunci' => 'admin_email',
                'nilai' => '',
                'label' => 'Email Admin Notifikasi',
                'tipe' => 'email',
                'options' => json_encode(['placeholder' => 'admin@lembaga.ac.id']),
            ],
            [
                'kategori' => 'notifikasi',
                'kunci' => 'notify_on_invoice_paid',
                'nilai' => '1',
                'label' => 'Kirim notifikasi saat invoice lunas',
                'tipe' => 'boolean',
                'options' => null,
            ],
            [
                'kategori' => 'notifikasi',
                'kunci' => 'notify_on_pks_signed',
                'nilai' => '1',
                'label' => 'Kirim notifikasi saat PKS ditandatangani',
                'tipe' => 'boolean',
                'options' => null,
            ],
            [
                'kategori' => 'notifikasi',
                'kunci' => 'notify_on_surat_tugas',
                'nilai' => '1',
                'label' => 'Kirim notifikasi Surat Tugas ke Surveior',
                'tipe' => 'boolean',
                'options' => null,
            ],
        ];

        foreach ($defaults as $row) {
            MailSetting::updateOrCreate(
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
