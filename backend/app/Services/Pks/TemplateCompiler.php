<?php

namespace App\Services\Pks;

/**
 * Mengompilasi template PKS: replace [PLACEHOLDER] → {{$variable->path}} lalu render Blade.
 */
class TemplateCompiler
{
    /**
     * Placeholder → Blade expression, plus optional PHP fallback untuk null safety.
     */
    private const REPLACEMENTS = [
        // PKS fields
        '[NOMOR_PKS]'         => '{{ $pks->nomor_pks ?? \'[belum diterbitkan]\' }}',
        '[TANGGAL_PKS]'       => '{{ $pks->tanda_tangan_pada ? $pks->tanda_tangan_pada->translatedFormat(\'d F Y\') : now()->translatedFormat(\'d F Y\') }}',
        '[NAMA_PENANDATANGAN]' => '{{ $pks->nama_penandatangan ?? \'[belum ditandatangani]\' }}',
        '[JABATAN_PENANDATANGAN]' => '{{ $pks->jabatan_penandatangan ?? \'\' }}',
        '[PATH_TANDA_TANGAN_PKS]' => '{{ $pks->path_tanda_tangan ? "<img src=\"".storage_path("app/" . $pks->path_tanda_tangan)."\" style=\"max-height:70px;max-width:200px\"/>" : "" }}',

        // Faskes fields
        '[NAMA_FASKES]'     => '{{ $faskes->nama ?? \'Faskes\' }}',
        '[JENIS_FASKES]'   => '{{ $faskes->jenisFaskes?->nama ?? \'\' }}',
        '[KODE_FASKES]'    => '{{ $faskes->jenisFaskes?->kode ?? \'\' }}',
        '[ALAMAT_FASKES]'  => '{{ $faskes->alamat ?? \'-\' }}',
        '[KOTA_FASKES]'    => '{{ $faskes->kota ?? \'-\' }}',
        '[NO_SERTIFIKAT]'  => '{{ $faskes->no_sertifikat ?? \'-\' }}',
        '[NOMOR_SURAT_FASKES]' => '{{ $faskes->nomor_surat_faskes ?? \'-\' }}',

        // Lembaga fields
        '[NAMA_LEMBAGA]'       => '{{ $lembaga->nama ?? \'Lembaga Penyelenggara Akreditasi\' }}',
        '[ALAMAT_LEMBAGA]'      => '{{ $lembaga->alamat ?? \'-\' }}',
        '[NAMA_PEJABAT_LEMBAGA]'=> '{{ $lembaga->nama_pejabat ?? \'Nama Pejabat Berwenang\' }}',
        '[JABATAN_PEJABAT]'     => '{{ $lembaga->jabatan_pejabat ?? \'\' }}',

        // Helpers
        '[TAHUN_SEKARANG]'  => '{{ now()->year }}',
        '[TAHUN_PKS]'       => '{{ $pks->tanda_tangan_pada ? $pks->tanda_tangan_pada->year : now()->year }}',
        '[HARITANGGAL_SEKARANG]' => '{{ now()->translatedFormat(\'d F Y\') }}',
    ];

    public static function availableVariables(): array
    {
        return [
            [
                'group' => 'Data PKS',
                'items' => [
                    ['placeholder' => '[NOMOR_PKS]',           'label' => 'Nomor PKS'],
                    ['placeholder' => '[TANGGAL_PKS]',        'label' => 'Tanggal PKS (terjemahan)'],
                    ['placeholder' => '[NAMA_PENANDATANGAN]',  'label' => 'Nama Penandatangan'],
                    ['placeholder' => '[JABATAN_PENANDATANGAN]', 'label' => 'Jabatan Penandatangan'],
                    ['placeholder' => '[PATH_TANDA_TANGAN_PKS]', 'label' => 'Gambar Tanda Tangan (HTML)'],
                ],
            ],
            [
                'group' => 'Data Faskes',
                'items' => [
                    ['placeholder' => '[NAMA_FASKES]',        'label' => 'Nama Faskes'],
                    ['placeholder' => '[JENIS_FASKES]',        'label' => 'Jenis / Tipe Faskes'],
                    ['placeholder' => '[KODE_FASKES]',         'label' => 'Kode Jenis Faskes'],
                    ['placeholder' => '[ALAMAT_FASKES]',        'label' => 'Alamat Faskes'],
                    ['placeholder' => '[KOTA_FASKES]',           'label' => 'Kota / Kabupaten'],
                    ['placeholder' => '[NO_SERTIFIKAT]',         'label' => 'No. Sertifikat Lama'],
                    ['placeholder' => '[NOMOR_SURAT_FASKES]',    'label' => 'Nomor Surat Faskes'],
                ],
            ],
            [
                'group' => 'Data Lembaga',
                'items' => [
                    ['placeholder' => '[NAMA_LEMBAGA]',         'label' => 'Nama Lembaga'],
                    ['placeholder' => '[ALAMAT_LEMBAGA]',        'label' => 'Alamat Lembaga'],
                    ['placeholder' => '[NAMA_PEJABAT_LEMBAGA]',  'label' => 'Nama Pejabat Lembaga'],
                    ['placeholder' => '[JABATAN_PEJABAT]',       'label' => 'Jabatan Pejabat'],
                ],
            ],
            [
                'group' => 'Helper',
                'items' => [
                    ['placeholder' => '[TAHUN_SEKARANG]',      'label' => 'Tahun saat ini'],
                    ['placeholder' => '[TAHUN_PKS]',           'label' => 'Tahun PKS'],
                    ['placeholder' => '[HARITANGGAL_SEKARANG]',  'label' => 'Hari, Tanggal saat ini'],
                ],
            ],
        ];
    }

    /**
     * Compile template string: replace [PLACEHOLDER] → Blade expression.
     */
    public function compile(string $template): string
    {
        return str_replace(
            array_keys(self::REPLACEMENTS),
            array_values(self::REPLACEMENTS),
            $template
        );
    }
}
