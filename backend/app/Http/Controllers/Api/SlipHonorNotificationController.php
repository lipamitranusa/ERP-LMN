<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LedgerEntry;
use App\Models\PembayaranHonor;
use App\Models\TenagaAhli;
use App\Services\LembagaHeaderService;
use App\Services\Notification\EmailChannel;
use App\Services\Notification\NotifikasiTemplateService;
use App\Services\Notification\WhatsAppChannel;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * SlipHonorNotificationController — generate & kirim slip honor ke tenaga ahli
 * setelah pembayaran disetujui (status = "disetujui").
 *
 * Endpoint:
 *   GET  /api/ledger/slip-honor/{pembayaranId}/generate     → data slip (JSON)
 *   POST /api/ledger/slip-honor/{pembayaranId}/send         → kirim via WA / Email
 *   GET  /api/ledger/slip-honor/{pembayaranId}/preview      → HTML preview (untuk print)
 *
 * Privilege: "Ledger/Keuangan"
 */
class SlipHonorNotificationController extends Controller
{
    public function __construct(
        private WhatsAppChannel $wa,
        private EmailChannel $email,
        private LembagaHeaderService $lembaga,
        private NotifikasiTemplateService $templates,
    ) {}

    /**
     * GET /api/ledger/slip-honor/{pembayaranId}/generate
     * Generate data slip honor untuk satu pembayaran (setelah disetujui).
     */
    public function generate(string $pembayaranId): JsonResponse
    {
        $p = PembayaranHonor::with([
            'details.ledgerEntry.siklus.faskes',
            'details.ledgerEntry.penerima',
            'penyetuju',
            'pembuat',
        ])->find($pembayaranId);

        if (! $p) {
            return response()->json(['message' => 'Pembayaran tidak ditemukan.'], 404);
        }

        if ($p->status !== PembayaranHonor::STATUS_DISETUJUI) {
            return response()->json([
                'message' => 'Slip honor hanya bisa digenerate untuk pembayaran yang sudah disetujui.',
                'status_saat_ini' => $p->status,
            ], 422);
        }

        $slip = $this->buildSlipData($p);

        return response()->json(['data' => $slip]);
    }

    /**
     * GET /api/ledger/slip-honor/{pembayaranId}/preview
     * HTML preview slip honor — untuk ditampilkan di modal print / iframe.
     */
    public function preview(string $pembayaranId): \Symfony\Component\HttpFoundation\Response
    {
        $p = PembayaranHonor::with([
            'details.ledgerEntry.siklus.faskes',
            'details.ledgerEntry.penerima',
            'penyetuju',
            'pembuat',
        ])->find($pembayaranId);

        if (! $p) {
            return response()->json(['message' => 'Pembayaran tidak ditemukan.'], 404);
        }

        if ($p->status !== PembayaranHonor::STATUS_DISETUJUI) {
            return response()->json([
                'message' => 'Slip honor hanya bisa digenerate untuk pembayaran yang sudah disetujui.',
            ], 422);
        }

        $slip = $this->buildSlipData($p);
        $html = $this->renderHtml($slip);

        return response($html, 200, ['Content-Type' => 'text/html']);
    }

    /**
     * POST /api/ledger/slip-honor/{pembayaranId}/send
     * Kirim slip honor via WhatsApp atau Email.
     * Body: { channel: "whatsapp" | "email" | "both" }
     */
    public function send(Request $request, string $pembayaranId): JsonResponse
    {
        $p = PembayaranHonor::with([
            'details.ledgerEntry.siklus.faskes',
            'details.ledgerEntry.penerima',
            'penyetuju',
            'pembuat',
        ])->find($pembayaranId);

        if (! $p) {
            return response()->json(['message' => 'Pembayaran tidak ditemukan.'], 404);
        }

        if ($p->status !== PembayaranHonor::STATUS_DISETUJUI) {
            return response()->json(['message' => 'Slip hanya bisa dikirim untuk pembayaran yang sudah disetujui.'], 422);
        }

        $channel = $request->string('channel', 'whatsapp')->toString();
        $slip = $this->buildSlipData($p);
        $htmlSlip = $this->renderHtml($slip);
        $plainSlip = $this->renderPlain($slip);
        $subject = "Slip Honorarium — {$slip['nomor_pembayaran']}";

        $results = [];

        // Collect recipients from all tenaga ahli in this payment
        $recipients = $this->collectRecipients($p);

        // Template pesan (tab "Format Pesan" di Pengaturan).
        $waAktif = $this->templates->status('whatsapp', 'slip_honor') !== 'disabled';
        $emailAktif = $this->templates->status('email', 'slip_honor') !== 'disabled';

        if ($channel === 'whatsapp' || $channel === 'both') {
            foreach ($recipients as $recipient) {
                if (! $waAktif) {
                    $results[] = [
                        'channel' => 'whatsapp',
                        'recipient' => $recipient['no_hp'] ?? null,
                        'nama' => $recipient['nama'],
                        'status' => 'gagal',
                        'error' => 'Notifikasi WhatsApp dimatikan pada pengaturan Format Pesan.',
                    ];
                    continue;
                }

                if (! empty($recipient['no_hp'])) {
                    // Template dirender per penerima — satu pembayaran honor bisa
                    // untuk beberapa tenaga ahli, jadi {{nama_tenaga_ahli}} harus
                    // mengikuti penerima masing-masing.
                    $waTemplate = $this->templates->compose('whatsapp', 'slip_honor', $this->buildContext($slip, $recipient['nama']), [
                        'subject' => $subject,
                        'body' => $this->buildWhatsAppMessage($slip, $recipient),
                    ]);

                    $sent = $this->wa->send(
                        $recipient['no_hp'],
                        $waTemplate['subject'] ?? $subject,
                        $waTemplate['body'] ?? $this->buildWhatsAppMessage($slip, $recipient),
                    );
                    $results[] = [
                        'channel' => 'whatsapp',
                        'recipient' => $recipient['no_hp'],
                        'nama' => $recipient['nama'],
                        'status' => $sent ? 'terkirim' : 'gagal',
                        'error' => $this->wa->getLastError(),
                    ];
                }
            }
        }

        if ($channel === 'email' || $channel === 'both') {
            foreach ($recipients as $recipient) {
                if (! $emailAktif) {
                    $results[] = [
                        'channel' => 'email',
                        'recipient' => $recipient['email'] ?? null,
                        'nama' => $recipient['nama'],
                        'status' => 'gagal',
                        'error' => 'Notifikasi email dimatikan pada pengaturan Format Pesan.',
                    ];
                    continue;
                }

                if (! empty($recipient['email'])) {
                    // Isi email tetap dokumen slip honor; template customizing subjek.
                    $emailTemplate = $this->templates->compose('email', 'slip_honor', $this->buildContext($slip, $recipient['nama']), [
                        'subject' => $subject,
                        'body' => $plainSlip,
                    ]);

                    $sent = $this->email->send(
                        $recipient['email'],
                        $emailTemplate['subject'] ?? $subject,
                        $plainSlip,
                    );
                    $results[] = [
                        'channel' => 'email',
                        'recipient' => $recipient['email'],
                        'nama' => $recipient['nama'],
                        'status' => $sent ? 'terkirim' : 'gagal',
                        'error' => $this->email->getLastError(),
                    ];
                }
            }
        }

        $allSent = count(array_filter($results, fn ($r) => $r['status'] === 'terkirim')) > 0;
        $anyFailed = count(array_filter($results, fn ($r) => $r['status'] === 'gagal')) > 0;

        return response()->json([
            'message' => $allSent
                ? ($anyFailed ? 'Sebagian slip terkirim.' : 'Slip honor berhasil dikirim.')
                : 'Gagal mengirim slip honor.',
            'data' => [
                'pembayaran_id' => $p->id,
                'nomor_pembayaran' => $p->nomor_pembayaran,
                'channel' => $channel,
                'total_recipients' => count($recipients),
                'results' => $results,
            ],
        ]);
    }

    // ─── Build Slip Data ─────────────────────────────────────────────────

    private function buildSlipData(PembayaranHonor $p): array
    {
        $entries = [];
        $totalBruto = 0.0;
        $totalPpn = 0.0;
        $totalPph = 0.0;
        $totalNeto = 0.0;

        foreach ($p->details as $detail) {
            $e = $detail->ledgerEntry;
            if (! $e) continue;

            $bruto = (float) $e->nominal_bruto;
            $ppn = (float) $e->potongan_ppn;
            $pph = (float) $e->potongan_pph;
            $neto = (float) $e->nominal_neto;

            $totalBruto += $bruto;
            $totalPpn += $ppn;
            $totalPph += $pph;
            $totalNeto += $neto;

            $entries[] = [
                'no' => count($entries) + 1,
                'jenis' => match ($e->tipe) {
                    LedgerEntry::TIPE_AP_HONOR_SURVEIOR => 'Surveior',
                    LedgerEntry::TIPE_AP_HONOR_VERIFIKATOR => 'Verifikator',
                    LedgerEntry::TIPE_AP_HONOR_REKOMENDATOR => 'Rekomendator',
                    default => $e->tipe,
                },
                'faskes' => $e->siklus?->faskes?->nama ?? '—',
                'siklus' => $e->siklus?->nama ?? '—',
                'tanggal' => $e->created_at?->translatedFormat('d F Y') ?? '—',
                'bruto' => $bruto,
                'ppn' => $ppn,
                'pph' => $pph,
                'neto' => $neto,
            ];
        }

        $netoTerhitung = round($totalBruto - $totalPpn - $totalPph, 2);
        $selisih = round($totalNeto - $netoTerhitung, 2);

        // Ambil data TA dari entry pertama (satu pembayaran bisa untuk 1 atau banyak TA)
        $firstEntry = $p->details->first()?->ledgerEntry;
        $ta = $firstEntry?->penerima;

        // Ambil info rekening pengirim dari pembayaran
        $metodeLabel = match ($p->metode) {
            PembayaranHonor::METODE_TRANSFER => "Transfer Bank {$p->bank_pengirim}",
            PembayaranHonor::METODE_TUNAI => 'Tunai',
            default => 'Lainnya',
        };

        return [
            'pembayaran_id' => $p->id,
            'nomor_pembayaran' => $p->nomor_pembayaran,
            'tanggal_pembayaran' => Carbon::parse($p->tanggal_pembayaran)->translatedFormat('d F Y'),
            'tanggal_cetak' => now()->translatedFormat('d F Y H:i'),
            'metode' => $metodeLabel,
            'nomor_rekening_tujuan' => $p->nomor_rekening_tujuan,
            'atas_nama' => $p->atas_nama,
            'disetujui_oleh' => $p->penyetuju?->nama ?? $p->disetujui_oleh,
            'tanggal_disetujui' => $p->tanggal_disetujui?->translatedFormat('d F Y H:i') ?? '—',
            'tenaga_ahli' => $ta ? [
                'nama' => $ta->nama,
                'nomor_induk' => $ta->nomor_induk_surveior,
                'npwp' => $ta->npwp,
                'nik' => $ta->nik,
                'nama_pajak' => $ta->nama_pajak,
                'alamat_pajak' => $ta->alamat_pajak,
                'kota_pajak' => $ta->kota_pajak,
                'no_rekening' => $ta->no_rekening,
                'nama_bank' => $ta->nama_bank,
                'atas_nama_rekening' => $ta->atas_nama_rekening,
                'peran' => $ta->peran,
            ] : null,
            'entries' => $entries,
            'total' => [
                'bruto' => round($totalBruto, 2),
                'ppn' => round($totalPpn, 2),
                'pph' => round($totalPph, 2),
                'neto' => round($totalNeto, 2),
                'neto_terhitung' => $netoTerhitung,
                'selisih' => $selisih,
                'ac7_valid' => $selisih === 0.0,
            ],
        ];
    }

    private function collectRecipients(PembayaranHonor $p): array
    {
        $recipients = [];
        $seen = [];

        foreach ($p->details as $detail) {
            $e = $detail->ledgerEntry;
            $ta = $e?->penerima;
            if (! $ta || isset($seen[$ta->id])) continue;

            $seen[$ta->id] = true;

            // Ambil email dari akun pengguna TA
            $akun = $ta->akunPengguna()->first();
            $recipients[] = [
                'tenaga_ahli_id' => $ta->id,
                'nama' => $ta->nama,
                'email' => $akun?->email ?? null,
                'no_hp' => $ta->no_wa,
            ];
        }

        return $recipients;
    }

    /**
     * Nilai placeholder untuk template pesan slip honor.
     *
     * @return array<string, string>
     */
    private function buildContext(array $slip, ?string $namaPenerima = null): array
    {
        $ta = $slip['tenaga_ahli'];
        $total = $slip['total'];

        return [
            'nama_tenaga_ahli' => $namaPenerima ?? ($ta['nama'] ?? '-'),
            'nomor_pembayaran' => $slip['nomor_pembayaran'],
            'tanggal_pembayaran' => $slip['tanggal_pembayaran'],
            'metode' => $slip['metode'],
            'total_bruto' => number_format($total['bruto'], 0, ',', '.'),
            'total_ppn' => number_format($total['ppn'], 0, ',', '.'),
            'total_pph' => number_format($total['pph'], 0, ',', '.'),
            'total_neto' => number_format($total['neto'], 0, ',', '.'),
            'blok_ac7' => $total['ac7_valid']
                ? "✅ AC-7: VALID\n"
                : "⚠️ AC-7: SELISIH ".number_format($total['selisih'], 2)."\n",
            'nama_lembaga' => $this->lembaga->getHeader()['nama'] ?? config('app.name', 'Lembaga Akreditasi Kesehatan'),
        ];
    }

    private function buildWhatsAppMessage(array $slip, array $recipient): string
    {
        $ta = $slip['tenaga_ahli'];
        $total = $slip['total'];

        $lines = [
            "🏆 *SLIP HONORARIUM*",
            "",
            "Yth. *{$recipient['nama']}*",
            "",
            "Berikut slip honorarium Anda:",
            "",
            "📋 *Detail Pembayaran*",
            "No. Pembayaran : {$slip['nomor_pembayaran']}",
            "Tanggal        : {$slip['tanggal_pembayaran']}",
            "Metode         : {$slip['metode']}",
            "",
            "💰 *Rincian*",
            "Total Bruto : Rp " . number_format($total['bruto'], 0, ',', '.') ,
            "Potongan PPN: Rp " . number_format($total['ppn'], 0, ',', '.') ,
            "Potongan PPh: Rp " . number_format($total['pph'], 0, ',', '.') ,
            "─────────────────",
            "*Total Neto  : Rp " . number_format($total['neto'], 0, ',', '.') . "*",
            "",
            "✅ AC-7: " . ($total['ac7_valid'] ? 'VALID' : 'SELISIH ' . number_format($total['selisih'], 2)),
            "",
            "Hormat kami,",
            config('app.name', 'ERP Akreditasi Faskes'),
        ];

        return implode("\n", $lines);
    }

    // ─── HTML Render (untuk print/preview) ───────────────────────────────

    private function formatRp(float $n): string
    {
        return 'Rp ' . number_format($n, 2, ',', '.');
    }

    private function renderHtml(array $slip): string
    {
        $ta = $slip['tenaga_ahli'];
        $total = $slip['total'];
        $entries = $slip['entries'];

        $kop = $this->lembaga->getHeader();
        $logoHtml = $kop['logo_url']
            ? "<img src='{$kop['logo_url']}' alt='{$kop['nama']}' style='width:48px;height:48px;object-fit:contain;border-radius:8px' />"
            : "<div class='logo'>{$kop['nama_singkat']}</div>";
        $kopNpwp = $kop['npwp']
            ? "<div style='font-size:10px;color:#64748B;margin-top:2px'>NPWP: {$kop['npwp']}</div>"
            : '';

        $rows = '';
        foreach ($entries as $e) {
            $rows .= "<tr>
                <td style='text-align:center'>{$e['no']}</td>
                <td>{$e['jenis']}</td>
                <td>{$e['faskes']}</td>
                <td>{$e['siklus']}</td>
                <td style='text-align:center'>{$e['tanggal']}</td>
                <td style='text-align:right'>" . $this->formatRp($e['bruto']) . "</td>
                <td style='text-align:right'>" . $this->formatRp($e['ppn']) . "</td>
                <td style='text-align:right'>" . $this->formatRp($e['pph']) . "</td>
                <td style='text-align:right;font-weight:700;color:#166534'>" . $this->formatRp($e['neto']) . "</td>
            </tr>";
        }

        $metode = $slip['metode'];
        $noRek = $slip['nomor_rekening_tujuan'];
        $atasNama = $slip['atas_nama'];
        $rekInfo = $noRek
            ? "{$metode}" . ($atasNama ? " – {$atasNama} ({$noRek})" : '')
            : $metode;

        $npwpLabel = $ta['npwp'] ? "NPWP: {$ta['npwp']}" : "NIK: {$ta['nik']}";
        $alamatPajak = $ta['alamat_pajak'] ? "{$ta['alamat_pajak']}" . ($ta['kota_pajak'] ? ", {$ta['kota_pajak']}" : '') : '';
        $peranLabel = match ($ta['peran']) {
            'surveior' => 'Surveior',
            'verifikator' => 'Verifikator',
            'kedua' => 'Surveior & Verifikator',
            default => ucfirst($ta['peran'] ?? '—'),
        };

        $ac7Badge = $total['ac7_valid']
            ? '<span style="background:#DCFCE7;color:#166534;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:700">✓ AC-7 VALID</span>'
            : '<span style="background:#FEE2E2;color:#991B1B;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:700">✕ SELISIH: ' . $this->formatRp(abs($total['selisih'])) . '</span>';

        $ac7Row = $total['ac7_valid']
            ? ''
            : '<div style="margin-top:8px;padding:10px 14px;background:#FEF3C7;border-radius:8px;font-size:12px;color:#92400E">
                <strong>⚠ AC-7 Warning:</strong> Neto tersimpan (' . $this->formatRp($total['neto']) . ') ≠ Neto terhitung (' . $this->formatRp($total['neto_terhitung']) . '). Selisih: ' . $this->formatRp($total['selisih']) . '
               </div>';

        $rekBank = '';
        if ($ta['nama_bank'] && $ta['no_rekening']) {
            $rekBank = "<tr><td style='padding:4px 0'><strong>Rekening Tujuan</strong></td><td>: {$ta['nama_bank']} a.n. {$ta['atas_nama_rekening']} ({$ta['no_rekening']})</td></tr>";
        }

        return <<<HTML
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Slip Honorarium — {$slip['nomor_pembayaran']}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #1E293B; background: #fff; padding: 40px; }
  @media print { body { padding: 20px; } }

  .slip-container { max-width: 800px; margin: 0 auto; }

  .header { display: flex; align-items: center; gap: 16px; padding-bottom: 16px; border-bottom: 3px solid #1E293B; margin-bottom: 20px; }
  .logo { width: 48px; height: 48px; background: #4F46E5; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; font-weight: 800; }
  .header-text h1 { font-size: 18px; font-weight: 800; color: #1E293B; }
  .header-text p { font-size: 11px; color: #64748B; margin-top: 2px; }
  .nomor-badge { background: #4F46E5; color: white; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; margin-top: 4px; display: inline-block; }

  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
  .meta-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px; }
  .meta-box h3 { font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; }
  .meta-box table { width: 100%; border-collapse: collapse; }
  .meta-box td { padding: 3px 0; font-size: 12px; }
  .meta-box td:first-child { width: 130px; color: #64748B; }

  .entries-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  .entries-table thead th { background: #1E293B; color: white; padding: 10px 8px; font-size: 11px; font-weight: 700; text-align: left; }
  .entries-table thead th:first-child { border-radius: 8px 0 0 0; }
  .entries-table thead th:last-child { border-radius: 0 8px 0 0; }
  .entries-table tbody td { padding: 8px; border-bottom: 1px solid #E2E8F0; font-size: 12px; }
  .entries-table tbody tr:hover { background: #F8FAFC; }
  .entries-table tfoot td { padding: 10px 8px; font-size: 13px; font-weight: 700; background: #F1F5F9; }
  .entries-table tfoot td:first-child { border-radius: 0 0 0 8px; }
  .entries-table tfoot td:last-child { border-radius: 0 0 8px 0; }

  .total-box { background: #DCFCE7; border: 2px solid #166534; border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .total-label { font-size: 13px; font-weight: 600; color: #166534; }
  .total-value { font-size: 22px; font-weight: 800; color: #166534; }
  .potongan-summary { display: flex; gap: 16px; margin-bottom: 16px; }
  .potongan-chip { background: #FEF9C3; border: 1px solid #FDE68A; border-radius: 8px; padding: 8px 14px; font-size: 12px; color: #92400E; }
  .potongan-chip strong { color: #78350F; }

  .footer { margin-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .footer-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px; }
  .footer-box h3 { font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
  .footer-box p { font-size: 12px; color: #475569; line-height: 1.6; }

  .print-btn { display: none; }

  @media print {
    .print-btn { display: none !important; }
    body { padding: 0; }
    .slip-container { max-width: 100%; }
    .entries-table thead th { background: #1E293B !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .total-box { background: #DCFCE7 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="slip-container">

  <!-- Header -->
  <div class="header">
    {$logoHtml}
    <div class="header-text">
      <h1>Slip Honorarium</h1>
      <p>{$kop['nama']}</p>
      {$kopNpwp}
      <div class="nomor-badge">{$slip['nomor_pembayaran']}</div>
    </div>
  </div>

  <!-- Meta Info -->
  <div class="meta-grid">
    <div class="meta-box">
      <h3>Informasi Pembayaran</h3>
      <table>
        <tr><td style='padding:4px 0'>Tanggal Bayar</td><td>: {$slip['tanggal_pembayaran']}</td></tr>
        <tr><td style='padding:4px 0'>Metode</td><td>: {$rekInfo}</td></tr>
        <tr><td style='padding:4px 0'>Disetujui</td><td>: {$slip['disetujui_oleh']}</td></tr>
        <tr><td style='padding:4px 0'>Tgl. Disetujui</td><td>: {$slip['tanggal_disetujui']}</td></tr>
        <tr><td style='padding:4px 0'>Dicetak</td><td>: {$slip['tanggal_cetak']}</td></tr>
      </table>
    </div>
    <div class="meta-box">
      <h3>Informasi Penerima</h3>
      <table>
        <tr><td style='padding:4px 0'>Nama</td><td>: {$ta['nama']}</td></tr>
        <tr><td style='padding:4px 0'>No. Induk</td><td>: {$ta['nomor_induk']}</td></tr>
        <tr><td style='padding:4px 0'>Peran</td><td>: {$peranLabel}</td></tr>
        <tr><td style='padding:4px 0'>{$npwpLabel}</td><td>: {$ta['nama_pajak']}</td></tr>
        {$rekBank}
      </table>
    </div>
  </div>

  <!-- Entries Table -->
  <table class="entries-table">
    <thead>
      <tr>
        <th style="text-align:center;width:40px">No</th>
        <th>Jenis</th>
        <th>Faskes</th>
        <th>Siklus</th>
        <th>Tanggal</th>
        <th style="text-align:right">Bruto</th>
        <th style="text-align:right">−PPN</th>
        <th style="text-align:right">−PPh</th>
        <th style="text-align:right">= Neto</th>
      </tr>
    </thead>
    <tbody>
      {$rows}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="5" style="text-align:right;font-weight:700">TOTAL</td>
        <td style="text-align:right;font-weight:700">{$this->formatRp($total['bruto'])}</td>
        <td style="text-align:right;font-weight:700;color:#92400E">{$this->formatRp($total['ppn'])}</td>
        <td style="text-align:right;font-weight:700;color:#92400E">{$this->formatRp($total['pph'])}</td>
        <td style="text-align:right;font-weight:800;color:#166534">{$this->formatRp($total['neto'])}</td>
      </tr>
    </tfoot>
  </table>

  <!-- Potongan Summary -->
  <div class="potongan-summary">
    <div class="potongan-chip">PPN Total: <strong>{$this->formatRp($total['ppn'])}</strong></div>
    <div class="potongan-chip">PPh 21 Total: <strong>{$this->formatRp($total['pph'])}</strong></div>
  </div>

  <!-- Total Neto -->
  <div class="total-box">
    <div>
      <div class="total-label">TOTAL NETO YANG DITERIMA</div>
      {$ac7Badge}
    </div>
    <div class="total-value">{$this->formatRp($total['neto'])}</div>
  </div>

  {$ac7Row}

  <!-- Footer -->
  <div class="footer">
    <div class="footer-box">
      <h3>Catatan</h3>
      <p>Slip honorarium ini diterbitkan sebagai bukti pembayaran atas jasa surveior/verifikator yang telah dilakukan.<br>
      Potongan PPN dan PPh 21 sudah sesuai dengan ketentuan perpajakan yang berlaku.</p>
    </div>
    <div class="footer-box">
      <h3>Keterangan</h3>
      <p>Slip honorarium ini dicetak otomatis oleh sistem ERP Akreditasi Faskes.<br>
      AC-7: <strong>neto = bruto − PPN − PPh 21</strong></p>
    </div>
  </div>

  <div style="text-align:center;margin-top:24px;font-size:11px;color:#94A3B8">
    Dokumen ini dicetak dari sistem ERP Akreditasi Faskes — {$slip['tanggal_cetak']}
  </div>

</div>
</body>
</html>
HTML;
    }

    private function renderPlain(array $slip): string
    {
        $ta = $slip['tenaga_ahli'];
        $total = $slip['total'];

        $lines = [
            "═══════════════════════════════════════════════",
            "              SLIP HONORARIUM",
            "═══════════════════════════════════════════════",
            "",
            "No. Pembayaran : {$slip['nomor_pembayaran']}",
            "Tanggal Bayar  : {$slip['tanggal_pembayaran']}",
            "Metode         : {$slip['metode']}",
            "Disetujui Oleh : {$slip['disetujui_oleh']}",
            "",
            "───────────────────────────────────────────────",
            "DATA PENERIMA",
            "───────────────────────────────────────────────",
            "Nama           : {$ta['nama']}",
            "No. Induk      : {$ta['nomor_induk']}",
            "NPWP           : {$ta['npwp']}",
            "Nama Pajak     : {$ta['nama_pajak']}",
            "Alamat Pajak   : {$ta['alamat_pajak']}",
            "",
            "───────────────────────────────────────────────",
            "RINCIAN JASA",
            "───────────────────────────────────────────────",
        ];

        foreach ($slip['entries'] as $e) {
            $lines[] = "{$e['no']}. {$e['jenis']} - {$e['faskes']}";
            $lines[] = "   Bruto: {$this->formatRp($e['bruto'])}  PPN: {$this->formatRp($e['ppn'])}  PPh: {$this->formatRp($e['pph'])}";
            $lines[] = "   Neto : {$this->formatRp($e['neto'])}";
            $lines[] = "";
        }

        $lines[] = "───────────────────────────────────────────────";
        $lines[] = "TOTAL BRUTO : {$this->formatRp($total['bruto'])}";
        $lines[] = "TOTAL PPN   : {$this->formatRp($total['ppn'])}";
        $lines[] = "TOTAL PPh   : {$this->formatRp($total['pph'])}";
        $lines[] = "───────────────────────────────────────────────";
        $lines[] = "TOTAL NETO  : {$this->formatRp($total['neto'])}";
        $lines[] = "───────────────────────────────────────────────";
        $lines[] = "AC-7: " . ($total['ac7_valid'] ? 'VALID' : 'SELISIH ' . $this->formatRp($total['selisih']));
        $lines[] = "";
        $lines[] = "═══════════════════════════════════════════════";
        $lines[] = "Dicetak: {$slip['tanggal_cetak']}";
        $lines[] = "ERP Akreditasi Faskes";

        return implode("\n", $lines);
    }
}
