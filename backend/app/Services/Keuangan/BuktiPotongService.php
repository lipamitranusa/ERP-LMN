<?php

namespace App\Services\Keuangan;

use App\Models\Lembaga;
use App\Models\LedgerEntry;
use App\Models\Penugasan;
use App\Models\SuratTugas;
use App\Models\TenagaAhli;
use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * BuktiPotongService — penerbitan bukti potong pajak per periode.
 *
 * Mengacu pada PRD v2.3 (FR-5.8) & v2.4 (FR-5.9):
 *   - Perusahaan (LIPA MITRA NUSA) menerbitkan bukti potong
 *     PPh Pasal 21 atas setiap honor Surveior/Verifikator per periode.
 *   - Bukti potong mengelompokkan entry honor dalam satu bulan kalender
 *     per Tenaga Ahli (sesuai NPWP/penerima).
 *   - Output juga dapat di-ekspor ke XML BP21 untuk Coretax DJP (FR-5.9).
 *
 * Bukti potong hanya menghitung PPh Pasal 21 (bukan PPN) — PPN
 * adalah pajak OUTPUT yang dipungut perusahaan, BUKAN dipotong dari
 * honor penerima; bukti potong PPh 21 yang menjadi kewajiban perusahaan
 * untuk dilaporkan.
 *
 * Filter lunas: hanya honor yang sudah dibayar (status_pembayaran='lunas')
 * yang masuk bukti potong. Honor yang masih outstanding (belum_dibayar)
 * TIDAK masuk — bukti potong diterbitkan saat pembayaran terealisasi
 * (sesuai praktik pelaporan PPh 21 DJP).
 */
class BuktiPotongService
{
    /**
     * Hasil bukti potong per Tenaga Ahli dalam satu periode.
     */
    public function rekapPerTenagaAhli(int $tahun, int $bulan): Collection
    {
        return $this->loadEntries($tahun, $bulan)
            ->groupBy('penerima_tenaga_ahli_id')
            ->map(function (Collection $items, $tenagaAhliId) {
                $ta = $items->first()->penerima;
                $totalBruto = (float) $items->sum('nominal_bruto');
                $totalPph = (float) $items->sum('potongan_pph');
                $totalPpn = (float) $items->sum('potongan_ppn');
                $totalNeto = (float) $items->sum('nominal_neto');

                return [
                    'tenaga_ahli_id' => $tenagaAhliId,
                    'nomor_induk_surveior' => $ta?->nomor_induk_surveior,
                    'nama' => $ta?->nama,
                    'npwp' => $ta?->npwp,
                    'nik' => $ta?->nik,
                    'nama_pajak' => $ta?->nama_pajak,
                    'status_ptkp' => $ta?->status_ptkp,
                    'kode_kpp' => $ta?->kode_kpp,
                    'kode_objek_pajak' => $ta?->kode_objek_pajak,
                    'alamat_pajak' => $ta?->alamat_pajak,
                    'kota_pajak' => $ta?->kota_pajak,
                    'npwp_diverifikasi_at' => $ta?->npwp_diverifikasi_at?->toIso8601String(),
                    'npwp_siap_pakai' => $this->isNpwpSiapPakai($ta),
                    'jumlah_penugasan' => $items->count(),
                    'jumlah_survei' => $items->where('tipe', LedgerEntry::TIPE_AP_HONOR_SURVEIOR)->count(),
                    'jumlah_verifikasi' => $items->where('tipe', LedgerEntry::TIPE_AP_HONOR_VERIFIKATOR)->count(),
                    'jumlah_rekomendator' => $items->where('tipe', LedgerEntry::TIPE_AP_HONOR_REKOMENDATOR)->count(),
                    'total_bruto' => round($totalBruto, 2),
                    'total_potongan_ppn' => round($totalPpn, 2),
                    'total_potongan_pph' => round($totalPph, 2),
                    'total_neto' => round($totalNeto, 2),
                    'entries' => $items->map(fn ($e) => [
                        'id' => $e->id,
                        'tanggal' => $e->created_at?->toDateString(),
                        'tanggal_dibayar' => $e->tanggal_dibayar?->toDateString(),
                        'tipe' => $e->tipe,
                        'nominal_bruto' => (float) $e->nominal_bruto,
                        'potongan_ppn' => (float) $e->potongan_ppn,
                        'potongan_pph' => (float) $e->potongan_pph,
                        'nominal_neto' => (float) $e->nominal_neto,
                        'siklus_id' => $e->siklus_id,
                        'faskes_nama' => $e->siklus?->faskes?->nama,
                    ])->values(),
                ];
            })->values();
    }

    /**
     * Cek apakah identitas pajak seorang Tenaga Ahli siap dipakai untuk
     * bukti potong PPh 21 / BP21 (FR-5.8/5.9).
     *
     * Syarat minimum:
     *   - NPWP valid (15-16 digit) ATAU NIK 16 digit
     *   - nama_pajak terisi
     *   - status_ptkp terisi (untuk <StatusTaxExemption> BP21)
     *   - kode_kpp terisi (untuk <IDPlaceOfBusinessActivityOfIncomeRecipient>)
     *   - kode_objek_pajak terisi (untuk <TaxObjectCode>)
     *
     * NPWP placeholder dengan prefix "00" atau "11" dianggap belum siap.
     */
    public function isNpwpSiapPakai(?TenagaAhli $ta): bool
    {
        if (! $ta) {
            return false;
        }
        if (! $ta->nama_pajak) {
            return false;
        }
        $npwpDigits = $ta->npwp ? preg_replace('/\D/', '', $ta->npwp) : '';
        $hasNpwp = $npwpDigits && preg_match('/^\d{15,16}$/', $npwpDigits);
        $hasNik = $ta->nik && preg_match('/^\d{16}$/', $ta->nik);
        if (! $hasNpwp && ! $hasNik) {
            return false;
        }
        if ($npwpDigits) {
            $prefix = substr($npwpDigits, 0, 2);
            if (in_array($prefix, ['00', '11'], true)) {
                return false;
            }
        }
        if (! $ta->status_ptkp) {
            return false;
        }
        if (! $ta->kode_kpp) {
            return false;
        }
        if (! $ta->kode_objek_pajak) {
            return false;
        }
        return true;
    }

    /**
     * Laporan GAP: Tenaga Ahli yang memiliki entry honor pada periode
     * tertentu tetapi identitas pajak belum lengkap untuk export BP21.
     *
     * Dipakai Keuangan untuk menindaklanjuti sebelum export Coretax
     * (FR-5.9) — export akan gagal untuk tenaga ahli yang belum siap.
     */
    public function gapNpwpPerTenagaAhli(int $tahun, int $bulan): Collection
    {
        $rekap = $this->rekapPerTenagaAhli($tahun, $bulan);

        return $rekap
            ->filter(fn ($r) => ! ($r['npwp_siap_pakai'] ?? false))
            ->map(function ($r) {
                $issues = [];

                $npwpDigits = $r['npwp'] ? preg_replace('/\D/', '', $r['npwp']) : '';
                $hasNpwp = $npwpDigits && preg_match('/^\d{15,16}$/', $npwpDigits);
                $hasNik = $r['nik'] && preg_match('/^\d{16}$/', $r['nik']);

                if (! $hasNpwp && ! $hasNik) {
                    $issues[] = 'npwp_dan_nik_kosong';
                } else {
                    if ($r['npwp']) {
                        $prefix = substr($npwpDigits, 0, 2);
                        if (in_array($prefix, ['00', '11'], true)) {
                            $issues[] = 'npwp_placeholder';
                        }
                    }
                    if (! $hasNik && ! preg_match('/^\d{15,16}$/', $npwpDigits)) {
                        $issues[] = 'npwp_tidak_valid';
                    }
                }
                if (! $r['nama_pajak']) {
                    $issues[] = 'nama_pajak_kosong';
                }
                if (! $r['status_ptkp']) {
                    $issues[] = 'status_ptkp_kosong';
                }
                if (! $r['kode_kpp']) {
                    $issues[] = 'kode_kpp_kosong';
                }
                if (! $r['kode_objek_pajak']) {
                    $issues[] = 'kode_objek_pajak_kosong';
                }

                return [
                    'tenaga_ahli_id' => $r['tenaga_ahli_id'],
                    'nomor_induk_surveior' => $r['nomor_induk_surveior'],
                    'nama' => $r['nama'],
                    'npwp' => $r['npwp'],
                    'nik' => $r['nik'],
                    'nama_pajak' => $r['nama_pajak'],
                    'status_ptkp' => $r['status_ptkp'],
                    'kode_kpp' => $r['kode_kpp'],
                    'kode_objek_pajak' => $r['kode_objek_pajak'],
                    'total_neto_periode_ini' => $r['total_neto'],
                    'jumlah_penugasan' => $r['jumlah_penugasan'],
                    'masalah' => $issues,
                ];
            })
            ->values();
    }

    /**
     * Ringkasan agregat satu periode (untuk header bukti potong perusahaan).
     */
    public function ringkasanPeriode(int $tahun, int $bulan): array
    {
        $rekap = $this->rekapPerTenagaAhli($tahun, $bulan);

        return [
            'periode' => sprintf('%04d-%02d', $tahun, $bulan),
            'tahun' => $tahun,
            'bulan' => $bulan,
            'jumlah_penerima' => $rekap->count(),
            'jumlah_penugasan' => $rekap->sum('jumlah_penugasan'),
            'total_bruto' => round((float) $rekap->sum('total_bruto'), 2),
            'total_potongan_ppn' => round((float) $rekap->sum('total_potongan_ppn'), 2),
            'total_potongan_pph' => round((float) $rekap->sum('total_potongan_pph'), 2),
            'total_neto' => round((float) $rekap->sum('total_neto'), 2),
        ];
    }

    /**
     * Ekspor bukti potong ke format XML BP21 untuk diunggah ke Coretax DJP.
     *
     * Mengikuti struktur `Bp21Bulk` sesuai contoh
     * `docs/BP21_Template.xml` — satu <Bp21> per transaksi honor yang
     * sudah dibayar (lunas) pada periode tersebut. Tiap <Bp21>
     * merepresentasi satu bukti potong PPh 21 yang akan dilaporkan DJP.
     *
     * Field mapping (BP21 ↔ sumber data):
     *   - TIN                              → Lembaga.npwp
     *   - TaxPeriodMonth / TaxPeriodYear   → tanggal_dibayar (fallback created_at)
     *   - CounterpartTin                   → TenagaAhli.npwp
     *   - IDPlaceOfBusinessActivityOf…     → TenagaAhli.kode_kpp (6 digit, zero-padded)
     *   - StatusTaxExemption               → TenagaAhli.status_ptkp (TK/0, K/1, …)
     *   - TaxCertificate                   → "N/A" (bulk upload)
     *   - TaxObjectCode                    → TenagaAhli.kode_objek_pajak
     *   - Gross                            → LedgerEntry.nominal_bruto
     *   - Deemed                           → 0 (tidak ada fasilitas deemed)
     *   - Rate                             → effective rate PPh = (potongan_pph / bruto) × 100
     *   - Document                         → "Kontrak" (jika ada PKS) atau "Surat Tugas"
     *   - DocumentNumber                   → nomor PKS / nomor surat tugas / id penugasan
     *   - DocumentDate                     → tanggal PKS / tanggal surat tugas
     *   - IDPlaceOfBusinessActivity        → Lembaga.kode_kpp (6 digit, zero-padded)
     *   - WithholdingDate                  → LedgerEntry.tanggal_dibayar
     */
    public function toCoretaxXml(int $tahun, int $bulan, ?Lembaga $lembaga = null): string
    {
        $entries = $this->loadEntries($tahun, $bulan);
        $lembaga = $lembaga ?: Lembaga::orderBy('id')->first();
        $periode = sprintf('%04d-%02d', $tahun, $bulan);

        $tin = $this->normalizeNpwp($lembaga?->npwp);
        $idKppPerusahaan = $this->padKpp($lembaga?->kode_kpp);

        $xml = new \SimpleXMLElement('<?xml version="1.0" encoding="utf-8"?><Bp21Bulk></Bp21Bulk>');
        $xml->addAttribute('xsi:noNamespaceSchemaLocation', 'schema.xsd', 'http://www.w3.org/2001/XMLSchema-instance');
        $xml->addChild('TIN', $tin);
        $list = $xml->addChild('ListOfBp21');

        foreach ($entries as $e) {
            $ta = $e->penerima;
            $penerima = $this->resolveCounterpart($ta);
            $dokumen = $this->resolveDocument($e);

            $periodeDate = $e->tanggal_dibayar ?? $e->created_at;
            $withholdingDate = $e->tanggal_dibayar ?? $e->created_at;

            $row = $list->addChild('Bp21');
            $row->addChild('TaxPeriodMonth', (string) ($periodeDate?->month ?? $bulan));
            $row->addChild('TaxPeriodYear', (string) ($periodeDate?->year ?? $tahun));
            $row->addChild('CounterpartTin', $penerima['tin']);
            $row->addChild('IDPlaceOfBusinessActivityOfIncomeRecipient', $penerima['id_kpp']);
            $row->addChild('StatusTaxExemption', $penerima['status_ptkp']);
            $row->addChild('TaxCertificate', 'N/A');
            $row->addChild('TaxObjectCode', $penerima['kode_objek_pajak']);
            $row->addChild('Gross', $this->fmt((float) $e->nominal_bruto));
            $row->addChild('Deemed', $this->fmt(0.0));
            $row->addChild('Rate', $this->fmt($this->resolveEffectiveRate($e)));
            $row->addChild('Document', $dokumen['document']);
            $row->addChild('DocumentNumber', $dokumen['document_number']);
            $row->addChild('DocumentDate', $dokumen['document_date']);
            $row->addChild('IDPlaceOfBusinessActivity', $idKppPerusahaan);
            $row->addChild('WithholdingDate', $withholdingDate ? $withholdingDate->toDateString() : '');
        }

        $dom = new \DOMDocument('1.0', 'UTF-8');
        $dom->preserveWhiteSpace = false;
        $dom->formatOutput = true;
        $dom->loadXML($xml->asXML());
        return $dom->saveXML() ?: $xml->asXML();
    }

    /**
     * Hitung tarif efektif PPh 21 atas satu entry honor.
     * Dipakai untuk field <Rate> di BP21 (effective rate, bukan bracket rate).
     * Fallback ke snapshot PPh tarif jika bruto = 0.
     */
    private function resolveEffectiveRate(LedgerEntry $e): float
    {
        $bruto = (float) $e->nominal_bruto;
        if ($bruto > 0) {
            return round(((float) $e->potongan_pph / $bruto) * 100, 7);
        }
        $snapshot = $e->detail['tarif_snapshot'] ?? null;
        $tarif = $snapshot['pph']['tarif_persen'] ?? null;
        return $tarif !== null ? round((float) $tarif, 7) : 0.0;
    }

    /**
     * Pemetaan identitas penerima (Tenaga Ahli) ke field BP21.
     * NPWP placeholder (00/11) dikosongkan agar Coretax dapat reject lebih
     * awal di sisi pengunggah (lihat BuktiPotongService::gapNpwpPerTenagaAhli).
     */
    private function resolveCounterpart(?TenagaAhli $ta): array
    {
        $npwpDigits = $ta?->npwp ? preg_replace('/\D/', '', $ta->npwp) : '';
        $isPlaceholder = $npwpDigits && in_array(substr($npwpDigits, 0, 2), ['00', '11'], true);

        return [
            'tin' => $isPlaceholder ? '' : $this->normalizeNpwp($ta?->npwp),
            'id_kpp' => $this->padKpp($ta?->kode_kpp),
            'status_ptkp' => $ta?->status_ptkp ?? TenagaAhli::STATUS_PTKP_DEFAULT,
            'kode_objek_pajak' => $ta?->kode_objek_pajak ?? '21-100-01',
        ];
    }

    /**
     * Resolve referensi dokumen (BP21: Document, DocumentNumber, DocumentDate).
     *
     * Prioritas sumber:
     *   1. Surat Tugas (penugasan.suratTugas) — dasar hukum pembayaran honor
     *   2. PKS (siklus.pks) — kontrak dengan Faskes, dokumen pendukung
     *
     * Penomoran menggunakan nomor_surat/nomor_pks bila ada, fallback ke
     * id penugasan/siklus agar XML tidak kosong.
     */
    private function resolveDocument(LedgerEntry $e): array
    {
        $penugasanId = $e->detail['penugasan_id'] ?? null;
        $penugasan = $penugasanId ? Penugasan::with('suratTugas')->find($penugasanId) : null;
        $suratTugas = $penugasan?->suratTugas;

        if ($suratTugas) {
            return [
                'document' => 'Surat Tugas',
                'document_number' => $suratTugas->nomor_surat ?: ($penugasan?->id ?? $e->id),
                'document_date' => $suratTugas->tanggal_terbit?->toDateString()
                    ?? $penugasan?->tanggal_mulai_survei?->toDateString()
                    ?? $e->created_at?->toDateString()
                    ?? '',
            ];
        }

        // Fallback: kontrak PKS dengan Faskes sebagai dokumen pendukung
        $pks = $e->siklus?->pks ?? null;
        if ($pks) {
            return [
                'document' => 'Kontrak',
                'document_number' => $pks->nomor_pks ?? $pks->id,
                'document_date' => $pks->tanggal_disetujui?->toDateString() ?? '',
            ];
        }

        // Final fallback: id siklus
        return [
            'document' => 'Penugasan',
            'document_number' => $e->siklus_id ?? $e->id,
            'document_date' => $e->created_at?->toDateString() ?? '',
        ];
    }

    /**
     * Normalisasi NPWP ke format 15 digit polos (hapus titik/strip/spasi).
     */
    private function normalizeNpwp(?string $npwp): string
    {
        if (! $npwp) {
            return '';
        }
        return preg_replace('/\D/', '', $npwp);
    }

    /**
     * Format kode KPP menjadi 6 digit dengan leading zero.
     * KPP Lokasi (IDPlaceOfBusinessActivity) dan KPP Wajib Pajak
     * (IDPlaceOfBusinessActivityOfIncomeRecipient) keduanya 6 digit sesuai
     * format Coretax (3 digit KPP + 3 digit cabang).
     */
    private function padKpp(?string $kode): string
    {
        if (! $kode) {
            return '000000';
        }
        $digits = preg_replace('/\D/', '', $kode);
        return str_pad((string) $digits, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Format angka dengan 2 desimal untuk Gross/Deemed dan 7 desimal
     * untuk Rate (sesuai presisi contoh BP21_Template.xml 12.2349058).
     */
    private function fmt(float $v): string
    {
        return number_format($v, 7, '.', '');
    }

    /**
     * Load semua LedgerEntry honor (AP Surveior/Verifikator/Rekomendator)
     * yang sudah dibayar (lunas) dalam satu bulan kalender, dengan
     * seluruh relasi yang dibutuhkan untuk XML BP21.
     */
    private function loadEntries(int $tahun, int $bulan): Collection
    {
        $start = Carbon::create($tahun, $bulan, 1)->startOfMonth();
        $end = $start->copy()->endOfMonth();

        return LedgerEntry::query()
            ->whereIn('tipe', [
                LedgerEntry::TIPE_AP_HONOR_SURVEIOR,
                LedgerEntry::TIPE_AP_HONOR_VERIFIKATOR,
                LedgerEntry::TIPE_AP_HONOR_REKOMENDATOR,
            ])
            ->whereNotNull('penerima_tenaga_ahli_id')
            ->where('status_pembayaran', LedgerEntry::STATUS_LUNAS)
            ->whereBetween('created_at', [$start, $end])
            ->with(['penerima', 'siklus.faskes', 'siklus.pks'])
            ->orderBy('penerima_tenaga_ahli_id')
            ->orderBy('created_at')
            ->get();
    }
}
