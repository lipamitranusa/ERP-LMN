<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BuktiPembayaran;
use App\Models\Coa;
use App\Models\HutangPajak;
use App\Models\Invoice;
use App\Models\JurnalUmum;
use App\Models\Lembaga;
use App\Models\LedgerEntry;
use App\Models\PembayaranHonor;
use App\Services\Keuangan\AccrualJournalService;
use App\Services\Keuangan\SettlementJournalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * SettlementJournalController — endpoint review/manage jurnal settlement
 * AP/AR. Memungkinkan tim Keuangan melihat jurnal apa saja yang sudah
 * ter-generate otomatis untuk setiap pembayaran, dan trigger manual jika
 * diperlukan (mis. untuk catch-up data historis).
 *
 * Privilege: "Ledger/Keuangan"
 *   - Lihat: list, detail, integrity-check
 *   - Tambah: trigger manual untuk bukti/pembayaran/hutang yang belum punya jurnal
 *   - Ubah: ganti default_bank_coa Lembaga
 */
class SettlementJournalController extends Controller
{
    public function __construct(
        private SettlementJournalService $svc,
        private AccrualJournalService $accrual,
    ) {}

    /**
     * GET /api/keuangan/settlement
     * Daftar jurnal settlement, dengan filter ref_type dan rentang tanggal.
     */
    public function index(Request $request): JsonResponse
    {
        $filters = array_filter([
            'ref_type' => $request->string('ref_type')->toString() ?: null,
            'tanggal_dari' => $request->string('tanggal_dari')->toString() ?: null,
            'tanggal_sampai' => $request->string('tanggal_sampai')->toString() ?: null,
            'q' => $request->string('q')->toString() ?: null,
        ], fn ($v) => $v !== null && $v !== '');

        $q = JurnalUmum::with(['details.coa', 'kategori'])
            ->whereIn('ref_type', [
                SettlementJournalService::REF_PIUTANG_SETTLEMENT,
                SettlementJournalService::REF_AP_HONOR_SETTLEMENT,
                SettlementJournalService::REF_AP_PAJAK_SETTLEMENT,
                SettlementJournalService::REF_AP_HONOR_REVERSAL,
            ]);

        if (! empty($filters['ref_type'])) {
            $q->where('ref_type', $filters['ref_type']);
        }
        if (! empty($filters['tanggal_dari'])) {
            $q->whereDate('tanggal', '>=', $filters['tanggal_dari']);
        }
        if (! empty($filters['tanggal_sampai'])) {
            $q->whereDate('tanggal', '<=', $filters['tanggal_sampai']);
        }
        if (! empty($filters['q'])) {
            $term = $filters['q'];
            $q->where(function ($w) use ($term) {
                $w->where('nomor', 'like', "%{$term}%")
                    ->orWhere('keterangan', 'like', "%{$term}%")
                    ->orWhere('ref_id', 'like', "%{$term}%");
            });
        }

        $entries = $q->orderByDesc('tanggal')->orderByDesc('created_at')->limit(500)->get();

        return response()->json([
            'data' => $entries->map(fn (JurnalUmum $j) => [
                'id' => $j->id,
                'nomor' => $j->nomor,
                'tanggal' => $j->tanggal?->toDateString(),
                'ref_type' => $j->ref_type,
                'ref_type_label' => $this->refTypeLabel($j->ref_type),
                'ref_id' => $j->ref_id,
                'kategori' => $j->kategori?->nama,
                'keterangan' => $j->keterangan,
                'total_debit' => (float) $j->total_debit,
                'total_kredit' => (float) $j->total_kredit,
                'is_balanced' => $j->isBalanced(),
                'details' => $j->details->map(fn ($d) => [
                    'coa_kode' => $d->coa?->kode,
                    'coa_nama' => $d->coa?->nama,
                    'debit' => (float) $d->debit,
                    'kredit' => (float) $d->kredit,
                ])->values(),
            ])->values(),
        ]);
    }

    /**
     * GET /api/keuangan/settlement/{id}
     * Detail satu jurnal settlement lengkap.
     */
    public function show(string $id): JsonResponse
    {
        $j = JurnalUmum::with(['details.coa', 'kategori', 'pembuat'])->find($id);
        if (! $j) {
            return response()->json(['message' => 'Jurnal settlement tidak ditemukan.'], 404);
        }

        return response()->json(['data' => $this->presentJurnal($j)]);
    }

    /**
     * GET /api/keuangan/settlement/source-info
     * Ambil info asal jurnal untuk ref tertentu (lookup ref).
     * Berguna untuk "Cek jurnal untuk bukti #X" di UI.
     */
    public function sourceInfo(Request $request): JsonResponse
    {
        $refType = $request->string('ref_type')->toString();
        $refId = $request->string('ref_id')->toString();
        if (! $refType || ! $refId) {
            return response()->json(['message' => 'ref_type dan ref_id wajib diisi.'], 422);
        }

        $existing = $this->svc->existingJurnal($refType, $refId);
        $source = $this->resolveSource($refType, $refId);

        return response()->json([
            'data' => [
                'has_jurnal' => $existing !== null,
                'jurnal' => $existing ? $this->presentJurnal($existing->load(['details.coa', 'kategori'])) : null,
                'source' => $source,
            ],
        ]);
    }

    /**
     * POST /api/keuangan/settlement/rebuild
     * Trigger pembuatan jurnal settlement untuk sumber yang belum punya.
     * Body: { ref_type, ref_id } ATAU { scope: 'all' } untuk rebuild batch.
     *
     * Untuk 'all' akan memindai semua bukti_pembayaran yang diterima,
     * semua pembayaran_honor yang disetujui, dan semua hutang_pajak yang
     * dibayar, lalu membuat jurnal settlement yang hilang (idempotent —
     * hanya yang belum punya jurnal).
     */
    public function rebuild(Request $request): JsonResponse
    {
        $refType = $request->string('ref_type')->toString() ?: null;
        $refId = $request->string('ref_id')->toString() ?: null;
        $scope = $request->string('scope')->toString() ?: null;

        $created = 0;
        $skipped = 0;
        $errors = [];

        if ($refType && $refId) {
            $result = $this->rebuildOne($refType, $refId, $request->user()?->id);
            if ($result['success']) $created++; else $skipped++;
            if (! empty($result['error'])) $errors[] = $result;
        } elseif ($scope === 'all' || ! $scope) {
            // Rebuild AR — bukti_pembayaran diterima
            $buktiList = BuktiPembayaran::where('status_verifikasi', BuktiPembayaran::STATUS_DITERIMA)->get();

            foreach ($buktiList as $bukti) {
                $r = $this->rebuildOne(SettlementJournalService::REF_PIUTANG_SETTLEMENT, $bukti->id, $request->user()?->id);
                if ($r['success'] && $r['created']) $created++;
                elseif ($r['success']) $skipped++;
                else $errors[] = $r;
            }

            // Rebuild AP Honor — pembayaran_honor disetujui
            $pembayaranList = PembayaranHonor::where('status', PembayaranHonor::STATUS_DISETUJUI)->get();
            foreach ($pembayaranList as $p) {
                $r = $this->rebuildOne(SettlementJournalService::REF_AP_HONOR_SETTLEMENT, $p->id, $request->user()?->id);
                if ($r['success'] && $r['created']) $created++;
                elseif ($r['success']) $skipped++;
                else $errors[] = $r;
            }

            // Rebuild AP Pajak — hutang_pajak dibayar
            $hutangList = HutangPajak::where('status', HutangPajak::STATUS_DIBAYAR)->get();
            foreach ($hutangList as $h) {
                $r = $this->rebuildOne(SettlementJournalService::REF_AP_PAJAK_SETTLEMENT, $h->id, $request->user()?->id);
                if ($r['success'] && $r['created']) $created++;
                elseif ($r['success']) $skipped++;
                else $errors[] = $r;
            }

            // Rebuild jurnal akrual — pengakuan pendapatan & beban honor
            $r = $this->rebuildAkrual();
            $created += $r['created'];
            $skipped += $r['skipped'];
            $errors = array_merge($errors, $r['errors']);
        } elseif ($scope === 'akrual') {
            $r = $this->rebuildAkrual();
            $created += $r['created'];
            $skipped += $r['skipped'];
            $errors = array_merge($errors, $r['errors']);
        } else {
            return response()->json(['message' => 'Berikan ref_type + ref_id, atau scope=all.'], 422);
        }

        return response()->json([
            'data' => [
                'created' => $created,
                'skipped' => $skipped,
                'errors' => $errors,
            ],
            'message' => "Rebuild selesai. {$created} jurnal baru dibuat, {$skipped} dilewati (sudah ada).",
        ]);
    }

    /**
     * POST /api/keuangan/settlement/bank-masuk
     * Buat Jurnal Bank Masuk untuk AR yang sudah dibayarkan.
     *
     * Body: { invoice_id, bukti_id? }
     *   - invoice_id : invoice AR yang pembayaran sudah diterima
     *   - bukti_id   : (opsional) batasi hanya ke satu bukti pembayaran
     *
     * Jurnal yang dihasilkan (prinsip double-entry):
     *   Dr. Kas/Bank (akun bank default lembaga)
     *   Cr. Piutang Usaha (1105)
     *
     * Idempotent — bukti pembayaran yang sudah punya jurnal settlement
     * dilewati, jadi tombol bisa diklik berulang tanpa dobel posted.
     */
    public function bankMasuk(Request $request): JsonResponse
    {
        $data = $request->validate([
            'invoice_id' => 'required|uuid',
            'bukti_id' => 'nullable|uuid',
            'bank_coa_id' => 'nullable|uuid',
        ]);

        $invoice = Invoice::with('siklus')->find($data['invoice_id']);
        if (! $invoice) {
            return response()->json(['message' => 'Invoice tidak ditemukan.'], 404);
        }

        // Guard lembaga: invoice hanya boleh/journal dari session lembaga yang sama.
        $sessionLembagaId = session('lembaga_id');
        if ($sessionLembagaId !== null && $invoice->siklus?->lembaga_id !== $sessionLembagaId) {
            return response()->json(['message' => 'Invoice tidak ditemukan.'], 404);
        }

        $buktiId = $data['bukti_id'] ?? null;
        if ($buktiId) {
            $bukti = $invoice->buktiPembayaran()->where('id', $buktiId)->first();
            if (! $bukti) {
                return response()->json(['message' => 'Bukti pembayaran tidak ditemukan pada invoice ini.'], 404);
            }
            if ($bukti->status_verifikasi !== BuktiPembayaran::STATUS_DITERIMA) {
                return response()->json([
                    'message' => 'Jurnal bank masuk hanya bisa dibuat untuk pembayaran yang sudah diterima.',
                ], 422);
            }
        }

        $result = $this->svc->recordArBankMasuk(
            invoice: $invoice,
            bankCoaId: $data['bank_coa_id'] ?? null,
            userId: $request->user()?->id,
            buktiId: $buktiId,
        );

        $jurnalPayload = collect($result['created'])->map(fn (JurnalUmum $j) => $this->presentJurnal($j->load(['details.coa', 'kategori'])))->values();

        if (! empty($result['errors']) && empty($result['created'])) {
            return response()->json([
                'message' => 'Jurnal bank masuk gagal dibuat: ' . ($result['errors'][0]['error'] ?? 'Unknown error'),
                'data' => ['created' => [], 'errors' => $result['errors']],
            ], 422);
        }

        // Sudah ada jurnalnya → bukan error. Satu kas masuk = satu jurnal,
        // dan itu dijamin idempotency service + unique index (ref_type,
        // ref_id). Response tetap 200 supaya UI bisa invalidate + menampilkan
        // nomor jurnal yang sudah ada, bukan menampilkan "gagal".
        $existing = null;
        if ($jurnalPayload->isEmpty() && ! empty($result['skipped'])) {
            $existing = $this->svc->existingJurnal(
                SettlementJournalService::REF_PIUTANG_SETTLEMENT,
                $result['skipped'][0],
            );
        }

        return response()->json([
            'data' => [
                'created' => $jurnalPayload,
                'created_count' => count($jurnalPayload),
                'skipped_count' => count($result['skipped']),
                'errors' => $result['errors'],
                'jurnal' => $existing ? $this->presentJurnal($existing->load(['details.coa', 'kategori'])) : null,
            ],
            'message' => count($jurnalPayload) > 0
                ? count($jurnalPayload) . ' jurnal bank masuk berhasil dibuat.'
                : 'Jurnal bank masuk sudah ada untuk seluruh pembayaran pada invoice ini.',
        ]);
    }

    /**
     * POST /api/keuangan/settlement/bank-keluar
     * Buat Jurnal Bank Keluar untuk pembayaran AP honor yang sudah dibayar.
     *
     * Body: { pembayaran_id }
     *   - pembayaran_id : pembayaran honor yang statusnya sudah 'disetujui'
     *
     * Jurnal yang dihasilkan (prinsip double-entry):
     *   Dr. Utang Honor (2107)
     *   Cr. Kas/Bank (akun bank default lembaga)
     *
     * Idempotent — pembayaran yang sudah punya jurnal settlement dilewati,
     * jadi tombol bisa diklik berulang tanpa dobel posted.
     */
    public function bankKeluar(Request $request): JsonResponse
    {
        $data = $request->validate([
            'pembayaran_id' => 'required|uuid',
            'bank_coa_id' => 'nullable|uuid',
        ]);

        $pembayaran = PembayaranHonor::with('details.ledgerEntry.siklus')->find($data['pembayaran_id']);
        if (! $pembayaran) {
            return response()->json(['message' => 'Pembayaran tidak ditemukan.'], 404);
        }

        // Guard lemma: pembayaran hanya boleh di-journal dari session
        // lembaga yang sama.
        $sessionLembagaId = session('lembaga_id');
        if ($sessionLembagaId !== null) {
            $paymentLembagaId = $pembayaran->details->first()?->ledgerEntry?->siklus?->lembaga_id;
            if ($paymentLembagaId !== $sessionLembagaId) {
                return response()->json(['message' => 'Pembayaran tidak ditemukan.'], 404);
            }
        }

        if ($pembayaran->status !== PembayaranHonor::STATUS_DISETUJUI) {
            return response()->json([
                'message' => 'Jurnal bank keluar hanya bisa dibuat untuk pembayaran yang sudah disetujui.',
            ], 422);
        }

        $result = $this->svc->recordApBankKeluar(
            pembayaran: $pembayaran,
            bankCoaId: $data['bank_coa_id'] ?? null,
            userId: $request->user()?->id,
        );

        $jurnalPayload = collect($result['created'])
            ->map(fn (JurnalUmum $j) => $this->presentJurnal($j->load(['details.coa', 'kategori'])))
            ->values();

        if (! empty($result['errors']) && empty($result['created'])) {
            return response()->json([
                'message' => 'Jurnal bank keluar gagal dibuat: ' . ($result['errors'][0]['error'] ?? 'Unknown error'),
                'data' => ['created' => [], 'errors' => $result['errors']],
            ], 422);
        }

        // Sudah ada jurnal Bank Keluar untuk pembayaran ini → bukan error.
        // Dobel posting sudah dicegah di level service (idempotency) dan
        // unique index (ref_type, ref_id). Response tetap 200 supaya UI
        // invalidate daftar dan menampilkan nomor jurnal yang sudah ada.
        $existing = null;
        if ($jurnalPayload->isEmpty() && ! empty($result['skipped'])) {
            $existing = $this->svc->existingJurnal(
                SettlementJournalService::REF_AP_HONOR_SETTLEMENT,
                $pembayaran->id,
            );
        }

        return response()->json([
            'data' => [
                'created' => $jurnalPayload,
                'created_count' => count($jurnalPayload),
                'skipped_count' => count($result['skipped']),
                'errors' => $result['errors'],
                'jurnal' => $existing ? $this->presentJurnal($existing->load(['details.coa', 'kategori'])) : null,
            ],
            'message' => count($jurnalPayload) > 0
                ? 'Jurnal bank keluar berhasil dibuat.'
                : 'Jurnal bank keluar sudah ada untuk pembayaran ini.',
        ]);
    }

    /**
     * POST /api/keuangan/settlement/bank-keluar-pajak
     * Buat Jurnal Bank Keluar untuk hutang pajak PPh 21 yang sudah dibayar.
     *
     * Body: { hutang_pajak_id }
     *   - hutang_pajak_id : id hutang pajak (harus status "dibayar")
     *
     * Jurnal yang dihasilkan (prinsip double-entry):
     *   Dr. Utang PPh 21 (2102)
     *   Cr. Kas/Bank (akun bank default lembaga)
     *
     * Idempotent — hutang yang sudah punya jurnal settlement dilewati, jadi
     * tombol bisa diklik berulang tanpa dobel posted.
     */
    public function bankKeluarPajak(Request $request): JsonResponse
    {
        $data = $request->validate([
            'hutang_pajak_id' => 'required|uuid',
            'bank_coa_id' => 'nullable|uuid',
        ]);

        $hutang = HutangPajak::with('pembayaranHonor')->find($data['hutang_pajak_id']);
        if (! $hutang) {
            return response()->json(['message' => 'Hutang pajak tidak ditemukan.'], 404);
        }

        // Guard lemma: hutang hanya boleh di-journal dari session lembaga
        // yang sama.
        $sessionLembagaId = session('lembaga_id');
        if ($sessionLembagaId !== null) {
            $hutangLembagaId = $this->svc->hutangLembagaId($hutang);
            if ($hutangLembagaId !== null && $hutangLembagaId !== $sessionLembagaId) {
                return response()->json(['message' => 'Hutang pajak tidak ditemukan.'], 404);
            }
        }

        if ($hutang->status !== HutangPajak::STATUS_DIBAYAR) {
            return response()->json([
                'message' => 'Jurnal bank keluar hanya bisa dibuat untuk hutang pajak yang sudah dibayar.',
            ], 422);
        }

        $result = $this->svc->recordApPajakBankKeluar(
            hutang: $hutang,
            bankCoaId: $data['bank_coa_id'] ?? null,
            userId: $request->user()?->id,
        );

        $jurnalPayload = collect($result['created'])
            ->map(fn (JurnalUmum $j) => $this->presentJurnal($j->load(['details.coa', 'kategori'])))
            ->values();

        if (! empty($result['errors']) && $jurnalPayload->isEmpty()) {
            return response()->json([
                'message' => 'Jurnal bank keluar gagal dibuat: ' . ($result['errors'][0]['error'] ?? 'Unknown error'),
                'data' => ['created' => [], 'errors' => $result['errors']],
            ], 422);
        }

        // Sudah ada jurnalnya → bukan error. Idempotency service + unique
        // index (ref_type, ref_id) sudah mencegah dobel posting; response
        // tetap 200 supaya UI invalidate daftar dan menampilkan nomor
        // jurnal yang sudah ada.
        $existing = null;
        if ($jurnalPayload->isEmpty() && ! empty($result['skipped'])) {
            $existing = $this->svc->existingJurnal(
                SettlementJournalService::REF_AP_PAJAK_SETTLEMENT,
                $hutang->id,
            );
        }

        return response()->json([
            'data' => [
                'created' => $jurnalPayload,
                'created_count' => count($jurnalPayload),
                'skipped_count' => count($result['skipped']),
                'errors' => $result['errors'],
                'jurnal' => $existing ? $this->presentJurnal($existing->load(['details.coa', 'kategori'])) : null,
            ],
            'message' => count($jurnalPayload) > 0
                ? 'Jurnal bank keluar berhasil dibuat.'
                : 'Jurnal bank keluar sudah ada untuk hutang pajak ini.',
        ]);
    }

    /**
     * GET /api/keuangan/settlement/settings
     * Ambil default bank COA Lembaga aktif.
     */
    public function getSettings(): JsonResponse
    {
        $lembagaId = session('lembaga_id');
        $lembaga = $lembagaId ? Lembaga::find($lembagaId) : Lembaga::query()->orderBy('id')->first();
        $bankCoa = $lembaga?->default_bank_coa_id
            ? Coa::withoutGlobalScope('lembaga')->find($lembaga->default_bank_coa_id)
            : null;

        // Tampilkan juga opsi COA kas/bank yang tersedia
        $bankOptions = Coa::whereIn('jenis', [Coa::JENIS_AKTIVA_LANCAR])
            ->where('is_aktif', true)
            ->whereIn('kode', ['1101', '1102', '1103', '1104'])
            ->orderBy('kode')
            ->get(['id', 'kode', 'nama']);

        return response()->json([
            'data' => [
                'lembaga_id' => $lembaga?->id,
                'lembaga_nama' => $lembaga?->nama,
                'default_bank_coa' => $bankCoa ? [
                    'id' => $bankCoa->id,
                    'kode' => $bankCoa->kode,
                    'nama' => $bankCoa->nama,
                ] : null,
                'bank_options' => $bankOptions->map(fn ($c) => [
                    'id' => $c->id, 'kode' => $c->kode, 'nama' => $c->nama,
                ])->values(),
            ],
        ]);
    }

    /**
     * PUT /api/keuangan/settlement/settings
     * Set default bank COA Lembaga aktif.
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $data = $request->validate([
            'default_bank_coa_id' => 'required|uuid|exists:coa,id',
        ]);

        $lembagaId = session('lembaga_id') ?? Lembaga::query()->orderBy('id')->value('id');
        if (! $lembagaId) {
            return response()->json(['message' => 'Lembaga tidak ditemukan.'], 404);
        }

        $lembaga = Lembaga::find($lembagaId);
        $lembaga->default_bank_coa_id = $data['default_bank_coa_id'];
        $lembaga->save();

        return response()->json(['message' => 'Pengaturan akun kas/bank default berhasil disimpan.']);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────

    /**
     * Rebuild jurnal akrual untuk dokumen yang sudah ada: pengakuan
     * pendapatan (invoice terbit), beban honor (ledger entry honor), dan
     * pembalik pendapatan untuk invoice superseded.
     *
     * Idempotent — dokumen yang sudah punya jurnal dilewati.
     *
     * @return array{created: int, skipped: int, errors: array<int, array>}
     */
    private function rebuildAkrual(): array
    {
        $created = 0;
        $skipped = 0;
        $errors = [];

        $invoiceList = Invoice::where('total_tagihan', '>', 0)
            ->where('status', '!=', Invoice::STATUS_SUPERSEDED)
            ->get();
        foreach ($invoiceList as $invoice) {
            if ($this->accrual->sudahAdaJurnalPendapatan($invoice)) {
                $skipped++;
                continue;
            }
            try {
                $jurnal = $this->accrual->recordPendapatanInvoice($invoice);
                if ($jurnal) {
                    $created++;
                } else {
                    $errors[] = ['invoice_id' => $invoice->id, 'error' => 'COA piutang usaha atau pendapatan tidak tersedia.'];
                }
            } catch (\Throwable $e) {
                $errors[] = ['invoice_id' => $invoice->id, 'error' => $e->getMessage()];
            }
        }

        $entryList = LedgerEntry::whereIn('tipe', [
            LedgerEntry::TIPE_AP_HONOR_SURVEIOR,
            LedgerEntry::TIPE_AP_HONOR_VERIFIKATOR,
            LedgerEntry::TIPE_AP_HONOR_REKOMENDATOR,
        ])->get();
        foreach ($entryList as $entry) {
            if ($this->accrual->sudahAdaJurnalBebanHonor($entry)) {
                $skipped++;
                continue;
            }
            try {
                $jurnal = $this->accrual->recordBebanHonor($entry);
                if ($jurnal) {
                    $created++;
                } else {
                    $errors[] = ['ledger_entry_id' => $entry->id, 'error' => 'COA beban honor atau utang honor tidak tersedia.'];
                }
            } catch (\Throwable $e) {
                $errors[] = ['ledger_entry_id' => $entry->id, 'error' => $e->getMessage()];
            }
        }

        $superseded = Invoice::where('status', Invoice::STATUS_SUPERSEDED)->get();
        foreach ($superseded as $invoice) {
            if (! $this->accrual->sudahAdaJurnalPendapatan($invoice)) {
                continue;
            }
            if ($this->accrual->sudahAdaJurnalPembalikPendapatan($invoice)) {
                $skipped++;
                continue;
            }
            try {
                $jurnal = $this->accrual->reversePendapatanInvoice($invoice);
                if ($jurnal) {
                    $created++;
                }
            } catch (\Throwable $e) {
                $errors[] = ['invoice_id' => $invoice->id, 'error' => $e->getMessage()];
            }
        }

        return ['created' => $created, 'skipped' => $skipped, 'errors' => $errors];
    }

    private function rebuildOne(string $refType, string $refId, ?string $userId): array
    {
        try {
            if ($this->svc->existingJurnal($refType, $refId)) {
                return ['success' => true, 'created' => false, 'ref_type' => $refType, 'ref_id' => $refId, 'skipped_reason' => 'sudah_punya_jurnal'];
            }

            switch ($refType) {
                case SettlementJournalService::REF_PIUTANG_SETTLEMENT:
                    $bukti = BuktiPembayaran::find($refId);
                    if (! $bukti || $bukti->status_verifikasi !== BuktiPembayaran::STATUS_DITERIMA) {
                        return ['success' => false, 'error' => 'Bukti tidak ditemukan atau belum diterima.', 'ref_type' => $refType, 'ref_id' => $refId];
                    }
                    $this->svc->recordArSettlement($bukti, null, $userId);
                    return ['success' => true, 'created' => true, 'ref_type' => $refType, 'ref_id' => $refId];

                case SettlementJournalService::REF_AP_HONOR_SETTLEMENT:
                    $p = PembayaranHonor::find($refId);
                    if (! $p || $p->status !== PembayaranHonor::STATUS_DISETUJUI) {
                        return ['success' => false, 'error' => 'Pembayaran tidak ditemukan atau belum disetujui.', 'ref_type' => $refType, 'ref_id' => $refId];
                    }
                    $this->svc->recordApHonorSettlement($p, null, $userId);
                    return ['success' => true, 'created' => true, 'ref_type' => $refType, 'ref_id' => $refId];

                case SettlementJournalService::REF_AP_PAJAK_SETTLEMENT:
                    $h = HutangPajak::find($refId);
                    if (! $h || $h->status !== HutangPajak::STATUS_DIBAYAR) {
                        return ['success' => false, 'error' => 'Hutang pajak tidak ditemukan atau belum dibayar.', 'ref_type' => $refType, 'ref_id' => $refId];
                    }
                    $this->svc->recordApPajakSettlement($h, null, $userId);
                    return ['success' => true, 'created' => true, 'ref_type' => $refType, 'ref_id' => $refId];

                default:
                    return ['success' => false, 'error' => 'ref_type tidak dikenal.', 'ref_type' => $refType, 'ref_id' => $refId];
            }
        } catch (\Throwable $e) {
            return ['success' => false, 'error' => $e->getMessage(), 'ref_type' => $refType, 'ref_id' => $refId];
        }
    }

    private function resolveSource(string $refType, string $refId): ?array
    {
        return match ($refType) {
            SettlementJournalService::REF_PIUTANG_SETTLEMENT => (function () use ($refId) {
                $b = BuktiPembayaran::with('invoice.siklus.faskes')->find($refId);
                return $b ? [
                    'type' => 'bukti_pembayaran',
                    'id' => $b->id,
                    'nominal' => (float) $b->nominal,
                    'tanggal' => $b->tanggal_verifikasi?->toDateString(),
                    'invoice_nomor' => $b->invoice?->nomor_invoice,
                    'faskes_nama' => $b->invoice?->siklus?->faskes?->nama,
                    'status_verifikasi' => $b->status_verifikasi,
                ] : null;
            })(),
            SettlementJournalService::REF_AP_HONOR_SETTLEMENT => (function () use ($refId) {
                $p = PembayaranHonor::find($refId);
                return $p ? [
                    'type' => 'pembayaran_honor',
                    'id' => $p->id,
                    'nomor_pembayaran' => $p->nomor_pembayaran,
                    'total_nominal' => (float) $p->total_nominal,
                    'tanggal_pembayaran' => $p->tanggal_pembayaran?->toDateString(),
                    'status' => $p->status,
                ] : null;
            })(),
            SettlementJournalService::REF_AP_PAJAK_SETTLEMENT => (function () use ($refId) {
                $h = HutangPajak::find($refId);
                return $h ? [
                    'type' => 'hutang_pajak',
                    'id' => $h->id,
                    'nama_wajib_pajak' => $h->nama_wajib_pajak,
                    'npwp' => $h->nomor_pokok_wajib_pajak,
                    'jumlah_pajak' => (float) $h->jumlah_pajak,
                    'tanggal_dibayar' => $h->tanggal_dibayar?->toDateString(),
                    'status' => $h->status,
                ] : null;
            })(),
            default => null,
        };
    }

    private function refTypeLabel(string $refType): string
    {
        return match ($refType) {
            SettlementJournalService::REF_PIUTANG_SETTLEMENT => 'Pelunasan Piutang (AR)',
            SettlementJournalService::REF_AP_HONOR_SETTLEMENT => 'Pelunasan Hutang Honor (AP)',
            SettlementJournalService::REF_AP_PAJAK_SETTLEMENT => 'Pelunasan Hutang Pajak (AP)',
            SettlementJournalService::REF_AP_HONOR_REVERSAL => 'Pembatalan Pelunasan Honor (AP)',
            default => $refType,
        };
    }

    private function presentJurnal(JurnalUmum $j): array
    {
        return [
            'id' => $j->id,
            'nomor' => $j->nomor,
            'tanggal' => $j->tanggal?->toDateString(),
            'ref_type' => $j->ref_type,
            'ref_type_label' => $this->refTypeLabel($j->ref_type),
            'ref_id' => $j->ref_id,
            'kategori' => $j->kategori ? ['nama' => $j->kategori->nama, 'jenis' => $j->kategori->jenis] : null,
            'keterangan' => $j->keterangan,
            'total_debit' => (float) $j->total_debit,
            'total_kredit' => (float) $j->total_kredit,
            'is_balanced' => $j->isBalanced(),
            'dibuat_oleh' => $j->pembuat?->nama ?? $j->dibuat_oleh,
            'details' => $j->details->map(fn ($d) => [
                'coa' => $d->coa ? [
                    'id' => $d->coa->id,
                    'kode' => $d->coa->kode,
                    'nama' => $d->coa->nama,
                ] : null,
                'debit' => (float) $d->debit,
                'kredit' => (float) $d->kredit,
                'keterangan' => $d->keterangan,
            ])->values(),
        ];
    }
}
