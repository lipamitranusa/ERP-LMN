<?php

namespace App\Services\Keuangan;

use App\Models\Coa;
use App\Models\Invoice;
use App\Models\JurnalUmum;
use App\Models\KategoriJurnal;
use App\Models\LedgerEntry;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * AccrualJournalService — jurnal akrual pendapatan & beban.
 *
 * Jurnal settlement (BKM/BKK) hanya mencatat perpindahan kas. Tanpa jurnal
 * akrual, akun pendapatan & beban kosong sehingga laporan laba rugi selalu
 * nol dan akun piutang/utang tidak pernah punya saldo awal — buku besar
 * tidak merepresentasikan kondisi keuangan.
 *
 * Pasangan jurnal yang dihasilkan:
 *
 *   1. Pendapatan (invoice terbit)
 *      Dr. Piutang Usaha (1105)
 *      Cr. Pendapatan (4101)
 *      → dilunasi oleh jurnal settlement BKM (Dr Bank / Cr Piutang).
 *
 *   2. Beban honor (honor terakru, Ledger Entry dibuat)
 *      Dr. Beban Honor Surveior/Verifikator/Rekomendator (5101/5102/5103)
 *      Cr. Utang Honor (2107)
 *      Cr. Utang PPh 21 (2102)
 *      → dilunasi oleh jurnal settlement BKK (Dr Utang Honor / Cr Bank)
 *        dan BKK pajak (Dr Utang PPh 21 / Cr Bank).
 *
 *   3. Pembalik pendapatan (invoice superseded karena PKS direvisi)
 *      Dr. Pendapatan (4101)
 *      Cr. Piutang Usaha (1105)
 *
 * Semua jurnal bersifat idempotent (ref_type + ref_id unik) dan memakai
 * kategori 'adjustment' — akrual bukan perpindahan kas, jadi tidak boleh
 * bernomor BKM/BKK.
 */
class AccrualJournalService
{
    // ─── ref_type di JurnalUmum.ref_type (penanda jurnal akrual) ─────────
    public const REF_PENDAPATAN_INVOICE = 'akrual_pendapatan_invoice';
    public const REF_PENDAPATAN_REVERSAL = 'akrual_pendapatan_reversal';
    public const REF_BEBAN_HONOR = 'akrual_beban_honor';

    // ─── Kode COA yang dipakai ────────────────────────────────────────────
    public const COA_PIUTANG_USAHA = '1105';
    public const COA_UTANG_HONOR = '2107';
    public const COA_UTANG_PPH21 = '2102';
    public const COA_UTANG_PPN = '2104';
    public const COA_PENDAPATAN = '4101';

    /** Akun beban honor per jenis ledger entry. */
    public const COA_BEBAN_HONOR = [
        LedgerEntry::TIPE_AP_HONOR_SURVEIOR => '5101',
        LedgerEntry::TIPE_AP_HONOR_VERIFIKATOR => '5102',
        LedgerEntry::TIPE_AP_HONOR_REKOMENDATOR => '5103',
    ];

    public function __construct(private SettlementJournalService $journals) {}

    /**
     * Pengakuan pendapatan saat invoice diterbitkan.
     *
     * Idempotent: invoice yang sama tidak menghasilkan dua jurnal akrual.
     */
    public function recordPendapatanInvoice(Invoice $invoice, ?string $userId = null): ?JurnalUmum
    {
        $amount = (float) $invoice->total_tagihan;
        if ($amount <= 0) {
            return null;
        }

        $existing = $this->journals->existingJurnal(self::REF_PENDAPATAN_INVOICE, $invoice->id);
        if ($existing) {
            return $existing;
        }

        $lembagaId = $this->lembagaIdOf($invoice);

        [$piutang, $pendapatan] = $this->coaPendapatan($lembagaId);
        if (! $piutang || ! $pendapatan) {
            Log::warning('akrual.pendapatan.skipped', [
                'invoice_id' => $invoice->id,
                'reason' => 'COA piutang usaha atau pendapatan tidak ditemukan',
                'piutang_coa_id' => $piutang?->id,
                'pendapatan_coa_id' => $pendapatan?->id,
            ]);
            return null;
        }

        return $this->journals->createBalancedJurnal(
            tanggal: $invoice->diterbitkan_pada ? Carbon::parse($invoice->diterbitkan_pada) : now(),
            kategoriJenis: KategoriJurnal::JENIS_ADJUSTMENT,
            keterangan: sprintf(
                'Pengakuan pendapatan — Invoice %s',
                $invoice->nomor_invoice ?? '—',
            ),
            refType: self::REF_PENDAPATAN_INVOICE,
            refId: $invoice->id,
            lembagaId: $lembagaId,
            userId: $userId ?? $invoice->dibuat_oleh,
            details: [
                ['coa_id' => $piutang->id, 'debit' => $amount, 'kredit' => 0, 'keterangan' => 'Piutang Usaha — Invoice ' . ($invoice->nomor_invoice ?? '—')],
                ['coa_id' => $pendapatan->id, 'debit' => 0, 'kredit' => $amount, 'keterangan' => 'Pendapatan — ' . $pendapatan->nama],
            ],
        );
    }

    /**
     * Jurnal pembalik pengakuan pendapatan — dipakai saat invoice di-
     * supersede (PKS direvisi/dibatalkan) supaya pendapatan tidak tetap
     * recognized.
     *
     * Tidak ada jurnal pembalik bila jurnal akrual aslinya tidak pernah
     * dibuat (invoice yang belum pernah dibukukan).
     */
    public function reversePendapatanInvoice(Invoice $invoice, ?string $userId = null): ?JurnalUmum
    {
        $original = $this->journals->existingJurnal(self::REF_PENDAPATAN_INVOICE, $invoice->id);
        if (! $original) {
            return null;
        }

        $existing = $this->journals->existingJurnal(self::REF_PENDAPATAN_REVERSAL, $invoice->id);
        if ($existing) {
            return $existing;
        }

        $amount = (float) $invoice->total_tagihan;
        if ($amount <= 0) {
            return null;
        }

        $lembagaId = $this->lembagaIdOf($invoice);

        [$piutang, $pendapatan] = $this->coaPendapatan($lembagaId);
        if (! $piutang || ! $pendapatan) {
            Log::warning('akrual.pendapatan.reversal_skipped', [
                'invoice_id' => $invoice->id,
                'reason' => 'COA piutang usaha atau pendapatan tidak ditemukan',
            ]);
            return null;
        }

        return $this->journals->createBalancedJurnal(
            tanggal: now(),
            kategoriJenis: KategoriJurnal::JENIS_ADJUSTMENT,
            keterangan: sprintf(
                'Pembalik pengakuan pendapatan — Invoice %s (superseded)',
                $invoice->nomor_invoice ?? '—',
            ),
            refType: self::REF_PENDAPATAN_REVERSAL,
            refId: $invoice->id,
            lembagaId: $lembagaId,
            userId: $userId,
            details: [
                ['coa_id' => $pendapatan->id, 'debit' => $amount, 'kredit' => 0, 'keterangan' => 'Pendapatan — pembalik ' . ($invoice->nomor_invoice ?? '—')],
                ['coa_id' => $piutang->id, 'debit' => 0, 'kredit' => $amount, 'keterangan' => 'Piutang Usaha — pembalik ' . ($invoice->nomor_invoice ?? '—')],
            ],
        );
    }

    /**
     * Pengakuan beban honor saat Ledger Entry honor dibuat (honor terakru).
     *
     * Beban = bruto honor. Kewajiban = utangnya ke penerima honor (neto)
     * ditambah PPh 21 yang dipotong untuk disetor ke negara.
     */
    public function recordBebanHonor(LedgerEntry $entry, ?string $userId = null): ?JurnalUmum
    {
        $bruto = (float) $entry->nominal_bruto;
        if ($bruto <= 0) {
            return null;
        }

        $existing = $this->journals->existingJurnal(self::REF_BEBAN_HONOR, $entry->id);
        if ($existing) {
            return $existing;
        }

        $pph = (float) $entry->potongan_pph;
        $ppn = (float) $entry->potongan_ppn;

        $lembagaId = $this->lembagaIdOf($entry);

        $kodeBeban = self::COA_BEBAN_HONOR[$entry->tipe] ?? null;
        $beban = ($kodeBeban ? $this->journals->getCoaByKode($kodeBeban, $lembagaId) : null)
            ?? $this->firstCoaByJenis(Coa::JENIS_BEBAN, $lembagaId);
        $utangHonor = $this->journals->getCoaByKode(self::COA_UTANG_HONOR, $lembagaId);

        if (! $beban || ! $utangHonor) {
            Log::warning('akrual.beban_honor.skipped', [
                'ledger_entry_id' => $entry->id,
                'reason' => 'COA beban honor atau utang honor tidak ditemukan',
                'beban_coa_id' => $beban?->id,
                'utang_honor_coa_id' => $utangHonor?->id,
            ]);
            return null;
        }

        // Utang ke penerima honor = bruto - PPh - PPN (nilainya sama dengan
        // nominal neto yang dibayarkan saat settlement).
        $utangPenerima = round($bruto - $pph - $ppn, 2);

        $details = [
            ['coa_id' => $beban->id, 'debit' => $bruto, 'kredit' => 0, 'keterangan' => $beban->nama],
            ['coa_id' => $utangHonor->id, 'debit' => 0, 'kredit' => $utangPenerima, 'keterangan' => 'Utang Honor'],
        ];

        if ($pph > 0) {
            $utangPph = $this->journals->getCoaByKode(self::COA_UTANG_PPH21, $lembagaId);
            if (! $utangPph) {
                Log::warning('akrual.beban_honor.skipped', [
                    'ledger_entry_id' => $entry->id,
                    'reason' => 'COA Utang PPh 21 tidak ditemukan',
                ]);
                return null;
            }
            $details[] = [
                'coa_id' => $utangPph->id, 'debit' => 0, 'kredit' => $pph,
                'keterangan' => 'Utang PPh 21',
            ];
        }

        if ($ppn > 0) {
            $utangPpn = $this->journals->getCoaByKode(self::COA_UTANG_PPN, $lembagaId);
            if (! $utangPpn) {
                Log::warning('akrual.beban_honor.skipped', [
                    'ledger_entry_id' => $entry->id,
                    'reason' => 'COA Utang PPN tidak ditemukan',
                ]);
                return null;
            }
            $details[] = [
                'coa_id' => $utangPpn->id, 'debit' => 0, 'kredit' => $ppn,
                'keterangan' => 'Utang PPN',
            ];
        }

        return $this->journals->createBalancedJurnal(
            tanggal: $entry->created_at ? Carbon::parse($entry->created_at) : now(),
            kategoriJenis: KategoriJurnal::JENIS_ADJUSTMENT,
            keterangan: sprintf(
                'Pengakuan beban honor — %s',
                $this->keteranganHonor($entry),
            ),
            refType: self::REF_BEBAN_HONOR,
            refId: $entry->id,
            lembagaId: $lembagaId,
            userId: $userId,
            details: $details,
        );
    }

    /**
     * Keterangan jurnal beban honor — pakai nama penerima bila tersedia.
     */
    private function keteranganHonor(LedgerEntry $entry): string
    {
        $nama = $entry->detail['penerima_nama'] ?? null;
        $peran = match ($entry->tipe) {
            LedgerEntry::TIPE_AP_HONOR_SURVEIOR => 'Surveior',
            LedgerEntry::TIPE_AP_HONOR_VERIFIKATOR => 'Verifikator',
            LedgerEntry::TIPE_AP_HONOR_REKOMENDATOR => 'Rekomendator',
            default => 'Honor',
        };

        return $nama
            ? sprintf('%s — %s (bruto %s)', $peran, $nama, number_format((float) $entry->nominal_bruto, 0, ',', '.'))
            : sprintf('%s (bruto %s)', $peran, number_format((float) $entry->nominal_bruto, 0, ',', '.'));
    }

    /**
     * COA aktif pertama dengan jenis tertentu — fallback ketika kode
     * standar (mis. 4101) tidak ada di lembaga tersebut.
     */
    private function firstCoaByJenis(string $jenis, ?string $lembagaId): ?Coa
    {
        $q = Coa::query()->aktif()->where('jenis', $jenis);

        if ($lembagaId) {
            $coa = (clone $q)->where('lembaga_id', $lembagaId)->orderBy('kode')->first();
            if ($coa) {
                return $coa;
            }
        }

        return $q->whereNull('lembaga_id')->orderBy('kode')->first() ?? $q->orderBy('kode')->first();
    }

    /**
     * Pasangan akun piutang usaha & akun pendapatan.
     *
     * @return array{0: ?Coa, 1: ?Coa}
     */
    private function coaPendapatan(?string $lembagaId): array
    {
        $piutang = $this->journals->getCoaByKode(self::COA_PIUTANG_USAHA, $lembagaId);
        $pendapatan = $this->journals->getCoaByKode(self::COA_PENDAPATAN, $lembagaId)
            ?? $this->firstCoaByJenis(Coa::JENIS_PENDAPATAN, $lembagaId);

        return [$piutang, $pendapatan];
    }

    /**
     * ID lembaga pemilik dokumen. Relasi siklus dimuat eksplisit —
     * lazy loading dimatikan di environment non-produksi.
     */
    private function lembagaIdOf(Invoice|LedgerEntry $model): ?string
    {
        $siklus = $model->relationLoaded('siklus')
            ? $model->siklus
            : $model->siklus()->first();

        return $siklus?->lembaga_id;
    }

    // ─── Pemeriksa (untuk backfill idempotent) ─────────────────────────────

    public function sudahAdaJurnalPendapatan(Invoice $invoice): bool
    {
        return $this->journals->existingJurnal(self::REF_PENDAPATAN_INVOICE, $invoice->id) !== null;
    }

    public function sudahAdaJurnalPembalikPendapatan(Invoice $invoice): bool
    {
        return $this->journals->existingJurnal(self::REF_PENDAPATAN_REVERSAL, $invoice->id) !== null;
    }

    public function sudahAdaJurnalBebanHonor(LedgerEntry $entry): bool
    {
        return $this->journals->existingJurnal(self::REF_BEBAN_HONOR, $entry->id) !== null;
    }
}
