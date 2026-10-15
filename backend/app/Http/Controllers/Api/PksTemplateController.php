<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JenisFaskes;
use App\Models\PksTemplate;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PksTemplateController extends Controller
{
    public function __construct(private AuditService $audit) {}

    public function index(Request $request): JsonResponse
    {
        $query = PksTemplate::with(['jenisFaskes:id,nama,kode', 'dibuatOleh:id,name'])
            ->orderBy('jenis_faskes_id')
            ->orderByDesc('is_default');

        if ($request->query('aktif')) {
            $query->where('aktif', true);
        }

        if ($request->query('jenis_faskes_id')) {
            $query->where('jenis_faskes_id', $request->query('jenis_faskes_id'));
        }

        $data = $query->get();
        $jenisFaskes = JenisFaskes::where('status', 'aktif')->orderBy('nama')->get(['id', 'nama', 'kode']);

        return response()->json([
            'data' => $data,
            'jenis_faskes_options' => $jenisFaskes,
            'available_variables' => \App\Services\Pks\TemplateCompiler::availableVariables(),
        ]);
    }

    public function show(PksTemplate $pksTemplate): JsonResponse
    {
        $pksTemplate->load(['jenisFaskes:id,nama,kode']);
        return response()->json(['data' => $pksTemplate]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'jenis_faskes_id' => 'nullable|string|exists:jenis_faskes,id',
            'nama' => 'required|string|max:100',
            'blade' => [
                'required',
                'string',
                'max:100',
                'regex:/^[a-z0-9_\-]+$/',
            ],
            'konten' => 'required|string',
            'is_default' => 'boolean',
        ]);

        $user = $request->user();

        if (!empty($data['is_default'])) {
            PksTemplate::where('jenis_faskes_id', $data['jenis_faskes_id'] ?? null)
                ->where('aktif', true)
                ->update(['is_default' => false]);
        }

        $template = PksTemplate::create([
            'dibuat_oleh' => $user->id,
            'jenis_faskes_id' => $data['jenis_faskes_id'] ?? null,
            'nama' => $data['nama'],
            'blade' => $data['blade'],
            'konten' => $data['konten'],
            'is_default' => $data['is_default'] ?? false,
            'aktif' => true,
        ]);

        $this->audit->log('pks_template.created', 'pks_template', $template->id, [
            'nama' => $template->nama,
            'blade' => $template->blade,
            'jenis_faskes_id' => $template->jenis_faskes_id,
        ]);

        return response()->json(['data' => $template->load(['jenisFaskes:id,nama,kode'])], 201);
    }

    public function update(Request $request, PksTemplate $pksTemplate): JsonResponse
    {
        $data = $request->validate([
            'jenis_faskes_id' => 'nullable|string|exists:jenis_faskes,id',
            'nama' => 'sometimes|string|max:100',
            'blade' => [
                'sometimes',
                'string',
                'max:100',
                'regex:/^[a-z0-9_\-]+$/',
            ],
            'konten' => 'sometimes|string',
            'is_default' => 'boolean',
            'aktif' => 'boolean',
        ]);

        if (!empty($data['is_default']) && !$pksTemplate->is_default) {
            PksTemplate::where('jenis_faskes_id', $pksTemplate->jenis_faskes_id)
                ->where('aktif', true)
                ->where('id', '!=', $pksTemplate->id)
                ->update(['is_default' => false]);
        }

        if (isset($data['konten'])) {
            $pksTemplate->konten = $data['konten'];
            unset($data['konten']);
        }

        $pksTemplate->fill($data);
        $pksTemplate->save();

        $this->audit->log('pks_template.updated', 'pks_template', $pksTemplate->id, [
            'nama' => $pksTemplate->nama,
            'changed_fields' => array_keys($data),
        ]);

        return response()->json(['data' => $pksTemplate->fresh()->load(['jenisFaskes:id,nama,kode'])]);
    }

    public function destroy(PksTemplate $pksTemplate): JsonResponse
    {
        if ($pksTemplate->is_default) {
            return response()->json(['message' => 'Template default tidak dapat dihapus. Nonaktifkan saja.'], 422);
        }

        $this->audit->log('pks_template.deleted', 'pks_template', $pksTemplate->id, [
            'nama' => $pksTemplate->nama,
            'blade' => $pksTemplate->blade,
        ]);

        $pksTemplate->delete();
        return response()->json(['message' => 'Template berhasil dihapus.']);
    }

    public function resetToDefault(PksTemplate $pksTemplate): JsonResponse
    {
        $bundled = $this->getBundledContent($pksTemplate->blade);
        if (!$bundled) {
            return response()->json(['message' => 'Tidak ada template bawaan untuk blade ini.'], 404);
        }

        $pksTemplate->forceFill(['konten' => $bundled])->save();

        $this->audit->log('pks_template.reset', 'pks_template', $pksTemplate->id, [
            'blade' => $pksTemplate->blade,
        ]);

        return response()->json(['data' => $pksTemplate->fresh()]);
    }

    public function previewPdf(PksTemplate $pksTemplate)
    {
        $pksTemplate->load(['jenisFaskes:id,nama,kode']);
        $jenisFaskes = $pksTemplate->jenisFaskes;
        if (!$jenisFaskes) {
            return response()->json(['message' => 'Template tidak memiliki jenis faskes.'], 422);
        }

        // Build dummy pks + siklus so PksPdfGenerator can use the real relationships
        $dummyPks = new \App\Models\Pks();
        $dummyPks->id = 'preview-'.uniqid();
        $dummyPks->nomor_pks = 'PREVIEW/00'.Str()->random(4).'/'.date('Y');
        $dummyPks->tanda_tangan_pada = now();
        $dummyPks->nama_penandatangan = '[Nama Penandatangan Preview]';
        $dummyPks->jabatan_penandatangan = '[Jabatan Preview]';

        $siklus = new \App\Models\SiklusAkreditasi();
        $siklus->id = 'preview-siklus';
        $siklus->faskes_id = 'preview-faskes';
        $siklus->lembaga_id = 'preview-lembaga';

        $faskes = new \App\Models\Faskes();
        $faskes->id = 'preview-faskes';
        $faskes->nama = '[Nama Faskes Preview]';
        $faskes->alamat = '[Alamat Faskes Preview]';
        $faskes->kota = '[Kota Preview]';
        $faskes->tipe_faskes = $jenisFaskes->nama;
        $faskes->setRelation('jenisFaskes', $jenisFaskes);

        $lembaga = new \App\Models\Lembaga();
        $lembaga->id = 'preview-lembaga';
        $lembaga->nama = '[Nama Lembaga Preview]';
        $lembaga->alamat = '[Alamat Lembaga Preview]';
        $lembaga->nama_pejabat = '[Nama Pejabat Preview]';

        $siklus->setRelation('faskes', $faskes);
        $siklus->setRelation('lembaga', $lembaga);
        $dummyPks->setRelation('siklus', $siklus);

        try {
            $path = (new \App\Services\Pks\PksPdfGenerator())->generate($dummyPks);
            $disk = \Illuminate\Support\Facades\Storage::disk('local');
            if (!$disk->exists($path)) {
                return response()->json(['message' => 'Gagal menghasilkan PDF preview.'], 500);
            }
            $content = $disk->get($path);
            $disk->delete($path);

            $filename = 'Preview_'.Str()->slug($pksTemplate->nama ?? 'template').'_'.date('Ymd_His').'.pdf';

            return response($content, 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'inline; filename="'.$filename.'"',
                'Cache-Control' => 'no-store, no-cache',
            ]);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['message' => 'Gagal menghasilkan PDF: '.$e->getMessage()], 500);
        }
    }

    private function getBundledContent(string $blade): ?string
    {
        $bundled = [
            'pks' => $this->bundledPuskesmswatki(),
            'pks-pus-kawasaki' => $this->bundledPuskesmswatki(),
            'pks-klinik' => $this->bundledKlinik(),
            'pks-lab' => $this->bundledLab(),
            'pks-rs' => $this->bundledRs(),
            'pks-puskesmas' => $this->bundledPuskesmswatki(),
        ];

        return $bundled[$blade] ?? null;
    }

    private function struktur(string $nomor, string $judul, string $isi): string
    {
        return "[PASAL:{$nomor}|{$judul}]\n{$isi}\n[/PASAL]";
    }

    private function baseKonten(string $body): string
    {
        return $body;
    }

    private function bundledKlinik(): string
    {
        return $this->baseKonten(
"[HEADER]
[/HEADER]

".$this->struktur('1', 'Maksud dan Tujuan', "Maksud dari perjanjian ini adalah untuk melaksanakan survei akreditasi dalam rangka peningkatan mutu pelayanan dan keselamatan pasien di [JENIS_FASKES].\n\nTujuan perjanjian ini adalah:\n1. Meningkatkan mutu pelayanan [JENIS_FASKES].\n2. Meningkatkan keselamatan pasien.\n3. Memenuhi standar akreditasi nasional (SNARS).\n4. Menjamin keamanan dan kenyamanan pasien.").

$this->struktur('2', 'Ruang Lingkup', "1. Pelaksanaan survei akreditasi sesuai standar yang berlaku.\n2. Pembiayaan survei akreditasi termasuk tarif survei, akomodasi, dan transportasi surveior.\n3. Verifikasi hasil survei dan penerbitan rekomendasi ke Kementerian Kesehatan.\n4. Penerbitan Sertifikat Akreditasi bagi [JENIS_FASKES] yang memenuhi standar.").

$this->struktur('3', 'Pelaksanaan Survei', "1. PIHAK KEDUA mengajukan permohonan akreditasi kepada PIHAK PERTAMA dengan memenuhi seluruh persyaratan.\n2. PIHAK PERTAMA akan menugaskan surveior akreditasi yang terakreditasi setelah PIHAK KEDUA memenuhi persyaratan.\n3. Surveior berpedoman pada Standar Akreditasi [JENIS_FASKES] (SNARS), Instrumen Akreditasi, Petunjuk Teknis, dan Kode Etik Surveior yang ditetapkan oleh Kementerian Kesehatan.\n4. Surveior mengirimkan laporan hasil survei melalui Sistem Informasi Nasional Akreditasi Fasyankes (SINAF).\n5. Survei verifikasi dapat dilaksanakan sesuai jadwal yang ditetapkan PIHAK PERTAMA.").

$this->struktur('4', 'Hak dan Kewajiban PIHAK PERTAMA', "Hak PIHAK PERTAMA:\n1. Mendapatkan akses pemenuhan persyaratan survei akreditasi.\n2. Mendapatkan akses terhadap dokumen pendukung standar akreditasi.\n3. Mendapatkan tarif survei, akomodasi, dan transportasi sesuai peraturan yang berlaku.\n4. Menerbitkan Sertifikat Akreditasi bagi [JENIS_FASKES] yang dinyatakan layak.\n\nKewajiban PIHAK PERTAMA:\n1. Melaksanakan survei akreditasi secara profesional dan sesuai peraturan.\n2. Menugaskan surveior yang kompeten dan tidak memiliki konflik kepentingan.\n3. Menjaga kerahasiaan seluruh informasi dan dokumen yang diperoleh selama survei.").

$this->struktur('5', 'Hak dan Kewajiban PIHAK KEDUA', "Hak PIHAK KEDUA:\n1. Mendapatkan informasi lengkap terkait pelaksanaan survei akreditasi.\n2. Mengusulkan pergantian surveior jika terdapat potensi conflict of interest.\n3. Mengajukan penundaan survei dengan alasan force majeure.\n4. Mengajukan banding dan remedial sesuai mekanisme yang ditetapkan.\n5. Mendapatkan Sertifikat Akreditasi jika dinyatakan memenuhi standar.\n6. Mencantumkan status akreditasi untuk keperluan publikasi.\n\nKewajiban PIHAK KEDUA:\n1. Membayar seluruh biaya survei sesuai invoice yang diterbitkan.\n2. Menyediakan akses dan dokumen yang diperlukan untuk keperluan survei.\n3. Memperbaiki temuan survei sesuai tenggat waktu yang ditetapkan.\n4. Menjaga kerahasiaan dokumen akreditasi.").

$this->struktur('6', 'Standar dan Instrumen Akreditasi', "Survei akreditasi [JENIS_FASKES] dilaksanakan berdasarkan:\n1. Standar Akreditasi [JENIS_FASKES] (SNARS).\n2. Instrumen Akreditasi terbaru yang ditetapkan Kementerian Kesehatan.\n3. Petunjuk Teknis Survei Akreditasi [JENIS_FASKES].\n4. Kode Etik Surveior Akreditasi.").

$this->struktur('7', 'Pembiayaan', "Biaya akreditasi meliputi tarif survei, akomodasi, dan transportasi surveior yang akan diinformasikan melalui invoice resmi dari PIHAK PERTAMA. Pembayaran dilakukan sesuai tata cara yang ditetapkan.").

$this->struktur('8', 'Kerahasiaan', "Kedua belah pihak sepakat untuk menjaga kerahasiaan seluruh informasi dan dokumen yang dipertukarkan dalam рамках pelaksanaan akreditasi ini, serta tidak menyebarkannya kepada pihak ketiga manapun tanpa persetujuan tertulis dari kedua belah pihak.").

$this->struktur('9', 'Jangka Waktu dan Berakhirnya Perjanjian', "Perjanjian ini berlaku sejak ditandatangani oleh kedua belah pihak dan berlaku sampai diterbitkannya keputusan akreditasi oleh Kementerian Kesehatan RI.").

$this->struktur('10', 'Penutup', "Hal-hal yang belum atau belum cukup diatur dalam perjanjian ini akan diatur secara musyawarah dalam bentuk annexe/addendum yang merupakan bagian tidak terpisahkan dari perjanjian ini.\n\nDemikian perjanjian ini dibuat dalam rangkap 2 (dua) bermeterai cukup dan masing-masing bermaterai cukup serta ditandatangani oleh kedua belah pihak.").

"

[FOOTER]
[/FOOTER]"
        );
    }

    private function bundledLab(): string
    {
        return $this->baseKonten(
"[HEADER]
[/HEADER]

".$this->struktur('1', 'Maksud dan Tujuan', "Maksud dari perjanjian ini adalah untuk melaksanakan survei akreditasi dalam рамках peningkatan mutu layanan dan validitas hasil pemeriksaan di [JENIS_FASKES].\n\nTujuan perjanjian ini adalah:\n1. Meningkatkan mutu layanan laboratorium.\n2. Menjamin validitas dan reliabilitas hasil pemeriksaan.\n3. Memenuhi standar akreditasi nasional (SNARS / KARS).\n4. Meningkatkan kepercayaan masyarakat terhadap hasil laboratorium.").

$this->struktur('2', 'Ruang Lingkup', "1. Pelaksanaan survei akreditasi laboratorium sesuai standar yang berlaku.\n2. Pembinaan dan evaluasi berkelanjutan terhadap mutu layanan laboratorium.\n3. Verifikasi hasil survei dan penerbitan rekomendasi ke Kementerian Kesehatan.\n4. Penerbitan Sertifikat Akreditasi bagi laboratorium yang memenuhi standar.").

$this->struktur('3', 'Pelaksanaan Survei', "1. PIHAK KEDUA mengajukan permohonan akreditasi kepada PIHAK PERTAMA dengan memenuhi persyaratan.\n2. PIHAK PERTAMA akan menugaskan surveior akreditasi yang terakreditasi setelah PIHAK KEDUA memenuhi persyaratan.\n3. Surveior berpedoman pada Standar Akreditasi [JENIS_FASKES], Instrumen Akreditasi, Petunjuk Teknis Survei Akreditasi, dan Kode Etik Surveior.\n4. Surveior mengirimkan laporan hasil survei melalui Sistem Informasi Nasional Akreditasi Fasyankes (SINAF).\n5. PIHAK PERTAMA menyampaikan rekomendasi hasil survei ke Kementerian Kesehatan untuk penerbitan Sertifikat Akreditasi.\n6. Survei verifikasi dapat dilaksanakan sesuai jadwal yang ditetapkan PIHAK PERTAMA.").

$this->struktur('4', 'Hak dan Kewajiban PIHAK PERTAMA', "Hak PIHAK PERTAMA:\n1. Mendapatkan akses terhadap dokumen dan data laboratorium.\n2. Mendapatkan tarif survei, akomodasi, dan transportasi sesuai peraturan.\n3. Menerbitkan Sertifikat Akreditasi bagi laboratorium yang memenuhi standar.\n\nKewajiban PIHAK PERTAMA:\n1. Melaksanakan survei akreditasi secara profesional dan independen.\n2. Menugaskan surveior yang kompeten dan tidak memiliki konflik kepentingan.\n3. Menjaga kerahasiaan seluruh informasi dan hasil pemeriksaan yang diperoleh.").

$this->struktur('5', 'Hak dan Kewajiban PIHAK KEDUA', "Hak PIHAK KEDUA:\n1. Mendapatkan informasi terkait pelaksanaan survei akreditasi.\n2. Mengusulkan perubahan surveior jika terdapat potensi conflict of interest.\n3. Mengajukan penundaan survei dengan alasan force majeure.\n4. Mengajukan banding dan remedial sesuai mekanisme yang berlaku.\n5. Mendapatkan Sertifikat Akreditasi jika memenuhi standar.\n\nKewajiban PIHAK KEDUA:\n1. Membayar tarif survei, akomodasi, dan transportasi surveior sesuai invoice.\n2. Menyediakan akses dan data laboratorium yang diperlukan untuk survei.\n3. Menjaga kerahasiaan hasil akreditasi.").

$this->struktur('6', 'Standar Akreditasi', "Survei akreditasi [JENIS_FASKES] dilaksanakan berdasarkan:\n1. Standar Akreditasi [JENIS_FASKES] (SNARS / KARS).\n2. Instrumen Akreditasi terbaru yang ditetapkan Kementerian Kesehatan.\n3. Petunjuk Teknis Survei Akreditasi [JENIS_FASKES].\n4. Kode Etik Surveior Akreditasi.").

$this->struktur('7', 'Pembiayaan', "Biaya akreditasi meliputi tarif survei, akomodasi, dan transportasi surveior yang akan diinformasikan melalui invoice resmi dari PIHAK PERTAMA. Pembayaran dilakukan sesuai tata cara yang ditetapkan.").

$this->struktur('8', 'Kerahasiaan', "Kedua belah pihak sepakat untuk menjaga kerahasiaan seluruh informasi dan data laboratorium yang dipertukarkan dalam рамках pelaksanaan akreditasi ini, serta tidak menyebarkannya kepada pihak ketiga tanpa persetujuan tertulis dari kedua belah pihak.").

$this->struktur('9', 'Jangka Waktu', "Perjanjian ini berlaku sejak ditandatangani oleh kedua belah pihak dan berlaku sampai diterbitkannya keputusan akreditasi oleh Kementerian Kesehatan RI.").

$this->struktur('10', 'Penutup', "Hal-hal yang belum atau belum cukup diatur dalam perjanjian ini akan diatur secara musyawarah dalam bentuk annexe/addendum yang merupakan bagian tidak terpisahkan dari perjanjian ini.\n\nDemikian perjanjian ini dibuat dalam rangkap 2 (dua) bermeterai cukup dan masing-masing ditandatangani oleh kedua belah pihak.").

"

[FOOTER]
[/FOOTER]"
        );
    }

    private function bundledRs(): string
    {
        return $this->baseKonten(
"[HEADER]
[/HEADER]

".$this->struktur('1', 'Maksud dan Tujuan', "Maksud dari perjanjian ini adalah untuk melaksanakan survei akreditasi dalam рамках peningkatan mutu pelayanan, keselamatan pasien, dan tata kelola yang baik di [JENIS_FASKES].\n\nTujuan perjanjian ini adalah:\n1. Meningkatkan mutu pelayanan klinis dan non-klinis rumah sakit.\n2. Meningkatkan keselamatan pasien dan tenaga kesehatan.\n3. Memenuhi standar akreditasi nasional (SNARS).\n4. Memastikan tata kelola rumah sakit yang good governance.\n5. Meningkatkan kepercayaan pasien dan masyarakat.").

$this->struktur('2', 'Ruang Lingkup', "1. Pelaksanaan survei akreditasi rumah sakit sesuai standar SNARS.\n2. Pembinaan dan evaluasi berkelanjutan terhadap sistem mutu rumah sakit.\n3. Verifikasi hasil survei dan penerbitan rekomendasi ke Kementerian Kesehatan.\n4. Penerbitan Sertifikat Akreditasi bagi rumah sakit yang memenuhi standar.").

$this->struktur('3', 'Pelaksanaan Survei', "1. PIHAK KEDUA mengajukan permohonan akreditasi kepada PIHAK PERTAMA dengan memenuhi persyaratan.\n2. PIHAK PERTAMA akan menugaskan surveior akreditasi yang terakreditasi setelah PIHAK KEDUA memenuhi persyaratan.\n3. Surveior berpedoman pada Standar Akreditasi [JENIS_FASKES] (SNARS), Instrumen Akreditasi, Petunjuk Teknis Survei Akreditasi, dan Kode Etik Surveior yang ditetapkan oleh Kementerian Kesehatan.\n4. Surveior mengirimkan laporan hasil survei melalui Sistem Informasi Nasional Akreditasi Fasyankes (SINAF).\n5. PIHAK PERTAMA menyampaikan rekomendasi hasil survei ke Kementerian Kesehatan untuk penerbitan Sertifikat Akreditasi.\n6. Survei verifikasi dapat dilaksanakan sesuai jadwal yang ditetapkan PIHAK PERTAMA.").

$this->struktur('4', 'Hak dan Kewajiban PIHAK PERTAMA', "Hak PIHAK PERTAMA:\n1. Mendapatkan akses terhadap dokumen dan data rumah sakit yang diperlukan.\n2. Mendapatkan tarif survei, akomodasi, dan transportasi sesuai peraturan.\n3. Menerbitkan Sertifikat Akreditasi bagi rumah sakit yang memenuhi standar.\n\nKewajiban PIHAK PERTAMA:\n1. Melaksanakan survei akreditasi secara profesional dan independen.\n2. Menugaskan surveior yang kompeten dan tidak memiliki konflik kepentingan.\n3. Menjaga kerahasiaan seluruh informasi dan data yang diperoleh selama survei.").

$this->struktur('5', 'Hak dan Kewajiban PIHAK KEDUA', "Hak PIHAK KEDUA:\n1. Mendapatkan informasi terkait pelaksanaan survei akreditasi.\n2. Mengusulkan perubahan surveior jika terdapat potensi conflict of interest.\n3. Mengajukan penundaan survei dengan alasan force majeure.\n4. Mengajukan banding, kenaikan status, dan remedial sesuai mekanisme yang berlaku.\n5. Mendapatkan Sertifikat Akreditasi jika memenuhi standar.\n6. Mencantumkan status akreditasi untuk keperluan publikasi.\n\nKewajiban PIHAK KEDUA:\n1. Membayar tarif survei, akomodasi, dan transportasi surveior sesuai invoice.\n2. Menyediakan akses dan data yang diperlukan untuk survei.\n3. Menjaga kerahasiaan dokumen akreditasi.").

$this->struktur('6', 'Standar Akreditasi', "Survei akreditasi [JENIS_FASKES] dilaksanakan berdasarkan:\n1. Standar Akreditasi [JENIS_FASKES] (SNARS).\n2. Instrumen Akreditasi terbaru yang ditetapkan Kementerian Kesehatan.\n3. Petunjuk Teknis Survei Akreditasi [JENIS_FASKES].\n4. Kode Etik Surveior Akreditasi.").

$this->struktur('7', 'Pembiayaan', "Biaya akreditasi meliputi tarif survei, akomodasi, dan transportasi surveior yang akan diinformasikan melalui invoice resmi dari PIHAK PERTAMA. Pembayaran dilakukan sesuai tata cara yang ditetapkan.").

$this->struktur('8', 'Kerahasiaan', "Kedua belah pihak sepakat menjaga kerahasiaan seluruh informasi dan data yang dipertukarkan dalam рамках pelaksanaan akreditasi ini, serta tidak menyebarkannya kepada pihak ketiga tanpa persetujuan tertulis dari kedua belah pihak.").

$this->struktur('9', 'Jangka Waktu', "Perjanjian ini berlaku sejak ditandatangani oleh kedua belah pihak dan berlaku sampai diterbitkannya keputusan akreditasi oleh Kementerian Kesehatan RI.").

$this->struktur('10', 'Penutup', "Hal-hal yang belum atau belum cukup diatur dalam perjanjian ini akan diatur secara musyawarah dalam bentuk annexe/addendum yang merupakan bagian tidak terpisahkan dari perjanjian ini.\n\nDemikian perjanjian ini dibuat dalam rangkap 2 (dua) bermeterai cukup dan masing-masing ditandatangani oleh kedua belah pihak.").

"

[FOOTER]
[/FOOTER]"
        );
    }

    private function bundledPuskesmswatki(): string
    {
        return $this->baseKonten(
"[HEADER]
[/HEADER]

".$this->struktur('1', 'Maksud dan Tujuan', "Maksud dari perjanjian ini adalah untuk melaksanakan survei akreditasi dalam рамках peningkatan mutu pelayanan dan keselamatan pasien di [JENIS_FASKES].\n\nTujuan perjanjian ini adalah:\n1. Meningkatkan mutu pelayanan [JENIS_FASKES].\n2. Meningkatkan keselamatan pasien.\n3. Memenuhi standar akreditasi nasional.").

$this->struktur('2', 'Ruang Lingkup', "1. Pelaksanaan survei akreditasi untuk peningkatan mutu pelayanan dan keselamatan pasien.\n2. Pembiayaan survei akreditasi untuk peningkatan mutu pelayanan dan keselamatan pasien.\n3. Hasil pelaksanaan survei untuk peningkatan mutu pelayanan dan keselamatan pasien.").

$this->struktur('3', 'Pelaksanaan Survei', "1. PIHAK KEDUA mengajukan permohonan akreditasi kepada PIHAK PERTAMA dengan memenuhi persyaratan.\n2. PIHAK PERTAMA akan menugaskan surveior akreditasi setelah PIHAK KEDUA memenuhi persyaratan.\n3. Surveior berpedoman pada Standar Akreditasi [JENIS_FASKES], Instrumen Akreditasi, Petunjuk Teknis Survei Akreditasi, dan Kode Etik Surveior yang ditetapkan oleh Kementerian Kesehatan.\n4. Surveior mengirimkan laporan hasil survei melalui Sistem Informasi Nasional Akreditasi Fasyankes (SINAF) kepada PIHAK PERTAMA untuk verifikasi.\n5. PIHAK PERTAMA mengirimkan rekomendasi ke Kementerian Kesehatan untuk penerbitan Sertifikat Akreditasi.\n6. Survei verifikasi pertama dapat dilaksanakan dua tahun setelah survei awal, dan survei verifikasi kedua empat tahun setelah survei awal.").

$this->struktur('4', 'Hak dan Kewajiban PIHAK PERTAMA', "Hak PIHAK PERTAMA:\n1. Mendapatkan akses pemenuhan persyaratan survei akreditasi.\n2. Mendapatkan akses terhadap dokumen pendukung standar akreditasi.\n3. Mendapatkan akses terhadap teknologi informasi sesuai kebutuhan survei.\n4. Mendapatkan tarif survei, akomodasi, dan transportasi sesuai peraturan.\n\nKewajiban PIHAK PERTAMA:\n1. Melaksanakan survei akreditasi sesuai peraturan.\n2. Menugaskan surveior sesuai peraturan.\n3. Menjaga kerahasiaan dokumen akreditasi dan tidak menyebarluaskan tanpa izin PIHAK KEDUA.").

$this->struktur('5', 'Hak dan Kewajiban PIHAK KEDUA', "Hak PIHAK KEDUA:\n1. Mendapatkan informasi terkait pelaksanaan survei akreditasi.\n2. Mengusulkan perubahan surveior jika ada potensi conflict of interest.\n3. Mengajukan permohonan penundaan survei jika terjadi force majeure.\n4. Mengajukan banding, kenaikan status, dan remedial sesuai peraturan.\n5. Mendapatkan sertifikat jika lulus survei akreditasi.\n6. Mencantumkan status akreditasi untuk publikasi.\n\nKewajiban PIHAK KEDUA:\n1. Membayar tarif survei, akomodasi, dan transportasi surveior.\n2. Menyediakan akses dan data yang diperlukan untuk survei.\n3. Menjaga kerahasiaan dokumen akreditasi yang bersifat rahasia.").

$this->struktur('6', 'Pembiayaan', "Biaya akreditasi ditetapkan dalam invoice yang diterbitkan setelah PKS ini ditandatangani. Pembayaran mengikuti tata cara yang diinformasikan melalui sistem ERP akreditasi [NAMA_LEMBAGA].").

$this->struktur('7', 'Kerahasiaan', "Kedua belah pihak sepakat menjaga kerahasiaan seluruh informasi yang dipertukarkan dalam рамках pelaksanaan akreditasi ini dan tidak akan menyebarkannya kepada pihak ketiga tanpa persetujuan tertulis dari kedua belah pihak.").

$this->struktur('8', 'Perselisihan', "Apabila terjadi perselisihan dalam pelaksanaan perjanjian ini, kedua belah pihak sepakat untuk menyelesaikannya secara musyawarah untuk mufakat.").

$this->struktur('9', 'Jangka Waktu', "Perjanjian ini berlaku sejak ditandatangani oleh kedua belah pihak dan berlaku sampai dengan diterbitkannya keputusan akreditasi oleh Kementerian Kesehatan.").

$this->struktur('10', 'Penutup', "Hal-hal yang belum diatur dalam perjanjian ini akan diatur dalam annexe/addendum yang merupakan bagian tidak terpisahkan dari perjanjian ini.\n\nDemikian perjanjian ini dibuat dalam rangkap 2 (dua) asli yang sama buninya dan masing-masing ditandatangani oleh kedua belah pihak.").

"

[FOOTER]
[/FOOTER]"
        );
    }
}