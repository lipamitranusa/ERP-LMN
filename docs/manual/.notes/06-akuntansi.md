# Catatan faktual — Bab 06 Akuntansi (10 layar)

Sumber yang dibaca: `frontend/src/views/accounting/*.jsx`, `backend/app/Services/Keuangan/AccountingService.php`,
`backend/app/Services/Keuangan/AccrualJournalService.php`, `backend/app/Services/Keuangan/SettlementJournalService.php`,
`backend/app/Models/Coa.php`, `backend/app/Models/KategoriJurnal.php`, `backend/app/Models/JurnalUmum.php`,
`backend/app/Http/Controllers/Api/AccountingController.php`, `backend/app/Http/Controllers/Api/SettlementJournalController.php`,
`backend/routes/api.php`, `frontend/src/routes.js`.

Catatan umum yang berlaku untuk semua layar bab ini:

- Semua URL API berada di bawah prefix `Route::prefix('keuangan')->middleware(['auth:sanctum', 'lembaga'])`
  → path frontend `/keuangan/...` dipanggil sebagai `/api/keuangan/...` (lihat `frontend/src/lib/api.js`, `API_BASE = '/api'`).
- Klien `api()` otomatis menambah `?lembaga_id=<id>` dari `localStorage` dan mengirim header `Authorization: Bearer <token>`.
- Semua response API modul ini dibungkus amplop `{ "data": ... }`, kecuali pesan sukses yang juga memakai kunci `message`.
- Prefix halaman di `routes.js` adalah `layout: "/admin"`, jadi alamat sebenarnya berawalan `/admin/...`
  (mis. route `/accounting/coa` → alamat `/admin/accounting/coa`).
- Privilege memakai modul `Ledger/Keuangan` dengan action `Lihat`, `Tambah`, `Ubah`, `Hapus`, `Setujui`, `Ekspor`, `Final`.
  Middleware `EnsurePrivilege` membalas 401 dengan `"Tidak terautentikasi."` dan 403 dengan
  `"Anda tidak memiliki hak akses untuk aksi ini."` bila role tidak punya action yang diminta.

---

## Dasbor Akuntansi

- **Route:** `/accounting/dashboard` (alamat sebenarnya `/admin/accounting/dashboard`)
- **Komponen:** `frontend/src/views/accounting/Dashboard.jsx`, `componentName: "AccountingDashboard"`.
- **Privilege (routes.js):** `["Ledger/Keuangan", "Lihat"]`.
- **Privilege (backend):** `GET /api/keuangan/accounting/dashboard` → `privilege:Ledger/Keuangan,Lihat`.

- **Kondisi yang ditampilkan:**

  - Judul halaman: `Dasbor Akuntansi`. Subjudul: `Ringkasan posisi keuangan — {periodeLabel}`.
    `periodeLabel` = `{Bulan} {Tahun}` (mis. `November 2026`), atau `Tahun {Tahun}` bila bulan = `Semua Bulan`.
  - Sambil memuat: `Memuat dasbor akuntansi...` (teks persis, dengan tiga titik).
  - Error tidak handled: bila request gagal, `dash` tetap `undefined` dan teks `Memuat dasbor akuntansi...` tetap tampil.
  - Tidak ada kondisi "kosong" terpisah — kartu KPI selalu dirender dengan nilai `Rp 0` bila tidak ada data.

- **Komponen/field yang tampil:**

  Filter (dalam `Card`):
  - Label `Tahun` — `select`, 5 opsi: tahun berjalan+1 dikurangi 4 sampai tahun berjalan+1 (contoh 2026 → 2027–2031).
  - Label `Bulan` — `select` dengan opsi `Semua Bulan` (value kosong) lalu 12 nama bulan `Januari`…`Desember`.
  - Tombol `Tampilkan` (menolak/refetch saat `isFetching`); teks jadi `Memuat...` selama request berjalan.

  Baris KPI 1 (4 kartu):
  - `Saldo Kas & Bank` → angka `Rp {saldo_kas_bank}`; keterangan `Akun kas & bank · s.d. {tanggal_snapshot}`.
  - `Pendapatan Periode` → `Rp {total_pendapatan}` (hijau); keterangan `{periodeLabel}`.
  - `Beban Periode` → `Rp {total_beban}` (merah); keterangan `{periodeLabel}`.
  - `Laba / (Rugi)` → `Rp {laba_rugi}`; kartu diberi border hijau bila ≥ 0, merah bila < 0. Keterangan `{periodeLabel}`.

  Baris KPI 2 (3 kartu):
  - `Akun Perkiraan (COA)` → `{jumlah_coa}`; keterangan `Akun aktif`.
  - `Jurnal Periode` → `{jumlah_jurnal}`; keterangan `Transaksi`.
  - `Total Debit / Kredit` → dua baris: `D: {Rp total_debit}` dan `K: {Rp total_kredit}`; keterangan `{periodeLabel}`.

  Kartu bawah `Navigasi Modul Akuntansi` — 4 tautan (pakai `href` biasa, bukan router):
  - `Chart of Accounts` / `Master akun perkiraan` → `/admin/accounting/coa`
  - `Kategori Jurnal` / `Jenis transaksi jurnal` → `/admin/accounting/kategori-jurnal`
  - `Jurnal Umum` / `Input transaksi non-survei` → `/admin/accounting/jurnal`
  - `Buku Besar` / `Saldo & mutasi per akun` → `/admin/accounting/buku-besar`

- **Aksi yang bisa dilakukan:**

  - Mengubah `Tahun` / `Bulan` → `GET /api/keuangan/accounting/dashboard?tahun={tahun}&bulan={bulan}`.
  - Tombol `Tampilkan` → `refetch()` query yang sama (query key `["accounting-dashboard", tahun, bulan]`).
  - Klik salah satu tautan Navigasi → pindah halaman (navigasi browser penuh).

- **Peran & syarat akses:**

  - Syarat: role punya `Ledger/Keuangan` → `Lihat`. Menu muncul di Sidebar grup `Akuntansi` hanya bila privilege terpenuhi
    (`frontend/src/components/Sidebar.jsx`, fungsi `hasPrivilege`).

- **Catatan penting — arti angka (dari `AccountingService::dashboard`):**

  - `saldo_kas_bank` = **saldo kumulatif** akun kas & bank sampai akhir periode (dibatasi `min(akhir periode, hari ini)`).
    Akun yang dihitung: `Coa` dengan `jenis = aktiva_lancar` **dan** (`kode` ∈ 1101–1104 **atau** `nama` diawali "kas" **atau** `nama` mengandung "bank").
    Akun nonaktif **tetap dihitung** (saldo historisnya masih ada). Ini akumulasi seluruh jurnal, bukan saldo awal + mutasi.
    Perhitungan: `saldoAkhir()` = total debit − total kredit (akun saldo normal debit) atau total kredit − total debit (saldo normal kredit).
  - `total_pendapatan` = **net** (kredit − debit) dari baris jurnal pada akun `jenis` `pendapatan` atau `pendapatan_lain`, **hanya dalam periode terpilih**.
  - `total_beban` = **net** (debit − kredit) dari akun `jenis` `beban` atau `beban_lain`, **hanya dalam periode terpilih**.
  - `laba_rugi` = `total_pendapatan − total_beban` (periode berjalan, bukan akumulasi tahunan).
  - `total_debit` / `total_kredit` = jumlah seluruh baris jurnal detail dalam periode (semua jenis akun), bukan hanya akun pendapatan/beban.
  - `jumlah_jurnal` = jumlah **header** `jurnal_umum` dalam periode (termasuk jurnal settlement & akrual, bukan hanya jurnal manual).
  - `jumlah_coa` = jumlah COA **aktif** (`is_aktif = true`).
  - `tanggal_snapshot` = tanggal potong perhitungan saldo kas & bank (bisa lebih awal dari akhir periode bila periode masih berjalan).
  - Bila bulan kosong (`Semua Bulan`), backend memakai `tahun` saja → seluruh tahun.
  - Sumber angka ini adalah `jurnal_umum` + `jurnal_umum_detail` — bukan tabel `ledger_entries`.

  ---

## Chart of Accounts (COA)

- **Route:** `/accounting/coa` (alamat `/admin/accounting/coa`)
- **Komponen:** `frontend/src/views/accounting/CoaList.jsx`, `componentName: "AccountingCoa"`.
- **Privilege (routes.js):** `["Ledger/Keuangan", "Lihat"]`.

- **Kondisi yang ditampilkan:**

  - Judul `Chart of Accounts`. Subjudul `Master akun perkiraan — struktur standar akuntansi.`
  - Sambil memuat: `Memuat...` (div, bukan baris tabel).
  - Error tidak handled → `data` = `[]` → tidak ada tabel yang terender sama sekali (halaman kosong tanpa pesan).
  - Tidak ada pesan "kosong" per kategori; kategori tanpa akun hanya tidak tampil.

- **Komponen/field yang tampil:**

  - Tombol `+ Tambah Akun` (kanan atas).
  - Card filter:
    - Label `Cari` — input, placeholder `Kode atau nama...` (pencarian **di sisi browser**, bukan ke server).
    - Label `Jenis` — `select` dengan opsi `Semua` + 9 jenis: `Aktiva Lancar`, `Aktiva Tetap`, `Kewajiban Lancar`,
      `Kewajiban Jangka Panjang`, `Modal`, `Pendapatan`, `Pendapatan Lain`, `Beban`, `Beban Lain`.
    - Tombol `Reset` — mengosongkan kedua filter.
  - Tabel dikelompokkan per heading besar (grup jenis, dari `JENIS_GROUP`):
    `NERACA - AKTIVA`, `NERACA - KEWAJIBAN & MODAL`, `LABA RUGI - PENDAPATAN`, `LABA RUGI - BEBAN`.
    Akun yang jenisnya tidak dikenal masuk group `LAINNYA`.
  - Kolom tabel: `Kode`, `Nama Akun`, `Kelompok`, `Saldo Normal`, `Status`, `Aksi`.
    - `Kelompok` menampilkan `JENIS_LABEL[a.jenis]` (mis. `Pendapatan`).
    - `Saldo Normal` menampilkan `KELOMPOK_LABEL[a.kelompok]` → `Debit`, `Kredit`, atau `Debit / Kredit`.
    - `Status` → badge `Aktif` / `Nonaktif` (baris nonaktif diredupkan opacity 0.5).
    - `Aksi` → tombol `Edit` dan `Hapus`.
  - Dialog `Tambah Akun` / `Edit Akun`:
    - `Kode Akun *` — placeholder `mis. 1101`; **disabled saat edit** (`disabled={!!editItem}`).
    - `Nama Akun *` — placeholder `mis. Bank BCA`.
    - `Jenis *` — select, opsi pertama `— Pilih Jenis —`.
    - `Kelompok / Saldo Normal` — select: `Debit / Kredit`, `Debit`, `Kredit`.
    - Checkbox `Akun aktif`.
    - Footer: `Batal` dan `Simpan` (teks `Menyimpan...` saat submit).

- **Aksi yang bisa dilakukan:**

  | Tombol | HTTP | Endpoint | Bentuk |
  |---|---|---|---|
  | `+ Tambah Akun` → `Simpan` | `POST` | `/api/keuangan/accounting/coa` | JSON `{ kode, nama, jenis, kelompok, is_aktif }` |
  | `Edit` → `Simpan` | `PUT` | `/api/keuangan/accounting/coa/{id}` | JSON body yang sama seperti tambah |
  | `Hapus` | `DELETE` | `/api/keuangan/accounting/coa/{id}` | — |

  - `Hapus` meminta konfirmasi browser dengan teks: `Hapus akun {kode} - {nama}?`
  - Setelah simpan, query `coa` di-invalidate; dialog ditutup.

- **Validasi & pesan error:**

  - Sisi peramban (Zod, tampil di bawah field):
    - `Kode akun wajib diisi`
    - `Nama akun wajib diisi`
    - `Jenis wajib dipilih`
  - Sisi server (Laravel, `lang/id/validation.php`):
    - `kode` wajib & unik **per lembaga** → `Kolom kode akun sudah digunakan.`
    - `nama` wajib, maks 200 → `Kolom nama wajib diisi.` / `Kolom nama tidak boleh lebih dari 200 karakter.`
    - `jenis` harus salah satu dari 9 nilai → `Kolom jenis yang dipilih tidak valid.`
    - `kelompok` harus `debit|kredit|debit_kredit` → `Kolom kelompok yang dipilih tidak valid.`
  - Hapus akun yang sudah dipakai di jurnal → HTTP 422 dengan pesan persis:
    `Akun sudah digunakan di jurnal umum. Nonaktifkan saja.`
  - Hapus akun yang tidak ada → HTTP 404 `Akun tidak ditemukan.`
  - Berhasil hapus → `Akun berhasil dihapus.`
  - Error hapus ditampilkan lewat `alert(err.message)` (popup browser).

- **Peran & syarat akses:**

  - Halaman & daftar: `Ledger/Keuangan` → `Lihat`.
  - `POST /accounting/coa` → `privilege:Ledger/Keuangan,Tambah`.
  - `PUT /accounting/coa/{id}` → `privilege:Ledger/Keuangan,Ubah`.
  - `DELETE /accounting/coa/{id}` → `privilege:Ledger/Keuangan,Hapus`.
  - Catatan: halaman ini **tidak** menyembunyikan tombol Add/Edit/Hapus berdasarkan privilege di sisi peramban
    (tidak ada pemanggilan `can(...)` di `CoaList.jsx`). Tombol selalu terlihat; penolakan terjadi di server (403).

- **Catatan penting:**

  - Endpoint `GET /accounting/coa` (`AccountingService::listCoa`) **hanya mengembalikan COA aktif** (`Coa::query()->aktif()`),
    dikembalikan urut `kode`. Konsekuensi: akun yang di-nonaktifkan **tidak muncul lagi di tabel**, sehingga tidak bisa
    diaktifkan kembali lewat UI — hanya `is_aktif` yang bisa diubah, dan `is_aktif` tidak bisa diubah karena akunnya tak terlihat.
  - Field `kategori_id` ada di model `Coa` dan validasi server (`nullable|uuid|exists:kategori_jurnal,id`) tetapi
    **tidak ada di form** — jadi tidak bisa diisi dari UI.
  - Group `LAINNYA` hanya muncul bila ada akun dengan `jenis` di luar 9 nilai yang sudah dikenal.
  - Kode akun unik **per lembaga**, bukan global — dua lembaga boleh memakai kode `1101`.

  ---

## Kategori Jurnal

- **Route:** `/accounting/kategori-jurnal` (alamat `/admin/accounting/kategori-jurnal`)
- **Komponen:** `frontend/src/views/accounting/KategoriJurnal.jsx`, `componentName: "AccountingKategori"`.
- **Privilege (routes.js):** `["Ledger/Keuangan", "Lihat"]`.

- **Kondisi yang ditampilkan:**

  - Judul `Kategori Jurnal`. Subjudul `Master jenis transaksi untuk jurnal umum.`
  - Sambil memuat: `Memuat...` (baris tabel, `colSpan=4`).
  - Kosong: `Belum ada kategori. Tambahkan minimal 1.`
  - Error tidak handled → tabel kosong tanpa pesan.

- **Komponen/field yang tampil:**

  - Tombol `+ Tambah Kategori`.
  - Kolom tabel: `Nama Kategori`, `Jenis`, `Status`, `Aksi`.
    - `Jenis` berupa badge berwarna dengan label dari `JENIS_LABEL`:
      `Adjustment`, `Pemasukan`, `Pengeluaran`, `Bank Masuk`, `Bank Keluar`, `Kas Kecil Masuk`, `Kas Kecil Keluar`.
      (Label di model `KategoriJurnal::$JENIS_LABEL` berbeda: `Adjustment / Koreksi`, `Pemasukan Umum`, `Pengeluaran Umum` —
       yang dipakai UI adalah label frontend.)
    - `Status` badge: `Aktif` / `Nonaktif`.
    - `Aksi`: `Edit`, `Hapus`.
  - Dialog `Tambah Kategori` / `Edit Kategori`:
    - `Nama Kategori *` — placeholder `mis. Pengeluaran Operasional`.
    - `Jenis *` — select berisi 7 label di atas (nilai: `adjustment`, `pemasukan`, `pengeluaran`, `bkm`, `bkk`, `kkm`, `kkk`).
    - Checkbox `Aktif`.
    - Footer: `Batal`, `Simpan` (teks `Menyimpan...`).

- **Aksi yang bisa dilakukan:**

  | Tombol | HTTP | Endpoint |
  |---|---|---|
  | `+ Tambah Kategori` → `Simpan` | `POST` | `/api/keuangan/accounting/kategori` |
  | `Edit` → `Simpan` | `PUT` | `/api/keuangan/accounting/kategori/{id}` |
  | `Hapus` | `DELETE` | `/api/keuangan/accounting/kategori/{id}` |

  - `Hapus` konfirmasi: `Hapus kategori "{nama}"?`
  - `GET /accounting/kategori` mengembalikan **semua** kategori (aktif & nonaktif), urut `urutan` — tidak disaring `is_aktif`.

- **Validasi & pesan error:**

  - Peramban (Zod): `Nama kategori wajib diisi`.
  - Server: `nama` wajib maks 100 → `Kolom nama wajib diisi.` / `Kolom nama tidak boleh lebih dari 200 karakter.` (batas 100).
    `jenis` wajib dan harus salah satu dari `pemasukan|pengeluaran|adjustment` → `Kolom jenis yang dipilih tidak valid.`
  - **Catatan penting:** form UI menawarkan 7 jenis (termasuk `bkm`, `bkk`, `kkm`, `kkk`), tetapi validasi server hanya
    menerima 3 (`pemasukan`, `pengeluaran`, `adjustment`). Memilih `Bank Masuk` dsb. akan ditolak server dengan
    `Kolom jenis yang dipilih tidak valid.`
  - Hapus kategori yang sudah dipakai jurnal → 422: `Kategori sudah digunakan di jurnal. Nonaktifkan saja.`
  - Hapus kategori tidak ada → 404 `Kategori tidak ditemukan.`; berhasil → `Kategori berhasil dihapus.`

- **Peran & syarat akses:**

  - Lihat: `Ledger/Keuangan` → `Lihat`; `POST` → `Tambah`; `PUT` → `Ubah`; `DELETE` → `Hapus`.

- **Catatan penting:**

  - `KategoriJurnal::where('jenis', $jenis)->first()` dipakai `AccountingService::autoGenerateJurnal` untuk mencari
    kategori otomatis saat membuat jurnal BKM/BKK/KKM/KKK — **tanpa filter `lembaga_id`**, jadi kategori milik lembaga lain
    bisa terpakai lebih dulu bila urutan data berbeda.
  - `Adjustment / Koreksi` (`adjustment`) adalah kategori yang dipakai semua jurnal akrual
    (`AccrualJournalService` memakai `KategoriJurnal::JENIS_ADJUSTMENT`).
  - Kategori nonaktif tetap tampil di daftar dan masih bisa dipilih di form Jurnal Umum
    (dropdown Jurnal Umum memuat seluruh hasil `GET /accounting/kategori`).

  ---

## Jurnal Umum

- **Route:** `/accounting/jurnal` (alamat `/admin/accounting/jurnal`)
- **Komponen:** `frontend/src/views/accounting/JurnalUmum.jsx`, `componentName: "AccountingJurnal"`.
- **Privilege (routes.js):** `["Ledger/Keuangan", "Lihat"]`.

- **Kondisi yang ditampilkan:**

  - Judul `Jurnal Umum`. Subjudul `Input transaksi non-survei — debit & kredit harus seimbang.`
  - Sambil memuat: `Memuat...` (baris tabel, `colSpan=7`).
  - Kosong: `Belum ada jurnal. Klik "Entri Jurnal Baru" untuk mulai.`
  - Error tidak handled.

- **Komponen/field yang tampil:**

  - Tombol `+ Entri Jurnal Baru`.
  - Card filter: `Tahun` (select, 5 tahun terakhir s.d. tahun+1), `Bulan` (select `Semua` + 12 bulan). Tidak ada tombol
    "Tampilkan" — perubahan select langsung memicu query baru.
  - Tabel: `Nomor`, `Tanggal`, `Kategori`, `Keterangan`, `Total Debit`, `Total Kredit`, `Aksi`.
    - `Nomor` ditampilkan monospace, dan di bawahnya badge jenis kategori
      (`Adjustment`, `Pemasukan`, `Pengeluaran`, `Bank Masuk`, `Bank Keluar`, `Kas Kecil Masuk`, `Kas Kecil Keluar`).
    - `Kategori` = `j.kategori?.nama` atau `-`.
    - `Keterangan` = isi field keterangan jurnal, atau string kosong.
    - `Aksi`: `Detail`, `Hapus`.
  - Dialog `Entri Jurnal Umum`:
    - `Tanggal *` (input date), `Kategori *` (select, opsi `— Pilih —` + nama kategori), `Keterangan` (placeholder `Uraian transaksi`).
    - Label `Rincian Jurnal`, tabel dengan kolom `#`, `Akun Perkiraan`, `Debit`, `Kredit`, `Keterangan`.
      - Select akun: `— Pilih Akun —` lalu `{kode} — {nama}`.
      - Input Debit/Kredit: `type=number`, `min=0`, `step=0.01`, placeholder `0`.
      - Input keterangan baris: placeholder `Keterangan (opsional)`.
      - Tombol hapus baris `×` per baris.
    - Tombol `+ Tambah Baris`.
    - Panel ringkasan: `Total Debit: {Rp}`, `Total Kredit: {Rp}`, dan status `✓ Seimbang` / `✗ Tidak Seimbang`
      (hijau / merah; latar panel hijau `#F0FDF4` saat seimbang, merah `#FEF2F2` saat tidak).
    - Footer: `Batal`, `Simpan Jurnal` (teks `Menyimpan...`).
  - Dialog detail (tombol `Detail`): judul `Jurnal {nomor}`; baris info
    `Tanggal: {dd/MM/yyyy} | Kategori: {nama atau -} | Keterangan: {keterangan atau -}`;
    tabel kolom `Kode`, `Akun`, `Debit`, `Kredit`, `Keterangan`; baris total `TOTAL` dengan total debit & kredit.

- **Aksi yang bisa dilakukan:**

  | Tombol | HTTP | Endpoint |
  |---|---|---|
  | `+ Entri Jurnal Baru` → `Simpan Jurnal` | `POST` | `/api/keuangan/accounting/jurnal` (multipart `FormData`) |
  | `Detail` | — | membaca data dari list (tidak memanggil endpoint terpisah) |
  | `Hapus` | `DELETE` | `/api/keuangan/accounting/jurnal/{id}` |

  - Body FormData: `tanggal`, `kategori_id`, `keterangan`, dan per baris
    `details[{i}][coa_id]`, `details[{i}][debit]`, `details[{i}][kredit]`, `details[{i}][keterangan]`.
  - `Hapus` konfirmasi: `Hapus jurnal {nomor}?`
  - Perilaku kolom Debit/Kredit: mengisi Debit otomatis mengosongkan Kredit pada baris yang sama, dan sebaliknya
    (`updateRow`: `if (field === "debit" && val) rows[i].kredit = ""`).

- **Validasi & pesan error:**

  - Peramban (Zod): `Tanggal wajib diisi`, `Kategori wajib dipilih`.
  - Peramban (pemeriksaan sebelum submit, `alert`):
    - `Minimal 2 baris dengan akun dan nominal.`
    - `Total Debit harus sama dengan Total Kredit.`
  - Server (`AccountingService::createJurnal`):
    - `Minimal 2 baris jurnal.`
    - `Total debit ({format 0 digit}) harus sama dengan total kredit ({format 0 digit}).`
    - `Total transaksi tidak boleh nol.`
    - `Sebagian akun tidak ditemukan atau tidak aktif.`
  - Server (validasi request): `details` wajib array min 2 → `Kolom details harus memiliki minimal 2 item.`;
    `details.*.coa_id` wajib UUID dan ada di tabel `coa` → `Kolom coa yang dipilih tidak valid.`;
    `keterangan` wajib maks 500 → `Kolom keterangan wajib diisi.`
  - Hapus jurnal sistem → 422: `Jurnal berasal dari transaksi sistem. Tidak dapat dihapus.` (jurnal dengan `ref_type` terisi).
  - Hapus jurnal tidak ada → 404 `Jurnal tidak ditemukan.`; berhasil → `Jurnal berhasil dihapus.`

- **Peran & syarat akses:**

  - Lihat: `Lihat`; `GET /accounting/jurnal` dan `GET /accounting/jurnal/{id}` → `privilege:Ledger/Keuangan,Lihat`;
    `POST /accounting/jurnal` → `Tambah`; `DELETE` → `Hapus`.

- **Catatan penting:**

  - Filter periode: backend `listJurnal` hanya menerapkan `whereYear` + `whereMonth` bila **tahun dan bulan keduanya** terisi.
    Jadi memilih `Semua` pada bulan berarti **tidak ada** filter tanggal sama sekali (semua tahun), bukan satu tahun penuh.
    Bandingkan dengan Dasbor Akuntansi, di mana `Semua Bulan` berarti satu tahun penuh.
  - Nomor jurnal dibentuk `AccountingService::generateNomorJurnal()`:
    `<PREFIX>/<YYYY>/<MM>/<4 digit>`, dengan prefix dari jenis kategori:
    `bkm`→`BKM`, `bkk`→`BKK`, `kkm`→`KKM`, `kkk`→`KKK`, `pemasukan`→`JU-PM`, `pengeluaran`→`JU-PK`, lainnya→`JU`.
  - Maksimum 500 jurnal dikembalikan per halaman list.
  - `ref_type` pada jurnal manual bernilai `null`, sehingga **boleh dihapus**. Jurnal settlement & akrual memiliki `ref_type`
    sehingga tidak bisa dihapus dari UI (server menolak dengan pesan di atas).
  - Kolom `Total Debit`/`Total Kredit` di tabel berasal dari header jurnal (`jurnal_umum.total_debit/total_kredit`).

  ---

## Buku Besar

- **Route:** `/accounting/buku-besar` (alamat `/admin/accounting/buku-besar`)
- **Komponen:** `frontend/src/views/accounting/BukuBesar.jsx`, `componentName: "AccountingBukuBesar"`.
- **Privilege (routes.js):** `["Ledger/Keuangan", "Lihat"]`.

- **Kondisi yang ditampilkan:**

  - Judul `Buku Besar`. Subjudul `Saldo awal, mutasi, dan saldo akhir per akun perkiraan.`
  - Sambil memuat: `Memuat...`
  - Tidak ada kondisi "kosong" — bila tidak ada akun, tidak ada tabel yang muncul (tanpa pesan).
  - Modal detail saat memuat: `Memuat...` (di dalam modal).

- **Komponen/field yang tampil:**

  - Card filter: `Tahun` (select 5 tahun), `Bulan` (select 12 bulan — **tanpa** opsi `Semua`), tombol `Tampilkan`.
    (Tombol `Tampilkan` di `BukuBesar.jsx` tidak punya `onClick`; pergantian select sudah memicu query baru karena
    `queryKey` memuat tahun & bulan.)
  - Tabel dikelompokkan per **jenis akun** (heading `Aktiva Lancar`, `Aktiva Tetap`, `Kewajiban Lancar`,
    `Kewajiban Jangka Panjang`, `Modal`, `Pendapatan`, `Pendapatan Lain`, `Beban`, `Beban Lain`), tiap grup bisa
    dilipat/dibuka (ikon `▴` / `▾`). Grup terbuka secara default.
  - Kolom tabel: `Kode`, `Nama Akun`, `Saldo Awal`, `Mutasi Debit`, `Mutasi Kredit`, `Saldo Akhir`, `Aksi`.
    - `Mutasi Debit` (hijau) dan `Mutasi Kredit` (merah) menampilkan `-` bila 0.
    - `Saldo Akhir` tebal; warnanya hijau/merah menurut `kelompok` akun (kredit → hijau, debit → merah,
      `debit_kredit` → hijau bila ≥ 0).
    - `Aksi`: tombol `Detail`.
  - Modal `Buku Besar — {kode} {nama}`:
    - 4 kartu ringkasan: `Saldo Awal`, `Total Debit` (hijau), `Total Kredit` (merah), `Saldo Akhir` (tebal).
    - Tabel: `Tanggal`, `Nomor Jurnal`, `Keterangan`, `Debit`, `Kredit`, `Saldo`.
    - Baris pertama (latar biru) `Saldo Awal` (italic) dengan saldo di kolom Saldo.
    - Baris terakhir (latar muted) `Saldo Akhir` dengan total debit, total kredit, dan saldo akhir.
    - Kosong: `Tidak ada transaksi pada periode ini.`

- **Aksi yang bisa dilakukan:**

  | Tombol | HTTP | Endpoint |
  |---|---|---|
  | filter `Tahun`/`Bulan` | `GET` | `/api/keuangan/accounting/buku-besar?tahun={tahun}&bulan={bulan}` |
  | `Detail` | `GET` | `/api/keuangan/accounting/buku-besar/{coaId}?tahun={tahun}&bulan={bulan}` |

  - Halaman ini read-only: tidak ada tombol tambah/hapus jurnal.

- **Validasi & pesan error:**

  - Halaman tidak menampilkan pesan error dari server (tidak ada blok error di komponen).
  - `GET buku-besar/{coaId}` untuk COA yang tidak ada → 404 `Akun tidak ditemukan.`

- **Peran & syarat akses:**

  - Kedua endpoint: `privilege:Ledger/Keuangan,Lihat`.

- **Catatan penting — arti angka (dari `AccountingService::bukuBesar`):**

  - `saldo_awal` = akumulasi seluruh jurnal dengan tanggal **sebelum** awal periode
    (`saldoAwal()`: `tanggal Dari − 1 hari`), dengan tanda sesuai saldo normal akun
    (debit → total debit − total kredit; kredit → total kredit − total debit).
  - `mutasi_debit` / `mutasi_kredit` = total debit / kredit baris jurnal **di dalam** periode terpilih.
  - `saldo_akhir` (daftar) = `saldo_awal + mutasi_debit − mutasi_kredit` (tanpa pembatas nol).
  - `saldo_normal` = `{ tipe: debit|kredit, nilai: max(0, ...) }` — sisi tempat saldo berada setelah mutasi.
  - Hanya COA **aktif** yang masuk (`.aktif()`).
  - Periode tanpa bulan = 1 Januari s.d. 31 Desember; dengan bulan = awal s.d. akhir bulan tersebut.
  - **Catatan ketelitian:** endpoint detail `buku-besar/{coaId}` mengembalikan kunci
    `saldo_awal`, `total_debit`, `total_kredit`, `saldo_akhir`, dan `details[]` dengan kunci
    `nomor_jurnal`, `tanggal`, `keterangan_jurnal`, `keterangan_baris`, `debit`, `kredit` — **tidak** ada `mutasi_debit`,
    `mutasi_kredit`, `keterangan`, maupun `saldo` per baris. Frontend modal membaca `dd.mutasi_debit`, `dd.mutasi_kredit`,
    `d.keterangan`, `d.saldo` — kunci yang tidak ada di response, sehingga kartu `Total Debit`/`Total Kredit` dan kolom
    `Keterangan`/`Saldo` pada modal akan tampil kosong/0. Yang benar-benar terisi di modal: `Saldo Awal`, `Saldo Akhir`,
    `Tanggal`, `Nomor Jurnal`, `Debit`, `Kredit`.

  ---

## Bank Masuk (BKM)

- **Route:** `/accounting/bank-masuk` (alamat `/admin/accounting/bank-masuk`)
- **Komponen:** `frontend/src/views/accounting/BankReceipt.jsx` (wrapper) → `frontend/src/views/accounting/KasBankForm.jsx`.
- **Privilege (routes.js):** `["Ledger/Keuangan", "Tambah"]`.

- **Kondisi yang ditampilkan:**

  - Judul `Bank Masuk` dengan ikon `🏦`. Subjudul `Bukti Kas Masuk — mencatat penerimaan via transfer / setoran bank.`
  - Tombol `+ Entri Bank Masuk`.
  - Setelah simpan berhasil, banner hijau: `Berhasil! Bank Masuk berhasil direkam — {nomor}` (hilang otomatis setelah 5 detik).
  - Tabel:
    - Sambil memuat: `Memuat...` (`colSpan=5`).
    - Kosong: `Belum ada data Bank Masuk.`
  - Galat simpan ditampilkan sebagai kotak merah di atas form: isi `err.message` dari server.

- **Komponen/field yang tampil:**

  - Kolom tabel: `Nomor`, `Tanggal`, `Akun Kas/Bank`, `Keterangan`, `Total`.
    - `Nomor` + badge `BKM` (huruf besar dari `type.toUpperCase()`).
    - `Akun Kas/Bank` = `{kode} {nama}` dari baris detail pertama.
    - `Total` = `Rp {r.total_debit}`.
  - Dialog `Entri Bank Masuk`:
    - `Tanggal *` (date, default hari ini).
    - `No. Referensi` — placeholder `mis. RV-2026-001`.
    - `Akun Kas/Bank *` — select `— Pilih Akun —`; opsi hanya akun `jenis = aktiva_lancar` dengan kode cocok `^110[1-4]`
      (1101 Kas, 1102 Bank BCA, 1103 Bank Mandiri, 1104 Bank BRI).
    - Petunjuk arah: `Kas/bank akan di-DEBIT dari {kode} {nama}` (atau `akun yang dipilih` bila belum dipilih).
    - Tabel rincian: `#`, `Akun Counterpart`, `Deskripsi / Keterangan`, `KREDIT (Rp)`, (kosong).
      - Select counterpart: `— Pilih Akun —` + seluruh COA aktif kecuali akun kas/bank yang dipilih.
      - Input nominal: `type=text` berformat ribuan, `parseInt` + regex `/\D/g` (hanya digit), placeholder `0`.
      - Tombol `×` menghapus baris (hanya tampil bila baris > 1).
    - Tombol `+ Tambah Baris`.
    - Baris footer tabel: `Kas/Bank — {kode} {nama} [DEBIT]` dengan total nominal (latar merah `#FEF2F2` untuk tipe debit).
    - `Keterangan / Catatan` — textarea 2 baris, placeholder `Catatan umum transaksi...`.
    - Panel bawah: `Jumlah Baris` → `{n} transaksi`; `Total KREDIT` → `Rp {total}`.
    - Footer: `Batal`, `Simpan Bank Masuk` (teks `Menyimpan...`).

- **Aksi yang bisa dilakukan:**

  - Simpan → `POST /api/keuangan/accounting/auto-jurnal` dengan `FormData`:
    `jenis=bkm`, `tanggal`, `ref`, `akun_kas_bank`, `keterangan`, dan per baris
    `details[{i}][coa_id]`, `details[{i}][nominal]`, `details[{i}][keterangan]`.
  - Daftar riwayat diambil dari `GET /api/keuangan/accounting/jurnal?kategori_jenis=bkm`, dan hanya 50 baris pertama
    yang ditampilkan (`.slice(0, 50)`).

- **Validasi & pesan error:**

  - Peramban (Zod): `Tanggal wajib diisi`, `Akun Kas/Bank wajib dipilih`.
  - Peramban (sebelum submit): `Minimal 1 baris detail dengan akun dan nominal.`
  - Server (`AccountingController::autoJurnalStore`): `Minimal 1 baris detail dengan nominal.`
  - Server (`AccountingService::autoGenerateJurnal`):
    - `Jenis transaksi tidak valid.`
    - `Akun Kas/Bank tidak ditemukan atau tidak aktif.`
    - `Sebagian akun di rincian tidak valid atau tidak aktif.`
    - `Total nominal harus lebih dari nol.`
  - Server (`createJurnal`, tetap berlaku): `Minimal 2 baris jurnal.`,
    `Total debit (X) harus sama dengan total kredit (Y).`, `Total transaksi tidak boleh nol.`,
    `Sebagian akun tidak ditemukan atau tidak aktif.`
  - Sukses: response `{"message": "Jurnal berhasil digenerate.", "data": {...}}` (HTTP 201).

- **Peran & syarat akses:**

  - `POST /accounting/auto-jurnal` → `privilege:Ledger/Keuangan,Tambah`.
  - `GET /accounting/jurnal` (untuk riwayat) → `privilege:Ledger/Keuangan,Lihat`.
  - Menu di sidebar hanya muncul bila role punya `Tambah` (bukan `Lihat`) untuk `Ledger/Keuangan`.

- **Catatan penting — mekanika jurnal BKM:**

  - BKM = **kas di DEBIT**, seluruh baris counterpart di **KREDIT**.
    `AccountingService::autoGenerateJurnal` menambahkan satu baris kas/bank bernilai total (= jumlah semua nominal rincian)
    di sisi debit, lalu tiap baris rincian berada di sisi kredit.
  - Kategori jurnal diambil otomatis: `KategoriJurnal::where('jenis', 'bkm')->first()`.
  - Nomor jurnal berawalan `BKM/`.
  - Journal yang dihasilkan **tidak** punya `ref_type` → dapat dihapus lewat menu Jurnal Umum.

  ---

## Bank Keluar (BKK)

- **Route:** `/accounting/bank-keluar` (alamat `/admin/accounting/bank-keluar`)
- **Komponen:** `frontend/src/views/accounting/BankDisbursement.jsx` (wrapper) → `KasBankForm.jsx` (`type: "bkk"`).
- **Privilege (routes.js):** `["Ledger/Keuangan", "Tambah"]`.

- **Kondisi yang ditampilkan:**

  - Judul `Bank Keluar` dengan ikon `🏦`. Subjudul `Bukti Kas Keluar — mencatat pembayaran via transfer / pengambilan dari bank.`
  - Tombol `+ Entri Bank Keluar`.
  - Banner sukses: `Berhasil! Bank Keluar berhasil direkam — {nomor}`.
  - Tabel: kolom `Nomor`, `Tanggal`, `Akun Kas/Bank`, `Keterangan`, `Total`; badge `BKK`.
    - Sambil memuat: `Memuat...`; kosong: `Belum ada data Bank Keluar.`

- **Komponen/field yang tampil:**

  - Sama dengan Bank Masuk, dengan perbedaan:
    - Teks arah: `Kas/bank akan di-KREDIT dari {kode} {nama}`.
    - Kolom nominal rincian: `DEBIT (Rp)`.
    - Baris footer: `Kas/Bank — {kode} {nama} [KREDIT]` (latar hijau `#F0FDF4`).
    - Panel bawah: `Total DEBIT`.
    - Tombol simpan: `Simpan Bank Keluar`.

- **Aksi yang bisa dilakukan:**

  - `POST /api/keuangan/accounting/auto-jurnal` dengan `jenis=bkk`.
  - Riwayat: `GET /api/keuangan/accounting/jurnal?kategori_jenis=bkk`.

- **Validasi & pesan error:**

  - Sama seperti Bank Masuk (Zod + pesan service). Pesan sukses server: `Jurnal berhasil digenerate.`

- **Peran & syarat akses:**

  - `Tambah` untuk membuat; `Lihat` untuk membaca daftar.

- **Catatan penting:**

  - BKK = **kas di KREDIT**, baris counterpart di **DEBIT**. Kategori `bkk`, nomor berawalan `BKK/`.

  ---

## Kas Kecil Masuk (KKM)

- **Route:** `/accounting/kas-kecil-masuk` (alamat `/admin/accounting/kas-kecil-masuk`)
- **Komponen:** `frontend/src/views/accounting/CashReceipt.jsx` (wrapper) → `KasBankForm.jsx` (`type: "kkm"`).
- **Privilege (routes.js):** `["Ledger/Keuangan", "Tambah"]`.

- **Kondisi yang ditampilkan:**

  - Judul `Kas Kecil Masuk` dengan ikon `💰`. Subjudul `Bukti Kas Kecil Masuk — mencatat pengisian kembali dana kas kecil.`
  - Tombol `+ Entri Kas Kecil Masuk`.
  - Banner sukses: `Berhasil! Kas Kecil Masuk berhasil direkam — {nomor}`.
  - Tabel: `Nomor`, `Tanggal`, `Akun Kas/Bank`, `Keterangan`, `Total`; badge `KKM`.
    - Sambil memuat: `Memuat...`; kosong: `Belum ada data Kas Kecil Masuk.`

- **Komponen/field yang tampil:**

  - Sama seperti Bank Masuk (kas di DEBIT, kolom `KREDIT (Rp)`, footer `[DEBIT]`, panel `Total KREDIT`),
    dengan judul, ikon, warna, dan label tombol yang berbeda.

- **Aksi yang bisa dilakukan:**

  - `POST /api/keuangan/accounting/auto-jurnal` dengan `jenis=kkm`.
  - Riwayat: `GET /api/keuangan/accounting/jurnal?kategori_jenis=kkm`.

- **Validasi & pesan error:**

  - Sama seperti Bank Masuk.

- **Peran & syarat akses:**

  - `Tambah` untuk membuat; `Lihat` untuk membaca daftar.

- **Catatan penting:**

  - Secara struktur jurnal identik dengan BKM (kas DEBIT, counterpart KREDIT) — pembeda hanya kategori `kkm` dan awalan nomor `KKM/`.
   Akun kas/bank yang dipilih tetap dari kelompok 1101–1104.

  ---

## Kas Kecil Keluar (KKK)

- **Route:** `/accounting/kas-kecil-keluar` (alamat `/admin/accounting/kas-kecil-keluar`)
- **Komponen:** `frontend/src/views/accounting/CashDisbursement.jsx` (wrapper) → `KasBankForm.jsx` (`type: "kkk"`).
- **Privilege (routes.js):** `["Ledger/Keuangan", "Tambah"]`.

- **Kondisi yang ditampilkan:**

  - Judul `Kas Kecil Keluar` dengan ikon `💰`. Subjudul `Bukti Kas Kecil Keluar — mencatat pengeluaran dari dana kas kecil.`
  - Tombol `+ Entri Kas Kecil Keluar`.
  - Banner sukses: `Berhasil! Kas Kecil Keluar berhasil direkam — {nomor}`.
  - Tabel: `Nomor`, `Tanggal`, `Akun Kas/Bank`, `Keterangan`, `Total`; badge `KKK`.
    - Sambil memuat: `Memuat...`; kosong: `Belum ada data Kas Kecil Keluar.`

- **Komponen/field yang tampil:**

  - Sama seperti Bank Keluar (kas di KREDIT, kolom `DEBIT (Rp)`, footer `[KREDIT]`, panel `Total DEBIT`).

- **Aksi yang bisa dilakukan:**

  - `POST /api/keuangan/accounting/auto-jurnal` dengan `jenis=kkk`.
  - Riwayat: `GET /api/keuangan/accounting/jurnal?kategori_jenis=kkk`.

- **Validasi & pesan error:**

  - Sama seperti Bank Masuk.

- **Peran & syarat akses:**

  - `Tambah` untuk membuat; `Lihat` untuk membaca daftar.

- **Catatan penting:**

  - Secara struktur jurnal identik dengan BKK — kategori `kkk`, awalan nomor `KKK/`.

  ---

## Jurnal Settlement AP/AR

- **Route:** `/accounting/settlement` (alamat `/admin/accounting/settlement`)
- **Komponen:** `frontend/src/views/accounting/SettlementList.jsx`, `componentName: "SettlementList"`.
- **Privilege (routes.js):** `["Ledger/Keuangan", "Lihat"]`.

- **Kondisi yang ditampilkan:**

  - Judul `Jurnal Settlement AP/AR`. Subjudul `Pencatatan kas otomatis saat piutang (AR) dan hutang (AP) dilunasi`.
  - Panel pengaturan `Akun Kas/Bank Default`:
    - Jika sudah diatur: `{kode} — {nama}`.
    - Jika belum: `Belum diatur — akan fallback ke Bank BCA (1102) atau Kas (1101)`.
    - Tombol `Ubah` →(select + `Simpan` + `Batal`).
  - Banner hasil rebuild (hijau / merah jika diawali `Gagal`).
  - Sambil memuat: `Memuat…` (tiga titik ellipsis, bukan `...`).
  - Error: `Gagal memuat: {error.message}` (warna merah).
  - Kosong: `Belum ada jurnal settlement. Settlement jurnal otomatis dibuat setiap kali bukti pembayaran Faskes diterima atau pembayaran hutang dilakukan.`

- **Komponen/field yang tampil:**

  - Tombol `Rebuild Jurnal` (teks `Memproses…` saat berjalan).
  - Filter bar:
    - Select `Tipe Settlement`: `Semua`, `Pelunasan Piutang`, `Pelunasan Hutang Honor`, `Pelunasan Hutang Pajak`.
    - Input date (dari), input date (sampai).
    - Input teks placeholder `Cari nomor / keterangan / ref id…`.
  - Tabel: `Nomor Jurnal`, `Tanggal`, `Tipe Settlement`, `Keterangan`, `Nominal`, `Status`.
    - `Tipe Settlement` badge (hijau / kuning / biru) dengan label:
      `Pelunasan Piutang`, `Pelunasan Hutang Honor`, `Pelunasan Hutang Pajak`.
      (Label yang dikirim server di `ref_type_label` berbeda: `Pelunasan Piutang (AR)`, `Pelunasan Hutang Honor (AP)`,
      `Pelunasan Hutang Pajak (AP)`, `Pembatalan Pelunasan Honor (AP)` — yang dirender UI adalah label frontend.)
    - `Nominal` = `Rp {e.total_debit}`.
    - `Status`: `✓ Balanced` (hijau) atau `✗ Tidak balance` (merah).
  - Select akun kas/bank pada mode Ubah: `— Pilih akun —` + opsi `{kode} — {nama}` (hanya COA `aktiva_lancar` aktif
    dengan kode 1101–1104).

- **Aksi yang bisa dilakukan:**

  | Tombol | HTTP | Endpoint | Bentuk |
  |---|---|---|---|
  | `Ubah` → `Simpan` | `PUT` | `/api/keuangan/settlement/settings` | JSON `{ default_bank_coa_id }` (dipanggil via `fetch` + `withLembaga`) |
  | `Rebuild Jurnal` | `POST` | `/api/keuangan/settlement/rebuild` | JSON `{ scope: "all" }` |
  | filter | `GET` | `/api/keuangan/settlement?ref_type=&q=&tanggal_dari=&tanggal_sampai=` | — |

  - `Rebuild Jurnal` meminta konfirmasi: `Rebuild jurnal settlement + jurnal akrual (pendapatan & beban) untuk seluruh data historis? (aman dijalankan berulang)`
    Setelah sukses, halaman di-*reload* penuh (`window.location.reload()`).
  - Pesan rebuild dari server: `Rebuild selesai. {created} jurnal baru dibuat, {skipped} dilewati (sudah ada).`
  - Pesan simpan pengaturan: `Pengaturan akun kas/bank default berhasil disimpan.`

- **Validasi & pesan error:**

  - Gagal simpan pengaturan (tanpa `message` dari server): `Gagal menyimpan.` (ditampilkan lewat `alert`).
  - Gagal rebuild: banner `Gagal: {err.message}`.
  - Rebuild tanpa `ref_type`+`ref_id` dan tanpa `scope` yang dikenal → 422 `Berikan ref_type + ref_id, atau scope=all.`
  - `PUT /settlement/settings` tanpa `default_bank_coa_id` → 422 `Kolom default bank coa id wajib diisi.` / `Kolom default bank coa id yang dipilih tidak valid.`
  - `GET /settlement/{id}` untuk jurnal tidak ada → 404 `Jurnal settlement tidak ditemukan.`

- **Peran & syarat akses:**

  - `GET /settlement`, `GET /settlement/settings`, `GET /settlement/{id}`, `GET /settlement/source-info` → `privilege:Ledger/Keuangan,Lihat`.
  - `POST /settlement/rebuild`, `POST /settlement/bank-masuk`, `POST /settlement/bank-keluar`, `POST /settlement/bank-keluar-pajak` → `Tambah`.
  - `PUT /settlement/settings` → `Ubah`.
  - Catatan: halaman ini **tidak** menyembunyikan tombol `Rebuild Jurnal` atau `Simpan` berdasarkan privilege di sisi peramban.
    Role yang hanya punya `Lihat` akan mendapat 403 (`Anda tidak memiliki hak akses untuk aksi ini.`) saat menekan `Rebuild Jurnal`
    atau `Simpan`.

- **Catatan penting:**

  - `GET /api/keuangan/settlement` **hanya** mengembalikan jurnal dengan `ref_type` ∈
    `settlement_piutang`, `settlement_ap_honor`, `settlement_ap_pajak`, `settlement_ap_honor_reversal`.
    **Jurnal akrual (`akrual_*`) tidak muncul di halaman ini** — keduanya hanya terlihat di menu Jurnal Umum.
  - Dropdown filter tipe di UI hanya offering 3 tipe; tipe `settlement_ap_honor_reversal` tetap muncul di tabel
    tapi tidak bisa difilter lewat dropdown (label-nya jatuh ke `e.ref_type` mentah karena tidak ada di `REF_TYPE_LABEL`).
  - Alur jurnal settlement dibuat **eksplisit**, bukan otomatis:
    - AR (piutang): tombol `Buat Jurnal Bank Masuk` di halaman Detail Piutang → `POST /api/keuangan/settlement/bank-masuk`.
    - AP honor: tombol `Buat Jurnal Bank Keluar` di Detail Pembayaran Honor & daftar Kas Keluar Honor →
      `POST /api/keuangan/settlement/bank-keluar`.
    - AP pajak: tombol `Buat Jurnal Bank Keluar` di Detail/List Hutang Pajak → `POST /api/keuangan/settlement/bank-keluar-pajak`.
  - Pesan server yang relevan (dari `SettlementJournalController`):
    - `Jurnal bank masuk hanya bisa dibuat untuk pembayaran yang sudah diterima.`
    - `Jurnal bank masuk gagal dibuat: {error}`
    - `Invoice tidak ditemukan.` / `Pembayaran tidak ditemukan.` / `Bukti pembayaran tidak ditemukan pada invoice ini.`
    - `Akun kas/bank atau piutang usaha belum tersedia. Set akun kas/bank default pada menu Pengaturan Settlement.`
    - `Akun kas/bank atau utang honor belum tersedia. Set akun kas/bank default pada menu Pengaturan Settlement.`
    - `Akun kas/bank atau utang PPh 21 belum tersedia. Set akun kas/bank default pada menu Pengaturan Settlement.`
  - Idempotensi: satu sumber = satu jurnal, dijamin unique index `jurnal_umum_ref_unique` pada `(ref_type, ref_id)`
    (migration `2026_10_26_160000_add_unique_ref_to_jurnal_umum.php`). Klik tombol berulang tidak menghasilkan dobel posting.
  - Akun kas/bank yang dipakai: `Lembaga.default_bank_coa_id` → fallback `1102` (Bank BCA) → fallback `1101` (Kas).
  - Command CLI setara: `php artisan settlement:rebuild --scope=all|ar|ap_honor|ap_pajak|akrual` (idempotent, ada opsi `--dry-run`).

  ---

## Ringkasan Laporan Keuangan

### 1. Bagaimana laporan keuangan tersusun di sistem ini?

Sistem **tidak** punya modul laporan keuangan tersendiri. Semua angka dihitung **langsung dari tabel jurnal**
(`jurnal_umum` + `jurnal_umum_detail`) oleh service yang sama — tidak ada tabel ringkasan/closing yang disimpan.

Sumber angka per laporan:

| Angka | Halaman sumber | Dihitung di |
|---|---|---|
| Pendapatan (periode) | **Dasbor Akuntansi** — kartu `Pendapatan Periode` | `AccountingService::dashboard()` — net kredit−debit akun jenis `pendapatan`/`pendapatan_lain` dalam periode |
| Beban (periode) | **Dasbor Akuntansi** — kartu `Beban Periode` | `AccountingService::dashboard()` — net debit−kredit akun jenis `beban`/`beban_lain` dalam periode |
| Laba / (Rugi) | **Dasbor Akuntansi** — kartu `Laba / (Rugi)` | `AccountingService::dashboard()` — `total_pendapatan − total_beban` (periode, bukan akumulasi tahunan) |
| Saldo Kas & Bank | **Dasbor Akuntansi** — kartu `Saldo Kas & Bank` | `AccountingService::dashboard()` → `saldoAkhir()` per akun kas/bank, kumulatif s.d. `tanggal_snapshot` |
| Saldo awal / mutasi / saldo akhir per akun | **Buku Besar** (+ modal `Detail`) | `AccountingService::bukuBesar()` & `bukuBesarDetail()` |
| Total debit / kredit periode | **Dasbor Akuntansi** — kartu `Total Debit / Kredit` | `AccountingService::dashboard()` |
| Jumlah jurnal periode | **Dasbor Akuntansi** — kartu `Jurnal Periode` | `AccountingService::dashboard()` — `JurnalUmum::whereBetween(tanggal)` |

**Halaman Neraca (balance sheet) TIDAK ADA.** Ditemukan negatively:
- `frontend/src/routes.js` tidak punya route laporan apa pun di grup `Akuntansi` (hanya 10 route: dashboard, 4 kas/bank,
  COA, kategori jurnal, jurnal umum, buku besar, settlement).
- `backend/routes/api.php` grup `Route::prefix('keuangan')` hanya memuat endpoint `accounting/*` dan `settlement/*`;
  tidak ada endpoint neraca/balance sheet/laporan laba-rugi terpisah.
- Pencarian `neraca`/`balance sheet` di `frontend/src` hanya menemukan konstanta pengelompokan jenis akun di `CoaList.jsx`
  (`NERACA - AKTIVA`, `NERACA - KEWAJIBAN & MODAL`) — itu label **grup di halaman COA**, bukan laporan.
- Yang tersedia sebagai proksi neraca hanyalah **Buku Besar**: saldo per akun dikelompokkan per jenis
  (`Aktiva Lancar`, `Kewajiban Lancar`, `Modal`, `Pendapatan`, `Beban`, dst.), jadi aktiva & kewajiban bisa
  dibaca dari saldo akhir tiap akun, tapi tidak ada halaman yang menjumlahkannya menjadi tabel aset vs liabilitas.
- Laporan laba rugi juga **tidak** ada sebagai halaman; hanya 4 KPI di Dasbor Akuntansi.

Konsekuensi praktis untuk penulis bab: tidak boleh menjanjikan "halaman laporan keuangan" / "halaman neraca".
Angka yang boleh dijanjikan: KPI Dasbor Akuntansi (pendapatan, beban, laba/rugi, saldo kas & bank, total debit/kredit)
dan tabel Buku Besar.

Catatan tambahan: `AccountingService` sengaja mengabaikan tabel `ledger_entries` (komentar di `bukuBesar()` masih menyebut
"LedgerEntry lama", tapi implementasi aktual hanya membaca `JurnalUmumDetail`). Semua angka akuntansi = jurnal.

### 2. Bagaimana jurnal akrual berbeda dari jurnal settlement?

Keduanya menulis ke tabel yang sama (`jurnal_umum` + `jurnal_umum_detail`) dan sama-sama dibuat oleh
`SettlementJournalService::createBalancedJurnal()` (dengan idempotensi `ref_type + ref_id` + unique index).
Yang membedakan: **kapan dibuat, kategori, nomor, dan akun yang dipakai.**

| Aspek | Jurnal **settlement** (`SettlementJournalService`) | Jurnal **akrual** (`AccrualJournalService`) |
|---|---|---|
| Makna | Perpindahan kas nyata (uang masuk/keluar rekening) | Pengakuan pendapatan & beban (tanpa perpindahan kas) |
| Kapan dibuat | AR: saat tombol `Buat Jurnal Bank Masuk` ditekan di Detail Piutang, atau saat rebuild. AP honor: saat tombol `Buat Jurnal Bank Keluar`. AP pajak: saat hutang pajak ditandai dibayar / tombol `Buat Jurnal Bank Keluar`. | Otomatis: saat **invoice terbit** (`recordPendapatanInvoice`), saat **honor terakru / Ledger Entry honor dibuat** (`recordBebanHonor`), dan jurnal **pembalik** saat invoice di-supersede karena PKS direvisi (`reversePendapatanInvoice`) |
| Kategori jurnal | `KategoriJurnal::JENIS_BKM` (AR) atau `JENIS_BKK` (AP honor & AP pajak) | `KategoriJurnal::JENIS_ADJUSTMENT` — "Adjustment / Koreksi" |
| Prefix nomor | `BKM/…` dan `BKK/…` | `JU/…` (akrual bukan perpindahan kas, jadi **dilarang** bernomor BKM/BKK) |
| `ref_type` | `settlement_piutang`, `settlement_ap_honor`, `settlement_ap_pajak`, `settlement_ap_honor_reversal` | `akrual_pendapatan_invoice`, `akrual_pendapatan_reversal`, `akrual_beban_honor` |
| Akun COA | Bank/Kas (akun kas/bank default lembaga, fallback 1102→1101) ↔ **1105 Piutang Usaha** (AR), **2107 Utang Honor** (AP honor), **2102 Utang PPh 21** (AP pajak) | **1105 Piutang Usaha** ↔ **4101 Pendapatan** (pendapatan); **5101/5102/5103 Beban Honor Surveior/Verifikator/Rekomendator** ↔ **2107 Utang Honor** (+ **2102 Utang PPh 21**, + **2104 Utang PPN** bila ada) (beban) |
| Pasangan debit/kredit | AR: Dr Bank / Cr Piutang. AP honor: Dr Utang Honor / Cr Bank. AP pajak: Dr Utang PPh 21 / Cr Bank. | Pendapatan: Dr Piutang Usaha / Cr Pendapatan. Beban: Dr Beban Honor (bruto) / Cr Utang Honor (bruto−PPh−PPN) / Cr Utang PPh 21 / Cr Utang PPN. Pembalik: Dr Pendapatan / Cr Piutang |
| Jumlah baris | 2 (satu kas + satu utang/piutang) | 2 (pendapatan) atau 2–4 (beban honor) |
| Tampil di halaman | **Jurnal Settlement AP/AR** (daftar settlement) | **Hanya Jurnal Umum** — halaman settlement memfilter `ref_type` settlement saja |
| Bisa dihapus manual | Tidak (`ref_type` terisi → `Jurnal berasal dari transaksi sistem. Tidak dapat dihapus.`) | Tidak (pembuatannya juga via `createBalancedJurnal`, `ref_type` terisi) |

Kunci perbedaan: jurnal settlement **mengganti** kas dengan piutang/utang; jurnal akrual **membentuk** saldo
piutang/utang/pendapatan/beban. Keduanya saling melengkapi — tanpa akrual, akun pendapatan & beban kosong sehingga
laba/rugi selalu nol (sesuai komentar di header `AccrualJournalService`).

Catatan: `AccrualJournalService` mencari COA dengan `getCoaByKode()` (cocok `lembaga_id`, fallback `lembaga_id` NULL),
dan untuk pendapatan punya fallback `firstCoaByJenis(Coa::JENIS_PENDAPATAN)`. Beban honor memakai kode 5101/5102/5103
sesuai `LedgerEntry::TIPE_AP_HONOR_*`, dengan fallback ke COA `beban` pertama milik lembaga. Bila COA tidak ditemukan,
jurnal **dilewati** (tidak dibuat) dan hanya dicatat di log `akrual.*.skipped` — jadi tidak ada error yang terlihat pengguna.
Perbaikan data lama: `Rebuild Jurnal` di halaman Jurnal Settlement (scope `all` sekaligus akrual) atau
`php artisan settlement:rebuild --scope=akrual`.

### 3. Apa perbedaan BKM, BKK, dan JU berdasarkan kode di kode?

Semua ketiganya adalah **jurnal umum** (tabel `jurnal_umum`), dibedakan oleh **jenis kategori** dan **prefix nomor**.
Definisi di `backend/app/Models/KategoriJurnal.php`:

- `JENIS_BKM = 'bkm'` — "Bukti Kas Masuk Bank"; `JENIS_BKK = 'bkk'` — "Bukti Kas Keluar Bank";
  `JENIS_KKM = 'kkm'` — "Kas Kecil Masuk"; `JENIS_KKK = 'kkk'` — "Kas Kecil Keluar";
  `JENIS_ADJUSTMENT = 'adjustment'`, `JENIS_PEMASUKAN = 'pemasukan'`, `JENIS_PENGELUARAN = 'pengeluaran'`.

Prefix nomor (`AccountingService::nomorPrefix()`):

```php
'bkm'         => 'BKM',
'bkk'         => 'BKK',
'kkm'         => 'KKM',
'kkk'         => 'KKK',
'pemasukan'   => 'JU-PM',
'pengeluaran' => 'JU-PK',
default       => 'JU',
```

Format nomor lengkap: `<PREFIX>/<YYYY>/<MM>/<4 digit urut>` — contoh `BKM/2026/11/0001`, `JU/2026/11/0007`.
(`SettlementJournalService::generateNomorJurnal()` memakai pemetaan sama kecuali tidak punya `JU-PM`/`JU-PK`;
default-nya `JU`, dipakai untuk jurnal akrual.)

Perbedaan mekanismenya:

| | **BKM** | **BKK** | **JU** (Jurnal Umum) |
|---|---|---|---|
| Arti | Bukti Kas Masuk **Bank** | Bukti Kas Keluar **Bank** | Jurnal umum manual / adjustmen / akrual |
| Kategori | `bkm` | `bkk` | `adjustment` (juga `pemasukan`/`pengeluaran` → `JU-PM`/`JU-PK`) |
| Prefix nomor | `BKM/` | `BKK/` | `JU/` |
| Halaman input | `/admin/accounting/bank-masuk` (menu `Bank Masuk`) | `/admin/accounting/bank-keluar` (menu `Bank Keluar`) | `/admin/accounting/jurnal` (menu `Jurnal Umum`) |
| Endpoint simpan | `POST /accounting/auto-jurnal` (`jenis=bkm`) | `POST /accounting/auto-jurnal` (`jenis=bkk`) | `POST /accounting/jurnal` |
| Bentuk body | `FormData` `details[]` + `akun_kas_bank` |idem | `FormData` `details[]` + `kategori_id` |
| Sisi kas/bank | kas **DEBIT**, counterpart KREDIT | kas **KREDIT**, counterpart DEBIT | ditentukan manual per baris |
| Jumlah baris | ≥ 1 baris rincian (dibatasi minimal 2 baris jurnal) | idem | ≥ 2 baris (kode: `Minimal 2 baris dengan akun dan nominal.`) |
| Pengламparan transaksi | tidak ada (jurnal manual) | tidak ada | tidak ada |
| Jumlah nominal | jumlah nominal rincian = sisi debit kas | jumlah nominal rincian = sisi kredit kas | total debit harus = total kredit |
| `ref_type` | `null` (bisa dihapus) | `null` (bisa dihapus) | `null` untuk manual; `akrual_*` untuk jurnal akrual (tidak bisa dihapus) |
| Nomor urut | terpusat per prefix | terpusat per prefix | terpusat per prefix |

Keterkaitan dengan settlement: jurnal settlement **juga** memakai kategori `bkm`/`bkk` (jadi nomornya juga berawalan
`BKM/`/`BKK/`), tetapi punya `ref_type` sehingga **tidak bisa dihapus** dari UI. Perbedaannya dengan BKM/BKK manual
adalah sumbernya: settlement dibuat dari bukti pembayaran / pembayaran honor / hutang pajak, bukan dari input manual.

Kesimpulan praktis: **BKM/BKK/KKM/KKK = jurnal kas** (perpindahan uang, satu akun kas/bank di satu sisi,
banyak akun counterpart di sisi lain). **JU = jurnal umum** (dua atau lebih akun bebas, harus seimbang, tanpa akun
kas/bank yang otomatis). BKM/BKK berasal dari mode kas/bank yang punya akun kas/bank terkunci; JU tidak punya.

### Catatan umum — aturan "gatekeeper" jurnal

Istilah *gatekeeper* (pengunci alur) dalam PRD dipakai untuk alur penugasan/validasi (`SuratTugasGatekeeper`),
bukan untuk modul akuntansi — tidak ada kelas gatekeeper di folder `app/Services/Keuangan/`. Yang berfungsi
sebagai pengiku hal yang harus lolos sebelum sebuah jurnal tersimpan adalah rangkaian validasi berikut:

1. **Privilege** — `EnsurePrivilege`: 401 `Tidak terautentikasi.`, 403 `Anda tidak memiliki hak akses untuk aksi ini.`
2. **Balansi** — total debit = total kredit, toleransi 2 desimal (`bccomp`). Frontend menandai `✓ Seimbang` / `✗ Tidak Seimbang`;
   gagal → `Total Debit harus sama dengan Total Kredit.` (frontend) / `Total debit (X) harus sama dengan total kredit (Y).` (server).
3. **Minimum baris** — minimal 2 baris: `Minimal 2 baris dengan akun dan nominal.` / `Minimal 2 baris jurnal.`
4. **Total tidak nol** — `Total transaksi tidak boleh nol.`
5. **Akun valid & aktif** — `Sebagian akun tidak ditemukan atau tidak aktif.` / `Sebagian akun di rincian tidak valid atau tidak aktif.`
6. **Akun kas/bank harus ada & aktif** (untuk mode kas/bank) — `Akun Kas/Bank tidak ditemukan atau tidak aktif.`
7. **Nominal positif** — `Total nominal harus lebih dari nol.`
8. **Idempotensi + unique index** untuk jurnal sistem — `existingJurnal(ref_type, ref_id)` + unique index
   `jurnal_umum_ref_unique` pada `(ref_type, ref_id)`. Jurnal settlement/akrual tidak bisa dihapus:
   `Jurnal berasal dari transaksi sistem. Tidak dapat dihapus.`
9. **Master akuntansi per lembaga** — COA & kategori jurnal ter-scope per lembaga; tanpa replikasi
   (`MasterAkuntansiService`) seluruh modul akuntansi kosong untuk lembaga tersebut.
