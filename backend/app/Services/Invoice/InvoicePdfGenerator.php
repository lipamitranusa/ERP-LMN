<?php

namespace App\Services\Invoice;

use App\Services\LembagaHeaderService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Generate PDF invoice (tagihan) dari data tagihan yang sudah disiapkan
 * TagihanNotificationController.
 *
 * Data tagihan (array) sudah berisi ringkasan, item, dan info pembayaran
 * sehingga PDF dan body email memakai sumber data yang sama.
 */
class InvoicePdfGenerator
{
    public function __construct(private LembagaHeaderService $lembaga) {}

    /**
     * @param  array  $tagihan  Data tagihan (lihat TagihanNotificationController::buildTagihanData)
     * @return array{filename: string, content: string}  filename + binary PDF
     */
    public function generate(array $tagihan): array
    {
        // Kop mengikuti lembaga penerbit invoice (siklus), bukan lembaga aktif global.
        $kop = $tagihan['lembaga'] ?? $this->lembaga->getHeader();

        $html = view('pdf.invoice', [
            'tagihan' => $tagihan,
            'kop' => $kop,
            'logo' => $this->logoDataUri($kop['logo_path'] ?? null),
        ])->render();

        $pdf = Pdf::loadHTML($html)
            ->setPaper('a4')
            ->setOptions([
                'isRemoteEnabled' => false,
                'isHtml5ParserEnabled' => true,
            ]);

        $filename = 'Invoice-' . preg_replace('/[^A-Za-z0-9._-]/', '-', (string) $tagihan['nomor_invoice']) . '.pdf';

        return [
            'filename' => $filename,
            'content' => $pdf->output(),
        ];
    }

    /**
     * Logo tidak bisa diambil via HTTP (route logo butuh auth), jadi
     * di-embed sebagai data URI supaya dompdf bisa merendernya.
     */
    private function logoDataUri(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        try {
            $disk = Storage::disk('r2');
            if (! $disk->exists($path)) {
                return null;
            }

            $mime = $disk->mimeType($path) ?: 'image/png';
            if (! str_starts_with($mime, 'image/')) {
                return null;
            }

            return 'data:'.$mime.';base64,'.base64_encode($disk->get($path));
        } catch (\Throwable $e) {
            Log::warning('invoice.pdf.logo_failed', ['path' => $path, 'error' => $e->getMessage()]);
            return null;
        }
    }
}
