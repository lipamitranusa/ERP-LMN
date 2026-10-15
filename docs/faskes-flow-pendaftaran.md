# Alur UI Faskes — Pendaftaran & Validasi

> Domain: Modul Pendaftaran & Validasi Dokumen (PRD Bab 5.1, FR-1.1–1.5).
> Audiens: Staf Faskes non-teknis. Bahasa Indonesia, tanpa jargon sistem.
> Acuan visual: `docs/design-tokens.md` (slate cool, brand hijau, stepper signature).

---

## Prinsip Bahasa & Empty State

Sebelum layar dirancang, dua hal yang **non-negotiable**:

1. **Glosarium wajib** — istilah sistem diganti padanan Faskes:

   | Istilah sistem   | Padanan Faskes                           |
   |------------------|------------------------------------------|
   | Payload          | (jangan pernah muncul di UI)             |
   | Record           | (jangan pernah muncul di UI)             |
   | Berkas unggahan  | Dokumen                                  |
   | Endpoint         | (jangan pernah muncul)                   |
   | Validasi         | Pemeriksaan kelengkapan                  |
   | Revisi           | Perbaikan                                |
   | Status: Lengkap  | "Lengkap & tervalidasi"                  |
   | Status: Pending  | "Sedang diperiksa"                       |
   | Status: Revisi   | "Perlu perbaikan"                        |
   | Status: Draft    | "Belum dikirim"                          |
   | FR-1.x           | (tidak pernah muncul)                    |

2. **Setiap empty state = instruksi** (bukan layar kosong).
   Mis. "Belum ada dokumen yang diunggah. Unggah sekarang" + tombol
   "Pilih dokumen", bukan "No documents" atau "—".

---

## 1. Layar 1 — Form Permohonan Penilaian (FR-1.1)

**Route:** `/faskes/permohonan/baru` (atau `/faskes/pendaftaran` saat siklus pertama)
**Tujuan:** Faskes membuat permohonan, mengisi data dasar, menetapkan tanggal, memilih lembaga.

### 1.1 Struktur Layar

```
┌─────────────────────────────────────────────────────┐
│  Status Pengajuan › Buat Permohonan Baru            │  ← breadcrumb
├─────────────────────────────────────────────────────┤
│                                                     │
│  Buat Permohonan Penilaian                          │  ← H1 (20px, semibold)
│  Lengkapi data di bawah untuk memulai proses        │  ← subtitle (13px, slate-500)
│  akreditasi.                                        │
│                                                     │
│  ┌─ Data Faskes ────────────────────────────────┐  │
│  │  Nama fasilitas       [_______________] *    │  │
│  │  Jenis fasilitas      [Rumah Sakit  ▼]   *  │  │
│  │                       (RS / Puskesmas /      │  │
│  │                        Klinik / Lab)         │  │
│  │  Alamat               [_______________] *    │  │
│  │  Penanggung jawab     [_______________] *    │  │
│  │  Email                [_______________] *    │  │
│  │  Telepon              [_______________] *    │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌─ Data Permohonan ─────────────────────────────┐  │
│  │  Lembaga penyelengga  [LIPA MITRA NUSA  ▼] *  │  │
│  │                       (hanya 1 opsi di       │  │
│  │                        Fase 1)               │  │
│  │  Tanggal survei       [📅 12/10/2026  ▼] *  │  │
│  │  yang diharapkan                                │  │
│  │  Catatan tambahan     [textarea, 3 baris]      │  │
│  │  (opsional)            untuk Admin Lembaga     │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ℹ  Setelah dikirim, Anda akan diminta mengunggah   │  ← info card (slate-50)
│    dokumen pendukung.                               │
│                                                     │
│              [Batal]    [Kirim Permohonan →]         │  ← primary CTA
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 1.2 Empty & Loading States

- **State awal** (pertama kali buka): form kosong, semua field di atas placeholder abu.
  Field wajib ditandai `*` merah di samping label.
- **Loading saat simpan**: tombol primary jadi spinner + teks
  "Mengirim permohonan…", tombol disabled.
- **Error validasi**: tampil di bawah field, warna `#991B1B`, kalimat lengkap.
  Mis. "Email tidak valid. Contoh format: nama@faskes.go.id".
- **Sukses**: redirect ke `/faskes/dokumen` dengan toast di atas:
  "Permohonan berhasil dikirim. Sekarang unggah dokumen pendukung."

### 1.3 Catatan

- **DFO (Daftar Tilik Fasilitas)** bukan field form — DFO adalah
  dokumen yang diunggah di Layar 2. PRD FR-1.1 menyebut "mengisi
  DFO", tapi di UI yang dimaksud adalah proses melengkapi
  informasi via dokumen, bukan field-by-field form.
- **Field lembaga**: di Fase 1 hanya LIPA MITRA NUSA. Dropdown
  tetap ada untuk struktur, tapi hanya 1 opsi enabled.
- **Tanggal survei** bersifat "yang diharapkan", bukan pasti —
  ini niat user, diterjemahkan Admin Lembaga ke jadwal aktual.

---

## 2. Layar 2 — Unggah Dokumen (FR-1.2)

**Route:** `/faskes/dokumen`
**Tujuan:** Faskes mengunggah Surat Permohonan, Self Assessment, dan dokumen pendukung lain. Indikator kelengkapan per dokumen.

### 2.1 Struktur Layar

```
┌─────────────────────────────────────────────────────┐
│  Status Pengajuan › Unggah Dokumen                  │
├─────────────────────────────────────────────────────┤
│  Unggah Dokumen Pendukung                           │
│  Siapkan 5 dokumen di bawah. Anda bisa unggah satu  │
│  per satu — tidak perlu sekaligus.                  │
│                                                     │
│  ── Ringkasan Kelengkapan ─────────────────────     │
│  ████████████████████░░░░  2 dari 5 lengkap         │  ← progress bar
│                                                     │
│  ┌─ 1. Surat Permohonan Survei ────── WAJIB ────┐  │
│  │  Digunakan untuk mengajukan penilaian resmi.  │  │
│  │                                              │  │
│  │  [● Belum diunggah]                          │  │  ← status per dokumen
│  │  Format: PDF · Maks 10 MB                    │  │
│  │                                              │  │
│  │                              [Pilih Dokumen] │  │  ← CTA per baris
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌─ 2. Hasil Penilaian Mandiri ──── WAJIB ──────┐  │
│  │  Penilaian yang Anda lakukan sendiri…        │  │
│  │                                              │  │
│  │  [● Sedang diperiksa]                        │  │
│  │  Diunggah 02/10/2026 · v1                    │  │
│  │  [Lihat] [Ganti]                             │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌─ 3. DFO (Daftar Tilik Fasilitas) ─ WAJIB ────┐  │
│  │  [● Perlu perbaikan]   ⚠                     │  │  ← warning state
│  │  Versi 1 ditolak. Lihat catatan: 2           │  │
│  │  [Lihat Catatan] [Unggah Ulang]              │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌─ 4. SISDMK (Sistem SDM Kesehatan) ─ OPSIONAL ┐  │
│  │  [✓ Lengkap & tervalidasi]                   │  │
│  │  Diunggah 01/10/2026 · v1                    │  │
│  │  [Lihat]                                     │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌─ 5. ASPak (Alat Kesehatan) ────── OPSIONAL ──┐  │
│  │  [● Belum diunggah]                          │  │
│  │  [Pilih Dokumen]                             │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  [Lanjut ke Kontrak →]  (disabled sampai semua      │
│   dokumen WAJIB berstatus lengkap)                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 2.2 Status per Dokumen (4 state)

| State visual                | Label Indonesia              | Warna         | Ikon       |
|-----------------------------|------------------------------|---------------|------------|
| `belum diunggah`            | "Belum diunggah"             | slate-400     | Outline ◌  |
| `diunggah-belum-diperiksa`  | "Sedang diperiksa"           | slate-700     | Hourglass ⏳ |
| `perlu-perbaikan`           | "Perlu perbaikan"            | #92400E       | Warning ⚠  |
| `lengkap-tervalidasi`       | "Lengkap & tervalidasi"       | brand-700     | Check ✓    |

**WAJIB ada ikon** agar colour-blind aman. (Lihat `design-tokens.md`
§4.1 — StatusBadge.)

### 2.3 Empty State — Siklus Baru (Belum Ada Dokumen Apapun)

Jangan tampilkan "0 dari 5 lengkap" tanpa instruksi. Empty state:

```
┌──────────────────────────────────────────┐
│                                          │
│        📄  (icon dokumen besar)          │
│                                          │
│  Mulai dengan mengunggah Surat           │
│  Permohonan Survei.                      │
│                                          │
│  Dokumen ini yang pertama kali           │
│  diminta oleh LIPA MITRA NUSA.           │
│                                          │
│       [Pilih Dokumen Pertama]            │
│                                          │
│  💡 Anda bisa unggah sisanya nanti.      │
│                                          │
└──────────────────────────────────────────┘
```

### 2.4 Micro-interaction

- **Upload progress**: progress bar di dalam kartu dokumen saat
  file sedang diunggah (warna brand-500). Tidak full-page loading.
- **Sukses upload**: kartu animate ke state "Sedang diperiksa"
  (transisi 200ms). Toast kanan-atas: "Surat Permohonan berhasil
  diunggah. Admin akan memeriksa dalam 1–2 hari kerja."

---

## 3. Layar 3 — Status Validasi (FR-1.3, FR-1.4)

**Route:** `/faskes` (home) atau `/faskes/status`
**Tujuan:** Faskes melihat status keseluruhan dan catatan revisi dari Admin Lembaga (jangan disembunyikan).

### 3.1 Tampilan Tiga Status

#### 3.1.1 Status: "Menunggu Validasi"

```
┌─────────────────────────────────────────────────────┐
│  Selamat datang, RS Permata Medika                 │
│  Permohonan Anda sedang dalam proses pemeriksaan.  │
│                                                     │
│  ┌─ Tahapan Proses Anda ─────────────────────────┐ │
│  │  ●───●───●───○───○───○───○                     │ │  ← stepper mini
│  │  1   2   3   4   5   6   7                     │ │
│  │  PEN-  VAL  KTR  BYR  SRV  VRF  SEL           │ │
│  │              ▲                                 │ │  ← current
│  │  Anda di Tahap 3: Kontrak                      │ │
│  └────────────────────────────────────────────────┘ │
│                                                     │
│  ┌─ Status Dokumen ──────────────────────────────┐ │
│  │  ✓ Surat Permohonan      Lengkap & tervalidasi│ │
│  │  ✓ Self Assessment       Lengkap & tervalidasi│ │
│  │  ⏳ DFO                  Sedang diperiksa     │ │
│  │  ─ SISDMK                Belum diunggah       │ │
│  │  ─ ASPak                 Belum diunggah       │ │
│  └────────────────────────────────────────────────┘ │
│                                                     │
│  ℹ  Estimasi pemeriksaan: 1–2 hari kerja.          │
│     Kami akan memberi tahu jika ada yang perlu      │
│     diperbaiki.                                     │
│                                                     │
│  [Lihat Dokumen] [Kirim Pesan ke Admin]            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### 3.1.2 Status: "Perlu Perbaikan" (catatan revisi **WAJIB** tampil jelas)

**Ini poin penting brief: catatan revisi TIDAK BOLEH disembunyikan.**

```
┌─────────────────────────────────────────────────────┐
│  ⚠  2 Dokumen Perlu Perbaikan                       │  ← header merah
│  Mohon ditindaklanjuti dalam 7 hari kerja.          │
│                                                     │
│  ┌─ Catatan dari Admin Lembaga ─────────────────┐  │
│  │                                               │  │
│  │  📋 DFO — Versi 1 ditolak                     │  │  ← tiap catatan
│  │  Dikirim 05/10/2026 oleh Admin LIPI          │  │
│  │                                               │  │
│  │  "Pada Bagian 3.2 (tenaga medis), mohon       │  │
│  │   cantumkan jumlah per kategori, bukan        │  │
│  │   total saja. Lampirkan juga SK penugasan     │  │
│  │   untuk 2 dokter baru."                       │  │
│  │                                               │  │
│  │              [Lihat Dokumen Saya]             │  │
│  │              [Unggah Ulang DFO]               │  │  ← primary CTA
│  │                                               │  │
│  ├───────────────────────────────────────────────┤  │
│  │  📋 Self Assessment — Versi 1 perlu revisi    │  │
│  │  Dikirim 06/10/2026 oleh Admin NUR            │  │
│  │                                               │  │
│  │  "Standar 5 (Keselamatan Pasien) belum ada    │  │
│  │   bukti implementasi. Mohon tambahkan foto    │  │
│  │   atau notulen rapat."                        │  │
│  │                                               │  │
│  │              [Lihat Dokumen Saya]             │  │
│  │              [Unggah Ulang Self Assessment]   │  │
│  │                                               │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  Tahapan tidak akan berlanjut sampai semua          │
│  dokumen WAJIB berstatus lengkap.                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Detail penting:**

- Setiap catatan revisi tampil dengan:
  - Label dokumen yang terkait
  - Tanggal kirim
  - Nama Admin pengirim (bukan "Admin Lembaga" generik — biar
    Faskes tahu siapa yang harus ditanya via WhatsApp)
  - Isi catatan **dikutip utuh**, tidak di-summary
  - 2 CTA: "Lihat Dokumen Saya" (secondary) + "Unggah Ulang
    [nama dokumen]" (primary)
- **Empty state catatan**: kalau belum ada catatan, jangan
  tampilkan widget ini sama sekali (tidak "Belum ada catatan").
- **Push notification** (jika diizinkan browser): begitu Admin kirim
  catatan, Faskes dapat notif "DFO perlu perbaikan: 1 catatan baru".

#### 3.1.3 Status: "Lengkap & Tervalidasi"

```
┌─────────────────────────────────────────────────────┐
│  ✓  Semua Dokumen Lengkap & Tervalidasi             │  ← header hijau
│                                                     │
│  Dokumen Anda sudah lengkap dan telah diperiksa     │
│  oleh Admin Lembaga. Langkah selanjutnya:           │
│                                                     │
│      ┌────────────────────────────────┐             │
│      │  Menunggu draf PKS dari Admin  │             │
│      │  Estimasi: 1–2 hari kerja      │             │
│      └────────────────────────────────┘             │
│                                                     │
│  [Lihat Riwayat Dokumen]                            │
│                                                     │
│  ── Detail per Dokumen ──────────────────────      │
│  ✓ Surat Permohonan      v1 · Lengkap              │
│  ✓ Self Assessment       v1 · Lengkap              │
│  ✓ DFO                   v2 · Lengkap (revisi 1×)  │
│  ✓ SISDMK                v1 · Lengkap              │
│  ─ ASPak                 Belum diunggah (opsional) │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 4. Layar 4 — Riwayat Versi Dokumen (FR-1.5)

**Route:** `/faskes/dokumen/[jenis]/riwayat`
**Tujuan:** Faskes melihat semua versi dokumen yang pernah diunggah, dalam bentuk timeline (bukan tabel teknis).

### 4.1 Struktur Layar

```
┌─────────────────────────────────────────────────────┐
│  ← Kembali ke Dokumen                              │
│                                                     │
│  Riwayat: DFO (Daftar Tilik Fasilitas)              │
│  2 versi · Terakhir diubah 08/10/2026               │
│                                                     │
│  ┌─ Timeline ─────────────────────────────────────┐│
│  │                                                 ││
│  │  ●─ v2 (sekarang)  08/10/2026                   ││
│  │  │  Status: Sedang diperiksa                    ││
│  │  │  Diunggah oleh: Siti Aminah                  ││
│  │  │  [Lihat] [Unggah Ulang]                      ││
│  │  │                                              ││
│  │  │  ⤷ Alasan unggah ulang:                      ││
│  │  │    "Memperbaiki Bagian 3.2 sesuai catatan    ││
│  │  │     Admin LIPI (05/10/2026)"                 ││
│  │  │                                              ││
│  │  ●─ v1  01/10/2026                              ││
│  │  │  Status: Ditolak · oleh Admin LIPI           ││
│  │  │  Catatan: "Bagian 3.2 (tenaga medis)…"       ││
│  │  │  [Lihat] (read-only — versi lama)            ││
│  │                                                 ││
│  └─────────────────────────────────────────────────┘│
│                                                     │
│  [Unggah Versi Baru]                                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 4.2 Karakteristik

- **Format timeline vertikal**, bukan tabel. Lebih mudah dipahami
  non-teknis ("dulu upload v1, sekarang v2, ada jeda revisi").
- **Versi terbaru di atas** (bukan kronologis naik), karena yang
  paling relevan dengan kondisi sekarang.
- **Setiap versi** tampil: nomor versi, tanggal, status, nama
  pengunggah, CTA "Lihat".
- **Alasan revisi** disimpan Faskes saat mengunggah ulang — jadi
  ada narasi "kenapa diupload ulang", bukan sekadar log teknis.
- **v1 yang ditolak tetap bisa dilihat** (read-only) — agar Faskes
  tahu apa yang sudah dikirim sebelumnya.

### 4.3 Empty State (Dokumen yang Belum Pernah Direvisi)

```
┌──────────────────────────────────────────┐
│                                          │
│  DFO belum pernah diunggah.              │
│                                          │
│  [Unggah DFO Sekarang]                   │
│                                          │
│  💡 Dokumen ini wajib ada di permohonan. │
│                                          │
└──────────────────────────────────────────┘
```

---

## 5. Navigasi Antar-Layar

Alur Faskes dari login hingga dokumen lengkap:

```
Login (auth/login)
  │
  ▼ (redirect)
Status Pengajuan (/faskes) ────────┐
  │                                 │
  ├── belum ada siklus              │
  │     ▼ klik "Buat Permohonan"    │
  │   Form Permohonan (Layar 1)     │
  │     ▼ submit                    │
  │   Unggah Dokumen (Layar 2)      │
  │     ▼ unggah semua wajib        │
  │   Status Pengajuan (Layar 3)    │
  │                                 │
  ├── ada catatan revisi            │
  │     ▼ klik "Lihat Catatan"      │
  │   Layar 3.1.2 (Catatan)         │
  │     ▼ "Unggah Ulang"            │
  │   Layar 2 (kembali, fokus       │
  │           ke dokumen terkait)    │
  │                                 │
  ├── ada dokumen yang direvisi      │
  │     ▼ klik "Lihat Riwayat"      │
  │   Riwayat (Layar 4)             │
  │                                 │
  └── semua lengkap                 │
        ▼ otomatis lanjut           │
      Kontrak PKS (Layar lain —     │
                  di luar cakupan   │
                  FR-1.x ini)       │
```

---

## 6. Komponen yang Dipakai Berulang

| Komponen                  | Dipakai di layar                  |
|---------------------------|-----------------------------------|
| Siklus Stepper            | 3.1.1, 3.1.2, 3.1.3 (kompak)      |
| StatusBadge (icon-led)    | 2.1, 3.1.1, 3.1.2, 3.1.3          |
| DocumentCard (kartu/dok)  | 2.1                              |
| CatatanList               | 3.1.2                            |
| VersionTimeline           | 4.1                              |
| ProgressBar kelengkapan   | 2.1                              |
| EmptyStateWithAction      | 2.3, 4.3, dan state kosong lain   |
| ToastNotification         | Semua layar (sukses upload, dll)  |

---

## 7. Aksesibilitas (NFR-4)

- Setiap status **wajib punya ikon** (tidak hanya warna).
- Kontras teks minimum 4.5:1 (cek token warna di
  `design-tokens.md` §2.4).
- Fokus keyboard terlihat (focus ring brand-500 3px).
- Pesan error field terkait dengan `aria-describedby` — screen
  reader bisa membacakan kesalahan.
- Bahasa konsisten Indonesia, tidak ada istilah Inggris mendadak.
- Tombol "Lanjut ke Kontrak" disabled **harus** punya
  `aria-disabled="true"` dan `title` penjelas, bukan cuma visual.

---

## 8. Ringkasan FR Coverage

| FR      | Layar               | Status                                   |
|---------|---------------------|------------------------------------------|
| FR-1.1  | Layar 1             | ✓ Dirancang                              |
| FR-1.2  | Layar 2             | ✓ Dirancang                              |
| FR-1.3  | Layar 3.1.1–3.1.3   | ✓ Dirancang (semua state)                |
| FR-1.4  | Layar 3.1.2         | ✓ Dirancang (catatan **prominen**)        |
| FR-1.5  | Layar 4             | ✓ Dirancang (timeline, bukan tabel)      |

Semua FR-1.x tercakup dengan alur UI yang lengkap.
