<?php

namespace Database\Seeders;

use App\Models\AkunPengguna;
use App\Models\BiayaPerJenisFaskes;
use App\Models\Faskes;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Pks;
use App\Models\SiklusAkreditasi;
use Illuminate\Database\Seeder;

class PksSeeder extends Seeder
{
    public function run(): void
    {
        $faskes = Faskes::where('nama', 'RS Demo Faskes')->first();
        if (! $faskes) {
            return;
        }

        $siklus = SiklusAkreditasi::where('faskes_id', $faskes->id)->first();
        if (! $siklus) {
            return;
        }

        // Jika PKS sudah ada, skip
        if (Pks::where('siklus_id', $siklus->id)->exists()) {
            return;
        }

        $admin = AkunPengguna::where('email', 'admin@demo.local')->first();
        $dibuatOleh = $admin?->id;

        $pksId = (string) \Illuminate\Support\Str::uuid();
        $tanggalHariIni = now();
        $tanggalSurvei = $tanggalHariIni->copy()->subDays(20);
        $tanggalDokumen = $tanggalHariIni->copy()->subDays(15);

        $nomorPks = 'PKS/LAM-KES/' . date('Y') . '/0001';

        Pks::updateOrCreate(
            ['siklus_id' => $siklus->id],
            [
                'id' => $pksId,
                'nomor_pks' => $nomorPks,
                'dibuat_oleh' => $dibuatOleh,
                'status' => 'selesai',
                'tanggal_disetujui' => $tanggalHariIni->copy()->subDays(5)->toDateString(),
                'draf_dikirim_pada' => $tanggalSurvei,
                'tanda_tangan_pada' => $tanggalDokumen,
                'nama_penandatangan' => 'dr. John Doe, M.Kes',
                'jabatan_penandatangan' => 'Direktur Utama',
                'nik_penandatangan' => '3171234567890001',
                'path_tanda_tangan' => 'pks/ dummy-signed.pdf',
                'admin_validated_at' => $tanggalHariIni->copy()->subDays(3),
                'admin_validated_by' => $dibuatOleh,
            ]
        );

        $nomorInvoice = 'INV/' . date('Y') . '/00000001';
        $dueDate = $tanggalHariIni->copy()->addDays(30)->toDateString();

        $invoice = Invoice::updateOrCreate(
            ['pks_id' => $pksId],
            [
                'id' => (string) \Illuminate\Support\Str::uuid(),
                'siklus_id' => $siklus->id,
                'nomor_invoice' => $nomorInvoice,
                'total_tagihan' => 0,
                'status' => 'belum_bayar',
                'due_date' => $dueDate,
                'diterbitkan_pada' => $tanggalHariIni->copy()->subDays(3),
                'dibuat_oleh' => $dibuatOleh,
            ]
        );

        $biayas = BiayaPerJenisFaskes::where('jenis_faskes_id', $faskes->jenis_faskes_id)
            ->where('status', 'aktif')
            ->get();

        // Fallback ke RS jika jenis_faskes_id tidak cocok
        if ($biayas->isEmpty()) {
            $rsJenis = \App\Models\JenisFaskes::where('kode', 'RS')->first();
            $biayas = BiayaPerJenisFaskes::where('jenis_faskes_id', $rsJenis?->id)
                ->where('status', 'aktif')
                ->get();
        }

        $totalTagihan = 0;
        foreach ($biayas as $biaya) {
            InvoiceItem::updateOrCreate(
                [
                    'invoice_id' => $invoice->id,
                    'biaya_id' => $biaya->id,
                ],
                [
                    'id' => (string) \Illuminate\Support\Str::uuid(),
                    'nama_biaya' => $biaya->nama_biaya,
                    'deskripsi' => $biaya->deskripsi,
                    'jumlah' => $biaya->jumlah,
                    'satuan' => $biaya->satuan,
                    'tipe' => $biaya->tipe,
                    'wajib' => $biaya->wajib,
                ]
            );
            $totalTagihan += (float) $biaya->jumlah;
        }

        $invoice->update(['total_tagihan' => $totalTagihan]);
    }
}
