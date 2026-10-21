<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Bersihkan semua data transaksi tanpa menyentuh master data atau pengaturan.
     *
     * Urutan: child tables dulu → parent tables terakhir ( FK constraint).
     * Tabel master yang dipertahankan: roles, menu_actions, role_privileges,
     * akun_pengguna, lembaga, jenis_faskes, faskes, tenaga_ahli, biaya_per_jenis_faskes,
     * master_biaya_tenaga_ahli, pks_templates, invoice (hanya master template),
     * konfigurasi_pajak, payment_settings, mail_settings, whatsapp_settings, coa,
     * kategori_jurnal.
     */
    public function up(): void
    {
        // 1. Jurnal umums — detail dulu, header depois
        DB::table('jurnal_umum_detail')->delete();
        DB::table('jurnal_umum')->delete();

        // 2. Pembayaran honor & detailnya
        DB::table('pembayaran_honor_detail')->delete();
        DB::table('pembayaran_honor')->delete();

        // 3. Hutang pajak
        DB::table('hutang_pajak')->delete();

        // 4. Histori perubahan penugasan
        DB::table('histori_pergantian_penugasan')->delete();
        DB::table('histori_antrian_penugasan')->delete();

        // 5. Invoice items & bukti pembayaran
        DB::table('invoice_items')->delete();
        DB::table('bukti_pembayaran')->delete();

        // 6. Refund requests
        DB::table('refund_requests')->delete();

        // 7. Notifikasi tagihan
        DB::table('notifikasi_tagihan')->delete();

        // 8. Verifikasi items & laporan pengerjaan
        DB::table('verifikasi_items')->delete();
        DB::table('laporan_pengerjaan')->delete();

        // 9. Laporan verifikasi — harus sebelum laporan (laporan_id FK)
        DB::table('laporan_verifikasi')->delete();

        // 10. Laporan & surat tugas
        DB::table('surat_tugas')->delete();
        DB::table('laporan')->delete();

        // 11. Laporan kendala (child of penugasan)
        DB::table('laporan_kendala')->delete();

        // 12. Penugasan (child of siklus)
        DB::table('penugasan')->delete();

        // 13. Checklists & revisi dokumen — sebelum dokumen_permohonan
        DB::table('checklist_validasi')->delete();
        DB::table('catatan_revisi')->delete();

        // 14. Dokumen permohonan (child of siklus)
        DB::table('dokumen_permohonan')->delete();

        // 15. Invoice (child of siklus)
        DB::table('invoice')->delete();

        // 16. PKS (child of siklus)
        DB::table('pks')->delete();

        // 17. Ledger entries (child of siklus)
        DB::table('ledger_entries')->delete();

        // 18. Siklus akreditasi — root transaction
        DB::table('siklus_akreditasi')->delete();

        // 19. Audit trail — hapus yang merujuk ke tabel transaksi (keep master-only)
        DB::table('audit_trail')
            ->whereIn('target_type', [
                'siklus_akreditasi', 'pks', 'invoice', 'bukti_pembayaran',
                'penugasan', 'laporan', 'laporan_verifikasi', 'ledger_entries',
                'dokumen_permohonan', 'checklist_validasi', 'catatan_revisi',
                'surat_tugas', 'laporan_kendala', 'verifikasi_items',
                'notifikasi_tagihan', 'refund_requests', 'pembayaran_honor',
                'pembayaran_honor_detail', 'hutang_pajak', 'jurnal_umum',
                'jurnal_umum_detail', 'histori_antrian_penugasan',
                'histori_pergantian_penugasan', 'invoice_items',
                'laporan_pengerjaan',
            ])
            ->delete();
    }

    public function down(): void
    {
        // Data transaksi dihapus secara permanen — tidak ada undo.
    }
};
