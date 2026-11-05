# Bab 00 — Alur Siklus Akreditasi

> Modul: seluruh siklus · Peran: semua pengguna
> Rujukan: `backend/app/Models/SiklusAkreditasi.php`, `backend/app/Models/ChecklistValidasi.php`, `backend/app/Services/Penugasan/SuratTugasGatekeeper.php`

Bab ini memberi gambaran besar: bagaimana satu pengajuan berjalan dari
rumah sakit sampai menjadi keputusan akreditasi.

---

## 0.1 Tujuh tahap siklus

Setiap pengajuan akreditasi — pada sistem ini disebut **siklus** — berjalan
melewati tujuh tahap. Posisi siklus Anda selalu terlihat di **Siklus
Stepper**, deretan tujuh lingkaran bernomor di bagian atas halaman.

| # | Tahap | Apa yang terjadi di tahap ini |
|---|-------|------------------------------|
| 1 | **Pendaftaran** | Faskes mengirim permohonan dan mengunggah dokumen pendukung |
| 2 | **Validasi** | Admin Lembaga memeriksa kelengkapan dokumen |
| 3 | **Kontrak** | Draft PKS terbit, Faskes menandatangani secara digital |
| 4 | **Pembayaran** | Invoice terbit, Faskes membayar |
| 5 | **Survei** | Surat tugas terbit, Surveior dan Verifikator bekerja di lokasi |
| 6 | **Verifikasi** | Hasil survei diverifikasi, Rekomendator memberi rekomendasi |
| 7 | **Selesai** | Siklus tuntas dan seluruh tagihan lunas |

Tahap aktif ditandai penuh warna; tahap yang sudah dilewati ditandai
centang; tahap yang belum datang ditandai kosong. Ada empat sub-tahap di
dalam Tahap 5 (Survei):

1. Menunggu Surat Tugas
2. Survei Dijadwalkan
3. Survei Sedang Berlangsung
4. Laporan FA Dikirim

---

## 0.2 Dokumen yang wajib lengkap

Tahap 2 (Validasi) punya syaratnya sendiri. Ada tiga dokumen yang **wajib**
lengkap sebelum siklus boleh lanjut ke Tahap 3:

| Jenis dokumen | Nama di layar |
|---------------|---------------|
| `dfo` | Screenshot DFO |
| `surat_permohonan` | Surat Permohonan |
| `self_assessment` | Self Assessment |

Empat dokumen lain — **SISDMK**, **ASPAK**, **INM**, dan **IKP** — adalah
dokumen pendukung. Dokumen pendukung boleh dilengkapi menyusul tanpa
menghambat perpindahan tahap.

Status tiap dokumen bernilai salah satu dari:

| Nilai internal | Tampil sebagai |
|----------------|---------------|
| `belum` | Belum diunggah |
| `lengkap` | Lengkap & tervalidasi |
| `tidak_lengkap` | Perlu perbaikan |

---

## 0.3 Gatekeeper: apa yang mengunci apa

Sistem memakai *gatekeeper* — kunci yang mencegah sebuah langkah dijalankan
sebelum prasyaratnya terpenuhi. Ini bukan kendala, melainkan cara sistem
menjaga agar tidak ada tahap yang terlewat.

### Gatekeeper Surat Tugas

Surat Tugas (izin kerja Surveior di lokasi Faskes) **hanya** boleh terbit
bila:

1. Dokumen Faskes sudah tervalidasi lengkap (`status_kelengkapan` =
   `lengkap`)
2. PKS sudah disetujui Faskes (`pks.status` = `disetujui`)

Bila syarat belum terpenuhi, sistem menolak dengan pesan:

> Surat Tugas belum dapat diterbitkan: Dokumen Faskes belum tervalidasi lengkap (FR-1.3). PKS belum disetujui Faskes (status: <status>).

**Catatan penting:** penerbitan Surat Tugas **tidak** menunggu invoice
dibayar. Status pembayaran dipantau terpisah oleh tim Keuangan lewat
[Dasbor Piutang](05-keuangan.md#51-dasbor-piutang). Ini disengaja —
supaya survei tidak tertunda hanya karena masalah administrasi(tagihan.

### Gatekeeper lain

Beberapa langkah lain juga terkunci, misalnya pengajuan PKS baru tidak
bisa dibuat bila siklus belum melewati validasi, dan jurnal akuntansi
tertentu hanya boleh dibuat pada periode yang sesuai. Rincian tiap
gatekeeper disebutkan di bab modulnya.

---

## 0.4 Kapan siklus dianggap selesai

Siklus dianggap **tuntas** bila dua hal ini terpenuhi sekaligus:

1. `tahapan` = 7
2. Invoice siklus tersebut berstatus lunas

Kolom `status` pada siklus hanya mencatat alur kontrak dan pembayaran
(`aktif`, `lunas`, `selesai`, dan sejenisnya). Status "Selesai" yang Anda
lihat di layar adalah **turunan** dari gabungan kedua hal di atas — bukan
nilai yang disimpan terpisah. Karena itu, bisa saja pengajuan sudah
sampai Tahap 7 tetapi masih menunggu pelunasan tagihan.

Siklus yang sudah tuntas otomatis berpindah ke **Histori Pengajuan** di
portal Faskes, dan Faskes bebas mengajukan akreditasi baru.

---

## 0.5 Peta tahap ke menu

| Tahap | Yang dikerjakan Faskes | Yang dikerjakan internal |
|-------|------------------------|---------------------------|
| 1 — Pendaftaran | Mengisi formulir, mengunggah dokumen | — |
| 2 — Validasi | Menunggu, bila perlu memperbaiki dokumen | Validasi checklist,[Pendaftaran](02-operasional.md#22-pendaftaran) |
| 3 — Kontrak | Menandatangani PKS | [Kontrak & Invoicing](02-operasional.md#23-kontrak--invoicing) |
| 4 — Pembayaran | Membayar invoice | [Verifikasi Pembayaran](02-operasional.md#24-verifikasi-pembayaran), [Dasbor Piutang](05-keuangan.md#51-dasbor-piutang) |
| 5 — Survei | Menunggu hasil survei | [Penugasan](02-operasional.md#26-penugasan), [Penugasan Saya](03-surveior.md#31-penugasan-saya) |
| 6 — Verifikasi | Menunggu | [Rekomendasi](04-rekomendasi.md#41-rekomendasi) |
| 7 — Selesai | — | [Dasbor Akuntansi](06-akuntansi.md#61-dasbor-akuntansi), [Buku Besar](06-akuntansi.md#65-buku-besar) |

---

## 0.6 Alur dari sudut pandang Faskes

Ringkasan langkah yang dilakukan staf Faskes:

1. **Ajukan permohonan** — isi data faskes, pilih lembaga, tentukan tanggal
   survei yang diharapkan
2. **Unggah dokumen** — Surat Permohonan, Self Assessment, Screenshot DFO,
   lalu SISDMK/ASPAK/INM/IKP sebagai pendukung
3. **Tunggu validasi** — bila ada catatan "Perlu perbaikan", perbaiki dan
   unggah ulang
4. **Tandatangani PKS** — unduh draf, cetak bila perlu, lalu unggah hasil
   bertanda tangan
5. **Bayar invoice** — gunakan virtual account atau QRIS yang diberikan, atau
   unggah bukti transfer
6. **Tunggu hasil** — survei, verifikasi, dan rekomendasi dikerjakan tim
   internal
7. **Selesai** — pengajuan masuk ke Histori Pengajuan

Detail tiap langkah ada di [Bab 01 — Pendaftaran & Portal Faskes](01-pendaftaran.md).

---

## 0.7 Alur dari sudut pandang internal

Ringkasan langkah yang dilakukan tim LIPA MITRA NUSA:

1. **Validasi dokumen** — periksa checklist, tandai lengkap atau perlu
   perbaikan
2. **Buat PKS & invoice** — dari template PKS yang berlaku
3. **Verifikasi pembayaran** — cocokkan bukti bayar dengan invoice
4. **Terbitkan surat tugas** — pilih Surveior/Verifikator, jadwalkan survei
5. **Terima laporan pengerjaan** — Surveior mengirim laporan & kendala
6. **Verifikasi & rekomendasikan** — Verifikator menilai, Rekomendator
   menyetujui
7. **Catat keuangan** — jurnal akrual pendapatan & beban, pelunasan,
   pajak honor, buku besar

---

## Layar terkait

- [Bab 01 — Pendaftaran & Portal Faskes](01-pendaftaran.md)
- [Bab 02 — Operasional Internal](02-operasional.md)
- [Bab 03 — Surveior & Verifikator](03-surveior.md)
- [Bab 04 — Rekomendasi](04-rekomendasi.md)
- [Bab 05 — Keuangan](05-keuangan.md)
- [Bab 06 — Akuntansi & Laporan Keuangan](06-akuntansi.md)
