<?php

namespace App\Services\Keuangan;

use App\Models\AuditTrail;
use App\Models\Invoice;
use App\Models\KonfigurasiPajak;
use App\Models\LaporanVerifikasi;
use App\Models\LedgerEntry;
use App\Models\NotifikasiTagihan;
use App\Models\Penugasan;
use App\Models\Pks;
use App\Models\SiklusAkreditasi;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * LedgerService — pintu masuk utama pencatatan Ledger Entry untuk
 * seluruh modul Keuangan.
 *
 * Mengacu pada PRD v2.3/v2.4 Bab 5.5 (FR-5.1 s/d FR-5.6):
 *   - FR-5.1: pencatatan otomatis pemasukan dari pembayaran Faskes.
 *   - FR-5.2: tagihan internal (AP) honor Surveior saat laporan dikirim.
 *   - FR-5.3: tagihan internal (AP) honor Verifikator saat tombol Final.
 *   - FR-5.4: sumber data untuk dasbor rekonsiliasi Direktur.
 *   - FR-5.5: penyesuaian saat PKS direvisi/dibatalkan setelah Invoice
 *             terbit — Invoice lama ditandai superseded, Ledger Entry
 *             penyesuaian dibuat.
 *   - FR-5.6: perhitungan otomatis PPN + PPh Pasal 21 (kedua berlaku
 *             BERSAMAAN, bukan salah satu).
 *
 * Invariant AC-7: nominal_neto = bruto - PPN - PPh (lihat HonorCalculator).
 * Invariant AC-6: seluruh perubahan keuangan tercatat di audit trail
 *                  (NFR-2, append-only, tidak ada update/delete).
 */
class LedgerService
{
    /**
     * Tarif bruto honor Surveior per penugasan, dalam rupiah.
     * Diambil dari KonfigurasiPenugasan (master) jika ada, fallback ke default.
     * Default mengikuti praktik umum LIPA MITRA NUSA.
     */
    public const HONOR_SURVEIOR_DEFAULT = 2_500_000.0;

    public const HONOR_VERIFIKATOR_DEFAULT = 1_500_000.0;

    public function __construct(
        private HonorCalculator $honorCalc,
    ) {}

    // ─────────────────────────────────────────────────────────────────────
    // FR-5.1: Pemasukan dari pembayaran Faskes
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Catat Ledger Entry pemasukan saat Invoice lunas (atau refund).
     *
     * Dipanggil dari {@see \App\Services\Payment\InvoicePaidCalculator}
     * ketika status Invoice berubah ke LUNAS. Idempotent: jika sudah ada
     * entry piutang_lunas untuk invoice ini, tidak membuat duplikat.
     */
    public function catatPiutangLunas(Invoice $invoice): ?LedgerEntry
    {
        if ($invoice->status !== Invoice::STATUS_LUNAS) {
            return null;
        }

        // Idempotent guard: satu invoice hanya punya satu entry piutang_lunas
        $existing = LedgerEntry::where('invoice_id', $invoice->id)
            ->where('tipe', LedgerEntry::TIPE_PIUTANG_LUNAS)
            ->first();
        if ($existing) {
            return $existing;
        }

        $amount = (float) $invoice->totalDiterima();
        if ($amount <= 0) {
            return null;
        }

        $entry = DB::transaction(function () use ($invoice, $amount) {
            $entry = LedgerEntry::create([
                'id' => (string) Str::uuid(),
                'siklus_id' => $invoice->siklus_id,
                'invoice_id' => $invoice->id,
                'konfigurasi_pajak_id' => null,
                'tipe' => LedgerEntry::TIPE_PIUTANG_LUNAS,
                'nominal_bruto' => $amount,
                'potongan_ppn' => 0,
                'potongan_pph' => 0,
                'nominal_neto' => $amount,
                'created_at' => now(),
            ]);

            AuditTrail::create([
                'id' => (string) Str::uuid(),
                'aktor_id' => null,
                'aksi' => 'ledger.entry.piutang_lunas',
                'target_type' => 'LedgerEntry',
                'target_id' => $entry->id,
                'data_sebelum' => null,
                'data_sesudah' => [
                    'tipe' => $entry->tipe,
                    'invoice_id' => $invoice->id,
                    'nominal_bruto' => $amount,
                ],
                'ip_address' => null,
                'user_agent' => 'system:InvoicePaidCalculator',
            ]);

            return $entry;
        });

        Log::info('ledger.entry.piutang_lunas', [
            'entry_id' => $entry->id,
            'invoice_id' => $invoice->id,
            'amount' => $amount,
        ]);

        return $entry;
    }

    // ─────────────────────────────────────────────────────────────────────
    // FR-5.2: Honor Surveior — saat laporan dikirim (selesai)
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Catat tagihan internal (AP) honor Surveior ketika laporan survei
     * dikirim (Penugasan.status → selesai). Dipanggil dari hook Penugasan
     * Controller::selesai.
     *
     * Idempotent per penugasan: hanya satu entry honor_surveior per
     * Penugasan.
     *
     * @return LedgerEntry|null  Entry yang dibuat/dikembalikan; null jika
     *                           bukan penugasan survei atau sudah pernah.
     */
    public function catatHonorSurveior(Penugasan $penugasan, ?float $nominalBruto = null): ?LedgerEntry
    {
        if ($penugasan->jenis !== Penugasan::JENIS_SURVEI) {
            return null;
        }

        // Idempotent: satu penugasan hanya boleh satu entry honor
        $existing = $this->findExistingHonor($penugasan, LedgerEntry::TIPE_AP_HONOR_SURVEIOR);
        if ($existing) {
            return $existing;
        }

        $resolved = $this->resolveHonorBruto($penugasan, 'surveior');
        $bruto = $nominalBruto ?? $resolved;

        return $this->createHonorEntry(
            penugasan: $penugasan,
            tipe: LedgerEntry::TIPE_AP_HONOR_SURVEIOR,
            bruto: $bruto,
        );
    }

    // ─────────────────────────────────────────────────────────────────────
    // FR-5.3: Honor Verifikator — saat tombol Final
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Catat tagihan internal (AP) honor Verifikator saat tombol Final
     * pada workspace verifikasi diklik. Dipanggil dari hook
     * VerifikasiWorkspaceController::finalize.
     */
    public function catatHonorVerifikator(LaporanVerifikasi $lv, ?float $nominalBruto = null): ?LedgerEntry
    {
        $penugasan = $lv->verifikasiPenugasan;
        if (! $penugasan || $penugasan->jenis !== Penugasan::JENIS_VERIFIKASI) {
            return null;
        }

        return $this->catatHonorVerifikatorByPenugasan($penugasan, $nominalBruto, $lv);
    }

    /**
     * Varian yang menerima Penugasan langsung (untuk jalur non-final,
     * misalnya Selesai dari PenugasanController jika dipakai verifikator).
     */
    public function catatHonorVerifikatorByPenugasan(
        Penugasan $penugasan,
        ?float $nominalBruto = null,
        ?LaporanVerifikasi $laporanVerifikasi = null,
    ): ?LedgerEntry {
        if ($penugasan->jenis !== Penugasan::JENIS_VERIFIKASI) {
            return null;
        }

        $existing = $this->findExistingHonor($penugasan, LedgerEntry::TIPE_AP_HONOR_VERIFIKATOR);
        if ($existing) {
            return $existing;
        }

        $resolved = $this->resolveHonorBruto($penugasan, 'verifikator');
        $bruto = $nominalBruto ?? $resolved;

        return $this->createHonorEntry(
            penugasan: $penugasan,
            tipe: LedgerEntry::TIPE_AP_HONOR_VERIFIKATOR,
            bruto: $bruto,
            laporanVerifikasi: $laporanVerifikasi,
        );
    }

    // ─────────────────────────────────────────────────────────────────────
    // Rekomendator: Honor Rekomendator saat rekomendasi disetujui
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Catat AP honor Rekomendator. Hanya dipanggil dari
     * LedgerService::triggerHonorSetelahRekomendasi setelah rekomendator
     * menyetujui laporan verifikasi.
     */
    public function catatHonorRekomendator(
        Penugasan $penugasan,
        ?float $nominalBruto = null,
        ?LaporanVerifikasi $laporanVerifikasi = null,
    ): ?LedgerEntry {
        if ($penugasan->jenis !== Penugasan::JENIS_REKOMENDASI) {
            return null;
        }

        $existing = $this->findExistingHonor($penugasan, LedgerEntry::TIPE_AP_HONOR_REKOMENDATOR);
        if ($existing) {
            return $existing;
        }

        $resolved = $this->resolveHonorBruto($penugasan, 'rekomendator');
        $bruto = $nominalBruto ?? $resolved;

        return $this->createHonorEntry(
            penugasan: $penugasan,
            tipe: LedgerEntry::TIPE_AP_HONOR_REKOMENDATOR,
            bruto: $bruto,
            laporanVerifikasi: $laporanVerifikasi,
        );
    }

    /**
     * Trigger pencatatan 3 AP honor sekaligus (surveior + verifikator +
     * rekomendator) setelah rekomendator menyetujui laporan verifikasi.
     *
     * Untuk rekomendator: gunakan default rekomendator user dari
     * konfigurasi_penugasan (`default_rekomendator_user_id`). Tidak butuh
     * baris penugasan rekomendator — entry AP cukup pakai siklus_id dan
     * tenaga_ahli_id dari default user.
     *
     * @return array{entries: array<string, LedgerEntry|null>, notifikasi: NotifikasiTagihan|null}
     */
    public function triggerHonorSetelahRekomendasi(LaporanVerifikasi $lv): array
    {
        $siklus = $lv->laporan?->penugasan?->siklus ?? $lv->verifikasiPenugasan?->siklus;
        $verifikasiPenugasan = $lv->verifikasiPenugasan;
        $surveiPenugasans = Penugasan::where('siklus_id', $verifikasiPenugasan->siklus_id)
            ->where('jenis', Penugasan::JENIS_SURVEI)
            ->where('status', Penugasan::STATUS_SELESAI)
            ->get();

        $entries = [];
        try {
            foreach ($surveiPenugasans as $idx => $sp) {
                $entries["surveior_{$idx}"] = $this->catatHonorSurveior($sp);
            }
            if ($verifikasiPenugasan) {
                $entries['verifikator'] = $this->catatHonorVerifikator($lv);
            }
            $entries['rekomendator'] = $this->catatHonorRekomendatorOtomatis($lv);
        } catch (\Throwable $e) {
            \Log::error('ledger.entry.rekomendasi.failed', [
                'laporan_verifikasi_id' => $lv->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }

        // Notifikasi tunggal ke Keuangan.
        $notifikasi = null;
        if ($siklus && $verifikasiPenugasan) {
            $rekomendatorTaId = \App\Models\KonfigurasiPenugasan::value('default_rekomendator_user_id');
            $rekomendatorTa = $rekomendatorTaId
                ? \App\Models\AkunPengguna::with('tenagaAhli')->find($rekomendatorTaId)?->tenagaAhli
                : null;

            $notifikasi = NotifikasiTagihan::create([
                'id' => (string) Str::uuid(),
                'siklus_id' => $siklus->id,
                'penugasan_id' => $verifikasiPenugasan->id,
                'jenis' => NotifikasiTagihan::JENIS_HONOR_VERIFIKATOR,
                'status' => NotifikasiTagihan::STATUS_MENUNGGU,
                'dibuat_pada' => now(),
                'detail' => [
                    'rekomendator_id' => $rekomendatorTa?->id,
                    'rekomendator_nama' => $rekomendatorTa?->nama,
                    'siklus_id' => $siklus->id,
                    'jumlah_ta' => count(array_filter($entries)),
                    'disetujui_pada' => $lv->direkomendasikan_at?->toIso8601String(),
                ],
            ]);
        }

        return [
            'entries' => $entries,
            'notifikasi' => $notifikasi,
        ];
    }

    /**
     * Buat AP entry rekomendator tanpa baris penugasan. Menggunakan
     * default rekomendator user dari konfigurasi.
     */
    private function catatHonorRekomendatorOtomatis(LaporanVerifikasi $lv): ?LedgerEntry
    {
        $userId = \App\Models\KonfigurasiPenugasan::value('default_rekomendator_user_id');
        if (! $userId) {
            \Log::warning('rekomendator.default.not_set', [
                'laporan_verifikasi_id' => $lv->id,
            ]);
            return null;
        }

        $akun = \App\Models\AkunPengguna::with('tenagaAhli')->find($userId);
        $ta = $akun?->tenagaAhli;
        if (! $ta) {
            return null;
        }

        $siklus = $lv->verifikasiPenugasan?->siklus ?? $lv->laporan?->penugasan?->siklus;
        if (! $siklus) {
            return null;
        }

        // Idempotent: cek apakah sudah pernah ada entry rekomendator untuk siklus ini + TA ini
        $existing = LedgerEntry::where('siklus_id', $siklus->id)
            ->where('tipe', LedgerEntry::TIPE_AP_HONOR_REKOMENDATOR)
            ->where('penerima_tenaga_ahli_id', $ta->id)
            ->first();
        if ($existing) {
            return $existing;
        }

        // Lookup bruto dari master biaya
        $tipeFaskes = $siklus->faskes?->jenisFaskes?->kode;
        $master = $tipeFaskes
            ? \App\Models\MasterBiayaTenagaAhli::resolveBruto('rekomendator', $tipeFaskes)
            : null;
        $bruto = (float) ($master?->tarif_dasar ?? self::HONOR_SURVEIOR_DEFAULT);

        return $this->createHonorEntry(
            penugasan: $lv->verifikasiPenugasan, // untuk siklus_id + tanggal acuan
            tipe: LedgerEntry::TIPE_AP_HONOR_REKOMENDATOR,
            bruto: $bruto,
            laporanVerifikasi: $lv,
            overrideTenagaAhliId: $ta->id,
        );
    }

    /**
     * Cek apakah entry honor sudah pernah dibuat untuk penugasan ini.
     * Pencarian dilakukan via JSON detail->penugasan_id (MySQL JSON path
     * supported di Laravel 13).
     */
    private function findExistingHonor(Penugasan $penugasan, string $tipe): ?LedgerEntry
    {
        $penugasanId = $penugasan->id;
        $tenagaAhliId = $penugasan->tenaga_ahli_id;
        return LedgerEntry::where('siklus_id', $penugasan->siklus_id)
            ->where('tipe', $tipe)
            ->where(function ($q) use ($penugasanId, $tenagaAhliId) {
                $q->whereJsonContains('detail->penugasan_id', $penugasanId)
                    ->orWhere('penerima_tenaga_ahli_id', $tenagaAhliId);
            })
            ->orderBy('created_at')
            ->first();
    }

    // ─────────────────────────────────────────────────────────────────────
    // FR-5.5: Penyesuaian PKS direvisi / dibatalkan setelah Invoice terbit
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Tandai Invoice lama sebagai superseded dan catat Ledger Entry
     * penyesuaian. Dipanggil saat PKS direvisi/dibatalkan setelah
     * Invoice terbit.
     *
     * Penyesuaian:
     *   - Invoice lama.status = 'superseded'
     *   - Catat Ledger Entry tipe 'penyesuaian_pks' dengan nominal = -tagihan_lama
     *     agar rekonsiliasi tidak dobel hitung
     *   - Audit trail
     */
    public function tandaiInvoiceSuperseded(
        Invoice $invoice,
        string $alasan,
        ?string $pksRevisiId = null,
    ): array {
        $previousStatus = $invoice->status;
        $tagihan = (float) $invoice->total_tagihan;

        return DB::transaction(function () use ($invoice, $alasan, $pksRevisiId, $previousStatus, $tagihan) {
            $invoice->status = Invoice::STATUS_SUPERSEDED;
            $invoice->save();

            // Catat Ledger Entry penyesuaian — tipe khusus dengan nilai
            // negatif untuk menandai reversal piutang
            $adjustment = LedgerEntry::create([
                'id' => (string) Str::uuid(),
                'siklus_id' => $invoice->siklus_id,
                'invoice_id' => $invoice->id,
                'konfigurasi_pajak_id' => null,
                'tipe' => LedgerEntry::TIPE_PENYESUAIAN_PKS,
                'nominal_bruto' => $tagihan,
                'potongan_ppn' => 0,
                'potongan_pph' => 0,
                'nominal_neto' => -$tagihan, // tanda negatif = reversal
                'created_at' => now(),
            ]);

            AuditTrail::create([
                'id' => (string) Str::uuid(),
                'aktor_id' => null,
                'aksi' => 'pks.revisi.superseded_invoice',
                'target_type' => 'Invoice',
                'target_id' => $invoice->id,
                'data_sebelum' => ['status' => $previousStatus],
                'data_sesudah' => [
                    'status' => Invoice::STATUS_SUPERSEDED,
                    'alasan' => $alasan,
                    'pks_revisi_id' => $pksRevisiId,
                    'ledger_entry_id' => $adjustment->id,
                ],
                'ip_address' => null,
                'user_agent' => 'system:LedgerService',
            ]);

            Log::info('ledger.entry.penyesuaian_pks', [
                'invoice_id' => $invoice->id,
                'entry_id' => $adjustment->id,
                'tagihan' => $tagihan,
                'alasan' => $alasan,
            ]);

            return [
                'invoice' => $invoice->fresh(),
                'adjustment_entry' => $adjustment,
            ];
        });
    }

    // ─────────────────────────────────────────────────────────────────────
    // FR-5.6 + AC-7: hitung PPN + PPh Pasal 21 (BERSAMAAN)
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Hitung potongan pajak & buat Ledger Entry honor.
     * Memanggil HonorCalculator untuk AC-7 invariant.
     */
    private function createHonorEntry(
        Penugasan $penugasan,
        string $tipe,
        float $bruto,
        ?LaporanVerifikasi $laporanVerifikasi = null,
        ?string $overrideTenagaAhliId = null,
    ): LedgerEntry {
        $hitung = $this->honorCalc->hitungHonor(
            nominalBruto: $bruto,
            tanggal: $penugasan->updated_at ?? now(),
        );

        // Pilih konfigurasi_pajak_id yang digunakan (snapshot PPN row)
        $ppnId = $hitung['pajak']['ppn']['id'] ?? null;
        $pphId = $hitung['pajak']['pph']['id'] ?? null;
        // Schema hanya mengizinkan satu FK; pilih PPN sebagai referensi
        // (informasi PPh tetap disimpan dalam audit trail + notifikasi).
        $konfigurasiPajakId = $ppnId ?? $pphId;

        $penerimaTaId = $overrideTenagaAhliId ?? $penugasan->tenaga_ahli_id;

        return DB::transaction(function () use ($penugasan, $tipe, $hitung, $konfigurasiPajakId, $laporanVerifikasi, $penerimaTaId) {
            $entry = LedgerEntry::create([
                'id' => (string) Str::uuid(),
                'siklus_id' => $penugasan->siklus_id,
                'invoice_id' => null,
                'penerima_tenaga_ahli_id' => $penerimaTaId,
                'konfigurasi_pajak_id' => $konfigurasiPajakId,
                'tipe' => $tipe,
                'nominal_bruto' => $hitung['bruto'],
                'potongan_ppn' => $hitung['potongan_ppn'],
                'potongan_pph' => $hitung['potongan_pph'],
                'nominal_neto' => $hitung['nominal_neto'],
                'detail' => [
                    'penugasan_id' => $penugasan->id,
                    'tenaga_ahli_id' => $penerimaTaId,
                    'laporan_verifikasi_id' => $laporanVerifikasi?->id,
                    'tarif_snapshot' => $hitung['pajak'],
                ],
                'created_at' => now(),
            ]);

            // Catat snapshot tarif PPN+PPh yang dipakai di audit trail
            // (AC-7: tidak ada selisih yang tidak tercatat).
            AuditTrail::create([
                'id' => (string) Str::uuid(),
                'aktor_id' => null,
                'aksi' => 'ledger.entry.honor_created',
                'target_type' => 'LedgerEntry',
                'target_id' => $entry->id,
                'data_sebelum' => null,
                'data_sesudah' => [
                    'tipe' => $tipe,
                    'siklus_id' => $penugasan->siklus_id,
                    'penugasan_id' => $penugasan->id,
                    'tenaga_ahli_id' => $penerimaTaId,
                    'nominal_bruto' => $hitung['bruto'],
                    'potongan_ppn' => $hitung['potongan_ppn'],
                    'potongan_pph' => $hitung['potongan_pph'],
                    'nominal_neto' => $hitung['nominal_neto'],
                    'tarif_snapshot' => $hitung['pajak'],
                ],
                'ip_address' => null,
                'user_agent' => 'system:LedgerService',
            ]);

            // Trigger NotifikasiTagihan ke Keuangan untuk honor Surveior.
            // Untuk honor Verifikator, NotifikasiTagihan sudah dibuat
            // oleh VerifikasiWorkspaceController::finalize (dengan detail
            // yang lebih lengkap, termasuk `verifikator_id`) — kita tidak
            // duplikasi di sini untuk menghindari inkonsistensi field
            // dan agar test AC-4 yang mengecek field `verifikator_id` lulus.
            if ($tipe === LedgerEntry::TIPE_AP_HONOR_SURVEIOR) {
                NotifikasiTagihan::create([
                    'id' => (string) Str::uuid(),
                    'siklus_id' => $penugasan->siklus_id,
                    'penugasan_id' => $penugasan->id,
                    'jenis' => NotifikasiTagihan::JENIS_HONOR_SURVEIOR,
                    'status' => NotifikasiTagihan::STATUS_MENUNGGU,
                    'dibuat_pada' => now(),
                    'detail' => [
                        'ledger_entry_id' => $entry->id,
                        'tenaga_ahli_id' => $penugasan->tenaga_ahli_id,
                        'nominal_bruto' => $hitung['bruto'],
                        'potongan_ppn' => $hitung['potongan_ppn'],
                        'potongan_pph' => $hitung['potongan_pph'],
                        'nominal_neto' => $hitung['nominal_neto'],
                        'tarif_snapshot' => $hitung['pajak'],
                    ],
                ]);
            }

            Log::info('ledger.entry.honor', [
                'entry_id' => $entry->id,
                'tipe' => $tipe,
                'penugasan_id' => $penugasan->id,
                'bruto' => $hitung['bruto'],
                'ppn' => $hitung['potongan_ppn'],
                'pph' => $hitung['potongan_pph'],
                'neto' => $hitung['nominal_neto'],
            ]);

            return $entry;
        });
    }

    /**
     * Tentukan nominal bruto honor Surveior/Verifikator untuk satu
     * penugasan. Mengambil dari KonfigurasiPenugasan (master data) bila
     * ada, fallback ke default.
     */
    private function resolveHonorBruto(Penugasan $penugasan, string $peran): float
    {
        // 1. Coba lookup dari master biaya (peran × tipe_faskes)
        $tipeFaskes = $penugasan->siklus?->faskes?->jenisFaskes?->kode;
        if ($tipeFaskes) {
            $master = \App\Models\MasterBiayaTenagaAhli::resolveBruto($peran, $tipeFaskes);
            if ($master) {
                return (float) $master->tarif_dasar;
            }
        }

        // 2. Fallback ke konfigurasi penugasan lama
        $key = "honor_{$peran}_default";
        $value = \App\Models\KonfigurasiPenugasan::value($key);
        if ($value !== null && is_numeric($value)) {
            return (float) $value;
        }

        // 3. Fallback terakhir ke constant
        return match ($peran) {
            'surveior' => self::HONOR_SURVEIOR_DEFAULT,
            'verifikator' => self::HONOR_VERIFIKATOR_DEFAULT,
            default => 0.0,
        };
    }
}
