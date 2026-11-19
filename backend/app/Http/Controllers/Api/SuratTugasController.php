<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lembaga;
use App\Models\Penugasan;
use App\Models\SuratTugas;
use App\Services\AttachmentService;
use App\Services\AuditService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * FR-3.1: Penerbitan Surat Tugas Survei dalam format PDF terstandardisasi.
 * Privilege: Penugasan
 */
class SuratTugasController extends Controller
{
    /**
     * POST /api/penugasan/surat-tugas
     * Terbitkan Surat Tugas untuk penugasan.
     * FR-3.1: PDF terstandardisasi.
     */
    public function store(Request $request, AttachmentService $attachment, AuditService $audit): JsonResponse
    {
        $data = $request->validate([
            'penugasan_id' => 'required|uuid|exists:penugasan,id',
        ]);

        $penugasan = Penugasan::with(['siklus.faskes', 'tenagaAhli'])->findOrFail($data['penugasan_id']);

        if ($penugasan->suratTugas) {
            abort(response()->json(['message' => 'Surat Tugas sudah pernah diterbitkan untuk penugasan ini.'], 422));
        }

        // Generate nomor surat
        $nomorSurat = $this->generateNomorSurat($penugasan);

        // Generate PDF
        $pdf = Pdf::loadView('surat_tugas.survei', [
            'surat' => [
                'nomor_surat' => $nomorSurat,
                'tanggal_terbit' => now()->locale('id')->format('d F Y'),
                'nama_lembaga' => $penugasan->siklus->lembaga?->nama ?? 'LIPA MITRA NUSA',
                'nama_faskes' => $penugasan->siklus->faskes->nama ?? '-',
                'alamat_faskes' => $penugasan->siklus->faskes->alamat ?? '-',
                'tipe_faskes' => $penugasan->siklus->faskes->tipe_faskes ?? '-',
                'nama_surveior' => $penugasan->tenagaAhli->nama,
                'nomor_induk_surveior' => $penugasan->tenagaAhli->nomor_induk_surveior,
                'jenis_penugasan' => $penugasan->jenis,
                'tanggal_permohonan' => $penugasan->siklus->tanggal_pengajuan
                    ? $penugasan->siklus->tanggal_pengajuan->locale('id')->format('d F Y')
                    : '-',
            ],
        ]);

        $pdfContent = $pdf->output();
        $filename = "{$nomorSurat}.pdf";
        $path = $attachment->put($pdfContent, 'surat_tugas', $filename);

        $surat = SuratTugas::create([
            'id' => (string) Str::uuid(),
            'penugasan_id' => $penugasan->id,
            'nomor_surat' => $nomorSurat,
            'tanggal_terbit' => now()->toDateString(),
            'path_pdf' => $path,
            'diterbitkan_oleh' => $request->user()->id,
        ]);

        $audit->record('surat_tugas.terbit', null, $surat, 'SuratTugas', $surat->id);

        $surat->load('penerbit');

        return response()->json([
            'data' => $surat,
            'message' => 'Surat Tugas berhasil diterbitkan.',
        ], 201);
    }

    /**
     * GET /api/penugasan/surat-tugas/{surat}
     */
    public function show(SuratTugas $surat): JsonResponse
    {
        $surat->load(['penugasan.siklus.faskes', 'penugasan.tenagaAhli', 'penerbit']);
        return response()->json(['data' => $surat]);
    }

    /**
     * GET /api/penugasan/surat-tugas/{surat}/download
     * Stream download PDF.
     */
    public function download(SuratTugas $surat, AttachmentService $attachment, AuditService $audit)
    {
        $this->ensurePdfAvailable($surat, $attachment);
        $surat->forceFill(['diunduh_pada' => now()])->save();

        return $attachment->response($surat->path_pdf, "Surat_Tugas_{$surat->nomor_surat}.pdf");
    }

    /**
     * GET /api/penugasan/surat-tugas/{surat}/serve
     * Stream PDF untuk dilihat di browser (preview).
     */
    public function serve(SuratTugas $surat, AttachmentService $attachment)
    {
        $this->ensurePdfAvailable($surat, $attachment);
        return $attachment->response($surat->path_pdf, null, true);
    }

    /**
     * Regenerasi Surat Tugas bila record lama menunjuk file yang sudah hilang,
     * atau bila penerbitan lama menyimpan path lampiran yang bukan PDF Surat Tugas.
     */
    private function ensurePdfAvailable(SuratTugas $surat, AttachmentService $attachment): void
    {
        $fileName = $surat->path_pdf ? strtolower(basename($surat->path_pdf)) : '';
        $isWrongAttachment = str_contains($fileName, 'permohonan')
            || str_contains($fileName, 'lampiran');

        if ($surat->path_pdf && $attachment->exists($surat->path_pdf) && ! $isWrongAttachment) {
            return;
        }

        $surat->loadMissing([
            'penugasan.siklus.faskes',
            'penugasan.siklus.lembaga',
            'penugasan.tenagaAhli',
        ]);

        $penugasan = $surat->penugasan;
        if (! $penugasan) {
            abort(404, 'Penugasan Surat Tugas tidak ditemukan.');
        }

        $pdf = Pdf::loadView('surat_tugas.survei', [
            'surat' => [
                'nomor_surat' => $surat->nomor_surat,
                'tanggal_terbit' => now()->locale('id')->format('d F Y'),
                'nama_lembaga' => $penugasan->siklus->lembaga?->nama ?? 'LIPA MITRA NUSA',
                'nama_faskes' => $penugasan->siklus->faskes->nama ?? '-',
                'alamat_faskes' => $penugasan->siklus->faskes->alamat ?? '-',
                'tipe_faskes' => $penugasan->siklus->faskes->tipe_faskes ?? '-',
                'nama_surveior' => $penugasan->tenagaAhli->nama,
                'nomor_induk_surveior' => $penugasan->tenagaAhli->nomor_induk_surveior,
                'jenis_penugasan' => $penugasan->jenis,
                'tanggal_permohonan' => $penugasan->siklus->tanggal_pengajuan
                    ? $penugasan->siklus->tanggal_pengajuan->locale('id')->format('d F Y')
                    : '-',
            ],
        ]);

        $filename = ($surat->nomor_surat ?: 'Surat-Tugas') . '.pdf';
        $oldPath = $surat->path_pdf;
        $newPath = $attachment->put($pdf->output(), 'surat_tugas', $filename, $oldPath);

        $surat->forceFill(['path_pdf' => $newPath])->save();
    }

    /**
     * Generate nomor surat terstandardisasi.
     * Format: ST-LMN-YYYY-NNNN
     */
    private function generateNomorSurat(Penugasan $penugasan): string
    {
        $year = now()->year;
        $prefix = $penugasan->jenis === Penugasan::JENIS_SURVEI ? 'ST' : 'STV';
        $last = SuratTugas::whereYear('tanggal_terbit', $year)
            ->where('nomor_surat', 'like', "{$prefix}-{$year}-%")
            ->max('nomor_surat');

        $sequence = 1;
        if ($last && preg_match('/-(\d{4})$/', $last, $matches)) {
            $sequence = (int) $matches[1] + 1;
        }

        return sprintf('%s-%d-%04d', $prefix, $year, $sequence);
    }
}
