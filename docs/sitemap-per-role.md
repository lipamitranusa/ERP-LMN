# Sitemap per Role — ERP Akreditasi Faskes

> Dokumen ini mendefinisikan **menu navigasi per Role**.
> Privilege granular (per action) tidak ditulis di sini — itu domain
> `Role Privilege` matriks (FR-6.1). Sitemap hanya menjawab:
> **menu apa saja yang tampil** untuk sebuah Role, **layar mana
> yang jadi tujuan pertama** saat login, dan **di mana posisi
> pengguna dalam siklus akreditasi** pada konteks navigasi.

---

## Prinsip Umum

1. **Sidebar sama untuk semua Role internal** (slate-800). Privilege
   mengatur **menu yang terlihat** (FR-6.4), bukan struktur sidebar.
2. **Maks 5–7 item menu** per Role. Lebih dari itu = crowded, susah
   dipindai. Item ekstra digabung atau masuk sub-menu.
3. **Layar "home"** = layar dengan frekuensi penggunaan tertinggi
   per Role, **bukan** selalu Dashboard. Contoh: Surveior ke
   "Penugasan Saya", bukan Dashboard kosong.
4. **Posisi dalam siklus akreditasi** ditampilkan sebagai:
   - **Siklus Stepper** (prominen) di header halaman detail siklus.
   - **Step ringkas** (compact mode) di header halaman list
     (sebagai breadcrumb posisi).
5. **Faskes dipisah** dari internal (lihat `erp-akreditasi-design-system.md`
   — portal Faskes route `/faskes/*`, layout berbeda).

---

## 1. Faskes (route `/faskes/*`)

> Login sporadis, non-teknis, butuh kejelasan posisi siklus.
> Portal terpisah dari internal. Mobile-first.

### Menu (5 item)
| # | Menu              | Tujuan                                                                 | Route                  |
|---|-------------------|------------------------------------------------------------------------|------------------------|
| 1 | Status Pengajuan  | Stepper besar di atas, ringkasan tahap terkini                        | `/faskes`              |
| 2 | Dokumen Saya      | Upload DFO, SISDMK, ASPak, INM, IKP; lihat catatan revisi              | `/faskes/dokumen`      |
| 3 | Kontrak           | PKS untuk ditandatangani digital; histori kontrak                     | `/faskes/kontrak`      |
| 4 | Tagihan           | Daftar Invoice, upload bukti bayar, status lunas/cicilan              | `/faskes/tagihan`      |
| 5 | Profil            | Ubah data penanggung jawab Faskes, ganti password                     | `/faskes/profil`       |

### Home: Status Pengajuan (`/faskes`)

**Komposisi layar (mobile-first, single column):**

1. **Siklus Stepper** prominen di atas (7 tahap). Tahap aktif ditonjolkan
   dengan label besar di bawahnya, mis. "Anda berada di Tahap 3: Kontrak".
2. **Kartu aksi kontekstual** di bawah stepper:
   - Tahap 1 → "Lanjutkan upload dokumen"
   - Tahap 2 → "3 catatan revisi perlu ditindaklanjuti" (badge merah)
   - Tahap 3 → "Tanda tangani PKS"
   - Tahap 4 → "Bayar invoice sebelum 12 Oktober"
   - Tahap 5–7 → "Menunggu proses internal LIPA MITRA NUSA"
3. **Timeline ringkas** di bawah: "5 hari lalu: PKS disetujui"
4. **Kontak** di paling bawah: tombol WhatsApp + email Admin.

### Indikator posisi siklus

Stepper ** selalu tampil di header** halaman detail. Di halaman
list (Dokumen, Tagihan), stepper mini (compact) ditampilkan di
atas sebagai **penanda "Anda sedang di siklus RSPAD Gatot Soebroto,
Tahap 4"**.

---

## 2. Admin Lembaga (route `/admin/*`)

> Internal. Kerja harian dengan banyak siklus. Tanggung jawab
> utama: validasi dokumen, menunjuk surveior, kontrak, piutang.

### Menu (6 item)
| # | Menu                | Tujuan                                                                  | Route                     |
|---|---------------------|-------------------------------------------------------------------------|---------------------------|
| 1 | Dasbor              | Ringkasan antrian validasi, siklus baru, piutang yang perlu perhatian   | `/admin/dashboard`        |
| 2 | Validasi Dokumen    | Antrian siklus yang menunggu cek kelengkapan dokumen                    | `/admin/pendaftaran`      |
| 3 | Penugasan           | Pilih Surveior/Verifikator, terbitkan Surat Tugas                       | `/admin/penugasan`        |
| 4 | Kontrak & Invoicing | Buat draf PKS, terbitkan Invoice, monitor tanda tangan                 | `/admin/kontrak`          |
| 5 | Dasbor Piutang      | Status Invoice per Faskes; cicilan; reminder jatuh tempo                | `/admin/piutang`          |
| 6 | Pengaturan Hak Akses| Matriks Role × Menu Action (privilege)                                  | `/admin/privileges`       |

### Home: Dasbor (`/admin/dashboard`)

Bukan halaman dekoratif. Komposisi:

1. **Baris 1 — Antrian (3 stat card):**
   - "5 siklus menunggu validasi" (klik → Pendaftaran)
   - "3 siklus siap tunjuk Surveior" (klik → Penugasan)
   - "2 PKS menunggu tanda tangan" (klik → Kontrak)
2. **Baris 2 — Piutang (1 wide card):**
   - Ringkasan Invoice belum lunas, total nominal, Faskes dengan
     tunggakan > 30 hari (badge merah).
3. **Baris 3 — Tabel (2 kolom):**
   - Kiri: "Siklus Terbaru" (5 baris)
   - Kanan: "Penugasan Aktif" (5 baris)

### Indikator posisi siklus

- Halaman list (Pendaftaran, Penugasan, Kontrak): **kolom "Tahap"**
  di tabel — pill kecil (e.g. "Tahap 3 — Kontrak").
- Halaman detail siklus: **Siklus Stepper penuh** di header.

---

## 3. Surveior (route `/admin/*`)

> Internal. Login dari lapangan (mobile + desktop). Tanggung jawab
> utama: menerima & mengerjakan penugasan, mengirim laporan FA.

### Menu (4 item — sesuai brief)
| # | Menu               | Tujuan                                                                | Route                  |
|---|--------------------|-----------------------------------------------------------------------|------------------------|
| 1 | Penugasan Saya     | Daftar penugasan aktif & historis                                     | `/admin/penugasan`     |
| 2 | Form Laporan       | Workspace input FA berdasarkan DFO, upload lampiran                   | `/admin/laporan`       |
| 3 | Riwayat            | Laporan yang sudah dikirim, status verifikasi                        | `/admin/riwayat`       |
| 4 | Profil             | Nomor Induk Surveior (read-only), ganti password                     | `/admin/profil`        |

### Home: Penugasan Saya (`/admin/penugasan`)

Bukan Dashboard — surveior **butuh langsung tahu tugas yang harus
dikerjakan sekarang**.

Komposisi:

1. **Kartu aksi utama di atas (urgent action):**
   - Jika ada Surat Tugas baru → kartu hijau "Anda memiliki 1 Surat
     Tugas baru. Buka sekarang"
   - Jika ada kendala CoI/force majeure yang harus dilaporkan →
     kartu merah "Laporkan kendala"
2. **Stepper mini** di header: "Survei RSPAD — Tahap 5.2: Survei
   Dijadwalkan (20 Oktober)"
3. **Tabs:** "Aktif" (1–2) | "Selesai" | "Semua"
4. **Tabel penugasan** — kolom: No. Surat Tugas | Faskes | Sub-tahap
   | Deadline | Aksi

### Indikator posisi siklus

Stepper Surveior lebih spesifik: hanya tampil **Tahap 5 (Survei)
+ 4 sub-tahapannya** (sesuai signature element). Sub-tahap aktif
ditonjolkan dengan label besar.

---

## 4. Verifikator (route `/admin/*`)

> Internal. Kerja harian di workspace penilaian. Tanggung jawab
> utama: mencocokkan FA vs EP, memberikan nilai, finalisasi.

### Menu (4 item)
| # | Menu                  | Tujuan                                                              | Route                     |
|---|-----------------------|---------------------------------------------------------------------|---------------------------|
| 1 | Antrian Verifikasi    | Laporan FA yang menunggu dinilai                                    | `/admin/antrian`           |
| 2 | Workspace Verifikasi  | Side-by-side FA vs EP, scoring, komentar, tombol Final              | `/admin/verifikasi`        |
| 3 | Riwayat               | Laporan yang sudah difinalisasi                                     | `/admin/riwayat`           |
| 4 | Profil                | NIK, ganti password                                                 | `/admin/profil`            |

### Home: Antrian Verifikasi (`/admin/antrian`)

Komposisi:

1. **Stat card kecil di atas:** "3 laporan menunggu", "2 mendekati
   deadline", "1 sudah final minggu ini"
2. **Filter bar:** search Faskes / status / jenis survei
3. **Tabel antrian:** No | Faskes | Tgl Survei | Surveior | Tgl
   Masuk Antrian | Aksi (Buka)
4. **Bulk action:** jika multiple dipilih → "Tugaskan ke saya"

### Indikator posisi siklus

Stepper menampilkan **Tahap 5 + 6 (Verifikasi)**. Tahap 6 aktif
ditandai dengan border brand dan label "Tahap saat ini: Verifikasi".

---

## 5. Divisi SDM (route `/admin/*`)

> Internal. Owner data induk pegawai. Mengelola akun & siklus
> urutan penugasan. Tanggung jawab besar pada FR-3.6, FR-3.7.

### Menu (5 item)
| # | Menu                     | Tujuan                                                                | Route                          |
|---|--------------------------|-----------------------------------------------------------------------|--------------------------------|
| 1 | Dasbor                   | Aktivitas SDM terkini                                                 | `/admin/dashboard`             |
| 2 | Manajemen Tenaga Ahli    | Daftar Surveior/Verifikator, Nomor Induk, status aktif/cuti/resign    | `/admin/sdm/tenaga-ahli`       |
| 3 | Manajemen Akun & Role    | Buat Akun Pengguna, set Role, kustom Role                             | `/admin/sdm/akun`              |
| 4 | Siklus Penugasan         | Urutan rotasi penugasan Surveior per periode; sistem antrian          | `/admin/sdm/siklus-penugasan`   |
| 5 | Pengaturan Hak Akses     | Matriks Role × Menu Action                                            | `/admin/privileges`            |

### Home: Dasbor (`/admin/dashboard`)

Komposisi:

1. **Stat cards:** "47 Tenaga Ahli aktif" | "3 cuti bulan ini" |
   "12 akun menunggu aktivasi"
2. **Tabel "Permintaan Akun Baru"** (5 baris) — formulir dari Admin
   Lembaga yang perlu diproses
3. **Tabel "Perubahan Status Kepegawaian"** (5 baris) — audit
   perubahan cuti/resign minggu ini

### Indikator posisi siklus

Menu Divisi SDM **tidak langsung beroperasi pada satu siklus** —
mereka beroperasi pada **siklus urutan penugasan** (rotation
queue). Indikator yang relevan: **progress bar antrian Surveior**
di halaman Siklus Penugasan (bukan siklus akreditasi Faskes).

---

## 6. Direktur / Keuangan (route `/admin/*`)

> Internal. Top-level oversight + eksekusi keuangan. Tanggung jawab
> utama: dasbor eksekutif, ledger, pajak, bukti potong.

### Menu (6 item — sesuai brief)
| # | Menu                  | Tujuan                                                                | Route                          |
|---|-----------------------|-----------------------------------------------------------------------|--------------------------------|
| 1 | Dasbor Eksekutif      | KPI laba/rugi, rekonsiliasi per Faskes, ringkasan piutang & honor     | `/admin/dashboard`             |
| 2 | Ledger                | Semua entry jurnal: piutang Faskes, AP honor Surveior/Verifikator     | `/admin/ledger`                |
| 3 | Konfigurasi Pajak     | Tarif PPN, PPh 21 (master data)                                       | `/admin/konfigurasi-pajak`     |
| 4 | Bukti Potong          | Daftar bukti potong PPh 21 yang diterbitkan, status ekspor Coretax    | `/admin/bukti-potong`          |
| 5 | Ekspor Coretax        | Generate XML untuk upload ke Coretax                                  | `/admin/coretax`               |
| 6 | Pengaturan Hak Akses  | Matriks privilege                                                     | `/admin/privileges`            |

### Home: Dasbor Eksekutif (`/admin/dashboard`)

Komposisi (high-density, financial-grade):

1. **Baris 1 — KPI besar (4 stat cards):**
   - "Total Piutang: Rp 2,4 M" (dengan breakdown per Faskes > Rp 50jt)
   - "AP Honor Bulan Ini: Rp 187 jt"
   - "Siklus Aktif: 14"
   - "Lunas Bulan Ini: 6"
2. **Baris 2 — Grafik tren (2 kolom):**
   - Kiri: Piutang vs Penerimaan (line, 6 bulan)
   - Kanan: Komposisi honor Surveior vs Verifikator (stacked bar)
3. **Baris 3 — Tabel alert (1 wide):**
   - "Faskes dengan tunggakan > 30 hari" (sorted by amount)

### Indikator posisi siklus

Direktur/Keuangan **tidak beroperasi per siklus**, melainkan
**per portfolio**. Indikator yang relevan:
- Di halaman Ledger: filter "Per Faskes" menampilkan ringkasan
  posisi siklus Faskes tersebut (stepper mini).
- Di bukti potong: link "Lihat siklus asal" → stepper siklus Faskes.

---

## 7. Cross-Role Indicator Patterns

### 7.1 Stepper di Header Halaman Detail Siklus

Dipakai di halaman yang **satu siklus adalah konteks utama**:
- Faskes → semua halaman list
- Admin Lembaga → Pendaftaran, Penugasan, Kontrak
- Surveior → Form Laporan
- Verifikator → Workspace Verifikasi

Ukuran:
- md (36px) di desktop
- sm (28px) di mobile

### 7.2 Stepper Mini (Compact) di Header List

Dipakai di halaman list yang menampilkan banyak siklus berbeda.
Bentuk: row horizontal kecil dengan label tahap dipisah arrow.
Mis: "Pendaftaran › Validasi › Kontrak › **Pembayaran** › Survei › Verifikasi › Selesai"
Tahap aktif di-bold dan berwarna brand-500.

### 7.3 Kolom "Tahap" di Tabel

Dipakai di tabel antrian/list (Admin, Verifikator, SDM).
Bentuk: pill kecil dengan 2 token — warna + label.
Mis: `[Tahap 3]` pill biru, `[Tahap 5.2]` pill hijau.
Warna mengikuti semantic stepper state (completed=green,
active=green outlined, pending=slate, rejected=red).

### 7.4 Stepper Survei (Sub-tahapan) untuk Surveior

Khusus Surveior: **hanya tampil step 5 + 4 sub-tahap**, karena
itulah domain kerjanya. Tampil expanded dengan label besar di
mobile (agar surveior tahu "sekarang saya di mana").

---

## 8. Privilege → Menu Visibility

Berikut matriks **menu mana yang visible** untuk tiap Role.
Detail action (Lihat/Tambah/Ubah/...) diatur di `Role Privilege`
— di luar cakupan sitemap ini.

| Menu                          | Faskes | Admin | Surveior | Verifikator | SDM | Direktur |
|-------------------------------|:------:|:-----:|:--------:|:-----------:|:---:|:--------:|
| Dasbor (masing-masing)        |    ✓*  |   ✓   |    —     |      —      |  ✓  |    ✓     |
| Status Pengajuan              |    ✓   |   —   |    —     |      —      |  —  |    —     |
| Validasi Dokumen              |    —   |   ✓   |    —     |      —      |  —  |    —     |
| Dokumen Saya                  |    ✓   |   —   |    —     |      —      |  —  |    —     |
| Penugasan                     |    —   |   ✓   |    ✓     |      —      |  ✓  |    —     |
| Kontrak & Invoicing           |    ✓** |   ✓   |    —     |      —      |  —  |    —     |
| Tagihan                       |    ✓   |   —   |    —     |      —      |  —  |    —     |
| Dasbor Piutang                |    —   |   ✓   |    —     |      —      |  —  |    ✓     |
| Form Laporan                  |    —   |   —   |    ✓     |      —      |  —  |    —     |
| Antrian Verifikasi            |    —   |   —   |    —     |      ✓      |  —  |    —     |
| Workspace Verifikasi          |    —   |   —   |    —     |      ✓      |  —  |    —     |
| Riwayat                       |    —   |   —   |    ✓     |      ✓      |  —  |    —     |
| Manajemen Tenaga Ahli         |    —   |   —   |    —     |      —      |  ✓  |    —     |
| Manajemen Akun & Role         |    —   |   —   |    —     |      —      |  ✓  |    —     |
| Siklus Penugasan (rotasi)     |    —   |   —   |    —     |      —      |  ✓  |    —     |
| Dasbor Eksekutif              |    —   |   —   |    —     |      —      |  —  |    ✓     |
| Ledger                        |    —   |   —   |    —     |      —      |  —  |    ✓     |
| Konfigurasi Pajak             |    —   |   —   |    —     |      —      |  —  |    ✓     |
| Bukti Potong                  |    —   |   —   |    —     |      —      |  —  |    ✓     |
| Ekspor Coretax                |    —   |   —   |    —     |      —      |  —  |    ✓     |
| Pengaturan Hak Akses          |    —   |   ✓***|    —     |      —      |  ✓  |    ✓     |
| Profil (semua)                |    ✓   |   ✓   |    ✓     |      ✓      |  ✓  |    ✓     |

\* Faskes punya "Status Pengajuan" sebagai home, bukan Dasbor generik.
\** Faskes melihat "Kontrak" (read + sign) & "Tagihan" (read + bayar);
Admin Lembaga melihat versi internal (create + monitor).
\*** Admin Lembaga hanya bisa **melihat** matriks privilege, bukan mengubah.
Yang bisa mengubah: SDM + Direktur (FR-6.5 — "Setujui/Kelola Hak Akses").

---

## 9. Rute Awal Setelah Login

Setelah `localStorage` token valid, redirect ke:

| Role           | Default route setelah login | Alasan                                           |
|----------------|------------------------------|--------------------------------------------------|
| Faskes         | `/faskes`                    | Butuh langsung lihat posisi siklus               |
| Admin Lembaga  | `/admin/dashboard`           | Ringkasan antrian harian                         |
| Surveior       | `/admin/penugasan`           | Butuh langsung tahu tugas aktif (FR-3.7)         |
| Verifikator    | `/admin/antrian`             | Butuh langsung tahu laporan yang harus dinilai   |
| Divisi SDM     | `/admin/dashboard`           | Ringkasan aktivitas SDM                          |
| Direktur       | `/admin/dashboard`           | KPI & alert eksekutif                            |

---

## 10. Ringkasan Item Menu per Role

| Role           | Jumlah menu | Catatan                                       |
|----------------|-------------|-----------------------------------------------|
| Faskes         | 5           | Portal terpisah, mobile-first                 |
| Admin Lembaga  | 6           | Sidebar umum, privilege pilih item            |
| Surveior       | 4           | Fokus pada siklus penugasan sendiri           |
| Verifikator    | 4           | Fokus pada workspace verifikasi               |
| Divisi SDM     | 5           | Fokus pada master data & role                 |
| Direktur       | 6           | Fokus pada oversight & eksekusi keuangan      |

Semua di bawah atau sama dengan 7. Brief terpenuhi.
