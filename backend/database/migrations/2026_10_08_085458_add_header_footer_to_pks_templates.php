<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $templates = DB::table('pks_templates')->get();
        $defaultJudul = [
            '1' => 'Maksud dan Tujuan',
            '2' => 'Ruang Lingkup',
            '3' => 'Pelaksanaan Survei',
            '4' => 'Hak dan Kewajiban PIHAK PERTAMA',
            '5' => 'Hak dan Kewajiban PIHAK KEDUA',
            '6' => 'Pembiayaan',
            '7' => 'Kerahasiaan',
            '8' => 'Perselisihan',
            '9' => 'Jangka Waktu',
            '10' => 'Penutup',
        ];
        foreach ($templates as $t) {
            $kontenRaw = $t->konten;
            if (!$kontenRaw) continue;
            // Decode: handle double-encode (legacy) and single-encode
            $decoded = json_decode($kontenRaw, true);
            if (is_string($decoded)) {
                $decoded = json_decode($decoded, true); // legacy double-encode
            }
            if (!is_array($decoded)) continue;
            // Already new format (has 'pasal' key)?
            if (isset($decoded['pasal'])) continue;
            // Convert flat {pasal1, pasal2...} to structured {header, footer, pasal}
            $pasal = [];
            for ($i = 1; $i <= 10; $i++) {
                $key = "pasal{$i}";
                if (isset($decoded[$key]) && trim((string) $decoded[$key]) !== '') {
                    $pasal[] = [
                        'nomor' => (string) $i,
                        'judul' => $defaultJudul[$i] ?? "Pasal {$i}",
                        'isi' => $decoded[$key],
                    ];
                }
            }
            $struktural = [
                'header' => '',
                'footer' => '',
                'pasal' => $pasal,
            ];
            DB::table('pks_templates')->where('id', $t->id)->update([
                'konten' => json_encode($struktural),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pks_templates', function (Blueprint $table) {
            //
        });
    }
};
