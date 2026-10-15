<?php

namespace Database\Seeders;

use App\Models\AkunPengguna;
use App\Models\BiayaPerJenisFaskes;
use App\Models\BuktiPembayaran;
use App\Models\Faskes;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Lembaga;
use App\Models\Pks;
use App\Models\SiklusAkreditasi;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DummyTransaksiSeeder extends Seeder
{
    public function run(): void
    {
        // ─── 1. Hapus transaksi demo lama (data yang dibuat oleh seeders
        //     sebelumnya: DemoAccountsSeeder, SiklusSeeder, PksSeeder) ──────
        $this->hapusTransaksiDemo();

        // ─── 2. Buat transaksi baru ───────────────────────────────────────
        $lembagaId = Lembaga::first()?->id ?? '00000000-0000-0000-0000-000000000001';
        $adminAkun = AkunPengguna::where('email', 'admin@lembaga.local')->first();
        $dibuatOleh = $adminAkun?->id;

        $faskesList = [
            Faskes::where('nama', 'Klinik Pratama Sejahtera')->first(),
            Faskes::where('nama', 'Puskesmas Kec. Tanah Sereal')->first(),
        ];

        $tahun = date('Y');
        $counterInv = 1;
        $counterPks = 1;

        foreach ($faskesList as $index => $faskes) {
            if (! $faskes) {
                continue;
            }

            $offset = $index * 15; // staggered dates

            // Hapus siklus lama agar bisa dibuat baru (cascade hapus pks, invoice, invoice_items)
            $oldSiklus = SiklusAkreditasi::where('faskes_id', $faskes->id)
                ->where('lembaga_id', $lembagaId)
                ->first();
            if ($oldSiklus) {
                $oldSiklus->delete();
            }

            // Siklus Akreditasi
            $siklus = SiklusAkreditasi::create([
                'id' => (string) Str::uuid(),
                'faskes_id' => $faskes->id,
                'lembaga_id' => $lembagaId,
                'tanggal_pengajuan' => now()->subDays(60 - $offset),
                'tanggal_permohonan_survei' => now()->subDays(55 - $offset),
                'status' => 'aktif',
                'status_kelengkapan' => 'lengkap',
                'tahapan' => 4,
                'created_at' => now()->subDays(60 - $offset),
            ]);

            // PKS (hapusTransaksiDemo sudah hapus PKS lama, aman pakai create)
            $pksId = (string) Str::uuid();
            $nomorPks = sprintf('PKS/LAM-KES/%d/%04d', $tahun, $counterPks++);
            $tanggalPks = now()->subDays(40 - $offset);

            Pks::create([
                'id' => $pksId,
                'siklus_id' => $siklus->id,
                'nomor_pks' => $nomorPks,
                'dibuat_oleh' => $dibuatOleh,
                'status' => 'selesai',
                'tanggal_disetujui' => $tanggalPks->copy()->subDays(5)->toDateString(),
                'draf_dikirim_pada' => $tanggalPks->copy()->subDays(15),
                'tanda_tangan_pada' => $tanggalPks->copy()->subDays(7),
                'nama_penandatangan' => $faskes->nama_pimpinan ?? 'dr. Sample, M.Kes',
                'jabatan_penandatangan' => 'Pimpinan Faskes',
                'nik_penandatangan' => '320123456789000' . ($index + 1),
                'admin_validated_at' => $tanggalPks->copy()->subDays(3),
                'admin_validated_by' => $dibuatOleh,
            ]);

            // Invoice
            $invoiceId = (string) Str::uuid();
            $nomorInvoice = sprintf('INV/%d/%08d', $tahun, $counterInv++);
            $tanggalInvoice = $tanggalPks->copy()->subDays(2);

            $invoice = Invoice::create([
                'id' => $invoiceId,
                'pks_id' => $pksId,
                'siklus_id' => $siklus->id,
                'nomor_invoice' => $nomorInvoice,
                'total_tagihan' => 0,
                'status' => 'belum_bayar',
                'due_date' => $tanggalInvoice->copy()->addDays(30)->toDateString(),
                'diterbitkan_pada' => $tanggalInvoice,
                'dibuat_oleh' => $dibuatOleh,
            ]);

            // Invoice Items
            $biayas = BiayaPerJenisFaskes::where('jenis_faskes_id', $faskes->jenis_faskes_id)
                ->where('status', 'aktif')
                ->get();

            $totalTagihan = 0;
            foreach ($biayas as $biaya) {
                InvoiceItem::create([
                    'id' => (string) Str::uuid(),
                    'invoice_id' => $invoice->id,
                    'biaya_id' => $biaya->id,
                    'nama_biaya' => $biaya->nama_biaya,
                    'deskripsi' => $biaya->deskripsi,
                    'jumlah' => $biaya->jumlah,
                    'satuan' => $biaya->satuan,
                    'tipe' => $biaya->tipe,
                    'wajib' => $biaya->wajib,
                ]);
                $totalTagihan += (float) $biaya->jumlah;
            }

            $invoice->update(['total_tagihan' => $totalTagihan]);

            // Bukti Pembayaran (satu faskes lunas, lainnya belum bayar)
            if ($index === 0) {
                BuktiPembayaran::updateOrCreate(
                    ['invoice_id' => $invoice->id],
                    [
                        'id' => (string) Str::uuid(),
                        'invoice_id' => $invoice->id,
                        'nominal' => $totalTagihan,
                        'metode' => BuktiPembayaran::METODE_TRANSFER,
                        'status_verifikasi' => BuktiPembayaran::STATUS_DITERIMA,
                        'submitted_by' => $dibuatOleh,
                        'tanggal_submit' => $tanggalInvoice->copy()->addDays(5),
                        'tanggal_verifikasi' => $tanggalInvoice->copy()->addDays(6),
                        'diverifikasi_oleh' => $dibuatOleh,
                        'nomor_referensi' => sprintf('BTR/%d/%06d', $tahun, $counterInv),
                        'dari_rekening' => 'BCA 1234567890 a.n. ' . $faskes->nama,
                        'sumber' => BuktiPembayaran::SUMBER_MANUAL,
                    ],
                );

                $invoice->update([
                    'status' => 'lunas',
                    'tanggal_lunas' => $tanggalInvoice->copy()->addDays(6),
                ]);
            }
        }
    }

    private function hapusTransaksiDemo(): void
    {
        // Ambil semua siklus_ids terkait demo faskes lama
        $demoFaskesNames = [
            'RS Demo Faskes',
            'Puskesmas Demo Sehat',
            'Klinik Pratama Demo Medika',
        ];

        $demoFaskesIds = Faskes::whereIn('nama', $demoFaskesNames)->pluck('id')->toArray();

        if (! empty($demoFaskesIds)) {
            $siklusIds = SiklusAkreditasi::whereIn('faskes_id', $demoFaskesIds)->pluck('id')->toArray();

            // Hapus dari tabel child ke parent
            if (! empty($siklusIds)) {
                // cascadeOnDelete di invoice_id otomatis hapus invoice_items
                BuktiPembayaran::whereHas('invoice', fn($q) => $q->whereIn('siklus_id', $siklusIds))->delete();
                Pks::whereIn('siklus_id', $siklusIds)->delete();
                Invoice::whereIn('siklus_id', $siklusIds)->delete();
                SiklusAkreditasi::whereIn('id', $siklusIds)->delete();
            }

            // Hapus demo faskes
            Faskes::whereIn('id', $demoFaskesIds)->delete();
        }

        // Hapus semua akun demo yang berelasi dengan demo faskes (akan di-replace oleh AkunPenggunaSeeder)
        AkunPengguna::whereIn('email', [
            'faskes@demo.local',
            'faskes.puskesmas@demo.local',
            'faskes.klinik@demo.local',
            'admin@demo.local',
            'admin.kedua@demo.local',
            'surveior@demo.local',
            'verifikator@demo.local',
            'sdm@demo.local',
            'direktur@demo.local',
            'keuangan@demo.local',
            'ns-0001@surveyor.demo',
            'ns-0002@surveyor.demo',
            'ns-0003@surveyor.demo',
        ])->delete();

        // Note: tenaga ahli NS-0001/NS-0002/NS-0003 sudah dihapus/direplace
        // oleh TenagaAhliSeeder (yang jalan SEBELUM DummyTransaksiSeeder).
    }
}
