# Bab 03 — Surveior & Verifikator (catatan faktual)

Sumber: `frontend/src/views/surveior/PenugasanSaya.jsx`, `frontend/src/views/surveior/LaporanKendala.jsx`,
`frontend/src/views/surveior/GantiPassword.jsx`, `frontend/src/layouts/SurveiorLayout.jsx`,
`frontend/src/App.jsx`, `frontend/src/routes.js`, `backend/routes/api.php`,
`backend/app/Http/Controllers/Api/PenugasanController.php`, `backend/app/Http/Controllers/Api/LaporanKendalaController.php`,
`backend/app/Http/Controllers/Api/AuthController.php`, `backend/app/Models/Penugasan.php`, `backend/app/Models/LaporanKendala.php`.

Portal Surveior dilayani `SurveiorLayout` di alamat awalan `/surveior`. Peran **Verifikator** memakai portal
yang sama (`App.jsx`: role `Verifikator` diarahkan ke `/surveior/penugasan`). `frontend/src/routes.js` tidak
memuat entri portal Surveior — routing `/surveior/*` ditulis langsung di `frontend/src/App.jsx`.

---

## Penugasan Saya
- **Route:** `/surveior/penugasan` (dalam portal `/surveior`)
- **Kondisi/estate yang ditampilkan:**
  - Judul: `Halo, {nama}!` — `{nama}` diambil dari data pengguna yang tersimpan di peramban; teks cadangan `Surveior` bila nama kosong.
  - Subjudul: `Daftar penugasan yang diberikan kepada Anda. Silakan konfirmasi kesediaan Anda.`
  - **Memuat:** `Memuat penugasan...`
  - **Kosong:** judul `Tidak ada penugasan`, keterangan `Anda belum menerima penugasan saat ini.` (dengan ikon kamera)
  - **Terisi:** kartu penugasan dalam grid (minimal lebar kartu 360px). Setiap kartu memuat badge status di kanan atas, nama faskes, nama lembaga (bila ada), daftar tanggal, blok Surat Tugas (bila ada), dan tombol aksi sesuai status.
  - **Error:** tidak ada state error khusus; kegagalan pemuatan membuat daftar kosong → tampil kartu kosong.
- **Komponen/field yang tampil:**
  - Label kecil di atas nama faskes: `Penugasan {jenis}` (jenis: `survei` atau `verifikasi`).
  - Nama faskes (dari `siklus.faskes.nama`, cadangan `Faskes`), nama lembaga (`siklus.lembaga.nama`).
  - Badge status (teks persis): `Menunggu Konfirmasi` (menunggu), `Sedang Bertugas` (sedang_bertugas), `Selesai` (selesai), `Ditolak` (ditolak), `Dibatalkan` (dibatalkan), `Digantikan` (digantikan).
  - Tanggal — untuk jenis `verifikasi`:
    - `Tanggal Kirim Laporan Survei: {tanggal}`
    - `Tanggal Kirim Laporan Verifikasi: {tanggal}`
  - Tanggal — untuk jenis selain `verifikasi`:
    - `Tanggal Mulai Survei: {tanggal}`
    - `Tanggal Selesai Survei: {tanggal}`
    - `Tanggal Kirim Laporan Survei: {tanggal}`
  - Blok `Surat Tugas` (hanya bila ada surat tugas pada penugasan itu atau pada penugasan lain dengan siklus+jenis yang sama): tombol `Buka` dan `Unduh`.
  - Tombol `Lapor Kendala` — muncul bila status `menunggu` atau `sedang_bertugas`.
  - Tombol `Terima` dan `Tolak` — muncul bila status `menunggu`.
  - Tombol `Tandai Selesai` atau `Kirim Laporan & Selesai` — muncul bila status `sedang_bertugas`. Teks tombol berbeda menurut `sudah_ada_laporan`: `Tandai Selesai` bila sudah ada, `Kirim Laporan & Selesai` bila belum.
  - Petunjuk di bawah tombol selesai: `Laporan sudah dikirim oleh teammate.` (hijau) bila `sudah_ada_laporan`, `Lampirkan screenshot bukti pengerjaan.` bila belum.
  - Status terminal: teks `Penugasan ini sudah selesai.` / `Penugasan ini sudah ditolak.` / `Penugasan ini sudah ditutup.`
  - **Modal "Kirim Laporan Pengerjaan" / "Tandai Selesai"** (judul modal: `Kirim Laporan Pengerjaan` bila belum ada laporan, `Tandai Selesai` bila sudah ada):
    - Bila laporan sudah ada: teks `Laporan pengerjaan sudah dikirim oleh teammate. Anda cukup menandai penugasan ini selesai.`
    - Bila belum: teks `Lampirkan screenshot atau dokumen bukti pengerjaan untuk penugasan {jenis} di {nama faskes}.`
    - Label `File Bukti Pengerjaan`, area unggah (border putus-putus) berisi teks `Klik untuk pilih file atau drag & drop` dan `JPG, PNG, GIF, PDF — maks. 10 MB`; bila file gambar dipilih, pratinjau gambar ditampilkan.
    - Setelah file dipilih: nama file, ukuran dalam MB (2 desimal), dan tombol `Hapus`.
    - Label `Keterangan (opsional)`, textarea 3 baris, placeholder `cth: Survei lapangan selesai, menunggu hasil laboratorium...`, panjang maksimum 1000 karakter.
    - Tombol `Batal` dan `Tandai Selesai` (saat proses: `Memproses...`).
  - **Modal "Tolak Penugasan"**:
    - Teks: `Anda akan menolak penugasan {jenis} di {nama faskes}. Sistem akan otomatis menawarkannya ke kandidat lain dalam antrian.`
    - Label `Alasan Penolakan (opsional)`, textarea 3 baris, placeholder `cth: Konflik kepentingan, tidak dapat dihubungi, dll.`
    - Kotak pesan error merah berisi `error.message` dari server bila permintaan gagal.
    - Tombol `Batal` dan `Tolak Penugasan` (saat proses: `Memproses...`).
  - **Modal "Lapor Kendala"**:
    - Teks: `Laporkan kendala untuk penugasan {jenis} di {nama faskes}. Admin akan menindaklanjuti laporan Anda.`
    - Label `Jenis Kendala *`, pilihan: `Conflict of Interest (CoI)` dan `Force Majeure`.
    - Label `Deskripsi Kendala *`, textarea 4 baris, placeholder `Jelaskan kendala yang Anda alami...`, panjang maksimum 5000 karakter.
    - Tombol `Batal` dan `Kirim Laporan` (saat proses: `Mengirim...`).
- **Aksi yang bisa dilakukan:**
  - `Terima` — konfirmasi browser `Konfirmasi kesediaaan untuk penugasan {jenis} di siklus ini?` → **PATCH `/api/penugasan/{id}/konfirmasi`** dengan badan `{ konfirmasi: true }`. Server membalas pesan `Kesediaan dikonfirmasi. Penugasan sedang berjalan.` Status penugasan menjadi `sedang_bertugas`, status tenaga ahli menjadi `sedang bertugas`, histori antrian menjadi `diterima`.
  - `Tolak` → **PATCH `/api/penugasan/{id}/konfirmasi`** dengan badan `{ konfirmasi: false, catatan }` (catatan opsional). Server membalas `Penolakan dicatat. Admin akan menugaskan pengganti.` Status penugasan menjadi `ditolak`, histori antrian mencatat penolakan.
    - Catatan kode: pada jalur penolakan ini sistem **tidak** mengganti tenaga ahli secara otomatis; admin wajib menugaskan ulang lewat endpoint `appoint`/`replace`.
  - `Tandai Selesai` / `Kirim Laporan & Selesai` → **PUT `/api/penugasan/{id}/selesai`** dengan `FormData` berisi `file_laporan` (opsional) dan `keterangan` (opsional, dibersihkan dari spasi). Server membalas `Penugasan ditandai selesai. Laporan pengerjaan telah diunggah.` File disimpan lewat `AttachmentService` pada folder `laporan_pengerjaan`; file hanya disimpan bila belum ada laporan lain untuk siklus+jenis yang sama.
  - `Lapor Kendala` (modal) → **POST `/api/penugasan/kendala`** dengan badan `{ penugasan_id, jenis, deskripsi }`.
  - `Buka` (Surat Tugas) → **GET `/api/penugasan/surat-tugas/{id}/serve`**; blob PDF dibuka di tab baru.
  - `Unduh` (Surat Tugas) → **GET `/api/penugasan/surat-tugas/{id}/download`**; nama berkas `Surat_Tugas_{nomor_surat}.pdf` bila ada nomor surat, selain itu `Surat_Tugas.pdf`.
  - Pemuatan daftar → **GET `/api/penugasan/saya`**.
- **Validasi & pesan error:**
  - Client — konfirmasi kesediaan: sebelum mengirim, dimunculkan konfirmasi peramban `Konfirmasi kesediaaan untuk penugasan {jenis} di siklus ini?` (batal berarti tidak ada permintaan).
  - Client — ukuran berkas: `alert` `Ukuran file maksimal 10 MB.` bila berkas lebih dari 10 MB; berkas ditolak.
  - Client — bukti wajib: `alert` `Harap lampirkan bukti pengerjaan terlebih dahulu.` bila penugasan belum punya laporan dari teammate dan pengguna tidak mengunggah berkas.
  - Client — kendala: pesan zod `Deskripsi kendala wajib diisi` bila deskripsi kosong.
  - Server — `PUT /penugasan/{id}/selesai`: `Penugasan belum berjalan.` (422) bila penugasan bukan berstatus `sedang_bertugas`; validasi `file_laporan` harus berkas dengan tipe `jpg,jpeg,png,gif,pdf` maksimal 10240 KB dan `keterangan` maksimal 1000 karakter.
  - Server — `PATCH /penugasan/{id}/konfirmasi`: `Tidak diizinkan.` (403) bila akun yang login bukan tenaga ahli yang ditugaskan pada penugasan tersebut; validasi `konfirmasi` wajib boolean dan `catatan` maksimal 2000 karakter.
  - Server — berkas surat tugas: `Gagal membuka Surat Tugas.` / `Gagal mengunduh Surat Tugas.` (pesan di peramban) bila permintaan gagal.
  - Server — privilege: `Anda tidak memiliki hak akses untuk aksi ini.` (403) bila privilege `Penugasan, Ubah` tidak dimiliki.
- **Peran & syarat akses:**
  - Portal `/surveior/*` dipakai peran **Surveior** dan **Verifikator** (`App.jsx`).
  - `GET /api/penugasan/saya` — privilege `Penugasan, Lihat`.
  - `PATCH /api/penugasan/{penugasan}/konfirmasi` dan `PUT /api/penugasan/{penugasan}/selesai` — privilege `Penugasan, Ubah`.
  - `GET /api/penugasan/surat-tugas/{surat}/serve` dan `/download` — privilege `Penugasan, Lihat`.
  - `POST /api/penugasan/kendala` — privilege `Penugasan, Ubah`.
  - according `docs/manual/PANDUAN-PENULISAN.md` §5: Surveior memiliki Penugasan (Lihat/Ubah/Ekspor); Verifikator memiliki Penugasan (Lihat/Tambah/Ubah/Final).
  - Data dibatasi per lembaga: `myAssignments` memfilter penugasan agar siklus-nya berada di lemma yang sedang aktif (session `lembaga_id`).
- **Catatan penting:**
  - Alur kerja Surveior: **Surat tugas → konfirmasi kesediaan → laporan pengerjaan (+ bukti berkas) → selesai**. Tombol `Lapor Kendala` tersedia sepanjang masa penugasan aktif (`menunggu`/`sedang_bertugas`) untuk Conflict of Interest atau Force Majeure.
  - Surat tugas bersifat satu per siklus+jenis: bila penugasan milik pengguna sendiri tidak memuat surat tugas, aplikasi mencari surat tugas milik rekan pada siklus+jenis yang sama (`siblingSuratMap`).
  - Pada satu siklus terdapat 2 tenaga ahli survei (1 TKPP + 1 TKSDU). Field `sudah_ada_laporan` menandai bahwa teammates sudah mengunggah laporan; bila sudah ada, pengguna hanya perlu menekan `Tandai Selesai` tanpa melampirkan berkas.
  - Pemberian tugas otomatis oleh admin (`POST /penugasan/appoint`) mengunggah Surat Tugas berformat `ST/SRV|VER/{tahun}/{kode faskes}/{urutan 4 digit}` dan mengabari tenaga ahli (email/WhatsApp).
  - Efek samping di server setelah `PUT /selesai`: untuk penugasan `survei`, tahap siklus dinaikkan menjadi `5` bila sudah ada laporan survei; untuk penugasan `verifikasi`, tahap siklus dinaikkan menjadi `7` bila seluruh penugasan verifikasi pada siklus itu selesai. Pencatatan AP honor **tidak** terjadi di sini — ditunda sampai rekomendasi disetujui.

---

## Lapor Kendala
- **Route:** `/surveior/kendala`
- **Kondisi/estate yang ditampilkan:**
  - Judul: `Laporan Kendala`; subjudul `Laporkan Conflict of Interest atau Force Majeure selama penugasan.`
  - **Memuat:** `Memuat...`
  - **Kosong:** judul `Belum ada laporan`, keterangan `Anda belum pernah melaporkan kendala. Klik "Buat Laporan" jika ada halangan.`
  - **Terisi:** daftar kartu laporan (satu kartu per laporan), disusun vertikal dengan jarak 3.
  - **Error:** tidak ada state error khusus di daftar; pesan kegagalan tampil di dalam modal pembuatan.
- **Komponen/field yang tampil:**
  - Tombol `Buat Laporan` (ikon plus) di kanan atas judul.
  - Per kartu laporan:
    - Badge jenis: `Conflict of Interest (CoI)` atau `Force Majeure`.
    - Nama faskes (dari `penugasan.siklus.faskes.nama`, cadangan `—`).
    - Badge status: `Selesai` (status `selesai`), `Sedang Diproses` (status `diproses`), `Dilaporkan` (status lain, mis. `menunggu`).
    - Isi deskripsi laporan.
    - Baris `Dilaporkan: {tanggal}`.
    - Kotak catatan admin (hanya bila ada `catatan_admin`): teks tebal `Catatan Admin:` diikuti isi catatan.
  - **Modal "Buat Laporan Kendala"**:
    - Bila tidak ada penugasan aktif, modal menampilkan kotak peringatan: `Tidak ada penugasan aktif. Anda hanya bisa melapor untuk penugasan yang sedang menunggu atau sedang bertugas.` (tombol kirim nonaktif).
    - Label `Penugasan *` dengan dropdown; pilihan awal `— Pilih —`, tiap opsi `{jenis} — {nama faskes}` (cadangan `Faskes`).
    - Label `Jenis Kendala *` dengan pilihan `Conflict of Interest (CoI)` dan `Force Majeure` (nilai awal: `Conflict of Interest (CoI)`).
    - Label `Deskripsi *`, textarea 4 baris, placeholder `Jelaskan kendala yang Anda alami...`, panjang maksimum 5000 karakter.
    - Petunjuk: `Minimal 10 karakter. Admin akan menerima laporan ini dan menindaklanjuti.`
    - Tombol `Batal` dan `Kirim Laporan` (saat mengirim: `Mengirim...`).
    - Kotak merah di atas formulir berisi pesan error bila pengiriman gagal.
- **Aksi yang bisa dilakukan:**
  - `Buat Laporan` — membuka modal dan mengisi otomatis penugasan pertama yang aktif (status `menunggu`/`sedang_bertugas`) bila tersedia.
  - `Kirim Laporan` — **POST `/api/penugasan/kendala`** dengan badan `{ penugasan_id, jenis, deskripsi }`. Server membalas HTTP 201 dengan data laporan; daftar dimuat ulang.
  - `Batal` — menutup modal tanpa menyimpan.
  - Pemuatan daftar → **GET `/api/penugasan/kendala/saya`** (hanya laporan milik tenaga ahli yang sedang login; server memfilter `tenaga_ahli_id`).
  - Pemuatan daftar penugasan aktif → **GET `/api/penugasan/saya`**, lalu disaring di peramban ke status `menunggu` dan `sedang_bertugas`.
- **Validasi & pesan error:**
  - Client (zod): `Pilih penugasan terlebih dahulu` bila `penugasan_id` kosong; `Deskripsi minimal 10 karakter` bila deskripsi kurang dari 10 karakter.
  - Client (submit): pesan error ditampilkan apa adanya dari server; bila pesan kosong dipakai teks cadangan `Gagal mengirim laporan.`
  - Server (`POST /penugasan/kendala`): `Akun ini tidak terkait dengan tenaga ahli.` (403) bila akun tidak tertaut ke tenaga ahli; `Tidak diizinkan.` (403) bila tenaga ahli yang melapor bukan pemilik penugasan; validasi `penugasan_id` wajib UUID yang ada, `jenis` wajib salah satu dari `conflict_of_interest`/`force_majeure`, `deskripsi` wajib teks maksimal 5000 karakter.
  - Server (privilege): `Anda tidak memiliki hak akses untuk aksi ini.` (403) bila `Penugasan, Ubah` tidak dimiliki.
- **Peran & syarat akses:**
  - `GET /api/penugasan/kendala/saya` — privilege `Penugasan, Lihat`.
  - `POST /api/penugasan/kendala` — privilege `Penugasan, Ubah`.
  - Ditempatkan di portal `/surveior` (Surveior & Verifikator).
- **Catatan penting:**
  - Laporan kendala dibuat dengan status awal `menunggu` (`LaporanKendala::STATUS_MENUNGGU`); admin memprosesnya lewat `PATCH /api/penugasan/kendala/{kendala}/proses` yang mengubah status menjadi `diproses` (privilege `Penugasan, Ubah`). Status `selesai` tidak diubah lewat endpoint ini.
  - Dua pintu dibuat laporan kendala: menu ini (umum, untuk semua penugasan aktif) dan tombol `Lapor Kendala` pada kartu di menu **Penugasan Saya** (terikat ke satu penugasan tertentu).
  - Admin dapat melihat seluruh laporan kendala satu siklus lewat `GET /api/penugasan/kendala/siklus/{siklus}/kendala` (privilege `Penugasan, Lihat`).
  - Catatan admin yang tampil di kartu berasal dari field `catatan_admin`; field tersebut tidak diisi oleh layar ini.

---

## Ganti Password
- **Route:** `/surveior/ganti-password`
- **Kondisi/estate yang ditampilkan:**
  - Judul: `Ganti Password`; subjudul `Ubah password akun Anda. Password baru minimal 8 karakter.`
  - **Sukses:** kotak hijau dengan ikon centang berisi `Password berhasil diubah.` (formulir dikosongkan kembali).
  - **Error:** kotak merah berisi pesan dari server (`error.message`).
  - Formulir selalu tampil di dalam satu kartu, lebar maksimum 480px.
- **Komponen/field yang tampil:**
  - Label `Password Saat Ini *` — input password, placeholder `Masukkan password saat ini`.
  - Label `Password Baru *` — input password, placeholder `Minimal 8 karakter`.
  - Label `Konfirmasi Password Baru *` — input password, placeholder `Ulangi password baru`.
  - Tombol `Simpan Password Baru` (saat menyimpan: `Menyimpan...`).
- **Aksi yang bisa dilakukan:**
  - `Simpan Password Baru` — **PUT `/api/auth/password`** dengan badan `{ current_password, new_password, new_password_confirmation }`.
  - Server membalas pesan `Password berhasil diubah. Silakan login ulang.` dan **menghapus token akses yang sedang dipakai** (`currentAccessToken()->delete()`), sehingga sesi peramban lain ikut terputus.
- **Validasi & pesan error:**
  - Client (zod): `Password saat ini wajib diisi` bila kosong; `Password baru minimal 8 karakter` bila < 8 karakter; `Konfirmasi password baru tidak cocok` bila konfirmasi tidak sama dengan password baru (pesan menempel pada field konfirmasi).
  - Server (`PUT /auth/password`): pesan validasi `Password baru tidak boleh sama dengan password lama.` dan `Konfirmasi password baru tidak cocok.`; bila password lama salah: `Password lama salah.` (422).
  - Server: password baru wajib, minimal 8 dan maksimal 72 karakter, serta wajib berbeda dari password lama.
- **Peran & syarat akses:**
  - Menu `Ganti Password` di portal `/surveior` — tersedia untuk peran Surveior dan Verifikator.
  - Endpoint `PUT /api/auth/password` berada di grup路由 autentikasi (`auth:sanctum`), tanpa modul privilege terpisah.
- **Catatan penting:**
  - Teks sukses yang tampil di layar adalah `Password berhasil diubah.` (dari peramban), sedangkan pesan balasan server adalah `Password berhasil diubah. Silakan login ulang.` — perbedaan ini berasal dari dua sumber terpisah di kode.
  - Setelah password diganti, token yang sedang dipakai dihapus oleh server; aplikasi tidak memaksa keluar otomatis, dan menu `Keluar` di sidebar tetap cara manual untuk mengosongkan data peramban.

---

## Portal Surveior (SurveiorLayout)
- **Route:** kerangka `/surveior` (membungkus `/surveior/penugasan`, `/surveior/kendala`, `/surveior/ganti-password`).
- **Kondisi/estate yang ditampilkan:**
  - Sidebar desktop lebar 240px; di layar kecil (< lg) sidebar diganti tombol menu yang memunculkan panel lebar 288px dengan latar gelap `bg-black/50`.
  - Bila token tidak ada di peramban, aplikasi langsung mengarahkan ke `/auth/login`.
- **Komponen/field yang tampil:**
  - Logo: `lembaga_logo` bila tersedia, jika tidak memakai `LMNIcon`. Nama lembaga/mitra: `LIPA MITRA NUSA` sebagai nilai cadangan, atau nama lembaga dari `lembaga_name`; subjudul `Lembaga Akreditasi` (hanya tampil bila nama lembaga tersedia).
  - Label portal: `Portal {role}` dari data pengguna, cadangan `Portal Surveior`.
  - Menu navigasi (3 item): `Penugasan Saya` → `/surveior/penugasan`; `Lapor Kendala` → `/surveior/kendala`; `Ganti Password` → `/surveior/ganti-password`.
  - Judul di header: nama menu yang sedang aktif.
  - Header kanan: tombol ganti tema (terang/gelap) dan tombol lonceng.
  - Blok pengguna di bawah sidebar: inisial nama (maks. 2 huruf, huruf besar), nama pengguna (cadangan `—`), dan nama peran (cadangan `Surveior`).
  - Tombol `Keluar` di footer sidebar.
  - Footer: `© {tahun} {nama lembaga/mitra} — {label portal}`.
- **Aksi yang bisa dilakukan:**
  - `Keluar` — menghapus `token`, `user`, `lembaga_name`, dan `lembaga_logo` dari peramban, lalu mengarahkan ke `/auth/login`.
  - Klik logo sidebar — kembali ke `/surveior/penugasan`.
- **Validasi & pesan error:**
  - Tidak ada validasi formulir pada layout. Jika token tidak ada, terjadi pengalihan langsung ke `/auth/login` tanpa pesan.
- **Peran & syarat akses:**
  - Layout dipakai oleh peran **Surveior** dan **Verifikator**. Menu tidak memakai field `privilege` di `routes.js` (portal ini dirouting terpisah di `App.jsx`); hak akses sebenarnya ditegakkan di backend lewat middleware `privilege:Penugasan,...`.
- **Catatan penting:**
  - Nama lembaga dan logo dibaca langsung dari `localStorage` (`lembaga_name`, `lembaga_logo`) agar tampil sejak render pertama tanpa menunggu sinkronisasi konteks.
  - Setelah logout, data `menu_actions` juga dihapus oleh `useAuth.logout` sehingga sidebar menu portal internal ikut kosong.
  - Menu portal Surveior hanya berisi tiga halaman; tidak ada akses ke menu Admin/Keuangan dari portal ini.
