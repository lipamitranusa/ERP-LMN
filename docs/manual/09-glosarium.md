# Bab 09 — Glosarium & Pertanyaan Umum

> Modul: seluruh sistem · Peran: semua pengguna

Bab ini collects istilah yang muncul di seluruh manual, plus jawaban
pertanyaan yang paling sering muncul. Daftar menu lengkap ada di
[README](README.md); penjelasan tiap layar ada di babnya masing-masing.

---

## 9.1 Glosarium

### Istilah alur akreditasi

| Istilah | Arti |
|---------|------|
| **Siklus** | Satu pengajuan akreditasi utuh, dari Faskes mengajukan sampai siklus selesai |
| **Faskes** | Fasilitas Kesehatan — rumah sakit, klinik, atau puskesmas yang mengajukan akreditasi |
| **Lembaga** | Lembaga akreditasi yang menjalankan pengujian, dalam sistem ini LIPA MITRA NUSA |
| **Tahap** | Posisi siklus dalam alur tujuh tahap; ditampilkan sebagai **Siklus Stepper** |
| **Sub-tahap** | Posisi di dalam Tahap 5 (Survei): Menunggu Surat Tugas → Survei Dijadwalkan → Survei Sedang Berlangsung → Laporan FA Dikirim |
| **Gatekeeper** | Aturan pengunci: sebuah langkah hanya bisa dijalankan setelah prasyaratnya terpenuhi |
| **Surat Tugas** | Surat izin kerja Surveior/Verifikator di lokasi Faskes |
| **PKS** | Perjanjian Kerja Sama — dokumen kontrak antara Lembaga dan Faskes |
| **Invoice** | Tagihan resmi atas jasa akreditasi yang diterbitkan Lembaga |
| **Reksa** | Akun Rekomendator default milik satu lembaga; menjadi pihak yang menyetujui rekomendasi |

### Istilah dokumen

| Istilah | Arti |
|---------|------|
| **Surat Permohonan** | Dokumen wajib — surat resmi pengajuan dari Faskes |
| **Self Assessment** | Dokumen wajib — penilaian mandiri yang diisi Faskes |
| **Screenshot DFO** | Dokumen wajib — tangkapan layar dari sistem DFO (Document of Facility) |
| **SISDMK** | Dokumen pendukung — Sistem Informasi SDMKIN |
| **ASPAK** | Dokumen pendukung — Aplikasi Sarana dan Prasarana Kesehatan |
| **INM** | Dokumen pendukung — Instalasi Nutrisi dan Menu |
| **IKP** | Dokumen pendukung — IKP |
| **Dokumen wajib** | Tiga dokumen yang harus lengkap sebelum siklus boleh lanjut ke Tahap 3 |
| **Dokumen pendukung** | Dokumen yang boleh dilengkapi menyusul tanpa menghambat tahap |
| **Lengkap & tervalidasi** | Status dokumen yang sudah diperiksa dan dinyatakan cukup oleh Admin Lembaga |
| **Perlu perbaikan** | Status dokumen yang ditolak Admin dengan catatan perbaikan |
| **Belum dikirim** | Status dokumen yang belum pernah diunggah Faskes |

### Istilah penugasan & verifikasi

| Istilah | Arti |
|---------|------|
| **Penugasan** | Record penugasan tenaga ahli ke sebuah siklus |
| **Surveior** | Tenaga ahli yang melakukan survei di lokasi Faskes |
| **Verifikator** | Tenaga ahli yang memeriksa hasil survei |
| **Rekomendator** | Pejabat yang menyetujui atau menolak rekomendasi |
| **Laporan Pengerjaan** | Laporan yang dikirim Surveior beserta bukti berupa foto atau dokumen |
| **Laporan Kendala** | Laporan Conflict of Interest (CoI) atau Force Majeure yang dikirim Surveior |
| **CoI** | Conflict of Interest — konflik kepentingan yang membuat Surveior tidak boleh melakukan survei |
| **Force Majeure** | Keadaan memaksa yang membuat survei tidak dapat dilanjutkan |
| **Reksa** | Lihat tabel alur di atas |
| **Rekomendasi** | Putusan akhir atas hasil verifikasi: disetujui atau ditolak |

### Istilah keuangan & akuntansi

| Istilah | Arti |
|---------|------|
| **Piutang** | Tagihan yang sudah terbit tetapi belum dibayar Faskes |
| **AP Honor** | Accounts Payable honor — utang honor tenaga ahli yang belum dibayar |
| **Honor** | Imbalan kerja tenaga ahli (surveior, verifikator, rekomendator) atas satu siklus |
| **PPh 21** | Pajak Penghasilan atas honor, dipotong dari bruto |
| **Slip Honorarium** | Rincian perhitungan honor per tenaga ahli dalam satu periode |
| **Bukti Potong** | Dokumen bukti pemotongan PPh 21 yang wajib diunggah sebagai bukti resmi |
| **Hutang Pajak** | Kewajiban pajak yang harus disetor atas honor yang sudah dibayarkan |
| **Rekonsiliasi** | Pencocokan antara-AP honor, honor yang dibayar, dan pajak terpotong |
| **COA** | Chart of Accounts — daftar akun akuntansi (kode dan nama akun) |
| **Jurnal Umum** | Catatan transaksi akuntansi paling umum, berisi debit dan kredit |
| **Buku Besar** | Rekapitulasi saldo per akun hasil penjumlahan jurnal |
| **Akrual** | Pengakuan pendapatan atau beban pada saat accrue — saat invoice terbit atau honor terakru — bukan saat uang masuk atau keluar |
| **Settlement** | Jurnal yang memindahkan uang tunai — perpindahan kas |
| **Bank Masuk / Bank Keluar** | Jurnal kas masuk dan kas keluar lewat bank |
| **Kas Kecil Masuk / Keluar** | Jurnal kas melalui kas kecil (petty cash) |
| **Laba/Rugi** | Selisih antara total pendapatan dan total beban pada satu periode |

### Istilah sistem

| Istilah | Arti |
|---------|------|
| **Peran** | Posisi jabatan pengguna — menentukan menu mana yang terlihat |
| **Privilege** | Izin kombinasi modul dan aksi, misalnya `Penugasan` + `Lihat` |
| **Modul** | Kelompok menu, misalnya Penugasan, Kontrak & Invoicing, Ledger/Keuangan |
| **Aksi** | Operasi yang boleh dilakukan pada modul, misalnya Lihat, Tambah, Ubah, Hapus, Setujui, Final, Ekspor |
| **Menu Actions** | Daftar privilege yang dimiliki akun Anda; dikirim server saat login dan dipakai untuk menyembunyikan menu |
| **Audit Trail** | Catatan perubahan penting pada sistem, beserta siapa dan kapan |
| **Akun Pengguna** | Akun yang bisa masuk ke aplikasi |
| **Lembaga Aktif** | Lembaga yang sedang Anda kerjakan; pemisahan data antar lembaga |

---

## 9.2 Pertanyaan umum

### Umum

**Saya lupa kata sandi. Apa yang harus dilakukan?**
Gunakan menu **Ganti Password** yang tersedia di portal Surveior, portal Faskes,
dan **Profil Saya** untuk pengguna internal. Bila memang tidak bisa masuk,
minta Administrator mengatur ulang kata sandi Anda.

**Saya baru masuk dan langsung disallowed. Kenapa?**
Menu yang Anda buka mungkin tidak termasuk privilege akun Anda. Periksa
daftar menu Anda di sidebar — menu yang tidak Anda punya haknya tidak akan
tampil. Bila menu yang seharusnya ada tidak terlihat, minta Administrator
memperbarui privilege akun Anda di **Role & Hak Akses**.

**Kenapa jumlah menu saya sedikit dibanding colleague?**
Jumlah menu mengikuti peran. Admin Lembaga, Administrator, dan
Direktur/Keuangan punya cakupan paling luas; Surveior dan Faskes hanya
melihat menu yang memang dipakai untuk pekerjaan mereka.

**Saya bekerja untuk dua lembaga. Bagaimana data terpisah?**
Pindah lembaga melalui menu **Lembaga** di header. Setelah berpindah, seluruh
data yang tampil — daftar pengajuan, piutang, jurnal — hanya berasal dari
lembaga tersebut.

### Pendaftaran & validasi

**Dokumen saya sudah diunggah, tapi statusnya masih "Perlu perbaikan".**
Unggah file Replacing di layar **Unggah Dokumen**. Periksa juga catatan
perbaikan yang ditampilkan Admin — di situlah alasan dokumen ditolak.

**Surat Tugas belum bisa terbit. Apa masalahnya?**
Surat Tugas punya dua syarat: dokumen Faskes sudah tervalidasi lengkap,
dan PKS sudah disetujui Faskes. Pesan penolakan sistem menyebutkan mana
saja yang belum terpenuhi.

**Apakah Surat Tugas menunggu invoice dibayar?**
Tidak. Invoice dan Surat Tugas adalah dua jalur terpisah. Invoice dipantau
di **Dasbor Piutang**, sedangkan Surat Tugas hanya bergantung pada
kelengkapan dokumen dan persetujuan PKS.

**Kontrak sudah ditandatangani tapi invoice belum muncul. Kenapa?**
Invoice terbit otomatis setelah PKS berstatus selesai. Periksa status PKS
di **Kontrak & Invoicing** lebih dulu.

### Survei, verifikasi, rekomendasi

**Surveior menolak penugasan. Apakah otomatis ada pengganti?**
Tidak. Penolakan dicatat dan penugasan masuk antrean, tetapi penggantian
tenaga ahli harus dilakukan manual oleh Admin melalui menu **Penugasan**.

**Saya Surveior dan laporan sudah dikirim teammate saya. Apa yang harus saya lakukan?**
Anda cukup menekan **Tandai Selesai** — lampiran bukti tidak lagi wajib karena
sudah ada laporan dari teammate.

**Rekomendasi sudah disetujui. Kapan honor saya dibayar?**
Honor dicatat sebagai AP Honor setelah rekomendasi disetujui, dan dibayarkan
melalui menu **Bayar Honor**. Lihat **Dasbor AP Honor** untuk statusnya.

**Kenapa laporan verifikasi menampilkan "milik lembaga lain"?**
Akun Anda sedang berada di lembaga berbeda dengan pemilik laporan tersebut.
Pindah lembaga di header, atau minta admin menata ulang penugasan.

### Keuangan & akuntansi

**Kapan pendapatan dicatat di laporan keuangan?**
Saat invoice terbit — bukan saat uang masuk. Pendapatan diakui dengan
jurnal akrual; uang yang masuk dicatat terpisah pada jurnal Bank Masuk.

**Kapan beban honor dicatat?**
Saat honor terakru, yaitu ketika pekerjaan tenaga ahli disepakati
dalam rekomendasi yang disetujui — bukan saat honor dibayarkan.

**Bagaimana cara melihat laba/rugi periode tertentu?**
Buka **Dasbor Akuntansi**, lalu atur filter bulan dan tahun periode yang
ingin dilihat. Angka pada kartu Pendapatan, Beban, dan Laba/Rugi dihitung
dari jurnal pada periode itu.

**COA saya kosong. Apakah perlu saya buat sendiri?**
Ya. Akun akuntansi di-*master* per lembaga. Buat akun pada menu **Manajemen
Akun** sebelum mencatat jurnal — jurnal wajib mengacu pada akun yang ada di
COA.

**Bukti transfer Faskes saya sudah diunggah tapi belum diverifikasi.**
Verifikasi pembayaran dilakukan manual oleh tim Keuangan di menu
**Verifikasi Pembayaran**.

**PPh 21 saya potong dari honor. Di mana saya bisa mengunduh bukti potongnya?**
Menu **Bukti Potong PPh**. Berkas diunggah sebagai bukti resmi pemotongan
yang wajib dilaporkan ke pihak pajak.

---

## Layar terkait

- [00 — Alur Siklus Akreditasi](00-alur-siklus.md)
- [01 — Pendaftaran & Portal Faskes](01-pendaftaran.md)
- [02 — Operasional Internal](02-operasional.md)
- [03 — Surveior & Verifikator](03-surveior.md)
- [04 — Rekomendasi](04-rekomendasi.md)
- [05 — Keuangan](05-keuangan.md)
- [06 — Akuntansi & Laporan Keuangan](06-akuntansi.md)
- [07 — Master Data](07-master-data.md)
- [08 — Pengaturan & Hak Akses](08-pengaturan.md)
