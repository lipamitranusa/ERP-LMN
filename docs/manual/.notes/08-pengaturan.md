# Bab 08 — Pengaturan & Hak Akses (catatan faktual)

Sumber: `frontend/src/views/admin/PengaturanPembayaran.jsx`, `PengaturanMail.jsx`, `PengaturanWhatsApp.jsx`,
`frontend/src/views/admin/ProfilePage.jsx`, `frontend/src/views/rekomendator/RekomendasiSettings.jsx`,
`frontend/src/views/admin/Roles.jsx`, `Privileges.jsx`, `AuditTrail.jsx`,
`frontend/src/components/NotifikasiTemplatePanel.jsx`, `frontend/src/routes.js`,
`backend/routes/api.php`, `backend/app/Models/MenuAction.php`, `RolePrivilege.php`, `Role.php`,
`backend/app/Services/AuditService.php`, `backend/app/Models/AuditTrail.php`,
`backend/app/Http/Controllers/Api/AuditTrailController.php`, `backend/app/Http/Controllers/Api/AuthController.php`,
`backend/app/Http/Middleware/EnsurePrivilege.php`,
`backend/database/seeders/RolesSeeder.php`, `MailSettingsSeeder.php`, `PaymentSettingsSeeder.php`,
`WhatsappSettingsSeeder.php`, `backend/config/notifikasi.php`.

Delapan layar di bawah terdiri dari lima layar konfigurasi/`pengaturan` (Payment Gateway, Mail Server,
WhatsApp, Profil Saya, Rekomendator) dan tiga layar hak akses (Role & Hak Akses, Matriks Privilege, Audit Trail).
Semua memakai layout internal `/admin`, kecuali `Profil Saya` yang juga menggunakan layout `/admin` namun
disembunyikan dari sidebar (`hidden: true`).

---

## Payment Gateway
- **Route:** `/pengaturan-pembayaran` (sidebar: group `Pengaturan`, item `Payment Gateway`; `privilege: ["Kontrak & Invoicing", "Ubah"]`)
- **Kondisi yang ditampilkan:**
  - Judul layar: `Pengaturan Pembayaran`; subjudul: `Konfigurasi gateway pembayaran & parameter invoice`.
  - Banner status di atas: `Payment Gateway: <MIDTRANS (Sandbox)>` atau `Payment Gateway: Nonaktif`.
  - **Memuat:** formulir menampilkan spinners pada field yang sedang dimuat.
  - **Kosong:** tidak ada state kosong; tab `Xendit` menampilkan field kosong bila driver bukan Xendit.
  - **Terisi:** tab aktif menampilkan kartu konfigurasi sesuai kategori setting.
  - **Error:** hasil aksi ditampilkan lewat toast `Gagal menyimpan.` / `Gagal koneksi.`.
- **Komponen/field yang tampil:**
  - Tab: `Gateway`, `Midtrans`, `Xendit`, `Pengaturan Umum`.
  - Kartu `Konfigurasi Gateway` (kategori `gateway`): `Payment Gateway Aktif` (sakelar), `Gateway Pembayaran` (pilihan `Midtrans` / `Xendit` / `Fake (Development)`), `Mode` (pilihan `Sandbox` / `Production`).
  - Kartu `Panduan Gateway` berisi penjelasan tiap driver:
    - `Fake (Development) — hanya untuk testing. Tidak melakukan transaksi sungguhan.`
    - `Midtrans — gateway populer Indonesia. Mendukung VA, e-wallet, dan QRIS.`
    - `Xendit — alternatif gateway pembayaran dengan dukungan invoice otomatis.`
    - `Tips:` — daftar catatan.
  - Kartu `Kredensial Midtrans` (kategori `midtrans`): `Server Key`, `Client Key`, `Merchant ID`, `Bank Default VA` (pilihan `BCA` / `BNI` / `Mandiri` / `Permata` / `BRI`).
  - Kartu `Kredensial Xendit` (kategori `xendit`): `API Key`, `Callback Token`, `Channel Code` (pilihan `BCA` / `BNI` / `MANDIRI` / `BRI` / `PERMATA`).
  - Kartu `Pengaturan Umum Pembayaran` (kategori `general`): `Hari Jatuh Tempo` (default 30), `Email Notifikasi Admin`.
  - Tombol aksi: `Test Koneksi` (teks `Menguji...` saat berjalan) dan `Simpan Perubahan` (teks `Menyimpan...` saat berjalan).
- **Aksi yang bisa dilakukan:**
  - `Test Koneksi` → **POST `/api/payment-settings/test-connection`**.
  - `Simpan Perubahan` → **PUT `/api/payment-settings`** dengan badan `{ values: { ...nilai form } }` (nilai dikirim sebagai objek `values`).
  - Data awal dimuat dari **GET `/api/payment-settings`**.
  - Memilih driver pada `Gateway Pembayaran` menentukan tab mana yang menjadi relevan; field kredensial yang tidak dipakai driver aktif disembunyikan.
- **Validasi & pesan error:**
  - Toast: `Tidak ada perubahan untuk disimpan.` (bila tidak ada nilai yang berubah), `Berhasil disimpan.`, `Gagal menyimpan.`, `Gagal koneksi.`.
  - Server (middleware privilege): `Anda tidak memiliki hak akses untuk aksi ini.` (403).
- **Peran & syarat akses:**
  - Menu tampil bila role punya `Kontrak & Invoicing — Ubah` (bukan `Lihat`), karena layar ini mengubah konfigurasi.
  - Endpoint GET/PUT `/payment-settings` dan POST `/payment-settings/test-connection` dilindungi privilege `Kontrak & Invoicing` + `Ubah`.
- **Catatan penting:**
  - Konfigurasi disimpan di tabel `payment_settings` pada basis data, bukan pada berkas `.env`; nilai di basis data yang dipakai aplikasi.
  - `Hari Jatuh Tempo` menentukan tanggal jatuh tempo invoice yang terbit dari kontrak.
  - Driver `Fake (Development)` hanya untuk pengujian tanpa transaksi sungguhan.

---

## Mail Server
- **Route:** `/pengaturan-mail` (sidebar: `Pengaturan` → `Mail Server`; `privilege: ["Pengaturan Hak Akses", "Ubah"]`)
- **Kondisi yang ditampilkan:**
  - Judul: `Pengaturan Mail Server`; subjudul: `Konfigurasi SMTP & driver pengiriman email`.
  - Banner: `Mail Server: Aktif — Driver: SMTP` atau `Mail Server: Nonaktif`.
  - **Memuat:** spinners pada field; tab `Format Pesan` menampilkan `Memuat template pesan...`.
  - **Kosong:** tab `Format Pesan` menampilkan `Belum ada notifikasi yang dikonfigurasi untuk kanal email.`
  - **Terisi:** tab `Format Pesan` menampilkan daftar template notifikasi yang bisa diedit.
  - **Error:** toast `Gagal menyimpan.` / `Gagal mengirim email test.`; di panel template: `Gagal membuat pratinjau.` / `Gagal mengembalikan ke format bawaan.`.
- **Komponen/field yang tampil:**
  - Tab: `Umum`, `SMTP`, `Mailgun`, `Notifikasi`, `Format Pesan`.
  - Kartu `Pengaturan Umum Mail` (kategori `umum`): `Email Aktif` (sakelar), `Driver Pengiriman` (pilihan `SMTP (Email Biasa)` / `Mailgun` / `Amazon SES` / `Postmark` / `Mailtrap (Development)` / `Log saja (Development)`).
  - Kartu `Konfigurasi SMTP` (kategori `smtp`): `SMTP Host`, `Port` (default 587), `Enkripsi` (pilihan `TLS` / `SSL` / `Tanpa Enkripsi`), `Username / Email`, `Password / App Password`, `Alamat Pengirim (From)`, `Nama Pengirim (From Name)` (default `LIPA MITRA NUSA`).
  - Kartu `Panduan SMTP` memuat catatan untuk `Gmail / Google Workspace` (gunakan App Password), `Mail Server Hosting` (port 465/587), dan `Port umum` (587 TLS / 465 SSL).
  - Kartu `Konfigurasi Mailgun` (kategori `mailgun`): `Domain Mailgun`, `Mailgun Secret API Key`.
  - Kartu `Pengaturan Notifikasi Email` (kategori `notifikasi`): `Email Admin Notifikasi`, `Kirim notifikasi saat invoice lunas`, `Kirim notifikasi saat PKS ditandatangani`, `Kirim notifikasi Surat Tugas ke Surveior`.
  - Kartu `Kirim Email Test`: `Email Tujuan` (placeholder `admin@lembaga.com`), `Isi Pesan` (nilai bawaan `Ini adalah email test dari sistem ERP Akreditasi Faskes.`), tombol `Kirim Test Email` (teks `Mengirim...` saat berjalan).
  - Tab `Format Pesan` memakai komponen `NotifikasiTemplatePanel` dengan `channel="email"` (lihat bagian "Format Pesan" di bawah).
- **Aksi yang bisa dilakukan:**
  - `Simpan Perubahan` → **PUT `/api/mail-settings`** dengan badan `{ values: { ... } }`.
  - `Kirim Test Email` → **POST `/api/mail-settings/test-connection`** dengan badan berisi email tujuan dan isi pesan.
  - Data awal dimuat dari **GET `/api/mail-settings`**.
- **Validasi & pesan error:**
  - Toast: `Email test wajib diisi.` (bila email tujuan atau isi pesan kosong), `Berhasil disimpan.`, `Tidak ada perubahan untuk disimpan.`, `Gagal menyimpan.`, `Gagal mengirim email test.`
  - Server (middleware privilege): `Anda tidak memiliki hak akses untuk aksi ini.` (403).
- **Peran & syarat akses:**
  - Menu tampil bila role punya `Pengaturan Hak Akses — Ubah`.
  - Endpoint GET/PUT `/mail-settings` dan POST `/mail-settings/test-connection` dilindungi privilege `Pengaturan Hak Akses` + `Ubah`.
- **Catatan penting:**
  - Konfigurasi disimpan di tabel `mail_settings` pada basis data; nilai di basis data menang atas konfigurasi berkas `.env`.
  - Password SMTP disimpan sebagai setting di basis data dan ditampilkan pada form (field bertipe password dengan tombol lihat).
  - Driver `Log saja (Development)` menulis pesan ke log tanpa mengirim email sungguhan.

---

## WhatsApp
- **Route:** `/pengaturan-whatsapp` (sidebar: `Pengaturan` → `WhatsApp`; `privilege: ["Pengaturan Hak Akses", "Ubah"]`)
- **Kondisi yang ditampilkan:**
  - Judul: `Pengaturan WhatsApp`; subjudul: `Konfigurasi WhatsApp Business API (Meta WhatsApp Cloud)`.
  - Banner: `WhatsApp Business API: Aktif` atau `WhatsApp Business API: Nonaktif`.
  - **Memuat:** spinners pada field; tab `Format Pesan` menampilkan `Memuat template pesan...`.
  - **Kosong:** tab `Format Pesan` menampilkan `Belum ada notifikasi yang dikonfigurasi untuk kanal whatsapp.`
  - **Terisi:** hasil uji koneksi ditampilkan sebagai banner `Koneksi Berhasil` / `Koneksi Gagal` dengan baris `Nomor`, `Nama Bisnis`, `Status`, `Quality`; hasil kirim pesan menampilkan `Pesan Terkirim` / `Pesan Gagal` dan baris `Driver: {driver}`.
  - **Error:** toast `Gagal menyimpan.` / `Gagal menguji koneksi.` / `Gagal mengirim pesan test.`
- **Komponen/field yang tampil:**
  - Tombol aksi: `Uji Koneksi` (teks `Menguji...`), `Simpan Perubahan`.
  - Kartu `Webhook URL` berisi URL webhook dan tombol `Salin`, dengan instruksi: `Daftarkan URL ini di Meta Developer Console → WhatsApp → Configuration → Webhooks…`
  - Tab: `Umum`, `WhatsApp Cloud API`, `Fonnte`, `Notifikasi`, `Format Pesan`.
  - Kartu `Pengaturan Umum WhatsApp` (kategori `umum`): `WhatsApp Aktif` (sakelar, default nonaktif), `Driver` (pilihan `WhatsApp Cloud API (Meta)` / `Fonnte (Gateway Indonesia)` / `Log saja (Development)`).
  - Kartu `Cara mendapatkan kredensial` berisi 6 langkah bernomor.
  - Kartu `Konfigurasi WhatsApp Cloud API` (kategori `whatsapp_cloud`): `App ID`, `App Secret`, `Phone Number ID`, `Business Account ID`, `Verify Token (Webhook)`, `API Version` (default `v18.0`), `Webhook URL` (default `/api/webhooks/whatsapp`).
  - Kartu `Konfigurasi Fonnte Gateway` (kategori `fonnte`): `API Token`, `Nomor Perangkat`.
  - Kartu `Pengaturan Notifikasi WhatsApp` (kategori `notifikasi`): `Pendaftaran baru faskes`, `Status dokumen berubah`, `Dokumen divalidasi lengkap`, `Jadwal survei terbit`, `Tagihan/invoice baru`, `Pembayaran terkonfirmasi`, `Penugasan baru tenaga ahli`, `Kontrak PKS siap ditandatangani`, `Sertifikat akreditasi terbit`, `Catatan revisi dokumen` — seluruhnya default aktif.
    - Banner pada kartu ini: `Notifikasi WhatsApp hanya akan dikirim jika WhatsApp Business API dalam keadaan AKTIF/NONAKTIF dan koneksi berhasil diuji.`
  - Kartu `Test Kirim Pesan` dengan badge `End-to-end via {driverLabel}`: `Nomor WhatsApp Tujuan` (placeholder `cth: 081234567890`, maxLength 20, hint `Format 08xx atau 62xxx.`), `Pesan` (nilai bawaan `Halo, ini pesan test dari sistem ERP LIPA Akreditasi.`, max 1000, penghitung `{n} / 1000`), tombol `Kirim Pesan Test` (teks `Mengirim...`), tombol `Reset`.
  - Tab `Format Pesan` memakai `NotifikasiTemplatePanel` dengan `channel="whatsapp"`.
- **Aksi yang bisa dilakukan:**
  - `Uji Koneksi` → **POST `/api/whatsapp-settings/test-connection**.
  - `Simpan Perubahan` → **PUT `/api/whatsapp-settings`** dengan badan `{ values: { ... } }`.
  - `Kirim Pesan Test` → **POST `/api/whatsapp-settings/test-send`** dengan nomor tujuan dan isi pesan.
  - `Salin` menyalin URL webhook ke papan klip.
  - `Reset` mengembalikan isi pesan uji ke nilai bawaan.
  - Data awal dimuat dari **GET `/api/whatsapp-settings`**.
- **Validasi & pesan error:**
  - Toast: `Nomor WhatsApp wajib diisi.`; `Pesan wajib diisi.`; `Nomor WhatsApp minimal 8 digit.`; `Berhasil disimpan.`; `Tidak ada perubahan untuk disimpan.`; `Gagal menyimpan.`; `Gagal menguji koneksi.`; `Gagal mengirim pesan test.`
  - Server (middleware privilege): `Anda tidak memiliki hak akses untuk aksi ini.` (403).
- **Peran & syarat akses:**
  - Menu tampil bila role punya `Pengaturan Hak Akses — Ubah`.
  - Endpoint GET/PUT `/whatsapp-settings`, POST `/whatsapp-settings/test-connection`, POST `/whatsapp-settings/test-send` dilindungi privilege `Pengaturan Hak Akses` + `Ubah`.
  - Endpoint webhook `GET`/`POST /api/whatsapp-settings/webhook` bersifat publik (tanpa autentikasi) karena dipanggil Meta.
- **Catatan penting:**
  - Konfigurasi disimpan di tabel `whatsapp_settings` pada basis data, bukan pada `.env`.
  - Notifikasi hanya terkirim bila WhatsApp dalam keadaan aktif dan koneksi berhasil diuji.
  - Pesan masuk dari webhook dicocokkan ke invoice lewat `payment_order_id`, bukan lewat pencarian `Invoice::find()`.

---

## Format Pesan (tab di Mail Server & WhatsApp)
- **Route:** bukan menu terpisah; tab `Format Pesan` pada `/pengaturan-mail` dan `/pengaturan-whatsapp`.
- **Kondisi yang ditampilkan:**
  - Judul: `Format Pesan Email` atau `Format Pesan WhatsApp`.
  - Deskripsi: `Atur subjek dan isi pesan setiap notifikasi yang dikirim lewat {channel}. Gunakan {{variabel}} untuk menyisipkan data otomatis.`
  - **Memuat:** `Memuat template pesan...`
  - **Kosong:** `Belum ada notifikasi yang dikonfigurasi untuk kanal {channel}.`
  - **Terisi:** satu blok per jenis notifikasi, berisi header (label notifikasi + badge `Diubah` bila isi kustom + badge `Nonaktif` bila nonaktif + sakelar `Kirim`), editor subjek & isi, daftar variabel, dan tombol aksi.
  - **Error:** `Gagal membuat pratinjau.`, `Gagal mengembalikan ke format bawaan.`, `Gagal menyimpan.`
- **Komponen/field yang tampil:**
  - Tombol utama: `Simpan Format Pesan` (teks `Menyimpan...` saat berjalan).
  - Field `Subjek pesan` (placeholder `Contoh: Pengingat: Invoice {{nomor_invoice}} akan jatuh tempo`) dan field `Isi pesan` dengan penghitung `{n} karakter`.
  - Untuk notifikasi yang isinya dokumen (bukan teks): `Isi pesan {channel} pada notifikasi ini berupa dokumen (HTML + PDF), sehingga tidak bisa diedit sebagai teks. Yang dapat disesuaikan hanya subjek pesan.`
  - Blok `Variabel tersedia` dengan keterangan `Klik untuk menyisipkan ke isi pesan. Nilai diisi otomatis saat pesan dikirim.` — variabel ditampilkan sebagai chip yang bisa diklik.
  - Tombol `Pratinjau` (teks `Membuat...` saat berjalan) dan `Kembalikan bawaan`.
  - Pratinjau ditampilkan di bawah label `Hasil pratinjau (data contoh)`; bila ada variabel yang tidak punya data contoh, muncul peringatan `Variabel tanpa data contoh: {daftar}. Variabel ini tetap diisi otomatis dari data nyata saat pesan dikirim.`
- **Aksi yang bisa dilakukan:**
  - `Simpan Format Pesan` → **PUT `/api/notifikasi-template`** dengan badan berisi subjek dan isi per template.
  - `Pratinjau` → **POST `/api/notifikasi-template/preview`**; hasilnya ditampilkan di layar.
  - `Kembalikan bawaan` → **POST `/api/notifikasi-template/reset`** (kembalikan isi ke format bawaan dari `backend/config/notifikasi.php`).
  - Data dimuat dari **GET `/api/notifikasi-template/{channel}`** (`email` / `whatsapp`).
  - Sakelar `Kirim` menyalakan/mematikan pengiriman notifikasi tersebut.
- **Validasi & pesan error:**
  - Toast: `Tidak ada perubahan untuk disimpan.`, `Berhasil disimpan.`, `Gagal menyimpan.`, `Gagal membuat pratinjau.`, `Gagal mengembalikan ke format bawaan.`
  - Server (middleware privilege): `Anda tidak memiliki hak akses untuk aksi ini.` (403).
- **Peran & syarat akses:**
  - Endpoint `notifikasi-template` dilindungi privilege `Pengaturan Hak Akses` + `Ubah`.
- **Catatan penting:**
  - Delapan jenis notifikasi yang punya template: `Pengingat Tagihan H-3`, `Pengingat Tagihan H-1`, `Tagihan Terlambat`, `Tagihan / Invoice ke Faskes`, `Invoice Lunas`, `Bukti Transfer Ditolak`, `Penugasan Baru (Tenaga Ahli)`, `Slip Honorarium`.
  - Dua di antaranya (`Tagihan / Invoice ke Faskes` dan `Slip Honorarium`) tidak dapat diedit teksnya karena isinya dokumen HTML + PDF; hanya subjek yang dapat disesuaikan.
  - Pengingat tagihan dikirim pada H-3 dan H-1 (offset `[3, 1]` hari).
  - Teks bawaan berasal dari `backend/config/notifikasi.php`; kustomisasi per kanal disimpan di tabel `notifikasi_template`.

---

## Profil Saya
- **Route:** `/profile` (sidebar: tidak ditampilkan — `hidden: true`; nama menu `Profil Saya`; **tidak ada field `privilege`**)
- **Kondisi yang ditampilkan:**
  - Judul: `Profil Saya`; subjudul: `Kelola informasi akun Anda`.
  - **Memuat:** `Memuat profil...`
  - **Kosong:** tidak ada state kosong; bila data profil belum termuat, kartu-kartu tetap tampil dengan nilai kosong.
  - **Terisi:** kartu `Informasi Akun` dan kartu `Ubah Password`.
  - **Error:** banner merah berisi pesan dari `invalidate.error.data.message`.
- **Komponen/field yang tampil:**
  - Kartu `Informasi Akun` — baris `Nama`, `Email`, `Role`, `Faskes` (nilai kosong ditampilkan `—`).
  - Kartu `Ubah Password` dengan keterangan `Password minimal 8 karakter`:
    - `Password Lama *` (placeholder `Masukkan password lama`)
    - `Password Baru *` (placeholder `Minimal 8 karakter`)
    - `Konfirmasi Password Baru *` (placeholder `Ulangi password baru`)
  - Tombol `Simpan Password Baru` (teks `Menyimpan...` saat mengirim, `Berhasil!` setelah berhasil).
  - Banner sukses: `{pesan} Mengalihkan ke halaman login...`
- **Aksi yang bisa dilakukan:**
  - `Simpan Password Baru` → **PUT `/api/auth/password`** dengan badan `{ password_lama, password_baru, password_baru_konfirmasi }`.
  - Data profil dimuat dari **GET `/api/auth/me`**.
  - Setelah berhasil, `token` dan `user` dihapus dari localStorage dan pengguna diarahkan ke `/auth/login` setelah 2 detik.
- **Validasi & pesan error:**
  - Client (zod): `Password lama wajib diisi`; `Password baru minimal 8 karakter`; `Konfirmasi password baru tidak cocok`.
  - Server (`AuthController::changePassword()`): `Password baru tidak boleh sama dengan password lama.`; `Konfirmasi password baru tidak cocok.` (422); `Password lama salah.` (422).
  - Server (sukses): `Password berhasil diubah. Silakan login ulang.`
- **Peran & syarat akses:**
  - Tidak ada syarat privilege; layar dapat dibuka semua pengguna yang sudah login.
  - Endpoint `/auth/me` dan `/auth/password` tidak dilindungi privilege apa pun (cukup autentikasi).
- **Catatan penting:**
  - Ini satu-satunya layar di bab ini yang tidak memakai modul privilege; setiap pengguna hanya mengubah password-nya sendiri.
  - Setelah password diganti, token yang sedang dipakai dihapus sehingga pengguna harus login ulang.

---

## Rekomendator
- **Route:** `/rekomendasi-settings` (sidebar: `Pengaturan` → `Rekomendator`; `privilege: ["Rekomendasi", "Ubah"]`)
- **Kondisi yang ditampilkan:**
  - Judul: `Pengaturan Rekomendator`.
  - Paragraf penjelasan: `Tunjuk satu pengguna dengan role Rekomendator yang akan menerima hasil verifikasi untuk disetujui atau ditolak. Setiap lembaga memiliki 1 rekomendator sendiri — pengaturan di bawah hanya berlaku untuk {nama lembaga}. Setelah verifikator finalize, laporan otomatis muncul di menu Rekomendasi untuk pengguna ini.`
  - **Memuat:** `Memuat...`
  - **Kosong (belum ada default):** `Belum ada default rekomendator untuk {nama lembaga}. Klik tombol "Edit" untuk memilih.`
  - **Kosong (belum ada kandidat):** kotak kuning di modal `Belum ada akun dengan role Rekomendator di lembaga {nama}.` diikuti `Buat di Master Data — Tenaga Ahli (peran Reksa, lengkapi rekening, lalu buat akun login), atau di Manajemen Akun (pilih role Rekomendator dan centang lembaga ini).`
  - **Terisi:** kartu default rekomendator + tabel kandidat.
  - **Error:** pesan galat dari server ditampilkan lewat `alert` (`err.message`).
- **Komponen/field yang tampil:**
  - Seksi `Default Rekomendator Saat Ini` berisi nama, email, serta baris `Role: {role}` (dan `· TA: {nomor_induk}` bila tertaut ke tenaga ahli), `Lembaga: {nama}`, dan `Rekening: {no_rekening} ({nama_bank}) — {atas_nama_rekening}` bila rekening tersedia.
  - Peringatan bila rekening belum ada: `Belum ada data rekening. Tautkan akun ini ke tenaga ahli di Manajemen Akun agar honor reksa membawa rekening saat pembayaran AP.`
  - Banner biru bila pengguna punya hak ubah: `Anda login sebagai {nama} ({role}).` + (bila pengguna adalah rekomendator default) ` Anda sudah menjadi default rekomendator.`
  - Banner abu-abu bila tidak punya hak ubah: `Anda login sebagai {role}. Anda tidak memiliki privilege Rekomendasi, Ubah untuk menyetel default rekomendator. Hubungi administrator jika perlu mengubah.`
  - Tabel `Daftar Kandidat Rekomendator ({n})` — kolom `Nama`, `Email`, `No. Induk`, `Rekening (AP)`; baris default diberi badge `DEFAULT` dan disorot; kolom rekening menampilkan `belum ada — tautkan ke tenaga ahli` bila kosong.
  - Tombol `Edit` dan (bila pengguna berrole Reksa) `Jadikan Saya Default` (teks `Menyetel...` saat berjalan).
  - Modal `Edit Default Rekomendator` — teks `Pilih pengguna dengan role Rekomendator yang akan menerima hasil verifikasi. Hanya satu rekomendator yang aktif pada satu waktu.` + `Kandidat diambil dari lembaga aktif {nama}.`; field `Rekomendator *` (opsi `— Pilih rekomendator —`, isi `{nama} — {email} ({nomor_induk})`); keterangan `{n} kandidat tersedia. Hanya menampilkan user dengan role Rekomendator dan status aktif.`
  - Footer modal: `Batal`, `Simpan` (teks `Menyimpan...` saat berjalan).
- **Aksi yang bisa dilakukan:**
  - `Edit` → memilih kandidat → `Simpan` → konfirmasi `Setel default rekomendator ke {nama}?` → **PUT `/api/rekomendator/default`** dengan badan `{ user_id }`.
  - `Jadikan Saya Default` → konfirmasi `Setel diri Anda ({nama}) sebagai default rekomendator?` → **PUT `/api/rekomendator/default`** dengan badan `{ user_id }` milik sendiri.
  - Data dimuat dari **GET `/api/rekomendator/default`** dan **GET `/api/rekomendator/candidates`**.
- **Validasi & pesan error:**
  - `alert`: `Pilih salah satu rekomendator terlebih dahulu.` (bila select kosong); `Rekomendator tidak ditemukan di daftar.` (bila id tidak ada di kandidat).
  - Pesan sukses diambil dari `d?.message` server, cadangan `Berhasil disetel.`.
  - Server (middleware privilege): `Anda tidak memiliki hak akses untuk aksi ini.` (403).
- **Peran & syarat akses:**
  - Menu tampil bila role punya `Rekomendasi — Ubah`.
  - Endpoint GET `/rekomendator/default` dan `/rekomendator/candidates` → `Rekomendasi — Lihat`; PUT `/rekomendator/default` → `Rekomendasi — Ubah`.
- **Catatan penting:**
  - Tiap lembaga punya satu reksa/rekomendator sendiri; pengaturan di layar ini hanya berlaku untuk lembaga aktif.
  - Akun reksa yang tidak tertaut ke tenaga ahli tidak punya rekening, sehingga honor reksa tidak membawa informasi rekening saat pembayaran AP.
  - Role `Reksa` (rekomendator) dibuat lewat Master Data — Tenaga Ahli dengan peran `Reksa` atau lewat Manajemen Akun dengan role Rekomendator.

---

## Role & Hak Akses
- **Route:** `/roles` (sidebar: `Pengaturan` → `Role & Hak Akses`; `privilege: ["Pengaturan Hak Akses", "Lihat"]`)
- **Kondisi yang ditampilkan:**
  - Judul: `Role & Hak Akses`; subjudul: `{jumlah} role — 6 role bawaan (default) tidak bisa dihapus.`
  - **Memuat:** lima baris kerangka tabel (skeleton).
  - **Kosong:** `Belum ada role.`
  - **Terisi:** tabel role.
  - **Error:** kotak galat berisi `{error?.message || "Terjadi kesalahan"}`.
- **Komponen/field yang tampil:**
  - Kolom tabel: `#`, `Nama Role`, `Tipe`, `Privilege`, `Aksi`.
    - `Tipe` memakai badge `Default` atau `Kustom`.
    - `Privilege` menampilkan pill per aksi (Lihat/Tambah/Ubah/Hapus/Setujui/Ekspor/Final) plus pill jumlah.
  - Tombol utama: `Tambah Role`.
  - Modal `Tambah Role` / `Edit Role` — field `Nama Role *` (placeholder `cth: Admin Lembaga`); footer `Batal` dan `Tambah` / `Simpan` (`Menyimpan...` saat mengirim).
- **Aksi yang bisa dilakukan:**
  - `Tambah Role` → **POST `/api/admin/roles`**.
  - `Ubah` → **PUT `/api/admin/roles/{id}`**.
  - `Hapus` → konfirmasi `Hapus role "{nama_role}"? Tindakan ini tidak bisa dibatalkan.` → **DELETE `/api/admin/roles/{id}`**.
    - Tombol hapus pada role default dinonaktifkan dengan judul `Role default tidak bisa dihapus`.
  - Data dimuat dari **GET `/api/admin/roles**.
- **Validasi & pesan error:**
  - Client (zod): `Nama role wajib diisi`.
  - Server (middleware privilege): `Anda tidak memiliki hak akses untuk aksi ini.` (403).
- **Peran & syarat akses:**
  - Menu tampil bila role punya `Pengaturan Hak Akses — Lihat`.
  - Endpoint GET `/admin/roles` → `Lihat`; POST → `Tambah`; PUT → `Ubah`; DELETE → `Hapus`.
- **Catatan penting:**
  - Role bawaan (default) dibuat oleh `backend/database/seeders/RolesSeeder.php` dan tidak dapat dihapus; role kustom dapat ditambah dan dihapus.
  - **Catatan ketidaksesuaian:** subjudul di layar menyebut "6 role bawaan (default) tidak bisa dihapus", sedangkan seeder `RolesSeeder` mendefinisikan **8** role bawaan: `Administrator`, `Faskes`, `Admin Lembaga`, `Surveior`, `Verifikator`, `Rekomendator`, `Divisi SDM`, `Direktur/Keuangan`. Angka pada teks UI perlu diverifikasi ke tim devs.
  - Tiap role terhubung ke kumpulan privilege melalui tabel `role_privileges` yang menunjuk `menu_actions` (pasangan modul + aksi).

---

## Matriks Privilege
- **Route:** `/privileges` (sidebar: `Pengaturan` → `Matriks Privilege`; `privilege: ["Pengaturan Hak Akses", "Lihat"]`)
- **Kondisi yang ditampilkan:**
  - Judul: `Matriks Privilege`.
  - **Memuat:** subjudul `Memuat...` dan teks `Memuat matriks privilege...`.
  - **Kosong:** tidak ada state kosong khusus; tabel menampilkan semua modul × aksi dari `menu_actions`.
  - **Terisi:** tabel matriks; baris pertama = header modul.
  - **Error:** `{error.message}` dengan tombol `Coba lagi`.
- **Komponen/field yang tampil:**
  - Subjudul: `{jumlah} role × {jumlah} action — ubah dengan klik sel pada matriks.`
  - Tombol utama: `Simpan {n} perubahan` (hanya muncul bila ada sel yang diubah dan belum disimpan).
  - Header tabel: `Modul / Action`; tiap kolom role memuat nama role dengan label `default` atau `kustom` dan tombol `Simpan` per role.
  - Baris tabel menampilkan nama modul (`modul`) dan tiap sel berisi tanda ✓ (diizinkan) atau ✕ (tidak diizinkan) dengan judul tooltip `{role} — {modul} / {action}`.
  - Legenda di bawah tabel: `Dijinkan`, `Tidak diizinkan`, dan `· Klik sel untuk toggle.`
- **Aksi yang bisa dilakukan:**
  - Klik sel matriks → menandai perubahan lokal untuk role + modul + aksi tersebut.
  - `Simpan {n} perubahan` (tombol utama) → **PUT `/api/admin/roles/{roleId}/privileges`** untuk tiap role yang berubah, badan `{ privileges: [{ menu_action_id, diizinkan }] }`.
  - `Simpan` per kolom role → menyimpan perubahan role tersebut saja (endpoint dan bentuk badan sama).
  - `Coba lagi` → memuat ulang matriks dari **GET `/api/admin/privilege-matrix`**.
- **Validasi & pesan error:**
  - Server (middleware privilege): `Anda tidak memiliki hak akses untuk aksi ini.` (403).
  - Tombol simpan untuk aksi `Ubah` memerlukan privilege `Pengaturan Hak Akses — Ubah`; privilege `Lihat` saja hanya dapat melihat matriks.
- **Peran & syarat akses:**
  - Menu tampil bila role punya `Pengaturan Hak Akses — Lihat`.
  - Endpoint GET `/admin/privilege-matrix` dan GET `/admin/roles/{role}/privileges` → `Lihat`; PUT `/admin/roles/{role}/privileges` → `Ubah`.
- **Catatan penting:**
  - Tiap modul memiliki 7 aksi standar: `Lihat`, `Tambah`, `Ubah`, `Hapus`, `Setujui`, `Ekspor`, `Final`.
  - Perubahan di matriks berlaku pada seluruh modul sekaligus, bukan hanya satu menu.
  - Catatan coupling: privilege `Lihat` biasanya menjadi prasyarat agar menu muncul di sidebar.

---

## Audit Trail
- **Route:** `/audit-trail` (sidebar: `Pengaturan` → `Audit Trail`; `privilege: ["Pengaturan Hak Akses", "Lihat"]`)
- **Kondisi yang ditampilkan:**
  - Judul: `Audit Trail`; subjudul: `{jumlah} aktivitas tercatat`.
  - **Memuat:** `Memuat...`
  - **Kosong:** `Belum ada aktivitas tercatat`; bila ada pencarian yang tidak cocok → `Tidak ada hasil`.
  - **Terisi:** tabel aktivitas + penghitung `{jumlah} hasil`.
  - **Error:** tidak ada state error khusus di tabel.
- **Komponen/field yang tampil:**
  - Kolom tabel: `Waktu`, `User`, `Aksi`, `Modul`, `Deskripsi`.
    - `Waktu` ditulis relatif: `Baru saja`, `{n} menit lalu`, `{n} jam lalu`, `{n} hari lalu`, atau `—`.
    - `Aksi` memakai tag aksi: Tambah / Lihat / Ubah / Hapus / Setujui / Ekspor / Final.
  - Pencarian: input placeholder `Cari user, modul, atau aktivitas...`.
  - Tombol di bawah tabel: `Muat lebih banyak` (memuat 20 baris berikutnya, dipaginasi di sisi peramban).
- **Aksi yang bisa dilakukan:**
  - `Muat lebih banyak` → menambah 20 baris ke tabel (pemrosesan di sisi peramban, bukan permintaan baru).
  - Pencarian menyaring baris di sisi peramban atas data yang sudah dimuat.
  - Data dimuat dari **GET `/api/admin/audit-trail`** (batas `per_page` bawaan 50, maksimal 50; urutan terbaru lebih dulu).
- **Validasi & pesan error:**
  - Server (middleware privilege): `Anda tidak memiliki hak akses untuk aksi ini.` (403).
- **Peran & syarat akses:**
  - Menu tampil bila role punya `Pengaturan Hak Akses — Lihat`.
  - Endpoint GET `/admin/audit-trail` → `Pengaturan Hak Akses — Lihat`.
- **Catatan penting:**
  - Data audit disimpan di tabel `audit_trail` (append-only) dan ditulis oleh `AuditService::record()` / `AuditService::log()`; kolom yang terisi: `aktor_id`, `aksi`, `target_type`, `target_id`, `data_sebelum`, `data_sesudah`, `ip_address`, `user_agent`, `lembaga_id`.
  - `AuditService` membuang nilai `password_hash` dan `password` sebelum menyimpan snapshot data.
  - Jejak audit terisi pada modul Master Data antara lain lewat aksi `lembaga.create` / `lembaga.update`.
  - **Catatan ketidaksesuaian:** komponen React membaca `log.action`, `log.module`, `log.description`, dan `log.user?.nama`, sedangkan model `AuditTrail` di backend mengekspos `aksi`, `target_type`, `target_id`, dan `aktor_id`. Perlu konfirmasi ke tim devs apakah nama field tampilan sudah selaras dengan respons API.

---

## Layar terkait
- Bab 07 — Master Data (Manajemen Akun, Master Biaya Honor TA, Template PKS, Master Lembaga).
- Bab 04 — Rekomendasi (hasil verifikasi masuk ke menu Rekomendasi setelah reksa disetel di layar ini).
- Bab 01 — Pendaftaran (notifikasi status dokumen dan dokumen divalidasi dikirim lewat Email/WhatsApp).
- Bab 05 — Keuangan (tagihan/invoice baru, pembayaran terkonfirmasi, dan pengingat tagihan H-3/H-1 memakai template pesan di tab `Format Pesan`).
