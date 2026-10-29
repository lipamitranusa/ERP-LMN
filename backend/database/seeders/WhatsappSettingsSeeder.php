<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class WhatsappSettingsSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
[
            'id' => '01a157fe-abfb-724a-9d57-26c2f246c479',
            'kategori' => 'fonnte',
            'kunci' => 'device_number',
            'nilai' => '',
            'label' => 'Nomor Perangkat',
            'deskripsi' => 'Nomor pengirim (format 628xxx). Kosongkan jika akun Fonnte hanya punya satu device yang ter-scan.',
            'tipe' => 'text',
            'options' => '"{\\"placeholder\\":\\"6281234567890\\"}"',
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-abfc-7070-a30e-a9b633e4fe1d',
            'kategori' => 'whatsapp_cloud',
            'kunci' => 'app_id',
            'nilai' => '',
            'label' => 'App ID',
            'deskripsi' => 'Application ID dari Meta Developer Console.',
            'tipe' => 'text',
            'options' => '"{\\"placeholder\\":\\"Contoh: 1234567890123456\\"}"',
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-ac0d-7285-9955-34be57339f43',
            'kategori' => 'notifikasi',
            'kunci' => 'notify_kontrak_siap',
            'nilai' => '1',
            'label' => 'Kontrak PKS siap ditandatangani',
            'deskripsi' => 'Kirim notifikasi ke faskes saat kontrak PKS siap ditandatangani.',
            'tipe' => 'boolean',
            'options' => null,
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-ac0f-7168-a313-c6052616d4a4',
            'kategori' => 'notifikasi',
            'kunci' => 'notify_sertifikat_jadi',
            'nilai' => '1',
            'label' => 'Sertifikat akreditasi terbit',
            'deskripsi' => 'Kirim notifikasi ke faskes saat sertifikat akreditasi terbit.',
            'tipe' => 'boolean',
            'options' => null,
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-ac10-732c-932e-896e1f154945',
            'kategori' => 'notifikasi',
            'kunci' => 'notify_catatan_revisi',
            'nilai' => '1',
            'label' => 'Catatan revisi dokumen',
            'deskripsi' => 'Kirim notifikasi ke faskes saat tim validator memberi catatan revisi.',
            'tipe' => 'boolean',
            'options' => null,
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-abf6-7173-91b3-676343573097',
            'kategori' => 'umum',
            'kunci' => 'enabled',
            'nilai' => '0',
            'label' => 'WhatsApp Aktif',
            'deskripsi' => 'Aktifkan notifikasi WhatsApp menggunakan Meta WhatsApp Business API.',
            'tipe' => 'boolean',
            'options' => null,
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-abf8-716f-8546-0f242224ab04',
            'kategori' => 'umum',
            'kunci' => 'driver',
            'nilai' => 'whatsapp_cloud',
            'label' => 'Driver',
            'deskripsi' => 'Pilih driver pengiriman pesan WhatsApp.',
            'tipe' => 'select',
            'options' => '"{\\"choices\\":{\\"whatsapp_cloud\\":\\"WhatsApp Cloud API (Meta)\\",\\"fonnte\\":\\"Fonnte (Gateway Indonesia)\\",\\"log\\":\\"Log saja (Development)\\"}}"',
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-abfa-70b2-ae9e-0f94359a11ea',
            'kategori' => 'fonnte',
            'kunci' => 'api_token',
            'nilai' => '',
            'label' => 'API Token',
            'deskripsi' => 'Token dari dashboard Fonnte (https://dashboard.fonnte.com → Device → Token).',
            'tipe' => 'password',
            'options' => '"{\\"placeholder\\":\\"Token dari dashboard Fonnte\\"}"',
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-abfe-7006-939e-7727a99d306d',
            'kategori' => 'whatsapp_cloud',
            'kunci' => 'app_secret',
            'nilai' => '',
            'label' => 'App Secret',
            'deskripsi' => 'Application Secret dari Meta Developer Console.',
            'tipe' => 'password',
            'options' => '"{\\"placeholder\\":\\"Application Secret dari Meta Developer Console\\"}"',
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-abff-7071-aa2f-75af3decc12c',
            'kategori' => 'whatsapp_cloud',
            'kunci' => 'phone_number_id',
            'nilai' => '',
            'label' => 'Phone Number ID',
            'deskripsi' => 'ID nomor telepon WhatsApp Business yang terdaftar di Meta.',
            'tipe' => 'text',
            'options' => '"{\\"placeholder\\":\\"Contoh: 123456789012345\\"}"',
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-ac00-70c7-8e19-0071f3abb142',
            'kategori' => 'whatsapp_cloud',
            'kunci' => 'business_account_id',
            'nilai' => '',
            'label' => 'Business Account ID',
            'deskripsi' => 'Business Account ID dari Meta Business Manager.',
            'tipe' => 'text',
            'options' => '"{\\"placeholder\\":\\"Contoh: 987654321\\"}"',
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-ac02-73df-bafd-15ead19a2f20',
            'kategori' => 'whatsapp_cloud',
            'kunci' => 'verify_token',
            'nilai' => '',
            'label' => 'Verify Token (Webhook)',
            'deskripsi' => 'Token untuk verifikasi webhook dari Meta. Buat string acak dan samakan di Meta Console.',
            'tipe' => 'text',
            'options' => '"{\\"placeholder\\":\\"Buat string acak, contoh: wa_verify_abc123xyz\\"}"',
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-ac03-708a-84f4-bbd019067e38',
            'kategori' => 'whatsapp_cloud',
            'kunci' => 'api_version',
            'nilai' => 'v18.0',
            'label' => 'API Version',
            'deskripsi' => 'Versi WhatsApp Cloud API yang digunakan.',
            'tipe' => 'text',
            'options' => '"{\\"placeholder\\":\\"v18.0\\"}"',
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-ac04-7335-83be-d9043bfecbfc',
            'kategori' => 'whatsapp_cloud',
            'kunci' => 'webhook_url',
            'nilai' => '/api/webhooks/whatsapp',
            'label' => 'Webhook URL',
            'deskripsi' => 'URL endpoint webhook yang dikonfigurasi di Meta Console.',
            'tipe' => 'text',
            'options' => '"{\\"placeholder\\":\\"\\\\\\/api\\\\\\/webhooks\\\\\\/whatsapp\\"}"',
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-ac06-7188-bb35-e88cc3679bc2',
            'kategori' => 'notifikasi',
            'kunci' => 'notify_pendaftaran_baru',
            'nilai' => '1',
            'label' => 'Pendaftaran baru faskes',
            'deskripsi' => 'Kirim notifikasi ke admin saat faskes mengajukan pendaftaran baru.',
            'tipe' => 'boolean',
            'options' => null,
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-ac07-72f6-bdf9-2024b07e5f0f',
            'kategori' => 'notifikasi',
            'kunci' => 'notify_status_dokumen',
            'nilai' => '1',
            'label' => 'Status dokumen berubah',
            'deskripsi' => 'Kirim notifikasi ke faskes saat tim validator mengubah status dokumen.',
            'tipe' => 'boolean',
            'options' => null,
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-ac08-705d-a390-ffcaa79b513a',
            'kategori' => 'notifikasi',
            'kunci' => 'notify_dokumen_divalidasi',
            'nilai' => '1',
            'label' => 'Dokumen divalidasi lengkap',
            'deskripsi' => 'Kirim notifikasi saat semua dokumen dinyatakan lengkap.',
            'tipe' => 'boolean',
            'options' => null,
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-ac0a-7105-a1e8-850a70f4fc89',
            'kategori' => 'notifikasi',
            'kunci' => 'notify_survei_jadwal',
            'nilai' => '1',
            'label' => 'Jadwal survei terbit',
            'deskripsi' => 'Kirim notifikasi ke faskes saat jadwal survei terbit.',
            'tipe' => 'boolean',
            'options' => null,
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-ac0b-720d-a454-1c6feb94e56c',
            'kategori' => 'notifikasi',
            'kunci' => 'notify_tagihan_baru',
            'nilai' => '1',
            'label' => 'Tagihan/invoice baru',
            'deskripsi' => 'Kirim notifikasi ke faskes saat invoice baru terbit.',
            'tipe' => 'boolean',
            'options' => null,
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-ac0e-732c-9d57-26c2f246c480',
            'kategori' => 'notifikasi',
            'kunci' => 'notify_penugasan_baru',
            'nilai' => '1',
            'label' => 'Penugasan baru tenaga ahli',
            'deskripsi' => 'Kirim notifikasi WhatsApp ke tenaga ahli saat admin menugaskan tenaga ahli untuk survei/verifikasi.',
            'tipe' => 'boolean',
            'options' => null,
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-ac0c-73af-b892-8f012954c803',
            'kategori' => 'notifikasi',
            'kunci' => 'notify_pembayaran_terkonfirmasi',
            'nilai' => '1',
            'label' => 'Pembayaran terkonfirmasi',
            'deskripsi' => 'Kirim notifikasi ke faskes saat bukti pembayaran diverifikasi.',
            'tipe' => 'boolean',
            'options' => null,
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ]
        ];

        foreach ($data as $item) {
            DB::table('whatsapp_settings')->updateOrInsert(
                ['id' => $item['id']],
                $item
            );
        }
    }
}