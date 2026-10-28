<?php

use App\Http\Controllers\Api\AkunPenggunaController;
use App\Http\Controllers\Api\AdminVerifikasiController;
use App\Http\Controllers\Api\ApHonorController;
use App\Http\Controllers\Api\AuditTrailController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BiayaController;
use App\Http\Controllers\Api\BuktiPembayaranController;
use App\Http\Controllers\Api\BuktiPotongController;
use App\Http\Controllers\Api\ChecklistValidasiController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DokumenPermohonanController;
use App\Http\Controllers\Api\FaskesController;
use App\Http\Controllers\Api\HutangPajakController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\TagihanNotificationController;
use App\Http\Controllers\Api\JenisFaskesController;
use App\Http\Controllers\Api\KonfigurasiPajakController;
use App\Http\Controllers\Api\KonfigurasiPenugasanController;
use App\Http\Controllers\Api\MasterBiayaTenagaAhliController;
use App\Http\Controllers\Api\LaporanKendalaController;
use App\Http\Controllers\Api\LembagaController;
use App\Http\Controllers\Api\MailSettingController;
use App\Http\Controllers\Api\MasterTenagaAhliController;
use App\Http\Controllers\Api\MenuActionController;
use App\Http\Controllers\Api\PaymentSettingController;
use App\Http\Controllers\Api\PenugasanController;
use App\Http\Controllers\Api\PksController;
use App\Http\Controllers\Api\PiutangController;
use App\Http\Controllers\Api\PrivilegeController;
use App\Http\Controllers\Api\AccountingController;
use App\Http\Controllers\Api\LedgerJournalController;
use App\Http\Controllers\Api\ReconciliationController;
use App\Http\Controllers\Api\SlipHonorController;
use App\Http\Controllers\Api\SlipHonorNotificationController;
use App\Http\Controllers\Api\RekomendasiController;
use App\Http\Controllers\Api\RefundController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\SettlementJournalController;
use App\Http\Controllers\Api\SiklusAkreditasiController;
use App\Http\Controllers\Api\SuratTugasController;
use App\Http\Controllers\Api\SuratTugasIssuanceController;
use App\Http\Controllers\Api\TenagaAhliController;
use App\Http\Controllers\Api\VerifikasiWorkspaceController;
use App\Http\Controllers\Api\WhatsAppSettingController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — Sistem ERP Akreditasi Faskes
|--------------------------------------------------------------------------
| Middleware `privilege:{Modul},{Action}` menegakkan AC-10 di back-end.
*/

// Auth — publik
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');

// Auth — setelah login
Route::middleware('auth:sanctum', 'lembaga')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::put('/auth/password', [AuthController::class, 'changePassword']);
    Route::post('/auth/switch-lembaga', [AuthController::class, 'switchLembaga']);

    // Set session['lembaga_id'] dari user yang login — AGAR global scope BelongsToLembaga bekerja
    Route::middleware('lembaga')->group(function () {
        // Endpoint demo untuk verifikasi AC-10 — tersebar di tiap modul.
        // Return shape seragam: daftar modul+action yang berhasil lolos middleware.
        Route::get('/demo', function (Request $request) {
            return response()->json([
                'message' => 'OK',
                'user' => $request->user()?->only(['id', 'email', 'role_id']),
            ]);
        });
    });
});

// Pengaturan Hak Akses (admin)
Route::middleware('auth:sanctum', 'lembaga')->prefix('admin')->group(function () {
    // Role CRUD
    Route::middleware('privilege:Pengaturan Hak Akses,Lihat')
        ->get('/roles', [RoleController::class, 'index']);
    Route::middleware('privilege:Pengaturan Hak Akses,Lihat')
        ->get('/roles/{role}', [RoleController::class, 'show']);
    Route::middleware('privilege:Pengaturan Hak Akses,Tambah')
        ->post('/roles', [RoleController::class, 'store']);
    Route::middleware('privilege:Pengaturan Hak Akses,Ubah')
        ->put('/roles/{role}', [RoleController::class, 'update']);
    Route::middleware('privilege:Pengaturan Hak Akses,Hapus')
        ->delete('/roles/{role}', [RoleController::class, 'destroy']);

    // Menu Actions (read-only — Aksi: Lihat)
    Route::middleware('privilege:Pengaturan Hak Akses,Lihat')
        ->get('/menu-actions', [MenuActionController::class, 'index']);

    // Privilege Matrix
    Route::middleware('privilege:Pengaturan Hak Akses,Lihat')
        ->get('/roles/{role}/privileges', [PrivilegeController::class, 'matrix']);
    Route::middleware('privilege:Pengaturan Hak Akses,Lihat')
        ->get('/privilege-matrix', [PrivilegeController::class, 'matrixAll']);
    Route::middleware('privilege:Pengaturan Hak Akses,Ubah')
        ->put('/roles/{role}/privileges', [PrivilegeController::class, 'update']);

    // Audit trail (Lihat)
    Route::middleware('privilege:Pengaturan Hak Akses,Lihat')
        ->get('/audit-trail', [AuditTrailController::class, 'index']);
});

// Endpoint demo per modul — untuk membuktikan AC-10 di setiap modul
Route::middleware('auth:sanctum', 'lembaga')->group(function () {
    Route::middleware('privilege:Pendaftaran & Validasi Dokumen,Lihat')
        ->get('/faskes-list', fn () => response()->json(['modul' => 'Pendaftaran & Validasi Dokumen', 'data' => []]));

    Route::middleware('privilege:Kontrak & Invoicing,Lihat')
        ->get('/invoice-list', fn () => response()->json(['modul' => 'Kontrak & Invoicing', 'data' => []]));

    Route::middleware('privilege:Penugasan,Lihat')
        ->get('/penugasan-list', fn () => response()->json(['modul' => 'Penugasan', 'data' => []]));

    Route::middleware('privilege:Verifikasi,Lihat')
        ->get('/verifikasi-list', fn () => response()->json(['modul' => 'Verifikasi', 'data' => []]));

    Route::middleware('privilege:Ledger/Keuangan,Lihat')
        ->get('/ledger-list', fn () => response()->json(['modul' => 'Ledger/Keuangan', 'data' => []]));

    Route::middleware('privilege:Dasbor Eksekutif,Lihat')
        ->get('/dashboard', fn () => response()->json(['modul' => 'Dasbor Eksekutif', 'data' => []]));
});

// Akun Pengguna CRUD — dibuat oleh SDM/Admin (NFR-3: tanpa self-registration)
Route::prefix('admin')->middleware(['auth:sanctum', 'lembaga'])->group(function () {
    Route::middleware('privilege:SDM & Siklus Penugasan,Tambah')
        ->get('/akun-pengguna', [AkunPenggunaController::class, 'index']);
    Route::middleware('privilege:SDM & Siklus Penugasan,Tambah')
        ->post('/akun-pengguna', [AkunPenggunaController::class, 'store']);
    Route::middleware('privilege:SDM & Siklus Penugasan,Tambah')
        ->get('/akun-pengguna/{akun}', [AkunPenggunaController::class, 'show'])
        ->whereUuid('akun');
    Route::middleware('privilege:SDM & Siklus Penugasan,Ubah')
        ->put('/akun-pengguna/{akun}', [AkunPenggunaController::class, 'update'])
        ->whereUuid('akun');
    Route::middleware('privilege:SDM & Siklus Penugasan,Hapus')
        ->delete('/akun-pengguna/{akun}', [AkunPenggunaController::class, 'destroy'])
        ->whereUuid('akun');
    Route::middleware('privilege:SDM & Siklus Penugasan,Ubah')
        ->post('/akun-pengguna/{akun}/reset-password', [AkunPenggunaController::class, 'resetPassword']);
});

// =============================================================================
// Modul Pendaftaran & Validasi Dokumen (FR-1.1 s/d FR-1.5)
// Privilege: "Pendaftaran & Validasi Dokumen"
// =============================================================================
Route::prefix('pendaftaran')->middleware(['auth:sanctum', 'lembaga'])->group(function () {
    // Daftar lembaga (dropdown)
    Route::middleware('privilege:Pendaftaran & Validasi Dokumen,Lihat')
        ->get('/lembaga', [SiklusAkreditasiController::class, 'lembaga']);

    // Siklus Akreditasi CRUD
    Route::middleware('privilege:Pendaftaran & Validasi Dokumen,Lihat')
        ->get('/siklus', [SiklusAkreditasiController::class, 'index']);
    Route::middleware('privilege:Pendaftaran & Validasi Dokumen,Tambah')
        ->post('/siklus', [SiklusAkreditasiController::class, 'store']);
    Route::middleware('privilege:Pendaftaran & Validasi Dokumen,Lihat')
        ->get('/siklus/{siklus}', [SiklusAkreditasiController::class, 'show']);
    Route::middleware('privilege:Pendaftaran & Validasi Dokumen,Ubah')
        ->put('/siklus/{siklus}', [SiklusAkreditasiController::class, 'update']);
    Route::middleware('privilege:Pendaftaran & Validasi Dokumen,Hapus')
        ->delete('/siklus/{siklus}', [SiklusAkreditasiController::class, 'destroy']);

    // Dokumen Upload (FR-1.2, FR-1.5)
    Route::middleware('privilege:Pendaftaran & Validasi Dokumen,Lihat')
        ->get('/siklus/{siklus}/dokumen', [DokumenPermohonanController::class, 'index']);
    Route::middleware('privilege:Pendaftaran & Validasi Dokumen,Tambah')
        ->post('/siklus/{siklus}/dokumen', [DokumenPermohonanController::class, 'store']);
    Route::middleware('privilege:Pendaftaran & Validasi Dokumen,Lihat')
        ->get('/dokumen/{dokumen}', [DokumenPermohonanController::class, 'show']);
    Route::middleware('privilege:Pendaftaran & Validasi Dokumen,Lihat')
        ->get('/dokumen/{dokumen}/versions', [DokumenPermohonanController::class, 'versions']);
    Route::middleware('privilege:Pendaftaran & Validasi Dokumen,Lihat')
        ->get('/dokumen/{dokumen}/download', [DokumenPermohonanController::class, 'download']);
    Route::middleware('privilege:Pendaftaran & Validasi Dokumen,Lihat')
        ->get('/dokumen/{dokumen}/serve', [DokumenPermohonanController::class, 'serve']);
    Route::middleware('privilege:Pendaftaran & Validasi Dokumen,Hapus')
        ->delete('/dokumen/{dokumen}', [DokumenPermohonanController::class, 'destroy']);

    // Checklist Validasi (FR-1.3)
    Route::middleware('privilege:Pendaftaran & Validasi Dokumen,Lihat')
        ->get('/siklus/{siklus}/checklist', [ChecklistValidasiController::class, 'index']);
    Route::middleware('privilege:Pendaftaran & Validasi Dokumen,Ubah')
        ->put('/siklus/{siklus}/checklist', [ChecklistValidasiController::class, 'update']);

    // Catatan Revisi (FR-1.4)
    Route::middleware('privilege:Pendaftaran & Validasi Dokumen,Lihat')
        ->get('/siklus/{siklus}/catatan-revisi', [ChecklistValidasiController::class, 'catatanIndex']);
    Route::middleware('privilege:Pendaftaran & Validasi Dokumen,Tambah')
        ->post('/siklus/{siklus}/catatan-revisi', [ChecklistValidasiController::class, 'kirimCatatan']);
    Route::middleware('privilege:Pendaftaran & Validasi Dokumen,Ubah')
        ->patch('/catatan-revisi/{catatan}/baca', [ChecklistValidasiController::class, 'markRead']);
    Route::middleware('privilege:Pendaftaran & Validasi Dokumen,Lihat')
        ->get('/catatan-revisi/unread-count', [ChecklistValidasiController::class, 'unreadCount']);
});

// =============================================================================
// Modul Penugasan (FR-3.1 s/d FR-3.8)
// Privilege: "Penugasan"
// =============================================================================
Route::prefix('penugasan')->middleware(['auth:sanctum', 'lembaga'])->group(function () {
    // Surat Tugas PDF (FR-3.1)
    Route::middleware('privilege:Penugasan,Tambah')
        ->post('/surat-tugas', [SuratTugasController::class, 'store']);
    Route::middleware('privilege:Penugasan,Lihat')
        ->get('/surat-tugas/{surat}', [SuratTugasController::class, 'show']);
    Route::middleware('privilege:Penugasan,Lihat')
        ->get('/surat-tugas/{surat}/download', [SuratTugasController::class, 'download']);
    Route::middleware('privilege:Penugasan,Lihat')
        ->get('/surat-tugas/{surat}/serve', [SuratTugasController::class, 'serve']);

    // Penugasan CRUD
    Route::middleware('privilege:Penugasan,Lihat')
        ->get('/', [PenugasanController::class, 'listAll']);
    Route::middleware('privilege:Penugasan,Lihat')
        ->get('/siklus/active', [PenugasanController::class, 'siklusActive']);
    Route::middleware('privilege:Penugasan,Lihat')
        ->get('/siklus/{siklus}', [PenugasanController::class, 'index']);
    Route::middleware('privilege:Penugasan,Lihat')
        ->get('/saya', [PenugasanController::class, 'myAssignments']);
    Route::middleware('privilege:Penugasan,Tambah')
        ->post('/', [PenugasanController::class, 'store']);
    Route::middleware('privilege:Penugasan,Tambah')
        ->post('/appoint', [PenugasanController::class, 'appoint']);
    Route::middleware('privilege:Penugasan,Ubah')
        ->patch('/{penugasan}/konfirmasi', [PenugasanController::class, 'konfirmasiKesediaan']);
    Route::middleware('privilege:Penugasan,Ubah')
        ->put('/{penugasan}/selesai', [PenugasanController::class, 'selesai']);
    Route::middleware('privilege:Penugasan,Ubah')
        ->post('/{penugasan}/batal', [PenugasanController::class, 'tolak']);
    Route::middleware('privilege:Penugasan,Tambah')
        ->post('/{penugasan}/replace', [PenugasanController::class, 'replace']);
    Route::middleware('privilege:Penugasan,Lihat')
        ->get('/{siklusId}/histori', [PenugasanController::class, 'histori']);
    Route::middleware('privilege:Penugasan,Lihat')
        ->get('/laporan-pengerjaan/{laporan}/download', [PenugasanController::class, 'downloadLaporan']);

    // Kandidat eligible
    Route::middleware('privilege:Penugasan,Lihat')
        ->get('/kandidat/{siklus}/{jenis}', [PenugasanController::class, 'kandidat']);
    Route::middleware('privilege:Penugasan,Lihat')
        ->get('/eligible/{siklusId}/{jenis}', [PenugasanController::class, 'cekEligible']);

    // Kendala / CoI / Force Majeure (FR-3.2)
    Route::middleware('privilege:Penugasan,Lihat')
        ->get('/kendala/saya', [LaporanKendalaController::class, 'saya']);
    Route::middleware('privilege:Penugasan,Lihat')
        ->get('/siklus/{siklus}/kendala', [LaporanKendalaController::class, 'index']);
    Route::middleware('privilege:Penugasan,Ubah')
        ->post('/kendala', [LaporanKendalaController::class, 'store']);
    Route::middleware('privilege:Penugasan,Ubah')
        ->patch('/kendala/{kendala}/proses', [LaporanKendalaController::class, 'proses']);
    Route::middleware('privilege:Penugasan,Lihat')
        ->get('/kendala/{kendala}', [LaporanKendalaController::class, 'show']);
});

// =============================================================================
// Master Biaya Tenaga Ahli (per tipe faskes) — privilege "Master Data"
// =============================================================================
Route::prefix('penugasan/master-biaya')->middleware(['auth:sanctum', 'lembaga'])->group(function () {
    Route::middleware('privilege:Master Data,Lihat')
        ->get('/', [MasterBiayaTenagaAhliController::class, 'index']);
    Route::middleware('privilege:Master Data,Tambah')
        ->post('/', [MasterBiayaTenagaAhliController::class, 'store']);
    Route::middleware('privilege:Master Data,Lihat')
        ->get('/{masterBiaya}', [MasterBiayaTenagaAhliController::class, 'show']);
    Route::middleware('privilege:Master Data,Ubah')
        ->put('/{masterBiaya}', [MasterBiayaTenagaAhliController::class, 'update']);
    Route::middleware('privilege:Master Data,Hapus')
        ->delete('/{masterBiaya}', [MasterBiayaTenagaAhliController::class, 'destroy']);
});

// =============================================================================
// SDM & Siklus Penugasan — queue management & konfigurasi (FR-3.3, FR-3.8)
// Privilege: "SDM & Siklus Penugasan"
// =============================================================================
Route::prefix('sdm')->middleware(['auth:sanctum', 'lembaga'])->group(function () {
    Route::middleware('privilege:SDM & Siklus Penugasan,Ubah')
        ->get('/konfigurasi-penugasan', [KonfigurasiPenugasanController::class, 'index']);
    Route::middleware('privilege:SDM & Siklus Penugasan,Ubah')
        ->put('/konfigurasi-penugasan', [KonfigurasiPenugasanController::class, 'update']);
});

// Admin: daftar siklus untuk dropdown penugasan
Route::prefix('admin')->middleware(['auth:sanctum', 'lembaga'])->group(function () {
    // Dashboard stats — accessible to all authenticated admin
    Route::middleware(['auth:sanctum', 'lembaga'])
        ->get('/dashboard', [DashboardController::class, 'stats']);

    // Siklus untuk dropdown penugasan — siklus di tahap 3+ yang belum ada penugasan aktif
    Route::middleware('privilege:Penugasan,Tambah')
        ->get('/siklus', [SiklusAkreditasiController::class, 'forPenugasan']);

    // Daftar tenaga ahli aktif untuk dropdown
    Route::middleware('privilege:Penugasan,Tambah')
        ->get('/tenaga-ahli', [\App\Http\Controllers\Api\TenagaAhliController::class, 'dropdown']);
});

// =============================================================================
// Modul Verifikasi (FR-4.1 s/d FR-4.6)
// Privilege: "Verifikasi"
// =============================================================================
Route::prefix('verifikasi')->middleware(['auth:sanctum', 'lembaga'])->group(function () {
    // Admin: tunjuk verifikator & terbitkam Surat Tugas (FR-4.1)
    Route::middleware('privilege:Verifikasi,Tambah')
        ->post('/verifikator', [AdminVerifikasiController::class, 'appointVerifikator']);
    Route::middleware('privilege:Verifikasi,Tambah')
        ->post('/surat-tugas', [AdminVerifikasiController::class, 'issueSuratTugas']);
    Route::middleware('privilege:Verifikasi,Lihat')
        ->get('/siklus/{siklus}', [AdminVerifikasiController::class, 'index']);
    Route::middleware('privilege:Verifikasi,Lihat')
        ->get('/elemen-standar', [AdminVerifikasiController::class, 'elemenStandar']);
    Route::middleware('privilege:Verifikasi,Tambah')
        ->post('/items/init', [AdminVerifikasiController::class, 'initItems']);

    // Workspace Verifikator (FR-4.2 s/d FR-4.6)
    Route::middleware('privilege:Verifikasi,Lihat')
        ->get('/workspace/{laporanVerifikasi}', [VerifikasiWorkspaceController::class, 'show']);
    Route::middleware('privilege:Verifikasi,Ubah')
        ->put('/items/{verifikasiItem}/nilai', [VerifikasiWorkspaceController::class, 'updateNilai']);
    Route::middleware('privilege:Verifikasi,Ubah')
        ->put('/items/{verifikasiItem}/nilai-sama', [VerifikasiWorkspaceController::class, 'nilaiSama']);
    Route::middleware('privilege:Verifikasi,Final')
        ->post('/{laporanVerifikasi}/final', [VerifikasiWorkspaceController::class, 'finalize']);
    Route::middleware('privilege:Verifikasi,Lihat')
        ->get('/{laporanVerifikasi}/preview-final', [VerifikasiWorkspaceController::class, 'previewFinal']);
});

// =============================================================================
// Rekomendator — approval setelah Verifikator finalize (sebelum AP honor muncul)
// Privilege: "Rekomendasi" (Setujui = approve/tolak; Lihat = workspace; Ubah = set default)
// =============================================================================
Route::prefix('rekomendasi')->middleware(['auth:sanctum', 'lembaga'])->group(function () {
    Route::middleware('privilege:Rekomendasi,Lihat')
        ->get('/', [RekomendasiController::class, 'index']);
    Route::middleware('privilege:Rekomendasi,Lihat')
        ->get('/history', [RekomendasiController::class, 'history']);
    Route::middleware('privilege:Rekomendasi,Lihat')
        ->get('/{laporanVerifikasi}', [RekomendasiController::class, 'show']);
    Route::middleware('privilege:Rekomendasi,Setujui')
        ->post('/{laporanVerifikasi}/setujui', [RekomendasiController::class, 'setujui']);
    Route::middleware('privilege:Rekomendasi,Setujui')
        ->post('/{laporanVerifikasi}/tolak', [RekomendasiController::class, 'tolak']);
});

// Pengaturan default rekomendator (1 user) — diakses di Pengaturan
Route::prefix('rekomendator')->middleware(['auth:sanctum', 'lembaga'])->group(function () {
    Route::middleware('privilege:Rekomendasi,Lihat')
        ->get('/default', [RekomendasiController::class, 'getDefault']);
    Route::middleware('privilege:Rekomendasi,Lihat')
        ->get('/candidates', [RekomendasiController::class, 'getCandidates']);
    Route::middleware('privilege:Rekomendasi,Ubah')
        ->put('/default', [RekomendasiController::class, 'setDefault']);
});

// =============================================================================
// Modul Kontrak, Invoicing & Pembayaran (FR-2.1 s/d FR-2.8)
// Privilege: "Kontrak & Invoicing"
// =============================================================================
Route::prefix('kontrak')->middleware(['auth:sanctum', 'lembaga'])->group(function () {
    Route::middleware('privilege:Kontrak & Invoicing,Lihat')
        ->get('/', [PksController::class, 'index']);
    // HARUS didefinisikan sebelum '/{pks}' agar '/kontrak/siklus-eligible'
    // tidak tertangkap sebagai route model binding Pks dengan id "siklus-eligible"
    Route::middleware('privilege:Kontrak & Invoicing,Lihat')
        ->get('/siklus-eligible', [PksController::class, 'eligibleSiklus']);
    Route::middleware('privilege:Kontrak & Invoicing,Lihat')
        ->get('/{pks}', [PksController::class, 'show']);
    Route::middleware('privilege:Kontrak & Invoicing,Lihat')
        ->get('/by-siklus/{siklus}', [PksController::class, 'bySiklus']);
    Route::middleware('privilege:Kontrak & Invoicing,Lihat')
        ->get('/{pks}/download', [PksController::class, 'download']);
    Route::middleware('privilege:Kontrak & Invoicing,Lihat')
        ->get('/{pks}/download-docx', [PksController::class, 'downloadDocx']);
    Route::middleware('privilege:Kontrak & Invoicing,Lihat')
        ->get('/{pks}/signed-pdf', [PksController::class, 'downloadSignedPdf']);
    Route::middleware('privilege:Kontrak & Invoicing,Lihat')
        ->get('/{pks}/estimasi-biaya', [PksController::class, 'estimasiBiaya']);
    Route::middleware('privilege:Kontrak & Invoicing,Tambah')
        ->post('/siklus/{siklus}/draf', [PksController::class, 'createDraft']);
    Route::middleware('privilege:Kontrak & Invoicing,Ubah')
        ->patch('/{pks}/nomor-pks', [PksController::class, 'updateNomorPks']);
    Route::middleware('privilege:Kontrak & Invoicing,Ubah')
        ->post('/{pks}/kirim', [PksController::class, 'kirim']);
    Route::middleware('privilege:Kontrak & Invoicing,Ubah')
        ->post('/{pks}/tanda-tangan', [PksController::class, 'tandaTangan']);
    Route::middleware('privilege:Kontrak & Invoicing,Ubah')
        ->post('/{pks}/validate-signed', [PksController::class, 'validateSigned']);
    Route::middleware('privilege:Kontrak & Invoicing,Ubah')
        ->post('/{pks}/tolak-signed', [PksController::class, 'tolakSigned']);

    // FR-5.5: Revisi / batalkan PKS setelah Invoice terbit
    Route::middleware('privilege:Kontrak & Invoicing,Ubah')
        ->post('/{pks}/revisi', [PksController::class, 'revisi']);
    Route::middleware('privilege:Kontrak & Invoicing,Ubah')
        ->post('/{pks}/batalkan', [PksController::class, 'batalkan']);
});

Route::prefix('invoice')->group(function () {
    Route::middleware(['auth:sanctum', 'lembaga'])->group(function () {
        Route::middleware('privilege:Kontrak & Invoicing,Lihat')
            ->get('/{invoice}', [InvoiceController::class, 'show']);
        Route::middleware('privilege:Kontrak & Invoicing,Lihat')
            ->get('/by-siklus/{siklus}', [InvoiceController::class, 'bySiklus']);
        Route::middleware('privilege:Kontrak & Invoicing,Ubah')
            ->post('/{invoice}/bayar-va', [InvoiceController::class, 'bayarVa']);
        Route::middleware('privilege:Kontrak & Invoicing,Ubah')
            ->post('/{invoice}/bayar-qris', [InvoiceController::class, 'bayarQris']);
        Route::middleware('privilege:Kontrak & Invoicing,Tambah')
            ->post('/{invoice}/bukti-manual', [InvoiceController::class, 'uploadBuktiManual']);

    // Tagihan notification: generate / preview / send ke faskes
    Route::middleware('privilege:Kontrak & Invoicing,Lihat')
        ->get('/{invoice}/tagihan/generate', [TagihanNotificationController::class, 'generate']);
    Route::middleware('privilege:Kontrak & Invoicing,Lihat')
        ->get('/{invoice}/tagihan/preview', [TagihanNotificationController::class, 'preview']);
    Route::middleware('privilege:Kontrak & Invoicing,Ubah')
        ->post('/{invoice}/tagihan/send', [TagihanNotificationController::class, 'send']);
        Route::middleware('privilege:Kontrak & Invoicing,Lihat')
            ->get('/{invoice}/bukti', [BuktiPembayaranController::class, 'byInvoice']);
    });

    // Webhook publik (signature-verified, bukan privilege-checked)
    Route::post('/webhook/midtrans', [InvoiceController::class, 'webhookMidtrans']);
    Route::post('/webhook/notification', [InvoiceController::class, 'webhook']);
    Route::post('/webhook', [InvoiceController::class, 'webhook']);
});

Route::prefix('payment-settings')->middleware(['auth:sanctum', 'lembaga'])->group(function () {
    Route::middleware('privilege:Kontrak & Invoicing,Ubah')
        ->get('/', [PaymentSettingController::class, 'index']);
    Route::middleware('privilege:Kontrak & Invoicing,Ubah')
        ->get('/kategori/{kategori}', [PaymentSettingController::class, 'byKategori']);
    Route::middleware('privilege:Kontrak & Invoicing,Ubah')
        ->put('/', [PaymentSettingController::class, 'update']);
    Route::middleware('privilege:Kontrak & Invoicing,Ubah')
        ->post('/test-connection', [PaymentSettingController::class, 'testConnection']);
});

Route::prefix('mail-settings')->middleware(['auth:sanctum', 'lembaga'])->group(function () {
    Route::middleware('privilege:Pengaturan Hak Akses,Ubah')
        ->get('/', [MailSettingController::class, 'index']);
    Route::middleware('privilege:Pengaturan Hak Akses,Ubah')
        ->get('/kategori/{kategori}', [MailSettingController::class, 'byKategori']);
    Route::middleware('privilege:Pengaturan Hak Akses,Ubah')
        ->put('/', [MailSettingController::class, 'update']);
    Route::middleware('privilege:Pengaturan Hak Akses,Ubah')
        ->post('/test-connection', [MailSettingController::class, 'testConnection']);
});

Route::prefix('whatsapp-settings')->group(function () {
    // Settings — authenticated
    Route::middleware(['auth:sanctum', 'lembaga', 'privilege:Pengaturan Hak Akses,Ubah'])->group(function () {
        Route::get('/', [WhatsAppSettingController::class, 'index']);
        Route::put('/', [WhatsAppSettingController::class, 'update']);
        Route::post('/test-connection', [WhatsAppSettingController::class, 'testConnection']);
        Route::post('/test-send', [WhatsAppSettingController::class, 'testSend']);
    });

    // Webhook — public (verified by token)
    Route::post('/webhook', [WhatsAppSettingController::class, 'webhook']);
    Route::get('/webhook', [WhatsAppSettingController::class, 'webhook']);
});

Route::prefix('bukti')->middleware(['auth:sanctum', 'lembaga'])->group(function () {
    Route::middleware('privilege:Kontrak & Invoicing,Lihat')
        ->get('/antrian', [BuktiPembayaranController::class, 'antrianMenunggu']);
    // Histori pembayaran lintas invoice (audit penerimaan kas dari Faskes)
    Route::middleware('privilege:Kontrak & Invoicing,Lihat')
        ->get('/histori', [BuktiPembayaranController::class, 'histori']);
    Route::middleware('privilege:Kontrak & Invoicing,Lihat')
        ->get('/{bukti}', [BuktiPembayaranController::class, 'show']);
    Route::middleware('privilege:Kontrak & Invoicing,Lihat')
        ->get('/{bukti}/view', [BuktiPembayaranController::class, 'view']);
    Route::middleware('privilege:Kontrak & Invoicing,Lihat')
        ->get('/{bukti}/download', [BuktiPembayaranController::class, 'download']);
    Route::middleware('privilege:Kontrak & Invoicing,Setujui')
        ->post('/{bukti}/verifikasi', [BuktiPembayaranController::class, 'verifikasi']);
});

Route::prefix('refund')->middleware(['auth:sanctum', 'lembaga'])->group(function () {
    Route::middleware('privilege:Kontrak & Invoicing,Tambah')
        ->post('/invoice/{invoice}', [RefundController::class, 'store']);
    Route::middleware('privilege:Kontrak & Invoicing,Setujui')
        ->get('/pending', [RefundController::class, 'pending']);
    Route::middleware('privilege:Kontrak & Invoicing,Setujui')
        ->post('/{refund}/approve', [RefundController::class, 'approve']);
    Route::middleware('privilege:Kontrak & Invoicing,Setujui')
        ->post('/{refund}/reject', [RefundController::class, 'reject']);
    Route::middleware('privilege:Kontrak & Invoicing,Setujui')
        ->post('/{refund}/execute', [RefundController::class, 'execute']);
});

// =============================================================================
// Penerbitan Surat Tugas Survei (FR-2.4 v2.2 — tanpa tunggu Invoice Paid)
// Privilege: "Penugasan"
// =============================================================================
Route::prefix('surat-tugas')->middleware(['auth:sanctum', 'lembaga'])->group(function () {
    Route::middleware('privilege:Penugasan,Tambah')
        ->post('/terbit', [SuratTugasIssuanceController::class, 'issue']);
});

// =============================================================================
// Dasbor Piutang (FR-5.4, FR-2.4 catatan risiko v2.2)
// Berjalan independen dari alur penugasan — sumber kebenaran status piutang
// adalah status Invoice, BUKAN status penugasan/survei.
// Privilege: "Dasbor Eksekutif" (Direktur/Keuangan) + "Kontrak & Invoicing"
//            (Admin Lembaga sesuai matriks Bab 5.6)
// =============================================================================
Route::prefix('piutang')->middleware(['auth:sanctum', 'lembaga'])->group(function () {
    Route::middleware('privilege:Dasbor Eksekutif,Lihat')
        ->get('/dasbor', [PiutangController::class, 'dasbor']);
    Route::middleware('privilege:Dasbor Eksekutif,Lihat')
        ->get('/kpi', [PiutangController::class, 'kpi']);
    Route::middleware('privilege:Dasbor Eksekutif,Lihat')
        ->get('/aging', [PiutangController::class, 'aging']);
    Route::middleware('privilege:Dasbor Eksekutif,Lihat')
        ->get('/{id}', [PiutangController::class, 'show']);
});

Route::prefix('master')->middleware(['auth:sanctum', 'lembaga'])->group(function () {
    // Master Data: Lembaga Akreditasi
    Route::middleware('privilege:Master Data,Lihat')
        ->get('/lembaga', [LembagaController::class, 'index']);
    Route::middleware('privilege:Master Data,Lihat')
        ->get('/lembaga/{lembaga}', [LembagaController::class, 'show']);
    Route::middleware('privilege:Master Data,Tambah')
        ->post('/lembaga', [LembagaController::class, 'store']);
    Route::middleware('privilege:Master Data,Ubah')
        ->put('/lembaga/{lembaga}', [LembagaController::class, 'update']);
    Route::middleware('privilege:Master Data,Hapus')
        ->delete('/lembaga/{lembaga}', [LembagaController::class, 'destroy']);

    // Master Data: Jenis Faskes
    Route::middleware('privilege:Master Data,Lihat')
        ->get('/jenis-faskes', [JenisFaskesController::class, 'index']);
    Route::middleware('privilege:Master Data,Lihat')
        ->get('/jenis-faskes/{jenisFaskesId}', [JenisFaskesController::class, 'show']);
    Route::middleware('privilege:Master Data,Tambah')
        ->post('/jenis-faskes', [JenisFaskesController::class, 'store']);
    Route::middleware('privilege:Master Data,Ubah')
        ->put('/jenis-faskes/{jenisFaskesId}', [JenisFaskesController::class, 'update']);
    Route::middleware('privilege:Master Data,Hapus')
        ->delete('/jenis-faskes/{jenisFaskesId}', [JenisFaskesController::class, 'destroy']);

    // Master Data: Biaya per Jenis Faskes
    Route::middleware('privilege:Master Data,Lihat')
        ->get('/biaya', [BiayaController::class, 'index']);
    Route::middleware('privilege:Master Data,Lihat')
        ->get('/biaya/by-jenis', [BiayaController::class, 'byJenis']);
    Route::middleware('privilege:Master Data,Lihat')
        ->get('/biaya/jenis-faskes', [BiayaController::class, 'jenisFaskesDropdown']);
    Route::middleware('privilege:Master Data,Lihat')
        ->get('/biaya/{biaya}', [BiayaController::class, 'show']);
    Route::middleware('privilege:Master Data,Tambah')
        ->post('/biaya', [BiayaController::class, 'store']);
    Route::middleware('privilege:Master Data,Ubah')
        ->put('/biaya/{biaya}', [BiayaController::class, 'update']);
    Route::middleware('privilege:Master Data,Hapus')
        ->delete('/biaya/{biaya}', [BiayaController::class, 'destroy']);

    // Master Data: Faskes (Institusi Kesehatan)
    Route::middleware('privilege:Master Data,Lihat')
        ->get('/faskes', [FaskesController::class, 'index']);
    Route::middleware('privilege:Master Data,Lihat')
        ->get('/faskes/dropdown', [FaskesController::class, 'dropdown']);
    Route::middleware('privilege:Master Data,Lihat')
        ->get('/faskes/template', [FaskesController::class, 'template']);
    Route::middleware('privilege:Master Data,Tambah')
        ->post('/faskes/import', [FaskesController::class, 'import']);
    Route::middleware('privilege:Master Data,Lihat')
        ->get('/faskes/{faskes}', [FaskesController::class, 'show']);
    Route::middleware('privilege:Master Data,Tambah')
        ->post('/faskes', [FaskesController::class, 'store']);
    Route::middleware('privilege:Master Data,Ubah')
        ->put('/faskes/{faskes}', [FaskesController::class, 'update']);
    Route::middleware('privilege:Master Data,Hapus')
        ->delete('/faskes/{faskes}', [FaskesController::class, 'destroy']);

    // Master Data: Akun Pengguna
    Route::middleware('privilege:Master Data,Lihat')
        ->get('/akun', [AkunPenggunaController::class, 'index']);
    Route::middleware('privilege:Master Data,Lihat')
        ->get('/akun/template', [AkunPenggunaController::class, 'template']);
    Route::middleware('privilege:Master Data,Tambah')
        ->post('/akun/import', [AkunPenggunaController::class, 'import']);
    // Constrain {akun} ke UUID format agar URL yang mengandung JSON/object
    // (mis. hasil bug frontend) langsung 404 di routing, tidak sampai controller
    Route::middleware('privilege:Master Data,Lihat')
        ->get('/akun/{akun}', [AkunPenggunaController::class, 'show'])
        ->whereUuid('akun');
    Route::middleware('privilege:Master Data,Tambah')
        ->post('/akun', [AkunPenggunaController::class, 'store']);
    Route::middleware('privilege:Master Data,Ubah')
        ->put('/akun/{akun}', [AkunPenggunaController::class, 'update'])
        ->whereUuid('akun');
    Route::middleware('privilege:Master Data,Hapus')
        ->delete('/akun/{akun}', [AkunPenggunaController::class, 'destroy'])
        ->whereUuid('akun');
    Route::middleware('privilege:Master Data,Ubah')
        ->post('/akun/{akun}/reset-password', [AkunPenggunaController::class, 'resetPassword'])
        ->whereUuid('akun');

    // Master Data: PKS Template
    Route::middleware('privilege:Master Data,Lihat')
        ->get('/pks-templates', [\App\Http\Controllers\Api\PksTemplateController::class, 'index']);
    Route::middleware('privilege:Master Data,Lihat')
        ->get('/pks-templates/{pksTemplate}', [\App\Http\Controllers\Api\PksTemplateController::class, 'show']);
    Route::middleware('privilege:Master Data,Tambah')
        ->post('/pks-templates', [\App\Http\Controllers\Api\PksTemplateController::class, 'store']);
    Route::middleware('privilege:Master Data,Ubah')
        ->put('/pks-templates/{pksTemplate}', [\App\Http\Controllers\Api\PksTemplateController::class, 'update']);
    Route::middleware('privilege:Master Data,Hapus')
        ->delete('/pks-templates/{pksTemplate}', [\App\Http\Controllers\Api\PksTemplateController::class, 'destroy']);
    Route::middleware('privilege:Master Data,Ubah')
        ->post('/pks-templates/{pksTemplate}/reset', [\App\Http\Controllers\Api\PksTemplateController::class, 'resetToDefault']);
    Route::middleware('privilege:Master Data,Lihat')
        ->get('/pks-templates/{pksTemplate}/preview-pdf', [\App\Http\Controllers\Api\PksTemplateController::class, 'previewPdf']);

    // Master Data: Tenaga Ahli
    Route::middleware('privilege:Master Data,Lihat')
        ->get('/tenaga-ahli', [MasterTenagaAhliController::class, 'index']);
    Route::middleware('privilege:Master Data,Lihat')
        ->get('/tenaga-ahli/template', [MasterTenagaAhliController::class, 'template']);
    Route::middleware('privilege:Master Data,Tambah')
        ->post('/tenaga-ahli/import', [MasterTenagaAhliController::class, 'import']);
    Route::middleware('privilege:Master Data,Tambah')
        ->post('/tenaga-ahli', [MasterTenagaAhliController::class, 'store']);
    Route::middleware('privilege:Master Data,Ubah')
        ->put('/tenaga-ahli/{tenagaAhli}', [MasterTenagaAhliController::class, 'update']);
    Route::middleware('privilege:Master Data,Hapus')
        ->delete('/tenaga-ahli/{tenagaAhli}', [MasterTenagaAhliController::class, 'destroy']);
});

// Public endpoint: logo lembaga (bypass auth — logo image is not sensitive)
// <img> tag tidak bisa kirim cookie/session, jadi endpoint ini public.
Route::get('/master/lembaga/{lembaga}/logo', [LembagaController::class, 'getLogo']);

// Opsi pemilih lembaga di header. Tanpa privilege "Master Data,Lihat"
// supaya role Rekomendator tetap bisa melihat lembaga aktifnya.
Route::middleware(['auth:sanctum', 'lembaga'])
    ->get('/lembaga-opsi', [LembagaController::class, 'opsi']);

// =============================================================================
// Modul Keuangan — Konfigurasi Pajak (FR-5.7), Bukti Potong (FR-5.8/5.9),
// Dasbor Rekonsiliasi (FR-5.4), PKS Adjustment (FR-5.5)
// =============================================================================
Route::prefix('keuangan')->middleware(['auth:sanctum', 'lembaga'])->group(function () {
    // Konfigurasi Pajak (master data PPN & PPh21)
    Route::middleware('privilege:Ledger/Keuangan,Lihat')
        ->get('/konfigurasi-pajak', [KonfigurasiPajakController::class, 'index']);
    Route::middleware('privilege:Ledger/Keuangan,Lihat')
        ->get('/konfigurasi-pajak/aktif', [KonfigurasiPajakController::class, 'aktif']);
    Route::middleware('privilege:Ledger/Keuangan,Lihat')
        ->get('/konfigurasi-pajak/{konfigurasiPajak}', [KonfigurasiPajakController::class, 'show']);
    Route::middleware('privilege:Ledger/Keuangan,Tambah')
        ->post('/konfigurasi-pajak', [KonfigurasiPajakController::class, 'store']);
    Route::middleware('privilege:Ledger/Keuangan,Ubah')
        ->put('/konfigurasi-pajak/{konfigurasiPajak}', [KonfigurasiPajakController::class, 'update']);

    // Bukti Potong PPh 21 per periode
    Route::middleware('privilege:Ledger/Keuangan,Lihat')
        ->get('/bukti-potong', [BuktiPotongController::class, 'rekap']);
    Route::middleware('privilege:Ledger/Keuangan,Lihat')
        ->get('/bukti-potong/gap-report', [BuktiPotongController::class, 'gapReport']);
    Route::middleware('privilege:Ledger/Keuangan,Ekspor')
        ->get('/bukti-potong/export-xml', [BuktiPotongController::class, 'exportXml']);

    // AP Honor Surveior/Verifikator (FR-5.2/5.3 + operasional AP)
    Route::middleware('privilege:Ledger/Keuangan,Lihat')
        ->get('/ap-honor/dashboard', [ApHonorController::class, 'dashboard']);
    Route::middleware('privilege:Ledger/Keuangan,Lihat')
        ->get('/ap-honor/outstanding', [ApHonorController::class, 'outstanding']);
    Route::middleware('privilege:Ledger/Keuangan,Lihat')
        ->get('/ap-honor/payments', [ApHonorController::class, 'payments']);
    Route::middleware('privilege:Ledger/Keuangan,Lihat')
        ->get('/ap-honor/payments/{id}', [ApHonorController::class, 'showPayment']);
    // Kas Keluar — daftar pembayaran honor yang sudah dibayar + status jurnalnya
    Route::middleware('privilege:Ledger/Keuangan,Lihat')
        ->get('/ap-honor/kas-keluar', [ApHonorController::class, 'kasKeluar']);
    Route::middleware('privilege:Ledger/Keuangan,Tambah')
        ->post('/ap-honor/payments', [ApHonorController::class, 'createPayment']);
    Route::middleware('privilege:Ledger/Keuangan,Ubah')
        ->patch('/ap-honor/payments/{id}', [ApHonorController::class, 'updatePayment']);
    Route::middleware('privilege:Ledger/Keuangan,Setujui')
        ->post('/ap-honor/payments/{id}/approve', [ApHonorController::class, 'approvePayment']);
    Route::middleware('privilege:Ledger/Keuangan,Ubah')
        ->post('/ap-honor/payments/{id}/cancel', [ApHonorController::class, 'cancelPayment']);

    // Hutang PPh 21
    Route::middleware('privilege:Ledger/Keuangan,Lihat')
        ->get('/hutang-pajak/dashboard', [HutangPajakController::class, 'dashboard']);
    Route::middleware('privilege:Ledger/Keuangan,Lihat')
        ->get('/hutang-pajak', [HutangPajakController::class, 'index']);
    Route::middleware('privilege:Ledger/Keuangan,Lihat')
        ->get('/hutang-pajak/{id}', [HutangPajakController::class, 'show']);
    Route::middleware('privilege:Ledger/Keuangan,Ubah')
        ->post('/hutang-pajak/{id}/lunas', [HutangPajakController::class, 'markLunas']);

    // Accounting / CA
    Route::middleware('privilege:Ledger/Keuangan,Lihat')
        ->get('/accounting/dashboard', [AccountingController::class, 'dashboard']);
    Route::middleware('privilege:Ledger/Keuangan,Lihat')
        ->get('/accounting/coa', [AccountingController::class, 'coaIndex']);
    Route::middleware('privilege:Ledger/Keuangan,Tambah')
        ->post('/accounting/coa', [AccountingController::class, 'coaStore']);
    Route::middleware('privilege:Ledger/Keuangan,Ubah')
        ->put('/accounting/coa/{id}', [AccountingController::class, 'coaUpdate']);
    Route::middleware('privilege:Ledger/Keuangan,Hapus')
        ->delete('/accounting/coa/{id}', [AccountingController::class, 'coaDestroy']);
    Route::middleware('privilege:Ledger/Keuangan,Lihat')
        ->get('/accounting/kategori', [AccountingController::class, 'kategoriIndex']);
    Route::middleware('privilege:Ledger/Keuangan,Tambah')
        ->post('/accounting/kategori', [AccountingController::class, 'kategoriStore']);
    Route::middleware('privilege:Ledger/Keuangan,Ubah')
        ->put('/accounting/kategori/{id}', [AccountingController::class, 'kategoriUpdate']);
    Route::middleware('privilege:Ledger/Keuangan,Hapus')
        ->delete('/accounting/kategori/{id}', [AccountingController::class, 'kategoriDestroy']);
    Route::middleware('privilege:Ledger/Keuangan,Lihat')
        ->get('/accounting/jurnal', [AccountingController::class, 'jurnalIndex']);
    Route::middleware('privilege:Ledger/Keuangan,Lihat')
        ->get('/accounting/jurnal/{id}', [AccountingController::class, 'jurnalShow']);
    Route::middleware('privilege:Ledger/Keuangan,Tambah')
        ->post('/accounting/jurnal', [AccountingController::class, 'jurnalStore']);
    Route::middleware('privilege:Ledger/Keuangan,Tambah')
        ->post('/accounting/auto-jurnal', [AccountingController::class, 'autoJurnalStore']);
    Route::middleware('privilege:Ledger/Keuangan,Hapus')
        ->delete('/accounting/jurnal/{id}', [AccountingController::class, 'jurnalDestroy']);
    Route::middleware('privilege:Ledger/Keuangan,Lihat')
        ->get('/accounting/buku-besar', [AccountingController::class, 'bukuBesar']);
    Route::middleware('privilege:Ledger/Keuangan,Lihat')
        ->get('/accounting/buku-besar/{coaId}', [AccountingController::class, 'bukuBesarDetail']);

    // Settlement Journal — jurnal otomatis pelunasan AP/AR (Dr Bank, Cr Piutang/Hutang)
    Route::middleware('privilege:Ledger/Keuangan,Lihat')
        ->get('/settlement', [SettlementJournalController::class, 'index']);
    Route::middleware('privilege:Ledger/Keuangan,Lihat')
        ->get('/settlement/settings', [SettlementJournalController::class, 'getSettings']);
    Route::middleware('privilege:Ledger/Keuangan,Lihat')
        ->get('/settlement/source-info', [SettlementJournalController::class, 'sourceInfo']);
    Route::middleware('privilege:Ledger/Keuangan,Lihat')
        ->get('/settlement/{id}', [SettlementJournalController::class, 'show']);
    Route::middleware('privilege:Ledger/Keuangan,Tambah')
        ->post('/settlement/rebuild', [SettlementJournalController::class, 'rebuild']);
    // Bank Masuk dari AR yang sudah dibayarkan — Dr Bank / Cr Piutang Usaha
    Route::middleware('privilege:Ledger/Keuangan,Tambah')
        ->post('/settlement/bank-masuk', [SettlementJournalController::class, 'bankMasuk']);
    // Bank Keluar dari AP honor yang sudah dibayar — Dr Utang Honor / Cr Bank
    Route::middleware('privilege:Ledger/Keuangan,Tambah')
        ->post('/settlement/bank-keluar', [SettlementJournalController::class, 'bankKeluar']);
    // Bank Keluar dari hutang pajak PPh 21 yang sudah dibayar — Dr Utang PPh 21 / Cr Bank
    Route::middleware('privilege:Ledger/Keuangan,Tambah')
        ->post('/settlement/bank-keluar-pajak', [SettlementJournalController::class, 'bankKeluarPajak']);
    Route::middleware('privilege:Ledger/Keuangan,Ubah')
        ->put('/settlement/settings', [SettlementJournalController::class, 'updateSettings']);
});

// Dasbor Rekonsiliasi Direktur (FR-5.4)
Route::prefix('dasbor')->middleware(['auth:sanctum', 'lembaga'])->group(function () {
    Route::middleware('privilege:Dasbor Eksekutif,Lihat')
        ->get('/rekonsiliasi', [ReconciliationController::class, 'snapshot']);
    Route::middleware('privilege:Dasbor Eksekutif,Lihat')
        ->get('/rekonsiliasi/kpi', [ReconciliationController::class, 'kpi']);
    Route::middleware('privilege:Dasbor Eksekutif,Lihat')
        ->get('/rekonsiliasi/per-faskes', [ReconciliationController::class, 'perFaskes']);
});

// Ledger Journal — buku besar lengkap (AC-6 traceability)
Route::prefix('ledger')->middleware(['auth:sanctum', 'lembaga'])->group(function () {
    Route::middleware('privilege:Ledger/Keuangan,Lihat')
        ->get('/journal', [LedgerJournalController::class, 'journal']);
    Route::middleware('privilege:Ledger/Keuangan,Lihat')
        ->get('/entry/{id}', [LedgerJournalController::class, 'entry']);
    Route::middleware('privilege:Ledger/Keuangan,Lihat')
        ->get('/slip-honor', [SlipHonorController::class, 'index']);
    Route::middleware('privilege:Ledger/Keuangan,Lihat')
        ->get('/slip-honor/{tenaga_ahli_id}', [SlipHonorController::class, 'show']);

    // Slip Honor Notification: generate / preview / send (setelah pembayaran disetujui)
    Route::middleware('privilege:Ledger/Keuangan,Lihat')
        ->get('/slip-honor/{pembayaranId}/generate', [SlipHonorNotificationController::class, 'generate']);
    Route::middleware('privilege:Ledger/Keuangan,Lihat')
        ->get('/slip-honor/{pembayaranId}/preview', [SlipHonorNotificationController::class, 'preview']);
    Route::middleware('privilege:Ledger/Keuangan,Ubah')
        ->post('/slip-honor/{pembayaranId}/send', [SlipHonorNotificationController::class, 'send']);
});