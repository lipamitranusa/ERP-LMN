# Catatan faktual — Bab 01: Portal Faskes & Login

Sumber: `frontend/src/views/auth/Login.jsx`, `frontend/src/views/faskes/*.jsx`,
`frontend/src/layouts/FaskesLayout.jsx`, `frontend/src/components/Sidebar.jsx`,
`frontend/src/routes.js`, `backend/routes/api.php`,
`backend/app/Models/SiklusAkreditasi.php`, `backend/app/Http/Controllers/Api/*`.

Semua teks UI di bawah ditulis persis seperti di kode.

---

## Login
- **Route:** `/auth/login` (di `routes.js`: `path: "/login"`, `layout: "/auth"`)
- **Kondisi/estado yang ditampilkan:**
  - Normal (default): judul "Masuk ke akun Anda", subjudul "Gunakan email, username, atau NIK yang terdaftar."
  - Loading (saat submit): tombol berubah menjadi "Memproses..." dengan ikon spinner berputar; kedua input `disabled`.
  - Error: kotak merah di atas form berisi pesan dari server (ikon `AlertCircle`).
  - Teks kaki form: "Akun dibuat dan dikelola oleh admin lembaga."
- **Komponen/field yang tampil:**
  - Lockup produk di atas: judul "ERP Akreditasi Faskes", subjudul "Sistem manajemen siklus akreditasi", ikon `LMNIcon`.
  - Label "Email / Username / NIK" — input `type="text"`, `placeholder="email@domain.com"`, `autoComplete="username"`, `required`.
  - Label "Kata sandi" — input `type="password"`, `placeholder="••••••••"`, `autoComplete="current-password"`, `required`.
  - Tombol ikon mata di dalam field kata sandi; `aria-label`/`title` = "Tampilkan kata sandi" saat tersembunyi dan "Sembunyikan kata sandi" saat terlihat.
  - Tombol submit "Masuk".
- **Aksi yang bisa dilakukan:**
  - Isi kedua field lalu tekan "Masuk" → `POST /api/auth/login` dengan body `{ login, password }`, ditambah `lembaga_id` bila `localStorage.lembaga_id` tersedia.
  - Klik ikon mata → toggle tampil/sembunyikan kata sandi (tidak memanggil server).
  - Setelah sukses, simpan ke `localStorage`: `token`, `user` (via `writeJson`), `menu_actions`, `lembaga_id`, `lembaga_name`, `lembaga_logo`, `tipe_faskes`.
  - Pengalihan setelah login berdasar `data.user.role`:
    - `"Faskes"` → `/faskes/`
    - `"Surveior"` dan `"Verifikator"` → `/surveior/penugasan`
    - `"Rekomendator"` → `/admin/rekomendasi`
    - `"Divisi SDM"` → `/admin/dashboard`
    - `"Directeur/Keuangan"` → `/admin/piutang`
    - selain itu → `/admin/dashboard`
- **Validasi & pesan error:**
  - Client: kedua field `required` (validasi bawaan browser, tanpa teks kustom).
  - Server (`AuthController::login`, validasi `login` dan `password` `required|string`, `lembaga_id` `nullable|uuid|exists:lembaga,id`):
    - "Kredensial tidak cocok." — email/username/NIK tidak ditemukan atau password salah (HTTP 422).
    - "Akun terkunci sementara. Coba lagi dalam {minutes} menit." — akun terkunci.
    - "Akun nonaktif atau terkunci. Hubungi administrator."
  - Frontend memakai `data.message || "Login gagal"` sebagai teks fallback.
  - Penguncian akun: `MAX_ATTEMPTS = 5`, `LOCK_MINUTES = 15` (`AuthController`).
  - Route `POST /api/auth/login` memakai middleware `throttle:login`.
- **Peran & syarat akses:** tidak ada. Halaman publik, terbuka untuk semua peran.
- **Catatan penting:**
  - Pencarian user di backend menerima tiga kunci: email, username, atau `nomor_induk_surveior` tenaga ahli — tidak ada pencarian NIK akun secara terpisah di kode login.
  - Pencarian bersifat case-insensitive (`LOWER(...) = LOWER(...)`).
  - Session `lembaga_id` pada backend di-force-sync ke lembaga master faskes untuk user Faskes; nilai `lembaga_id` yang dikirim client diabaikan bila berbeda (`SetLembagaSession`).

---

## Portal Faskes (kerangka halaman)
- **Route:** prefix `/faskes` (semua route `layout: "/faskes"` di `routes.js`); route yang tidak dikenali di-redirect ke `/faskes` (`App.jsx`).
- **Kondisi/estado yang ditampilkan:**
  - Tanpa `token` di `localStorage` → `window.location.href = "/auth/login"` (dijalankan sekali saat mount).
  - Sidebar desktop (≥ lg) selalu tampil; di layar kecil sidebar berupa drawer yang dibuka lewat tombol ikon `Menu`, ditutup lewat ikon `X` atau klik area gelap di belakangnya.
- **Komponen/field yang tampil:**
  - Logo: `LMNIcon`, atau logo lembaga dari `localStorage.lembaga_logo` bila ada.
  - Nama: `localStorage.lembaga_name`, jika kosong tampil "LIPA MITRA" dengan sub-teks "Nusa"; jika ada, nama lembaga penuh dengan sub-teks "LEMBAGA AKREDITASI" (uppercase tracking).
  - Badge hijau: "Portal Faskes".
  - Judul grup menu: "Menu".
  - Top bar: remah "Portal Faskes" / nama menu aktif; tombol tema (`ThemeToggle`); tombol ikon lonceng (`Bell`) tanpa aksi terpasang.
  - Footer: "© {tahun} {nama lembaga} — Portal Faskes" dan "ERP Akreditasi Faskes".
  - Blok user di sidebar: avatar berisi inisial (maks 2 huruf, uppercase), nama (`user.nama` atau "Faskes"), peran (`user.role` atau "Faskes").
- **Menu (persis seperti di sidebar portal Faskes):**
  1. "Status Pengajuan" → `/faskes/`
  2. "Unggah Dokumen" → `/faskes/dokumen`
  3. "Kontrak & Tanda Tangan" → `/faskes/kontrak`
  4. "Tagihan & Pembayaran" → `/faskes/tagihan`
  5. "Histori Pengajuan" → `/faskes/histori`
  6. "Ganti Password" → `/faskes/ganti-password`
- **Aksi yang bisa dilakukan:**
  - Klik menu → pindah halaman (menu aktif ditandai Latar hijau).
  - Tombol "Keluar" → `POST /api/auth/logout` dengan header `Authorization: Bearer {token}`, lalu hapus `token`, `user`, `lembaga_name`, `lembaga_logo` dari `localStorage` dan pindah ke `/auth/login`.
- **Validasi & pesan error:** tidak ada pesan error di layout; kegagalan `logout` diabaikan (`catch(() => {})`).
- **Peran & syarat akses:** seluruh isi `FaskesLayout` adalah daftar menu hard-coded, bukan dari `routes.js`/`Sidebar.jsx`; jadi keenam menu tampil untuk semua pengguna portal Faskes. `Sidebar.jsx` (portal admin) tidak dipakai di portal Faskes.
- **Catatan penting:**
  - Di `routes.js`, entri `layout: "/faskes"` tidak punya field `privilege` sama sekali — sehingga di `Sidebar.jsx`, `hasPrivilege()` selalu `true` untuk route tersebut. Penyaringan hak akses nyata terjadi di backend lewat middleware `privilege:`.
  - Menu aktif ditentukan dengan `location.pathname.startsWith(n.to)`, kecuali "Status Pengajuan" yang memakai pencocokan persis `/faskes` atau `/faskes/`.

---

## Status Pengajuan
- **Route:** `/faskes/` (juga menerima `/faskes`; `routes.js`: `path: "/"`, `name: "Status Pengajuan"`, `componentName: "FaskesDashboard"`)
- **Kondisi/estate yang ditampilkan:**
  - Loading: spinner + teks "Memuat..." (selama `GET /auth/me` atau `GET /pendaftaran/siklus?aktif=1&per_page=1` berjalan).
  - **Belum ada pengajuan aktif** → tampil formulir "Ajukan Permohonan Akreditasi".
  - **Ada pengajuan aktif** → tampil "Status Pengajuan" (stepper + kartu shortcut).
  - **Pengajuan sebelumnya sudah tuntas** (ada di histori) → banner hijau di atas formulir ajakan.
- **Komponen/field yang tampil (formulir ajakan):**
  - Judul: "Ajukan Permohonan Akreditasi"; subjudul "Isi formulir di bawah untuk memulai proses akreditasi fasilitas kesehatan Anda."
  - Banner hijau: judul "Pengajuan sebelumnya telah selesai"; isi "No. Pengajuan {NOMOR} ({tanggal}) telah menyelesaikan seluruh tahapan dan pembayarannya sudah lunas. Pengajuan tersebut tersimpan di Histori Pengajuan."
  - Kartu "Informasi Lembaga":
    - Label "Lembaga Akreditasi *" — `select`. Teks option pertama: "Memuat..." (saat daftar memuat), "Tidak ada lembaga" (saat daftar kosong), "— Pilih Lembaga —" (default). Setiap option lain menampilkan `lembaga.nama`.
    - Bantu di bawah select (bila terkunci): "Terpilih otomatis dari data faskes Anda — tidak dapat diubah."
    - Label "Tanggal Permohonan Survei *" — `input type="date"`, atribut `min` = hari ini.
    - Label "Tipe Faskes" — `input type="text"` `readOnly`, `title="Diisi otomatis dari data faskes Anda"`.
  - Kartu "Penanggung Jawab":
    - Label "Nama Penanggung Jawab" — placeholder "Nama lengkap".
    - Label "Jabatan" — placeholder "cth: Direktur, Manajer".
    - Label "Nomor Kontak / HP" — placeholder "cth: 0812-xxxx-xxxx".
  - Tombol "Ajukan Permohonan" (saat submit: "Mengajukan...").
  - Teks pendamping tombol: "Setelah diajukan, tim LIPA MITRA NUSA akan memvalidasi kelengkapan dokumen Anda."
  - Kotak biru "Tahapan Selanjutnya" berisi 4 butir bernomor:
    1. "Tim kami akan memvalidasi permohonan Anda"
    2. "Draf PKS akan dikirimkan untuk ditandatangani"
    3. "Invoice tagihan akan terbit otomatis"
    4. "Setelah lunas, Surat Tugas survei diterbitkan"
- **Komponen/field yang tampil (status pengajuan):**
  - Judul: "Status Pengajuan"; subjudul berisi nama user (`user.nama`) atau "Faskes Anda".
  - Banner oranye dengan tiga kemungkinan teks:
    - Menunggu pelunasan: "Seluruh tahapan akreditasi telah selesai. Mohon selesaikan pelunasan pembayaran agar pengajuan dapat dipindahkan ke Histori Pengajuan."
    - Tertahan di Pembayaran: "Survei telah selesai — mohon selesaikan pembayaran invoice agar proses verifikasi dapat dilanjutkan."
    - Default: "Pengajuan Anda saat ini sedang dalam proses pada tahap Tahap {n}: {label}. Tidak dapat mengajukan permohonan baru selama masih ada pengajuan yang aktif."
  - Kartu "TAHAPAN AKREDITASI" dengan penanda kanan: "Tahap {n}: {label}".
  - `SiklusStepper` — 7 tahap: "Pendaftaran", "Validasi", "Kontrak", "Pembayaran", "Survei", "Verifikasi", "Selesai". Sub-tahap Survei: "Menunggu Surat Tugas", "Survei Dijadwalkan", "Survei Sedang Berlangsung", "Laporan FA Dikirim". Legenda: "Proses selesai", "Menunggu proses", "Ditolak".
  - Kartu shortcut:
    - "Unggah Dokumen" — deskripsi "Semua dokumen lengkap" bila `status_kelengkapan === "lengkap"`, selain itu "Screenshot DFO, Surat Permohonan, Self Assessment".
    - "Kontrak & Tanda Tangan" (hanya tampil bila tahap ≥ 3) — deskripsi "Lihat & tanda tangani PKS".
    - "Tagihan & Pembayaran" (hanya tampil bila tahap ≥ 4) — deskripsi "Lihat & bayar invoice", atau "Invoice belum dibayar — survei telah selesai" bila invoice belum lunas dan survei sudah selesai.
  - Kartu "DETAIL PENGAJUAN": "No. Pengajuan", "Lembaga", "Tanggal Pengajuan", "Tanggal Permohonan Survei", "Status Kelengkapan" (nilai "Lengkap" atau "Menunggu").
- **Aksi yang bisa dilakukan:**
  - "Ajukan Permohonan" → `POST /pendaftaran/siklus` dengan body `{ lemma_id, tanggal_permohonan_survei, dfo_data: { tipe_faskes, nama_penganggung_jawab, jabatan, kontak } }` (nilai kosong dikirim sebagai `null`). Sukses → invalidasi query `siklus-aktif` dan `siklus-histori`; gagal → `alert(err.message)`.
  - Kartu "Unggah Dokumen" → navigasi ke `/faskes/dokumen`.
  - Kartu "Kontrak & Tanda Tangan" → navigasi ke `/faskes/kontrak/{siklus.id}`.
  - Kartu "Tagihan & Pembayaran" → navigasi ke `/faskes/tagihan`.
  - Endpoint yang dibaca: `GET /auth/me`, `GET /pendaftaran/siklus?aktif=1&per_page=1` (di-refetch tiap 30 detik), `GET /pendaftaran/siklus?riwayat=1&per_page=1`, `GET /invoice/by-siklus/{siklus.id}`.
- **Validasi & pesan error:**
  - Client (zod): "Lembaga akreditasi wajib dipilih", "Tanggal permohonan wajib diisi". Teks error tampil merah di bawah field.
  - Server (`SiklusAkreditasiController::store`): `lembaga_id` `required|uuid|exists:lembaga,id`; `tanggal_permohonan_survei` `required|date|after_or_equal:today`; `dfo_data.nama_penganggung_jawab`/`jabatan` `nullable|string|max:255`; `dfo_data.kontak` `nullable|string|max:100`; `dfo_data.tipe_faskes` `nullable|string|max:100`.
  - Pesan server khusus (HTTP 422):
    - "Anda masih memiliki pengajuan akreditasi yang sedang berjalan. Selesaikan proses saat ini sebelum mengajukan yang baru."
    - "faskes_id wajib diisi untuk akun non-Faskes."
  - Pesan error Server lain dari `SiklusAkreditasiController::findWithLembagaCheck`: "Siklus tidak ditemukan." (404) dan "Siklus ini milik lembaga \"{nama}\". Anda sedang di lembaga lain. Silakan pindah lembaga melalui menu Lembaga di header." (403).
- **Peran & syarat akses:** peran Faskes. Prasyarat backend: modul "Pendaftaran & Validasi Dokumen" aksi "Lihat" (untuk `GET /pendaftaran/siklus`, `GET /pendaftaran/lembaga`) dan aksi "Tambah" (untuk `POST /pendaftaran/siklus`). `GET /invoice/by-siklus/{siklus}` butuh modul "Kontrak & Invoicing" aksi "Lihat".
- **Catatan penting:**
  - Gatekeeper: satu faskes hanya boleh punya satu pengajuan yang masih berjalan. Pengajuan yang sudah masuk histori (tuntas + invoice lunas) tidak dihitung, sehingga faskes boleh mengajukan akreditasi lagi.
  - Select "Lembaga Akreditasi" terkunci (disabled) bila hanya ada satu lembaga atau bila `faskes.lembaga_id` terisi; nilai dipilih otomatis dari data faskes.
  - "Tipe Faskes" diisi otomatis dari `user.faskes.jenis_faskes.nama` / `user.faskes.tipe_faskes` / `localStorage.tipe_faskes` — tidak dapat diketik manual.
  - Tahap aktif di stepper bisa digeser ke tahap 4 (Pembayaran) bila survei sudah selesai tapi invoice belum lunas — sama dengan tampilan di portal admin.
  - `GET /pendaftaran/siklus` untuk user faskes otomatis dibatasi `faskes_id = user.faskes_id` di backend.

---

## Unggah Dokumen
- **Route:** `/faskes/dokumen` (`routes.js`: `path: "/dokumen"`, `name: "Unggah Dokumen"`, `componentName: "FaskesDokumen"`)
- **Kondisi/estate yang ditampilkan:**
  - Loading: spinner + teks "Memuat..." (saat daftar siklus atau detail siklus belum arrive).
  - **Belum ada pengajuan aktif**: judul "Belum Ada Pengajuan", teks "Silakan ajukan permohonan akreditasi terlebih dahulu untuk dapat mengunggah dokumen.", tombol "Ajukan Permohonan".
  - Terisi: daftar kartu dokumen (7 jenis).
  - Ada catatan validasi dari admin → kotak amber "Catatan dari Tim Validasi".
  - Error unggahan per dokumen → teks merah di bawah drop zone dokumen tersebut.
- **Komponen/field yang tampil:**
  - Remah: tombol panah kiri (kembali ke `/faskes/`) lalu teks "Status Pengajuan".
  - Judul: "Unggah Dokumen"; subjudul "{nama faskes} · {nama lembaga}" (default "Faskes Anda · LIPA MITRA NUSA").
  - Kotak amber: judul "Catatan dari Tim Validasi"; tiap catatan berisi teks catatan, lalu "{nama pembuat} · {tanggal}" (default "Validator").
  - Progress: "Kelengkapan Dokumen" + "{terunggah} / {total} terunggah" + badge persentase; bar hijau.
  - Tujuh kartu dokumen (label + keterangan + badge "WAJIB" pada tiga yang wajib):
    | Label | Keterangan | Wajib |
    |---|---|---|
    | "Screenshot DFO" | "Screenshot Daftar Tilik Fasilitas (DFO) yang sudah diisi" | ya |
    | "Surat Permohonan Survei" | "Surat resmi dari Faskes yang mengajukan permohonan survei" | ya |
    | "Self Assessment" | "Hasil penilaian mandiri oleh Faskes terhadap standar akreditasi" | ya |
    | "Sisdmk / SISDMK" | "Sistem Informasi SDM Kesehatan" | tidak |
    | "ASPak" | "Aksi Cepat Pasien Keselamatan Pasien" | tidak |
    | "INM" | "Indikator Nasional Mutu" | tidak |
    | "IKP" | "Indikator Kinerja Prioritas" | tidak |
  - Drop zone kosong: "Klik atau drag file ke sini" + "PDF, JPG, PNG, DOC, DOCX, XLS, XLSX · Maks 10 MB".
  - Drop zone saat mengunggah: spinner + "Mengunggah...".
  - Drop zone berisi dokumen: nama file, "v{versi} · {ukuran} · {tanggal}", dan label "Tersimpan"; ikon centang hijau di header kartu.
  - Aksi pada kartu yang sudah terisi: tombol "Revisi", tombol "Riwayat", tombol "Unduh".
  - Kotak biru bawah: "Format: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX · Maks 10 MB per file. Klik pada dokumen yang sudah terunggah untuk memperbarui versi. Setiap revisi wajib disertai alasan."
- **Dialog Revisi Dokumen:**
  - Judul "Revisi Dokumen".
  - Kotak "Versi saat ini": nama file, lalu "Versi {versi} · {ukuran} · {tanggal}".
  - Label "File Baru *"; area pilih: "Klik pilih file atau drag ke sini" + "PDF, JPG, PNG, DOC, DOCX, XLS, XLSX · Maks 10 MB"; setelah dipilih tampil nama file + ukuran.
  - Label "Alasan Revisi"; placeholder "Contoh: Revisi sesuai catatan validator, perbaikan data yang salah, dll."; catatan "Wajib diisi saat mengunggah versi baru."
  - Tombol "Batal" dan "Unggah Versi Baru" (saat submit: "Mengunggah...").
- **Dialog Riwayat Versi — {label}:**
  - Judul "Riwayat Versi — {label dokumen}".
  - Keadaan: "Memuat riwayat..." / pesan error / "Belum ada riwayat versi."
  - Tabel dengan kolom: "Versi", "File", "Diunggah Oleh", "Tanggal", "Aksi". Badge versi terbaru "TERBARU"; ikon file PDF / IMG / DOC / FILE; alasan revisi ditampilkan di kotak oranye berlabel "Alasan revisi:".
  - Tombol "Unduh" per baris; kaki tabel "{jumlah} versi ditemukan".
- **Aksi yang bisa dilakukan:**
  - Klik / drag file ke drop zone dokumen yang belum terisi → `POST /pendaftaran/siklus/{siklus.id}/dokumen` (multipart: `jenis_dokumen`, `file`).
  - Klik drop zone dokumen yang sudah terisi → membuka dialog "Revisi Dokumen".
  - Tombol "Revisi" → membuka pemilih file, lalu dialog Revisi; konfirmasi → `POST /pendaftaran/siklus/{siklus.id}/dokumen` dengan `jenis_dokumen`, `file`, `alasan_revisi`.
  - Tombol "Riwayat" → `GET /pendaftaran/dokumen/{dokumen.id}/versions`.
  - Tombol "Unduh" → `GET /pendaftaran/dokumen/{dokumen.id}/download` (diambil sebagai blob).
  - Tombol "Ajukan Permohonan" (keadaan kosong) → navigasi ke `/faskes/`.
  - Endpoint lain: `GET /pendaftaran/siklus?aktif=1&per_page=1`, `GET /pendaftaran/siklus/{siklus.id}`.
- **Validasi & pesan error:**
  - Client: `accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"`; belum ada validasi ukuran di sisi client pada halaman ini (batas 10 MB ditegakkan server).
  - Server (`DokumenPermohonanController::store`): `jenis_dokumen` `required|string|in:surat_permohonan,self_assessment,dfo,sisdmk,aspak,inm,ikp`; `file` `required|file|mimetypes:...|max:10240` (10 MB); `alasan_revisi` `nullable|string|max:1000`.
  - MIME yang diterima server: `application/pdf`, `image/jpeg`, `image/png`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (docx), `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (xlsx).
  - Pesan sukses server: "Dokumen berhasil diunggah." atau "Dokumen {jenis_dokumen} diunggah sebagai versi {versi}."
  - Error unggahan ditampilkan apa adanya dari `err.message` (hasil `api()` di `lib/api.js`: `body.message || body.error || "HTTP {status}"`).
- **Peran & syarat akses:** peran Faskes. Prasyarat backend: `GET /pendaftaran/siklus` dan `GET /pendaftaran/siklus/{siklus}` → modul "Pendaftaran & Validasi Dokumen" aksi "Lihat"; `GET /pendaftaran/dokumen/{dokumen}/versions` dan `/download` → aksi "Lihat"; `POST /pendaftaran/siklus/{siklus}/dokumen` → aksi "Tambah".
- **Catatan penting:**
  - Dokumen wajib (3 jenis) ditentukan server lewat `ChecklistValidasi::JENIS_WAJIB = ['dfo','surat_permohonan','self_assessment']`. Bila ketiganya sudah ada, backend otomatis mengubah `status_kelengkapan` siklus menjadi "lengkap"; progres di layar ikut naik karena dihitung dari dokumen yang sudah terunggah.
  - Unggah dokumen yang sama akan membuat versi baru (versi = versi tertinggi + 1), bukan menimpa.
  - Frontend mengizinkan ekstensi `.doc` dan `.xls`, sedangkan daftar MIME di backend tidak memuatnya — berkas `.doc`/`.xls` akan ditolak server walau lolos filter client. `*(perilaku perlu konfirmasi ke tim devs)*` bila ada dokumen format lama yang ditolak.
  - Halaman tidak menampilkan tombol hapus dokumen; endpoint `DELETE /pendaftaran/dokumen/{dokumen}` ada di backend tetapi tidak dipakai di portal Faskes.

---

## Kontrak & Tanda Tangan
- **Route:** `/faskes/kontrak` dan `/faskes/kontrak/:id` (`routes.js`: `path: "/kontrak"` name "Kontrak & Tanda Tangan"; `path: "/kontrak/:id"` name "Kontrak PKS", `hideInSidebar: true`)
- **Kondisi/estate yang ditampilkan:**
  - Loading: teks "Memuat..." (hanya satu baris, tanpa spinner).
  - **Belum ada kontrak** → "Belum ada kontrak untuk pengajuan Anda." dan "Admin Lembaga akan mengirimkan draf PKS setelah dokumen Anda lengkap."
  - Status kontrak menentukan isi: "Draf", "Menunggu Tanda Tangan" (`dikirim`), "Menunggu Validasi Admin" (`ditandatangani`), "Disetujui" (`disetujui`), "Selesai" (`selesai`), "Ditolak" (`ditolak`), "Kedaluwarsa" (`expired`).
  - Ada PKS yang sudah ditandatangani (`path_signed_pdf`) → tombol "Lihat PKS yang Sudah Ditandatangani" muncul.
- **Komponen/field yang tampil:**
  - Tombol kembali: "← Kembali ke Status Pengajuan" (ke `/faskes/`).
  - Judul "Kontrak PKS"; subjudul "Perjanjian Kerja Sama dengan LIPA MITRA NUSA untuk siklus akreditasi ini."
  - Kartu PKS: "NOMOR PKS" + `nomor_pks`; badge status.
  - Bila sudah ditandatangani: "Penandatangan: {nama} ({jabatan})" dan "Diupload: {tanggal}".
  - Bila sudah divalidasi admin: "Divalidasi admin pada {tanggal}" (hijau, dengan ikon centang).
  - Tombol: "Unduh PDF PKS", "Unduh DOCX (Word)", dan (kondisional) "Lihat PKS yang Sudah Ditandatangani". Saat mengunduh, teks tombol menjadi "Mengunduh...".
  - Catatan di bawah tombol (hanya saat status `dikirim`): "Cetak, tanda tangan & beri materai, lalu upload kembali di bawah." Selain itu: "DOCX menggunakan format standar. Kustomisasi template di admin hanya berlaku untuk PDF."
  - Kartu status "Draf": judul "Draf PKS sedang disiapkan oleh Admin Lembaga", isi "Anda sudah bisa melihat preview draf di atas. Admin akan mengirim PKS resmi untuk Anda tanda tangani setelah finalisasi."
  - Kartu status `ditandatangani`: judul "PKS sudah diupload dan menunggu validasi admin", isi "Admin akan memverifikasi dokumen dalam 1-2 hari kerja."
  - Kartu status `selesai`: judul "PKS divalidasi dan kontrak selesai", isi "Invoice telah diterbitkan otomatis. Silakan lanjut ke halaman Tagihan untuk melakukan pembayaran."
  - Formulir upload (hanya saat status `dikirim`):
    - Judul "Upload PKS yang Sudah Ditandatangani"; teks "Cetak PDF PKS, berikan tanda tangan basah & materai, lalu scan/foto dan upload kembali di bawah."
    - Drop zone: "Klik atau drag file PDF ke sini" + "Format: PDF, maks. 10 MB"; setelah file dipilih tampil nama file, ukuran, dan "Klik untuk ganti file".
    - Label "Nama penandatangan *" — placeholder "Dr. Nama Lengkap".
    - Label "Jabatan *" — placeholder "Directeur Utama".
    - Label "NIK penandatangan (opsional)" — placeholder "3174012345670001".
    - Tombol "Upload & Kirim PKS yang Sudah Ditandatangani" (saat submit: "Mengunggah...").
- **Aksi yang bisa dilakukan:**
  - "Unduh PDF PKS" → `GET /kontrak/{pks.id}/download`; nama file hasil unduhan `PKS-{nomor_pks}.pdf`.
  - "Unduh DOCX (Word)" → `GET /kontrak/{pks.id}/download-docx`; nama file `PKS-{nomor_pks}.docx`.
  - "Lihat PKS yang Sudah Ditandatangani" → `GET /kontrak/{pks.id}/signed-pdf`; nama file `PKS-Tertanda-{nomor_pks}.pdf`.
  - Pilih file (klik atau drag) + isi form → `POST /kontrak/{pks.id}/tanda-tangan` (multipart: `signed_pdf`, `nama_penandatangan`, `jabatan_penandatangan`, dan `nik_penandatangan` bila tidak kosong).
  - Endpoint yang dibaca: `GET /pendaftaran/siklus?per_page=50` (untuk menentukan siklus yang ditampilkan) dan `GET /kontrak/by-siklus/{siklus.id}`.
- **Validasi & pesan error:**
  - Client (zod): "Nama penandatangan wajib diisi", "Jabatan wajib diisi".
  - Client (pemeriksaan file): "File harus format PDF." dan "Ukuran file maksimal 10 MB." — keduanya tampil di kotak merah `fileError` di atas tombol submit.
  - Client (submit tanpa file): "Upload file PKS yang sudah ditandatangani terlebih dahulu."
  - Client (gagal unduh): "Gagal mengunduh."
  - Server (`PksController::tandaTangan`): "PKS belum dikirim atau status tidak valid." (422) bila status PKS bukan `dikirim`; validasi `signed_pdf` `required|file|mimes:pdf|max:10240`, `nama_penandatangan` `required|string|max:255`, `jabatan_penandatangan` `required|string|max:255`, `nik_penandatangan` `nullable|string|max:32`.
- **Peran & syarat akses:** peran Faskes. Prasyarat backend: seluruh endpoint `/kontrak/*` berada di bawah modul "Kontrak & Invoicing"; `GET` (lihat, download, by-siklus, signed-pdf) memakai aksi "Lihat", `POST /kontrak/{pks}/tanda-tangan` memakai aksi "Ubah".
- **Catatan penting:**
  - Gatekeeper: formulir tanda tangan hanya muncul saat status PKS `dikirim`. Status `ditandatangani` menunggu validasi admin; `selesai` menandai invoice sudah terbit.
  - Bila membuka `/faskes/kontrak` tanpa `:id`, halaman mengarahkan otomatis ke siklus pertama yang belum selesai lengkap (`!s.selesai_lengkap`), atau ke siklus pertama dalam daftar bila semuanya sudah masuk histori — supaya PKS terakhir tetap bisa diunduh.
  - Setelah PKS berstatus `selesai`, invoice terbit otomatis; pengguna diarahkan ke menu "Tagihan & Pembayaran".

---

## Tagihan & Pembayaran
- **Route:** `/faskes/tagihan` (`routes.js`: `path: "/tagihan"`, `name: "Tagihan"`, `componentName: "FaskesTagihan"`). Nama menu di sidebar portal Faskes: "Tagihan & Pembayaran".
- **Kondisi/estate yang ditampilkan:**
  - Loading: teks "Memuat...".
  - **Belum ada siklus sama sekali** → "Belum ada tagihan untuk Anda."
  - **Siklus ada tetapi invoice belum ada** → "Belum ada invoice untuk siklus ini. Invoice akan muncul setelah PKS disetujui."
  - **Invoice ada** → kartu-kartu invoice.
  - **Ada invoice yang belum lunas** → tombol "Bayar Sekarang" muncul di bawah daftar.
  - Lebih dari satu siklus → muncul select "Pilih siklus".
- **Komponen/field yang tampil:**
  - Tombol kembali: "← Kembali ke Status Pengajuan" (ke `/faskes`).
  - Judul "Tagihan"; subjudul "Daftar invoice untuk setiap siklus akreditasi Anda."
  - Select "Pilih siklus"; tiap option berformat "{nama faskes} — {tanggal pengajuan}" (default nama faskes "Siklus").
  - Kartu invoice (`InvoiceStatusCard`): label "Invoice" + `nomor_invoice`; badge status dengan label "Lunas", "Sebagian", "Belum Bayar", "Jatuh Tempo", "Kedaluwarsa", "Refund"; baris "Total tagihan", "Sudah dibayar", "Sisa" (baris "Sisa" hanya tampil bila > 0); bar progres; kaki "{persen}% terbayar".
  - Tombol "Bayar Sekarang".
- **Aksi yang bisa dilakukan:**
  - Klik kartu invoice → navigasi ke `/faskes/tagihan/{invoice.id}`.
  - "Bayar Sekarang" → navigasi ke `/faskes/tagihan/{invoice.id}` untuk invoice pertama yang statusnya bukan "lunas" dan bukan "refunded".
  - Ganti pilihan "Pilih siklus" → refetch invoice siklus terpilih.
  - Endpoint yang dibaca: `GET /pendaftaran/siklus?per_page=50` dan `GET /invoice/by-siklus/{siklus.id}`.
  - Mendukung deep-link `?siklus=<id>` (dipakai tombol "Lihat Tagihan" di Histori Pengajuan).
- **Validasi & pesan error:** tidak ada validasi form di halaman ini; pesan server ditampilkan lewat komponen `InvoiceStatusCard`/navigasi (error `useApi` tidak dirender eksplisit di halaman ini — `*(perilaku perlu konfirmasi ke tim devs)*`).
- **Peran & syarat akses:** peran Faskes. Prasyarat backend: `GET /pendaftaran/siklus` → modul "Pendaftaran & Validasi Dokumen" aksi "Lihat"; `GET /invoice/by-siklus/{siklus}` → modul "Kontrak & Invoicing" aksi "Lihat".
- **Catatan penting:**
  - Gatekeeper invoice: invoice baru terbit setelah PKS disetujui admin (status PKS `selesai`).
  - Daftar siklus diambil dengan `per_page=50`; siklus yang sudah masuk histori tetap dapat dipilih dan tagihannya dilihat.
  - Status invoice yang dianggap belum perlu dibayar oleh tombol "Bayar Sekarang": semua status selain "lunas" dan "refunded".

---

## Detail Tagihan
- **Route:** `/faskes/tagihan/:id` (`routes.js`: `path: "/tagihan/:id"`, `name: "Detail Tagihan"`, `componentName: "FaskesTagihanDetail"`, `hideInSidebar: true`)
- **Kondisi/estate yang ditampilkan:**
  - Loading: teks "Memuat...".
  - Invoice sudah **lunas** → banner "Bukti Diterima" tidak perlu; kartu pembayaran gateway dan pilihan metode disembunyikan.
  - Invoice **belum lunas** dengan bukti manual menunggu → banner "Bukti Menunggu Verifikasi".
  - Invoice **belum lunas** dengan bukti manual diterima → banner "Bukti Diterima".
  - Invoice **belum lunas**, ada VA/QRIS aktif → kartu Virtual Account / QRIS.
  - Invoice **belum lunas**, belum ada VA dan belum ada bukti → kartu "Pilih Metode Pembayaran".
  - Ada bukti manual yang ditolak → kotak merah "Bukti sebelumnya ditolak".
  - Ada riwayat pembayaran → kartu "Riwayat Pembayaran".
- **Komponen/field yang tampil:**
  - Tombol kembali: "← Kembali ke Daftar Tagihan" (ke `/faskes/tagihan`).
  - Judul "Detail Tagihan"; subjudul "Jatuh tempo: {tanggal}".
  - Kartu status invoice (`InvoiceStatusCard`) — isi identik dengan halaman Tagihan & Pembayaran.
  - Banner bukti:
    - "Bukti Diterima" — "Pembayaran telah diverifikasi. Invoice akan diperbarui secara otomatis."
    - "Bukti Menunggu Verifikasi" — "Bukti transfer {Rp nominal} sedang diverifikasi admin. Mohon tunggu 1x24 jam kerja."
  - Kartu gateway (border hijau 2px):
    - Judul "Virtual Account" atau "QRIS", subjudul "Aktif", badge "Otomatis".
    - Timer: "Berakhir dalam:" + hitung mundur `HH:MM:SS`. Bila habis: "VA/QRIS telah expired — klik \"Dapatkan Nomor VA Baru\" untuk membuat ulang."
    - "Nomor Virtual Account" + nomor monospace + tombol "Salin VA" (berubah jadi "Tersalin!" selama 2 detik).
    - "Total Pembayaran" + nominal `Rp {angka}`.
    - "Pembayaran akan diverifikasi otomatis 1-5 menit setelah transfer."
    - Judul petunjuk: "Petunjuk Pembayaran Virtual Account" (5 bank: BCA, BNI, Mandiri, BRI, Permata — tiap bank berisi langkah bernomor yang menyebut nomor VA dan nominal), atau "Petunjuk Pembayaran QRIS" (6 langkah: buka aplikasi m-BCA/BCA Mobile atau aplikasi bank lain yang mendukung QRIS; pilih menu "Scan QR"; scan kode QR yang tersedia di halaman ini; pastikan nominal yang tertera adalah {nominal}; masukkan PIN / konfirmasi pembayaran; simpan bukti pembayaran (screenshot)) + kotak hijau "Pembayaran akan diverifikasi otomatis dalam 1-5 menit."
    - Tombol "Cek Status Pembayaran" (menjadi "Mengecek..." saat mutation berjalan dan "Memuat..." saat refetch berjalan), tombol "Dapatkan Nomor VA Baru", tombol "Ganti Metode Pembayaran".
  - Kartu "Ganti Metode Pembayaran": judul "Ganti Metode Pembayaran", teks "Nomor VA/QRIS sebelumnya akan dibatalkan." + pemilih metode + (bila transfer manual) isian bukti + tombol "Batal" dan "Kirim Bukti Transfer"/"Mengunggah..."; (bila gateway) tombol "Batal" dan "Generate QRIS Baru" / "Dapatkan VA Baru" / "Memproses...".
  - Pemilih metode (`PaymentMethodSelector`) — tiga kartu: "Virtual Account" ("Bayar via VA di bank mana saja"), "QRIS" ("Scan QR dari aplikasi e-wallet / m-banking"), "Transfer Manual" ("Transfer bank lalu upload bukti").
  - Kartu "Pilih Metode Pembayaran" (belum ada VA): pemilih metode + (bila transfer manual) judul "Unggah Bukti Transfer" dan isian; (bila gateway) kotak oranye "Total yang harus dibayar: {Rp}" + tombol "Generate QRIS" / "Dapatkan Nomor VA" / "Memproses...".
  - Isian bukti transfer (dua varian form, id berbeda: `tf-*` dan `ganti-*`):
    - Label "Nominal *" — `type="number"`, placeholder "5000000".
    - Label "No. Referensi Transfer *" — placeholder "TRX-202610-001".
    - Label "Dari rekening *" — placeholder "BCA 123-456-7890 a.n. RS Permata" (varian "ganti": "BCA 123-456-7890 a.n. Nama").
    - Label "File bukti (PDF / gambar) *" — `accept=".pdf,image/*"`.
  - Kartu "Rincian Biaya" — kolom tabel "Komponen Biaya", "Tipe", "Jumlah"; baris akhir "Total Tagihan"; label tipe: "Tetap", "Per Siklus", "Per Sertifikat", "Per Tahun", "Per Periksa", "Sekali Bayar".
  - Kartu "Riwayat Pembayaran" — kolom tabel "Tanggal", "Metode", "Nominal", "Status"; metode ditampilkan "Transfer" / "QRIS" / "VA"; status "Menunggu verifikasi", "Diterima", "Ditolak"; alasan penolakan ditampilkan di bawah status.
- **Aksi yang bisa dilakukan:**
  - "Dapatkan Nomor VA" / "Generate QRIS" → `POST /invoice/{id}/bayar-va` atau `POST /invoice/{id}/bayar-qris`.
  - "Dapatkan Nomor VA Baru" → `POST /invoice/{id}/bayar-va?force=true` (atau `bayar-qris?force=true` bila metode QRIS).
  - "Cek Status Pembayaran" → `POST /invoice/{id}/cek-status`; bila status sudah "lunas" muncul `alert("Pembayaran terverifikasi. Invoice sudah lunas.")`.
  - "Kirim Bukti Transfer" → `POST /invoice/{id}/bukti-manual` (multipart: `nominal`, `nomor_referensi`, `dari_rekening`, `bukti`); sukses → `alert("Bukti transfer berhasil diunggah. Admin akan memverifikasi dalam 1x24 jam kerja.")`, metode disetel ke "transfer_manual", nomor VA lama dibersihkan.
  - "Ganti Metode Pembayaran" → membuka kartu "Ganti Metode Pembayaran"; memilih gateway baru → `POST /invoice/{id}/bayar-va|bayar-qris?force=true` (VA/QRIS lama dibatalkan).
  - "Salin VA" → menyalin nomor VA ke clipboard.
  - Endpoint yang dibaca: `GET /invoice/{id}` (di-refetch otomatis tiap 10 detik selama invoice belum lunas) dan `GET /invoice/{id}/bukti`.
- **Validasi & pesan error:**
  - Client: "Ukuran file maksimal 10 MB." (file > 10 MB ditolak), "Pilih file bukti transfer." (submit tanpa file).
  - Client: skema zod didefinisikan (`transferSchema`) dengan pesan "Nominal wajib diisi", "No. Referensi wajib diisi", "Dari rekening wajib diisi" — skema ini didefinisikan tetapi form tidak memanggil `handleSubmit` react-hook-form, sehingga pesan zod tersebut tidak pernah tampil di layar.
  - Server (`InvoiceController`):
    - `bayarVa` / `bayarQris`: "Invoice sudah lunas." (422).
    - `uploadBuktiManual`: "Invoice sudah lunas, tidak dapat mengunggah bukti lagi." (422); "Masih ada bukti yang menunggu atau sudah diterima untuk invoice ini." (422).
    - `cekStatus`: "Status pembayaran belum dapat dicek dari gateway." (422).
    - Validasi `bukti-manual`: `nominal` `required|numeric|min:1`, `nomor_referensi` `required|string|max:100`, `dari_rekening` `required|string|max:100`, `bukti` `required|file|mimes:jpg,jpeg,png,pdf|max:4096` (maks 4 MB di server — lebih ketat dari batas 10 MB di sisi client).
- **Peran & syarat akses:** peran Faskes. Prasyarat backend: `GET /invoice/{invoice}` dan `GET /invoice/{invoice}/bukti` → modul "Kontrak & Invoicing" aksi "Lihat"; `POST /invoice/{invoice}/bayar-va`, `/bayar-qris`, `/cek-status` → aksi "Ubah"; `POST /invoice/{invoice}/bukti-manual` → aksi "Tambah".
- **Catatan penting:**
  - Gatekeeper: tombol "Bayar Sekarang" dan kartu invoice baru muncul setelah PKS tervalidasi admin (invoice terbit otomatis).
  - Pembayaran VA/QRIS diverifikasi otomatis lewat webhook; tombol "Cek Status Pembayaran" adalah fallback ketika webhook tidak pernah datang.
  - Selisih batas ukuran bukti: client menerima sampai 10 MB, server hanya sampai 4 MB (`max:4096`).
  - Status invoice yang diperiksa frontend untuk menentukan "belum lunas": selain "lunas" juga "refunded" diperlakukan sebagai tidak perlu dibayar.

---

## Histori Pengajuan
- **Route:** `/faskes/histori` (`routes.js`: `path: "/histori"`, `name: "Histori Pengajuan"`, `componentName: "FaskesHistori"`)
- **Kondisi/estate yang ditampilkan:**
  - **Tidak ada pengajuan aktif** → banner hijau "Tidak ada pengajuan yang sedang berjalan. Anda dapat mengajukan akreditasi baru." dengan tombol "Ajukan Pengajuan Baru".
  - Loading: kartu dengan teks "Memuat...".
  - **Belum ada histori** → "Belum ada histori" dan "Pengajuan yang sudah selesai dan lunas akan tampil di sini."
  - Terisi: satu kartu per pengajuan selesai.
  - Daftar dokumen pada kartu dapat dibuka/tutup (tombol "Dokumen Pengajuan ({jumlah})").
  - Pembuka dokumen (modal preview): "Memuat dokumen..." / pesan error / "Format file tidak dapat ditampilkan. Gunakan tombol Unduh."
  - Daftar dokumen kosong: "Tidak ada dokumen yang diunggah pada pengajuan ini."
  - Lebih dari satu halaman → bar paginasi.
- **Komponen/field yang tampil:**
  - Judul "Histori Pengajuan"; subjudul "Pengajuan yang telah selesai seluruh tahapan dan pembayarannya sudah lunas."
  - Kartu pengajuan:
    - Nomor pengajuan (bagian sebelum tanda `-` dari id, uppercase) dan nama lembaga.
    - Badge "Selesai".
    - Empat kolom: "Tanggal Pengajuan", "Tanggal Lunas", "Total Tagihan", "Status Pembayaran" (nilai tetap "Lunas").
    - Tombol expandable "Dokumen Pengajuan ({jumlah})" dengan chevron berputar saat terbuka.
    - Daftar dokumen: label jenis dokumen + badge tipe file (PDF / IMG / DOC / FILE) + badge "v{n}" bila versi > 1; baris "{nama file} · {ukuran}"; baris "Diunggah oleh {nama} · {tanggal}"; tombol "Lihat" dan "Unduh".
    - Tombol "Lihat Tagihan" di kanan bawah.
  - Modal preview: judul = label jenis dokumen; subjudul "{nama file} · v{versi} · {ukuran} · {tanggal}"; tombol "Tutup" dan "Unduh".
  - Paginasi: "Total {jumlah} pengajuan · Halaman {halaman} dari {total halaman}"; tombol "Sebelumnya" dan "Berikutnya".
- **Aksi yang bisa dilakukan:**
  - "Ajukan Pengajuan Baru" → navigasi ke `/faskes`.
  - "Dokumen Pengajuan" → buka/tutup daftar dokumen.
  - "Lihat" → modal preview, memuat `GET /pendaftaran/dokumen/{dokumen.id}/serve` sebagai blob (gambar ditampilkan, PDF di-embed, format lain ditolak).
  - "Unduh" → `GET /pendaftaran/dokumen/{dokumen.id}/download`.
  - "Lihat Tagihan" → navigasi ke `/faskes/tagihan?siklus={siklus.id}`.
  - "Sebelumnya" / "Berikutnya" → ubah nomor halaman (query di-refetch per halaman).
  - Endpoint yang dibaca: `GET /pendaftaran/siklus?riwayat=1&per_page=10&page={page}` dan `GET /pendaftaran/siklus?aktif=1&per_page=1`.
- **Validasi & pesan error:** tidak ada validasi form; pesan error API pada daftar histori tidak dirender eksplisit di halaman ini (hanya keadaan loading/kosong yang ditampilkan) — `*(perilaku perlu konfirmasi ke tim devs)*`.
- **Peran & syarat akses:** peran Faskes. Prasyarat backend: `GET /pendaftaran/siklus` → modul "Pendaftaran & Validasi Dokumen" aksi "Lihat"; `GET /pendaftaran/dokumen/{dokumen}/serve` dan `/download` → aksi "Lihat".
- **Catatan penting:**
  - Definisi "histori" (backend `scopeSelesaiLengkap`): `tahapan >= 7` atau `status` ∈ {`selesai`, `terakreditasi`}, **dan** invoice berstatus lunas (`lunas`/`dibayar`). Pengajuan yang tahapnya selesai tetapi invoice belum lunas tetap tampil di "Status Pengajuan" dengan banner menunggu pelunasan — bukan di Histori.
  - Hanya pengajuan milik faskes yang tampil (backend memfilter `faskes_id = user.faskes_id`).

---

## Ganti Password
- **Route:** `/faskes/ganti-password` (`routes.js`: `path: "/ganti-password"`, `name: "Ganti Password"`, `componentName: "FaskesChangePassword"`)
- **Kondisi/estate yang ditampilkan:**
  - Memuat profil: nama pengguna ditampilkan sebagai "Memuat..." sampai `GET /auth/me` selesai.
  - Sukses: kotak hijau "Password berhasil diubah. Anda akan dialihkan ke halaman login..."; tombol berubah menjadi "Berhasil" dan form dinonaktifkan.
  - Gagal: kotak merah berisi pesan server (`submitMutate.error?.data?.message`).
  - Kotak hijau bawah form: "Setelah password diubah, Anda akan otomatis keluar dari sesi ini dan diminta login ulang dengan password baru. Sesi di perangkat lain juga akan berakhir."
- **Komponen/field yang tampil:**
  - Judul "Ganti Password"; subjudul "Perbarui password akun Anda untuk menjaga keamanan akses ke Portal Faskes."
  - Kartu profil: avatar berisi huruf awal nama, nama (default "Pengguna"), baris "{email} · {nama faskes}".
  - Label "Password saat ini *" — placeholder "Masukkan password yang sedang digunakan".
  - Label "Password baru *" — placeholder "Minimal 8 karakter".
  - Label "Konfirmasi password baru *" — placeholder "Ulangi password baru".
  - Indikator kekuatan password (bar + label): "Lemah", "Cukup", "Kuat"; teks "Gunakan kombinasi huruf besar, kecil, angka, dan simbol untuk password yang lebih kuat."
  - Tombol "Batal" dan tombol simpan: "Simpan Password Baru" / "Menyimpan..." / "Berhasil".
- **Aksi yang bisa dilakukan:**
  - Isi ketiga field lalu tekan "Simpan Password Baru" → `PUT /auth/password` dengan body `{ current_password, new_password, new_password_confirmation }`.
  - "Batal" → navigasi ke `/faskes/`.
  - Setelah sukses: form dikosongkan, `token` dan `user` dihapus dari `localStorage`, lalu 2 detik kemudian `window.location.href = "/auth/login"`.
  - Endpoint yang dibaca: `GET /auth/me`.
- **Validasi & pesan error:**
  - Client (zod): "Password saat ini wajib diisi"; "Password baru minimal 8 karakter"; "Konfirmasi password baru tidak cocok"; "Password baru tidak boleh sama dengan password lama". Ditampilkan merah di bawah field.
  - Server (`AuthController::changePassword`): validasi `current_password` `required|string`; `new_password` `required|string|min:8|max:72|different:current_password`; `new_password_confirmation` `required|string|same:new_password`; pesan kustom "Password baru tidak boleh sama dengan password lama." dan "Konfirmasi password baru tidak cocok."
  - Pesan server tambahan: "Password lama salah." (HTTP 422) bila password saat ini tidak cocok.
  - Pesan sukses server: "Password berhasil diubah. Silakan login ulang."
- **Peran & syarat akses:** semua peran yang sudah login (halaman ada di sidebar portal Faskes). Prasyarat backend: seluruhnya berada di middleware `auth:sanctum` + `lembaga`; `PUT /auth/password` tidak memakai middleware privilege.
- **Catatan penting:**
  - Backend menghapus token yang sedang dipakai (`$user->currentAccessToken()?->delete()`), sehingga sesi di perangkat lain ikut berakhir — sesuai teks hijau di bawah form.
  - Indikator kekuatan password hanya di sisi client; server hanya menetapkan syarat minimal 8 karakter dan maksimal 72 karakter.

---

## Ringkasan alur antar layar (gatekeeper)
- Tahapan 1 "Pendaftaran": Status Pengajuan → tombol "Ajukan Permohonan" membuat siklus baru.
- Tahap 2 "Validasi": Unggah Dokumen — 3 dokumen wajib (Screenshot DFO, Surat Permohonan Survei, Self Assessment) menentukan `status_kelengkapan` "Lengkap"/"Menunggu".
- Tahap 3 "Kontrak": Kontrak & Tanda Tangan — form tanda tangan hanya muncul saat status PKS `dikirim`; setelah `ditandatangani` menunggu validasi admin; setelah `selesai` invoice terbit otomatis.
- Tahap 4 "Pembayaran": Tagihan & Pembayaran — invoice muncul setelah PKS disetujui; pembayaran lewat VA/QRIS (otomatis) atau Transfer Manual (verifikasi admin 1x24 jam).
- Tahap 5 "Survei" dan 6 "Verifikasi": di portal Faskes tidak ada menu khusus; hanya terlihat pada stepper dan sub-tahap di Status Pengajuan. Jika survei selesai tapi invoice belum lunas, proses tertahan di tahap 4 dan banner oranye muncul.
- Tahap 7 "Selesai": pengajuan pindah ke Histori Pengajuan hanya bila invoice sudah lunas; dari sana Faskes dapat mengajukan akreditasi lagi.
- Seluruh siklus di-scope per lembaga: `session['lembaga_id']` di-force ke lembaga master faskes; query dari client selalu menyertakan `?lembaga_id=` (dibuat otomatis oleh `api()` di `frontend/src/lib/api.js`).
