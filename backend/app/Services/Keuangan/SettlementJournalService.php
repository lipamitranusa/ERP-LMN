<?php

namespace App\Services\Keuangan;

use App\Models\AuditTrail;
use App\Models\BuktiPembayaran;
use App\Models\Coa;
use App\Models\HutangPajak;
use App\Models\Invoice;
use App\Models\JurnalUmum;
use App\Models\JurnalUmumDetail;
use App\Models\KategoriJurnal;
use App\Models\Lembaga;
use App\Models\PembayaranHonor;
use App\Services\LembagaResolver;
use Carbon\Carbon;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * SettlementJournalService — membuat Jurnal Umum otomatis saat
 * piutang (AR) atau hutang (AP) dilunasi, sesuai prinsip double-entry
 * akuntansi.
 *
 * Tiga titik settlement yang ditangani:
 *
 *   1. AR — BuktiPembayaran diterima
 *      Dr. Kas/Bank  (default_bank_coa)
 *      Cr. Piutang Usaha (1105)
 *
 *   2. AP Honor — PembayaranHonor disetujui
 *      Dr. Utang Honor (2107)
 *      Cr. Kas/Bank  (default_bank_coa)
 *
 *   3. AP Pajak — HutangPajak ditandai dibayar (setor ke Ditjen Pajak)
 *      Dr. Utang PPh 21 (2102)
 *      Cr. Kas/Bank   (default_bank_coa)
 *
 * Prinsip:
 *   - Idempotent: jurnal yang sama untuk ref_type + ref_id yang sama
 *     TIDAK dibuat dua kali (lihat existingJurnal()).
 *   - Atomic: dipanggil dari dalam DB::transaction() milik caller, sehingga
 *     jurnal ikut ter-rollback jika settlement gagal.
 *   - ref_type di-set pada JurnalUmum — ini membuat deleteJurnal() yang
 *     ada menolaknya (existing guard: "Jurnal berasal dari transaksi
 *     sistem. Tidak dapat dihapus."). Cocok dengan sifat immutable
 *     settlement journal.
 *   - Akun Kas/Bank ditentukan dari Lembaga.default_bank_coa_id; bila
 *     NULL, fallback ke COA kode '1102' (Bank BCA) → '1101' (Kas).
 */
class SettlementJournalService
{
    // ─── Konstanta COA yang dipakai ──────────────────────────────────────
    public const COA_PIUTANG_USAHA = '1105';
    public const COA_UTANG_HONOR = '2107';
    public const COA_UTANG_PPH21 = '2102';
    public const COA_KAS = '1101';
    public const COA_BANK_BCA = '1102';

    // ─── ref_type di JurnalUmum.ref_type (penanda settlement) ────────────
    public const REF_PIUTANG_SETTLEMENT = 'settlement_piutang';
    public const REF_AP_HONOR_SETTLEMENT = 'settlement_ap_honor';
    public const REF_AP_PAJAK_SETTLEMENT = 'settlement_ap_pajak';
    public const REF_AP_HONOR_REVERSAL = 'settlement_ap_honor_reversal';

    /**
     * Settlement 1 — AR (Piutang) lunas sebagian/penuh.
     *
     * Dipanggil saat Kas Masuk pada AR diposting — baik lewat tombol
     * "Buat Jurnal Bank Masuk" (SettlementJournalController::bankMasuk)
     * maupun rebuild jurnal settlement.
     *
     * Satu penerimaan kas = satu jurnal: Dr Kas/Bank, Cr Piutang Usaha.
     * Parsial maupun full, kas masuk dan piutang berkurang harus ter-record
     * di buku besar.
     */
    public function recordArSettlement(
        BuktiPembayaran $bukti,
        ?string $bankCoaId = null,
        ?string $userId = null,
    ): ?JurnalUmum {
        $amount = (float) $bukti->nominal;
        if ($amount <= 0) {
            return null;
        }

        // Invoice + siklus di-eager-load eksplisit: method ini juga dipanggil
        // dari luar (rebuild, scheduler) tanpa relasi ter-load, dan lazy loading
        // dimatikan di environment non-produksi.
        $invoice = $bukti->relationLoaded('invoice')
            ? $bukti->invoice
            : $bukti->invoice()->with('siklus')->first();
        $lembagaId = $invoice?->siklus?->lembaga_id;

        $bankCoa = $this->resolveBankCoa($lembagaId, $bankCoaId);
        $piutangCoa = $this->getCoaByKode(self::COA_PIUTANG_USAHA, $lembagaId);
        if (! $bankCoa || ! $piutangCoa) {
            Log::warning('settlement.ar.skipped', [
                'bukti_id' => $bukti->id,
                'reason' => 'COA bank atau piutang tidak ditemukan',
                'bank_coa_id' => $bankCoa?->id,
                'piutang_coa_id' => $piutangCoa?->id,
            ]);
            return null;
        }

        return $this->createBalancedJurnal(
            tanggal: $bukti->tanggal_verifikasi ?? $bukti->tanggal_submit ?? now(),
            kategoriJenis: KategoriJurnal::JENIS_BKM,
            keterangan: sprintf(
                'Penerimaan kas dari Faskes — Invoice %s — Bukti #%s',
                $invoice?->nomor_invoice ?? '—',
                substr((string) $bukti->id, 0, 8),
            ),
            refType: self::REF_PIUTANG_SETTLEMENT,
            refId: $bukti->id,
            lembagaId: $lembagaId,
            userId: $userId,
            details: [
                ['coa_id' => $bankCoa->id, 'debit' => $amount, 'kredit' => 0, 'keterangan' => 'Kas/Bank — ' . $bankCoa->nama],
                ['coa_id' => $piutangCoa->id, 'debit' => 0, 'kredit' => $amount, 'keterangan' => 'Piutang Usaha — Invoice ' . ($invoice?->nomor_invoice ?? '—')],
            ],
        );
    }

    /**
     * Buat jurnal Bank Masuk untuk seluruh penerimaan kas pada satu
     * Invoice AR yang belum punya jurnal settlement.
     *
     * Satu jurnal per bukti pembayaran — bukan satu jurnal per invoice.
     * Alasan akuntansi: satu penerimaan kas = satu mutasi rekening bank.
     * Menggabungkannya jadi satu jurnal per invoice menghapus jejak
     *rekonsiliasi bank per transaksi dan menyulitkan audit.
     *
     * jurnal yang sudah ada (ref_type + ref_id sama) DILEWATI — pemanggilan
     * berulang aman dan tidak menghasilkan dobel posted.
     *
     * @return array{created: array<int, JurnalUmum>, skipped: array<int, string>, errors: array<int, array>}
     */
    public function recordArBankMasuk(
        Invoice $invoice,
        ?string $bankCoaId = null,
        ?string $userId = null,
        ?string $buktiId = null,
    ): array {
        $created = [];
        $skipped = [];
        $errors = [];

        $query = BuktiPembayaran::where('invoice_id', $invoice->id)
            ->where('status_verifikasi', BuktiPembayaran::STATUS_DITERIMA);

        if ($buktiId) {
            $query->where('id', $buktiId);
        }

        $buktiList = $query->orderBy('tanggal_verifikasi')->get();

        foreach ($buktiList as $bukti) {
            if ($this->existingJurnal(self::REF_PIUTANG_SETTLEMENT, $bukti->id)) {
                $skipped[] = $bukti->id;
                continue;
            }

            try {
                $jurnal = $this->recordArSettlement($bukti, $bankCoaId, $userId);
                if ($jurnal) {
                    $created[] = $jurnal;
                } else {
                    $errors[] = [
                        'bukti_id' => $bukti->id,
                        'error' => 'Akun kas/bank atau piutang usaha belum tersedia. '
                            . 'Set akun kas/bank default pada menu Pengaturan Settlement.',
                    ];
                }
            } catch (\Throwable $e) {
                $errors[] = ['bukti_id' => $bukti->id, 'error' => $e->getMessage()];
            }
        }

        return ['created' => $created, 'skipped' => $skipped, 'errors' => $errors];
    }

    /**
     * Settlement 2 — AP Honor dibayar (Surveior/Verifikator/Rekomendator).
     *
     * Dipanggil dari SettlementJournalController::bankKeluar() saat tim
     * Keuangan menekan tombol "Buat Jurnal Bank Keluar" pada pembayaran
     * honor yang sudah disetujui. Mencatat: Dr Utang Honor, Cr Bank.
     */
    public function recordApHonorSettlement(
        PembayaranHonor $pembayaran,
        ?string $bankCoaId = null,
        ?string $userId = null,
    ): ?JurnalUmum {
        $amount = (float) $pembayaran->total_nominal;
        if ($amount <= 0) {
            return null;
        }

        $lembagaId = $this->resolveLembagaIdFromPembayaran($pembayaran);
        $bankCoa = $this->resolveBankCoa($lembagaId, $bankCoaId);
        $utangCoa = $this->getCoaByKode(self::COA_UTANG_HONOR, $lembagaId);
        if (! $bankCoa || ! $utangCoa) {
            Log::warning('settlement.ap_honor.skipped', [
                'pembayaran_id' => $pembayaran->id,
                'reason' => 'COA bank atau utang honor tidak ditemukan',
            ]);
            return null;
        }

        return $this->createBalancedJurnal(
            tanggal: $pembayaran->tanggal_pembayaran ?? now(),
            kategoriJenis: KategoriJurnal::JENIS_BKK,
            keterangan: sprintf(
                'Pelunasan honor Surveior/Verifikator/Rekomendator — %s',
                $pembayaran->nomor_pembayaran,
            ),
            refType: self::REF_AP_HONOR_SETTLEMENT,
            refId: $pembayaran->id,
            lembagaId: $lembagaId,
            userId: $userId ?? $pembayaran->disetujui_oleh,
            details: [
                ['coa_id' => $utangCoa->id, 'debit' => $amount, 'kredit' => 0, 'keterangan' => 'Utang Honor — ' . $pembayaran->nomor_pembayaran],
                ['coa_id' => $bankCoa->id, 'debit' => 0, 'kredit' => $amount, 'keterangan' => 'Kas/Bank — ' . $bankCoa->nama],
            ],
        );
    }

    /**
     * Buat jurnal Bank Keluar untuk satu pembayaran AP honor yang sudah
     * disetujui (honor sudah dibayar).
     *
     * Pasangan dari recordArBankMasuk() untuk sisi AP: jurnal kas keluar
     * dibuat EKSPLISIT oleh tim Keuangan lewat tombol "Buat Jurnal Bank
     * Keluar", bukan otomatis saat pembayaran disetujui. Alasan akuntansi
     * simetris dengan AR — kredit bank hanya sah setelah pengeluaran kas
     * benar-benar terjadi dan dikonfirmasi terhadap mutasi rekening
     * (rekonsiliasi bank).
     *
     * Satu pembayaran honor = satu mutasi bank = satu jurnal.
     * Idempotent: ref_type + ref_id yang sama tidak menghasilkan jurnal
     * ganda, jadi tombol aman diklik berulang tanpa dobel posted.
     *
     * @return array{created: array<int, JurnalUmum>, skipped: array<int, string>, errors: array<int, array>}
     */
    public function recordApBankKeluar(
        PembayaranHonor $pembayaran,
        ?string $bankCoaId = null,
        ?string $userId = null,
    ): array {
        if ($this->existingJurnal(self::REF_AP_HONOR_SETTLEMENT, $pembayaran->id)) {
            return ['created' => [], 'skipped' => [$pembayaran->id], 'errors' => []];
        }

        try {
            $jurnal = $this->recordApHonorSettlement($pembayaran, $bankCoaId, $userId);
            if ($jurnal) {
                return ['created' => [$jurnal], 'skipped' => [], 'errors' => []];
            }

            return ['created' => [], 'skipped' => [], 'errors' => [[
                'pembayaran_id' => $pembayaran->id,
                'error' => 'Akun kas/bank atau utang honor belum tersedia. '
                    . 'Set akun kas/bank default pada menu Pengaturan Settlement.',
            ]]];
        } catch (\Throwable $e) {
            return ['created' => [], 'skipped' => [], 'errors' => [[
                'pembayaran_id' => $pembayaran->id,
                'error' => $e->getMessage(),
            ]]];
        }
    }

    /**
     * Batalkan jurnal Bank Keluar untuk pembayaran honor yang dibatalkan.
     *
     * Dipanggil dari ApHonorService::cancelPayment() ketika pembayaran yang
     * SUDAH punya jurnal settlement dibatalkan. Tanpa pembalikan ini, kas
     * keluar tetap tercatat di buku besar padahal pembayarannya dibatalkan.
     *
     * Jurnal pembalik dicatat dengan ref_type sendiri supaya:
     *   - tidak bentrok dengan jurnal asli (ref_type + ref_id guard), dan
     *   - tetap terlihat di daftar jurnal settlement sebagai jejak audit.
     *
     * Idempotent: pembalik untuk pembayaran yang sama tidak dibuat dua kali.
     */
    public function reverseApHonorSettlement(
        PembayaranHonor $pembayaran,
        ?string $bankCoaId = null,
        ?string $userId = null,
    ): ?JurnalUmum {
        $original = $this->existingJurnal(self::REF_AP_HONOR_SETTLEMENT, $pembayaran->id);
        if (! $original) {
            return null;
        }

        // Sudah pernah dibalik — jangan buat pembalik kedua.
        if ($this->existingJurnal(self::REF_AP_HONOR_REVERSAL, $pembayaran->id)) {
            return null;
        }

        $amount = (float) $pembayaran->total_nominal;
        if ($amount <= 0) {
            return null;
        }

        $lembagaId = $this->resolveLembagaIdFromPembayaran($pembayaran);
        $bankCoa = $this->resolveBankCoa($lembagaId, $bankCoaId);
        $utangCoa = $this->getCoaByKode(self::COA_UTANG_HONOR, $lembagaId);
        if (! $bankCoa || ! $utangCoa) {
            Log::warning('settlement.ap_honor.reversal_skipped', [
                'pembayaran_id' => $pembayaran->id,
                'reason' => 'COA bank atau utang honor tidak ditemukan',
            ]);
            return null;
        }

        return $this->createBalancedJurnal(
            tanggal: now(),
            kategoriJenis: KategoriJurnal::JENIS_BKK,
            keterangan: sprintf(
                'Pembatalan pelunasan honor — %s',
                $pembayaran->nomor_pembayaran,
            ),
            refType: self::REF_AP_HONOR_REVERSAL,
            refId: $pembayaran->id,
            lembagaId: $lembagaId,
            userId: $userId,
            details: [
                ['coa_id' => $bankCoa->id, 'debit' => $amount, 'kredit' => 0, 'keterangan' => 'Kas/Bank — pembalik ' . $pembayaran->nomor_pembayaran],
                ['coa_id' => $utangCoa->id, 'debit' => 0, 'kredit' => $amount, 'keterangan' => 'Utang Honor — pembalik ' . $pembayaran->nomor_pembayaran],
            ],
        );
    }

    /**
     * Settlement 3 — AP PPh 21 dibayar (setor ke Ditjen Pajak).
     *
     * Dipanggil dari HutangPajakService::markAsPaid() setelah status
     * hutang berubah ke dibayar. Mencatat: Dr Utang PPh 21, Cr Bank.
     */
    public function recordApPajakSettlement(
        HutangPajak $hutang,
        ?string $bankCoaId = null,
        ?string $userId = null,
    ): ?JurnalUmum {
        $amount = (float) $hutang->jumlah_pajak;
        if ($amount <= 0) {
            return null;
        }

        $lembagaId = $this->resolveLembagaIdFromHutang($hutang);
        $bankCoa = $this->resolveBankCoa($lembagaId, $bankCoaId);
        $utangCoa = $this->getCoaByKode(self::COA_UTANG_PPH21, $lembagaId);
        if (! $bankCoa || ! $utangCoa) {
            Log::warning('settlement.ap_pajak.skipped', [
                'hutang_id' => $hutang->id,
                'reason' => 'COA bank atau utang PPh 21 tidak ditemukan',
            ]);
            return null;
        }

        return $this->createBalancedJurnal(
            tanggal: $hutang->tanggal_dibayar ?? now(),
            kategoriJenis: KategoriJurnal::JENIS_BKK,
            keterangan: sprintf(
                'Setor PPh 21 — %s — NPWP %s',
                $hutang->nama_wajib_pajak ?? '—',
                $hutang->nomor_pokok_wajib_pajak ?? '—',
            ),
            refType: self::REF_AP_PAJAK_SETTLEMENT,
            refId: $hutang->id,
            lembagaId: $lembagaId,
            userId: $userId ?? $hutang->dibayar_oleh,
            details: [
                ['coa_id' => $utangCoa->id, 'debit' => $amount, 'kredit' => 0, 'keterangan' => 'Utang PPh 21 — ' . ($hutang->nama_wajib_pajak ?? '—')],
                ['coa_id' => $bankCoa->id, 'debit' => 0, 'kredit' => $amount, 'keterangan' => 'Kas/Bank — ' . $bankCoa->nama],
            ],
        );
    }

    /**
     * Buat jurnal Bank Keluar untuk satu hutang pajak PPh 21 yang SUDAH
     * dibayar (status = dibayar).
     *
     * Mirrors recordApBankKeluar() untuk sisi AP honor: satu setor pajak =
     * satu mutasi bank = satu jurnal. Idempotent — hutang yang sudah punya
     * jurnal settlement dilewati, jadi tombol aman diklik berulang tanpa
     * dobel posted.
     *
     * @return array{created: array<int, JurnalUmum>, skipped: array<int, string>, errors: array<int, array>}
     */
    public function recordApPajakBankKeluar(
        HutangPajak $hutang,
        ?string $bankCoaId = null,
        ?string $userId = null,
    ): array {
        if ($this->existingJurnal(self::REF_AP_PAJAK_SETTLEMENT, $hutang->id)) {
            return ['created' => [], 'skipped' => [$hutang->id], 'errors' => []];
        }

        try {
            $jurnal = $this->recordApPajakSettlement($hutang, $bankCoaId, $userId);
            if ($jurnal) {
                return ['created' => [$jurnal], 'skipped' => [], 'errors' => []];
            }

            return ['created' => [], 'skipped' => [], 'errors' => [[
                'hutang_pajak_id' => $hutang->id,
                'error' => 'Akun kas/bank atau utang PPh 21 belum tersedia. '
                    . 'Set akun kas/bank default pada menu Pengaturan Settlement.',
            ]]];
        } catch (\Throwable $e) {
            return ['created' => [], 'skipped' => [], 'errors' => [[
                'hutang_pajak_id' => $hutang->id,
                'error' => $e->getMessage(),
            ]]];
        }
    }

    /**
     * Lookup jurnal settlement yang sudah ada untuk ref tertentu.
     * Dipakai untuk idempotency check.
     */
    public function existingJurnal(string $refType, string $refId): ?JurnalUmum
    {
        return JurnalUmum::where('ref_type', $refType)
            ->where('ref_id', $refId)
            ->first();
    }

    /**
     * Buat Jurnal Umum balanced (Dr = Cr) dengan multiple detail baris.
     * Idempotent berdasarkan ref_type + ref_id: kalau sudah ada, kembalikan
     * yang existing tanpa membuat duplikat.
     */
    private function createBalancedJurnal(
        Carbon $tanggal,
        string $kategoriJenis,
        string $keterangan,
        string $refType,
        string $refId,
        ?string $lembagaId,
        ?string $userId,
        array $details,
    ): JurnalUmum {
        // Idempotency guard
        $existing = $this->existingJurnal($refType, $refId);
        if ($existing) {
            return $existing;
        }

        $totalDebit = array_sum(array_column($details, 'debit'));
        $totalKredit = array_sum(array_column($details, 'kredit'));
        if (bccomp((string) $totalDebit, (string) $totalKredit, 2) !== 0) {
            throw new \RuntimeException(sprintf(
                'Settlement jurnal tidak balanced: debit=%.2f kredit=%.2f (ref=%s/%s)',
                $totalDebit, $totalKredit, $refType, $refId,
            ));
        }
        if ($totalDebit <= 0) {
            throw new \RuntimeException('Settlement jurnal nominal tidak boleh nol.');
        }

        $kategori = KategoriJurnal::where('jenis', $kategoriJenis)
            ->when($lembagaId, fn ($q) => $q->where('lembaga_id', $lembagaId))
            ->first();

        try {
            return DB::transaction(function () use (
                $tanggal, $keterangan, $refType, $refId, $lembagaId, $userId,
                $details, $kategori, $totalDebit, $totalKredit,
            ) {
            $nomor = $this->generateNomorJurnal($tanggal, $kategori?->jenis);

            $jurnal = JurnalUmum::create([
                'id' => (string) Str::uuid(),
                'nomor' => $nomor,
                'tanggal' => $tanggal->toDateString(),
                'kategori_id' => $kategori?->id,
                'keterangan' => $keterangan,
                'ref_type' => $refType,
                'ref_id' => $refId,
                'total_debit' => round($totalDebit, 2),
                'total_kredit' => round($totalKredit, 2),
                'dibuat_oleh' => $userId,
                'lembaga_id' => $lembagaId,
            ]);

            foreach ($details as $d) {
                JurnalUmumDetail::create([
                    'id' => (string) Str::uuid(),
                    'jurnal_umum_id' => $jurnal->id,
                    'coa_id' => $d['coa_id'],
                    'debit' => round((float) ($d['debit'] ?? 0), 2),
                    'kredit' => round((float) ($d['kredit'] ?? 0), 2),
                    'keterangan' => $d['keterangan'] ?? null,
                ]);
            }

            AuditTrail::create([
                'id' => (string) Str::uuid(),
                'aktor_id' => $userId,
                'aksi' => 'settlement.jurnal_created',
                'target_type' => 'JurnalUmum',
                'target_id' => $jurnal->id,
                'data_sebelum' => null,
                'data_sesudah' => [
                    'ref_type' => $refType,
                    'ref_id' => $refId,
                    'nomor' => $nomor,
                    'total_debit' => round($totalDebit, 2),
                    'total_kredit' => round($totalKredit, 2),
                ],
                'ip_address' => request()?->ip(),
                'user_agent' => request()?->userAgent() ?? 'system:SettlementJournalService',
                'lembaga_id' => $lembagaId,
            ]);

            Log::info('settlement.jurnal_created', [
                'jurnal_id' => $jurnal->id,
                'nomor' => $nomor,
                'ref_type' => $refType,
                'ref_id' => $refId,
                'total' => $totalDebit,
            ]);

            return $jurnal;
            });
        } catch (QueryException $e) {
            // Balapan: request lain membuat jurnal untuk ref yang sama lebih
            // dulu dan(unique ref_type+ref_id) menolak insert ini. Kembalikan
            // jurnal yang sudah ada daripada meledak jadi 500.
            $existing = $this->existingJurnal($refType, $refId);
            if ($existing) {
                return $existing;
            }
            throw $e;
        }
    }

    /**
     * Tentukan akun Kas/Bank yang dipakai.
     * Prioritas:
     *   1. Override eksplisit ($bankCoaId)
     *   2. Lembaga.default_bank_coa_id
     *   3. Fallback: COA kode '1102' (Bank BCA)
     *   4. Fallback akhir: COA kode '1101' (Kas)
     */
    private function resolveBankCoa(?string $lembagaId, ?string $bankCoaId): ?Coa
    {
        if ($bankCoaId) {
            $coa = Coa::withoutGlobalScope('lembaga')->find($bankCoaId);
            if ($coa && $coa->is_aktif) {
                return $coa;
            }
        }

        if ($lembagaId) {
            $lembaga = Lembaga::find($lembagaId);
            if ($lembaga?->default_bank_coa_id) {
                $coa = Coa::withoutGlobalScope('lembaga')->find($lembaga->default_bank_coa_id);
                if ($coa && $coa->is_aktif) {
                    return $coa;
                }
            }
        }

        // Fallback ke default COA berdasarkan kode — lookup per-lembaga dulu,
        // jika tidak ada ambil yang lembaga_id null (shared/global).
        $fallback = $this->getCoaByKode(self::COA_BANK_BCA, $lembagaId)
            ?? $this->getCoaByKode(self::COA_KAS, $lembagaId);

        return $fallback;
    }

    /**
     * Lookup COA berdasarkan kode akuntansi (mis. '1105' = Piutang Usaha).
     * Prioritas: COA dengan lembaga_id yang match → fallback ke lembaga_id NULL.
     */
    private function getCoaByKode(string $kode, ?string $lembagaId): ?Coa
    {
        $q = Coa::query()->where('kode', $kode)->where('is_aktif', true);
        if ($lembagaId) {
            $coa = (clone $q)->where('lembaga_id', $lembagaId)->first();
            if ($coa) return $coa;
        }
        return $q->whereNull('lembaga_id')->first()
            ?? $q->first();
    }

    private function resolveLembagaIdFromPembayaran(PembayaranHonor $p): ?string
    {
        // PembayaranHonor tidak menyimpan lembaga_id langsung — ambil
        // dari siklus.faskes di ledger entry pertama.
        return app(LembagaResolver::class)->fromPembayaranHonor($p->id);
    }

    private function resolveLembagaIdFromHutang(HutangPajak $h): ?string
    {
        // HutangPajak tidak punya kolom lembaga_id — scoped lewat
        // PembayaranHonor → detail → ledger entry → siklus.
        // Relasi di-eager-load eksplisit: method ini dipanggil dari luar
        // (rebuild, scheduler, controller) tanpa relasi ter-load, dan lazy
        // loading dimatikan di environment non-produksi.
        return app(LembagaResolver::class)->fromHutangPajak($h->id);
    }

    /**
     * Lembaga pemilik sebuah hutang pajak (null bila tidak bisa ditelusuri).
     * Dipakai controller untuk guard: hutang hanya boleh di-journal dari
     * session lembaga yang sama.
     */
    public function hutangLembagaId(HutangPajak $hutang): ?string
    {
        return $this->resolveLembagaIdFromHutang($hutang);
    }

    private function generateNomorJurnal(Carbon $tanggal, ?string $kategoriJenis): string
    {
        $prefix = match ($kategoriJenis) {
            KategoriJurnal::JENIS_BKM => 'BKM',
            KategoriJurnal::JENIS_BKK => 'BKK',
            KategoriJurnal::JENIS_KKM => 'KKM',
            KategoriJurnal::JENIS_KKK => 'KKK',
            default => 'JU',
        };
        $prefix .= sprintf('/%04d/%02d/', $tanggal->year, $tanggal->month);
        $count = JurnalUmum::where('nomor', 'like', $prefix . '%')->count();
        return $prefix . str_pad((string) ($count + 1), 4, '0', STR_PAD_LEFT);
    }
}
