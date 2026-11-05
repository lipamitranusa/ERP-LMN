# Manual ERP Akreditasi Faskes — LIPA MITRA NUSA

Panduan penggunaan Sistem ERP Akreditasi Faskes, dari pendaftaran Faskes
hingga pelaporan keuangan. Setiap menu dilampirkan tangkapan layar nyata
dari aplikasi.

> Versi: 1.0 · Terakhir diperbarui: 5 November 2026
> Untuk kebutuhan bisnis & spesifikasi, lihat [../prd.md](../prd.md).

---

## Cara membaca manual ini

Manual dibagi menjadi delapan bab yang mengikuti urutan kerja nyata di
lembaga, bukan urutan alfabet:
| Bab | Isi | Untuk siapa |
|-----|-----|-------------|
| [01 — Pendaftaran & Portal Faskes](01-pendaftaran.md) | Login, status pengajuan, unggah dokumen, kontrak, tagihan | Staf Faskes |
| [02 — Operasional Internal](02-operasional.md) | Validasi dokumen, kontrak & invoicing, verifikasi bayar, penugasan | Admin Lembaga, Divisi SDM |
| [03 — Surveior & Verifikator](03-surveior.md) | Penugasan saya, laporan kendala, laporan pengerjaan | Surveior, Verifikator |
| [04 — Rekomendasi](04-rekomendasi.md) | Workspace rekomendator, riwayat siklus | Rekomendator |
| [05 — Keuangan](05-keuangan.md) | Piutang, AP honor, pajak, rekonsiliasi | Direktur/Keuangan |
| [06 — Akuntansi & Laporan Keuangan](06-akuntansi.md) | COA, jurnal, buku besar, settlement | Direktur/Keuangan, Administrator |
| [07 — Master Data](07-master-data.md) | Lembaga, jenis faskes, faskes, tenaga ahli, biaya, akun, template | Administrator |
| [08 — Pengaturan & Hak Akses](08-pengaturan.md) | Payment gateway, mail, WhatsApp, role, privilege, audit | Administrator |

Ada pula **[00 — Alur Siklus Akreditasi](00-alur-siklus.md)** yang
menjelaskan tujuh tahap dari pendaftaran sampai tuntas, dan **[09 — Glosarium & Pertanyaan Umum](09-glosarium.md)**.

---

## Gatekeeper: yang perlu Anda tahu sebelum mulai

Sistem memakai *gatekeeper* — tiap tahap hanya bisa dibuka setelah
syarat sebelumnya terpenuhi. Ini bukan kendala, tapi cara sistem menjaga
proses tetap berurutan.

Tujuh tahap siklus:

1. **Pendaftaran** — Faskes mengirim permohonan
2. **Validasi** — Admin memeriksa kelengkapan dokumen
3. **Kontrak** — PKS terbit, menunggu tanda tangan Faskes
4. **Pembayaran** — Invoice terbit dan Faskes membayar
5. **Survei** — Surat tugas terbit, Surveior bekerja di lokasi
6. **Verifikasi** — Verifikator & Rekomendator menilai
7. **Selesai** — Siklus tuntas dan invoice lunas

Posisi Anda saat ini selalu terlihat di **Siklus Stepper** di bagian atas
halaman. Untuk penjelasan lengkap, lihat
[00 — Alur Siklus Akreditasi](00-alur-siklus.md).

---

## Peran pengguna

Menu yang Anda lihat bergantung pada peran akun Anda:

| Peran | Ruang lingkup utama |
|-------|----------------------|
| Administrator | Seluruh modul, termasuk Master Data & Pengaturan |
| Admin Lembaga | Validasi dokumen, kontrak, penugasan, master data |
| Surveior | Penugasan sendiri, laporan pengerjaan, kendala |
| Verifikator | Penugasan verifikasi, penilaian verifikasi |
| Rekomendator | Workspace rekomendasi, persetujuan rekomendasi |
| Divisi SDM | Pendaftaran, penugasan tenaga ahli |
| Direktur/Keuangan | Piutang, AP honor, pajak, akuntansi, laporan |
| Faskes | Portal Faskes: dokumen, kontrak, tagihan |

Matriks lengkap ada di [08 — Pengaturan & Hak Akses](08-pengaturan.md).

---

## Tangkapan layar

Seluruh gambar diambil dari aplikasi yang berjalan dengan data contoh,
dalam tema terang, ukuran 1440 × 900 piksel. Berkas gambar berada di
folder `images/` dan mengikuti penamaan:

```
images/<bab>/<urutan>-<nama-menu>.png
```

Contoh: `images/06-akuntansi/01-dasbor-akuntansi.png`

---

## Membuat ulang tangkapan layar

Berkas gambar dapat dibuat ulang dari sumber yang sama:

```sh
# Backend & frontend harus berjalan
cd backend && php artisan serve
cd frontend && npm run dev

# Dari root repo
node scripts/capture-docs.mjs            # semua layar
node scripts/capture-docs.mjs 06-akuntansi  # hanya satu bab
node scripts/capture-docs.mjs --list      # cetak daftar layar
```

Skrip memakai Chrome headless lewat Chrome DevTools Protocol — tidak
menambah dependensi npm.

Laporan hasil tangkapan layar (route, peran, heading, error konsol) ada di
`.capture-report.json`. Catatan faktual hasil analisis kode tiap bab ada di
`.notes/`, dipakai sebagai sumber kebenaran saat memperbarui bab.

---

## Memeriksa dokumen

Tiga skrip di `scripts/` menjaga agar bab-bab ini tetap konsisten:

```sh
node scripts/check-doc-structure.mjs docs/manual  # tiap layar punya capture + sub-bagian
node scripts/check-doc-links.mjs docs/manual       # tautan gambar & anchor antar-bab
node scripts/check-docs-clean.mjs docs/manual      # karakter/kata asing yang tersisip
```

---

## Dokumen lain di repo ini

| Dokumen | Isi |
|---------|-----|
| [../prd.md](../prd.md) | Product Requirements Document |
| [../faskes-flow-pendaftaran.md](../faskes-flow-pendaftaran.md) | Spesifikasi tampilan layar pendaftaran |
| [../permission-system.md](../permission-system.md) | Detail teknis kontrol akses |
| [../design-tokens.md](../design-tokens.md) | Token desain (warna, tipografi, komponen) |
| [../sitemap-per-role.md](../sitemap-per-role.md) | Definisi menu per peran |
| [../deployment-hostinger.md](../deployment-hostinger.md) | Panduan deployment |
