<?php

namespace Database\Seeders;

use App\Models\HistoriAntrianPenugasan;
use App\Models\Role;
use App\Models\TenagaAhli;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TenagaAhliSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
            // Surveior TKSDU
            [
                'nomor' => 'NS-0001',
                'nama' => 'dr. Joko Pramono, M.Kes',
                'peran' => 'surveior',
                'jenis' => 'TKSDU',
                'status_aktif' => 'Aktif',
                'status_penugasan_saat_ini' => 'tidak_bertugas',
            ],
            [
                'nomor' => 'NS-0002',
                'nama' => 'drg. Rina Hartati',
                'peran' => 'verifikator',
                'jenis' => null,
                'status_aktif' => 'Aktif',
                'status_penugasan_saat_ini' => 'tidak_bertugas',
            ],
            [
                'nomor' => 'NS-0003',
                'nama' => 'dr. Hendra Kusuma, Sp.MK',
                'peran' => 'surveior',
                'jenis' => 'TKSDU',
                'status_aktif' => 'Aktif',
                'status_penugasan_saat_ini' => 'tidak_bertugas',
            ],

            // Surveior TKPP
            [
                'nomor' => 'NS-0004',
                'nama' => 'dr. Siti Nurhaliza, M.PH',
                'peran' => 'surveior',
                'jenis' => 'TKPP',
                'status_aktif' => 'Aktif',
                'status_penugasan_saat_ini' => 'tidak_bertugas',
            ],
            [
                'nomor' => 'NS-0005',
                'nama' => 'dr. Ahmad Wijaya, Sp.PD',
                'peran' => 'surveior',
                'jenis' => 'TKPP',
                'status_aktif' => 'Aktif',
                'status_penugasan_saat_ini' => 'tidak_bertugas',
            ],

            // Verifikator
            [
                'nomor' => 'NS-0006',
                'nama' => 'drg. Made Dana, M.Kes',
                'peran' => 'verifikator',
                'jenis' => null,
                'status_aktif' => 'Aktif',
                'status_penugasan_saat_ini' => 'tidak_bertugas',
            ],
            [
                'nomor' => 'NS-0007',
                'nama' => 'dr. Fajar Nugroho, M.Ked',
                'peran' => 'verifikator',
                'jenis' => null,
                'status_aktif' => 'Aktif',
                'status_penugasan_saat_ini' => 'tidak_bertugas',
            ],

            // Surveior兼Verifikator (kedua)
            [
                'nomor' => 'NS-0008',
                'nama' => 'dr. Retno Wulandari, Sp.PD-KEMD',
                'peran' => 'kedua',
                'jenis' => 'TKSDU',
                'status_aktif' => 'Aktif',
                'status_penugasan_saat_ini' => 'tidak_bertugas',
            ],
        ];

        // Delete ALL histori first (no FK from tenaga_ahli so no cascade issues)
        DB::table('histori_antrian_penugasan')->delete();
        // Delete ALL tenaga ahli
        DB::table('tenaga_ahli')->delete();

        // NPWP/NIK placeholder untuk seed dev. WAJIB diganti Keuangan via UI
        // sebelum export bukti potong PPh 21 ke Coretax (FR-5.8/5.9).
        // Format placeholder: 15 digit "11.000.NNNN.N-NNN.NNN" — jelas
        // bukan NPWP riil (digit 1-2 = "11" yang bukan KPP valid), supaya
        // tidak lolos validasi Coretax secara tidak sengaja.
        foreach ($data as $idx => $row) {
            $taId = (string) Str::uuid();
            $seq = str_pad((string) ($idx + 1), 4, '0', STR_PAD_LEFT);
            // NPWP format: 15 digit tanpa titik/strip = "11000NNN0NNNNNNN"
            // Stored as VARCHAR(20) to allow future format variants (e.g. "11.000.NNNN.0-NNN.NN").
            // For seeding, use compact format to avoid exceeding column length.
            $dummyNpwp = "11000{$seq}0" . str_pad($seq, 6, '0', STR_PAD_LEFT);

            DB::table('tenaga_ahli')->insert([
                'id' => $taId,
                'nomor_induk_surveior' => $row['nomor'],
                'nama' => $row['nama'],
                'peran' => $row['peran'],
                'jenis' => $row['jenis'],
                'status_aktif' => $row['status_aktif'],
                'status_penugasan_saat_ini' => $row['status_penugasan_saat_ini'],
                'npwp' => $dummyNpwp, // TODO(keuangan): ganti via UI dengan NPWP asli
                'nama_pajak' => $row['nama'], // default ke nama lengkap, bisa dikoreksi UI
                'kode_objek_pajak' => '21-100-01', // honorarium — default untuk PPh 21
            ]);

            // Seed histori antrian for round-robin
            $peranAntrian = $row['peran'] === 'verifikator' ? 'verifikator' : 'surveior';
            DB::table('histori_antrian_penugasan')->insert([
                'id' => (string) Str::uuid(),
                'tenaga_ahli_id' => $taId,
                'peran' => $peranAntrian,
                'nomor_urut' => 0,
                'status_kesediaan' => 'siap',
            ]);
        }
    }
}
