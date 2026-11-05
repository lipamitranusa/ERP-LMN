# Bab 05 — Keuangan (catatan faktual)

Sumber utama: `frontend/src/views/admin/PiutangDashboard.jsx`, `frontend/src/views/admin/PiutangDetail.jsx`,
`frontend/src/views/keuangan/RefundApproval.jsx`, `frontend/src/views/admin/ApHonorDashboard.jsx`,
`frontend/src/views/admin/ApHonorList.jsx`, `frontend/src/views/admin/ApHonorBayar.jsx`,
`frontend/src/views/admin/ApHonorPaymentDetail.jsx`, `frontend/src/views/admin/ApHonorKasKeluar.jsx`,
`frontend/src/views/admin/ApHonorHistory.jsx`, `frontend/src/views/admin/HutangPajakList.jsx`,
`frontend/src/views/admin/HutangPajakDetail.jsx`, `frontend/src/views/keuangan/RekonsiliasiDashboard.jsx`,
`frontend/src/views/keuangan/BuktiPotong.jsx`, `frontend/src/views/keuangan/LedgerJournal.jsx`,
`frontend/src/views/keuangan/SlipHonorarium.jsx`, `frontend/src/views/keuangan/KonfigurasiPajak.jsx`,
`frontend/src/components/SettlementJournalPanel.jsx`, `frontend/src/routes.js`, `frontend/src/hooks/useApi.js`,
`frontend/src/lib/api.js`, `backend/routes/api.php`,
`backend/app/Services/Keuangan/{PiutangService,ApHonorService,HutangPajakService,ReconciliationService,BuktiPotongService,LedgerService,HonorCalculator}.php`,
`backend/app/Services/Refund/RefundApprovalService.php`,
`backend/app/Http/Controllers/Api/{ApHonorController,HutangPajakController,KonfigurasiPajakController,BuktiPotongController,RefundController,LedgerJournalController,SlipHonorController}.php`.

Semua layar bab ini berada di kerangka `/admin` (layout internal). Path di `frontend/src/routes.js` ditulis tanpa prefiks,
`frontend/src/App.jsx` membentuk URL akhir sebagai `layout + path` (layout = `/admin`).
Seluruh request API otomatis ditempel `?lembaga_id=` oleh `frontend/src/lib/api.js` sehingga data ter-scope per lembaga aktif.

---

## Dasbor Piutang
- **Route:** `/admin/piutang` (menu sidebar: group `Keuangan`, item `Dasbor Piutang`)
- **Kondisi yang ditampilkan:**
  - Judul: `Dasbor Piutang`. Subjudul: `Status pembayaran Faskes secara real-time, independen dari alur penugasan Surat Tugas. Snapshot per {tanggal_snapshot}.`
  - **Memuat:** `Memuat dasbor piutang...`
  - **Error:** kartu error menampilkan `apiResult.error.message` (pesan dari server; `frontend/src/lib/api.js` melempar `body.message || body.error || 'HTTP {status}'`).
  - **Kosong (agregat):** `Tidak ada piutang aktif.` (muncul pada kartu Aging dan kartu Top Faskes).
  - **Kosong (tabel):** `Tidak ada invoice yang cocok dengan filter.`
- **Komponen/field yang tampil:**
  - Empat KPI card:
    - `Total piutang aktif` — nilai `{total_nominal}` dengan sub-teks `{jumlah_invoice} invoice belum lunas`.
    - `Jatuh tempo` — nilai `{total_jatuh_tempo}` dengan sub-teks `{jumlah_jatuh_tempo} invoice lewat due date`.
    - `Lunas bulan ini` — nilai `{jumlah_lunas_bulan_ini}` dengan sub-teks `{jumlah_belum_bayar} belum · {jumlah_sebagian} parsial`.
    - `Sudah diterima` — nilai `{total_diterima}` dengan sub-teks `Akumulasi pembayaran invoice aktif`.
  - Kartu `Aging piutang` dengan keterangan `hari lewat jatuh tempo`; 5 bucket: `Belum jatuh tempo`, `0-30 hari`, `31-60 hari`, `61-90 hari`, `>90 hari` (label bucket servis: `belum_jatuh_tempo`, `0_30`, `31_60`, `61_90`, `>90`).
  - Kartu `Top Faskes dengan piutang` — kolom `Faskes` | `Sisa piutang`; baris kedua di bawah nama memuat `{tipe_faskes} · {jumlah_invoice} invoice`.
  - Panel filter:
    - Input cari label `Cari nomor invoice / Faskes`, placeholder `Ketik untuk mencari...`.
    - Select `Status Invoice` dengan opsi `Semua status`, `Belum Bayar`, `Jatuh Tempo`, `Parsial`, `Lunas`, `Kedaluwarsa`, `Refund`.
    - Checkbox `Hanya yang sudah jatuh tempo`.
    - Tombol `Reset filter`.
  - Kartu tabel dengan judul `Daftar invoice ({n})` dan keterangan `Diurutkan berdasarkan due date`. Kolom: `Invoice`, `Faskes`, `Status`, `Total Tagihan`, `Diterima`, `Sisa`, `Jatuh Tempo`, `Overdue`.
    - Badge `Status` memakai label: `Belum Bayar`, `Parsial`, `Jatuh Tempo`, `Lunas`, `Kedaluwarsa`, `Refund`, `Diganti`.
    - Badge `Overdue`: `{n} hari` bila lewat jatuh tempo, `—` bila tidak.
- **Aksi yang bisa dilakukan:**
  - Memuat dasbor → **GET `/api/piutang/dasbor`**.
  - Memuat daftar invoice → **GET `/api/piutang/invoice`** dengan query `status` (nilai status invoice) dan `jatuh_tempo=1` bila checkbox dicentang.
  - Mengetik di kotak cari / memilih status / mencentang filter → query string berubah dan daftar dimuat ulang.
  - `Reset filter` → mengosongkan filter dan memuat ulang daftar.
  - Klik baris tabel → navigasi ke `/admin/piutang/{id}`.
- **Validasi & pesan error:**
  - Tidak ada validasi form; seluruh kegagalan API ditampilkan lewat `apiResult.error.message`.
  - Server: `PiutangService::invoiceList()` membatasi hasil 100 invoice teratas, diurutkan berdasarkan `due_date`.
- **Peran & syarat akses:**
  - `frontend/src/routes.js` → privilege `["Dasbor Eksekutif", "Lihat"]`.
  - `backend/routes/api.php` → endpoint dasbor & invoice dilindungi middleware `privilege:Dasbor Eksekutif,Lihat` (di luar `auth:sanctum` + `lembaga`).
- **Catatan penting:**
  - Istilah "piutang aktif" pada kode = invoice yang statusnya bukan `lunas`, `refunded`, dan bukan `superseded` (`PiutangService`).
  - Sisa piutang = `total_tagihan` − jumlah bukti pembayaran yang `status_verifikasi = 'diterima'`.
  - Status tampilan diturunkan (`PiutangService::statusDisplay()`): `lunas` → `lunas`; `refunded` → `refunded`; `superseded` → `superseded`; `expired` → `expired`; overdue > 0 → `jatuh_tempo`; sebagian terbayar → `parsial`; selain itu `belum_bayar`.
  - Aging dihitung dari selisih hari terhadap `due_date`; "Top Faskes" diambil 20 teratas berdasarkan sisa piutang terbesar.
  - Subjudul menegaskan status di layar ini berdiri sendiri, tidak bergantung pada alur penugasan Surat Tugas.

---

## Detail Invoice (Detail Piutang)
- **Route:** `/admin/piutang/:id` (menu sidebar: hidden, `hideInSidebar`; item `Detail Piutang`)
- **Kondisi yang ditampilkan:**
  - Judul: `Detail Invoice`. Subjudul memuat nomor invoice dan nama Faskes.
  - **Memuat:** `Memuat detail invoice...`
  - **Error:** kartu error berisi `apiResult.error.message` plus tombol `Kembali`.
  - **Belum ada jurnal:** banner kuning `Belum ada jurnal settlement` (dari `SettlementJournalPanel`) — lihat catatan di bawah.
  - **Kartu kosong:** `Data Faskes tidak tersedia.` dan `Data siklus tidak tersedia.`
  - **Histori kosong:** `Belum ada pembayaran yang terekam.`
- **Komponen/field yang tampil:**
  - Tombol aksi di header:
    - `Buat Jurnal Bank Masuk` (saat belum ada jurnal).
    - `Jurnal Bank Masuk Lengkap` + tooltip `Seluruh penerimaan kas pada invoice ini sudah memiliki jurnal bank masuk` (saat sudah lengkap, tombol nonaktif).
    - Saat proses: `Membuat jurnal...`
    - Tooltip tombol buat: `Buat jurnal Bank Masuk: Debit Bank / Kredit Piutang Usaha`
  - Banner ringkasan jurnal:
    - `{n} penerimaan kas belum diposting ke buku besar`
    - `Seluruh penerimaan kas sudah diposting ke buku besar`
    - `Jurnal Bank Masuk: Debit Kas/Bank · Kredit Piutang Usaha (1105) — satu jurnal per penerimaan kas.`
  - Kartu `Informasi Invoice`: `Nomor Invoice`, `Diterbitkan`, `Jatuh Tempo`, `Metode Bayar`, `Payment Ref.`, `Batas Pembayaran`, `Tanggal Lunas`, `Dibuat oleh`, `Keterangan`.
  - Kartu `Data Faskes`: `Nama`, `Tipe`, `Alamat`, `Telepon`, `Email`.
  - Kartu `Siklus Akreditasi`: `ID Siklus`, `Status Siklus`, `Tanggal Pengajuan`, tombol `Lihat Detail Siklus`.
  - Kartu `Ringkasan Tagihan`: `TOTAL TAGIHAN`, `SUDAH DIBAYAR`, `SISA PIUTANG`, `OVERDUE`; progress bar dengan teks `{received} diterima` dan `{pct}%`.
  - Kartu `Histori Pembayaran` — kolom `Tanggal`, `Metode`, `Nominal`, `Status`, `Diverifikasi oleh`, `Keterangan`.
    - Label metode: `Virtual Account`, `QRIS`, `Transfer Manual`.
    - Label status: `Menunggu`, `Diterima`, `Ditolak`.
  - Panel `Jurnal Penerimaan Kas` (`SettlementJournalPanel` dengan `refType = settlement_piutang`).
    - Saat jurnal ada: baris `Nomor Jurnal`, `Tanggal`, `Kategori`, tabel `Akun` / `Debit` / `Kredit` dengan baris total `Total`, dan `Keterangan` jurnal bila ada.
    - Saat jurnal belum ada: `⚠ Belum ada jurnal settlement`, baris `Sumber: {type} #{8 karakter awal id}`, dan pesan bawaan `Penerimaan kas pada AR ini belum diposting ke buku besar. Klik tombol di bawah untuk membuat jurnal Bank Masuk (Debit Bank / Kredit Piutang Usaha).`
- **Aksi yang bisa dilakukan:**
  - `Buat Jurnal Bank Masuk` → **POST `/api/keuangan/settlement/bank-masuk`** dengan badan `{ invoice_id }` (dan `bukti_id` bila dibuatkan untuk satu bukti tertentu).
    - Sukses: `Jurnal bank masuk berhasil dibuat`.
    - Bila tidak ada jurnal baru: `Tidak ada jurnal baru`.
    - Gagal: kartu error `Gagal membuat jurnal bank masuk: {msg}`.
  - `Lihat Detail Siklus` → navigasi ke `/admin/pendaftaran/{id}`.
  - Klik baris histori pembayaran → tidak ada aksi navigasi (tabel statis).
- **Validasi & pesan error:**
  - `GET /api/piutang/{id}` — 404 bila invoice tidak ditemukan (pesan dari `findOrFail`).
  - Pesan error jurnal ditampilkan pada kartu merah `Gagal membuat jurnal bank masuk: {msg}`.
- **Peran & syarat akses:**
  - `frontend/src/routes.js` → privilege `["Dasbor Eksekutif", "Lihat"]`.
  - `backend/routes/api.php` → `GET /api/piutang/{id}` dilindungi `privilege:Dasbor Eksekutif,Lihat`; `POST /api/keuangan/settlement/bank-masuk` dilindungi `privilege:Ledger/Keuangan,Tambah`.
- **Catatan penting:**
  - Jurnal Bank Masuk **tidak** dibuat otomatis saat pembayaran diterima; pihak Keuangan yang menekan tombol. Satu jurnal per penerimaan kas.
  - Bentuk jurnal: Debit Kas/Bank · Kredit Piutang Usaha (1105).
  - Panel jurnalsettlement menampilkan `Nomor Jurnal`, `Tanggal`, `Kategori`, dan rincian akun debit/kredit beserta totalnya.

---

## Approval Refund
- **Route:** `/admin/refund-approval` (menu sidebar: group `Keuangan`, item `Approval Refund`)
- **Kondisi yang ditampilkan:**
  - Judul: `Approval Refund`. Subjudul: `Approval berjenjang untuk permintaan refund pembayaran Faskes (FR-2.8).`
  - **Memuat:** `Memuat...`
  - **Kosong:** `Tidak ada refund yang perlu diproses.`
  - **Modal:** `Detail Refund` menampilkan Faskes, Nominal, Alasan.
- **Komponen/field yang tampil:**
  - Tabel refund dengan kolom `Tanggal`, `Faskes`, `Invoice`, `Nominal`, `Alasan`, `Status`, `Aksi`.
  - Label status: `Menunggu approval`, `Disetujui (siap eksekusi)`, `Sudah dieksekusi`, `Ditolak`.
  - Kolom `Aksi` memuat tombol sesuai status:
    - Status `requested` → `Setujui` dan `Tolak`.
    - Status `approved` → `Eksekusi Sekarang`.
  - Modal `Detail Refund`:
    - Baris `Faskes`, `Nominal`, `Alasan`.
    - Label field: `Catatan approval`, placeholder `Catatan untuk approval / alasan penolakan...`.
    - Saat menolak, field yang sama dipakai untuk alasan penolakan.
    - Tombol footer: `Batal`, `Tolak`, `Setujui`, `Eksekusi Sekarang`.
- **Aksi yang bisa dilakukan:**
  - Memuat daftar → **GET `/api/refund/pending`** (menampilkan refund berstatus `requested` dan `approved`).
  - `Setujui` → **POST `/api/refund/{id}/approve`** dengan badan `{ catatan }` (catatan opsional, maksimal 1000 karakter).
  - `Tolak` → **POST `/api/refund/{id}/reject`** dengan badan `{ alasan }`.
  - `Eksekusi Sekarang` → konfirmasi peramban `Eksekusi refund ini? Tindakan ini akan membuat Ledger Entry dan tidak dapat dibatalkan.` → **POST `/api/refund/{id}/execute`**.
  - `Batal` → menutup modal tanpa mengirim permintaan.
- **Validasi & pesan error:**
  - Client: saat `Tolak` dan alasan kosong → `alert` `Alasan penolakan wajib diisi.` dan permintaan tidak dikirim.
  - Client: `Eksekusi Sekarang` selalu meminta konfirmasi peramban dengan teks di atas.
  - Server (`POST /api/refund/{id}/approve`): `Refund tidak dalam status requested (saat ini: {status}).`
  - Server (`POST /api/refund/{id}/execute`): `Refund belum disetujui (saat ini: {status}).`
  - Server (`POST /api/refund/{id}/reject`): validasi `alasan` wajib, string, minimal 5 karakter.
  - Server (`POST /api/refund` — pengajuan refund): `nominal` wajib numerik minimal 1; `alasan` wajib string minimal 10 karakter; pesan `Nominal refund melebihi total tagihan invoice.`
- **Peran & syarat akses:**
  - `frontend/src/routes.js` → privilege `["Kontrak & Invoicing", "Setujui"]`.
  - `backend/routes/api.php` → `GET /api/refund/pending`, `POST /api/refund/{id}/approve`, `POST /api/refund/{id}/reject`, `POST /api/refund/{id}/execute` dilindungi `privilege:Kontrak & Invoicing,Setujui`.
- **Catatan penting:**
  - Refund berjenjang: `requested` → `approved` → dieksekusi (menjadi `executed`), atau `requested` → `rejected`.
  - Eksekusi membuat satu `LedgerEntry` bertipe `refund` dengan `nominal_neto` bernilai negatif (balik dari penerimaan), dan **tidak dapat dibatalkan**.
  - Daftar pending hanya berisi refund berstatus `requested` dan `approved`.

---

## Dasbor AP Honor
- **Route:** `/admin/ap-honor` (menu sidebar: group `Keuangan`, item `Dasbor AP Honor`)
- **Kondisi yang ditampilkan:**
  - Judul: `Dasbor AP Honor`. Subjudul: `Accounts Payable honor Surveior, Verifikator & Rekomendator. Snapshot per {tanggal_snapshot}.`
  - **Memuat:** `Memuat dasbor AP...`
  - **Kosong (aging):** `Tidak ada AP honor outstanding.`
  - **Kosong (top penerima):** `Tidak ada AP outstanding.`
  - **Kosong (pembayaran terbaru):** `Belum ada pembayaran.`
- **Komponen/field yang tampil:**
  - Tombol header: `Riwayat Pembayaran` (→ `/admin/ap-honor/history`) dan `Bayar Honor` (→ `/admin/ap-honor/list`).
  - KPI:
    - `AP Honor Outstanding` — nilai `{total_ap_outstanding}`, sub-teks `{jumlah_honor_belum_dibayar} honor`.
    - `Dibayar Bulan Ini` — nilai `{total_dibayar_bulan_ini}`, sub-teks `{jumlah_pembayaran_bulan_ini} pembayaran disetujui`.
    - `Surveior Outstanding` — nilai `{jumlah_surveior_outstanding}`, sub-teks `Honor surveior yang belum dibayar`.
    - `Verifikator Outstanding` — nilai `{jumlah_verifikator_outstanding}`, sub-teks `Honor verifikator yang belum dibayar`.
    - `Rekomendator Outstanding` — nilai `{jumlah_rekomendator_outstanding}`, sub-teks `Honor rekomendator yang belum dibayar`.
  - Kartu `Aging AP Honor` dengan keterangan `hari sejak honor menjadi tagihan`; 4 bucket: `0-30 hari`, `31-60 hari`, `61-90 hari`, `>90 hari` (kunci `0_30`, `31_60`, `61_90`, `>90`).
  - Kartu `Top penerima honor` — kolom `Penerima`, `Honor`, `Outstanding`; di bawah nama ditampilkan `{nomor_induk_surveior}`.
  - Kartu `Pembayaran terbaru` dengan keterangan `5 terakhir` — kolom `Nomor`, `Tanggal`, `Status`, `Total`.
  - Badge status pembayaran: `Draft`, `Disetujui`, `Dibatalkan`.
- **Aksi yang bisa dilakukan:**
  - Memuat KPI + aging + top penerima → **GET `/api/keuangan/ap-honor/dashboard`**.
  - Memuat 5 pembayaran terakhir → **GET `/api/keuangan/ap-honor/payments`** (dipotong 5 baris di sisi frontend).
  - `Riwayat Pembayaran` → navigasi ke `/admin/ap-honor/history`.
  - `Bayar Honor` → navigasi ke `/admin/ap-honor/list`.
  - Klik baris pembayaran terbaru → navigasi ke `/admin/ap-honor/payment/{id}`.
- **Validasi & pesan error:**
  - Tidak ada validasi form. Bila `dashData` kosong, komponen mengembalikan `null` (tidak ada layar error khusus).
  - Server (`GET /api/keuangan/ap-honor/payments` dengan filter periode): pesan `Filter periode harus diisi lengkap (tahun dan bulan).` dengan detail `['tahun' => ['tahun dan bulan harus diisi bersama-sama.']]`.
- **Peran & syarat akses:**
  - `frontend/src/routes.js` → privilege `["Ledger/Keuangan", "Lihat"]`.
  - `backend/routes/api.php` → `GET /api/keuangan/ap-honor/dashboard` dan `GET /api/keuangan/ap-honor/payments` dilindungi `privilege:Ledger/Keuangan,Lihat`.
- **Catatan penting:**
  - AP honor = honor Surveior, Verifikator, dan Rekomendator yang sudah menjadi tagihan (ledger entry) tetapi belum dibayar.
  - Outstanding dihitung dari `nominal_neto` entry honor yang `status_pembayaran = belum_dibayar`.
  - Aging diukur dari "hari sejak honor menjadi tagihan" (bukan sejak tanggal jatuh tempo).

---

## Pembayaran Honor TA (Bayar Honor)
- **Route:** `/admin/ap-honor/list` (menu sidebar: group `Keuangan`, item `Bayar Honor`)
- **Kondisi yang ditampilkan:**
  - Judul: `Pembayaran Honor TA`. Subjudul: `Pilih honor yang akan dibayar, lalu klik 'Bayar Honor' untuk membuat pembayaran.`
  - Tombol header: `Dasbor AP Honor` (→ `/admin/ap-honor`).
  - **Memuat:** 8 baris skeleton pada tabel (belum ada teks "memuat").
  - **Kosong:** `Tidak ada honor outstanding yang cocok dengan filter.`
  - **Tanpa pilihan:** baris informasi `{n} honor dipilih · Total: {rp}` (nilai 0) dan tombol `Bayar Honor` nonaktif.
- **Komponen/field yang tampil:**
  - KPI: `Total honor` (jumlah entri), `Penerima` (jumlah penerima unik), `Total neto outstanding`.
  - Panel filter:
    - Input cari label `Cari nama / NS / Faskes`, placeholder `Ketik untuk mencari...`.
    - Select `Peran` dengan opsi `Semua`, `Surveior`, `Verifikator`, `Rekomendator`.
    - Select `Periode` (filter bulan).
    - Select `Penerima` (dropdown penerima honor).
    - Tombol `Reset filter`.
  - Baris 선택: `{n} honor dipilih · Total: {rp}` dengan tombol `Batal Pilih` dan tombol `Bayar Honor ({n})`.
  - Tabel honor dengan kolom: kolom checkbox (tanpa judul), `Penerima`, `Peran`, `Faskes`, `Tanggal Honor`, `Gross`, `DPP (50%)`, `PPh 21`, `Net`, `Outstanding`.
    - Label peran (`PERAN_LABEL`): `ap_honor_surveior` → `Surveior`, `ap_honor_verifikator` → `Verifikator`, `ap_honor_rekomendator` → `Rekomendator`.
    - Kolom `Outstanding` memuat badge umur: `{n} hari` — merah bila > 90 hari, kuning bila > 30 hari, hijau selainnya.
- **Aksi yang bisa dilakukan:**
  - Memuat daftar honor outstanding → **GET `/api/keuangan/ap-honor/outstanding`** (dengan query filter yang dipilih).
  - Mengubah filter → daftar dimuat ulang.
  - `Reset filter` → mengembalikan filter default dan memuat ulang.
  - Centang baris / checkbox header → memperbarui baris "{n} honor dipilih · Total: {rp}".
  - `Batal Pilih` → mengosongkan seluruh pilihan.
  - `Bayar Honor ({n})` → navigasi ke `/admin/ap-honor/bayar?ids={id1,id2,...}`.
- **Validasi & pesan error:**
  - `Bayar Honor` nonaktif bila tidak ada baris terpilih (tidak ada alert; tetapFiltering tombol disabled).
  - Server: `GET /api/keuangan/ap-honor/outstanding` dapat mengembalikan pesan `Filter periode harus diisi lengkap (tahun dan bulan).` bila parameter periode tidak lengkap.
- **Peran & syarat akses:**
  - `frontend/src/routes.js` → privilege `["Ledger/Keuangan", "Lihat"]` (menu daftar honor).
  - `backend/routes/api.php` → `GET /api/keuangan/ap-honor/outstanding` dilindungi `privilege:Ledger/Keuangan,Lihat`.
  - Endpoint pembuatan pembayaran (dipakai layar berikutnya) memerlukan `privilege:Ledger/Keuangan,Tambah`.
- **Catatan penting:**
  - `DPP (50%)` adalah dasar pengenaan pajak PPh 21 Bukan Pegawai = 50% dari honor bruto.
  - `Net` = nominal yang dibayarkan ke penerima honor (bruto − PPN − PPh).
  - Kolom `Outstanding` menampilkan sisa tagihan per entri honor yang bisa dibayar sebagian (nominal_neto dikurangi nilai yang sudah dibayar pada pembayaran aktif).
  - Honor baru masuk daftar ini setelah siklus penugasan selesai (lihat Catatan Penting pada Detail Pembayaran Honor).

---

## Buat / Edit Pembayaran Honor
- **Route:** `/admin/ap-honor/bayar` (menu sidebar: hidden, `hideInSidebar`; item `Buat Pembayaran Honor`)
- **Kondisi yang ditampilkan:**
  - Judul mode buat: `Buat Pembayaran Honor`. Subjudul: `Draft pembayaran dapat diedit/dibatalkan sebelum disetujui. Setelah disetujui, honor berubah status menjadi lunas.`
  - Judul mode edit: `Edit Pembayaran Honor`. Subjudul: `Hanya pembayaran berstatus draft yang dapat diedit. Line item honor tidak berubah saat edit.`
  - **Memuat:** `Memuat data honor...`
  - **Error:** kartu error menampilkan pesan dari server; kemungkinan teks yang dipakai frontend: `Tidak ada honor yang dipilih.`, `Honor yang dipilih tidak ditemukan.`, `Pembayaran tidak ditemukan.`, `Pembayaran ini tidak memiliki line item honor.`; tersedia tombol `← Kembali`.
  - **Warning total tidak sesuai:** banner `Total pembayaran ({total}) tidak sesuai dengan jumlah line item ({total_detail}). Line item honor tidak bisa diubah saat edit — batalkan pembayaran ini lalu buat pembayaran baru.`
- **Komponen/field yang tampil:**
  - Kartu `Detail Pembayaran`:
    - `Tanggal Pembayaran *` (input date).
    - `Metode Pembayaran *` (select: `Transfer Bank`, `Tunai`, `Lainnya`).
    - Saat metode `Transfer Bank`, muncul field tambahan: `Bank Pengirim` (placeholder `BCA, Mandiri, dll`), `No. Rekening Tujuan` (placeholder `1234567890`), `Atas Nama` (placeholder `Nama penerima`).
    - `Catatan` (placeholder `Catatan internal (opsional)`).
    - `Bukti Transfer` — input file, `accept` = `image/jpeg,image/png,application/pdf`.
  - Kartu `Ringkasan`:
    - `Jumlah line item`, `Penerima`, `Total Neto`.
    - Label `Detail per penerima:` lalu tabel line item dengan kolom `Penerima`, `Peran`, `Faskes`, `Tgl Honor`, `Gross`, `DPP`, `PPh 21`, `Net`.
  - Tombol footer: `Batal`, dan `Simpan sebagai Draft` (mode buat) / `Simpan Perubahan` (mode edit). Saat proses: `Menyimpan...`.
- **Aksi yang bisa dilakukan:**
  - Mode buat: memuat data honor terpilih via **GET `/api/keuangan/ap-honor/outstanding`** / detail entry sesuai `ids` pada query string.
  - Mode edit: memuat detail via **GET `/api/keuangan/ap-honor/payments/{id}`** (query `?edit={id}`).
  - `Simpan sebagai Draft` → **POST `/api/keuangan/ap-honor/payments`** dengan `FormData` berisi `ledger_entry_ids[]` (array id entri honor), `tanggal_pembayaran`, `metode_pembayaran`, data rekening bila ada, `catatan`, dan `bukti_transfer` (file).
  - `Simpan Perubahan` → **PATCH `/api/keuangan/ap-honor/payments/{id}`** dengan `FormData` sejenis (tanpa mengubah line item honor).
  - `Batal` → keluar/kembali ke daftar.
- **Validasi & pesan error:**
  - Client (Zod): `Tanggal wajib diisi`; `Metode wajib dipilih`.
  - Server (`ApHonorService::create`): `Pilih minimal satu honor entry untuk dibayar.`; `Sebagian honor entry tidak ditemukan atau bukan AP honor.`; `Sebagian entry sudah lunas: {ids}`; `Sebagian honor sudah termasuk dalam pembayaran lain yang masih aktif. Batalkan pembayaran tersebut terlebih dahulu.`
  - Server (`ApHonorService::update`): `Pembayaran tidak ditemukan.`; `Hanya pembayaran berstatus draft yang dapat diedit. Batalkan pembayaran terlebih dahulu.`; `Pembayaran ini tidak memiliki line item honor sehingga tidak dapat diedit.`
  - Server (`ApHonorController`): `Pembayaran tidak ditemukan.` (404).
- **Peran & syarat akses:**
  - `frontend/src/routes.js` → privilege `["Ledger/Keuangan", "Tambah"]`.
  - `backend/routes/api.php` → `POST /api/keuangan/ap-honor/payments` dilindungi `privilege:Ledger/Keuangan,Tambah`; `PATCH /api/keuangan/ap-honor/payments/{id}` dilindungi `privilege:Ledger/Keuangan,Ubah`.
- **Catatan penting:**
  - Pembayaran selalu dibuat berstatus `draft` — belum mengubah status honor menjadi lunas.
  - Line item honor bersifat permanen setelah draft dibuat; untuk mengubahnya, pembayaran harus dibatalkan lalu dibuat baru.
  - Nomor pembayaran dibentuk `BYR/YYYY/MM/NNNN` (dihasilkan backend).
  - Bukti transfer diunggah melalui `FormData` (tidak di-JSON-kan oleh `frontend/src/lib/api.js`).

---

## Detail Pembayaran Honor
- **Route:** `/admin/ap-honor/payment/:id` (menu sidebar: hidden, `hideInSidebar`; item `Detail Pembayaran Honor`)
- **Kondisi yang ditampilkan:**
  - Judul: `Detail Pembayaran Honor`.
  - **Memuat:** `Memuat detail pembayaran...`
  - **Tidak ditemukan:** pesan `Pembayaran tidak ditemukan.` atau pesan error dari server, plus tombol `← Kembali ke Riwayat`.
  - **Warning total tidak sesuai:** `Total pembayaran ({total}) tidak sesuai dengan jumlah line item ({total_detail}). Pembayaran ini tidak dapat disetujui sampai selaras.`
  - **Modal pembatalan:** judul `Batalkan pembayaran yang sudah disetujui` (pembayaran approved) atau `Hapus draft pembayaran` (draft); teks `Jika dibatalkan, status honor akan dikembalikan ke belum_dibayar.`
- **Komponen/field yang tampil:**
  - Badge status di header: `Draft`, `Disetujui`, `Dibatalkan`.
  - Tombol aksi:
    - `✓ Setujui` (hanya untuk status draft).
    - `Edit` (hanya untuk status draft) → navigasi ke `/admin/ap-honor/bayar?edit={id}`.
    - `Hapus Draft` (status draft) / `Batalkan` (status disetujui).
    - `Cetak Slip`, `Kirim Slip`.
    - `Buat Bank Keluar` — menampilkan badge `Sudah dijurnal ({jurnal_nomor})` bila jurnal sudah ada.
  - Kartu `Detail Pembayaran`: `Nomor`, `Tanggal`, `Metode`, `Bank Pengirim`, `No. Rekening`, `Atas Nama`, `Catatan`, tombol `Lihat Bukti Transfer`.
  - Kartu `Status & Total`: `Total Pembayaran`, `{n} line item`, `Dibuat oleh`, `Tgl dibuat`, `Disetujui oleh`, `Tgl disetujui`, `Dibatalkan oleh`, `Tgl dibatalkan`, `Alasan`.
  - Tabel line item: kolom `Penerima`, `Faskes`, `Tgl Honor`, `Gross`, `DPP`, `PPh 21`, `Net`.
  - Panel slip `Kirim Slip Honorarium` dengan teks `Kirim slip honor ke tenaga ahli via WhatsApp atau Email.`
    - Kartu ringkasan: `No. Pembayaran`, `Penerima`, `Total Neto`, `Bruto`, `PPN`, `PPh 21`, `AC-7` (`✓ Valid` / `✕ Selisih`).
    - Label `Pilih Channel Pengiriman` dengan opsi `WhatsApp`, `Email`, `Keduanya`.
    - Tombol `Kirim via {channel}` (saat proses `Mengirim...`), hasil `Kirim lagi`.
  - Modal `Preview Slip Honorarium` dengan tombol `Cetak` dan `Tutup`.
  - Panel `Jurnal Pelunasan Hutang Honor` (`SettlementJournalPanel`, `refType = settlement_ap_honor`).
    - Pesan saat belum ada jurnal: `Kas keluar honor ini belum diposting ke buku besar. Klik tombol di bawah untuk membuat jurnal Bank Keluar (Debit Utang Honor / Kredit Kas-Bank).`
- **Aksi yang bisa dilakukan:**
  - Memuat detail → **GET `/api/keuangan/ap-honor/payments/{id}`**.
  - `✓ Setujui` → konfirmasi `Setujui pembayaran {nomor}? Honor akan berubah status menjadi lunas.` → **POST `/api/keuangan/ap-honor/payments/{id}/approve`**.
  - `Edit` → navigasi ke `/admin/ap-honor/bayar?edit={id}`.
  - `Hapus Draft` / `Batalkan` → **POST `/api/keuangan/ap-honor/payments/{id}/cancel`** dengan badan `{ alasan }` (wajib diisi; minimal 3 karakter di sisi client).
  - `Buat Bank Keluar` → konfirmasi `Buat jurnal Bank Keluar untuk {nomor}?` → **POST `/api/keuangan/settlement/bank-keluar`** dengan badan `{ pembayaran_id }`.
  - `Cetak Slip` → membuka modal preview; slip diambil dari **GET `/api/ledger/slip-honor/{id}/generate`**.
  - `Kirim Slip` → **GET `/api/ledger/slip-honor/{id}/preview`** untuk pratinjau, lalu **POST `/api/ledger/slip-honor/{id}/send`** dengan badan `{ channel }`.
  - `Lihat Bukti Transfer` → membuka berkas bukti pembayaran.
- **Validasi & pesan error:**
  - Client: alasan pembatalan kosong atau < 3 karakter → `Alasan minimal 3 karakter.`
  - Client: gagal memuat pratinjau slip → `Preview gagal dimuat (HTTP {status}).`
  - Server (`ApHonorService::approve`): `Pembayaran tidak ditemukan.`; `Pembayaran sudah dibatalkan, tidak dapat disetujui.`; `Pembayaran tidak memiliki line item honor.`; `Total pembayaran (Rp X) tidak sesuai dengan jumlah line item (Rp Y). Perbaiki draft pembayaran sebelum menyetujui.`; `Sebagian honor pada pembayaran ini sudah tidak ditemukan. Batalkan pembayaran lalu buat ulang.`; `Sebagian honor sudah lunas sehingga tidak dapat disetujui lagi: {ids}`
  - Server (`ApHonorController::showPayment`): `Pembayaran tidak ditemukan.` (404).
- **Peran & syarat akses:**
  - `frontend/src/routes.js` → privilege `["Ledger/Keuangan", "Lihat"]`.
  - `backend/routes/api.php` → `GET /api/keuangan/ap-honor/payments/{id}`: `privilege:Ledger/Keuangan,Lihat`; `POST .../approve`: `privilege:Ledger/Keuangan,Setujui`; `POST .../cancel`: `privilege:Ledger/Keuangan,Ubah`; `POST /api/keuangan/settlement/bank-keluar`: `privilege:Ledger/Keuangan,Tambah`.
- **Catatan penting:**
  - Alur honor: entri honor dibuat otomatis — Surveior saat laporan survei ditandai selesai (`LedgerService::catatHonorSurveior`), Verifikator saat tombol Final verifikasi (`LedgerService::catatHonorVerifikator`), Rekomendator saat rekomendator menyetujui (`LedgerService::triggerHonorSetelahRekomendasi`).
  - Entry honor masuk daftar outstanding hanya bila `laporanVerifikasi.status_rekomendasi = 'disetujui'`; entry yang sudah termasuk pembayaran aktif tidak ditampilkan lagi.
  - Pembayaran berstatus `draft` → setelah disetujui (`disetujui`) status honor menjadi `lunas` → **Hutang PPh 21** dibuat otomatis per penerima dengan PPh > 0, jatuh tempo akhir bulan berikutnya.
  - Jurnal settlement **tidak** dibuat otomatis: Kas Keluar Honor dibuat manual lewat tombol `Buat Bank Keluar` (Debit Utang Honor / Kredit Kas-Bank).
  - Pembatalan pembayaran approved mengembalikan status honor ke `belum_dibayar` dan membalik jurnal terkait.

---

## Kas Keluar Honor
- **Route:** `/admin/ap-honor/kas-keluar` (menu sidebar: group `Keuangan`, item `Kas Keluar Honor`)
- **Kondisi yang ditampilkan:**
  - Judul: `Kas Keluar Honor`. Subjudul: `Pembayaran honor yang sudah dibayar. Buat jurnal Bank Keluar (Debit Utang Honor / Kredit Kas-Bank) untuk setiap kas keluar yang sudah dikonfirmasi ke rekening.`
  - Tombol header: `Dasbor AP` (→ `/admin/ap-honor`).
  - **Memuat:** `Memuat kas keluar...`
  - **Kosong:** `Belum ada pembayaran honor yang disetujui.`
  - **Error:** `Gagal membuat jurnal bank keluar: {msg}`
  - **Sukses:** `Jurnal bank keluar berhasil dibuat.` / `Jurnal bank keluar sudah ada untuk hutang pajak ini.` (pesan dari endpoint pajak, dipakai bersama).
- **Komponen/field yang tampil:**
  - KPI:
    - `Total pembayaran` (jumlah baris).
    - `Belum dijurnal` — jumlah baris + nominal.
    - `Sudah dijurnal` — jumlah baris + nominal.
  - Panel filter: `Periode` (select bulan) dan tombol `Reset filter`.
  - Tabel dengan kolom `Nomor`, `Tanggal`, `Metode`, `Line`, `Total`, `Jurnal Bank Keluar`.
    - Kolom `Jurnal Bank Keluar` memuat tombol `Buat Bank Keluar` (saat proses `Membuat...`) atau badge `Belum dijurnal` (amber) bila pengguna tidak memiliki privilege untuk membuat jurnal.
- **Aksi yang bisa dilakukan:**
  - Memuat daftar → **GET `/api/keuangan/ap-honor/kas-keluar`**.
  - Filter periode → daftar dimuat ulang.
  - `Buat Bank Keluar` → **POST `/api/keuangan/settlement/bank-keluar`** dengan badan `{ pembayaran_id }`.
- **Validasi & pesan error:**
  - `Gagal membuat jurnal bank keluar: {msg}` ditampilkan pada kartu error.
  - `Jurnal bank keluar sudah ada untuk hutang pajak ini.` ditampilkan bila jurnal untuk sumber tersebut sudah pernah dibuat.
- **Peran & syarat akses:**
  - `frontend/src/routes.js` → privilege `["Ledger/Keuangan", "Lihat"]`.
  - `backend/routes/api.php` → `GET /api/keuangan/ap-honor/kas-keluar`: `privilege:Ledger/Keuangan,Lihat`; `POST /api/keuangan/settlement/bank-keluar`: `privilege:Ledger/Keuangan,Tambah`.
- **Catatan penting:**
  - Kolom `Line` adalah jumlah line item honor pada pembayaran.
  - Kolom `Jurnal Bank Keluar` menampilkan nomor jurnal bila sudah ada; sumber jurnal settlement ditampilkan pada panel `SettlementJournalPanel` di layar detail pembayaran.

---

## Riwayat Pembayaran Honor
- **Route:** `/admin/ap-honor/history` (menu sidebar: group `Keuangan`, item `Riwayat Pembayaran`)
- **Kondisi yang ditampilkan:**
  - Judul: `Riwayat Pembayaran Honor`.
  - Tombol header: `Dasbor AP` (→ `/admin/ap-honor`) dan `Bayar Honor Baru` (→ `/admin/ap-honor/list`).
  - **Memuat:** `Memuat riwayat pembayaran...`
  - **Kosong:** `Tidak ada pembayaran.`
  - **Error:** `Gagal memuat riwayat pembayaran: {msg}`
- **Komponen/field yang tampil:**
  - KPI: `Total draft` + `{n} pembayaran`, `Total disetujui` + `{n} pembayaran`, `Total dibatalkan` + `{n} pembayaran`.
  - Panel filter:
    - Select `Status` dengan opsi `Semua status`, `Draft`, `Disetujui`, `Dibatalkan`.
    - Select `Periode` (filter bulan).
    - Tombol `Reset`.
  - Tabel dengan kolom `Nomor`, `Tanggal`, `Metode`, `Status`, `Line`, `Total`, `Validasi`, `Dibuat oleh`, `Aksi`.
    - Badge `Validasi` (`ValidasiBadge`): `✓ Sesuai` atau `! Total tidak sesuai` dengan title `Total pembayaran tidak sama dengan jumlah line item honor`.
    - Tombol `Edit` pada kolom `Aksi` — nonaktif bila total tidak konsisten, dengan title `Total pembayaran tidak sesuai jumlah line item — batalkan pembayaran ini lalu buat ulang`.
- **Aksi yang bisa dilakukan:**
  - Memuat riwayat → **GET `/api/keuangan/ap-honor/payments`** dengan query filter `status` dan `periode`.
  - Filter → daftar dimuat ulang.
  - `Reset` → filter dikosongkan dan daftar dimuat ulang.
  - Klik baris tabel → navigasi ke `/admin/ap-honor/payment/{id}`.
  - `Edit` → navigasi ke `/admin/ap-honor/bayar?edit={id}`.
- **Validasi & pesan error:**
  - `Gagal memuat riwayat pembayaran: {msg}` pada kartu error.
  - Server: `Filter periode harus diisi lengkap (tahun dan bulan).` dengan detail `['tahun' => ['tahun dan bulan harus diisi bersama-sama.']]`.
- **Peran & syarat akses:**
  - `frontend/src/routes.js` → privilege `["Ledger/Keuangan", "Lihat"]`.
  - `backend/routes/api.php` → `privilege:Ledger/Keuangan,Lihat`.
- **Catatan penting:**
  - `Validasi` membandingkan `total_nominal` pembayaran dengan jumlah `nominal_neto` line item honor; pembayaran yang tidak selaras tidak dapat disetujui.
  - Status pembayaran: `draft`, `disetujui`, `dibatalkan`.

---

## Hutang Pajak PPh 21
- **Route:** `/admin/hutang-pajak` (menu sidebar: group `Keuangan`, item `Hutang Pajak`)
- **Kondisi yang ditampilkan:**
  - Judul: `Hutang Pajak PPh 21`. Subjudul: `Tracking hutang PPh 21 yang dipotong dari honor Surveior/Verifikator/Rekomendator.`
  - **Memuat:** memuat KPI, filter, dan tabel dari dua endpoint.
  - **Kosong:** `Tidak ada data hutang pajak.`
  - **Error:** `Gagal membuat jurnal bank keluar: {msg}`
  - **Sukses:** `Jurnal bank keluar berhasil dibuat.` / `Jurnal bank keluar sudah ada untuk hutang pajak ini.`
- **Komponen/field yang tampil:**
  - KPI: `Total Belum Dibayar` ({n} item), `Dibayar Bulan Ini` ({n} item), `Jumlah Item`, `Total Keseluruhan`.
  - Panel filter:
    - Input cari label `Cari NPWP / Nama / No. Pembayaran`, placeholder `Ketik untuk mencari...`.
    - Select `Status` dengan opsi `Semua`, `Belum Dibayar`, `Sudah Dibayar`.
    - Select `Periode Pemotongan`.
    - Tombol `Reset`.
  - Baris ringkasan filter: `{n} belum dibayar · {rp}` dan `{n} sudah dibayar · {rp}`.
  - Tabel dengan kolom `NPWP`, `Nama Wajib Pajak`, `No. Pembayaran Honor`, `Tgl Pemotongan`, `DPP`, `Tarif (%)`, `PPh 21`, `Jatuh Tempo`, `Status`, `Jurnal Bank Keluar`.
    - Kolom `Jurnal Bank Keluar` memuat tombol `Buat Bank Keluar`.
    - Label status: `Belum Dibayar`, `Sudah Dibayar`.
- **Aksi yang bisa dilakukan:**
  - Memuat daftar → **GET `/api/keuangan/hutang-pajak`** (query `status`, `periode`, `q`).
  - Memuat KPI → **GET `/api/keuangan/hutang-pajak/dashboard`**.
  - Filter → daftar dimuat ulang.
  - `Buat Bank Keluar` → **POST `/api/keuangan/settlement/bank-keluar-pajak`** dengan badan `{ hutang_pajak_id }`.
  - Klik baris → navigasi ke `/admin/hutang-pajak/{id}`.
- **Validasi & pesan error:**
  - `Gagal membuat jurnal bank keluar: {msg}` pada kartu error.
  - `Jurnal bank keluar sudah ada untuk hutang pajak ini.` bila jurnal untuk hutang pajak tersebut sudah pernah dibuat.
- **Peran & syarat akses:**
  - `frontend/src/routes.js` → privilege `["Ledger/Keuangan", "Lihat"]`.
  - `backend/routes/api.php` → `GET /api/keuangan/hutang-pajak` dan `/dashboard`: `privilege:Ledger/Keuangan,Lihat`; `POST /api/keuangan/settlement/bank-keluar-pajak`: `privilege:Ledger/Keuangan,Tambah`.
- **Catatan penting:**
  - Hutang PPh 21 dibuat otomatis oleh `HutangPajakService::createFromPembayaran()` ketika pembayaran honor disetujui, untuk setiap penerima dengan PPh > 0.
  - Jatuh tempo hutang pajak = akhir bulan berikutnya (per `HutangPajakService`).
  - `Tarif (%)` adalah tarif efektif yang dipakai `HutangPajakService::effectiveTariff()` (bracket 5 / 10 / 15 / 25 persen).
  - PPN **tidak** muncul di layar ini: PPN adalah pajak OUTPUT yang dipungut dari Faskes melalui invoice, bukan dipotong dari honor.

---

## Detail Hutang Pajak (Hutang PPh 21)
- **Route:** `/admin/hutang-pajak/:id` (menu sidebar: hidden, `hideInSidebar`; item `Detail Hutang Pajak`)
- **Kondisi yang ditampilkan:**
  - Judul: `Hutang PPh 21` dengan badge status di sampingnya. Subjudul: `{nama_wajib_pajak} · NPWP: {npwp}`.
  - **Memuat:** memuat detail hutang pajak.
  - **Tidak ditemukan:** `Hutang pajak tidak ditemukan.`
  - **Sudah dibayar:** kartu `Nilai` menampilkan `Tgl Dibayar`, `Dibayar oleh`, `Catatan`, dan tombol `Lihat Bukti Setor`.
- **Komponen/field yang tampil:**
  - Kartu `Detail Hutang Pajak`: `Jenis Pajak` (nilai `PPh Pasal 21 Bukan Pegawai`), `NPWP`, `Nama WP`, `No. Pembayaran Honor`, `Tgl Pemotongan`, `DPP (50% × bruto)`, `Tarif Efektif` ({tarif}%), `Jatuh Tempo`, `Dibuat oleh`.
  - Kartu `Nilai`: `Hutang PPh 21 ke Ditjen Pajak`; bila sudah dibayar juga `Tgl Dibayar`, `Dibayar oleh`, `Catatan`, `Lihat Bukti Setor`.
  - Kartu `Pembayaran Honor Terkait`: `No. Pembayaran`, `Tanggal`, `Total Dibayar`; tabel `Penerima`, `ID Ledger`, `Netto Dibayar`.
  - Form `Tandai Lunas — Setor ke Ditjen Pajak`:
    - `Tanggal Setor *` (input date).
    - `Bukti Setor` — input file dengan keterangan `JPG, PNG, atau PDF. Maks 5 MB.`
    - `Catatan` — placeholder `Catatan setor pajak (opsional)`.
    - Tombol `Tandai Lunas` (saat proses `Menyimpan...`).
  - Panel `Jurnal Setor PPh 21` (`SettlementJournalPanel`, `refType = settlement_ap_pajak`).
    - Pesan saat belum ada jurnal: `Setor PPh 21 ke Ditjen Pajak ini belum diposting ke buku besar. Klik tombol di bawah untuk membuat jurnal Bank Keluar (Debit Utang PPh 21 / Kredit Kas-Bank).`
    - Tombol `Buat Bank Keluar` (saat proses `Membuat jurnal...`), dan badge `Sudah dijurnal ({n})` bila sudah ada.
  - Tombol `← Kembali`.
- **Aksi yang bisa dilakukan:**
  - Memuat detail → **GET `/api/keuangan/hutang-pajak/{id}`**.
  - `Tandai Lunas` → **POST `/api/keuangan/hutang-pajak/{id}/lunas`** dengan `FormData` berisi `tanggal_setor`, `bukti_setor` (file), `catatan`.
  - `Buat Bank Keluar` (di panel jurnal) → **POST `/api/keuangan/settlement/bank-keluar-pajak`** dengan badan `{ hutang_pajak_id }`.
  - `Lihat Bukti Setor` → membuka berkas bukti setor.
  - `← Kembali` → kembali ke daftar hutang pajak.
- **Validasi & pesan error:**
  - Client (Zod): `Tanggal wajib diisi`.
  - Server (`HutangPajakService::markAsPaid`): `Hutang pajak tidak ditemukan.`; `Sudah lunas.`
  - Server (`HutangPajakController::show`): `Hutang pajak tidak ditemukan.` (404).
- **Peran & syarat akses:**
  - `frontend/src/routes.js` → privilege `["Ledger/Keuangan", "Lihat"]`.
  - `backend/routes/api.php` → `GET /api/keuangan/hutang-pajak/{id}`: `privilege:Ledger/Keuangan,Lihat`; `POST /api/keuangan/hutang-pajak/{id}/lunas`: `privilege:Ledger/Keuangan,Ubah`; `POST /api/keuangan/settlement/bank-keluar-pajak`: `privilege:Ledger/Keuangan,Tambah`.
- **Catatan penting:**
  - `DPP (50% × bruto)` = dasar pengenaan pajak PPh 21 Bukan Pegawai, yaitu 50% dari honor bruto.
  - `Tarif Efektif` yang ditampilkan berasal dari `HutangPajakService::effectiveTariff()`, bukan tarif progresif `HonorCalculator::hitungPPhProgresif()` — kedua himpunan bracket berbeda di dalam kode (lihat Catatan Penting pada Bukti Potong PPh Pasal 21).
  - Jurnal setor PPh 21 dibuat eksplisit (Debit Utang PPh 21 / Kredit Kas-Bank), tidak otomatis saat menandai lunas.

---

## Dasbor Rekonsiliasi
- **Route:** `/admin/rekonsiliasi` (menu sidebar: group `Keuangan`, item `Rekonsiliasi`)
- **Kondisi yang ditampilkan:**
  - Judul: `Dasbor Rekonsiliasi`. Subjudul: `Pemasukan − Honor Surveior & Verifikator · PRD FR-5.4`.
  - **Memuat:** `Memuat...`
  - **Kosong (tabel):** `Belum ada data rekonsiliasi.`
  - **Error:** `Gagal memuat data: {msg}`
- **Komponen/field yang tampil:**
  - Panel filter: `Dari Tanggal`, `Sampai Tanggal`, tombol `Terapkan Filter`, tombol `Reset`.
  - KPI:
    - `Total Pemasukan` dengan sub-teks `{dari} s/d {sampai}` atau `Semua waktu` bila tidak ada filter tanggal.
    - `Honor Surveior (Bruto)` dengan sub-teks `Belum dipotong pajak`.
    - `Honor Verifikator (Bruto)`.
    - `Total Honor` dengan sub-teks `PPN: {rp} · PPh: {rp}`.
  - Blok highlight `LABA PROYEK (Pemasukan − Total Honor)` dengan nilai `MARGIN` (indikator ▲/▼) dan `{n} siklus aktif`.
  - KPI pajak: `Total Potongan PPN` dengan sub-teks `Pajak OUTPUT yang dipungut dari honor`; `Total Potongan PPh 21` dengan sub-teks `Dipotong langsung dari honor penerima`.
  - Tabel `Rekonsiliasi Per Faskes ({n} Faskes)` dengan kolom `Faskes`, `Tipe`, `Jml Siklus`, `Pemasukan`, `Honor Surveior`, `Honor Verifikator`, `Total Honor`, `Laba`, `Margin`.
- **Aksi yang bisa dilakukan:**
  - Memuat data → **GET `/api/dasbor/rekonsiliasi`** dengan query `dari` dan `sampai` (format tanggal).
  - `Terapkan Filter` → memuat ulang dengan rentang tanggal terpilih.
  - `Reset` → menghapus rentang tanggal dan memuat ulang seluruh periode.
- **Validasi & pesan error:**
  - `Gagal memuat data: {msg}` pada kartu error.
  - Server (`ReconciliationService::resolveTanggal()`) menentukan rentang default bila parameter tanggal tidak dikirim.
- **Peran & syarat akses:**
  - `frontend/src/routes.js` → privilege `["Dasbor Eksekutif", "Lihat"]`.
  - `backend/routes/api.php` → `privilege:Dasbor Eksekutif,Lihat`.
- **Catatan penting:**
  - `Pemasukan` = Σ `nominal_neto` dari ledger entry bertipe `piutang_lunas`, `penyesuaian_pks`, dan `refund`.
  - `Total Honor` = Σ `nominal_bruto` dari `ap_honor_surveior` dan `ap_honor_verifikator` (`ReconciliationService::honorTotal()`).
  - `Laba` = Pemasukan − Total Honor; `Margin` = Laba ÷ Pemasukan × 100.
  - Rekomendasi **tidak** dihitung pada KPI total honor di layar ini (hanya Surveior + Verifikator), meski entry rekomendator tetap tercatat di ledger.
  - Sub-teks `Pajak OUTPUT yang dipungut dari honor` pada `Total Potongan PPN` — di sisi akuntansi PPN adalah pajak output yang dibebankan ke Faskes lewat invoice.

---

## Bukti Potong PPh Pasal 21
- **Route:** `/admin/bukti-potong` (menu sidebar: group `Keuangan`, item `Bukti Potong PPh`)
- **Kondisi yang ditampilkan:**
  - Judul: `Bukti Potong PPh Pasal 21`. Subjudul: `Penerbitan bukti potong pajak per periode · Format ekspor BP21 untuk Coretax DJP (FR-5.8 + FR-5.9)`.
  - **Memuat:** memuat rekap periode.
  - **Kosong (daftar):** `Tidak ada entry honor pada periode ini.`
  - **Kosong (gap):** `Semua tenaga ahli pada periode ini sudah memiliki identitas pajak lengkap.`
  - **Alert gap:** `{n} tenaga ahli belum siap export — lihat tab "Gap NPWP" untuk detail & lengkapi via Master Tenaga Ahli.`
  - **Alert ekspor gagal:** `Gagal mengekspor XML: {msg}`
- **Komponen/field yang tampil:**
  - Panel filter: `Tahun` (opsi 2024–2027) dan `Bulan` (`Januari` … `Desember`).
  - KPI: `Periode`, `Jumlah Penerima`, `Total Bruto`, `Total Pot. PPN`, `Total Pot. PPh 21`, `Total Neto`.
  - Tombol `Ekspor XML BP21 (Coretax)` (saat proses `Mengunduh...`).
    - Tooltip/label disabled: `Tidak ada data` atau `Lengkapi identitas pajak (NPWP, PTKP, KPP) terlebih dahulu`.
  - Tab: `Daftar Penerima ({n})` dan `Gap NPWP ({n})`.
  - Tabel rekap (tab Daftar Penerima) kolom: `Penerima`, `NPWP / NIK`, `PTKP`, `KPP`, `Jml Penugasan`, `Total Bruto`, `Pot. PPN`, `Pot. PPh 21`, `Total Neto`, `Status`.
    - Kolom `NPWP / NIK` dan `PTKP` dapat diperluas; rincian per penugasan: `Tanggal`, `Tipe`, `Faskes`, `Bruto`, `Pot. PPN`, `Pot. PPh`, `Neto`.
    - Label `Tipe`: `Surveior` / `Verifikator`.
    - Badge status: `SIAP` atau `GAP`.
  - Tabel gap (tab Gap NPWP) kolom: `Tenaga Ahli`, `Nomor Induk`, `NPWP`, `PTKP`, `KPP`, `Kode Pajak`, `Masalah`, `Total Neto`.
    - Label masalah (`MASALAH_LABEL`): `npwp_dan_nik_kosong` → `NPWP & NIK kosong`; `npwp_placeholder` → `NPWP placeholder (00/11)`; `npwp_tidak_valid` → `NPWP tidak valid`; `nama_pajak_kosong` → `Nama pajak kosong`; `status_ptkp_kosong` → `Status PTKP kosong (BP21)`; `kode_kpp_kosong` → `Kode KPP kosong (BP21)`; `kode_objek_pajak_kosong` → `Kode objek pajak kosong (BP21)`.
- **Aksi yang bisa dilakukan:**
  - Memuat rekap → **GET `/api/keuangan/bukti-potong`** dengan query `periode=YYYY-MM`.
  - Mengubah tahun/bulan → periode dihitung ulang dan data dimuat.
  - `Ekspor XML BP21 (Coretax)` → **GET `/api/keuangan/bukti-potong/export-xml?periode=YYYY-MM`**; hasil diunduh sebagai berkas `Bp21-YYYY-MM.xml` (via `apiBlob` + `saveBlob`).
  - Klik baris rekap → membuka rincian entry honor pada baris tersebut.
  - Beralih tab → menampilkan tabel gap.
- **Validasi & pesan error:**
  - Server (`BuktiPotongController::parsePeriode()`): `Bulan harus antara 1 dan 12.`
  - `Gagal mengekspor XML: {msg}` bila permintaan ekspor gagal.
  - Tombol ekspor disabled bila tidak ada data atau belum ada tenaga ahli yang siap export.
- **Peran & syarat akses:**
  - `frontend/src/routes.js` → privilege `["Ledger/Keuangan", "Lihat"]`.
  - `backend/routes/api.php` → `GET /api/keuangan/bukti-potong`: `privilege:Ledger/Keuangan,Lihat`; `GET /api/keuangan/bukti-potong/export-xml`: `privilege:Ledger/Keuangan,Ekspor`.
- **Catatan penting:**
  - Hanya entry honor dengan `status_pembayaran = 'lunas'` yang masuk rekap bukti potong (`BuktiPotongService::loadEntries()`).
  - Syarat "siap export" (`isNpwpSiapPakai()`): nama pajak ada; NPWP 15–16 digit **atau** NIK 16 digit; prefix NPWP bukan `00`/`11`; `status_ptkp` ada; `kode_kpp` ada; `kode_objek_pajak` ada.
  - Format XML BP21 (Coretax DJP): satu elemen `<Bp21>` per entry honor lunas; TIN = NPWP lembaga; `Rate` = (potongan PPh ÷ bruto) × 100; `Document` = `Surat Tugas` (diprioritaskan), `Kontrak`, atau `Penugasan`; KPP diisi 6 digit dengan nol di depan.
  - Perbedaan tarif PPh yang ada di kode: `HonorCalculator::hitungPPhProgresif()` memakai bracket PP 58/2023 (5/15/25/30/35 persen atas DPP 50% × bruto), sedangkan `HutangPajakService::effectiveTariff()` memakai bracket 5/10/15/25 persen. Keduanya dipakai pada layar berbeda.

---

## Buku Besar Ledger
- **Route:** `/admin/ledger-journal` (menu sidebar: group `Keuangan`, item `Ledger Journal`)
- **Kondisi yang ditampilkan:**
  - Judul: `Buku Besar Ledger`. Subjudul: `Seluruh Ledger Entry Fase 1–2 tertelusuri · PRD AC-6`.
  - **Memuat:** `Memuat...`
  - **Kosong:** `Belum ada data ledger entry.`
  - **Modal detail:** `Detail Ledger Entry`.
  - **Audit trail kosong:** `Tidak ada audit trail.`
- **Komponen/field yang tampil:**
  - Panel filter:
    - Select `Tipe` dengan opsi `Semua Tipe`, `Piutang Lunas`, `Honor Surveior`, `Honor Verifikator`, `Penyesuaian PKS`, `Refund`.
    - `Dari` dan `Sampai` (tanggal), `Status Bayar` dengan opsi `Semua`, `Lunas`, `Belum Dibayar`, `Sebagian`.
    - Input cari label `Cari`, placeholder `Nama TA, ID...`.
    - Tombol `Filter` dan `Reset`.
  - Baris `Saldo Awal Periode: {rp}`.
  - Tabel dengan kolom `Tanggal`, `Tipe`, `Faskes`, `Penerima`, `Debit (Honor)`, `Credit (Pemasukan)`, `Saldo`, `AC-7`, `Status`, `(Detail →)`.
    - Label tipe: `Piutang Lunas`, `Honor Surveior`, `Honor Verifikator`, `Penyesuaian PKS`, `Refund`.
    - Label status: `Lunas`, `Belum Dibayar`, `Sebagian`.
    - Badge AC-7: `✓ AC-7` atau `! SELISIH {rp}`.
  - Paginasi: `← Prev`, `Halaman {c} / {l} ({t} entry)`, `Next →`.
  - Modal `Detail Ledger Entry`:
    - Blok AC-7: `✓ AC-7 TERPENUHI — Invariant berlaku` atau `✕ AC-7 GAGAL — Selisih terdeteksi!`; kartu nilai `BRUTO`, `− PPN`, `− PPh 21`, `= NETO`.
    - `InfoCards`: `Tipe`, `Status Pembayaran`, `Nominal Bruto`, `Nominal Neto`, `Potongan PPN`, `Potongan PPh 21`.
    - Bagian `TRACE (AC-6)` — daftar langkah bernomor (`urutan`) dengan tiga baris teks: `kejadian`, `sumber`, `detail`.
    - Bagian `SIKLUS / FASKES` dengan baris `Siklus:`, `Faskes:`, `Status:`.
    - Bagian `ENTRY TERKAIT (Siklus Sama)` — entry lain pada siklus yang sama (maksimal 10, `id`, `tipe`, `nominal_neto`, `nominal_bruto`, `penerima_nama`, `created_at`).
    - Bagian `AUDIT TRAIL (AC-6)` — tiap baris menampilkan waktu (`created_at`) dan `aksi`; baris dapat diklik untuk membuka rincian dengan label `Data:` (isi `data_sesudah`), `Source:` (`user_agent`), dan `IP:` (`ip_address`).
    - Kosong: `Tidak ada audit trail.`
- **Aksi yang bisa dilakukan:**
  - Memuat buku besar → **GET `/api/ledger/journal`** dengan query `tipe`, `dari`, `sampai`, `status`, `q`, `faskes_id`, `per_page` (default 25).
  - `Filter` / `Reset` → memuat ulang daftar.
  - Klik `(Detail →)` → memuat detail entry → **GET `/api/ledger/entry/{id}`**.
  - Paginasi `← Prev` / `Next →` → memuat halaman berikutnya.
- **Validasi & pesan error:**
  - Server (`LedgerJournalController::entry`): entry tidak ditemukan → 404 (pesan `findOrFail`).
  - Perhitungan AC-7 di backend: `calculated = round(bruto − ppn − pph, 2)`, `selisih = round(neto − calculated, 2)`, valid bila `selisih === 0.0`; rumus `neto = bruto − PPN − PPh`.
  - Perhitungan AC-7 di frontend (`LedgerJournal.jsx`): `calculated = round((bruto - ppn - pph) * 100)/100`, valid bila `|neto − calculated| < 0.01`.
- **Peran & syarat akses:**
  - `frontend/src/routes.js` → privilege `["Ledger/Keuangan", "Lihat"]`.
  - `backend/routes/api.php` → `GET /api/ledger/journal` dan `GET /api/ledger/entry/{id}` dilindungi `privilege:Ledger/Keuangan,Lihat`.
- **Catatan penting:**
  - Ledger Entry adalah tulang punggung akuntansi: tipe `piutang_lunas`, `ap_honor_surveior`, `ap_honor_verifikator`, `ap_honor_rekomendator`, `penyesuaian_pks`, `refund`.
  - Saldo berjalan dihitung: entry `piutang_lunas` dan `refund` menambah saldo (`nominal_neto`), tipe lain mengurangi (`nominal_bruto`).
  - `Saldo Awal Periode` = saldo kumulatif seluruh entry yang dibuat sebelum tanggal `dari`.
  - AC-6 = jejak audit append-only; setiap entry dapat ditelusuri ke audit trail-nya (aksi, aktor, data sebelum, data sesudah, alamat IP, user agent).
  - Pencarian (`q`) mencocokkan `detail->penugasan_id`, `detail->tenaga_ahli_id`, id entry, nama penerima, dan nama Faskes.

---

## Slip Honorarium
- **Route:** `/admin/slip-honor` (menu sidebar: group `Keuangan`, item `Slip Honorarium`)
- **Kondisi yang ditampilkan:**
  - Judul: `Slip Honorarium`. Subjudul: `Rincian bruto / PPN / PPh / neto per tenaga ahli · PRD AC-7`.
  - **Memuat:** memuat slip untuk periode terpilih.
  - **Kosong:** `Tidak ada slip honorarium untuk periode ini.`
  - **Modal:** `Slip Honorarium` dengan badge `Periode {periode}` dan `{n} penugasan`.
  - **Detail tanpa entry:** server membalas 404 dengan pesan `Tidak ada entry honor untuk periode ini.`
- **Komponen/field yang tampil:**
  - Panel filter: `Tahun` (2024–2027), `Bulan` (`Januari` … `Desember`), tombol `Lihat Data`.
  - KPI: `Periode`, `Jumlah TA`, `Total Bruto`, `Total PPN`, `Total PPh`, `Total Neto`.
  - Tabel slip dengan kolom `Tenaga Ahli`, `Peran`, `Jml Tug.`, `Bruto`, `− PPN`, `− PPh 21`, `= Neto`, `AC-7`, `(Slip →)`; baris footer `GRAND TOTAL`.
  - Modal `Slip Honorarium`:
    - Tabel entry: kolom `Jenis`, `Faskes / Siklus`, `Bruto`, `−PPN`, `−PPh`, `= Neto`, `AC-7`, `Status`; baris footer `TOTAL`.
    - Kotak AC-7: `✓ VERIFIKASI AC-7 LULUS` atau `✕ SELISIH PADA AC-7`, dengan `Rumus: {rumus}` dan `Selisih: {rp}`.
    - Bagian `SNAPSHOT TARIF (saat entry dibuat)` memuat PPN dan PPh 21 `{tarif}% (sejak {tanggal})`.
- **Aksi yang bisa dilakukan:**
  - Memuat daftar slip → **GET `/api/ledger/slip-honor`** dengan query `periode=YYYY-MM`.
  - Mengubah Tahun/Bulan lalu `Lihat Data` → periode dihitung dan daftar dimuat ulang.
  - `(Slip →)` → **GET `/api/ledger/slip-honor/{tenagaAhliId}?periode=YYYY-MM`** untuk memuat rincian satu tenaga ahli.
- **Validasi & pesan error:**
  - Server: `Tidak ada entry honor untuk periode ini.` (404) bila tidak ada entry honor untuk tenaga ahli dan periode tersebut.
  - `parsePeriode()` backend: bila `periode` tidak dalam format `YYYY-MM`, dipakai bulan/tahun berjalan.
  - AC-7: valid bila `selisih === 0.0`; rumus per entry `neto = bruto − PPN − PPh`, rumus total `total_neto = total_bruto − total_PPN − total_PPh`; badge backend `AC-7 VALID` / `AC-7 SELISIH!`.
- **Peran & syarat akses:**
  - `frontend/src/routes.js` → privilege `["Ledger/Keuangan", "Lihat"]`.
  - `backend/routes/api.php` → `GET /api/ledger/slip-honor` dan `GET /api/ledger/slip-honor/{tenagaAhliId}` dilindungi `privilege:Ledger/Keuangan,Lihat`.
- **Catatan penting:**
  - Sumber data = `LedgerEntry` bertipe `ap_honor_surveior`, `ap_honor_verifikator`, `ap_honor_rekomendator` yang punya `penerima_tenaga_ahli_id`, difilter `created_at` di dalam bulan periode.
  - `SNAPSHOT TARIF` adalah tarif pajak yang berlaku saat entry dibuat (disimpan di `detail.tarif_snapshot`), bukan tarif terkini — bandingkan dengan menu Konfigurasi Pajak.
  - `Jml Tug.` = jumlah penugasan (entry) milik tenaga ahli pada periode tersebut.

---

## Konfigurasi Tarif Pajak
- **Route:** `/admin/konfigurasi-pajak` (menu sidebar: group `Keuangan`, item `Konfigurasi Pajak`)
- **Kondisi yang ditampilkan:**
  - Judul: `Konfigurasi Tarif Pajak`. Subjudul: `Master data PPN & PPh Pasal 21 · PRD FR-5.7`.
  - **Memuat:** memuat tarif aktif dan riwayat tarif.
  - **Kosong:** `Belum ada konfigurasi PPN.` / `Belum ada konfigurasi PPh 21.`
  - **Simpan gagal:** pesan error dari server ditampilkan pada kartu error.
- **Komponen/field yang tampil:**
  - Kartu `Tarif Aktif Saat Ini`:
    - `PPN` — nilai `{tarif}%`, sub-teks `Berlaku sejak {tgl}`.
    - `PPh Pasal 21` — nilai `{tarif}%`, sub-teks `Berlaku sejak {tgl}`.
    - Baris `Snapshot tanggal {tgl}`.
    - Catatan: `💡 Mengubah tarif tidak mempengaruhi entry yang sudah tercatat. Entry lama tetap menggunakan tarif saat transaksi dibuat (snapshot).`
  - Kartu `Riwayat Tarif` dengan tombol `Tambah Tarif Baru` (dan `Batal` saat form terbuka).
  - Form `Tambah Pajak Baru` — judul `Tambah Tarif Pajak Baru`, teks `Tarif baru akan berlaku untuk transaksi mulai tanggal yang ditentukan. Tarif lama tidak berubah.`
    - Select `Jenis Pajak *` dengan opsi `PPN (Pajak Pertambahan Nilai)` dan `PPh Pasal 21`.
    - Input `Tarif (%) *` dengan placeholder `Contoh: 11.00`.
    - Input `Berlaku Sejak *` (tanggal).
    - Textarea `Keterangan (opsional)` dengan placeholder `Contoh: PPN naik 12% mulai 1 April 2026`.
    - Blok simulasi `Simulasi contoh honor Rp 2.500.000:` → `PPN {tarif}% = {rp}` dan `PPh 21 {tarif}% = {rp}`.
    - Tombol `Simpan Tarif` (saat proses `Menyimpan...`) dan `Batal`.
  - Dua tabel riwayat (PPN dan PPh 21) dengan kolom `Tarif`, `Berlaku Sejak`, `Keterangan`, `Dibuat Oleh`, `Status`.
    - Badge status: `AKTIF` (tarif terbaru) atau `Histori`.
- **Aksi yang bisa dilakukan:**
  - Memuat tarif aktif → **GET `/api/keuangan/konfigurasi-pajak/aktif`**.
  - Memuat riwayat → **GET `/api/keuangan/konfigurasi-pajak`**.
  - `Tambah Tarif Baru` → membuka form.
  - `Simpan Tarif` → **POST `/api/keuangan/konfigurasi-pajak`** dengan badan `{ jenis_pajak, tarif_persen, berlaku_sejak, keterangan }`.
  - `Batal` → menutup form.
  - Memilih jenis pajak & tarif → blok simulasi menghitung ulang nilai PPN dan PPh 21 atas contoh honor Rp 2.500.000.
- **Validasi & pesan error:**
  - Server (`KonfigurasiPajakController::store`): `jenis_pajak` wajib, harus salah satu dari `ppn`, `pph21`; `tarif_persen` wajib, numerik, min 0, max 100; `berlaku_sejak` wajib, format tanggal; `keterangan` opsional string maksimal 500 karakter.
- **Peran & syarat akses:**
  - `frontend/src/routes.js` → privilege `["Ledger/Keuangan", "Lihat"]`.
  - `backend/routes/api.php` → `GET /api/keuangan/konfigurasi-pajak` dan `/aktif`: `privilege:Ledger/Keuangan,Lihat`; `POST /api/keuangan/konfigurasi-pajak`: `privilege:Ledger/Keuangan,Tambah`.
- **Catatan penting:**
  - Tarif bersifat historis: entri ledger lama **tidak** berubah bila tarif diubah; entri menyimpan snapshot tarif saat transaksi dibuat (lihat `SNAPSHOT TARIF` pada Slip Honorarium).
  - Tarif baru hanya berlaku untuk transaksi dengan tanggal transaksi ≥ `berlaku_sejak`.
  - PPN pada honor bernilai 0 pada implementasi saat ini (`HonorCalculator::hitungHonor()` menetapkan `potongan_ppn = 0.0`); PPN adalah pajak OUTPUT yang dipungut dari Faskes melalui invoice.

---

## Ringkasan alur keuangan (lintas layar)
- **Alur piutang:** invoice terbit → Faskes membayar (Virtual Account / QRIS / Transfer Manual) → bukti pembayaran masuk dengan status `Menunggu` / `Diterima` / `Ditolak` → status invoice diturunkan menjadi `belum_bayar` / `parsial` / `jatuh_tempo` / `lunas` → Kas/Keuangan membuat **Jurnal Bank Masuk** (Debit Bank / Kredit Piutang Usaha 1105) secara manual → entry `piutang_lunas` masuk buku besar.
- **Alur AP honor:** penugasan selesai / verifikasi Final / rekomendator menyetujui → `LedgerService` membuat entry honor (bruto, PPN 0, PPh progresif, neto) dengan status `belum_dibayar` → Kas memilih honor outstanding dan membuat **draft** pembayaran → disetujui → status honor `lunas` → `HutangPajakService` membuat hutang PPh 21 per penerima (jatuh tempo akhir bulan berikutnya) → unggah bukti setor dan tandai lunas → buat **Jurnal Bank Keluar** (Debit Utang Honor / Kredit Kas-Bank; Debit Utang PPh 21 / Kredit Kas-Bank).
- **Alur rekonsiliasi:** `ReconciliationService::kpi()` menghitung pemasukan (Σ `nominal_neto` dari `piutang_lunas` + `penyesuaian_pks` + `refund`), honor (Σ `nominal_bruto` dari `ap_honor_surveior` + `ap_honor_verifikator`), laba, dan margin; tabel per Faskes disediakan oleh `perFaskes()`.
- **Alur bukti potong:** honor berstatus `lunas` pada periode → rekap per tenaga ahli (`rekapPerTenagaAhli()`), cek kesiapan pajak (`isNpwpSiapPakai()`), laporan gap (`gapNpwpPerTenagaAhli()`), ringkasan periode (`ringkasanPeriode()`) → ekspor XML BP21 (`toCoretaxXml()`) untuk diunggah ke Coretax DJP.
- **Nilai default honor** (bila penugasan tidak menentukan): `LedgerService::HONOR_SURVEIOR_DEFAULT = 2_500_000.0`, `LedgerService::HONOR_VERIFIKATOR_DEFAULT = 1_500_000.0`.
- **Perbedaan penulisan yang perlu diketahui pembaca dokumentasi:**
  - Frontend `BuktiPotong.jsx` membaca `data?.ringkasan`, `data?.rekap`, `data?.gap_npwp` dari root respons, sedangkan `BuktiPotongController::rekap()` membungkus payload di dalam kunci `data` (`['data' => ['ringkasan' => …, 'rekap' => …, 'gap_npwp' => …]]`) — perbeda lapisan akses ini perlu diperiksa saat troubleshooting.
  - `HutangPajakService::effectiveTariff()` (bracket 5/10/15/25) berbeda dari `HonorCalculator::hitungPPhProgresif()` (bracket 5/15/25/30/35 atas DPP 50% × bruto) — dipakai di layar berbeda (Ringkasan/Nilai hutang pajak vs nilai PPh pada entry honor).
