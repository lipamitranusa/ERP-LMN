# Panduan Penulisan Manual ERP Akreditasi Faskes

> Dokumen kerja untuk penulis bab manual (pembuat dokumentasi).
> Bukan dokumen untuk pengguna akhir — tidak ikut dipublikasikan sebagai bab.

---

## 1. Genre dokumen

Manual **pengguna akhir**, bukan spesifikasi desain.

| Genre | Untuk siapa | Ciri |
|-------|-------------|-------|
| **Manual pengguna (yang ditulis)** | Staf Faskes, Admin Lembaga, Surveior, Keuangan | Berisi capture layar, penjelasan pakai, urutan langkah |
| Spesifikasi desain (`docs/faskes-flow-pendaftaran.md`, `docs/design-tokens.md`) | Tim devs | Diagram ASCII, token warna, struktur DOM |

**Dilarang** memakai diagram ASCII gaya file spesifikasi desain di
manual ini. Cukup prosa, daftar, dan tabel.

---

## 2. Bahasa & nada

- Bahasa Indonesia, dibaca orang non-teknis.
- Sapaan **"Anda"** untuk orang yang memakai aplikasi.
- Sebut peran dengan **nama peran asli**: Administrator, Admin Lembaga,
  Surveior, Verifikator, Rekomendator, Divisi SDM, Direktur/Keuangan, Faskes.
- Kalimat pendek. Hindari kata "payload", "endpoint", "record", "query",
  "state", "component", "route" (route boleh, tapi tulis juga
  "alamat halaman").
- Ikuti glosarium padanan di `docs/faskes-flow-pendaftaran.md` §Prinsip
  Bahasa: dokumen (bukan berkas), Pemeriksaan kelengkapan, Perbaikan
  (bukan revisi), "Lengkap & tervalidasi", "Belum dikirim".

---

## 3. Struktur bab

```markdown
# Bab N — <Judul>

> Modul: <...> · Peran: <...> · Rute: <...>

<p paragraf pembuka 1–3 kalimat: apa bab ini užcovers>

---

## N.1 <Nama Menu>

**Alamat:** `/path` · **Peran:** <Peran> · **Syarat akses:** <Modul> — <Aksi>

![<Nama Menu>](images/<grup>/<file>.png)

### Yang ditampilkan

- …

### Apa yang bisa dilakukan

- **Tombol/aksi** — efeknya apa.

### Catatan

- …
```

Aturan tambahan:

- Nomor heading dua digit (`## 3.1`, `## 3.2`) dan berurutan.
- Setiap layar **wajib** punya capture.
- Blok Peran memuat privilege dari `menu_actions` (lihat §5).
- Tulis "Alamat" (route) persis seperti di `frontend/src/routes.js`.
- Di akhir bab: bagian `## Layar terkait` dengan tautan markdown ke bab lain.

---

## 4. Menulis isi tiap layar

Sumber kebenaran, urut prioritas:

1. **Capture PNG** — apa yang benar-benar tampil.
2. **Berkas sumber** (`frontend/src/views/...`) — nama field, tombol,
   aksi, validasi, empty state yang tidak terlihat di capture.
3. **Kode** (`frontend/src/routes.js`, `backend/routes/api.php`) — privilege,
   endpoint, aturan gatekeeper.

Aturan:

- **Jangan mengarang.** Kalau perilaku sebuah tombol tidak bisa dipastikan
  dari sumber maupun capture, tulis
  `*(perilaku perlu konfirmasi ke tim devs)*` — jangan menebak.
- **Bedakan yang terlihat vs. yang ada di sistem.** Tulis "Yang ditampilkan"
  hanya untuk yang terlihat di capture. Tulis aksi/catatan dari sumber.
- **Kosong ≠ rusak.** Kalau capture menunjukkan empty state, jelaskan itu
  sebagai kondisi normal ("belum ada data"), bukan bug.
- Sebutkan pesan error persis seperti di sumber (huruf besar-kecilnya).
- Kalau ada tabel, sebutkan kolom-kolomnya.
- Tulis nama menu **persis** seperti di sidebar (mis. "Tagihan & Pembayaran"
  di portal Faskes, "Dasbor Piutang" di portal internal).

---

## 5. Peta peran → privilege

Dari `backend/database/seeders/RolePrivilegesSeeder.php` dan tabel
`menu_actions` di database dev.

| Peran | Modul privilege yang dimiliki |
|-------|-------------------------------|
| Administrator | Semua (58 izin) |
| Admin Lembaga | Pendaftaran & Validasi Dokumen (Lihat/Tambah/Ubah/Hapus/Setujui), Kontrak & Invoicing (Lihat/Tambah/Ubah/Setujui), Penugasan (Lihat/Tambah/Ubah/Final), Verifikasi (Lihat/Tambah), Dasbor Eksekutif (Lihat), SDM & Siklus Penugasan (Lihat), Pengaturan Hak Akses (Lihat/Tambah/Ubah/Hapus), Master Data (Lihat/Tambah/Ubah/Hapus) |
| Surveior | Penugasan (Lihat/Ubah/Ekspor) |
| Verifikator | Penugasan (Lihat/Tambah/Ubah/Final), Verifikasi (Lihat/Ubah/Final) |
| Rekomendator | Rekomendasi (Lihat/Ubah/Setujui) |
| Divisi SDM | Pendaftaran & Validasi Dokumen (Lihat), Penugasan (Lihat/Tambah/Ubah) |
| Direktur/Keuangan | Penugasan (Lihat/Setujui), Verifikasi (Lihat), Kontrak & Invoicing (Lihat/Setujui), Ledger/Keuangan (Lihat/Tambah/Ubah/Setujui/Ekspor), Dasbor Eksekutif (Lihat/Ekspor), Pengaturan Hak Akses (Lihat) |
| Faskes | Pendaftaran & Validasi Dokumen (Lihat/Tambah/Ubah), Kontrak & Invoicing (Lihat/Tambah/Ubah) |

Syarat akses tiap menu ada di `frontend/src/routes.js` pada field
`privilege: ["<Modul>", "<Aksi>"]`.

---

## 6. Peta grup capture → bab

| Grup gambar | Bab | Isi |
|---|---|---|
| `00-auth` | 01 | Login |
| `01-pendaftaran` | 01 | Portal Faskes (8 layar) |
| `02-operasional` | 02 | Operasional internal (7 layar) |
| `03-surveior` | 03 | Surveior & Verifikator (3 layar) |
| `04-rekomendasi` | 04 | Rekomendasi (2 layar) |
| `05-keuangan` | 05 | Keuangan (16 layar) |
| `06-akuntansi` | 06 | Akuntansi (10 layar) |
| `07-master-pengaturan` | 07 | Master Data (8 layar) |
| `08-pengaturan` | 08 | Pengaturan & Hak Akses (8 layar) |

Daftar lengkap file gambar + route + peran: `docs/manual/.capture-report.json`.

---

## 7. Daftar istilah siklus akreditasi

7 tahap (dari `backend/app/Models/SiklusAkreditasi.php`):

| Tahap | Nama | Arti |
|---|---|---|
| 1 | Pendaftaran | Faskes mengirim permohonan |
| 2 | Validasi | Admin memeriksa kelengkapan dokumen |
| 3 | Kontrak | PKS terbit, menunggu tanda tangan Faskes |
| 4 | Pembayaran | Invoice terbit dan Faskes membayar |
| 5 | Survei | Surat tugas terbit, Surveior bekerja di lokasi |
| 6 | Verifikasi | Verifikator & Rekomendator menilai |
| 7 | Selesai | Siklus tuntas dan invoice lunas |

Siklus dianggap tuntas bila `tahapan = 7` **dan** invoice berstatus lunas.
Kolom `status` pada siklus hanya menuliskan alur kontrak/pembayaran;
status "Selesai" di layar adalah turunan dari gabungan keduanya.

---

## 8. Lompat dari status siklus ke menu

| Tahap | Menu Faskes | Menu internal |
|---|---|---|
| 1 | Status Pengajuan → Ajukan Permohonan | Pendaftaran |
| 2 | Unggah Dokumen | Pendaftaran → Detail Pendaftaran |
| 3 | Kontrak & Tanda Tangan | Kontrak & Invoicing |
| 4 | Tagihan & Pembayaran | Verifikasi Pembayaran, Dasbor Piutang |
| 5 | (menunggu) | Penugasan, Penugasan Saya |
| 6 | (menunggu) | Rekomendasi, Rekonsiliasi |
| 7 | Histori Pengajuan | Dasbor Akuntansi, Buku Besar |
