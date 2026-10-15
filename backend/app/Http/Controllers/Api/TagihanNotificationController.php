<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\NotifikasiTagihan;
use App\Services\LembagaHeaderService;
use App\Services\Notification\EmailChannel;
use App\Services\Notification\WhatsAppChannel;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * TagihanNotificationController — kirim invoice/tagihan ke faskes
 * via WhatsApp atau Email.
 *
 * Endpoint:
 *   GET  /api/invoice/{invoice}/tagihan/generate   → data tagihan (JSON)
 *   GET  /api/invoice/{invoice}/tagihan/preview    → HTML preview
 *   POST /api/invoice/{invoice}/tagihan/send       → kirim via WA / Email
 *
 * Privilege: "Kontrak & Invoicing"
 */
class TagihanNotificationController extends Controller
{
    public function __construct(
        private WhatsAppChannel $wa,
        private EmailChannel $email,
        private LembagaHeaderService $lembaga,
    ) {}

    /**
     * GET /api/invoice/{invoice}/tagihan/generate
     * Generate data tagihan (invoice) lengkap untuk preview/kirim.
     */
    public function generate(Invoice $invoice): JsonResponse
    {
        $invoice->load(['siklus.faskes.jenisFaskes', 'items', 'pks']);

        $tagihan = $this->buildTagihanData($invoice);

        return response()->json(['data' => $tagihan]);
    }

    /**
     * GET /api/invoice/{invoice}/tagihan/preview
     * HTML preview tagihan — untuk ditampilkan di iframe print.
     */
    public function preview(Invoice $invoice): \Symfony\Component\HttpFoundation\Response
    {
        $invoice->load(['siklus.faskes.jenisFaskes', 'items', 'pks']);

        $tagihan = $this->buildTagihanData($invoice);
        $html = $this->renderHtml($tagihan);

        return response($html, 200, ['Content-Type' => 'text/html']);
    }

    /**
     * POST /api/invoice/{invoice}/tagihan/send
     * Kirim tagihan via WhatsApp atau Email.
     * Body: { channel: "whatsapp" | "email" | "both" }
     */
    public function send(Request $request, Invoice $invoice): JsonResponse
    {
        $invoice->load(['siklus.faskes.jenisFaskes', 'items', 'pks']);

        $channel = $request->string('channel', 'whatsapp')->toString();
        $tagihan = $this->buildTagihanData($invoice);
        $htmlSlip = $this->renderHtml($tagihan);
        $plainSlip = $this->renderPlain($tagihan);
        $subject = "Invoice {$tagihan['nomor_invoice']} — {$tagihan['faskes']['nama']}";

        $faskes = $invoice->siklus->faskes;
        $results = [];

        if (! $faskes->email) {
            $results[] = [
                'channel' => 'email',
                'recipient' => null,
                'status' => 'gagal',
                'error' => 'Email faskes belum terdaftar.',
            ];
        }

        if (! ($faskes->telepon || $faskes->telepon_pimpinana)) {
            $results[] = [
                'channel' => 'whatsapp',
                'recipient' => null,
                'status' => 'gagal',
                'error' => 'Nomor WhatsApp faskes belum terdaftar.',
            ];
        }

        if ($channel === 'whatsapp' || $channel === 'both') {
            $phone = $faskes->telepon ?: $faskes->telepon_pimpinana;
            if ($phone) {
                $sent = $this->wa->send($phone, $subject, $this->buildWhatsAppMessage($tagihan));
                $results[] = [
                    'channel' => 'whatsapp',
                    'recipient' => $phone,
                    'status' => $sent ? 'terkirim' : 'gagal',
                    'error' => $sent ? null : $this->wa->getLastError(),
                ];
            }
        }

        if ($channel === 'email' || $channel === 'both') {
            if ($faskes->email) {
                $sent = $this->email->send($faskes->email, $subject, $plainSlip);
                $results[] = [
                    'channel' => 'email',
                    'recipient' => $faskes->email,
                    'status' => $sent ? 'terkirim' : 'gagal',
                    'error' => $sent ? null : $this->email->getLastError(),
                ];
            }
        }

        // Catat di notifikasi_tagihan untuk audit trail
        foreach ($results as $r) {
            if ($r['status'] === 'terkirim') {
                NotifikasiTagihan::create([
                    'siklus_id' => $invoice->siklus_id,
                    'jenis' => 'tagihan_invoice',
                    'channel' => $r['channel'],
                    'recipient' => $r['recipient'],
                    'status' => NotifikasiTagihan::STATUS_TERKIRIM,
                    'dikirim_pada' => now(),
                    'payload' => [
                        'invoice_id' => $invoice->id,
                        'nomor_invoice' => $invoice->nomor_invoice,
                        'subject' => $subject,
                        'message_preview' => mb_substr($plainSlip, 0, 200),
                    ],
                ]);
            }
        }

        $allSent = count(array_filter($results, fn ($r) => $r['status'] === 'terkirim')) > 0;
        $anyFailed = count(array_filter($results, fn ($r) => $r['status'] === 'gagal')) > 0;

        return response()->json([
            'message' => $allSent
                ? ($anyFailed ? 'Sebagian tagihan terkirim.' : 'Tagihan berhasil dikirim.')
                : 'Gagal mengirim tagihan.',
            'data' => [
                'invoice_id' => $invoice->id,
                'nomor_invoice' => $invoice->nomor_invoice,
                'channel' => $channel,
                'results' => $results,
            ],
        ]);
    }

    // ─── Build Data ─────────────────────────────────────────────────────

    private function buildTagihanData(Invoice $inv): array
    {
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

    // ─── WhatsApp Message ───────────────────────────────────────────────

    private function buildWhatsAppMessage(array $tagihan): string
    {
        $faskes = $tagihan['faskes'];
        $statusEmoji = $tagihan['status'] === 'lunas' ? '✅' : '⏳';
        $hari = $tagihan['hari_due'];

        $lines = [
            "🏥 *INVOICE AKREDITASI FASKES*",
            "",
            "Yth. *{$faskes['nama']}*",
            "",
            "Berikut detail tagihan akreditasi untuk institutions Anda:",
            "",
            "📋 *Detail Invoice*",
            "No. Invoice    : {$tagihan['nomor_invoice']}",
            "Tanggal        : {$tagihan['tanggal_terbit']}",
            "Jatuh Tempo    : {$tagihan['due_date']}",
            "Status         : {$statusEmoji} *{$tagihan['status_label']}*",
            "",
            "💰 *Total Tagihan: Rp " . number_format($tagihan['total_tagihan'], 0, ',', '.') . "*",
        ];

        if ($tagihan['status'] !== 'lunas') {
            if ($tagihan['sisa_tagihan'] > 0) {
                $lines[] = "Sisa Tagihan  : Rp " . number_format($tagihan['sisa_tagihan'], 0, ',', '.');
            }
            if ($hari > 0) {
                $lines[] = "⏰ Jatuh tempo dalam *{$hari} hari*";
            } elseif ($hari === 0) {
                $lines[] = "⚠️ *JATUH TEMPO HARI INI*";
            } else {
                $lines[] = "🚨 *SUDAH LEWAT JATUH TEMPO* (" . abs($hari) . " hari)";
            }
            if ($tagihan['va_number']) {
                $lines[] = "";
                $lines[] = "🏦 *Virtual Account*: {$tagihan['va_number']}";
                if ($tagihan['va_bank']) {
                    $lines[] = "   Bank: {$tagihan['va_bank']}";
                }
            }
        }

        $lines[] = "";
        $lines[] = "Hormat kami,";
        $lines[] = config('app.name', 'Lembaga Akreditasi Kesehatan');

        return implode("\n", $lines);
    }

    // ─── HTML Render ───────────────────────────────────────────────────

    private function formatRp(float $n): string
    {
        return 'Rp ' . number_format($n, 0, ',', '.');
    }

    private function renderHtml(array $tagihan): string
    {
        $faskes = $tagihan['faskes'];
        $items = $tagihan['items'];
        $isLunas = $tagihan['status'] === 'lunas';
        $isExpired = $tagihan['hari_due'] < 0 && ! $isLunas;

        $kop = $this->lembaga->getHeader();
        $logoHtml = $kop['logo_url']
            ? "<img src='{$kop['logo_url']}' alt='{$kop['nama']}' style='width:48px;height:48px;object-fit:contain;border-radius:8px' />"
            : "<div class='logo'>{$kop['nama_singkat']}</div>";
        $kopNpwp = $kop['npwp']
            ? "<div style='font-size:10px;color:#64748B;margin-top:2px'>NPWP: {$kop['npwp']}</div>"
            : '';

        $pjwbRow = $faskes['nama_pimpinana']
            ? "<tr><td style='padding:4px 0'>Penanggung Jawab</td><td>: {$faskes['nama_pimpinana']}</td></tr>"
            : '';
        $pksRow = $tagihan['nomor_pks']
            ? "<tr><td style='padding:4px 0'>No. PKS</td><td>: {$tagihan['nomor_pks']}</td></tr>"
            : '';

        $itemRows = '';
        foreach ($items as $item) {
            $descHtml = $item['deskripsi']
                ? "<div style='font-size:11px;color:#64748B;margin-top:2px'>{$item['deskripsi']}</div>"
                : '';
            $itemRows .= "<tr>
                <td style='padding:8px;border-bottom:1px solid #E2E8F0'>{$item['no']}</td>
                <td style='padding:8px;border-bottom:1px solid #E2E8F0'>
                    <div style='font-weight:500;color:#1E293B'>{$item['nama_biaya']}</div>
                    {$descHtml}
                </td>
                <td style='padding:8px;border-bottom:1px solid #E2E8F0;text-align:center;font-size:12px;color:#64748B'>{$item['satuan']}</td>
                <td style='padding:8px;border-bottom:1px solid #E2E8F0;text-align:right;font-weight:600;white-space:nowrap'>{$this->formatRp($item['jumlah'])}</td>
            </tr>";
        }

        $vaSection = '';
        if ($tagihan['va_number'] && ! $isLunas) {
            $vaSection = "<div style='background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:14px;margin-top:16px'>
                <div style='font-size:11px;font-weight:700;color:#1E40AF;text-transform:uppercase;margin-bottom:8px'>Informasi Pembayaran</div>
                <table style='width:100%;font-size:12px'>
                    <tr><td style='color:#64748B;padding:2px 0;width:120px'>Metode</td><td style='font-weight:600;color:#1E293B'>{$tagihan['metode_pembayaran']}</td></tr>
                    " . ($tagihan['va_bank'] ? "<tr><td style='color:#64748B;padding:2px 0'>Bank</td><td style='font-weight:600;color:#1E293B'>{$tagihan['va_bank']}</td></tr>" : '') . "
                    <tr><td style='color:#64748B;padding:2px 0'>No. Rekening</td><td style='font-family:monospace;font-weight:700;color:#1E40AF;font-size:15px'>{$tagihan['va_number']}</td></tr>
                    " . ($tagihan['va_expired'] ? "<tr><td style='color:#64748B;padding:2px 0'>Berlaku s/d</td><td style='color:#DC2626;font-weight:600'>{$tagihan['va_expired']}</td></tr>" : '') . "
                </table>
            </div>";
        }

        $dueWarning = '';
        if (! $isLunas) {
            if ($tagihan['hari_due'] < 0) {
                $dueWarning = "<div style='background:#FEE2E2;border:1px solid #FECACA;border-radius:8px;padding:10px 14px;margin-top:10px;font-size:12px;color:#991B1B'>
                    ⚠️ <strong>PERHATIAN:</strong> Tagihan sudah melampaui jatuh tempo seitjak {$tagihan['due_date']}. Mohon segera lakukan pembayaran.
                </div>";
            } elseif ($tagihan['hari_due'] <= 3) {
                $dueWarning = "<div style='background:#FEF9C3;border:1px solid #FDE68A;border-radius:8px;padding:10px 14px;margin-top:10px;font-size:12px;color:#92400E'>
                    ⏰ Tagihan akan jatuh tempo dalam <strong>{$tagihan['hari_due']} hari</strong> ({$tagihan['due_date']}). Mohon perhatikan.
                </div>";
            }
        }

        return <<<HTML
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Invoice {$tagihan['nomor_invoice']}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #1E293B; background: #fff; padding: 40px; }
  @media print { body { padding: 20px; } }

  .container { max-width: 800px; margin: 0 auto; }

  .header { display: flex; align-items: center; gap: 16px; padding-bottom: 16px; border-bottom: 3px solid #1E293B; margin-bottom: 24px; }
  .logo { width: 48px; height: 48px; background: #2563EB; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; font-weight: 800; }
  .header-text h1 { font-size: 18px; font-weight: 800; color: #1E293B; }
  .header-text p { font-size: 11px; color: #64748B; margin-top: 2px; }
  .nomor-badge { background: #2563EB; color: white; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; margin-top: 4px; display: inline-block; }

  .top-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
  .meta-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px; }
  .meta-box h3 { font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; }
  .meta-box table { width: 100%; border-collapse: collapse; }
  .meta-box td { padding: 3px 0; font-size: 12px; }
  .meta-box td:first-child { width: 130px; color: #64748B; }

  .items-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  .items-table thead th { background: #1E293B; color: white; padding: 10px 8px; font-size: 11px; font-weight: 700; }
  .items-table thead th:first-child { border-radius: 8px 0 0 0; }
  .items-table thead th:last-child { border-radius: 0 8px 0 0; }
  .items-table tfoot td { padding: 10px 8px; font-size: 14px; font-weight: 800; background: #F1F5F9; border-radius: 0 0 8px 8px; }

  .total-box { background: {$tagihan['status_color']}1a; border: 2px solid {$tagihan['status_color']}; border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .total-label { font-size: 13px; font-weight: 600; color: {$tagihan['status_color']}; }
  .total-value { font-size: 22px; font-weight: 800; color: {$tagihan['status_color']}; }

  .status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: 700; background: {$tagihan['status_color']}1a; color: {$tagihan['status_color']}; border: 1px solid {$tagihan['status_color']}40; }

  .footer { margin-top: 24px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px; font-size: 11px; color: #64748B; line-height: 1.6; }
  .footer strong { color: #475569; }

  .print-note { text-align: center; margin-top: 20px; font-size: 11px; color: #94A3B8; }
</style>
</head>
<body>
<div class="container">

  <!-- Header -->
  <div class="header">
    {$logoHtml}
    <div class="header-text">
      <h1>Invoice Akreditasi</h1>
      <p>{$kop['nama']}</p>
      {$kopNpwp}
      <div class="nomor-badge">{$tagihan['nomor_invoice']}</div>
    </div>
  </div>

  <!-- Meta: Faskes & Invoice -->
  <div class="top-meta">
    <div class="meta-box">
      <h3>Tagihan Untuk</h3>
      <table>
        <tr><td style='padding:4px 0'>Institusi</td><td>: {$faskes['nama']}</td></tr>
        <tr><td style='padding:4px 0'>Jenis</td><td>: {$faskes['jenis']}</td></tr>
        <tr><td style='padding:4px 0'>Alamat</td><td>: {$faskes['alamat']}, {$faskes['kota']}</td></tr>
        <tr><td style='padding:4px 0'>Email</td><td>: {$faskes['email']}</td></tr>
        <tr><td style='padding:4px 0'>Telepon</td><td>: {$faskes['telepon']}</td></tr>
        {$pjwbRow}
      </table>
    </div>
    <div class="meta-box">
      <h3>Detail Invoice</h3>
      <table>
        <tr><td style='padding:4px 0'>No. Invoice</td><td>: {$tagihan['nomor_invoice']}</td></tr>
        {$pksRow}
        <tr><td style='padding:4px 0'>Tanggal Terbit</td><td>: {$tagihan['tanggal_terbit']}</td></tr>
        <tr><td style='padding:4px 0'>Jatuh Tempo</td><td>: {$tagihan['due_date']}</td></tr>
        <tr><td style='padding:4px 0'>Status</td><td>: {$tagihan['status_label']}</td></tr>
        <tr><td style='padding:4px 0'>Dicetak</td><td>: {$tagihan['tanggal_cetak']}</td></tr>
      </table>
    </div>
  </div>

  <!-- Status & Total -->
  <div class="total-box">
    <div>
      <div class="total-label">TOTAL TAGIHAN</div>
      <div class="status-badge" style="margin-top:6px">
        {$tagihan['status_label']}
      </div>
    </div>
    <div class="total-value">{$this->formatRp($tagihan['total_tagihan'])}</div>
  </div>

  {$dueWarning}

  <!-- Items Table -->
  <table class="items-table">
    <thead>
      <tr>
        <th style="text-align:center;width:40px">No</th>
        <th>Komponen Biaya</th>
        <th style="text-align:center;width:120px">Tipe</th>
        <th style="text-align:right;width:140px">Jumlah</th>
      </tr>
    </thead>
    <tbody>
      {$itemRows}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3" style="text-align:right;font-weight:700;color:#475569;font-size:12px">TOTAL</td>
        <td style="text-align:right;font-weight:800;color:#1E293B;font-size:15px">{$this->formatRp($tagihan['total_items'])}</td>
      </tr>
    </tfoot>
  </table>

  <!-- VA / Payment Info -->
  {$vaSection}

  <!-- Footer -->
  <div class="footer">
    <strong>Catatan:</strong> Invoice ini diterbitkan atas proses akreditasi faskes di bawah koordinasi {$tagihan['siklus']['nama']}.<br>
    Pembayaran dapat dilakukan via Virtual Account, QRIS, atau transfer manual ke rekening yang tertera. Bukti pembayaran harap disimpan sebagai referensi.<br>
    Jika ada pertanyaan, silakan hubungi kami melalui kontak yang tertera.
  </div>

  <div class="print-note">
    Dokumen ini dicetak dari sistem ERP Akreditasi Faskes — {$tagihan['tanggal_cetak']}
  </div>

</div>
</body>
</html>
HTML;
    }

    private function renderPlain(array $tagihan): string
    {
        $faskes = $tagihan['faskes'];
        $lines = [
            "═══════════════════════════════════════════════════",
            "                    INVOICE",
            "═══════════════════════════════════════════════════",
            "",
            "No. Invoice   : {$tagihan['nomor_invoice']}",
            "Tanggal       : {$tagihan['tanggal_terbit']}",
            "Jatuh Tempo  : {$tagihan['due_date']}",
            "Status        : {$tagihan['status_label']}",
            "",
            "───────────────────────────────────────────────────",
            "UNTUK:",
            "  {$faskes['nama']}",
            "  {$faskes['jenis']}",
            "  {$faskes['alamat']}",
            "  {$faskes['kota']}, {$faskes['provinsi']}",
            "  Telp: {$faskes['telepon']}",
            "  Email: {$faskes['email']}",
            "",
            "───────────────────────────────────────────────────",
            "RINCIAN BIAYA:",
            "───────────────────────────────────────────────────",
        ];

        foreach ($tagihan['items'] as $item) {
            $lines[] = "{$item['no']}. {$item['nama_biaya']}";
            $lines[] = "   Tipe: {$item['satuan']}    Jumlah: {$this->formatRp($item['jumlah'])}";
            $lines[] = "";
        }

        $lines[] = "───────────────────────────────────────────────────";
        $lines[] = "TOTAL TAGIHAN: {$this->formatRp($tagihan['total_tagihan'])}";
        $lines[] = "───────────────────────────────────────────────────";

        if ($tagihan['va_number'] && $tagihan['status'] !== 'lunas') {
            $lines[] = "";
            $lines[] = "INFORMASI PEMBAYARAN:";
            $lines[] = "  Metode     : {$tagihan['metode_pembayaran']}";
            if ($tagihan['va_bank']) $lines[] = "  Bank       : {$tagihan['va_bank']}";
            $lines[] = "  No. VA     : {$tagihan['va_number']}";
            if ($tagihan['va_expired']) $lines[] = "  Berlaku s/d: {$tagihan['va_expired']}";
        }

        $lines[] = "";
        $lines[] = "═══════════════════════════════════════════════════";
        $lines[] = "Dicetak: {$tagihan['tanggal_cetak']}";
        $lines[] = "Lembaga Akreditasi Kesehatan";

        return implode("\n", $lines);
    }
}
