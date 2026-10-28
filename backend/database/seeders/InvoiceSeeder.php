<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class InvoiceSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
[
            'id' => '01a15c83-221f-7118-8be2-b5835c0a2983',
            'pks_id' => '01a15c80-d3f6-72fb-82a9-dba1cb9d1e1c',
            'total_tagihan' => '5000000.00',
            'due_date' => '2026-11-20',
            'status' => 'belum_bayar',
            'siklus_id' => '606704ee-3402-4b29-92a1-5681d57e1769',
            'nomor_invoice' => 'INV/2026/TAS5J6XT',
            'diterbitkan_pada' => '2026-10-21 10:31:00',
            'dibuat_oleh' => 'b9e32c67-40dd-4861-96f1-9dcd185be067',
            'keterangan' => 'Invoice otomatis diterbitkan setelah PKS disetujui.',
            'metode_pembayaran' => null,
            'payment_reference' => null,
            'payment_expired_at' => null,
            'tanggal_lunas' => null,
            'created_at' => '2026-10-21 10:31:00',
            'updated_at' => '2026-10-21 10:31:00',
            'va_bank' => null,
        ]
        ];

        foreach ($data as $item) {
            DB::table('invoice')->updateOrInsert(
                ['id' => $item['id']],
                $item
            );
        }
    }
}