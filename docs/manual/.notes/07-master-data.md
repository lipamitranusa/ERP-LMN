# Bab 07 — Master Data (catatan faktual)

Sumber: `frontend/src/views/admin/MasterLembaga.jsx`, `MasterJenisFaskes.jsx`, `MasterFaskes.jsx`,
`MasterTenagaAhli.jsx`, `MasterBiaya.jsx`, `MasterBiayaTA.jsx`, `UserManagement.jsx`, `PksTemplateSettings.jsx`,
`frontend/src/components/ImportModal.jsx`, `frontend/src/routes.js`,
`backend/routes/api.php`, `backend/app/Http/Controllers/Api/LembagaController.php`,
`backend/app/Http/Controllers/Api/MasterBiayaTenagaAhliController.php`,
`backend/app/Http/Controllers/Api/AkunPenggunaController.php`,
`backend/app/Http/Controllers/Api/PksTemplateController.php`,
`backend/app/Http/Middleware/EnsurePrivilege.php`.

Seluruh delapan layar memakai layout internal `/admin`. Syarat akses menu diambil dari field `privilege` pada
`frontend/src/routes.js`; backend memeriksa per aksi (Tambah/Ubah/Hapus) secara terpisah lewat
middleware `privilege:<Modul>,<Aksi>`.

---

## Master Lembaga
- **Route:** `/master-lembaga` (sidebar: group `Master Data`, item `Master Lembaga`; `privilege: ["Master Data", "Lihat"]`)
- **Kondisi yang ditampilkan:**
  - Judul layar: `Master Data — Lembaga Akreditasi`; subjudul: `{jumlah} lembaga terdaftar`.
  - **Memuat:** `Memuat...`
  - **Kosong:** `Belum ada lembaga.`; bila ada pencarian yang tidak cocok → `Tidak ada hasil`.
  - **Terisi:** tabel data dalam satu kartu.
  - **Error:** tidak ada state error khusus di tabel; kegagalan hapus ditampilkan lewat `alert` dengan pesan server.
- **Komponen/field yang tampil:**
  - Kolom tabel: `Nama Lembaga`, `Nama PT`, `Kota`, `Kontak`, `Email / Website`, `Status`, `Aksi`.
    - `Nama Lembaga` juga memuat baris kecil `PT: {nama_pt}` dan `CP: {nama_cp}` bila terisi.
    - `Kontak` memakai `telepon`; bila kosong memakai `telepon_cp`; bila keduanya kosong → `—`.
    - `Status` memakai komponen `StatusBadge` dengan pemetaan internal `aktif` → `lengkap`, selain itu → `ditolak`.
  - Pencarian: input dengan placeholder `Cari nama, nama PT, kota, atau email...`.
  - Tombol utama: `Tambah Lembaga`.
  - Modal: `Tambah Lembaga Baru` / `Ubah Lembaga`, dibagi empat seksi:
    - `Identitas & Logo` — `Nama Lembaga *` (placeholder `cth: Lembaga Akreditasi Mandiri X`), `Nama PT (Perusahaan)` (placeholder `cth: PT. Lembaga Akreditasi Indonesia`), `Logo` (pratinjau kotak 64px; tombol `Pilih Logo` / `Ganti Logo` / `Hapus`; keterangan `PNG/JPG/SVG, maks 2MB`), `Status` (pilihan `Aktif` / `Nonaktif`).
    - `Kontak & Kontak Person` — `Alamat`, `Kota`, `Telepon`, `Email`, `Website`, `Nama CP`, `Telepon CP`, `Deskripsi`.
    - `Pejabat Penandatangan` — `Nama Pejabat`, `Jabatan`.
    - `Informasi Pajak (untuk bukti potong PPh 21)` — `NPWP Lembaga` (placeholder `00.000.000.0-000.000`), `Kode KPP`, `Alamat Pajak`, `Kota Pajak`, `Nama Pejabat Pajak`, `Jabatan Pejabat Pajak`.
  - Footer modal: `Batal`, dan tombol simpan yang teksnya `Menyimpan...` saat mengirim, `Simpan Perubahan` (mode ubah) atau `Tambah Lembaga` (mode tambah).
- **Aksi yang bisa dilakukan:**
  - `Tambah Lembaga` → membuka modal kosong → simpan: **POST `/api/master/lembaga`** dengan badan `FormData` (semua field form + `logo` bila file dipilih + `hapus_logo` bila logo lama ditandai dihapus).
  - `Ubah` (ikon pensil di kolom `Aksi`) → modal terisi → simpan: **PUT `/api/master/lembaga/{id}`** (badan `FormData`).
  - `Hapus` (ikon tong sampah) → konfirmasi peramban `Hapus lembaga "{nama}"?` → **DELETE `/api/master/lembaga/{id}`**.
  - `Pilih Logo` / `Ganti Logo` → membuka pemilih berkas (`accept="image/png,image/jpeg,image/jpg,image/svg+xml"`); berkas tersimpan di badan permintaan sebagai field `logo`.
  - `Hapus` (logo) → menandai `hapus_logo=1`; saat logo sudah ada, backend menghapus berkas lama dan mengosongkan `logo_path`.
- **Validasi & pesan error:**
  - Client (zod): `Nama lembaga wajib diisi`; `Format email tidak valid`; `Format NPWP: 00.000.000.0-000.000` (polanya `^\d{2}\.\d{3}\.\d{3}\.\d{1}-\d{3}\.\d{3}$`).
  - Server: aturan logo `'logo' => 'nullable|image|mimes:png,jpg,jpeg,svg|max:2048'` (maks 2 MB).
  - Server: `File logo tidak ditemukan di storage.` (404) saat berkas logo hilang; `Gagal mengambil file logo: {pesan}` (500) saat pengambilan dari storage gagal.
  - Server (middleware privilege): `Anda tidak memiliki hak akses untuk aksi ini.` (403).
- **Peran & syarat akses:**
  - Menu tampil bila role punya `Master Data — Lihat`.
  - Endpoint: GET `Lihat`, POST `Tambah`, PUT `Ubah`, DELETE `Hapus` pada modul `Master Data`.
- **Catatan penting:**
  - Berkas logo disimpan melalui `AttachmentService` dengan modul `lembaga/logo` (path `{module}/{yyyy}/{mm}/{uuid}_{filename}`) dan dihapus dari R2 saat diganti/dihapus.
  - Saat lembaga baru dibuat, master akuntansi (COA + kategori jurnal) direplikasi ke lembaga baru supaya modul akuntansi langsung dapat dipakai.
  - Setiap penambahan/ubah memuat jejak audit (`lembaga.create` / `lembaga.update`).
  - Endpoint `GET /api/master/lembaga/{lembaga}/logo` bersifat publik (tanpa autentikasi) agar `<img>` di header dapat memuat logo.
  - `NPWP` dipakai untuk menandai waktu verifikasi (`npwp_diverifikasi_at`) bila nilainya berubah.

---

## Master Jenis Faskes
- **Route:** `/master-jenis-faskes` (sidebar: `Master Data` → `Master Jenis Faskes`; `privilege: ["Master Data", "Lihat"]`)
- **Kondisi yang ditampilkan:**
  - Judul: `Master Data — Jenis Faskes`; subjudul: `{jumlah} jenis faskes`.
  - **Memuat:** `Memuat...`
  - **Kosong:** `Belum ada data.`; bila ada pencarian yang tidak cocok → `Tidak ada hasil`.
  - **Terisi:** tabel data dalam satu kartu.
  - **Error:** tidak ada state error khusus di tabel; kegagalan hapus lewat `alert` dengan pesan server.
- **Komponen/field yang tampil:**
  - Kolom tabel: `Kode`, `Nama Jenis`, `Lembaga`, `Deskripsi`, `Status`, `Aksi`.
    - `Kode` ditampilkan sebagai badge monospasi, cadangan `—`.
    - `Status` memakai `StatusBadge` dengan pemetaan internal `aktif` → `lengkap`, selain itu → `ditolak`.
  - Pencarian: input placeholder `Cari nama atau kode...`.
  - Filter lembaga: `<select>` dengan opsi pertama `— Semua Lembaga / Lembaga Aktif —`; daftar lain memuat `{nama}` dan awalan ` (Aktif)` untuk lembaga yang sedang aktif.
  - Indikator filter: `Menampilkan: {nama lembaga}` (tebal).
  - Tombol utama: `Tambah Jenis`.
  - Modal: `Tambah Jenis Faskes` / `Ubah Jenis Faskes` — `Nama Jenis *` (placeholder `cth: Rumah Sakit`), `Kode` (placeholder `cth: RS`, dipaksa huruf kapital), `Status` (`Aktif` / `Nonaktif`), `Lembaga *` (opsi pertama `— Pilih Lembaga —`), `Deskripsi`.
  - Footer modal: `Batal`, `Tambah` / `Simpan` (`Menyimpan...` saat mengirim).
- **Aksi yang bisa dilakukan:**
  - `Tambah Jenis` → modal → **POST `/api/master/jenis-faskes`**.
  - `Ubah` → **PUT `/api/master/jenis-faskes/{id}`**.
  - `Hapus` → konfirmasi `Hapus jenis faskes "{nama}"?` → **DELETE `/api/master/jenis-faskes/{id}`**.
  - Pencarian dan filter lembaga mengubah parameter `q` dan `lembaga_id` pada **GET `/api/master/jenis-faskes`** (jika filter kosong, `lembaga_id` memakai lembaga aktif dari konteks).
- **Validasi & pesan error:**
  - Client (zod): `Nama wajib diisi`; `Lembaga wajib dipilih`.
  - Server (middleware privilege): `Anda tidak memiliki hak akses untuk aksi ini.` (403).
- **Peran & syarat akses:**
  - Menu tampil bila role punya `Master Data — Lihat`.
  - Endpoint: GET `Lihat`, POST `Tambah`, PUT `Ubah`, DELETE `Hapus` pada modul `Master Data`.
- **Catatan penting:**
  - Jenis faskes terikat pada satu lembaga; label `(Aktif)` menandai lemma yang sedang dipakai di header.
  - Daftar lembaga pemuat diambil dari `GET /api/master/lembaga?per_page=100`.
  - Jenis faskes dipakai sebagai filter wajib pada Master Faskes dan Master Biaya (lihat uraian layar terkait).

---

## Master Faskes
- **Route:** `/master-faskes` (sidebar: `Master Data` → `Master Faskes`; `privilege: ["Master Data", "Lihat"]`)
- **Kondisi yang ditampilkan:**
  - Judul: `Master Data — Faskes`; subjudul: `{jumlah} faskes terdaftar`.
  - **Memuat:** `Memuat...`
  - **Kosong:** `Belum ada data.`; bila ada pencarian yang tidak cocok → `Tidak ada hasil`.
  - **Terisi:** tabel data dalam satu kartu.
  - **Error:** kegagalan simpan tampil lewat `alert` dengan pesan server (`onError: err => alert(err.message)`); kegagalan hapus juga lewat `alert`.
- **Komponen/field yang tampil:**
  - Kolom tabel: `Nama Faskes`, `Jenis`, `Lembaga`, `Kota`, `Kontak`, `Status`, `Aksi`.
    - `Nama Faskes` juga memuat baris alamat kecil bila ada.
    - `Jenis` dirender sebagai `{kode} — {nama}` dalam warna hijau; cadangan `—`.
    - `Kontak` memakai `telepon`, atau `email` bila telepon kosong; cadangan `—`.
    - `Status` memakai `StatusBadge` (`aktif` → `lengkap`, selain itu → `ditolak`).
  - Pencarian: input placeholder `Cari nama, kota, email...`; pencarian di-debounce 300 ms sebelum dikirim.
  - Tombol: `Import CSV` (outline) dan `Tambah Faskes`.
  - Modal: `Tambah Faskes Baru` / `Ubah Faskes` — `Nama Faskes *`, `Jenis Faskes` (opsi `— Pilih Jenis —`, isi `{kode} — {nama}`), `No. Sertifikat`, `No. Surat Faskes`, `Lembaga` (opsi `— Pilih Lembaga —`), `Alamat`, `Kota`, `Provinsi`, `Kode Pos`, `Telepon`, `Email`, `Website`, `Nama Pimpinan`, `Telepon Pimpinan`, `Status`, `Deskripsi`.
  - Helper di bawah field `Lembaga`: `Lembaga otomatis terikat dengan jenis faskes "{nama jenis}".`
  - Footer modal: `Batal`, `Tambah` / `Simpan` (`Menyimpan...` saat mengirim).
- **Aksi yang bisa dilakukan:**
  - `Tambah Faskes` → **POST `/api/master/faskes`**.
  - `Ubah` → **PUT `/api/master/faskes/{id}`**.
  - `Hapus` → konfirmasi `Hapus faskes "{nama}"?` → **DELETE `/api/master/faskes/{id}`**.
  - `Import CSV` → membuka `ImportModal` dengan judul `Import Faskes dari CSV`, download template **GET `/api/master/faskes/template`** (nama berkas `template_faskes.csv`), unggah **POST `/api/master/faskes/import`**, deskripsi `Upload file CSV berisi data faskes.`, catatan sukses `Daftar faskes telah diperbarui.`, kolom hasil `Nama Faskes`.
  - Memilih `Jenis Faskes` otomatis mengisi `Lembaga` dengan `lembaga_id` jenis tersebut dan menonaktifkan pilihan lembaga bila hanya satu yang tersisa.
- **Validasi & pesan error:**
  - Client (zod): `Nama faskes wajib diisi`; `Format email tidak valid`.
  - Import (komponen `ImportModal`): `File harus berekstensi .csv atau .txt.` dan batas `Maksimal 5MB` / `Ekstensi yang didukung: .csv · Maksimal 5MB`.
  - Server (middleware privilege): `Anda tidak memiliki hak akses untuk aksi ini.` (403).
- **Peran & syarat akses:**
  - Menu tampil bila role punya `Master Data — Lihat`.
  - Endpoint: GET `/faskes`, `/faskes/dropdown`, `/faskes/template`, `/faskes/{id}` → `Lihat`; POST `/faskes`, `/faskes/import` → `Tambah`; PUT → `Ubah`; DELETE → `Hapus`.
- **Catatan penting:**
  - `lembaga_id` dan `jenis_faskes_id` kosong dikirim sebagai `null`.
  - Data dropdown faskes untuk form lain diambil dari `GET /api/master/faskes/dropdown`.
  - Master Faskes adalah sumber daftar faskes untuk form Pendaftaran, Master Biaya, dan Manajemen Akun.

---

## Master Tenaga Ahli
- **Route:** `/master-tenaga-ahli` (sidebar: `Master Data` → `Master Tenaga Ahli`; `privilege: ["Master Data", "Lihat"]`)
- **Kondisi yang ditampilkan:**
  - Judul: `Master Data — Tenaga Ahli`; subjudul: `{jumlah} tenaga ahli terdaftar`.
  - **Memuat:** `Memuat...`
  - **Kosong:** `Belum ada data.`; bila ada pencarian/filter aktif yang tidak cocok → `Tidak ada hasil`.
  - **Terisi:** tabel data dalam satu kartu + baris paginasi bila `last_page > 1`.
  - **Error:** galat server disimpan di `serverError` dan ditampilkan sebagai kotak merah di dalam modal: `Tenaga ahli ini sudah memiliki akun login: {email}. Akun tidak akan dibuat ulang.` (kondisi info, warna oranye) dan pesan galat umum `{serverError}`.
- **Komponen/field yang tampil:**
  - Kolom tabel: `No. Induk`, `Nama`, `No. WA`, `Peran`, `Jenis`, `No. Rekening`, `Status`, `Akun`, `Aksi`.
    - `No. WA` menjadi tautan `https://wa.me/{nomor}`.
    - `Peran` memakai pemetaan internal: `surveior` → `Surveior`, `verifikator` → `Verifikator`, `rekomendator` → `Reksa`, `kedua` → `Keduanya`.
    - `Jenis` berupa badge `TKPP` atau `TKSDU`.
    - `Status` badge dari `Aktif` / `Nonaktif` / `Cuti` / `Resign`.
    - `Akun` menampilkan badge `Ada` (hijau) plus `{akun_email} / {akun_username}`, atau badge `Belum ada` bila belum punya akun.
  - Pencarian: input placeholder `Cari nama atau NIK...` (debounce 250 ms).
  - Filter dropdown (4): `Semua Peran`/`Surveior`/`Verifikator`/`Keduanya`/`Reksa`, `Semua Jenis`/`TKPP`/`TKSDU`, `Semua Status`/`Aktif`/`Nonaktif`/`Cuti`/`Resign`, dan filter lembaga `— Semua Lembaga / Lembaga Aktif —`.
  - Tombol `Reset` muncul bila ada filter/pencarian aktif.
  - Paginasi: `Menampilkan {x}–{y} dari {total} tenaga ahli`, tombol `«`, `‹`, nomor halaman, `›`, `»`; 10 baris per halaman (`PER_PAGE = 10`).
  - Tombol utama: `Import CSV` dan `Tambah Tenaga Ahli`.
  - Modal: `Tambah Tenaga Ahli Baru` / `Ubah Tenaga Ahli`, tiga seksi:
    - `Data Tenaga Ahli` — `Nomor Induk *`, `Nama Lengkap *`, `No. WhatsApp`, `Peran *` (`Surveior`, `Verifikator`, `Keduanya (Surveior & Verifikator)`, `Reksa (Rekomendator)`), `Jenis` (`TKPP`, `TKSDU` — nonaktif untuk peran Verifikator/Reksa dengan catatan `Jenis hanya berlaku untuk surveior.`), `Status Aktif *`, `Lembaga *`, `Batas Penugasan per Periode`, `No. Rekening`, `Nama Bank`, `Atas Nama Rekening`.
    - `Identitas Pajak · Bukti Potong BP21` dengan badge `FR-5.9` — `NPWP`, `NIK (fallback)`, `Kode Objek Pajak`, `Kode KPP`, `Nama Sesuai NPWP/NIK`, `Status PTKP` (pilihan `TK/0 — Tidak Kawin, 0 tanggungan` … `K/3 — Kawin, 3 tanggungan`).
    - `Akun Login` — sakelar "Buat Akun Login" dengan keterangan `Buat sekaligus agar tidak perlu input dua kali.`; bila aktif tampil `Username Login`, `Email Login *`, `Role Akun *`, `Password *` (dengan tombol lihat/sembunyikan). Bila nonaktif tampil kotak: `Toggle "Buat Akun Login" untuk membuat akun login sekaligus.`
    - Untuk peran Reksa tampil catatan: `Akun Reksa yang dibuat dari tenaga ahli ini tertaut ke data rekening di atas, sehingga honor reksa otomatis membawa informasi rekening saat pembayaran AP.`
  - Footer modal: `Batal`, `Tambah` / `Simpan` (`Menyimpan...` saat mengirim).
- **Aksi yang bisa dilakukan:**
  - `Tambah Tenaga Ahli` → **POST `/api/master/tenaga-ahli`**.
  - `Ubah` → **PUT `/api/master/tenaga-ahli/{id}`**.
  - `Hapus` → konfirmasi `Hapus tenaga ahli "{nama}"?` → **DELETE `/api/master/tenaga-ahli/{id}`**.
  - `Import CSV` → `ImportModal` judul `Import Tenaga Ahli dari CSV`, template **GET `/api/master/tenaga-ahli/template`** (`template_tenaga_ahli.csv`), unggah **POST `/api/master/tenaga-ahli/import`**, deskripsi `Upload file CSV berisi data tenaga ahli.`, catatan `Daftar tenaga ahli telah diperbarui.`.
  - Sakelar "Buat Akun Login" menampilkan/menyembunyikan kolom akun; bila `buat_akun` aktif, `email`, `password`, `role_id`, `username` ikut dikirim; bila tidak, keempat field itu dihapus dari badan permintaan.
  - Memilih `Lembaga` memfilter daftar tenaga ahli (parameter `lembaga_id`).
- **Validasi & pesan error:**
  - Client (zod): `Nomor induk wajib diisi`; `Nama wajib diisi`; `Lembaga wajib dipilih`; `Jenis wajib dipilih untuk surveior` (hanya bila peran `surveior`/`kedua`); `Password minimal 8 karakter` (hanya bila `buat_akun` aktif).
  - Client (permitted check, bukan zod): bila `buat_akun` aktif dan `role_id` kosong → pesan di kotak merah `Role akun wajib dipilih.` dan permintaan tidak dikirim.
  - Import: `File harus berekstensi .csv atau .txt.`, `Maksimal 5MB`.
  - Server (middleware privilege): `Anda tidak memiliki hak akses untuk aksi ini.` (403).
- **Peran & syarat akses:**
  - Menu tampil bila role punya `Master Data — Lihat`.
  - Endpoint: GET `/tenaga-ahli`, `/tenaga-ahli/template` → `Lihat`; POST `/tenaga-ahli`, `/tenaga-ahli/import` → `Tambah`; PUT → `Ubah`; DELETE → `Hapus`.
- **Catatan penting:**
  - Bila tenaga ahli sudah punya akun, saat mengedit tampil peringatan `Tenaga ahli ini sudah memiliki akun login: {email}. Akun tidak akan dibuat ulang.`
  - Saat data tenaga ahli dibuat bersama akun, sistem menampilkan `alert`: `Akun berhasil dibuat!\nPassword: {password}\nSegera informasikan ke tenaga ahli dan minta diganti.`
  - Daftar pilihan role di form Akun Login disaring menurut peran tenaga ahli; role `Admin` dan `Faskes` dikeluarkan dari daftar (`EXCLUDED_ROLES`).
  - `peran = rekomendator` ditampilkan sebagai `Reksa`; reksa boleh ditautkan ke tenaga ahli agar honor reksa membawa rekening saat pembayaran AP.
  - Nomor induk wajib diisi dan dipakai sebagai identitas tenaga ahli pada penugasan serta slip honor.

---

## Master Biaya
- **Route:** `/master-biaya` (sidebar: `Master Data` → `Master Biaya`; `privilege: ["Master Data", "Lihat"]`)
- **Kondisi yang ditampilkan:**
  - Judul: `Master Biaya per Jenis Faskes`; subjudul: `{jumlah} jenis faskes, {jumlah} komponen biaya`.
  - **Memuat:** `Memuat...` (mengغطي pemuatan daftar biaya maupun dropdown jenis faskes).
  - **Kosong (tab aktif tanpa biaya):** `Belum ada data biaya untuk jenis faskes ini.`
  - **Terisi:** deretan tab per jenis faskes, tiga kartu ringkasan, lalu tabel biaya.
  - **Error:** tidak ada state error khusus; kegagalan hapus lewat `alert` dengan pesan server.
- **Komponen/field yang tampil:**
  - Tab per jenis faskes: badge jumlah komponen `{n}` lalu `{kode} — {nama}`; bila jenis faskes milik lembaga lain, ada badge tambahan berisi nama lembaga.
  - Kartu ringkasan: `Total Biaya`, `Jumlah Komponen`, `Jenis Faskes`.
  - Kolom tabel: `Nama Biaya`, `Tipe`, `Satuan`, `Jumlah`, `Wajib`, `Status`, `Aksi`.
    - `Tipe` badge dari `Per Siklus` / `Per Sertifikat` / `Tetap`.
    - `Satuan` dari `Per Siklus`, `Per Sertifikat`, `Per Periksa`, `Per Tahun`, `Sekali Bayar`.
    - `Jumlah` diformat sebagai rupiah (`Intl.NumberFormat` id-ID, tanpa desimal).
    - `Wajib` memakai `StatusBadge` (`wajib` → `lengkap`, selain itu → `draft`).
    - `Status` memakai `StatusBadge` (`aktif` → `lengkap`, selain itu → `ditolak`).
  - Tombol utama: `Tambah Biaya` (nonaktif bila belum ada tab aktif).
  - Modal: `Tambah Komponen Biaya` / `Ubah Komponen Biaya` — `Jenis Faskes *` (hanya saat tambah; opsi `— Pilih Jenis Faskes —`, isi `{kode} — {nama} ({nama lembaga})`), `Nama Biaya *`, `Jumlah (Rp) *`, `Tipe`, `Satuan`, `Status`, checkbox `Wajib (tidak bisa dihapus saat ada kontrak aktif)`, `Deskripsi`.
  - Footer modal: `Batal`, `Tambah` / `Simpan` (`Menyimpan...` saat mengirim).
- **Aksi yang bisa dilakukan:**
  - Klik tab jenis faskes → berganti daftar biaya yang tampil.
  - `Tambah Biaya` → **POST `/api/master/biaya`** dengan `jumlah` dikirim sebagai angka.
  - `Ubah` → **PUT `/api/master/biaya/{id}`**.
  - `Hapus` → konfirmasi `Hapus biaya "{nama_biaya}"?` → **DELETE `/api/master/biaya/{id}`**.
  - Data dimuat dari **GET `/api/master/biaya/by-jenis`** (terelompok per jenis faskes) dan **GET `/api/master/biaya/jenis-faskes`** (dropdown).
- **Validasi & pesan error:**
  - Client (zod): `Jenis faskes wajib dipilih`; `Nama biaya wajib diisi`; `Jumlah wajib diisi`.
  - Server (middleware privilege): `Anda tidak memiliki hak akses untuk aksi ini.` (403).
- **Peran & syarat akses:**
  - Menu tampil bila role punya `Master Data — Lihat`.
  - Endpoint: GET `/biaya`, `/biaya/by-jenis`, `/biaya/jenis-faskes`, `/biaya/{id}` → `Lihat`; POST → `Tambah`; PUT → `Ubah`; DELETE → `Hapus`.
- **Catatan penting:**
  - Komponen yang ditandai `Wajib` tidak bisa dihapus saat ada kontrak aktif (menurut label checkbox di form).
  - Master ini terpisah dari **Master Biaya Honor TA** (menu `Master Biaya Honor TA`) yang mengatur tarif honor tenaga ahli, bukan biaya layanan akreditasi.

---

## Master Biaya Honor TA
- **Route:** `/master-biaya-ta` (sidebar: `Master Data` → `Master Biaya Honor TA`; `privilege: ["Master Data", "Lihat"]`)
- **Kondisi yang ditampilkan:**
  - Judul: `Master Biaya Honor Tenaga Ahli`; subjudul: `Tarif bruto honor per peran dan tipe faskes. PPN mengikuti Konfigurasi Pajak aktif.`
  - **Memuat:** `Memuat...`
  - **Kosong:** `Belum ada master biaya. Klik + Tambah Tarif untuk mulai.`
  - **Terisi:** dua kotak tarif pajak, tabel tarif, dan (bila menambah/mengubah) form tarif.
  - **Error:** kotak merah berisi `error?.message || error` di bawah kotak tarif pajak.
- **Komponen/field yang tampil:**
  - Kotak informasi `Tarif PPN aktif` → `{persen}% (berlaku {tanggal})` atau `—` bila tidak ada tarif aktif; `Tarif PPh 21 aktif` → `{persen}% (berlaku {tanggal})` atau `—`.
  - Kolom tabel: `Peran`, `Tipe Faskes`, `Tarif Dasar (Bruto)`, `Status`, `Keterangan`, `Aksi`.
    - `Peran` ditampilkan `Surveior`, `Verifikator`, atau `Rekomendator`.
    - `Tipe Faskes` ditampilkan sebagai kode dalam bentuk badge.
    - `Tarif Dasar (Bruto)` diformat `Rp {angka}` dengan pemisah ribuan id-ID.
    - `Status` badge `Aktif` / `Nonaktif`.
    - `Keterangan` cadangan `—`.
  - Tombol utama: `+ Tambah Tarif`.
  - Form tarif (judul `Tambah Tarif` / `Edit Tarif`): `Peran *` (`Surveior`, `Verifikator`, `Rekomendator`), `Tipe Faskes *`, `Tarif Dasar (Bruto) *` (input angka, min 0, step 1000), `Keterangan` (placeholder `Catatan opsional`, maks 500 karakter).
    - Helper di bawah `Tarif Dasar (Bruto) *`: `Bruto honor per penugasan. PPN tidak dipotong (penerima individu/non-PKP), PPh 21 dihitung progresif per PP 58/2023 — lihat HonorCalculator.`
    - Saat mode ubah, pilihan `Peran` dan `Tipe Faskes` dinonaktifkan.
  - Tombol form: `Batal`, `Simpan` (`Menyimpan...` saat mengirim).
- **Aksi yang bisa dilakukan:**
  - `+ Tambah Tarif` → membuka form → **POST `/api/penugasan/master-biaya`** dengan `tarif_dasar` dikirim sebagai angka.
  - `Edit` → **PUT `/api/penugasan/master-biaya/{id}`**.
  - `Nonaktifkan` → konfirmasi `Nonaktifkan tarif untuk {peran} / {tipe_faskes}?` → **DELETE `/api/penugasan/master-biaya/{id}`**.
  - `Aktifkan` → konfirmasi `Aktifkan tarif untuk {peran} / {tipe_faskes}?` → **PUT `/api/penugasan/master-biaya/{id}`** dengan badan `{ aktif: true }`.
  - Daftar dimuat dari **GET `/api/penugasan/master-biaya`** yang mengembalikan `data`, `jenis_faskes_tersedia`, dan `tarif_pajak_aktif`.
- **Validasi & pesan error:**
  - Client: kolom `Peran`, `Tipe Faskes`, dan `Tarif Dasar (Bruto)` bertanda wajib (atribut `required`).
  - Client (alert): `Gagal menyimpan: {pesan}` saat simpan gagal; `Gagal: {pesan}` saat aktivasi/nonaktivasi gagal.
  - Server (middleware privilege): `Anda tidak memiliki hak akses untuk aksi ini.` (403).
- **Peran & syarat akses:**
  - Menu tampil bila role punya `Master Data — Lihat`.
  - Endpoint: GET → `Lihat`; POST → `Tambah`; PUT → `Ubah`; DELETE → `Hapus`, semuanya pada modul `Master Data`.
- **Catatan penting:**
  - Komentar kode pada berkas menyebut `Privilege: "Penugasan"`, tetapi rute dan middleware backend memakai modul `Master Data` — yang berlaku adalah `Master Data`.
  - Tarif yang berstatus nonaktif tidak dipakai untuk perhitungan honor baru.
  - Nilai PPN/PPh 21 yang ditampilkan hanyalah referensi tarif aktif; PPN tidak dipotong dari honor, PPh 21 dihitung progresif di `HonorCalculator`.

---

## Manajemen Akun
- **Route:** `/user-management` (sidebar: `Master Data` → `Manajemen Akun`; `privilege: ["Master Data", "Lihat"]`)
- **Kondisi yang ditampilkan:**
  - Judul: `Manajemen Akun Pengguna`; subjudul: `{jumlah} akun terdaftar`.
  - **Memuat:** `Memuat...`
  - **Kosong:** `Belum ada akun.`
  - **Terisi:** tabel akun + paginasi (15 baris per halaman) bila `last_page > 1`.
  - **Error:** kegagalan create/update/reset/hapus tampil lewat `alert` dengan pesan server (`Gagal reset password: {pesan}` untuk reset).
- **Komponen/field yang tampil:**
  - Kolom tabel: `Nama`, `Username`, `Email`, `Role`, `Lembaga`, `Faskes / TA`, `Status`, `Aksi`.
    - `Lembaga` menampilkan badge hijau untuk tiap lembaga akses; bila hanya ada `lembaga_id`, ditampilkan `lembaga?.nama` atau `lembaga_id`; bila tidak ada → `—`.
    - `Faskes / TA` menampilkan nama faskes; bila tidak ada faskes, `TA: {nama tenaga ahli}`; bila keduanya kosong → `—`.
    - `Status` badge `Aktif` / `Nonaktif` / `Terkunci`.
  - Pencarian: input placeholder `Cari nama atau email...`; pencarian baru dijalankan saat tombol Enter ditekan.
  - Filter: `Semua Role` (daftar role), `Semua Status` (`Aktif`, `Nonaktif`, `Terkunci`).
  - Tombol `Reset` (dengan ikon X) muncul bila ada filter/pencarian aktif.
  - Indikator kanan: `Menampilkan {x} dari {total} akun` atau `{total} akun`.
  - Paginasi: `Halaman {halaman} dari {total} — {jumlah} total`, tombol `«`, `‹`, nomor halaman, `›`, `»`.
  - Tombol utama: `Import CSV` dan `Tambah Akun`.
  - Modal: `Tambah Akun Baru` / `Ubah Akun — {nama}` — `Nama Lengkap *`, `Username` (placeholder `Kosongkan jika login pakai email/NIK`), `Email *`, `Role *` (opsi `— Pilih Role —`), `Faskes *` (hanya untuk role `Faskes`), `Tenaga Ahli` (wajib untuk role Surveior/Verifikator; opsional untuk Rekomendator), blok `Lembaga Akses *`, `Password` / `Password Baru`, `Status Akun`.
    - Blok `Lembaga Akses *` berisi keterangan `Bisa lebih dari satu. Lembaga pertama = default.`, tombol `Pilih Semua` dan `Bersihkan`, daftar centang; lembaga pertama yang dipilih diberi label `DEFAULT`.
    - Helper `Tenaga Ahli`: untuk Surveior/Verifikator `Tenaga ahli menjadi sumber data honor & pajak akun ini.`; untuk Rekomendator `Opsional. Bila diisi, data rekening tenaga ahli dipakai saat pembayaran honor AP reksa.`
    - Baris tiap tenaga ahli pada dropdown: `{nama} ({nomor induk})` + ` ✓` bila sudah punya akun + ` [nonaktif]` bila nonaktif + ` · tanpa rekening` bila rekening kosong.
  - Footer modal: `Tutup`, `Buat Akun` / `Simpan` (`Menyimpan...` saat mengirim).
- **Aksi yang bisa dilakukan:**
  - `Tambah Akun` → **POST `/api/master/akun`**; bila server mengembalikan `generated_password`, muncul `alert`: `Akun berhasil dibuat!\nPassword sementara: {password}\nSegera informasikan ke pengguna dan minta diganti.`
  - `Ubah` → **PUT `/api/master/akun/{id}`**; bila `password` dikosongkan pada mode ubah, field `password` dihapus dari badan permintaan.
  - `Hapus` → konfirmasi `Hapus akun "{nama}" ({email})?` → **DELETE `/api/master/akun/{id}`**.
  - `Reset Password` (ikon kunci) → konfirmasi `Reset password untuk "{nama}"?` → **POST `/api/master/akun/{id}/reset-password`**; hasil: `alert` `Password berhasil direset.\nPassword baru: {password}\nSegera informasikan ke pengguna.`
  - `Import CSV` → `ImportModal` judul `Import Akun dari CSV`, template **GET `/api/master/akun/template`** (`template_akun.csv`), unggah **POST `/api/master/akun/import`**, deskripsi `Upload file CSV berisi data akun pengguna.`, catatan `Daftar akun telah diperbarui.`, kolom hasil `Nama`, `Email`, `Username`.
  - `Pilih Semua` / `Bersihkan` mengatur daftar lembaga akses; tiap centang menambah/mengurangi satu lembaga.
- **Validasi & pesan error:**
  - Client (zod): `Nama lengkap wajib diisi`; `Email wajib diisi`; `Format email tidak valid`; `Role wajib dipilih`; `Minimal pilih satu lembaga`; `Password minimal 8 karakter` (hanya pada mode tambah).
  - Server: `Akun berhasil dibuat. Password sementara: {password}` (pesan sukses), `Akun pengguna dihapus.` (hapus), `Password berhasil direset.` + `new_password` (reset).
  - Server (impor): `File CSV tidak valid atau kosong.`; `Format baris tidak valid.`; `username '{username}' sudah digunakan.`; `Email '{email}' sudah digunakan.`; `Role '{role}' tidak ditemukan.`; `faskes_id '{id}' tidak ditemukan.`; `tenaga_ahli_nik '{nik}' tidak ditemukan di master tenaga ahli.`; `Akun dengan role '{role}' wajib terkait ke tenaga ahli (tenaga_ahli_nik).`; ringkasan `Import selesai. {sukses} berhasil, {gagal} gagal.`
  - Server (middleware privilege): `Anda tidak memiliki hak akses untuk aksi ini.` (403).
- **Peran & syarat akses:**
  - Menu tampil bila role punya `Master Data — Lihat`.
  - Endpoint: GET `/akun`, `/akun/template`, `/akun/{id}` → `Lihat`; POST `/akun`, `/akun/import` → `Tambah`; PUT `/akun/{id}` → `Ubah`; DELETE `/akun/{id}` → `Hapus`; POST `/akun/{id}/reset-password` → `Ubah`.
- **Catatan penting:**
  - Role `Admin` tidak dapat dipilih dari form (`EXCLUDED_ROLES = ["Admin"]`).
  - Field `lembaga_ids` wajib minimal satu; lembaga urutan pertama menjadi default sesi.
  - Id akun berupa UUID; rute backend membatasi parameter akun ke format UUID agar parameter tidak valid langsung 404 di routing.

---

## Template PKS
- **Route:** `/pks-template-settings` (sidebar: `Master Data` → `Template PKS`; `privilege: ["Master Data", "Lihat"]`)
- **Kondisi yang ditampilkan:**
  - Judul: `Template PKS`; subjudul: `Tulis isi PKS dalam satu editor. Gunakan marker [PASAL:nomor|judul] untuk menandai tiap pasal.`
  - **Memuat:** `Memuat...`
  - **Kosong:** `Belum ada template. Klik "Tambah Template" untuk membuat.`
  - **Terisi:** tabel template; tombol `Lihat` membuka modal pratinjau, `Edit` membuka editor.
  - **Error:** `serverError` ditampilkan sebagai kotak merah di atas form (`Gagal menyimpan.` atau pesan dari server).
- **Komponen/field yang tampil:**
  - Kotak petunjuk: `Petunjuk: Gunakan marker [PASAL:1|Judul] dan [/PASAL] untuk menandai setiap pasal. Marker [HEADER], [FOOTER] untuk teks tambahan. Placeholder seperti [NAMA_FASKES] akan otomatis terganti saat PDF dibuat.`
  - Kolom tabel: `Jenis Faskes`, `Nama Template`, `Blade`, `Status`, `Aksi`.
    - `Jenis Faskes` menampilkan `{nama} ({kode})` atau teks miring `Fallback / Default` bila template tidak terikat jenis faskes.
    - `Blade` ditampilkan sebagai `{blade}.blade.php`.
    - `Status` berupa badge `DEFAULT`, `AKTIF` / `NONAKTIF`, dan `FALLBACK` (bila `jenis_faskes_id` kosong).
  - Tombol utama: `Tambah Template`.
  - Modal tambah/ubah: `Jenis Faskes` (opsi `— Fallback / Default —`), `Nama Template *`, `Blade File *` (opsi `— Pilih blade —`), checkbox `Aktif`, checkbox `Jadikan default`, editor teks, tombol `Batal`, `Tambah Template` / `Simpan` (`Menyimpan...` saat mengirim).
  - Editor: toolbar `H1`, `H2`, `H3`, `B`, `I`, ikon rata kiri / rata tengah / rata kanan, bullet list, numbered list, blockquote, tombol marker `[HEADER]`, `[FOOTER]`, `+ Pasal`, dan daftar `Placeholder:` (4 pertama ditampilkan sebagai tombol; sisanya lewat dropdown `+ lagi...`).
  - Hint di bawah editor: `Hint: Tekan Enter 2x untuk jarak antar blok. Marker [PASAL:nomor|judul] menentukan pembagian pasal di PDF.`
  - Modal `Lihat`: judul `Preview: {nama}`; isi menampilkan blok `HEADER:`, tiap pasal dengan badge `Pasal {nomor}` + judul, dan blok `FOOTER:`. Bila isi kosong: `Konten tidak ditemukan.`
  - Daftar `BUNDLED_BLADES`: `pks-pus-kawasaki` (Pus-kawasaki), `pks-klinik` (Klinik), `pks-lab` (Laboratorium), `pks-rs` (Rumah Sakit), `pks` (Generic Default).
- **Aksi yang bisa dilakukan:**
  - `Tambah Template` → simpan: **POST `/api/master/pks-templates`** dengan badan `{ nama, blade, jenis_faskes_id, aktif, is_default, konten }`; `konten` berisi teks marker apa adanya.
  - `Edit` → **PUT `/api/master/pks-templates/{id}`** (badan sama).
  - `Lihat` → membuka modal pratinjau (tanpa permintaan baru).
  - `Preview PDF` → **GET `/api/master/pks-templates/{id}/preview-pdf`** dengan header `Authorization: Bearer {token}`; hasilnya blob PDF yang dibuka di tab baru.
  - `Reset` (hanya untuk blade bawaan) → konfirmasi `Reset template "{nama}" ke versi bawaan? Konten kustom akan hilang.` → **POST `/api/master/pks-templates/{id}/reset`**.
  - `Nonaktifkan` / `Aktifkan` → **PUT `/api/master/pks-templates/{id}`** dengan badan `{ aktif: !aktif }`.
  - `Hapus` (hanya bila template bukan default) → konfirmasi `Hapus template "{nama}"?` → **DELETE `/api/master/pks-templates/{id}`**.
  - Toolbar: H1/H2/H3, bold `**teks**`, italic `_teks_`, `[center]`, `[right]`, `• `, `1. `, `> `, `[HEADER]`, `[FOOTER]`, `+ Pasal` menyisipkan blok ke teks pada posisi kursor; tombol placeholder menyisipkan placeholder ke teks.
- **Validasi & pesan error:**
  - Client (zod): `Nama template wajib diisi`; `Blade wajib dipilih`.
  - Client (galat server pada simpan): `Gagal menyimpan.` (cadangan), atau pesan dari `data.message` / pesan validasi pertama dari server.
  - Client (Preview PDF gagal): `Gagal generate preview PDF.` (cadangan) atau pesan dari server.
  - Server (middleware privilege): `Anda tidak memiliki hak akses untuk aksi ini.` (403).
- **Peran & syarat akses:**
  - Menu tampil bila role punya `Master Data — Lihat`.
  - Endpoint: GET `/pks-templates`, `/pks-templates/{id}`, `/pks-templates/{id}/preview-pdf` → `Lihat`; POST → `Tambah`; PUT → `Ubah`; DELETE → `Hapus`; POST `/pks-templates/{id}/reset` → `Ubah`.
- **Catatan penting:**
  - Format isi PKS memakai marker: `[HEADER] ... [/HEADER]`, `[PASAL:nomor|judul] ... [/PASAL]`, `[FOOTER] ... [/FOOTER]`.
  - Teks bawaan (`DEFAULT_TEXT`) memuat 10 pasal dengan judul: Maksud dan Tujuan, Ruang Lingkup, Pelaksanaan Survei, Hak dan Kewajiban PIHAK PERTAMA, Hak dan Kewajiban PIHAK KEDUA, Pembiayaan, Kerahasiaan, Perselisihan, Jangka Waktu, Penutup.
  - Editor menerima data lama berformat `pasal1`..`pasal10` (flat) dan mengonversinya otomatis ke format marker.
  - Placeholder `[JENIS_FASKES]` dan placeholder lain yang dikirim backend akan terganti otomatis saat PDF dibuat.
  - Template `FALLBACK` dipakai bila tidak ada template yang terikat ke jenis faskes tersebut; template `DEFAULT` tidak dapat dihapus.

---

## Layar terkait
- Bab 05 — Keuangan (invoice & pembayaran memakai komponen biaya dari Master Biaya).
- Bab 06 — Akuntansi (master akuntansi/COA direplikasi otomatis saat lembaga baru dibuat).
- Bab 08 — Pengaturan & Hak Akses (Manajemen Akun, Master Biaya Honor TA, konfigurasi pajak).
