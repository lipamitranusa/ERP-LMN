# Bab 04 — Rekomendasi (catatan faktual)

Sumber: `frontend/src/views/rekomendator/RekomendasiWorkspace.jsx`, `frontend/src/views/rekomendator/RekomendasiHistory.jsx`,
`frontend/src/views/rekomendator/RekomendasiSettings.jsx`, `frontend/src/views/rekomendator/RekomendasiDetail.jsx`,
`backend/routes/api.php`, `backend/app/Http/Controllers/Api/RekomendasiController.php`,
`backend/app/Services/Rekomendasi/DefaultReksaService.php`, `backend/app/Services/Verifikasi/RekomendasiQueueService.php`,
`backend/app/Http/Controllers/Api/PenugasanController.php`, `backend/app/Models/LaporanVerifikasi.php`,
`backend/app/Http/Middleware/EnsurePrivilege.php`, `frontend/src/routes.js`, `frontend/src/App.jsx`.

Semua layar bab ini berada di kerangka `/admin` (layout internal), bukan portal Surveior.
Menu Rekomendasi sengaja dipisah dari grup "Keuangan" agar portal Rekomendator menampilkan satu menu saja
(`frontend/src/routes.js`).

---

## Rekomendasi
- **Route:** `/admin/rekomendasi` (menu sidebar: group `Rekomendasi`, item `Rekomendasi`)
- **Kondisi/estate yang ditampilkan:**
  - Judul: `Rekomendasi`; subjudul: `Daftar laporan verifikasi yang menunggu validasi rekomendator. Setelah disetujui, AP honor untuk surveior, verifikator, dan rekomendator akan dicatat sekaligus.`
  - **Memuat:** `Memuat...`
  - **Kosong:** judul `Tidak ada rekomendasi menunggu`, keterangan `Semua laporan verifikasi sudah diproses.` (dengan ikon centang).
  - **Terisi:** tabel data dalam satu kartu.
  - **Memuat detail (di dalam modal):** `Memuat detail...`
  - **Detail tidak ada:** `Detail tidak tersedia.`
  - **Error:** tidak ada state error pada tabel; kegagalan approve/tolak muncul lewat `alert` dengan pesan dari server.
- **Komponen/field yang tampil:**
  - Kolom tabel: `Faskes`, `Lembaga`, `Verifikator`, `Tanggal Final`, `Status`, `Aksi`.
    - `Faskes` = `laporan.penugasan.siklus.faskes.nama` (cadangan `—`).
    - `Lembaga` = `laporan.penugasan.siklus.lembaga.nama` (cadangan `—`).
    - `Verifikator` = `verifikasi_penugasan.tenaga_ahli.nama` (cadangan `—`).
    - `Tanggal Final` = waktu `finalized_at`.
    - `Status` = badge `Menunggu Rekomendasi` / `Disetujui` / `Ditolak`.
    - `Aksi` = tombol `Review`.
  - **Modal review**, judul `Review Rekomendasi — {nama faskes}`:
    - Bagian `Dokumen Surveior`:
      - Untuk tiap surveior, kartu dengan judul `Surveior {urutan}` yang digabung ` — {jenis_tenaga_ahli}` atau ` — {peran}` bila tersedia.
      - Baris tabel: `Surveior`, `Nomor Induk Surveior` (bila ada), `Status Penugasan`, `Tanggal Submit Laporan`, `Keterangan`.
      - Bila tidak ada dokumen: teks `Tidak ada dokumen.`
    - Bagian `Dokumen Verifikator`: baris `Verifikator` dan `Tanggal Selesai Verifikasi`.
    - Bagian `Status Rekomendasi`: badge status, baris `Diputuskan: {waktu}` (bila `direkomendasikan_at` terisi), dan kotak berisi `catatan_rekomendasi` (bila ada).
    - Bagian `Catatan Rekomendator (opsional)` — hanya tampil bila pengguna berprivilege Setujui dan status detail `menunggu`:
      - Textarea 3 baris, placeholder `Tambahkan catatan jika diperlukan (mis. untuk rekomendasi atau justifikasi penolakan)...`, panjang maksimum 2000 karakter.
      - Petunjuk: `Catatan wajib diisi (min. 5 karakter) hanya jika Anda memilih Tolak.`
    - Footer: tombol `Tutup`, tombol `Tolak` (merah), tombol `Setujui` (hijau, saat proses `Memproses...`). Tombol Tolak/Setujui hanya tampil bila pengguna berprivilege Setujui **dan** status detail `menunggu`.
- **Aksi yang bisa dilakukan:**
  - `Review` — membuka modal dan memanggil **GET `/api/rekomendasi/{id}`** untuk memuat detail.
  - `Setujui` — konfirmasi peramban `Setujui hasil verifikasi ini? AP honor untuk surveior, verifikator, dan rekomendator akan dicatat.` → **POST `/api/rekomendasi/{id}/setujui`** (tanpa badan). Server membalas `Rekomendasi disetujui. AP honor untuk surveior, verifikator, dan rekomendator sudah dicatat.` Modal ditutup dan daftar dimuat ulang.
  - `Tolak` — konfirmasi peramban `Tolak hasil verifikasi ini?` → **POST `/api/rekomendasi/{id}/tolak`** dengan badan `{ catatan }`. Server membalas `Rekomendasi ditolak. Verifikator/admin perlu menindaklanjuti catatan.` Modal ditutup dan daftar dimuat ulang.
  - `Tutup` — menutup modal tanpa perubahan.
  - Pemuatan daftar → **GET `/api/rekomendasi`**.
- **Validasi & pesan error:**
  - Client: sebelum `Tolak`, bila catatan kosong atau kurang dari 5 karakter → `alert` `Catatan penolakan wajib diisi (min. 5 karakter).` dan permintaan tidak dikirim.
  - Client: sebelum `Setujui` maupun `Tolak` selalu ada konfirmasi peramban; batal berarti tidak ada permintaan.
  - Client: pesan sukses/kesalahan dari server ditampilkan lewat `alert` (`d.message` atau cadangan `Rekomendasi disetujui.` / `Rekomendasi ditolak.`).
  - Server (`POST /tolak`): validasi `catatan` wajib teks, minimal 5 dan maksimal 2000 karakter.
  - Server (`POST /setujui`): `Rekomendasi sudah disetujui sebelumnya.` (422) bila sudah disetujui; `Rekomendasi disetujui, tetapi pencatatan AP honor gagal: {pesan error}` (500) bila pencatatan honor gagal (rekomendasi tetap berstatus disetujui).
  - Server (`POST /tolak`): `Tidak dapat menolak rekomendasi yang sudah disetujui.` (422).
  - Server (otorisasi default reksa, kedua aksi): `Hanya default reksa untuk lembaga {nama lembaga} yang dapat menyetujui.` (403) dan `Hanya default reksa untuk lembaga {nama lembaga} yang dapat menolak.` (403) bila pemanggil bukan default reksa untuk lemma yang sedang aktif.
  - Server (pemeriksaan lemma): `Laporan verifikasi ini milik lembaga "{nama}". Anda sedang di lembaga lain.` (403) bila laporan verifikasi diakses dari lemma lain.
  - Server (privilege middleware): `Anda tidak memiliki hak akses untuk aksi ini.` (403) bila privilege `Rekomendasi, Setujui` tidak dimiliki.
- **Peran & syarat akses:**
  - `GET /api/rekomendasi` — privilege `Rekomendasi, Lihat`.
  - `GET /api/rekomendasi/{laporanVerifikasi}` — privilege `Rekomendasi, Lihat`.
  - `POST /api/rekomendasi/{laporanVerifikasi}/setujui` — privilege `Rekomendasi, Setujui`.
  - `POST /api/rekomendasi/{laporanVerifikasi}/tolak` — privilege `Rekomendasi, Setujui`.
  - Di peramban, kemunculan tombol `Tolak`/`Setujui` ditentukan `menuActions` berisi pasangan modul `Rekomendasi` + aksi `Setujui` (disimpan di `localStorage` `menu_actions`).
  - `frontend/src/routes.js`: `path: "/rekomendasi"`, `name: "Rekomendasi"`, `privilege: ["Rekomendasi", "Lihat"]`.
  - Peran Rekomendator masuk ke aplikasi lewat `/admin/rekomendasi` (lihat pengalihan peran di `App.jsx`).
- **Catatan penting:**
  - Alur: **Verifikator menyelesaikan penugasan verifikasi → laporan verifikasi masuk antrean → Reksa menyetujui/menolak → AP honor (surveior + verifikator + reksa) dicatat**.
  - Antrean dibentuk otomatis oleh `RekomendasiQueueService` (dipanggil dari `PenugasanController::selesai` untuk penugasan jenis `verifikasi`): dibuat baris `laporan` (tipe `survei`) dari penugasan survei yang sudah `selesai`, lalu baris `laporan_verifikasi` berstatus `final` dan `status_rekomendasi = menunggu`. Bila baris verifikasi sudah ada dan belum diputuskan, baris itu difinalisasi dan masuk antrean; bila sudah diputuskan (disetujui/ditolak), tidak ditimpa.
  - Saat `Setujui`, server juga menandai siklus tuntas: kolom `status` siklus diisi `selesai` bila belum, dan `tahapan` dinaikkan menjadi `7` bila belum. AP honor dicatat lewat `LedgerService::triggerHonorSetelahRekomendasi`.
  - Daftar `GET /rekomendasi` memuat laporan verifikasi dengan `status_rekomendasi` bernilai null, `menunggu`, **atau `ditolak`** — sehingga item yang pernah ditolak masih terlihat di daftar ini; tombol Tolak/Setujui sendiri hanya tampil bila status detail `menunggu`.
  - Data dibatasi per lembaga aktif (session `lembaga_id`).

---

## Riwayat Siklus Validasi
- **Route:** `/admin/riwayat-siklus` (menu sidebar: group `Rekomendasi`, item `Riwayat Siklus Validasi`)
- **Kondisi/estate yang ditampilkan:**
  - Judul: `Riwayat Siklus Validasi`; subjudul: `Daftar siklus akreditasi yang sudah divalidasi oleh rekomendator.`
  - **Memuat:** `Memuat...`
  - **Kosong:** judul `Belum ada riwayat`, keterangan `Siklus yang sudah divalidasi akan tampil di sini.`
  - **Terisi:** tabel data dalam satu kartu + baris paginasi di bawah (hanya tampil bila `total > 0`).
  - **Memuat detail (di dalam modal):** `Memuat detail...`; `Detail tidak tersedia.` bila detail kosong.
- **Komponen/field yang tampil:**
  - Baris filter (kartu di atas tabel):
    - Kolom pencarian, placeholder `Cari nama faskes...` (pencarian sebagian pada nama faskes).
    - Dropdown status: `Semua status`, `Disetujui`, `Ditolak`.
    - Tombol `Reset` (hanya tampil bila pencarian atau filter status terisi) — mengosongkan kedua filter dan kembali ke halaman 1.
  - Kolom tabel: `Faskes`, `Jenis Faskes`, `Lembaga`, `Surveior`, `Verifikator`, `Item`, `Status`, `Tanggal Keputusan`, `Aksi`.
    - `Faskes` = `faskes_nama`; `Jenis Faskes` = `faskes_jenis`; `Lembaga` = `lembaga_nama`; `Surveior` = daftar nama surveior dipisah koma; `Verifikator` = `verifikator_nama`; `Item` = jumlah item verifikasi (`jumlah_item_verifikasi`); `Status` = badge `Disetujui`/`Ditolak`; `Tanggal Keputusan` = `direkomendasikan_at`.
    - Semua kolom bercadangan `—` bila kosong.
    - `Aksi` = tombol `Detail`.
  - Baris paginasi: teks `Total {total} siklus · Halaman {halaman saat ini} dari {jumlah halaman}`; tombol `Sebelumnya` (nonaktif di halaman 1) dan `Berikutnya` (nonaktif di halaman terakhir).
  - **Modal detail**, judul `Detail Rekomendasi — {nama faskes}`, isi sama seperti modal pada menu Rekomendasi (Bagian `Dokumen Surveior`, `Dokumen Verifikator`, `Status Rekomendasi`) tetapi **tanpa** bagian catatan reksa dan **tanpa** tombol Tolak/Setujui. Footer hanya berisi tombol `Tutup`.
- **Aksi yang bisa dilakukan:**
  - Mengetik di kolom pencarian atau memilih status — memuat ulang daftar dengan `q` dan `status`; nomor halaman dikembalikan ke 1.
  - `Reset` — menghapus filter.
  - `Detail` — membuka modal dan memanggil **GET `/api/rekomendasi/{id}`**.
  - `Sebelumnya` / `Berikutnya` — berpindah halaman (15 baris per halaman).
  - Pemuatan daftar → **GET `/api/rekomendasi/history`** dengan parameter `q`, `status`, `per_page=15`, `page`.
- **Validasi & pesan error:**
  - Tidak ada validasi client pada layar ini (pencarian & filter tidak divalidasi, langsung dikirim sebagai query).
  - Server: `q` dicari dengan `like` pada nama faskes; `status` disaring sama persis dengan nilai `status_rekomendasi`; `per_page` dibatasi maksimum 50.
  - Server: privilege `Rekomendasi, Lihat`; bila tidak dimiliki → `Anda tidak memiliki hak akses untuk aksi ini.` (403).
- **Peran & syarat akses:**
  - `GET /api/rekomendasi/history` — privilege `Rekomendasi, Lihat`.
  - `frontend/src/routes.js`: `path: "/riwayat-siklus"`, `name: "Riwayat Siklus Validasi"`, `privilege: ["Rekomendasi", "Lihat"]`.
  - Backend hanya memasukkan `status_rekomendasi` bernilai `disetujui` atau `ditolak` pada riwayat ini.
- **Catatan penting:**
  - Riwayat menampilkan satu baris per siklus (bukan per laporan verifikasi), dengan ringkasan nama surveior, verifikator, dan jumlah item verifikasi yang diperiksa.
  - Status `ditolak` juga muncul di riwayat, bersama catatan penolakan di dalam modal detail (bagian `Status Rekomendasi`).
  - Data dibatasi per lembaga aktif (session `lembaga_id`), sama seperti menu Rekomendasi.

---

## Reksa
- **Route:** `/admin/rekomendasi-settings` (menu sidebar: group `Pengaturan`, item `Rekomendator`; judul halaman di layar: `Pengaturan Reksa`)
- **Kondisi/estate yang ditampilkan:**
  - Judul: `Pengaturan Reksa`; deskripsi panjang: `Tunjuk satu pengguna dengan role Reksa yang akan menerima hasil verifikasi untuk disetujui atau ditolak. Setiap lembaga memiliki 1 reksa sendiri — pengaturan di bawah hanya berlaku untuk {nama lembaga}. Setelah verifikator finalize, laporan otomatis muncul di menu Rekomendasi untuk pengguna ini.`
  - **Memuat:** `Memuat...`
  - **Sukses:** kotak hijau berisi pesan server, mis. `Default reksa disetel ke {nama}.`
  - **Kosong (belum ada default):** kotak kuning `Belum ada default reksa untuk {nama lembaga}. Klik tombol "Edit" untuk memilih.`
  - **Error:** `alert` berisi pesan server (bukan kotak di halaman).
- **Komponen/field yang tampil:**
  - Blok `Default Reksa Saat Ini`:
    - Nama reksa (tebal), email, baris `Role: {role}` dan, bila tertaut ke tenaga ahli, `· TA: {nomor induk surveior}`.
    - Bila ada lemma aktif: baris `Lembaga: {nama lemma}`.
    - Bila tenaga ahli punya rekening: `Rekening: {no rekening} ({nama bank}) — {atas nama rekening}`.
    - Bila belum ada rekening: peringatan `Belum ada data rekening. Tautkan akun ini ke tenaga ahli di Manajemen Akun agar honor reksa membawa rekening saat pembayaran AP.`
  - Blok hak akses:
    - Bila berprivilege `Rekomendasi, Ubah`: kotak biru `Anda login sebagai {nama} ({role}).` (+ ` Anda sudah menjadi default reksa.` bila pengguna itu adalah default saat ini), tombol `Edit` dan tombol `Jadikan Saya Default` (saat proses `Menyetel...`).
    - Bila tidak berprivilege: kotak abu `Anda login sebagai {role}. Anda tidak memiliki privilege Rekomendasi, Ubah untuk menyetel default reksa. Hubungi administrator jika perlu mengubah.`
  - Tabel `Daftar Kandidat Reksa ({jumlah})` — kolom `Nama`, `Email`, `No. Induk`, `Rekening (AP)`:
    - Baris default diberi label kecil `DEFAULT` dan latar hijau.
    - `No. Induk` = `nomor_induk_surveior` (cadangan `—`).
    - `Rekening (AP)` = `{no rekening} ({nama bank})`, atau teks amber `belum ada — tautkan ke tenaga ahli`.
  - **Modal "Edit Default Reksa"**:
    - Teks: `Pilih pengguna dengan role Reksa yang akan menerima hasil verifikasi. Hanya satu reksa yang aktif pada satu waktu.` + bila ada lemma aktif: ` Kandidat diambil dari lemma aktif {nama}.`
    - Label `Reksa *`, dropdown dengan pilihan awal `— Pilih reksa —`; tiap opsi `{nama} — {email}` dan, bila ada, ` ({nomor induk surveior})`.
    - Petunjuk: `{jumlah} kandidat tersedia. Hanya menampilkan user dengan role Reksa dan status aktif.`
    - Bila kandidat kosong, kotak kuning: `Belum ada akun dengan role Reksa di lembaga {nama}.` + `Buat di Master Data — Tenaga Ahli (peran Reksa, lengkapi rekening, lalu buat akun login), atau di Manajemen Akun (pilih role Reksa dan centang lemma ini).`
    - Tombol `Batal` dan `Simpan` (saat menyimpan `Menyimpan...`; tombol nonaktif bila belum ada reksa yang dipilih).
- **Aksi yang bisa dilakukan:**
  - `Edit` — membuka modal dengan reksa saat ini terpilih (bila ada).
  - `Simpan` → **PUT `/api/rekomendator/default`** dengan badan `{ user_id }`. Server membalas pesan `Default reksa disetel ke {nama}.`
  - `Jadikan Saya Default` — konfirmasi peramban `Setel diri Anda ({nama}) sebagai default reksa?` → **PUT `/api/rekomendator/default`** dengan `{ user_id: <id pengguna sendiri> }`. Tombol ini hanya tampil bila peran pengguna adalah `Reksa`.
  - Pemuatan default → **GET `/api/rekomendator/default`**; pemuatan kandidat → **GET `/api/rekomendator/candidates`** (balasan memuat juga `lembaga` aktif).
  - Setiap perubahan tercatat pada audit trail dengan aksi `reksa.default.set`.
- **Validasi & pesan error:**
  - Client: bila belum ada reksa dipilih saat `Simpan` → `alert` `Pilih salah satu reksa terlebih dahulu.`; bila id yang dipilih tidak ditemukan di daftar kandidat → `alert` `Reksa tidak ditemukan di daftar.`; sebelum menyimpan selalu ada konfirmasi peramban (`Setel default reksa ke {nama}?`).
  - Client: kegagalan permintaan ditampilkan lewat `alert` berisi `err.message`.
  - Server (`PUT /rekomendator/default`): validasi `user_id` wajib UUID yang ada di `akun_pengguna`; bila role target bukan `Reksa` → 422 `User yang dipilih harus memiliki role Reksa.`; bila target bukan milik lemma yang sedang aktif → 422 `User Reksa yang dipilih bukan milik lembaga Anda saat ini.`
  - Server (privilege middleware): `Anda tidak memiliki hak akses untuk aksi ini.` (403) bila privilege `Rekomendasi, Ubah` tidak dimiliki.
- **Peran & syarat akses:**
  - `GET /api/rekomendator/default` dan `GET /api/rekomendator/candidates` — privilege `Rekomendasi, Lihat`.
  - `PUT /api/rekomendator/default` — privilege `Rekomendasi, Ubah`.
  - `frontend/src/routes.js`: `path: "/rekomendasi-settings"`, `name: "Rekomendator"`, `privilege: ["Rekomendasi", "Ubah"]`.
  - Di peramban, kemunculan blok Edit/Jadikan Saya Default ditentukan `menuActions` berisi pasangan modul `Rekomendasi` + aksi `Ubah`.
- **Catatan penting:**
  - Konfigurasi "1 reksa per lemma" disimpan di tabel `konfigurasi_penugasan` dengan kunci `default_reksa_user_id` dan disimpan per-lemma (`DefaultReksaService::KUNCI`).
  - Kandidat reksa (metode `kandidatUntuk`) disaring: peran `Reksa`, status akun `Aktif`, dan akun + tenaga ahlinya satu lemma dengan lemma aktif; hasil diurutkan berdasarkan nama.
  - Default yang terpointer hanya berlaku bila akun dan tenaga ahlinya masih selaras dengan lemma tersebut (`selaras` / `AkunPengguna::selarasDenganLembaga`); bila tidak selaras, dianggap belum ada default untuk lemma itu.
  - Setelah verifikator menyelesaikan penugasan verifikasi, laporan verifikasi otomatis muncul di menu **Rekomendasi** untuk pengguna ini (`RekomendasiQueueService`).
  - Honor reksa hanya bisa membawa rekening bila akun reksa tertaut ke tenaga ahli yang sudah punya data rekening — inilah alasan peringatan rekening muncul di layar ini.
  - Nama peran yang diperiksa server adalah `Reksa` (`DefaultReksaService::ROLE_REKSA = 'Reksa'`), dan kode peramban memakai `user?.role === "Reksa"` untuk menentukan kemunculan tombol `Jadikan Saya Default`; sementara nama menu di sidebar adalah `Rekomendator` (`routes.js`) dan nama modul privilege tetap `Rekomendasi`. Keduanya menunjuk peran yang sama.

---

## Alur data Rekomendasi (ringkasan teknis dari kode)
- **Route:** — (bukan layar)
- **Kondisi/estate yang ditampilkan:** tidak berlaku.
- **Komponen/field yang tampil:**
  - `RekomendasiQueueService::TIPE_LAPORAN_SURVEI = 'survei'`.
  - `LaporanVerifikasi::STATUS_REKOMENDASI_MENUNGGU = 'menunggu'`, `STATUS_REKOMENDASI_DISETUJUI = 'disetujui'`, `STATUS_REKOMENDASI_DITOLAK = 'ditolak'`.
- **Aksi yang bisa dilakukan:**
  - `ensureLaporanSurvei()` — memastikan penugasan jenis `survei` punya baris `laporan` (sumber dokumen surveior pada halaman Rekomendasi).
  - `ensureLaporanVerifikasi()` — memastikan siklus punya baris `laporan_verifikasi` berstatus `menunggu`; idempotent dan aman dipanggil berulang kali.
  - `laporanSurveiUtama()` — memilih penugasan survei yang sudah `selesai` (diurutkan `tanggal_selesai`) dan memprioritaskan yang sudah mengunggah laporan pengerjaan.
- **Validasi & pesan error:** tidak ada; seluruh service bersifat idempotent.
- **Peran & syarat akses:** dijalankan otomatis oleh server pada `PUT /api/penugasan/{penugasan}/selesai` untuk penugasan jenis `verifikasi` — bukan dipicu dari peramban.
- **Catatan penting:**
  - Dokumen sumber untuk reksa: baris `laporan` (tipe `survei`) yang menunjuk penugasan survei; `laporan.penugasan.laporanPengerjaan` memuat berkas bukti.
  - Daftar surveior pada siklus (untuk bagian `Dokumen Surveior`) diurutkan: penugasan `digantikan` paling akhir, lalu TKPP sebelum TKSDU.
