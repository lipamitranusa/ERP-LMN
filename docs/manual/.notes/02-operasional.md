# Catatan faktual — Bab 02: Operasional Internal

Sumber: `frontend/src/views/admin/Dashboard.jsx`, `SiklusList.jsx`, `SiklusDetail.jsx`,
`KontrakInvoicing.jsx`, `VerifikasiPembayaran.jsx`, `HistoriPembayaran.jsx`, `PenugasanList.jsx`,
`frontend/src/components/SiklusStepper.jsx`, `frontend/src/components/StatusBadge.jsx`,
`frontend/src/components/InvoiceStatusCard.jsx`, `frontend/src/routes.js`,
`frontend/src/hooks/useApi.js`, `frontend/src/lib/api.js`, `frontend/src/utils/dateFormat.js`,
`backend/routes/api.php`,
`backend/app/Http/Controllers/Api/{DashboardController,SiklusAkreditasiController,DokumenPermohonanController,ChecklistValidasiController,PksController,InvoiceController,TagihanNotificationController,BuktiPembayaranController,PenugasanController,SuratTugasIssuanceController}.php`,
`backend/app/Services/Pks/{TemplateCompiler,PksPdfGenerator,PksDocxGenerator}.php`,
`backend/app/Services/Penugasan/SuratTugasGatekeeper.php`,
`backend/app/Services/Invoice/TagihanService.php`,
`backend/app/Models/{SiklusAkreditasi,ChecklistValidasi,Pks,Invoice,BuktiPembayaran,Penugasan}.php`.

Semua teks UI di bawah ditulis persis seperti di kode. Format tanggal memakai
`formatDate()` (`frontend/src/utils/dateFormat.js`) dengan keluaran `dd-mm-yyyy` (atau
`dd-mm-yyyy HH:mm` untuk datetime); nilai kosong ditampilkan sebagai "—".

Catatan umum yang berlaku untuk semua layar Bab 02:
- Semua request API memakai prefix `/api` (`frontend/src/lib/api.js`, `API_BASE = '/api'`).
- Klien `api()` menambah `?lembaga_id=` dari `localStorage.lembaga_id` bila ada; pemanggilan
  `fetch` langsung di luar `api()` memakai `withLembaga()` dari `lib/api.js`.
- Respons non-2xx dilempar sebagai `Error` berisi `body.message` (atau `body.error`, atau
  `HTTP <status>`), sehingga pesan server tampil apa adanya di UI.
- `useApi` memakai React Query v4; `isLoading` pada hasil `useApi` sebenarnya
  `query.isInitialLoading` (hanya true saat benar-benar fetching).

---

## Dashboard
- **Route:** `/admin/dashboard` (di `routes.js`: `path: "/dashboard"`, `layout: "/admin"`, `componentName: "Dashboard"`)
- **Kondisi/estate yang ditampilkan:**
  - Loading: kartu statistik menampilkan `<SkeletonStatCards />`; kedua tabel menampilkan 5 baris placeholder shimmer.
  - Terisi: 4 kartu statistik angka, tabel "Siklus Terbaru" (maks. 5 baris) dan "Penugasan Aktif" (maks. 10 baris dari server).
  - Kosong: tabel "Siklus Terbaru" → teks "Belum ada siklus"; tabel "Penugasan Aktif" → teks "Belum ada penugasan aktif".
  - Header: judul "Dashboard", teks "Selamat datang, {nama}" (nama dari `user.nama`, fallback bagian email sebelum "@", fallback "—"), dan badge berisi `user.role` (fallback "—").
  - Tombol "Lihat semua" di header "Siklus Terbaru" menuju `/admin/pendaftaran`; di header "Penugasan Aktif" menuju `/admin/penugasan`.
- **Komponen/field yang tampil:**
  - Kartu statistik (`StatCard`): "Total Siklus" (sub-label "Semua waktu"), "Aktif Sekarang" (sub-label "Sedang berlangsung"), "Terverifikasi" (sub-label "Selesai"), "Pending Review" (sub-label "Perlu perhatian").
  - Tabel "Siklus Terbaru" — kolom: "Faskes", "Status", "Tanggal" (kolom "Tanggal" disembunyikan di layar kecil, `hidden md:table-cell`).
  - Tabel "Penugasan Aktif" — kolom: "Faskes", "Jenis" (`hidden sm:table-cell`), "Tenaga Ahli" (`hidden lg:table-cell`), "Status".
  - Kolom "Jenis" pada tabel Penugasan Aktif menampilkan nilai mentah `jenis` ("survei"/"verifikasi") dalam badge bulat; tabel Penugasan di menu "Penugasan" memakai label "SURVEI"/"VERIFIKASI".
- **Aksi yang bisa dilakukan:**
  - Halaman hanya menampilkan data; tidak ada tombol mutasi.
  - Data diambil `GET /api/admin/dashboard`.
  - Klik baris tabel tidak punya aksi (baris bukan tombol); navigasi lewat tombol "Lihat semua" dan lewat badge status.
- **Validasi & pesan error:**
  - Tidak ada validasi form di layar ini.
  - Pesan server (jika `GET /api/admin/dashboard` gagal) muncul sebagai teks error dari `api()` (`body.message` / `body.error` / `HTTP <status>`).
- **Peran & syarat akses:**
  - `routes.js`: `privilege: ["Dasbor Eksekutif", "Lihat"]`.
  - Backend `GET /api/admin/dashboard` memakai middleware `auth:sanctum` + `lembaga` **tanpa** privilege per modul (baris 294–297 `backend/routes/api.php`).
- **Catatan penting:**
  - Response `GET /api/admin/dashboard` berisi `stats` (`total_siklus`, `aktif_sekarang`, `terverifikasi`, `pending_review`), `recent_siklus`, `penugasan_aktif`.
  - Angka statistik dihitung dari tabel `penugasan` (bukan dari siklus): `total_siklus` = `COUNT(DISTINCT siklus_id)`; `aktif_sekarang` = siklus dengan penugasan survei berstatus `sedang_bertugas`/`selesai` dan belum punya penugasan verifikasi selesai; `terverifikasi` = penugasan verifikasi berstatus `selesai`; `pending_review` = penugasan berstatus `menunggu`.
  - Cache server 60 detik, key per lembaga (`dashboard:stats:{lembaga_id}`).
  - `recent_siklus` menampilkan `statusTerlihat()` (turunan), bukan kolom `status` mentah.
  - `penugasan_aktif` hanya memuat penugasan jenis `survei` berstatus `sedang_bertugas`.

---

## Pendaftaran
- **Route:** `/admin/pendaftaran` (di `routes.js`: `path: "/pendaftaran"`, `layout: "/admin"`, `componentName: "SiklusList"`)
- **Kondisi/estate yang ditampilkan:**
  - Loading: 8 baris tabel dengan shimmer abu-abu.
  - Kosong: satu baris dengan teks "Tidak ada hasil untuk pencarian ini" bila ada kata kunci pencarian, atau "Belum ada pendaftaran" bila tidak.
  - Terisi: daftar siklus, satu baris per siklus.
  - Judul halaman: "Pendaftaran & Validasi Dokumen"; subjudul "{n} siklus terdaftar"; di kanan field pencarian: "{n} hasil".
- **Komponen/field yang tampil:**
  - Field pencarian: `placeholder="Cari faskes, lembaga, atau status..."` (ikon `Search`), `max-w-sm`.
  - Tabel — kolom: "No", "Faskes", "Lembaga", "Tanggal Pengajuan", "Kelengkapan", "Status", "Aksi".
  - "Kelengkapan" memakai `StatusBadge status={s.status_kelengkapan}`; "Status" memakai `StatusBadge status={s.status}`.
  - Label badge `StatusBadge` (peta di `frontend/src/components/StatusBadge.jsx`): "Lengkap", "Aktif", "Selesai", "Disetujui", "Final", "Berhasil", "Lunas" (success); "Menunggu", "Menunggu Dokumen", "Menunggu Tindakan", "Menunggu Persetujuan", "Menunggu Kontrak", "Menunggu Pembayaran", "Belum Bayar", "Sebagian", "Aktifasi Akun", "Warning" (warning); "Ditolak", "Dibatalkan", "Danger", "Gagal" (danger); "Terkirim", "Info", "Survei", "Verifikasi", "Refund" (info); "Draft", "Digantikan" (secondary). Status tak dikenal ditampilkan mentah sebagai label.
- **Aksi yang bisa dilakukan:**
  - Ketik di field pencarian → `GET /api/pendaftaran/siklus?q={kata kunci}` (pencarian dikirim setiap perubahan, tanpa tombol submit).
  - Tombol "Detail" per baris → navigasi ke `/admin/pendaftaran/{id}`.
- **Validasi & pesan error:**
  - Tidak ada validasi form.
  - `GET /api/pendaftaran/siklus` tidak punya aturan validasi query; `q` mencari `faskes.nama` ATAU `status` dengan LIKE.
  - Parameter lain yang didukung server: `faskes_id`, `status`, `status_kelengkapan`, `riwayat`, `aktif`, `per_page` (maks. 50, default 15).
  - Error server ditampilkan sebagai pesan `api()` di area error React Query (tidak ada komponen banner khusus di layar ini).
- **Peran & syarat akses:**
  - `routes.js`: `privilege: ["Pendaftaran & Validasi Dokumen", "Lihat"]`.
  - Backend `GET /api/pendaftaran/siklus` → middleware `privilege:Pendaftaran & Validasi Dokumen,Lihat` (baris 162–163 `backend/routes/api.php`).
- **Catatan penting:**
  - Kolom "No" adalah nomor urut baris di halaman (`i + 1`), bukan nomor siklus.
  - "Tanggal Pengajuan" memakai `formatDate(s.tanggal_pengajuan)`; server mengurutkan berdasarkan `tanggal_pengajuan` menurun.
  - Kolom "Lembaga" diisi dari `s.lembaga?.nama`; server otomatis membatasi data ke lembaga aktif dari session.

---

## Detail Pendaftaran
- **Route:** `/admin/pendaftaran/:id` (di `routes.js`: `path: "/pendaftaran/:id"`, `layout: "/admin"`, `componentName: "SiklusDetail"`, `hideInSidebar: true`)
- **Kondisi/estate yang ditampilkan:**
  - Loading: satu blok teks "Memuat data siklus..." (warna abu-abu, rata tengah).
  - Tidak ditemukan: teks "Data siklus tidak ditemukan".
  - Terisi: header, stepper tahapan, checklist validasi, riwayat dokumen (hanya bila ada dokumen), panel info pendaftaran, panel penanggung jawab (hanya bila ada `dfo_data`), panel catatan revisi.
  - Judul halaman: nama faskes (`siklus.faskes?.nama`, fallback `siklus.nama`, fallback "Detail Siklus").
  - Subjudul: badge status siklus (`StatusBadge`), badge kelengkapan, lalu teks jenis faskes dan alamat faskes bila tersedia.
- **Komponen/field yang tampil:**
  - Tombol "← Kembali ke Pendaftaran" (kiri atas) → navigasi `/admin/pendaftaran`.
  - Kartu "Tahapan Akreditasi" berisi komponen `SiklusStepper` (`frontend/src/components/SiklusStepper.jsx`).
  - Kartu "Checklist Validasi Dokumen" dengan tombol "Tandai Semua Lengkap" dan tabel kolom: "#", "Jenis Dokumen", "Versi", "Status", "Aksi".
    - Label jenis dokumen (peta `DOKUMEN_LABELS`): "Screenshot DFO" (dfo), "Surat Permohonan" (surat_permohonan), "Self Assessment" (self_assessment), "Sisdmk" (sisdmk), "ASPak" (aspak), "INM" (inm), "IKP" (ikp).
    - Dokumen wajib (dfo, surat_permohonan, self_assessment) diberi badge "Wajib" (kuning).
    - Kolom "Versi" menampilkan `v{versi}` atau "—"; baris menampilkan "Uploaded {tanggal}" bila ada.
    - Kolom "Status" menampilkan badge "lengkap", "ditolak", atau "menunggu".
    - Kolom "Aksi": tombol upload (ikon `Upload`, `title` "Upload"/"Upload ulang"), tombol lihat (ikon `Eye`, `title` "Lihat file", hanya bila dokumen ada), tombol centang (ikon `Check`, `title` "Tandai lengkap", hanya bila dokumen ada dan belum lengkap).
  - Kartu "Riwayat Dokumen" (hanya tampil bila `dokumen.length > 0`) — tabel kolom: "Jenis", "Versi", "Tanggal Upload", "Aksi" (tombol "Lihat").
  - Kartu "Info Pendaftaran" — baris label/value: "Nama Faskes", "Jenis Faskes", "Alamat", "Email", "Telepon", "Tanggal Permohonan", "Lembaga".
  - Kartu "Penanggung Jawab" (hanya tampil bila ada `dfo_data.nama_penganggung_jawab` / `jabatan` / `kontak`) — baris: "Nama", "Jabatan", "Kontak".
  - Kartu "Catatan Revisi" — daftar catatan (nama pembuat atau "System" + tanggal), atau teks "Belum ada catatan revisi" bila kosong; `Textarea` dengan `placeholder="Tulis catatan revisi..."`; tombol "Kirim Catatan" (menjadi "Mengirim..." saat proses).
  - Modal pratinjau dokumen (FilePreviewModal): judul = `jenis_dokumen` dalam huruf kapital, subjudul `{nama_file_asli} · {tanggal}`, tombol "Unduh" (membuka `/api/pendaftaran/dokumen/{id}/download`), tombol tutup (ikon `X`); area isi menampilkan "Memuat file...", pesan error, gambar untuk berkas gambar, `<embed>` untuk PDF, atau "Format file tidak didukung untuk preview".
- **Aksi yang bisa dilakukan:**
  - Upload dokumen: tombol upload membuka file picker (`accept=".pdf"`, `display:none`), lalu `POST /api/pendaftaran/siklus/{id}/dokumen` sebagai `FormData` dengan field `jenis_dokumen` dan `file`. Versi baru otomatis naik di server.
  - "Tandai Semua Lengkap": sebelum mengirim, frontend cek apakah 3 dokumen wajib sudah terunggah. Jika ada yang belum → `alert` "Dokumen wajib belum diunggah: {daftar label}. Unggah dulu sebelum menandai lengkap." dan request tidak dikirim. Jika lengkap → `PUT /api/pendaftaran/siklus/{id}/checklist` dengan body `{ items: [...] }`, satu item per dokumen yang sudah terunggah, semuanya `status_validasi: "lengkap"`. Setelah sukses: `alert("Validasi berhasil disimpan!")` dan query `siklus-detail` + `siklus-list` di-invalidate.
  - "Tandai lengkap" per dokumen: `PUT /api/pendaftaran/siklus/{id}/checklist` dengan satu item `status_validasi: "lengkap"`.
  - Lihat dokumen: `GET /api/pendaftaran/dokumen/{id}/serve` (dengan header `Authorization: Bearer`), hasilnya ditampilkan sebagai blob.
  - Unduh dokumen: tautan ke `/api/pendaftaran/dokumen/{id}/download` dibuka di tab baru.
  - Kirim catatan revisi: `POST /api/pendaftaran/siklus/{id}/catatan-revisi` dengan body `{ catatan }`; setelah sukses field dikosongkan.
- **Validasi & pesan error:**
  - Client: Zod `catatan` wajib diisi → pesan "Catatan wajib diisi" (merah, di bawah textarea). Tombol "Tolak"-like tidak ada di layar ini.
  - Client: pesan `alert` (bukan banner) untuk dokumen wajib belum lengkap dan untuk "Validasi berhasil disimpan!".
  - Client: gagal upload → `alert(err.message)` berisi pesan server.
  - Server `POST /api/pendaftaran/siklus/{siklus}/dokumen` (HTTP 422 bila gagal validasi): `jenis_dokumen` wajib dan harus salah satu dari `surat_permohonan, self_assessment, dfo, sisdmk, aspak, inm, ikp`; `file` wajib, tipe MIME harus salah satu dari PDF, JPEG, PNG, DOCX, XLSX, maks 10240 KB (10 MB); `alasan_revisi` opsional maks 1000 karakter.
  - Server `PUT /api/pendaftaran/siklus/{siklus}/checklist` (422): `items` wajib array min 1; `items.*.jenis_dokumen` wajib, harus salah satu dari 7 jenis; `items.*.status_validasi` wajib, harus salah satu dari `belum, lengkap, tidak_lengkap`; `items.*.catatan_admin` opsional maks 2000 karakter.
  - Pesan sukses server dari `PUT .../checklist`: "Dokumen wajib lengkap. Siklus tervalidasi dan bisa dilanjutkan ke Kontrak & Invoicing." atau "Checklist diperbarui. Dokumen wajib yang belum lengkap: {daftar}." (respons juga memuat `status_kelengkapan` dan `dokumen_wajib_belum_lengkap`).
  - Server `POST /api/pendaftaran/siklus/{siklus}/catatan-revisi` (422): `catatan` wajib, maks 5000 karakter.
  - Server `GET /api/pendaftaran/dokumen/{dokumen}/serve` bila file hilang → 404 "File tidak ditemukan.".
- **Peran & syarat akses:**
  - `routes.js`: `privilege: ["Pendaftaran & Validasi Dokumen", "Lihat"]`.
  - Backend: `GET /siklus/{siklus}` → `Lihat`; `POST /siklus/{siklus}/dokumen` → `Tambah`; `PUT /siklus/{siklus}/checklist` → `Ubah`; `POST /siklus/{siklus}/catatan-revisi` → `Tambah`; `GET /dokumen/{dokumen}/serve` dan `/download` → `Lihat` (semua di `backend/routes/api.php` baris 156–204, prefix `pendaftaran`, middleware `auth:sanctum` + `lembaga`).
- **Catatan penting:**
  - **Gatekeeper utama layar ini**: hanya 3 dokumen wajib (`dfo`, `surat_permohonan`, `self_assessment`) yang mengunci advance tahap; `sisdmk`, `aspak`, `inm`, `ikp` adalah dokumen pendukung dan boleh menyusul (`DOKUMEN_WAJIB` di `SiklusDetail.jsx`; `ChecklistValidasi::JENIS_WAJIB` di model).
  - Setelah checklist diperbarui, server menulis `status_kelengkapan` = "lengkap" (semua wajib lengkap) / "belum_lengkap" / "menunggu"; `tahapan` = 3 bila lengkap, 2 bila ada checklist, else tetap; `status` = "dokumen_lengkap" / "menunggu_validasi".
  - **Efek samping penting**: setiap kali ada catatan revisi dikirim, server me-reset `status_kelengkapan` → "belum_lengkap", `tahapan` → 1, `status` → "menunggu_dokumen" (`ChecklistValidasiController::kirimCatatan`). Jadi catatan revisi mengembalikan siklus ke tahap awal.
  - Upload dokumen lengkap untuk 3 dokumen wajib juga otomatis mengubah `status_kelengkapan` menjadi "lengkap" bila belum (`DokumenPermohonanController::store`).
  - Label "ditolak" pada kolom Status hanya muncul bila `status_validasi = tidak_lengkap`; dokumen yang belum diunggah atau belum divalidasi tampil "menunggu".
  - Frontend tidak pernah mengirim `status_validasi: "tidak_lengkap"` — hanya "lengkap". Menolak kelengkapan hanya dilakukan lewat catatan revisi.
  - Stepper memakai `tahapan`, `tahapan_status`/`status`, `sub_tahapan_survei`, flag `survei_selesai` dan `invoice_belum_lunas` dari server (`SiklusAkreditasiController::show`).

### Komponen pendukung: SiklusStepper
- 7 tahap berlabel: "Pendaftaran", "Validasi", "Kontrak", "Pembayaran", "Survei", "Verifikasi", "Selesai".
- 4 sub-tahap survei: "Menunggu Surat Tugas", "Survei Dijadwalkan", "Survei Sedang Berlangsung", "Laporan FA Dikirim".
- Panel "Tahapan-survei" (judul "Tahapan survei", latar abu-abu) berisi deretan 4 sub-tahap dengan penomoran 1–4; panel ini hanya tampil bila `tahapan === 5` atau `surveiDone`.
- Legenda di dalam panel tersebut: "Proses selesai" (hijau), "Menunggu proses" (segitiga kuning), "Ditolak" (merah).
- Status tahap: tahap 5 hijau bila `surveiDone`; tahap 7 hijau bila `tahapan >= 7` atau `stageStatus === "selesai"`; tahap 4 menampilkan segitiga peringatan kuning bila `tahapan >= 4` dan `invoiceBelumLunas` dan `surveiDone`; tahap dengan `stageStatus` "ditolak"/"dibatalkan" tampil merah dengan tanda silang.
- Label sub-tahap di bawah lingkaran tahap 5 hanya muncul bila tahap 5 sedang aktif (`tahapan === 5`) dan `subStage > 0`.

---

## Kontrak & Invoicing
- **Route:** `/admin/kontrak-invoicing` (di `routes.js`: `path: "/kontrak-invoicing"`, `layout: "/admin"`, `componentName: "KontrakInvoicing"`)
- **Kondisi/estate yang ditampilkan:**
  - Loading tabel: satu baris colspan 9 dengan teks "Memuat...".
  - Kosong: satu baris colspan 9 dengan teks "Tidak ada PKS ditemukan.".
  - Terisi: tabel PKS + 4 kartu statistik + paginasi (hanya bila `lastPage > 1`).
  - Judul: "Kontrak & Invoicing"; subjudul "Daftar Perjanjian Kerja Sama (PKS) dan invoice yang terkait."
  - Panel detail PKS (overlay): saat memuat menampilkan "Memuat detail PKS..."; bila PKS tidak ada/404 maka overlay tetap tampil dengan teks tersebut (kode tidak membedakan kondisi 404 dari loading).
  - Modal "Buat Draf PKS": saat memuat daftar siklus menampilkan "Memuat siklus eligible...".
  - Modal "Kirim PKS ke Faskes"; Modal "Kirim Tagihan ke Faskes" (saat memuat: "Memuat data tagihan..."); Modal "Preview Tagihan" (iframe dengan tombol "Cetak").
- **Komponen/field yang tampil:**
  - Kartu statistik: "Total PKS" (nilai dari `total` server), "Draf", "Menunggu Validasi", "Selesai". Tiga statistik terakhir dihitung dari baris halaman yang sedang tampil.
  - Filter: input pencarian `placeholder="Cari nomor PKS atau nama faskes..."` (tekan Enter → kembali ke halaman 1); select status dengan opsi "Semua Status" + label dari `STATUS_LABELS`: "Draf", "Menunggu Tanda Tangan Faskes", "Menunggu Validasi Admin", "Disetujui", "Selesai", "Ditolak", "Kedaluwarsa".
  - Tabel — kolom: "No", "Nomor PKS", "Faskes", "Lembaga", "Status", "Invoice", "Total Tagihan", "Tanggal", "Aksi".
    - "Invoice" menampilkan jumlah invoice dan, bila ada yang lunas, tambahan "({n} lunas)" dalam hijau.
    - "Total Tagihan" menampilkan total invoice; bila belum ada invoice tapi ada estimasi, menampilkan label kecil "Estimasi" di atas nominal; bila keduanya kosong → "—".
  - Panel Detail PKS:
    - Label "Detail PKS", nama faskes di bawahnya, badge status PKS, nama lembaga di kanan.
    - Kotak "Nomor PKS": nomor atau "—"; bila status `draft` ada tombol pensil (title "Edit") → field input + tombol "Simpan" (menjadi "..." saat proses) dan "Batal".
    - Kotak penandatangan (bila `nama_penandatangan` atau `signed_uploaded_at` ada): "Penandatangan: {nama} — {jabatan}", "NIK: {nik}" (bila ada), "Diupload: {tanggal}", dan "✓ Divalidasi: {tanggal}" bila `admin_validated_at` ada.
    - Blok biru "Estimasi Tagihan (dari master biaya)" dengan sub-teks "Invoice akan diterbitkan otomatis setelah PKS divalidasi" dan tabel rincian (nama biaya, satuan, jumlah) + baris "Total"; hanya tampil bila PKS belum punya invoice dan estimasi punya item.
    - Blok kuning (status `ditandatangani`): judul "PKS Ditandatangani — Perlu Validasi", teks "Faskes telah mengupload PKS yang sudah ditandatangani. Silakan verifikasi sebelum memvalidasi.", tombol "Preview", "Download", "Validasi & Setujui" (menjadi "Memvalidasi..." saat proses), "Tolak".
    - Panel penolakan (buka lewat "Tolak"): `Textarea` `placeholder="Alasan penolakan..."` (3 baris), tombol "Kirim Penolakan" (menjadi "Menolak..." saat proses) dan "Batal".
    - Blok hijau (status `selesai`): judul "PKS Selesai Divalidasi", teks "PKS sudah divalidasi. Invoice telah diterbitkan.", tombol "Preview" dan "Download".
    - Blok "Invoice": kartu `InvoiceStatusCard` (nomor invoice, badge status, baris "Total tagihan", "Sudah dibayar", "Sisa" bila ada, progress bar, teks "{n}% terbayar") + tabel "Rincian Biaya" (kolom "Komponen", "Satuan", "Jumlah", baris "Total") + tombol "Cetak Tagihan" dan "Kirim Tagihan".
    - Label satuan biaya (`SATUAN_LABEL`): "Tetap", "Per Siklus", "Per Sertifikat", "Per Tahun", "Per Periksa", "Sekali Bayar".
    - Badge status invoice (`InvoiceStatusCard`): "Lunas", "Sebagian", "Belum Bayar", "Jatuh Tempo", "Kedaluwarsa", "Refund".
  - Modal "Buat Draf PKS": judul "Buat Draf PKS", subjudul "Pilih siklus akreditasi yang akan dibuatkan PKS.", daftar pilihan siklus (nama faskes · jenis faskes · lembaga · tanggal pengajuan), label "Pilih Siklus", label "Nomor PKS (opsional)" dengan `placeholder="Contoh: PKS/LAM-KES/2026/0001"` dan teks "Jika dikosongkan, nomor PKS akan dibuat otomatis.", tombol "Batal" dan "Buat Draf PKS" (menjadi "Membuat..." saat proses).
  - Modal "Kirim PKS ke Faskes": dua pilihan — "Via Template PKS" ("Kirim menggunakan draf PKS yang sudah di-generate sistem dari template sebelumnya." / "Standar — cocok jika data faskes & lembaga sudah lengkap di sistem.") dan "Upload & Kirim" ("Upload file PKS yang sudah disiapkan (misalnya dari Word/PDF editor eksternal), lalu kirim ke faskes." / "Gunakan jika PKS diedit di luar sistem sebelum dikirim."). Pada mode upload ada area pilih file dengan teks "Klik pilih file PDF" dan keterangan "Format: PDF · Maks 10 MB", serta nama file + ukuran bila sudah dipilih. Tombol "Batal" dan "Kirim ke Faskes" (menjadi "Mengirim..." saat proses).
  - Modal "Kirim Tagihan ke Faskes": judul "Kirim Tagihan ke Faskes"; ringkasan "Invoice: {nomor}", "Total: {nominal}", "Jatuh Tempo: {tanggal}", "Faskes: {nama}", "Telepon: {nohp}", "Email: {email}"; label "Kirim via:" dengan tiga tombol "WhatsApp", "Email", "Keduanya"; tombol "Batal" dan "Kirim Tagihan" (menjadi "Mengirim..." saat proses).
  - Hasil pengiriman tagihan: judul "Berhasil!" / "Sebagian terkirim:" / "Gagal", daftar per kanal "WhatsApp → {tujuan} ✅ terkirim" atau "❌ {error}", lampiran ditampilkan sebagai "📎 {nama file}", dan baris peringatan `{warning}` bila ada.
- **Aksi yang bisa dilakukan:**
  - Pencarian & filter status → `GET /api/kontrak?page={n}&search={q}&status={status}`.
  - Klik baris tabel atau tombol "Detail" → membuka panel Detail PKS; panel diambil dari `GET /api/kontrak/{pksId}`.
  - Estimasi biaya (bila PKS belum punya invoice) → `GET /api/kontrak/{pksId}/estimasi-biaya`.
  - "Tambah PKS" → buka modal; daftar siklus dari `GET /api/kontrak/siklus-eligible`.
  - "Buat Draf PKS" → `POST /api/kontrak/siklus/{siklusId}/draf` dengan body `{}` atau `{ nomor_pks }` bila diisi. Setelah sukses modal ditutup dan daftar di-refresh (dan pindah ke halaman 1 bila sedang di halaman lain).
  - Edit Nomor PKS (hanya saat status `draft`) → `PATCH /api/kontrak/{pksId}/nomor-pks` dengan body `{ nomor_pks }`. Gagal → `alert(err.message)`.
  - "Kirim via Template PKS" / "Kirim dengan Lampiran" → `POST /api/kontrak/{pksId}/kirim` (FormData; field `lampiran_pdf` hanya pada mode upload). Setelah sukses modal ditutup dan file dilepas.
  - "Preview" / "Download" PKS bertanda tangan → `GET /api/kontrak/{pksId}/signed-pdf` (dengan header Authorization); Download menyimpan file bernama `PKS-Tertanda-{nomor_pks}.pdf`; Preview membuka tab baru.
  - "Validasi & Setujui" → `POST /api/kontrak/{pksId}/validate-signed` body `{}`.
  - "Tolak" → `POST /api/kontrak/{pksId}/tolak-signed` body `{ alasan }`. Tidak bisa dikirim bila alasan kosong (tombol nonaktif).
  - "Cetak Tagihan" → `GET /api/invoice/{invoiceId}/tagihan/preview`, hasilnya ditampilkan di iframe dengan tombol "Cetak" (memanggil `print()` pada iframe).
  - "Kirim Tagihan" → `GET /api/invoice/{invoiceId}/tagihan/generate` untuk data, lalu `POST /api/invoice/{invoiceId}/tagihan/send` body `{ channel }` dengan `channel` = "whatsapp" | "email" | "keduanya" (default "whatsapp").
  - Paginasi: "‹ Sebelumnya" dan "Selanjutnya ›"; teks "Menampilkan {n} dari {total} PKS" dan "{halaman} / {total halaman}".
- **Validasi & pesan error:**
  - Client upload lampiran PKS: file > 10 MB → pesan error "File terlalu besar. Maksimum 10 MB."; tipe bukan `application/pdf` → "Hanya file PDF yang diperbolehkan." (pesan ditampilkan di kotak merah pada panel/modal).
  - Client: tombol "Kirim ke Faskes" nonaktif bila mode upload dan belum ada file dipilih.
  - Server `POST /api/kontrak/siklus/{siklus}/draf`: 409 "PKS untuk siklus ini sudah ada."; 422 "Dokumen siklus belum tervalidasi lengkap. PKS belum dapat dibuat."; 422 validasi `nomor_pks` maks 50 karakter dan harus unik.
  - Server `PATCH /api/kontrak/{pks}/nomor-pks`: 422 `nomor_pks` wajib, teks, maks 50 karakter, unik.
  - Server `POST /api/kontrak/{pks}/kirim`: 422 "PKS sudah dikirim atau tidak dalam status draft."; 422 validasi `lampiran_pdf` (PDF, maks 10240 KB) dan `keterangan` (maks 500 karakter).
  - Server `POST /api/kontrak/{pks}/validate-signed`: 422 "PKS belum diupload atau sudah divalidasi."
  - Server `POST /api/kontrak/{pks}/tolak-signed`: 422 "PKS tidak dalam status menunggu validasi."; 422 validasi `alasan` wajib maks 500 karakter.
  - Server `GET /api/kontrak/{pks}`: 404 "PKS tidak ditemukan." bila beda lembaga.
  - Server `GET /api/kontrak/{pks}/signed-pdf`: 404 "File signed PDF tidak ditemukan."
  - Server `POST /api/invoice/{invoice}/tagihan/send`: selalu 200 dengan `message` "Tagihan berhasil dikirim." / "Sebagian tagihan terkirim." / "Gagal mengirim tagihan."; pesan per kanal di `data.results[]`: "Email faskes belum terdaftar.", "Nomor WhatsApp faskes belum terdaftar.", "Notifikasi WhatsApp dimatikan pada pengaturan Format Pesan.", "Notifikasi email dimatikan pada pengaturan Format Pesan."; peringatan email: "Lampiran PDF gagal dibuat, email dikirim tanpa lampiran."
  - Catatan kode: `TagihanNotificationController::send` hanya mengenali nilai channel `whatsapp`, `email`, atau `both`, sedangkan tombol "Keduanya" pada frontend mengirim literal `keduanya` — perilaku "Keduanya" perlu konfirmasi ke tim devs.
- **Peran & syarat akses:**
  - `routes.js`: `privilege: ["Kontrak & Invoicing", "Lihat"]`.
  - Backend: `GET /kontrak`, `GET /kontrak/siklus-eligible`, `GET /kontrak/{pks}`, `GET /kontrak/{pks}/estimasi-biaya` → `Lihat`; `POST /kontrak/siklus/{siklus}/draf` → `Tambah`; `PATCH /kontrak/{pks}/nomor-pks`, `POST /kontrak/{pks}/kirim`, `POST /kontrak/{pks}/validate-signed`, `POST /kontrak/{pks}/tolak-signed`, `POST /kontrak/{pks}/revisi`, `POST /kontrak/{pks}/batalkan` → `Ubah`; `POST /invoice/{invoice}/tagihan/send` → `Ubah`; `GET /invoice/{invoice}/tagihan/generate` dan `/preview` → `Lihat`.
- **Catatan penting:**
  - **Gatekeeper pembuatan PKS**: `POST /kontrak/siklus/{siklus}/draf` menolak dengan 422 bila `status_kelengkapan` siklus bukan "lengkap". Daftar siklus eligible (`GET /kontrak/siklus-eligible`) hanya memuat siklus dengan `status_kelengkapan = lengkap` (atau `status = verifikasi`) yang belum punya PKS, maksimum 50 data.
  - **Penerbitan invoice**: `POST /kontrak/{pks}/validate-signed` mengubah status PKS menjadi "selesai", `tahapan` siklus menjadi 4 dengan `status` "menunggu_pembayaran", dan menerbitkan invoice secara otomatis dalam satu transaksi.
  - Status PKS pada model: "draft", "dikirim", "ditandatangani", "disetujui", "ditolak", "expired"; tambahan status "selesai" dipakai setelah validasi admin dan "direvisi" setelah revisi.
  - Backend `PksController::validateSigned` menulis status "selesai", sedangkan `SuratTugasGatekeeper` mensyaratkan status PKS "disetujui" — perlu konfirmasi ke tim devs.
  - Revisi/batal PKS (endpoint ada, tombol tidak ada di layar ini): `POST /kontrak/{pks}/revisi` dan `POST /kontrak/{pks}/batalkan` (keduanya `Ubah`), pesan "PKS ditandai direvisi. Invoice terkait ditandai superseded. Buat PKS baru untuk siklus ini jika diperlukan."
  - Pabrik dokumen PKS (ringkas): `TemplateCompiler` mengganti placeholder `[NOMOR_PKS]`, `[NAMA_FASKES]`, `[NAMA_LEMBAGA]`, `[TANGGAL_PKS]`, `[NAMA_PENANDATANGAN]`, `[JABATAN_PENANDATANGAN]`, `[TANGGAL_PKS]`, `[JENIS_FASKES]`, `[KODE_FASKES]`, `[ALAMAT_FASKES]`, `[KOTA_FASKES]`, `[NO_SERTIFIKAT]`, `[NOMOR_SURAT_FASKES]`, `[ALAMAT_LEMBAGA]`, `[NAMA_PEJABAT_LEMBAGA]`, `[JABATAN_PEJABAT]`, `[TAHUN_SEKARANG]`, `[TAHUN_PKS]`, `[HARITANGGAL_SEKARANG]` menjadi ekspresi Blade lalu merender; `PksPdfGenerator` memakai template Blade fallback `pdf.pks`, `pdf.pks-pus-kawasaki`, `pdf.pks-klinik`, `pdf.pks-lab`, `pdf.pks-rs` (berdasarkan kode jenis faskes); `PksDocxGenerator` menghasilkan versi DOCX Times New Roman 11 dengan struktur 10 pasal dan varian puskesmas/klinik/lab/rs/generic (penyesuaian template dari DB tidak dipakai pada DOCX).
  - `TagihanService` (sumber data tunggal tagihan): label satuan "Tetap", "Per Siklus", "Per Sertifikat", "Per Tahun", "Per Periksa", "Sekali Bayar"; label status invoice "BELUM LUNAS", "SEBAGIAN LUNAS", "LUNAS", "EXPIRED", "REFUNDED"; metode bayar "Virtual Account", "QRIS", "Transfer Manual".

---

## Verifikasi Pembayaran
- **Route:** `/admin/verifikasi-pembayaran` (di `routes.js`: `path: "/verifikasi-pembayaran"`, `layout: "/admin"`, `componentName: "VerifikasiPembayaran"`)
- **Kondisi/estate yang ditampilkan:**
  - Loading: seluruh halaman menampilkan "Memuat..." (rata tengah).
  - Kosong: satu baris colspan 7 dengan teks "Tidak ada bukti yang menunggu verifikasi."
  - Terisi: tabel antrean bukti; baris yang melewati SLA diberi latar merah muda (`#FEF2F2`) dan kolom "SLA" menampilkan badge "Overdue".
  - Peringatan di atas tabel (hanya bila ada yang overdue): "{n} bukti melewati SLA 24 jam".
  - Judul: "Verifikasi Pembayaran Manual"; subjudul "Validasi bukti transfer yang diunggah Faskes. SLA maksimal 1x24 jam kerja (FR-2.6)."
  - Modal "Bukti Transfer": judul "Bukti Transfer", subjudul "{nomor invoice} • {nominal} • {nomor referensi}", tombol "Download" dan tombol tutup. Area isi: "Memuat bukti..." saat memuat, pesan error, pratinjau gambar / PDF dalam iframe, atau "Preview tidak tersedia untuk tipe file ini." + tombol "Download File" untuk tipe lain.
  - Modal "Verifikasi Bukti Transfer": kotak ringkasan "Faskes: {nama}", "Nominal: {nominal}", "Referensi: {referensi}", "Dari: {rekening}"; kotak peringatan kuning: "Setelah bukti **diterima**, penerimaan kas belum masuk buku besar. Buat jurnal Bank Masuk (Debit Bank / Kredit Piutang Usaha) dari halaman **Piutang → Detail Invoice**."; label "Alasan penolakan *" dengan `placeholder="Contoh: Nominal tidak sesuai dengan tagihan."`; teks "Alasan ini dikirim ke Faskes via WhatsApp/email agar mereka dapat mengunggah ulang bukti."; tombol "Batal", "Tolak", "Terima".
- **Komponen/field yang tampil:**
  - Tabel — kolom: "Submit", "Faskes", "Invoice", "Nominal", "Referensi", "SLA", "Aksi".
  - "Submit" dan "SLA" (untuk yang belum overdue) menampilkan waktu relatif: "{n} menit lalu", "{n} jam lalu", "{n} hari lalu" (atau "—" bila tanggal kosong).
  - Kolom "Aksi" berisi tiga tombol: ikon mata (title "Lihat bukti"), ikon unduh (title "Download bukti"), tombol teks "Verifikasi".
- **Aksi yang bisa dilakukan:**
  - Data antrean: `GET /api/bukti/antrian`.
  - Tombol ikon mata → modal pratinjau; file diambil `GET /api/bukti/{buktiId}/view` (header Authorization).
  - Tombol ikon unduh → `GET /api/bukti/{buktiId}/download?token={token}`.
  - Tombol "Verifikasi" → membuka modal verifikasi.
  - "Terima" → `POST /api/bukti/{buktiId}/verifikasi` body `{ status: "diterima", alasan_penolakan: null }`.
  - "Tolak" → `POST /api/bukti/{buktiId}/verifikasi` body `{ status: "ditolak", alasan_penolakan: {alasan} }`. Tombol "Tolak" adalah submit form sehingga validasi Zod dijalankan.
  - Setelah sukses, modal ditutup dan query `verifikasi-pembayaran` di-invalidate.
- **Validasi & pesan error:**
  - Client: Zod `alasan` wajib diisi (trim) → pesan "Alasan penolakan wajib diisi." (merah, di bawah textarea).
  - Server `POST /api/bukti/{bukti}/verifikasi` (422): `status` wajib, harus "diterima" atau "ditolak"; `alasan_penolakan` wajib bila status "ditolak" (maks 1000 karakter). Pesan Laravel (bahasa Indonesia, `backend/lang/id/validation.php`): "Kolom alasan penolakan wajib diisi ketika status bernilai ditolak." dan "Kolom status wajib diisi."
  - Server: 422 "Bukti sudah diverifikasi (status: {status})." bila bukti bukan berstatus "menunggu".
  - Server: 404 "Bukti pembayaran tidak ditemukan." (bukti beda lembaga), "Bukti tidak memiliki file." (view/download), "Invoice tidak ditemukan."
  - Respons sukses memuat `data` (bukti terverifikasi) dan `invoice_status` (status invoice hasil hitung ulang).
- **Peran & syarat akses:**
  - `routes.js`: `privilege: ["Kontrak & Invoicing", "Lihat"]`.
  - Backend: `GET /bukti/antrian`, `GET /bukti/histori`, `GET /bukti/{bukti}`, `GET /bukti/{bukti}/view`, `GET /bukti/{bukti}/download` → `Lihat`; `POST /bukti/{bukti}/verifikasi` → **`Setujui`** (bukan "Ubah"). Prefix `bukti` memakai middleware `auth:sanctum` + `lembaga`.
- **Catatan penting:**
  - SLA 24 jam dihitung server (`BuktiPembayaran::isOverdue(24)`) dari `tanggal_submit`; antrean diurutkan overdue lebih dulu.
  - **Menolak bukti** mengirim notifikasi ke Faskes via WhatsApp dengan fallback email, subjek "Bukti transfer ditolak", isi memuat nama faskes, nomor invoice, dan alasan penolakan.
  - **Menerima bukti tidak membuat jurnal buku besar.** Debit Bank adalah aksi eksplisit tim Keuangan lewat tombol "Buat Jurnal Bank Masuk" di halaman Detail Piutang. Bukti yang ditolak tidak boleh menghasilkan penerimaan kas.
  - Bila setelah verifikasi status invoice menjadi "lunas", sistem mengirim notifikasi ke Faskes subjek "Invoice {nomor} telah LUNAS".
  - Status invoice dihitung ulang otomatis (`calculator->recalculate`) setiap verifikasi.

---

## Histori Pembayaran
- **Route:** `/admin/histori-pembayaran` (di `routes.js`: `path: "/histori-pembayaran"`, `layout: "/admin"`, `componentName: "HistoriPembayaran"`)
- **Kondisi/estate yang ditampilkan:**
  - Loading: satu baris colspan 8 dengan teks "Memuat histori pembayaran...".
  - Kosong: satu baris colspan 8 dengan teks "Tidak ada pembayaran yang cocok dengan filter." bila ada filter aktif, atau "Belum ada pembayaran yang tercatat." bila tidak ada filter.
  - Error: banner merah "Gagal memuat histori pembayaran: {pesan}" (pesan server atau "terjadi kesalahan").
  - Terisi: tabel bukti + 3 kartu KPI + paginasi (bila `pagination.total > 0`).
  - Judul: "Histori Pembayaran Faskes"; subjudul "Seluruh bukti transfer yang dikirim Faskes, status verifikasinya, dan jejak jurnal buku besar".
- **Komponen/field yang tampil:**
  - Kartu KPI: "Diterima" (hijau), "Menunggu Verifikasi" (kuning), "Ditolak" (merah) — masing-masing menampilkan total rupiah dan "{n} transaksi".
  - Panel filter: input pencarian `placeholder="Cari Faskes, nomor invoice, nomor referensi, rekening, atau alasan penolakan..."` (disubmit dengan Enter atau tombol "Cari"); select "Semua status" / "Menunggu" / "Diterima" / "Ditolak"; select "Semua metode" / "Virtual Account" / "QRIS" / "Transfer Manual"; dua input tanggal (`aria-label` "Dari tanggal" dan "Sampai tanggal") dengan pemisah teks "s/d"; tombol "Cari" dan tombol "Reset" (hanya muncul bila ada filter aktif).
  - Tabel — kolom: "Tanggal", "Faskes", "Invoice", "Referensi", "Nominal", "Metode", "Status", "Jurnal Bank Masuk".
    - "Tanggal" menampilkan tanggal submit dan, bila ada, baris kedua "verifikasi {tanggal}".
    - "Faskes" menampilkan nama dan tipe faskes.
    - "Invoice" berupa tombol nomor invoice (mono, biru) → navigasi `/admin/piutang/{invoiceId}`.
    - "Referensi" menampilkan nomor referensi dan rekening asal.
    - "Metode" menampilkan label metode; bila `sumber = gateway` ditambahkan teks "(gateway)".
    - "Status" memakai badge: "Menunggu", "Diterima", "Ditolak".
    - "Jurnal Bank Masuk" menampilkan nomor jurnal (hijau) bila sudah dijurnal, "Belum dijurnal" (amber) bila status "diterima" tapi belum ada jurnal, atau "—".
    - Baris tambahan (latar merah muda) bila ada alasan penolakan: "Alasan penolakan: {alasan}".
  - Paginasi: "Menampilkan {awal}–{akhir} dari {total} pembayaran", tombol "Sebelumnya" dan "Berikutnya", teks "Halaman {halaman} / {total halaman}".
  - Ukuran halaman tetap 25 (`perPage = 25`).
- **Aksi yang bisa dilakukan:**
  - `GET /api/bukti/histori?page={n}&per_page=25` ditambah parameter `q`, `status`, `metode`, `dari`, `sampai` sesuai filter aktif. Pencarian hanya berlaku setelah "Cari"/Enter ditekan (state `q` terpisah dari state `search`).
  - Tombol "Cari" / Enter → terapkan pencarian dan kembali ke halaman 1.
  - Tombol "Reset" → kosongkan semua filter dan kembali ke halaman 1.
  - Filter status/metode/tanggal langsung berlaku (tidak perlu tombol Cari) dan mengembalikan halaman ke 1.
  - Klik nomor invoice → navigasi `/admin/piutang/{invoiceId}`.
- **Validasi & pesan error:**
  - Tidak ada validasi form di layar ini.
  - Server `GET /api/bukti/histori` tidak memvalidasi parameter; `per_page` dibatasi 1–100.
  - Error tampil pada banner "Gagal memuat histori pembayaran: {pesan}" memakai `error?.message` atau fallback "terjadi kesalahan".
- **Peran & syarat akses:**
  - `routes.js`: `privilege: ["Kontrak & Invoicing", "Lihat"]`.
  - Backend `GET /bukti/histori` → `privilege:Kontrak & Invoicing,Lihat`.
- **Catatan penting:**
  - Halaman ini adalah jejak audit penerimaan kas lintas invoice: menampilkan apakah bukti sudah dijurnal ke buku besar.
  - KPI dihitung terpisah dari paginasi (agregasi SQL per `status_verifikasi`), sehingga nilainya mencakup seluruh riwayat, bukan hanya halaman yang tampil.
  - Parameter `sumber` dan `faskes_id` juga didukung server tetapi tidak tersedia di UI ini.
  - Label metode pada kode: "Virtual Account" (virtual_account/va), "QRIS" (qris), "Transfer Manual" (transfer_manual/manual).

---

## Penugasan
- **Route:** `/admin/penugasan` (di `routes.js`: `path: "/penugasan"`, `layout: "/admin"`, `componentName: "PenugasanList"`)
- **Kondisi/estate yang ditampilkan:**
  - Loading tabel: satu baris colspan 6 dengan teks "Memuat...".
  - Kosong: satu baris colspan 6 dengan teks "Tidak ada hasil" bila ada pencarian, atau "Belum ada penugasan".
  - Terisi: tabel berisi grup penugasan (satu baris per kombinasi siklus + jenis).
  - Judul: "Penugasan Surveior & Verifikator"; subjudul "{n} entri ({m} grup)"; di kanan field pencarian: "{n} hasil".
  - Dialog "Tunjuk Tenaga Ahli"; Dialog "Detail Penugasan"; Dialog "Ganti Surveior"/"Ganti Verifikator".
- **Komponen/field yang tampil:**
  - Field pencarian: `placeholder="Cari faskes atau tenaga ahli..."`.
  - Tabel — kolom: "#", "Faskes", "Jenis", "Tenaga Ahli", "Status", "Aksi".
    - "Faskes" menampilkan nama faskes dan, bila ada, jenis faskes dalam kurung.
    - "Jenis" memakai badge "SURVEI" (biru) atau "VERIFIKASI" (hijau).
    - "Tenaga Ahli" menampilkan daftar orang dengan badge peran "TKPP", "TKSDU", atau "VER"; bila kosong → "—".
    - "Status" memakai badge: "Menunggu", "Bertugas" (untuk `sedang_bertugas`), "Selesai", "Ditolak", "Dibatalkan".
    - "Aksi" berisi tombol "Detail" dan tombol "Batal" (tombol "Batal" hanya muncul bila semua entri grup berstatus "menunggu").
  - Dialog "Tunjuk Tenaga Ahli": field "Siklus *" (select dengan opsi "— Pilih Siklus —" lalu "{nama faskes} ({jenis}) (Tahap {n})"), field "Jenis" (select "Survei"/"Verifikasi"), dan:
    - Mode Survei: "Surveyor TKPP *" dan "Surveyor TKSDU *" (kotak pencarian-select), "Tanggal Mulai", "Tanggal Selesai".
    - Mode Verifikasi: "Verifikator *".
    - "Surat Tugas (PDF, opsional)" (`accept=".pdf"`).
    - Tombol "Batal" dan "Tunjuk" (menjadi "Memproses…" saat proses).
    - Kotak merah berisi pesan error server bila permintaan gagal.
  - Dialog "Detail Penugasan": judul "Detail Penugasan" + nama faskes (+ jenis), badge jenis; tiga kartu ringkasan "Jumlah TA", "Bertugas", "Menunggu"; daftar "Tenaga Ahli" — tiap kartu memuat inisial, nama, badge peran, badge status, teks "Penugasan #{n}", dan (bila status "menunggu") tombol "Ganti".
    - Blok Surat Tugas: bila ada — nomor surat (`{nomor_surat}` atau "ST-") dan tanggal terbit, tombol "Lihat" dan "Unduh"; bila belum ada — teks "Belum diterbitkan".
    - Blok File Laporan: bila ada — nama file + ukuran MB + keterangan, tombol "Lihat" dan "Unduh".
    - Blok "Kendala ({n})": tiap kendala memakai badge "CoI" atau "FM" dan deskripsi, plus tanggal laporan.
    - Blok "Histori Pergantian" (bila ada): nama tenaga ahli, status, alasan dalam kurung, dan tanggal.
    - Tombol "Tutup".
    - Inline form ganti: teks "Mengganti: {nama}", tombol "Pilih Pengganti" dan "Batal".
  - Dialog "Ganti Surveior"/"Ganti Verifikator": teks "Mengganti {nama} ({jenis})", label "Pilih Pengganti" (kotak pencarian-select), label "Alasan (opsional)" dengan `placeholder="Contoh: surveyor berhalangan"`, tombol "Batal" dan "Ganti".
  - Placeholder kotak pencarian-select: "Memuat…", "Error: {pesan}", "Tidak ada surveyor TKPP tersedia", "Tidak ada surveyor TKSDU tersedia", "Cari surveyor TKPP…", "Cari surveyor TKSDU…", "Cari verifikator…", "Tidak ada verifikator tersedia", "Tidak ada pengganti tersedia", "Cari pengganti…"; pesan dropdown kosong: "Tidak ada hasil" (default), "Tidak ada surveyor TKPP yang cocok", "Tidak ada surveyor TKSDU yang cocok", "Tidak ada verifikator yang cocok", "Tidak ada pengganti yang cocok".
- **Aksi yang bisa dilakukan:**
  - Data utama: `GET /api/penugasan`.
  - Pencarian difilter di sisi frontend (nama faskes, nama tenaga ahli, jenis, atau status; lowercase contains).
  - Dropdown siklus: `GET /api/admin/siklus?jenis={jenis}`.
  - Dropdown tenaga ahli: `GET /api/admin/tenaga-ahli?peran=surveior&jenis=TKPP&siklus_id={id}` (TKPP), `...&jenis=TKSDU&siklus_id={id}` (TKSDU), `GET /api/admin/tenaga-ahli?peran=verifikator&siklus_id={id}` (verifikator).
  - "Tunjuk Tenaga Ahli" → buka dialog; submit memakai `fetch` langsung `POST /api/penugasan/appoint` (FormData) dengan `lembaga_id` bila ada. Field yang dikirim: `siklus_id`, `jenis`, `tenaga_ahli_ids[]` (dua orang untuk survei) atau `tenaga_ahli_id` (verifikator), `surat_tugas` (file, bila dipilih), `tanggal_mulai_survei`, `tanggal_selesai_survei`.
  - "Batal" per grup → `confirm("Batalkan {n} penugasan ini?")`, lalu untuk tiap id `POST /api/penugasan/{id}/batal`.
  - "Detail" → buka dialog detail; histori diambil `GET /api/penugasan/{siklusId}/histori?jenis={jenis}`.
  - "Lihat"/"Unduh" Surat Tugas → `GET /api/penugasan/surat-tugas/{suratId}/serve` (lihat, dibuka di tab baru) dan `GET /api/penugasan/surat-tugas/{suratId}/download` (unduh).
  - "Lihat"/"Unduh" File Laporan → `GET /api/penugasan/laporan-pengerjaan/{laporanId}/download`.
  - "Ganti" → buka dialog ganti; kandidat diambil `GET /api/admin/tenaga-ahli?peran={peran}&exclude_bertugas=0[&jenis={jenis}]`; submit `POST /api/penugasan/{penugasanId}/replace` (FormData: `tenaga_ahli_baru_id`, `alasan` bila diisi). Sukses → `alert(d.message || "Berhasil.")`; gagal → `alert(err.message)`.
- **Validasi & pesan error:**
  - Client (validasi manual sebelum request): "Siklus wajib dipilih"; "Surveyor TKPP wajib dipilih"; "Surveyor TKSDU wajib dipilih"; "TKPP dan TKSDU tidak boleh orang yang sama"; "Verifikator wajib dipilih".
  - Client unduh/buka file gagal → `alert("Gagal mengunduh: " + pesan)` atau `alert("Gagal membuka file: " + pesan)`; file kosong → pesan "File kosong".
  - Server `POST /api/penugasan/appoint` (422): "Survei untuk siklus ini sudah selesai. Tidak dapat menugaskan surveyor lagi."; "Survei untuk siklus ini belum selesai. Verifikasi hanya dapat dilakukan setelah laporan survei dikirim."; "Verifikasi untuk siklus ini sudah berjalan/selesai. Tidak dapat menugaskan verifikator lagi."; "Pilih minimal satu tenaga ahli."; "Untuk penugasan survei, harus memilih 2 tenaga ahli (1 TKPP + 1 TKSDU)."; "{nama} bukan {peran}."; "{nama} tidak aktif."; "{nama} sedang bertugas di siklus lain."; "Untuk survei, harus tepat 1 TKPP dan 1 TKSDU. Saat ini: TKPP={n}, TKSDU={n}."; validasi: `siklus_id` (uuid, ada), `jenis` (survei/verifikasi), `tenaga_ahli_ids` (1–5), `tanggal_mulai_survei` (tidak boleh sebelum hari ini), `tanggal_selesai_survei` (tidak boleh sebelum tanggal mulai), `surat_tugas` (PDF, maks 10240 KB).
  - Server `POST /api/penugasan/{penugasan}/replace` (422): "Hanya penugasan aktif (menunggu/sedang bertugas/ditolak) yang dapat diganti."; "Tenaga ahli baru bukan {peran}."; "Tenaga ahli pengganti harus berjenis sama ({jenis})."; "Tenaga ahli {nama} sedang bertugas di siklus lain dan tidak dapat dipilih."; "Tenaga ahli {nama} tidak aktif."; "Tenaga ahli pengganti sama dengan yang lama."; sukses 201 dengan pesan "{nama lama} diganti dengan {nama baru}."
  - Server `POST /api/penugasan/{penugasan}/batal` (422): "Hanya penugasan berstatus menunggu yang dapat dibatalkan."; sukses: "Penugasan dibatalkan dan dihapus."
  - Server `GET /api/penugasan/{siklusId}/histori`: 404 "Siklus tidak ditemukan."
  - Kesalahan server pada appoint ditampilkan pada kotak merah di dialog (bukan alert).
- **Peran & syarat akses:**
  - `routes.js`: `privilege: ["Penugasan", "Lihat"]`.
  - Backend: `GET /penugasan` → `Penugasan,Lihat`; `GET /admin/siklus` dan `GET /admin/tenaga-ahli` → `Penugasan,Tambah`; `POST /penugasan/appoint` → `Penugasan,Tambah`; `POST /penugasan/{id}/replace` → `Penugasan,Tambah`; `POST /penugasan/{id}/batal` → `Penugasan,Ubah`; `GET /penugasan/{siklusId}/histori`, `GET /penugasan/surat-tugas/{id}/serve`, `/download`, `GET /penugasan/laporan-pengerjaan/{id}/download` → `Penugasan,Lihat`.
- **Catatan penting:**
  - **Gatekeeper penugasan (server)**:
    - Survei tidak boleh ditugaskan bila survei untuk siklus itu sudah selesai → "Survei untuk siklus ini sudah selesai. Tidak dapat menugaskan surveyor lagi."
    - Verifikasi hanya boleh ditugaskan bila laporan survei sudah dikirim → "Survei untuk siklus ini belum selesai. Verifikasi hanya dapat dilakukan setelah laporan survei dikirim."
    - Verifikasi tidak boleh ditugaskan dua kali → "Verifikasi untuk siklus ini sudah berjalan/selesai. Tidak dapat menugaskan verifikator lagi."
    - Untuk survei wajib tepat 1 TKPP + 1 TKSDU, dan keduanya tidak boleh orang yang sama.
    - Surveior berstatus `menunggu` atau `sedang_bertugas` tidak muncul di dropdown kandidat (kecuali saat mengganti, karena `exclude_bertugas=0`); verifikator boleh menerima lebih dari satu penugasan.
  - **Gatekeeper Surat Tugas** (`SuratTugasGatekeeper`, dipakai `POST /api/surat-tugas/terbit`): syaratnya (1) `status_kelengkapan` siklus = "lengkap", (2) PKS ada dan berstatus "disetujui". **Tidak** menunggu invoice lunas (FR-2.4 v2.2). Pesan galat yang dikembalikan: "Dokumen Faskes belum tervalidasi lengkap (FR-1.3).", "PKS belum dibuat untuk siklus ini (FR-2.1).", "PKS belum disetujui Faskes (status: {status})."; pesan pembungkus dari `canIssueOrFail`: "Surat Tugas belum dapat diterbitkan: {daftar galat}". Endpoint penerbitan mengembalikan 422 dengan `message` "Surat Tugas belum dapat diterbitkan." dan array `errors` berisi rincian; 409 "Tenaga ahli sudah ditugaskan untuk siklus ini." bila penugasan aktif sudah ada.
  - Nomor surat tugas otomatis berformat "ST/{JENIS}/{TAHUN}/{KODE}" (6 karakter acak).
  - Status penugasan (model): "menunggu", "sedang_bertugas", "selesai", "ditolak", "dibatalkan", "digantikan". Daftar `GET /penugasan` menyembunyikan status "dibatalkan" dan "digantikan" kecuali dikirim `include_inactive=1` (parameter ini tidak dipakai di UI).
  - Status "overall" per grup dihitung di frontend dengan prioritas: ada "dibatalkan" → "dibatalkan"; ada "ditolak" → "ditolak"; semua "selesai" → "selesai"; semua "sedang_bertugas"/"selesai" → "sedang_bertugas"; ada "menunggu" → "menunggu".
  - Jenis penugasan: "survei" dan "verifikasi" (jenis "rekomendasi" tidak lagi dipakai dan tidak ditampilkan; rekomendator diatur global lewat `konfigurasi_penugasan.default_rekomendator_user_id`).
  - Endpoint lain yang tersedia tapi tidak dipakai UI ini: `POST /penugasan` (tawar ke kandidat), `PATCH /penugasan/{id}/konfirmasi` (konfirmasi kesediaan; pesan "Kesediaan dikonfirmasi. Penugasan sedang berjalan." / "Penolakan dicatat. Admin akan menugaskan pengganti."), `PUT /penugasan/{id}/selesai` (pesan "Penugasan ditandai selesai. Laporan pengerjaan telah diunggah."; galat "Penugasan belum berjalan."), `GET /penugasan/kandidat/{siklus}/{jenis}`, `GET /penugasan/eligible/{siklusId}/{jenis}`.
