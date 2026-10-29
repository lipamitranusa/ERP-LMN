<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Notification Channels
    |--------------------------------------------------------------------------
    |
    | NFR-1: WhatsApp Business API (Meta Cloud API) is the primary channel.
    | Email is the fallback. The Notifier service tries WhatsApp first,
    | falls back to email on failure, and persists every attempt.
    |
    */

    // Log channel used by the WhatsApp/Email drivers in dev/test
    // (when no real credentials are configured).
    'log_channel' => env('NOTIFIKASI_LOG_CHANNEL', 'stack'),

    // Email mailer for fallback. 'log' / 'array' = dev (no SMTP).
    'email_mailer' => env('NOTIFIKASI_EMAIL_MAILER', env('MAIL_MAILER', 'log')),

    /*
    |--------------------------------------------------------------------------
    | Invoice Reminder Schedule
    |--------------------------------------------------------------------------
    |
    | FR-5.4a: reminders are sent H-3 and H-1 before due date, and a
    | "terlambat" reminder after due date if survei is berjalan.
    | AC-9: only if the invoice is overdue AND a survei is in progress.
    */
    'reminder_offsets_days' => [3, 1],

    // Maximum retry attempts for failed notifications.
    'max_attempts' => 5,

    /*
    |--------------------------------------------------------------------------
    | Notification Message Templates
    |--------------------------------------------------------------------------
    |
    | Katalog jenis notifikasi + format pesan bawaan per kanal. Admin dapat
    | menimpa lewat tab "Format Pesan" (di Pengaturan Mail dan Pengaturan
    | WhatsApp); nilai yang disimpan di tabel `notifikasi_template` selalu
    | menang atas nilai di bawah ini.
    |
    | Placeholder ditulis `{{nama_variabel}}`. `contoh` dipakai sebagai data
    | contoh saat pratinjau di UI.
    |
    | `channels`          → kanal yang mendukung jenis notifikasi ini
    | `body_templateable` → false bila isi pesan pada kanal tersebut bukan
    |                       teks bebas (mis. invoice HTML / slip honor PDF),
    |                       sehingga hanya subjek yang bisa diedit.
    | `aktif`             → false berarti notifikasi jenis ini TIDAK dikirim
    |                       lewat kanal tersebut.
    |
    */
    'templates' => [

        // ── Pengingat tagihan (InvoiceReminderService) ───────────────────
        'tagihan_h3' => [
            'label' => 'Pengingat Tagihan H-3',
            'deskripsi' => 'Dikirim 3 hari sebelum tanggal jatuh tempo invoice.',
            'channels' => ['whatsapp', 'email'],
            'variables' => [
                'nama_faskes' => ['label' => 'Nama Faskes', 'contoh' => 'RS Srcaba'],
                'nomor_invoice' => ['label' => 'Nomor Invoice', 'contoh' => 'INV/2026/0001'],
                'total_tagihan' => ['label' => 'Total Tagihan', 'contoh' => '5.000.000'],
                'due_date' => ['label' => 'Jatuh Tempo', 'contoh' => '13 Oktober 2026'],
                'hari_ke_jatuh_tempo' => ['label' => 'Sisa Hari', 'contoh' => '3'],
                'nama_lembaga' => ['label' => 'Nama Lembaga', 'contoh' => 'Lembaga Akreditasi Kesehatan'],
            ],
            'defaults' => [
                'whatsapp' => [
                    'aktif' => true,
                    'subject' => 'Pengingat: Invoice {{nomor_invoice}} akan jatuh tempo',
                    'body' => <<<'TXT'
Yth. {{nama_faskes}},

Invoice {{nomor_invoice}} sebesar Rp {{total_tagihan}} akan jatuh tempo dalam {{hari_ke_jatuh_tempo}} hari ({{due_date}}). Mohon lakukan pembayaran tepat waktu agar proses survei tetap berjalan.

Terima kasih,
{{nama_lembaga}}
TXT,
                ],
                'email' => [
                    'aktif' => true,
                    'subject' => 'Pengingat: Invoice {{nomor_invoice}} akan jatuh tempo',
                    'body' => <<<'TXT'
Yth. {{nama_faskes}},

Invoice {{nomor_invoice}} sebesar Rp {{total_tagihan}} akan jatuh tempo dalam {{hari_ke_jatuh_tempo}} hari ({{due_date}}). Mohon lakukan pembayaran tepat waktu agar proses survei tetap berjalan.

Terima kasih,
{{nama_lembaga}}
TXT,
                ],
            ],
        ],

        'tagihan_h1' => [
            'label' => 'Pengingat Tagihan H-1',
            'deskripsi' => 'Dikirim 1 hari sebelum tanggal jatuh tempo invoice.',
            'channels' => ['whatsapp', 'email'],
            'variables' => [
                'nama_faskes' => ['label' => 'Nama Faskes', 'contoh' => 'RS Srcaba'],
                'nomor_invoice' => ['label' => 'Nomor Invoice', 'contoh' => 'INV/2026/0001'],
                'total_tagihan' => ['label' => 'Total Tagihan', 'contoh' => '5.000.000'],
                'due_date' => ['label' => 'Jatuh Tempo', 'contoh' => '13 Oktober 2026'],
                'nama_lembaga' => ['label' => 'Nama Lembaga', 'contoh' => 'Lembaga Akreditasi Kesehatan'],
            ],
            'defaults' => [
                'whatsapp' => [
                    'aktif' => true,
                    'subject' => 'Pengingat: Invoice {{nomor_invoice}} akan jatuh tempo',
                    'body' => <<<'TXT'
Yth. {{nama_faskes}},

Invoice {{nomor_invoice}} sebesar Rp {{total_tagihan}} akan jatuh tempo BESOK ({{due_date}}). Mohon segera lakukan pembayaran.

Terima kasih,
{{nama_lembaga}}
TXT,
                ],
                'email' => [
                    'aktif' => true,
                    'subject' => 'Pengingat: Invoice {{nomor_invoice}} akan jatuh tempo',
                    'body' => <<<'TXT'
Yth. {{nama_faskes}},

Invoice {{nomor_invoice}} sebesar Rp {{total_tagihan}} akan jatuh tempo BESOK ({{due_date}}). Mohon segera lakukan pembayaran.

Terima kasih,
{{nama_lembaga}}
TXT,
                ],
            ],
        ],

        'tagihan_overdue' => [
            'label' => 'Tagihan Terlambat',
            'deskripsi' => 'Dikirim setelah tanggal jatuh tempo, selama survei masih berjalan.',
            'channels' => ['whatsapp', 'email'],
            'variables' => [
                'nama_faskes' => ['label' => 'Nama Faskes', 'contoh' => 'RS Srcaba'],
                'nomor_invoice' => ['label' => 'Nomor Invoice', 'contoh' => 'INV/2026/0001'],
                'total_tagihan' => ['label' => 'Total Tagihan', 'contoh' => '5.000.000'],
                'due_date' => ['label' => 'Jatuh Tempo', 'contoh' => '13 Oktober 2026'],
                'nama_lembaga' => ['label' => 'Nama Lembaga', 'contoh' => 'Lembaga Akreditasi Kesehatan'],
            ],
            'defaults' => [
                'whatsapp' => [
                    'aktif' => true,
                    'subject' => 'Tertunda: Invoice {{nomor_invoice}} sudah jatuh tempo',
                    'body' => <<<'TXT'
Yth. {{nama_faskes}},

Invoice {{nomor_invoice}} sebesar Rp {{total_tagihan}} sudah jatuh tempo sejak {{due_date}}. Proses survei Anda saat ini sedang berjalan — mohon segera melunasi pembayaran.

Tidak ada sanksi atau pembatalan proses atas keterlambatan ini; pembayaran tetap dipantau secara terpisah.

Terima kasih,
{{nama_lembaga}}
TXT,
                ],
                'email' => [
                    'aktif' => true,
                    'subject' => 'Tertunda: Invoice {{nomor_invoice}} sudah jatuh tempo',
                    'body' => <<<'TXT'
Yth. {{nama_faskes}},

Invoice {{nomor_invoice}} sebesar Rp {{total_tagihan}} sudah jatuh tempo sejak {{due_date}}. Proses survei Anda saat ini sedang berjalan — mohon segera melunasi pembayaran.

Tidak ada sanksi atau pembatalan proses atas keterlambatan ini; pembayaran tetap dipantau secara terpisah.

Terima kasih,
{{nama_lembaga}}
TXT,
                ],
            ],
        ],

        // ── Invoice / tagihan ke faskes (TagihanNotificationController) ────
        'tagihan_invoice' => [
            'label' => 'Tagihan / Invoice ke Faskes',
            'deskripsi' => 'Invoice yang dikirim manual ke faskes via WhatsApp atau email.',
            'channels' => ['whatsapp', 'email'],
            'variables' => [
                'nama_faskes' => ['label' => 'Nama Faskes', 'contoh' => 'RS Srcaba'],
                'jenis_faskes' => ['label' => 'Jenis Faskes', 'contoh' => 'Rumah Sakit'],
                'alamat' => ['label' => 'Alamat', 'contoh' => 'Jl. Merdeka No. 10'],
                'kota' => ['label' => 'Kota', 'contoh' => 'Bandung'],
                'provinsi' => ['label' => 'Provinsi', 'contoh' => 'Jawa Barat'],
                'telepon' => ['label' => 'Telepon', 'contoh' => '081234567890'],
                'email' => ['label' => 'Email', 'contoh' => 'adm@rs-srcaba.co.id'],
                'nama_pimpinana' => ['label' => 'Penanggung Jawab', 'contoh' => 'dr. Budi Santoso'],
                'nomor_invoice' => ['label' => 'Nomor Invoice', 'contoh' => 'INV/2026/0001'],
                'nomor_pks' => ['label' => 'Nomor PKS', 'contoh' => 'PKS/2026/0001'],
                'tanggal_terbit' => ['label' => 'Tanggal Terbit', 'contoh' => '1 Oktober 2026'],
                'due_date' => ['label' => 'Jatuh Tempo', 'contoh' => '13 Oktober 2026'],
                'status_label' => ['label' => 'Status', 'contoh' => 'BELUM LUNAS'],
                'status_emoji' => ['label' => 'Emoji Status', 'contoh' => '⏳'],
                'total_tagihan' => ['label' => 'Total Tagihan', 'contoh' => '5.000.000'],
                'sisa_tagihan' => ['label' => 'Sisa Tagihan', 'contoh' => '2.000.000'],
                'metode_pembayaran' => ['label' => 'Metode Pembayaran', 'contoh' => 'Virtual Account'],
                'va_number' => ['label' => 'Nomor Virtual Account', 'contoh' => '8801234567890'],
                'va_bank' => ['label' => 'Bank Virtual Account', 'contoh' => 'Bank BJB'],
                'va_expired' => ['label' => 'Berlaku VA Sampai', 'contoh' => '13 Oktober 2026 23:59'],
                'nama_lembaga' => ['label' => 'Nama Lembaga', 'contoh' => 'Lembaga Akreditasi Kesehatan'],
                'siklus_nama' => ['label' => 'Nama Siklus', 'contoh' => 'Akreditasi RS Srcaba 2026'],
                'tanggal_cetak' => ['label' => 'Tanggal Cetak', 'contoh' => '1 Oktober 2026 10:15'],
                'blok_sisa' => ['label' => 'Blok Sisa Tagihan', 'contoh' => "Sisa Tagihan  : Rp 2.000.000\n"],
                'blok_jatuh_tempo' => ['label' => 'Blok Jatuh Tempo', 'contoh' => "⏰ Jatuh tempo dalam *3 hari*\n"],
                'blok_va' => ['label' => 'Blok Virtual Account', 'contoh' => "🏦 *Virtual Account*: 8801234567890\n   Bank: Bank BJB\n"],
            ],
            'defaults' => [
                'whatsapp' => [
                    'aktif' => true,
                    'subject' => 'Invoice {{nomor_invoice}} — {{nama_faskes}}',
                    'body' => <<<'TXT'
🏥 *INVOICE AKREDITASI FASKES*

Yth. *{{nama_faskes}}*

Berikut detail tagihan akreditasi untuk institutions Anda:

📋 *Detail Invoice*
No. Invoice    : {{nomor_invoice}}
Tanggal        : {{tanggal_terbit}}
Jatuh Tempo    : {{due_date}}
Status         : *{{status_label}}*

💰 *Total Tagihan: Rp {{total_tagihan}}*
{{blok_sisa}}{{blok_jatuh_tempo}}{{blok_va}}
Hormat kami,
{{nama_lembaga}}
TXT,
                ],
                'email' => [
                    'aktif' => true,
                    // Isi email berupa dokumen invoice (HTML + PDF), bukan teks bebas.
                    'body_templateable' => false,
                    'subject' => 'Invoice {{nomor_invoice}} — {{nama_faskes}}',
                ],
            ],
        ],

        // ── Status pembayaran (BuktiPembayaranController) ───────────────
        'invoice_lunas' => [
            'label' => 'Invoice Lunas',
            'deskripsi' => 'Dikirim ke faskes saat bukti pembayaran diverifikasi penuh.',
            'channels' => ['whatsapp', 'email'],
            'variables' => [
                'nama_faskes' => ['label' => 'Nama Faskes', 'contoh' => 'RS Srcaba'],
                'nomor_invoice' => ['label' => 'Nomor Invoice', 'contoh' => 'INV/2026/0001'],
                'total_tagihan' => ['label' => 'Total Tagihan', 'contoh' => '5.000.000'],
                'nama_lembaga' => ['label' => 'Nama Lembaga', 'contoh' => 'Lembaga Akreditasi Kesehatan'],
            ],
            'defaults' => [
                'whatsapp' => [
                    'aktif' => true,
                    'subject' => 'Invoice {{nomor_invoice}} telah LUNAS',
                    'body' => <<<'TXT'
Yth. {{nama_faskes}},

Pembayaran invoice {{nomor_invoice}} sebesar Rp {{total_tagihan}} telah kami terima dan diverifikasi. Status invoice sekarang: LUNAS.

Terima kasih,
{{nama_lembaga}}
TXT,
                ],
                'email' => [
                    'aktif' => true,
                    'subject' => 'Invoice {{nomor_invoice}} telah LUNAS',
                    'body' => <<<'TXT'
Yth. {{nama_faskes}},

Pembayaran invoice {{nomor_invoice}} sebesar Rp {{total_tagihan}} telah kami terima dan diverifikasi. Status invoice sekarang: LUNAS.

Terima kasih,
{{nama_lembaga}}
TXT,
                ],
            ],
        ],

        'bukti_ditolak' => [
            'label' => 'Bukti Transfer Ditolak',
            'deskripsi' => 'Dikirim ke faskes saat bukti pembayaran ditolak.',
            'channels' => ['whatsapp', 'email'],
            'variables' => [
                'nama_faskes' => ['label' => 'Nama Faskes', 'contoh' => 'RS Srcaba'],
                'nomor_invoice' => ['label' => 'Nomor Invoice', 'contoh' => 'INV/2026/0001'],
                'total_tagihan' => ['label' => 'Total Tagihan', 'contoh' => '5.000.000'],
                'alasan_penolakan' => ['label' => 'Alasan Penolakan', 'contoh' => 'Nominal tidak sesuai tagihan.'],
                'nama_lembaga' => ['label' => 'Nama Lembaga', 'contoh' => 'Lembaga Akreditasi Kesehatan'],
            ],
            'defaults' => [
                'whatsapp' => [
                    'aktif' => true,
                    'subject' => 'Bukti transfer ditolak',
                    'body' => <<<'TXT'
Yth. {{nama_faskes}},

Bukti transfer untuk invoice {{nomor_invoice}} kami TOLAK dengan alasan:
"{{alasan_penolakan}}"

Anda dapat mengunggah ulang bukti melalui portal Faskes. Sistem akan otomatis memperbarui status invoice setelah bukti baru diverifikasi.

Terima kasih,
{{nama_lembaga}}
TXT,
                ],
                'email' => [
                    'aktif' => true,
                    'subject' => 'Bukti transfer ditolak',
                    'body' => <<<'TXT'
Yth. {{nama_faskes}},

Bukti transfer untuk invoice {{nomor_invoice}} kami TOLAK dengan alasan:
"{{alasan_penolakan}}"

Anda dapat mengunggah ulang bukti melalui portal Faskes. Sistem akan otomatis memperbarui status invoice setelah bukti baru diverifikasi.

Terima kasih,
{{nama_lembaga}}
TXT,
                ],
            ],
        ],

        // ── Penugasan baru ke tenaga ahli (PenugasanNotifier) ──────────────
        'penugasan_baru' => [
            'label' => 'Penugasan Baru (Tenaga Ahli)',
            'deskripsi' => 'Dikirim ke tenaga ahli saat admin menugaskan tenaga ahli untuk survei/verifikasi.',
            'channels' => ['whatsapp', 'email'],
            'variables' => [
                'nama_tenaga_ahli' => ['label' => 'Nama Tenaga Ahli', 'contoh' => 'dr. Siti Rahma'],
                'nomor_surat' => ['label' => 'Nomor Surat Tugas', 'contoh' => 'ST/SURVEI/2026/A1B2C3'],
                'nama_faskes' => ['label' => 'Nama Faskes', 'contoh' => 'RS Srcaba'],
                'jenis_penugasan' => ['label' => 'Jenis Penugasan', 'contoh' => 'Survei'],
                'nama_lembaga' => ['label' => 'Nama Lembaga', 'contoh' => 'Lembaga Akreditasi Kesehatan'],
            ],
            'defaults' => [
                'whatsapp' => [
                    'aktif' => true,
                    'subject' => 'Penugasan Baru — {{jenis_penugasan}}',
                    'body' => <<<'TXT'
Yth. {{nama_tenaga_ahli}},

Anda menerima penugasan baru:
Nomor Surat Tugas: {{nomor_surat}}
Faskes: {{nama_faskes}}
Jenis: {{jenis_penugasan}}

Silakan login ke sistem ERP Akreditasi untuk melihat detail dan mengkonfirmasi kesediaan.

Terima kasih,
{{nama_lembaga}}
TXT,
                ],
                'email' => [
                    'aktif' => true,
                    'subject' => 'Penugasan Baru — {{jenis_penugasan}}',
                    'body' => <<<'TXT'
Yth. {{nama_tenaga_ahli}},

Anda menerima penugasan baru:
Nomor Surat Tugas: {{nomor_surat}}
Faskes: {{nama_faskes}}
Jenis: {{jenis_penugasan}}

Silakan login ke sistem ERP Akreditasi untuk melihat detail dan mengkonfirmasi kesediaan.

Terima kasih,
{{nama_lembaga}}
TXT,
                ],
            ],
        ],

        // ── Slip honorarium (SlipHonorNotificationController) ─────────────
        'slip_honor' => [
            'label' => 'Slip Honorarium',
            'deskripsi' => 'Slip honorarium tenaga ahli yang dikirim setelah pembayaran disetujui.',
            'channels' => ['whatsapp', 'email'],
            'variables' => [
                'nama_tenaga_ahli' => ['label' => 'Nama Tenaga Ahli', 'contoh' => 'dr. Siti Rahma'],
                'nomor_pembayaran' => ['label' => 'Nomor Pembayaran', 'contoh' => 'PH/2026/0001'],
                'tanggal_pembayaran' => ['label' => 'Tanggal Pembayaran', 'contoh' => '28 Oktober 2026'],
                'metode' => ['label' => 'Metode Pembayaran', 'contoh' => 'Transfer Bank BJB'],
                'total_bruto' => ['label' => 'Total Bruto', 'contoh' => '5.000.000'],
                'total_ppn' => ['label' => 'Potongan PPN', 'contoh' => '275.000'],
                'total_pph' => ['label' => 'Potongan PPh', 'contoh' => '100.000'],
                'total_neto' => ['label' => 'Total Neto', 'contoh' => '4.625.000'],
                'blok_ac7' => ['label' => 'Blok Status AC-7', 'contoh' => "✅ AC-7: VALID\n"],
                'nama_lembaga' => ['label' => 'Nama Lembaga', 'contoh' => 'Lembaga Akreditasi Kesehatan'],
            ],
            'defaults' => [
                'whatsapp' => [
                    'aktif' => true,
                    'subject' => 'Slip Honorarium — {{nomor_pembayaran}}',
                    'body' => <<<'TXT'
🏆 *SLIP HONORARIUM*

Yth. *{{nama_tenaga_ahli}}*

Berikut slip honorarium Anda:

📋 *Detail Pembayaran*
No. Pembayaran : {{nomor_pembayaran}}
Tanggal        : {{tanggal_pembayaran}}
Metode         : {{metode}}

💰 *Rincian*
Total Bruto : Rp {{total_bruto}}
Potongan PPN: Rp {{total_ppn}}
Potongan PPh: Rp {{total_pph}}
─────────────────
*Total Neto  : Rp {{total_neto}}*

{{blok_ac7}}
Hormat kami,
{{nama_lembaga}}
TXT,
                ],
                'email' => [
                    'aktif' => true,
                    // Isi email berupa dokumen slip honor (HTML + PDF).
                    'body_templateable' => false,
                    'subject' => 'Slip Honorarium — {{nomor_pembayaran}}',
                ],
            ],
        ],
    ],
];
