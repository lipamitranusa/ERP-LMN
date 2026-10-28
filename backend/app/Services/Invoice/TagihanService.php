<?php

namespace App\Services\Invoice;

use App\Models\Invoice;
use App\Services\LembagaHeaderService;
use Carbon\Carbon;

/**
 * Menyusun data tagihan (invoice) yang dipakai bersama oleh:
 *   - TagihanNotificationController (preview + body email/WhatsApp)
 *   - InvoiceReminderService (pengingat otomatis + lampiran PDF)
 *   - InvoicePdfGenerator (lampiran PDF)
 *
 * Satu sumber data supaya isi email dan PDF tidak pernah berbeda.
 */
class TagihanService
{
    public function __construct(private LembagaHeaderService $lembaga) {}

    public function build(Invoice $inv): array
    {
        if (! $inv->relationLoaded('siklus') || ! $inv->relationLoaded('items')) {
            $inv->load(['siklus.faskes.jenisFaskes', 'siklus.lembaga', 'items', 'pks']);
        }

        $faskes = $inv->siklus->faskes;
        $items = [];
        $totalItems = 0.0;

        foreach ($inv->items as $item) {
            $jumlah = (float) $item->jumlah;
            $totalItems += $jumlah;
            $items[] = [
                'no' => count($items) + 1,
                'nama_biaya' => $item->nama_biaya,
                'deskripsi' => $item->deskripsi,
                'satuan' => $this->satuanLabel($item->satuan),
                'jumlah' => $jumlah,
            ];
        }

        $statusLabel = match ($inv->status) {
            Invoice::STATUS_BELUM_BAYAR => 'BELUM LUNAS',
            Invoice::STATUS_SEBAGIAN => 'SEBAGIAN LUNAS',
            Invoice::STATUS_LUNAS => 'LUNAS',
            Invoice::STATUS_EXPIRED => 'EXPIRED',
            Invoice::STATUS_REFUNDED => 'REFUNDED',
            default => strtoupper($inv->status),
        };

        $statusColor = match ($inv->status) {
            Invoice::STATUS_LUNAS => '#16A34A',
            Invoice::STATUS_SEBAGIAN => '#D97706',
            Invoice::STATUS_EXPIRED, Invoice::STATUS_REFUNDED => '#DC2626',
            default => '#2563EB',
        };

        $metodeLabel = $this->metodeLabel($inv);

        return [
            'invoice_id' => $inv->id,
            'nomor_invoice' => $inv->nomor_invoice,
            'nomor_pks' => $inv->pks?->nomor_pks,
            'tanggal_terbit' => Carbon::parse($inv->diterbitkan_pada)->translatedFormat('d F Y'),
            'tanggal_cetak' => now()->translatedFormat('d F Y H:i'),
            'due_date' => Carbon::parse($inv->due_date)->translatedFormat('d F Y'),
            'hari_due' => (int) now()->startOfDay()->diffInDays(Carbon::parse($inv->due_date)->startOfDay(), false) * -1,
            'status' => $inv->status,
            'status_label' => $statusLabel,
            'status_color' => $statusColor,
            'total_tagihan' => (float) $inv->total_tagihan,
            'total_diterima' => (float) $inv->totalDiterima(),
            'sisa_tagihan' => (float) $inv->sisaTagihan(),
            'metode_pembayaran' => $metodeLabel,
            'va_number' => $inv->payment_reference,
            'va_expired' => $inv->payment_expired_at?->translatedFormat('d F Y H:i'),
            'va_bank' => $inv->va_bank,
            'faskes' => [
                'nama' => $faskes->nama,
                'jenis' => $faskes->jenis,
                'alamat' => $faskes->alamat,
                'kota' => $faskes->kota,
                'provinsi' => $faskes->provinsi,
                'email' => $faskes->email,
                'telepon' => $faskes->telepon,
                'nama_pimpinana' => $faskes->nama_pimpinana,
            ],
            'siklus' => [
                'nama' => $inv->siklus?->nama,
            ],
            'lembaga' => $this->lembaga->getHeader($inv->siklus?->lembaga),
            'items' => $items,
            'total_items' => round($totalItems, 2),
        ];
    }

    private function satuanLabel(string $satuan): string
    {
        return match ($satuan) {
            'tetap' => 'Tetap',
            'per_siklus' => 'Per Siklus',
            'per_sertifikat' => 'Per Sertifikat',
            'per_tahun' => 'Per Tahun',
            'periksa' => 'Per Periksa',
            'sekali' => 'Sekali Bayar',
            default => ucfirst($satuan),
        };
    }

    private function metodeLabel(Invoice $inv): string
    {
        return match ($inv->metode_pembayaran) {
            'va', 'virtual_account' => 'Virtual Account',
            'qris' => 'QRIS',
            'transfer' => 'Transfer Manual',
            default => $inv->metode_pembayaran ?: 'Transfer Manual',
        };
    }
}
