<?php

namespace Database\Seeders;

use App\Services\Keuangan\MasterAkuntansiService;
use Illuminate\Database\Seeder;

/**
 * Menyalin master akuntansi (COA + kategori jurnal) ke seluruh lembaga.
 *
 * Master akuntansi di-scope per lembaga (unique coa(lembaga_id, kode)), jadi
 * setiap lembaga harus punya salinan sendiri. Seeder Coa/KategoriJurnal hanya
 * mengisi satu lembaga — seeder ini melengkapi sisanya.
 */
class ReplikasiMasterAkuntansiSeeder extends Seeder
{
    public function run(): void
    {
        $svc = app(MasterAkuntansiService::class);
        $results = $svc->replicateToAll();

        foreach ($results as $lembagaId => $r) {
            $this->command?->info(sprintf(
                'Master akuntansi lemma %s: %d akun, %d kategori jurnal (source: %s)',
                substr((string) $lembagaId, 0, 8),
                $r['coa'],
                $r['kategori'],
                $r['source'] ? substr($r['source'], 0, 8) : '—',
            ));
        }
    }
}
