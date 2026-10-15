<?php

namespace App\Services\Pks;

use App\Models\Pks as PksModel;
use App\Models\PksTemplate;
use App\Services\AttachmentService;
use Barryvdh\DomPDF\Facade\Pdf;

class PksPdfGenerator
{
    public function __construct(private AttachmentService $attachment) {}

    public function generate(PksModel $pks): string
    {
        // Only load from DB if siklus isn't already set in memory (e.g., previewPdf sets it via setRelation)
        if (! $pks->relationLoaded('siklus') || $pks->getRelation('siklus') === null) {
            $pks->load(['siklus.faskes', 'siklus.lembaga']);
        }

        $faskes = $pks->siklus->faskes;
        $lembaga = $pks->siklus->lembaga;
        $kode = $faskes->jenisFaskes?->kode ?? '';

        $shared = [
            'pks' => $pks,
            'faskes' => $faskes,
            'lembaga' => $lembaga,
            // PIHAK PERTAMA — pejabat yang menandatangani
            'ppt_nama_pejabat' => $lembaga->nama_pejabat ?? 'Nama Pejabat Berwenang',
            'ppt_jabatan_pejabat' => $lembaga->jabatan_pejabat ?? 'Jabatan',
            // PIHAK KEDUA — pimpinan/pemberi tanda tangan
            'pkh_nama_penandatangan' => $pks->nama_penandatangan ?? $faskes->nama_pimpinan ?? '-',
            'pkh_jabatan' => $pks->jabatan_penandatangan ?? 'Pimpinan',
            // Tentang clause
            'tentang' => 'Pelaksanaan Survei Akreditasi ' . ($faskes->jenisFaskes?->nama ?? 'Fasyankes'),
        ];

        $bladeName = $this->getBladeFallback($kode);
        $pasalVars = $this->buildPasalVariables($kode, $shared);

        $html = view($bladeName, array_merge($shared, $pasalVars))->render();

        $pdf = Pdf::loadHTML($html);
        $filename = "{$pks->id}.pdf";
        $path = $this->attachment->put($pdf->output(), 'pks', $filename);

        return $path;
    }

    /**
     * Build clause variables from DB template or defaults.
     * Returns ['header', 'footer', 'pasal' => [['nomor','judul','isi_compiled'], ...]]
     */
    private function buildPasalVariables(string $kode, array $shared): array
    {
        $pks = $shared['pks'];
        $faskes = $shared['faskes'];
        $lembaga = $shared['lembaga'];

        // Try DB template first
        $jenisFaskesId = $this->getJenisFaskesIdByKode($kode);
        $template = null;
        if ($jenisFaskesId) {
            $template = PksTemplate::getActiveForJenisFaskes($jenisFaskesId);
        }
        if (!$template) {
            $template = PksTemplate::getDefault();
        }

        $konten = $template?->konten;

        // konten is stored as a raw marker-text string
        if (is_string($konten) && trim($konten) !== '') {
            return $this->parseMarkerText($konten, $pks, $faskes, $lembaga);
        }

        // Backward compat: konten was stored as structured array (before marker-text migration)
        if (is_array($konten)) {
            $header = $this->replacePlaceholders($konten['header'] ?? '', $pks, $faskes, $lembaga);
            $footer = $this->replacePlaceholders($konten['footer'] ?? '', $pks, $faskes, $lembaga);
            $pasalList = [];
            foreach ($konten['pasalnya'] ?? [] as $pasal) {
                $isi = $this->replacePlaceholders($pasal['isi'] ?? '', $pks, $faskes, $lembaga);
                $pasalList[] = [
                    'nomor' => $pasal['nomor'] ?? '',
                    'judul' => $pasal['judul'] ?? '',
                    'isi' => $isi,
                ];
            }
            return ['header' => $header, 'footer' => $footer, 'pasal' => $pasalList];
        }

        // Fallback to hardcoded defaults
        $pasalData = $this->getDefaultPasal($kode);
        return $this->compilePasalFlat($pasalData, $shared);
    }

    /**
     * Parse marker-text string into {header, footer, pasalnya} structure.
     * Format:
     *   [HEADER]text[/HEADER]
     *   [PASAL:nomor|judul]isi[/PASAL]
     *   [FOOTER]text[/FOOTER]
     */
    private function parseMarkerText(string $text, $pks, $faskes, $lembaga): array
    {
        $pasalnya = [];

        // Extract HEADER
        $header = '';
        if (preg_match('/\[HEADER\]([\s\S]*?)\[\/HEADER\]/i', $text, $m)) {
            $header = trim($m[1]);
        }

        // Extract FOOTER
        $footer = '';
        if (preg_match('/\[FOOTER\]([\s\S]*?)\[\/FOOTER\]/i', $text, $m)) {
            $footer = trim($m[1]);
        }

        // Extract PASAL blocks: [PASAL:nomor|judul]isi[/PASAL]
        if (preg_match_all(
            '/\[PASAL:(\d+)\|([^\]]*?)\]([\s\S]*?)\[\/PASAL\]/i',
            $text,
            $matches,
            PREG_SET_ORDER
        )) {
            foreach ($matches as $m) {
                $nomor = trim($m[1]);
                $judul = trim($m[2]);
                $isi = trim($m[3]);
                if ($isi !== '') {
                    $pasalnya[] = [
                        'nomor' => $nomor,
                        'judul' => $judul,
                        'isi' => $this->replacePlaceholders($isi, $pks, $faskes, $lembaga),
                    ];
                }
            }
        }

        return [
            'header' => $this->replacePlaceholders($header, $pks, $faskes, $lembaga),
            'footer' => $this->replacePlaceholders($footer, $pks, $faskes, $lembaga),
            'pasal' => $pasalnya,
        ];
    }

    /**
     * Simple str_replace-based placeholder replacement.
     * More reliable than Blade::render() for nested expressions.
     */
    private function replacePlaceholders(string $content, $pks, $faskes, $lembaga): string
    {
        $replacements = [
            '[NOMOR_PKS]'             => $pks->nomor_pks ?? '[belum diterbitkan]',
            '[TANGGAL_PKS]'          => $pks->tanda_tangan_pada
                                            ? $pks->tanda_tangan_pada->translatedFormat('d F Y')
                                            : now()->translatedFormat('d F Y'),
            '[NAMA_PENANDATANGAN]'    => $pks->nama_penandatangan ?? '',
            '[JABATAN_PENANDATANGAN]' => $pks->jabatan_penandatangan ?? '',
            '[NAMA_FASKES]'           => $faskes->nama ?? 'Faskes',
            '[JENIS_FASKES]'          => $faskes->jenisFaskes?->nama ?? '',
            '[KODE_FASKES]'           => $faskes->jenisFaskes?->kode ?? '',
            '[ALAMAT_FASKES]'         => $faskes->alamat ?? '-',
            '[KOTA_FASKES]'           => $faskes->kota ?? '-',
            '[NO_SERTIFIKAT]'         => $faskes->no_sertifikat ?? '-',
            '[NOMOR_SURAT_FASKES]'    => $faskes->nomor_surat_faskes ?? '-',
            '[NAMA_LEMBAGA]'          => $lembaga->nama ?? 'Lembaga Penyelenggara Akreditasi',
            '[ALAMAT_LEMBAGA]'       => $lembaga->alamat ?? '-',
            '[KOTA_LEMBAGA]'          => $lembaga->kota ?? '-',
            '[NAMA_PEJABAT_LEMBAGA]' => $lembaga->nama_pejabat ?? '',
            '[JABATAN_PEJABAT]'      => $lembaga->jabatan_pejabat ?? '',
            '[TAHUN_SEKARANG]'        => (string) now()->year,
            '[TAHUN_PKS]'            => $pks->tanda_tangan_pada
                                            ? (string) $pks->tanda_tangan_pada->year
                                            : (string) now()->year,
            '[HARITANGGAL_SEKARANG]'  => now()->translatedFormat('d F Y'),
        ];

        return str_replace(array_keys($replacements), array_values($replacements), $content);
    }

    /**
     * Fallback: compile flat {pasal1, pasal2...} format for legacy templates.
     */
    private function compilePasalFlat(array $pasalData, array $shared): array
    {
        $pks = $shared['pks'];
        $faskes = $shared['faskes'];
        $lembaga = $shared['lembaga'];
        $pasalList = [];
        $nomor = 1;
        foreach ($pasalData as $key => $isi) {
            $compiled = $this->replacePlaceholders($isi, $pks, $faskes, $lembaga);
            $pasalList[] = [
                'nomor' => (string) $nomor,
                'judul' => $this->defaultJudul($nomor),
                'isi' => $compiled,
            ];
            $nomor++;
        }
        return [
            'header' => '',
            'footer' => '',
            'pasal' => $pasalList,
        ];
    }

    private function defaultJudul(string $n): string
    {
        return match ($n) {
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
            default => "Pasal {$n}",
        };
    }

    private function getDefaultPasal(string $kode): array
    {
        $k = strtolower($kode);
        if (str_contains($k, 'klinik')) {
            return $this->klinikDefaults();
        }
        if (str_contains($k, 'laboratorium') || str_contains($k, 'lab')) {
            return $this->labDefaults();
        }
        if (str_contains($k, 'rumah sakit') || str_contains($k, 'rs')) {
            return $this->rsDefaults();
        }
        if (str_ends_with($k, 'puskesmas')) {
            return $this->pusDefaults();
        }
        return $this->genericDefaults();
    }

    private function klinikDefaults(): array
    {
        return [
            'pasal1' => "Maksud dari perjanjian ini adalah untuk melaksanakan survei akreditasi dalam rangka peningkatan mutu pelayanan dan keselamatan pasien di [JENIS_FASKES].\n\nTujuan perjanjian ini adalah:\n1. Meningkatkan mutu pelayanan [JENIS_FASKES].\n2. Meningkatkan keselamatan pasien.\n3. Memenuhi standar akreditasi nasional (SNARS).\n4. Menjamin keamanan dan kenyamanan pasien.",
            'pasal2' => "1. Pelaksanaan survei akreditasi sesuai standar yang berlaku.\n2. Pembiayaan survei akreditasi termasuk tarif survei, akomodasi, dan transportasi surveior.\n3. Verifikasi hasil survei dan penerbitan rekomendasi ke Kementerian Kesehatan.\n4. Penerbitan Sertifikat Akreditasi bagi [JENIS_FASKES] yang memenuhi standar.",
            'pasal3' => "1. PIHAK KEDUA mengajukan permohonan akreditasi kepada PIHAK PERTAMA dengan memenuhi seluruh persyaratan.\n2. PIHAK PERTAMA akan menugaskan surveior akreditasi yang terakreditasi setelah PIHAK KEDUA memenuhi persyaratan.\n3. Surveior berpedoman pada Standar Akreditasi [JENIS_FASKES] (SNARS), Instrumen Akreditasi, Petunjuk Teknis, dan Kode Etik Surveior yang ditetapkan oleh Kementerian Kesehatan.\n4. Surveior mengirimkan laporan hasil survei melalui Sistem Informasi Nasional Akreditasi Fasyankes (SINAF).\n5. Survei verifikasi dapat dilaksanakan sesuai jadwal yang ditetapkan PIHAK PERTAMA.",
            'pasal4' => "Hak PIHAK PERTAMA:\n1. Mendapatkan akses pemenuhan persyaratan survei akreditasi.\n2. Mendapatkan akses terhadap dokumen pendukung standar akreditasi.\n3. Mendapatkan tarif survei, akomodasi, dan transportasi sesuai peraturan yang berlaku.\n4. Menerbitkan Sertifikat Akreditasi bagi [JENIS_FASKES] yang dinyatakan layak.\n\nKewajiban PIHAK PERTAMA:\n1. Melaksanakan survei akreditasi secara profesional dan sesuai peraturan.\n2. Menugaskan surveior yang kompeten dan tidak memiliki konflik kepentingan.\n3. Menjaga kerahasiaan seluruh informasi dan dokumen yang diperoleh selama survei.",
            'pasal5' => "Hak PIHAK KEDUA:\n1. Mendapatkan informasi lengkap terkait pelaksanaan survei akreditasi.\n2. Mengusulkan pergantian surveior jika terdapat potensi conflict of interest.\n3. Mengajukan penundaan survei dengan alasan force majeure.\n4. Mengajukan banding dan remedial sesuai mekanisme yang ditetapkan.\n5. Mendapatkan Sertifikat Akreditasi jika dinyatakan memenuhi standar.\n6. Mencantumkan status akreditasi untuk keperluan publikasi.\n\nKewajiban PIHAK KEDUA:\n1. Membayar seluruh biaya survei sesuai invoice yang diterbitkan.\n2. Menyediakan akses dan dokumen yang diperlukan untuk keperluan survei.\n3. Memperbaiki temuan survei sesuai tenggat waktu yang ditetapkan.\n4. Menjaga kerahasiaan dokumen akreditasi.",
            'pasal6' => "Survei akreditasi [JENIS_FASKES] dilaksanakan berdasarkan:\n1. Standar Akreditasi [JENIS_FASKES] (SNARS).\n2. Instrumen Akreditasi terbaru yang ditetapkan Kementerian Kesehatan.\n3. Petunjuk Teknis Survei Akreditasi [JENIS_FASKES].\n4. Kode Etik Surveior Akreditasi.",
            'pasal7' => "Biaya akreditasi meliputi tarif survei, akomodasi, dan transportasi surveior yang akan diinformasikan melalui invoice resmi dari PIHAK PERTAMA. Pembayaran dilakukan sesuai tata cara yang ditetapkan.",
            'pasal8' => "Kedua belah pihak sepakat untuk menjaga kerahasiaan seluruh informasi dan dokumen yang dipertukarkan dalam rangka pelaksanaan akreditasi ini, serta tidak menyebarkannya kepada pihak ketiga manapun tanpa persetujuan tertulis dari kedua belah pihak.",
            'pasal9' => "Perjanjian ini berlaku sejak ditandatangani oleh kedua belah pihak dan berlaku sampai diterbitkannya keputusan akreditasi oleh Kementerian Kesehatan RI.",
            'pasal10' => "Hal-hal yang belum atau belum cukup diatur dalam perjanjian ini akan diatur secara musyawarah dalam bentuk annexe/addendum yang merupakan bagian tidak terpisahkan dari perjanjian ini.\n\nDemikian perjanjian ini dibuat dalam rangkap 2 (dua) bermeterai cukup dan masing-masing bermaterai cukup serta ditandatangani oleh kedua belah pihak.",
        ];
    }

    private function labDefaults(): array
    {
        return [
            'pasal1' => "Maksud dari perjanjian ini adalah untuk melaksanakan survei akreditasi dalam rangka peningkatan mutu layanan dan validitas hasil pemeriksaan di [JENIS_FASKES].\n\nTujuan perjanjian ini adalah:\n1. Meningkatkan mutu layanan laboratorium.\n2. Menjamin validitas dan reliabilitas hasil pemeriksaan.\n3. Memenuhi standar akreditasi nasional (SNARS / KARS).\n4. Meningkatkan kepercayaan masyarakat terhadap hasil laboratorium.",
            'pasal2' => "1. Pelaksanaan survei akreditasi laboratorium sesuai standar yang berlaku.\n2. Pembinaan dan evaluasi berkelanjutan terhadap mutu layanan laboratorium.\n3. Verifikasi hasil survei dan penerbitan rekomendasi ke Kementerian Kesehatan.\n4. Penerbitan Sertifikat Akreditasi bagi laboratorium yang memenuhi standar.",
            'pasal3' => "1. PIHAK KEDUA mengajukan permohonan akreditasi kepada PIHAK PERTAMA dengan memenuhi persyaratan.\n2. PIHAK PERTAMA akan menugaskan surveior akreditasi yang terakreditasi setelah PIHAK KEDUA memenuhi persyaratan.\n3. Surveior berpedoman pada Standar Akreditasi [JENIS_FASKES], Instrumen Akreditasi, Petunjuk Teknis Survei Akreditasi, dan Kode Etik Surveior.\n4. Surveior mengirimkan laporan hasil survei melalui Sistem Informasi Nasional Akreditasi Fasyankes (SINAF).\n5. PIHAK PERTAMA menyampaikan rekomendasi hasil survei ke Kementerian Kesehatan untuk penerbitan Sertifikat Akreditasi.\n6. Survei verifikasi dapat dilaksanakan sesuai jadwal yang ditetapkan PIHAK PERTAMA.",
            'pasal4' => "Hak PIHAK PERTAMA:\n1. Mendapatkan akses terhadap dokumen dan data laboratorium.\n2. Mendapatkan tarif survei, akomodasi, dan transportasi sesuai peraturan.\n3. Menerbitkan Sertifikat Akreditasi bagi laboratorium yang memenuhi standar.\n\nKewajiban PIHAK PERTAMA:\n1. Melaksanakan survei akreditasi secara profesional dan independen.\n2. Menugaskan surveior yang kompeten dan tidak memiliki konflik kepentingan.\n3. Menjaga kerahasiaan seluruh informasi dan hasil pemeriksaan yang diperoleh.",
            'pasal5' => "Hak PIHAK KEDUA:\n1. Mendapatkan informasi terkait pelaksanaan survei akreditasi.\n2. Mengusulkan perubahan surveior jika terdapat potensi conflict of interest.\n3. Mengajukan penundaan survei dengan alasan force majeure.\n4. Mengajukan banding dan remedial sesuai mekanisme yang berlaku.\n5. Mendapatkan Sertifikat Akreditasi jika memenuhi standar.\n\nKewajiban PIHAK KEDUA:\n1. Membayar tarif survei, akomodasi, dan transportasi surveior sesuai invoice.\n2. Menyediakan akses dan data laboratorium yang diperlukan untuk survei.\n3. Menjaga kerahasiaan hasil akreditasi.",
            'pasal6' => "Survei akreditasi [JENIS_FASKES] dilaksanakan berdasarkan:\n1. Standar Akreditasi [JENIS_FASKES] (SNARS / KARS).\n2. Instrumen Akreditasi terbaru yang ditetapkan Kementerian Kesehatan.\n3. Petunjuk Teknis Survei Akreditasi [JENIS_FASKES].\n4. Kode Etik Surveior Akreditasi.",
            'pasal7' => "Biaya akreditasi meliputi tarif survei, akomodasi, dan transportasi surveior yang akan diinformasikan melalui invoice resmi dari PIHAK PERTAMA. Pembayaran dilakukan sesuai tata cara yang ditetapkan.",
            'pasal8' => "Kedua belah pihak sepakat untuk menjaga kerahasiaan seluruh informasi dan data laboratorium yang dipertukarkan dalam рамках pelaksanaan akreditasi ini, serta tidak menyebarkannya kepada pihak ketiga tanpa persetujuan tertulis dari kedua belah pihak.",
            'pasal9' => "Perjanjian ini berlaku sejak ditandatangani oleh kedua belah pihak dan berlaku sampai diterbitkannya keputusan akreditasi oleh Kementerian Kesehatan RI.",
            'pasal10' => "Hal-hal yang belum atau belum cukup diatur dalam perjanjian ini akan diatur secara musyawarah dalam bentuk annexe/addendum yang merupakan bagian tidak terpisahkan dari perjanjian ini.\n\nDemikian perjanjian ini dibuat dalam rangkap 2 (dua) bermeterai cukup dan masing-masing ditandatangani oleh kedua belah pihak.",
        ];
    }

    private function rsDefaults(): array
    {
        return [
            'pasal1' => "Maksud dari perjanjian ini adalah untuk melaksanakan survei akreditasi dalam rangka peningkatan mutu pelayanan, keselamatan pasien, dan tata kelola yang baik di [JENIS_FASKES].\n\nTujuan perjanjian ini adalah:\n1. Meningkatkan mutu pelayanan klinis dan non-klinis rumah sakit.\n2. Meningkatkan keselamatan pasien dan tenaga kesehatan.\n3. Memenuhi standar akreditasi nasional (SNARS).\n4. Memastikan tata kelola rumah sakit yang good governance.\n5. Meningkatkan kepercayaan pasien dan masyarakat.",
            'pasal2' => "1. Pelaksanaan survei akreditasi rumah sakit sesuai standar SNARS.\n2. Pembinaan dan evaluasi berkelanjutan terhadap sistem mutu rumah sakit.\n3. Verifikasi hasil survei dan penerbitan rekomendasi ke Kementerian Kesehatan.\n4. Penerbitan Sertifikat Akreditasi bagi rumah sakit yang memenuhi standar.",
            'pasal3' => "1. PIHAK KEDUA mengajukan permohonan akreditasi kepada PIHAK PERTAMA dengan memenuhi persyaratan.\n2. PIHAK PERTAMA akan menugaskan surveior akreditasi yang terakreditasi setelah PIHAK KEDUA memenuhi persyaratan.\n3. Surveior berpedoman pada Standar Akreditasi [JENIS_FASKES] (SNARS), Instrumen Akreditasi, Petunjuk Teknis Survei Akreditasi, dan Kode Etik Surveior yang ditetapkan oleh Kementerian Kesehatan.\n4. Surveior mengirimkan laporan hasil survei melalui Sistem Informasi Nasional Akreditasi Fasyankes (SINAF).\n5. PIHAK PERTAMA menyampaikan rekomendasi hasil survei ke Kementerian Kesehatan untuk penerbitan Sertifikat Akreditasi.\n6. Survei verifikasi dapat dilaksanakan sesuai jadwal yang ditetapkan PIHAK PERTAMA.",
            'pasal4' => "Hak PIHAK PERTAMA:\n1. Mendapatkan akses terhadap dokumen dan data rumah sakit yang diperlukan.\n2. Mendapatkan tarif survei, akomodasi, dan transportasi sesuai peraturan.\n3. Menerbitkan Sertifikat Akreditasi bagi rumah sakit yang memenuhi standar.\n\nKewajiban PIHAK PERTAMA:\n1. Melaksanakan survei akreditasi secara profesional dan independen.\n2. Menugaskan surveior yang kompeten dan tidak memiliki konflik kepentingan.\n3. Menjaga kerahasiaan seluruh informasi dan data yang diperoleh selama survei.",
            'pasal5' => "Hak PIHAK KEDUA:\n1. Mendapatkan informasi terkait pelaksanaan survei akreditasi.\n2. Mengusulkan perubahan surveior jika terdapat potensi conflict of interest.\n3. Mengajukan penundaan survei dengan alasan force majeure.\n4. Mengajukan banding, kenaikan status, dan remedial sesuai mekanisme yang berlaku.\n5. Mendapatkan Sertifikat Akreditasi jika memenuhi standar.\n6. Mencantumkan status akreditasi untuk keperluan publikasi.\n\nKewajiban PIHAK KEDUA:\n1. Membayar tarif survei, akomodasi, dan transportasi surveior sesuai invoice.\n2. Menyediakan akses dan data yang diperlukan untuk survei.\n3. Menjaga kerahasiaan dokumen akreditasi.",
            'pasal6' => "Survei akreditasi [JENIS_FASKES] dilaksanakan berdasarkan:\n1. Standar Akreditasi [JENIS_FASKES] (SNARS).\n2. Instrumen Akreditasi terbaru yang ditetapkan Kementerian Kesehatan.\n3. Petunjuk Teknis Survei Akreditasi [JENIS_FASKES].\n4. Kode Etik Surveior Akreditasi.",
            'pasal7' => "Biaya akreditasi meliputi tarif survei, akomodasi, dan transportasi surveior yang akan diinformasikan melalui invoice resmi dari PIHAK PERTAMA. Pembayaran dilakukan sesuai tata cara yang ditetapkan.",
            'pasal8' => "Kedua belah pihak sepakat untuk menjaga kerahasiaan seluruh informasi dan data yang dipertukarkan dalam рамках pelaksanaan akreditasi ini, serta tidak menyebarkannya kepada pihak ketiga tanpa persetujuan tertulis dari kedua belah pihak.",
            'pasal9' => "Perjanjian ini berlaku sejak ditandatangani oleh kedua belah pihak dan berlaku sampai diterbitkannya keputusan akreditasi oleh Kementerian Kesehatan RI.",
            'pasal10' => "Hal-hal yang belum atau belum cukup diatur dalam perjanjian ini akan diatur secara musyawarah dalam bentuk annexe/addendum yang merupakan bagian tidak terpisahkan dari perjanjian ini.\n\nDemikian perjanjian ini dibuat dalam rangkap 2 (dua) bermeterai cukup dan masing-masing ditandatangani oleh kedua belah pihak.",
        ];
    }

    private function pusDefaults(): array
    {
        return [
            'pasal1' => "Maksud dari perjanjian ini adalah untuk melaksanakan survei akreditasi dalam рамках peningkatan mutu pelayanan dan keselamatan pasien di [JENIS_FASKES].\n\nTujuan perjanjian ini adalah:\n1. Meningkatkan mutu pelayanan [JENIS_FASKES].\n2. Meningkatkan keselamatan pasien.\n3. Memenuhi standar akreditasi nasional.",
            'pasal2' => "1. Pelaksanaan survei akreditasi untuk peningkatan mutu pelayanan dan keselamatan pasien.\n2. Pembiayaan survei akreditasi untuk peningkatan mutu pelayanan dan keselamatan pasien.\n3. Hasil pelaksanaan survei untuk peningkatan mutu pelayanan dan keselamatan pasien.",
            'pasal3' => "1. PIHAK KEDUA mengajukan permohonan akreditasi kepada PIHAK PERTAMA dengan memenuhi persyaratan.\n2. PIHAK PERTAMA akan menugaskan surveior akreditasi setelah PIHAK KEDUA memenuhi persyaratan.\n3. Surveior berpedoman pada Standar Akreditasi [JENIS_FASKES], Instrumen Akreditasi, Petunjuk Teknis Survei Akreditasi, dan Kode Etik Surveior yang ditetapkan oleh Kementerian Kesehatan.\n4. Surveior mengirimkan laporan hasil survei melalui Sistem Informasi Nasional Akreditasi Fasyankes (SINAF) kepada PIHAK PERTAMA untuk verifikasi.\n5. PIHAK PERTAMA mengirimkan rekomendasi ke Kementerian Kesehatan untuk penerbitan Sertifikat Akreditasi.\n6. Survei verifikasi pertama dapat dilaksanakan dua tahun setelah survei awal, dan survei verifikasi kedua empat tahun setelah survei awal.",
            'pasal4' => "Hak PIHAK PERTAMA:\n1. Mendapatkan akses pemenuhan persyaratan survei akreditasi.\n2. Mendapatkan akses terhadap dokumen pendukung standar akreditasi.\n3. Mendapatkan akses terhadap teknologi informasi sesuai kebutuhan survei.\n4. Mendapatkan tarif survei, akomodasi, dan transportasi sesuai peraturan.\n\nKewajiban PIHAK PERTAMA:\n1. Melaksanakan survei akreditasi sesuai peraturan.\n2. Menugaskan surveior sesuai peraturan.\n3. Menjaga kerahasiaan dokumen akreditasi dan tidak menyebarluaskan tanpa izin PIHAK KEDUA.",
            'pasal5' => "Hak PIHAK KEDUA:\n1. Mendapatkan informasi terkait pelaksanaan survei akreditasi.\n2. Mengusulkan perubahan surveior jika ada potensi conflict of interest.\n3. Mengajukan permohonan penundaan survei jika terjadi force majeure.\n4. Mengajukan banding, kenaikan status, dan remedial sesuai peraturan.\n5. Mendapatkan sertifikat jika lulus survei akreditasi.\n6. Mencantumkan status akreditasi untuk publikasi.\n\nKewajiban PIHAK KEDUA:\n1. Membayar tarif survei, akomodasi, dan transportasi surveior.\n2. Menyediakan akses dan data yang diperlukan untuk survei.\n3. Menjaga kerahasiaan dokumen akreditasi yang bersifat rahasia.",
            'pasal6' => "Biaya akreditasi ditetapkan dalam invoice yang diterbitkan setelah PKS ini ditandatangani. Pembayaran mengikuti tata cara yang diinformasikan melalui sistem ERP akreditasi [NAMA_LEMBAGA].",
            'pasal7' => "Kedua belah pihak sepakat menjaga kerahasiaan seluruh informasi yang dipertukarkan dalam рамках pelaksanaan akreditasi ini dan tidak akan menyebarkannya kepada pihak ketiga tanpa persetujuan tertulis dari kedua belah pihak.",
            'pasal8' => "Apabila terjadi perselisihan dalam pelaksanaan perjanjian ini, kedua belah pihak sepakat untuk menyelesaikannya secara musyawarah untuk mufakat.",
            'pasal9' => "Perjanjian ini berlaku sejak ditandatangani oleh kedua belah pihak dan berlaku sampai dengan diterbitkannya keputusan akreditasi oleh Kementerian Kesehatan.",
            'pasal10' => "Hal-hal yang belum diatur dalam perjanjian ini akan diatur dalam annexe/addendum yang merupakan bagian tidak terpisahkan dari perjanjian ini.\n\nDemikian perjanjian ini dibuat dalam rangkap 2 (dua) asli yang sama buninya dan masing-masing ditandatangani oleh kedua belah pihak.",
        ];
    }

    private function genericDefaults(): array
    {
        return [
            'pasal1' => "PIHAK PERTAMA menyelenggarakan penilaian akreditasi bagi PIHAK KEDUA sesuai dengan standar yang berlaku. PIHAK KEDUA setuju untuk mengikuti seluruh tahapan proses akreditasi yang ditetapkan.",
            'pasal2' => "1. Validasi kelengkapan dokumen persyaratan.\n2. Penandatanganan PKS ini.\n3. Penerbitan invoice dan pembayaran biaya akreditasi.\n4. Penunjukan surveior dan penerbitan Surat Tugas Survei.\n5. Pelaksanaan survei di lapangan.\n6. Verifikasi hasil oleh verifikator independen.\n7. Penerbitan keputusan akreditasi.",
            'pasal3' => "Biaya akreditasi ditetapkan dalam invoice yang diterbitkan setelah PKS ini ditandatangani. Pembayaran mengikuti tata cara yang diinformasikan melalui sistem ERP akreditasi LIPA MITRA NUSA.",
            'pasal4' => "Kedua pihak sepakat menjaga kerahasiaan seluruh informasi yang dipertukarkan dalam рамках pelaksanaan akreditasi ini.",
        ];
    }

    private function getJenisFaskesIdByKode(string $kode): ?string
    {
        return match (true) {
            str_ends_with(strtolower($kode), 'puskesmas') => 'jf-0003',
            str_contains(strtolower($kode), 'klinik') => 'jf-0002',
            str_contains(strtolower($kode), 'laboratorium') || str_contains(strtolower($kode), 'lab') => 'jf-0004',
            str_contains(strtolower($kode), 'rumah sakit') || str_contains(strtolower($kode), 'rs') => 'jf-0001',
            default => null,
        };
    }

    private function getBladeFallback(string $kode): string
    {
        return match (true) {
            str_ends_with(strtolower($kode), 'puskesmas') => 'pdf.pks-pus-kawasaki',
            str_contains(strtolower($kode), 'klinik') => 'pdf.pks-klinik',
            str_contains(strtolower($kode), 'laboratorium') || str_contains(strtolower($kode), 'lab') => 'pdf.pks-lab',
            str_contains(strtolower($kode), 'rumah sakit') || str_contains(strtolower($kode), 'rs') => 'pdf.pks-rs',
            default => 'pdf.pks',
        };
    }
}
