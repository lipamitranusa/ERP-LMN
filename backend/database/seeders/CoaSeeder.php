<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CoaSeeder extends Seeder
{
    public function run(): void
    {
        $this->kategori();
        $this->coa();
    }

    private function getDefaultLembagaId(): string
    {
        return \App\Models\Lembaga::query()
            ->orderBy('created_at')
            ->value('id')
            ?? Str::uuid()->toString();
    }

    private function kategori(): void
    {
        $lembagaId = $this->getDefaultLembagaId();
        $kategoriList = [
            ['nama' => 'Pemasukan Lain', 'jenis' => 'pemasukan', 'urutan' => 1],
            ['nama' => 'Pengeluaran Operasional', 'jenis' => 'pengeluaran', 'urutan' => 2],
            ['nama' => 'Pengeluaran Non Operasional', 'jenis' => 'pengeluaran', 'urutan' => 3],
            ['nama' => 'Adjustment / Koreksi', 'jenis' => 'adjustment', 'urutan' => 4],
            // Settlement journals (FR-5.x) — auto-generated dari BuktiPembayaran,
            // PembayaranHonor, dan HutangPajak. Lihat SettlementJournalService.
            ['nama' => 'Bank Masuk (BKM)',       'jenis' => 'bkm', 'urutan' => 9],
            ['nama' => 'Bank Keluar (BKK)',      'jenis' => 'bkk', 'urutan' => 10],
            ['nama' => 'Kas Kecil Masuk (KKM)',  'jenis' => 'kkm', 'urutan' => 11],
            ['nama' => 'Kas Kecil Keluar (KKK)', 'jenis' => 'kkk', 'urutan' => 12],
        ];

        foreach ($kategoriList as $k) {
            \App\Models\KategoriJurnal::withoutGlobalScope('lembaga')->updateOrCreate(
                ['lembaga_id' => $lembagaId, 'nama' => $k['nama']],
                array_merge($k, ['id' => Str::uuid()->toString(), 'is_aktif' => true, 'lembaga_id' => $lembagaId])
            );
        }
    }

    private function coa(): void
    {
        $lembagaId = $this->getDefaultLembagaId();
        $accounts = [
            // ─── AKTIVA LANCAR (kelompok: debit) ────────────────────────────
            ['kode' => '1101', 'nama' => 'Kas', 'jenis' => 'aktiva_lancar', 'kelompok' => 'debit', 'urutan' => 1],
            ['kode' => '1102', 'nama' => 'Bank BCA', 'jenis' => 'aktiva_lancar', 'kelompok' => 'debit', 'urutan' => 2],
            ['kode' => '1103', 'nama' => 'Bank Mandiri', 'jenis' => 'aktiva_lancar', 'kelompok' => 'debit', 'urutan' => 3],
            ['kode' => '1104', 'nama' => 'Bank BRI', 'jenis' => 'aktiva_lancar', 'kelompok' => 'debit', 'urutan' => 4],
            ['kode' => '1105', 'nama' => 'Piutang Usaha', 'jenis' => 'aktiva_lancar', 'kelompok' => 'debit', 'urutan' => 5],
            ['kode' => '1106', 'nama' => 'Piutang Non Usaha', 'jenis' => 'aktiva_lancar', 'kelompok' => 'debit', 'urutan' => 6],
            ['kode' => '1107', 'nama' => 'PPN Dibayar Dimuka', 'jenis' => 'aktiva_lancar', 'kelompok' => 'debit', 'urutan' => 7],
            ['kode' => '1108', 'nama' => 'Uang Muka', 'jenis' => 'aktiva_lancar', 'kelompok' => 'debit', 'urutan' => 8],
            ['kode' => '1109', 'nama' => 'Persediaan Perlengkapan', 'jenis' => 'aktiva_lancar', 'kelompok' => 'debit', 'urutan' => 9],

            // ─── AKTIVA TETAP (kelompok: debit) ────────────────────────────
            ['kode' => '1201', 'nama' => 'Tanah', 'jenis' => 'aktiva_tetap', 'kelompok' => 'debit', 'urutan' => 10],
            ['kode' => '1202', 'nama' => 'Bangunan', 'jenis' => 'aktiva_tetap', 'kelompok' => 'debit', 'urutan' => 11],
            ['kode' => '1203', 'nama' => 'Akumulasi Penyusutan Bangunan', 'jenis' => 'aktiva_tetap', 'kelompok' => 'kredit', 'urutan' => 12],
            ['kode' => '1204', 'nama' => 'Kendaraan', 'jenis' => 'aktiva_tetap', 'kelompok' => 'debit', 'urutan' => 13],
            ['kode' => '1205', 'nama' => 'Akumulasi Penyusutan Kendaraan', 'jenis' => 'aktiva_tetap', 'kelompok' => 'kredit', 'urutan' => 14],
            ['kode' => '1206', 'nama' => 'Peralatan Kantor', 'jenis' => 'aktiva_tetap', 'kelompok' => 'debit', 'urutan' => 15],
            ['kode' => '1207', 'nama' => 'Akumulasi Penyusutan Peralatan', 'jenis' => 'aktiva_tetap', 'kelompok' => 'kredit', 'urutan' => 16],

            // ─── KEWAJIBAN LANCAR (kelompok: kredit) ─────────────────────────
            ['kode' => '2101', 'nama' => 'Utang Usaha', 'jenis' => 'kewajiban_lancar', 'kelompok' => 'kredit', 'urutan' => 20],
            ['kode' => '2102', 'nama' => 'Utang PPh 21', 'jenis' => 'kewajiban_lancar', 'kelompok' => 'kredit', 'urutan' => 21],
            ['kode' => '2103', 'nama' => 'Utang PPh 23', 'jenis' => 'kewajiban_lancar', 'kelompok' => 'kredit', 'urutan' => 22],
            ['kode' => '2104', 'nama' => 'Utang PPN', 'jenis' => 'kewajiban_lancar', 'kelompok' => 'kredit', 'urutan' => 23],
            ['kode' => '2105', 'nama' => 'Beban yang Masih Harus Dibayar', 'jenis' => 'kewajiban_lancar', 'kelompok' => 'kredit', 'urutan' => 24],
            ['kode' => '2106', 'nama' => 'Pendapatan Diterima Dimuka', 'jenis' => 'kewajiban_lancar', 'kelompok' => 'kredit', 'urutan' => 25],
            ['kode' => '2107', 'nama' => 'Utang Honor', 'jenis' => 'kewajiban_lancar', 'kelompok' => 'kredit', 'urutan' => 26],

            // ─── MODAL (kelompok: kredit) ───────────────────────────────────
            ['kode' => '3101', 'nama' => 'Modal Saham', 'jenis' => 'modal', 'kelompok' => 'kredit', 'urutan' => 30],
            ['kode' => '3102', 'nama' => 'Laba Ditahan', 'jenis' => 'modal', 'kelompok' => 'kredit', 'urutan' => 31],
            ['kode' => '3103', 'nama' => 'Laba (Rugi) Tahun Berjalan', 'jenis' => 'modal', 'kelompok' => 'kredit', 'urutan' => 32],

            // ─── PENDAPATAN (kelompok: kredit) ──────────────────────────────
            ['kode' => '4101', 'nama' => 'Pendapatan Survei Akreditasi', 'jenis' => 'pendapatan', 'kelompok' => 'kredit', 'urutan' => 40],
            ['kode' => '4102', 'nama' => 'Pendapatan Konsultasi', 'jenis' => 'pendapatan', 'kelompok' => 'kredit', 'urutan' => 41],
            ['kode' => '4103', 'nama' => 'Pendapatan Pendidikan & Pelatihan', 'jenis' => 'pendapatan', 'kelompok' => 'kredit', 'urutan' => 42],
            ['kode' => '4104', 'nama' => 'Pendapatan Sertifikasi', 'jenis' => 'pendapatan', 'kelompok' => 'kredit', 'urutan' => 43],
            ['kode' => '4201', 'nama' => 'Pendapatan Bunga Bank', 'jenis' => 'pendapatan_lain', 'kelompok' => 'kredit', 'urutan' => 44],
            ['kode' => '4202', 'nama' => 'Pendapatan Lain-Lain', 'jenis' => 'pendapatan_lain', 'kelompok' => 'kredit', 'urutan' => 45],

            // ─── BEBAN (kelompok: debit) ────────────────────────────────────
            ['kode' => '5101', 'nama' => 'Beban Honor Surveior', 'jenis' => 'beban', 'kelompok' => 'debit', 'urutan' => 50],
            ['kode' => '5102', 'nama' => 'Beban Honor Verifikator', 'jenis' => 'beban', 'kelompok' => 'debit', 'urutan' => 51],
            ['kode' => '5103', 'nama' => 'Beban Honor Rekomendator', 'jenis' => 'beban', 'kelompok' => 'debit', 'urutan' => 52],
            ['kode' => '5104', 'nama' => 'Beban PPh 21 Surveior', 'jenis' => 'beban', 'kelompok' => 'debit', 'urutan' => 53],
            ['kode' => '5105', 'nama' => 'Beban transportasi Survei', 'jenis' => 'beban', 'kelompok' => 'debit', 'urutan' => 54],
            ['kode' => '5106', 'nama' => 'Beban Penginapan Survei', 'jenis' => 'beban', 'kelompok' => 'debit', 'urutan' => 55],
            ['kode' => '5107', 'nama' => 'Beban Makan Survei', 'jenis' => 'beban', 'kelompok' => 'debit', 'urutan' => 56],
            ['kode' => '5201', 'nama' => 'Beban Gaji Karyawan', 'jenis' => 'beban', 'kelompok' => 'debit', 'urutan' => 60],
            ['kode' => '5202', 'nama' => 'Beban THR & Bonus', 'jenis' => 'beban', 'kelompok' => 'debit', 'urutan' => 61],
            ['kode' => '5203', 'nama' => 'Beban BPJS Kesehatan', 'jenis' => 'beban', 'kelompok' => 'debit', 'urutan' => 62],
            ['kode' => '5204', 'nема' => 'Beban BPJS Ketenagakerjaan', 'jenis' => 'beban', 'kelompok' => 'debit', 'urutan' => 63],
            ['kode' => '5301', 'nama' => 'Beban Listrik & Air', 'jenis' => 'beban', 'kelompok' => 'debit', 'urutan' => 70],
            ['kode' => '5302', 'nama' => 'Beban Internet & Telepon', 'jenis' => 'beban', 'kelompok' => 'debit', 'urutan' => 71],
            ['kode' => '5303', 'nama' => 'Beban Sewa Kantor', 'jenis' => 'beban', 'kelompok' => 'debit', 'urutan' => 72],
            ['kode' => '5304', 'nama' => 'Beban ATK & Perlengkapan', 'jenis' => 'beban', 'kelompok' => 'debit', 'urutan' => 73],
            ['kode' => '5305', 'nama' => 'Beban Perbaikan & Pemeliharaan', 'jenis' => 'beban', 'kelompok' => 'debit', 'urutan' => 74],
            ['kode' => '5306', 'nama' => 'Beban Hosting & Server', 'jenis' => 'beban', 'kelompok' => 'debit', 'urutan' => 75],
            ['kode' => '5307', 'nama' => 'Beban Transportasi Kantor', 'jenis' => 'beban', 'kelompok' => 'debit', 'urutan' => 76],
            ['kode' => '5308', 'nama' => 'Beban Marketing & Promosi', 'jenis' => 'beban', 'kelompok' => 'debit', 'urutan' => 77],
            ['kode' => '5309', 'nama' => 'Beban Jasa Profesional', 'jenis' => 'beban', 'kelompok' => 'debit', 'urutan' => 78],
            ['kode' => '5310', 'nama' => 'Beban Asuransi', 'jenis' => 'beban', 'kelompok' => 'debit', 'urutan' => 79],
            ['kode' => '5311', 'nama' => 'Beban Penyusutan', 'jenis' => 'beban', 'kelompok' => 'debit', 'urutan' => 80],
            ['kode' => '5312', 'nama' => 'Beban Administrasi Bank', 'jenis' => 'beban', 'kelompok' => 'debit', 'urutan' => 81],
            ['kode' => '5313', 'nama' => 'Beban PPN Tidak Dapat Dikreditkan', 'jenis' => 'beban', 'kelompok' => 'debit', 'urutan' => 82],
            ['kode' => '6101', 'nama' => 'Beban Bunga Pinjaman', 'jenis' => 'beban_lain', 'kelompok' => 'debit', 'urutan' => 90],
            ['kode' => '6102', 'nama' => 'Beban Lain-Lain', 'jenis' => 'beban_lain', 'kelompok' => 'debit', 'urutan' => 91],
        ];

        foreach ($accounts as $a) {
            \App\Models\Coa::withoutGlobalScope('lembaga')->updateOrCreate(
                ['lembaga_id' => $lembagaId, 'kode' => $a['kode']],
                array_merge($a, ['id' => Str::uuid()->toString(), 'is_aktif' => true, 'lembaga_id' => $lembagaId])
            );
        }
    }
}
