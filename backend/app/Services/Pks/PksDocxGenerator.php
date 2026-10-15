<?php

namespace App\Services\Pks;

use App\Models\Pks as PksModel;
use App\Services\AttachmentService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\SimpleType\Jc;
use PhpOffice\PhpWord\SimpleType\JcTable;
use PhpOffice\PhpWord\Style\Font;

/**
 * Generate an editable DOCX (Word) version of a PKS agreement.
 *
 * The DOCX uses a hardcoded structure that mirrors the 5 blade fallback
 * templates in resources/views/pdf/. DB-template customizations from
 * PksTemplate are NOT applied here — PHPWord's HTML reader is too lossy
 * to faithfully reproduce a styled legal document, so the DOCX always
 * uses the standard 10-pasal format.
 */
class PksDocxGenerator
{
    public function __construct(private AttachmentService $attachment) {}

    public function generate(PksModel $pks): string
    {
        $pks->load(['siklus.faskes', 'siklus.lembaga']);

        $faskes = $pks->siklus->faskes;
        $lembaga = $pks->siklus->lembaga;
        $kode = $faskes->jenisFaskes?->kode ?? '';

        $variant = $this->resolveVariant($kode);
        $faskesTypeName = $this->faskesTypeName($variant);

        $phpWord = new PhpWord();
        $phpWord->setDefaultFontName('Times New Roman');
        $phpWord->setDefaultFontSize(11);

        $section = $this->addSection($phpWord);

        $this->addHeader($section, $pks);
        $this->addPartiesBlock($section, $pks, $faskes, $lembaga, $faskesTypeName);
        $this->addPasal1($section, $faskesTypeName);
        $this->addPasal2($section);
        $this->addPasal3($section, $faskesTypeName);
        $this->addPasal4($section);
        $this->addPasal5($section);
        $this->addPasal6($section, $lembaga);
        $this->addPasal7($section);
        $this->addPasal8($section);
        $this->addPasal9($section);
        $this->addPasal10($section);
        $this->addSignatures($section, $pks, $faskes, $lembaga);
        $this->addFooter($section, $pks, $lembaga);

        $tmpDir = storage_path('app/pks');
        if (! is_dir($tmpDir)) {
            mkdir($tmpDir, 0755, true);
        }
        $tmpPath = storage_path('app/pks/' . $pks->id . '_tmp.docx');
        $writer = IOFactory::createWriter($phpWord, 'Word2007');
        $writer->save($tmpPath);
        $content = file_get_contents($tmpPath);
        @unlink($tmpPath);

        $filename = "{$pks->id}.docx";
        $path = $this->attachment->put($content, 'pks', $filename);

        return $path;
    }

    private function addSection(PhpWord $phpWord)
    {
        return $phpWord->addSection([
            'marginTop' => 1134,    // 2 cm
            'marginBottom' => 1134,
            'marginLeft' => 1418,   // 2.5 cm
            'marginRight' => 1418,
        ]);
    }

    private function addHeader($section, PksModel $pks): void
    {
        $section->addText(
            'PERJANJIAN KERJA SAMA',
            ['bold' => true, 'size' => 14],
            ['alignment' => Jc::CENTER, 'spaceAfter' => 120]
        );
        $section->addText(
            'Nomor: ' . ($pks->nomor_pks ?? '[belum diterbitkan]'),
            ['size' => 10],
            ['alignment' => Jc::CENTER, 'spaceAfter' => 240]
        );
    }

    private function addPartiesBlock($section, PksModel $pks, $faskes, $lembaga, string $faskesTypeName): void
    {
        $tanggal = $pks->tanda_tangan_pada
            ? $pks->tanda_tangan_pada->translatedFormat('d F Y')
            : Carbon::now()->translatedFormat('d F Y');

        $section->addText(
            'Pada hari ini, ' . $tanggal . ', yang bertanda tangan di bawah ini:',
            [],
            ['spaceAfter' => 120]
        );

        $section->addText('PIHAK PERTAMA:', ['bold' => true], ['spaceAfter' => 60]);
        $lembagaNama = $lembaga->nama ?? 'Lembaga Penyelenggara Akreditasi';
        $lembagaAlamat = $lembaga->alamat ?? 'Surabaya';
        $section->addText(
            $lembagaNama . ', dalam hal ini diwakili oleh pejabat yang berwenang, '
            . 'bertindak untuk dan atas nama PT. ' . $lembagaNama
            . ', berkedudukan di ' . $lembagaAlamat
            . ', selanjutnya disebut PIHAK PERTAMA.',
            [],
            ['spaceAfter' => 120]
        );

        $section->addText('PIHAK KEDUA:', ['bold' => true], ['spaceAfter' => 60]);
        $faskesNama = $faskes->nama ?? 'Faskes';
        $faskesAlamat = $faskes->alamat ?? '-';
        $faskesKota = $faskes->kota ?? '-';
        $section->addText(
            $faskesNama . ' (' . $faskesTypeName . '), berkedudukan di '
            . $faskesAlamat . ', ' . $faskesKota
            . ', selanjutnya disebut PIHAK KEDUA.',
            [],
            ['spaceAfter' => 120]
        );

        $section->addText(
            'Kedua belah pihak sepakat untuk menandatangani perjanjian kerja sama '
            . 'pelaksanaan Survei Akreditasi ' . $faskesTypeName
            . ' dengan ketentuan sebagai berikut:',
            [],
            ['spaceAfter' => 240]
        );
    }

    private function addPasal1($section, string $faskesTypeName): void
    {
        $this->addPasalHeader($section, 'Maksud dan Tujuan');
        $section->addText(
            'Maksud dari perjanjian ini adalah untuk melaksanakan survei akreditasi '
            . 'dalam rangka peningkatan mutu pelayanan dan keselamatan pasien di '
            . $faskesTypeName . '.',
            [],
            ['spaceAfter' => 60]
        );
        $section->addText('Tujuan perjanjian ini adalah:', [], ['spaceAfter' => 60]);
        $this->addNumberedList($section, [
            'Meningkatkan mutu pelayanan ' . $faskesTypeName . '.',
            'Meningkatkan keselamatan pasien.',
            'Memenuhi standar akreditasi nasional.',
        ]);
    }

    private function addPasal2($section): void
    {
        $this->addPasalHeader($section, 'Ruang Lingkup');
        $this->addNumberedList($section, [
            'Pelaksanaan survei akreditasi untuk peningkatan mutu pelayanan dan keselamatan pasien.',
            'Pembiayaan survei akreditasi untuk peningkatan mutu pelayanan dan keselamatan pasien.',
            'Hasil pelaksanaan survei untuk peningkatan mutu pelayanan dan keselamatan pasien.',
        ]);
    }

    private function addPasal3($section, string $faskesTypeName): void
    {
        $this->addPasalHeader($section, 'Pelaksanaan Survei');
        $this->addNumberedList($section, [
            'PIHAK KEDUA mengajukan permohonan akreditasi kepada PIHAK PERTAMA dengan memenuhi persyaratan.',
            'PIHAK PERTAMA akan menugaskan surveior akreditasi setelah PIHAK KEDUA memenuhi persyaratan.',
            'Surveior berpedoman pada Standar Akreditasi ' . $faskesTypeName
                . ', Instrumen Akreditasi, Petunjuk Teknis Survei Akreditasi, '
                . 'dan Kode Etik Surveior yang ditetapkan oleh Kementerian Kesehatan.',
            'Surveior mengirimkan laporan hasil survei melalui Sistem Informasi Nasional Akreditasi Fasyankes (SINAF) kepada PIHAK PERTAMA untuk verifikasi.',
            'PIHAK PERTAMA mengirimkan rekomendasi ke Kementerian Kesehatan untuk penerbitan Sertifikat Akreditasi.',
            'Survei verifikasi pertama dapat dilaksanakan dua tahun setelah survei awal, dan survei verifikasi kedua empat tahun setelah survei awal.',
        ]);
    }

    private function addPasal4($section): void
    {
        $this->addPasalHeader($section, 'Hak dan Kewajiban PIHAK PERTAMA');
        $section->addText('Hak PIHAK PERTAMA:', ['bold' => true], ['spaceAfter' => 60]);
        $this->addNumberedList($section, [
            'Mendapatkan akses pemenuhan persyaratan survei akreditasi.',
            'Mendapatkan akses terhadap dokumen pendukung standar akreditasi.',
            'Mendapatkan akses terhadap teknologi informasi sesuai kebutuhan survei.',
            'Mendapatkan tarif survei, akomodasi, dan transportasi sesuai peraturan.',
        ]);
        $section->addText('Kewajiban PIHAK PERTAMA:', ['bold' => true], ['spaceAfter' => 60]);
        $this->addNumberedList($section, [
            'Melaksanakan survei akreditasi sesuai peraturan.',
            'Menugaskan surveior sesuai peraturan.',
            'Menjaga kerahasiaan dokumen akreditasi dan tidak menyebarluaskan tanpa izin PIHAK KEDUA.',
        ]);
    }

    private function addPasal5($section): void
    {
        $this->addPasalHeader($section, 'Hak dan Kewajiban PIHAK KEDUA');
        $section->addText('Hak PIHAK KEDUA:', ['bold' => true], ['spaceAfter' => 60]);
        $this->addNumberedList($section, [
            'Mendapatkan informasi terkait pelaksanaan survei akreditasi.',
            'Mengusulkan perubahan surveior jika ada potensi conflict of interest.',
            'Mengajukan permohonan penundaan survei jika terjadi force majeure.',
            'Mengajukan banding, kenaikan status, dan remedial sesuai peraturan.',
            'Mendapatkan sertifikat jika lulus survei akreditasi.',
            'Mencantumkan status akreditasi untuk publikasi.',
        ]);
        $section->addText('Kewajiban PIHAK KEDUA:', ['bold' => true], ['spaceAfter' => 60]);
        $this->addNumberedList($section, [
            'Membayar tarif survei, akomodasi, dan transportasi surveior.',
            'Menyediakan akses dan data yang diperlukan untuk survei.',
            'Menjaga kerahasiaan dokumen akreditasi yang bersifat rahasia.',
        ]);
    }

    private function addPasal6($section, $lembaga): void
    {
        $this->addPasalHeader($section, 'Pembiayaan');
        $section->addText(
            'Biaya akreditasi ditetapkan dalam invoice yang diterbitkan setelah PKS ini '
            . 'ditandatangani. Pembayaran mengikuti tata cara yang diinformasikan melalui '
            . 'sistem ERP akreditasi ' . ($lembaga->nama ?? 'Lembaga Penyelenggara') . '.',
            [],
            ['spaceAfter' => 120]
        );
    }

    private function addPasal7($section): void
    {
        $this->addPasalHeader($section, 'Kerahasiaan');
        $section->addText(
            'Kedua belah pihak sepakat menjaga kerahasiaan seluruh informasi yang '
            . 'dipertukarkan dalam rangka pelaksanaan akreditasi ini dan tidak akan '
            . 'menyebarkannya kepada pihak ketiga tanpa persetujuan tertulis dari kedua belah pihak.',
            [],
            ['spaceAfter' => 120]
        );
    }

    private function addPasal8($section): void
    {
        $this->addPasalHeader($section, 'Perselisihan');
        $section->addText(
            'Apabila terjadi perselisihan dalam pelaksanaan perjanjian ini, kedua belah pihak '
            . 'sepakat untuk menyelesaikannya secara musyawarah untuk mufakat.',
            [],
            ['spaceAfter' => 120]
        );
    }

    private function addPasal9($section): void
    {
        $this->addPasalHeader($section, 'Jangka Waktu');
        $section->addText(
            'Perjanjian ini berlaku sejak ditandatangani oleh kedua belah pihak dan '
            . 'berlaku sampai dengan diterbitkannya keputusan akreditasi oleh Kementerian Kesehatan.',
            [],
            ['spaceAfter' => 120]
        );
    }

    private function addPasal10($section): void
    {
        $this->addPasalHeader($section, 'Penutup');
        $section->addText(
            'Hal-hal yang belum diatur dalam perjanjian ini akan diatur dalam annexe '
            . 'yang merupakan bagian tidak terpisahkan dari perjanjian ini.',
            [],
            ['spaceAfter' => 60]
        );
        $section->addText(
            'Demikian perjanjian ini dibuat dalam rangkap 2 (dua) asli yang sama buninya '
            . 'dan masing-masing ditandatangani oleh kedua belah pihak.',
            [],
            ['spaceAfter' => 240]
        );
    }

    private function addSignatures($section, PksModel $pks, $faskes, $lembaga): void
    {
        $cellWidth = 4536; // ~8 cm
        $table = $section->addTable([
            'alignment' => JcTable::CENTER,
            'width' => 100 * 50,
            'borderSize' => 0,
            'borderColor' => 'FFFFFF',
        ]);

        $table->addRow();
        $cell1 = $table->addCell($cellWidth, ['valign' => 'top']);
        $cell1->addText('PIHAK PERTAMA', ['size' => 9], ['alignment' => Jc::CENTER, 'spaceAfter' => 60]);
        $cell1->addText(
            $lembaga->nama ?? 'Lembaga Penyelenggara',
            [],
            ['alignment' => Jc::CENTER, 'spaceAfter' => 60]
        );
        for ($i = 0; $i < 4; $i++) {
            $cell1->addTextBreak(1);
        }
        $cell1->addText(
            '(' . ($lembaga->nama_pejabat ?? 'Nama Pejabat Berwenang') . ')',
            ['size' => 10],
            ['alignment' => Jc::CENTER]
        );

        $cell2 = $table->addCell($cellWidth, ['valign' => 'top']);
        $cell2->addText('PIHAK KEDUA', ['size' => 9], ['alignment' => Jc::CENTER, 'spaceAfter' => 60]);
        $cell2->addText(
            $faskes->nama ?? 'Faskes',
            [],
            ['alignment' => Jc::CENTER, 'spaceAfter' => 60]
        );
        for ($i = 0; $i < 4; $i++) {
            $cell2->addTextBreak(1);
        }
        $cell2->addText(
            $pks->nama_penandatangan ?? '[Nama Penandatangan]',
            ['size' => 10],
            ['alignment' => Jc::CENTER]
        );
        if ($pks->jabatan_penandatangan) {
            $cell2->addText(
                $pks->jabatan_penandatangan,
                ['size' => 9],
                ['alignment' => Jc::CENTER]
            );
        }
    }

    private function addFooter($section, PksModel $pks, $lembaga): void
    {
        $section->addTextBreak(2);
        $section->addText(
            'Dokumen ini dihasilkan oleh Sistem ERP Akreditasi Faskes — '
            . ($lembaga->nama ?? 'LIPA MITRA NUSA') . '.',
            ['size' => 9, 'color' => '64748B'],
            ['alignment' => Jc::CENTER, 'spaceAfter' => 60]
        );
        if ($pks->tanda_tangan_pada) {
            $section->addText(
                'Disetujui secara elektronik pada '
                . $pks->tanda_tangan_pada->translatedFormat('d F Y, H:i') . ' WIB.',
                ['size' => 9, 'color' => '64748B'],
                ['alignment' => Jc::CENTER]
            );
        }
    }

    private function addPasalHeader($section, string $title): void
    {
        $section->addText(
            'Pasal — ' . $title,
            ['bold' => true],
            ['spaceBefore' => 120, 'spaceAfter' => 60]
        );
    }

    private function addNumberedList($section, array $items): void
    {
        foreach ($items as $item) {
            $section->addListItem($item, 0, ['bold' => false], ['alignment' => Jc::LEFT]);
        }
        $section->addTextBreak(1);
    }

    private function resolveVariant(string $kode): string
    {
        $k = strtolower($kode);
        return match (true) {
            str_ends_with($k, 'puskesmas') => 'puskesmas',
            str_contains($k, 'klinik') => 'klinik',
            str_contains($k, 'laboratorium') || str_contains($k, 'lab') => 'lab',
            str_contains($k, 'rumah sakit') || str_contains($k, 'rs') => 'rs',
            default => 'generic',
        };
    }

    private function faskesTypeName(string $variant): string
    {
        return match ($variant) {
            'puskesmas' => 'Pusat Kesehatan Masyarakat',
            'klinik' => 'Klinik',
            'lab' => 'Laboratorium',
            'rs' => 'Rumah Sakit',
            default => 'Fasilitas Pelayanan Kesehatan',
        };
    }
}
