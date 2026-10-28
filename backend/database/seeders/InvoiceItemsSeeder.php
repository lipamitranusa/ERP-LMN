<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class InvoiceItemsSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
[
            'id' => 'ea2649df-11d1-48c4-86c4-f0aa37f0113b',
            'invoice_id' => '01a15c83-221f-7118-8be2-b5835c0a2983',
            'biaya_id' => 'f40e4636-13a8-4231-ab11-68b854bdae3f',
            'nama_biaya' => 'biaya survey klinik',
            'deskripsi' => null,
            'jumlah' => '5000000.00',
            'satuan' => 'per_siklus',
            'tipe' => 'per_siklus',
            'wajib' => true,
            'created_at' => '2026-10-21 10:31:00',
            'updated_at' => '2026-10-21 10:31:00',
        ]
        ];

        foreach ($data as $item) {
            DB::table('invoice_items')->updateOrInsert(
                ['id' => $item['id']],
                $item
            );
        }
    }
}