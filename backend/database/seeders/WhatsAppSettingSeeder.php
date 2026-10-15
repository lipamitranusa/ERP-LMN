<?php

namespace Database\Seeders;

use App\Models\WhatsAppSetting;
use Illuminate\Database\Seeder;

class WhatsAppSettingSeeder extends Seeder
{
    public function run(): void
    {
        $defaults = [
            // ── Umum ──────────────────────────────────────────────────────────────
            [
                'kategori' => 'umum',
                'kunci' => 'enabled',
                'nilai' => '0',
                'label' => 'WhatsApp Aktif',
                'deskripsi' => 'Aktifkan notifikasi WhatsApp menggunakan Meta WhatsApp Business API.',
                'tipe' => 'boolean',
                'options' => null,
            ],
            [
                'kategori' => 'umum',
                'kunci' => 'driver',
                'nilai' => 'whatsapp_cloud',
                'label' => 'Driver',
                'deskripsi' => 'Pilih driver pengiriman pesan WhatsApp.',
                'tipe' => 'select',
                'options' => json_encode([
                    'choices' => [
                        'whatsapp_cloud' => 'WhatsApp Cloud API (Meta)',
                        'fonnte' => 'Fonnte (Gateway Indonesia)',
                        'log' => 'Log saja (Development)',
                    ],
                ]),
            ],
            // ── Fonnte Gateway ───────────────────────────────────────────────────
            [
                'kategori' => 'fonnte',
                'kunci' => 'api_token',
                'nilai' => '',
                'label' => 'API Token',
                'deskripsi' => 'Token dari dashboard Fonnte (https://dashboard.fonnte.com → Device → Token).',
                'tipe' => 'password',
                'options' => json_encode(['placeholder' => 'Token dari dashboard Fonnte']),
            ],
            [
                'kategori' => 'fonnte',
                'kunci' => 'device_number',
                'nilai' => '',
                'label' => 'Nomor Perangkat',
                'deskripsi' => 'Nomor pengirim (format 628xxx). Kosongkan jika akun Fonnte hanya punya satu device yang ter-scan.',
                'tipe' => 'text',
                'options' => json_encode(['placeholder' => '6281234567890']),
            ],
            // ── WhatsApp Cloud API ────────────────────────────────────────────────
            [
                'kategori' => 'whatsapp_cloud',
                'kunci' => 'app_id',
                'nilai' => '',
                'label' => 'App ID',
                'deskripsi' => 'Application ID dari Meta Developer Console.',
                'tipe' => 'text',
                'options' => json_encode(['placeholder' => 'Contoh: 1234567890123456']),
            ],
            [
                'kategori' => 'whatsapp_cloud',
                'kunci' => 'app_secret',
                'nilai' => '',
                'label' => 'App Secret',
                'deskripsi' => 'Application Secret dari Meta Developer Console.',
                'tipe' => 'password',
                'options' => json_encode(['placeholder' => 'Application Secret dari Meta Developer Console']),
            ],
            [
                'kategori' => 'whatsapp_cloud',
                'kunci' => 'phone_number_id',
                'nilai' => '',
                'label' => 'Phone Number ID',
                'deskripsi' => 'ID nomor telepon WhatsApp Business yang terdaftar di Meta.',
                'tipe' => 'text',
                'options' => json_encode(['placeholder' => 'Contoh: 123456789012345']),
            ],
            [
                'kategori' => 'whatsapp_cloud',
                'kunci' => 'business_account_id',
                'nilai' => '',
                'label' => 'Business Account ID',
                'deskripsi' => 'Business Account ID dari Meta Business Manager.',
                'tipe' => 'text',
                'options' => json_encode(['placeholder' => 'Contoh: 987654321']),
            ],
            [
                'kategori' => 'whatsapp_cloud',
                'kunci' => 'verify_token',
                'nilai' => '',
                'label' => 'Verify Token (Webhook)',
                'deskripsi' => 'Token untuk verifikasi webhook dari Meta. Buat string acak dan samakan di Meta Console.',
                'tipe' => 'text',
                'options' => json_encode(['placeholder' => 'Buat string acak, contoh: wa_verify_abc123xyz']),
            ],
            [
                'kategori' => 'whatsapp_cloud',
                'kunci' => 'api_version',
                'nilai' => 'v18.0',
                'label' => 'API Version',
                'deskripsi' => 'Versi WhatsApp Cloud API yang digunakan.',
                'tipe' => 'text',
                'options' => json_encode(['placeholder' => 'v18.0']),
            ],
            [
                'kategori' => 'whatsapp_cloud',
                'kunci' => 'webhook_url',
                'nilai' => '/api/webhooks/whatsapp',
                'label' => 'Webhook URL',
                'deskripsi' => 'URL endpoint webhook yang dikonfigurasi di Meta Console.',
                'tipe' => 'text',
                'options' => json_encode(['placeholder' => '/api/webhooks/whatsapp']),
            ],
            // ── Notifikasi ────────────────────────────────────────────────────────
            [
                'kategori' => 'notifikasi',
                'kunci' => 'notify_pendaftaran_baru',
                'nilai' => '1',
                'label' => 'Pendaftaran baru faskes',
                'deskripsi' => 'Kirim notifikasi ke admin saat faskes mengajukan pendaftaran baru.',
                'tipe' => 'boolean',
                'options' => null,
            ],
            [
                'kategori' => 'notifikasi',
                'kunci' => 'notify_status_dokumen',
                'nilai' => '1',
                'label' => 'Status dokumen berubah',
                'deskripsi' => 'Kirim notifikasi ke faskes saat tim validator mengubah status dokumen.',
                'tipe' => 'boolean',
                'options' => null,
            ],
            [
                'kategori' => 'notifikasi',
                'kunci' => 'notify_dokumen_divalidasi',
                'nilai' => '1',
                'label' => 'Dokumen divalidasi lengkap',
                'deskripsi' => 'Kirim notifikasi saat semua dokumen dinyatakan lengkap.',
                'tipe' => 'boolean',
                'options' => null,
            ],
            [
                'kategori' => 'notifikasi',
                'kunci' => 'notify_survei_jadwal',
                'nilai' => '1',
                'label' => 'Jadwal survei terbit',
                'deskripsi' => 'Kirim notifikasi ke faskes saat jadwal survei terbit.',
                'tipe' => 'boolean',
                'options' => null,
            ],
            [
                'kategori' => 'notifikasi',
                'kunci' => 'notify_tagihan_baru',
                'nilai' => '1',
                'label' => 'Tagihan/invoice baru',
                'deskripsi' => 'Kirim notifikasi ke faskes saat invoice baru terbit.',
                'tipe' => 'boolean',
                'options' => null,
            ],
            [
                'kategori' => 'notifikasi',
                'kunci' => 'notify_pembayaran_terkonfirmasi',
                'nilai' => '1',
                'label' => 'Pembayaran terkonfirmasi',
                'deskripsi' => 'Kirim notifikasi ke faskes saat bukti pembayaran diverifikasi.',
                'tipe' => 'boolean',
                'options' => null,
            ],
            [
                'kategori' => 'notifikasi',
                'kunci' => 'notify_kontrak_siap',
                'nilai' => '1',
                'label' => 'Kontrak PKS siap ditandatangani',
                'deskripsi' => 'Kirim notifikasi ke faskes saat kontrak PKS siap ditandatangani.',
                'tipe' => 'boolean',
                'options' => null,
            ],
            [
                'kategori' => 'notifikasi',
                'kunci' => 'notify_sertifikat_jadi',
                'nilai' => '1',
                'label' => 'Sertifikat akreditasi terbit',
                'deskripsi' => 'Kirim notifikasi ke faskes saat sertifikat akreditasi terbit.',
                'tipe' => 'boolean',
                'options' => null,
            ],
            [
                'kategori' => 'notifikasi',
                'kunci' => 'notify_catatan_revisi',
                'nilai' => '1',
                'label' => 'Catatan revisi dokumen',
                'deskripsi' => 'Kirim notifikasi ke faskes saat tim validator memberi catatan revisi.',
                'tipe' => 'boolean',
                'options' => null,
            ],
        ];

        foreach ($defaults as $row) {
            WhatsAppSetting::updateOrCreate(
                ['kategori' => $row['kategori'], 'kunci' => $row['kunci']],
                [
                    'nilai' => $row['nilai'],
                    'label' => $row['label'],
                    'deskripsi' => $row['deskripsi'] ?? null,
                    'tipe' => $row['tipe'],
                    'options' => $row['options'],
                ]
            );
        }
    }
}
