<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PembayaranHonor;
use App\Services\Keuangan\ApHonorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * ApHonorController — REST API untuk Accounts Payable honor
 * Surveior/Verifikator (FR-5.2/5.3 + operasional AP).
 *
 * Privilege: "Ledger/Keuangan"
 *   - Lihat: dashboard, outstanding list, history
 *   - Tambah: buat draft pembayaran
 *   - Setujui: approve pembayaran
 *   - Ubah: cancel pembayaran
 */
class ApHonorController extends Controller
{
    public function __construct(private ApHonorService $service) {}

    /**
     * Parse filter periode (tahun & bulan) dari query string.
     *
     * PENTING: input type="month" di browser mengirim bulan ber-nol di
     * depan ("01".."09"). filter_var/FILTER_VALIDATE_INT menolak format itu
     * sehingga Request::integer('bulan') mengembalikan 0 — filter bulan
     * hilang diam-diam dan hasil jadi milik periode lain. Karena itu
     * nilainya dibaca lewat (int) cast, bukan integer().
     *
     * @return array{tahun: int|null, bulan: int|null}
     */
    private function parsePeriode(Request $request): array
    {
        $tahun = $request->query('tahun');
        $bulan = $request->query('bulan');

        return [
            'tahun' => ($tahun === null || $tahun === '') ? null : (int) $tahun,
            'bulan' => ($bulan === null || $bulan === '') ? null : (int) $bulan,
        ];
    }

    /**
     * GET /api/keuangan/ap-honor/dashboard
     * Snapshot: KPI, aging, top penerima.
     */
    public function dashboard(): JsonResponse
    {
        return response()->json(['data' => $this->service->dashboardSnapshot()]);
    }

    /**
     * GET /api/keuangan/ap-honor/outstanding
     * Daftar honor yang belum dibayar.
     * Query opsional: ?peran=surveior|verifikator|rekomendator, ?penerima_id=, ?siklus_id=,
     *                 ?tahun=YYYY&bulan=MM, ?q=
     */
    public function outstanding(Request $request): JsonResponse
    {
        $periode = $this->parsePeriode($request);

        $filters = array_filter([
            'peran' => $request->string('peran')->toString() ?: null,
            'penerima_id' => $request->string('penerima_id')->toString() ?: null,
            'siklus_id' => $request->string('siklus_id')->toString() ?: null,
            'tahun' => $periode['tahun'],
            'bulan' => $periode['bulan'],
            'q' => $request->string('q')->toString() ?: null,
        ], fn ($v) => $v !== null && $v !== '');

        $entries = $this->service->listOutstanding($filters);
        $perPenerima = $this->service->outstandingPerTenagaAhli($filters);

        return response()->json([
            'data' => [
                'ringkasan' => [
                    'jumlah_honor' => $entries->count(),
                    'jumlah_penerima' => $perPenerima->count(),
                    'total_neto' => round($entries->sum('nominal_neto'), 2),
                    'total_bruto' => round($entries->sum('nominal_bruto'), 2),
                    'total_potongan_ppn' => round($entries->sum('potongan_ppn'), 2),
                    'total_potongan_pph' => round($entries->sum('potongan_pph'), 2),
                ],
                'entries' => $entries,
                'per_penerima' => $perPenerima,
            ],
        ]);
    }

    /**
     * GET /api/keuangan/ap-honor/payments
     * Riwayat pembayaran (header) — filter status, tahun, bulan.
     */
    public function payments(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'nullable|string|in:draft,disetujui,dibatalkan',
            // 'numeric' (bukan 'integer'): input type="month" mengirim bulan
            // ber-nol di depan ("01".."09") yang GAGAL lolos aturan integer.
            'tahun' => 'nullable|numeric|min:2000|max:2100',
            'bulan' => 'nullable|numeric|min:1|max:12',
        ]);

        // Filter periode harus lengkap: tahun tanpa bulan (atau sebaliknya)
        // akan diam-diam mengabaikan filter, hasil riwayat menyesatkan.
        $tahun = isset($validated['tahun']) ? (int) $validated['tahun'] : null;
        $bulan = isset($validated['bulan']) ? (int) $validated['bulan'] : null;
        if (($tahun === null) !== ($bulan === null)) {
            return response()->json([
                'message' => 'Filter periode harus diisi lengkap (tahun dan bulan).',
                'errors' => ['tahun' => ['tahun dan bulan harus diisi bersama-sama.']],
            ], 422);
        }

        $filters = array_filter([
            'status' => $validated['status'] ?? null,
            'tahun' => $tahun,
            'bulan' => $bulan,
        ], fn ($v) => $v !== null && $v !== '');

        return response()->json(['data' => $this->service->listPayments($filters)]);
    }

    /**
     * GET /api/keuangan/ap-honor/payments/{id}
     * Detail satu pembayaran + line items.
     */
    public function showPayment(string $id): JsonResponse
    {
        $data = $this->service->getPayment($id);
        if (! $data) {
            return response()->json(['message' => 'Pembayaran tidak ditemukan.'], 404);
        }
        return response()->json(['data' => $data]);
    }

    /**
     * GET /api/keuangan/ap-honor/kas-keluar
     * Daftar pembayaran honor yang sudah dibayar beserta status jurnal
     * Bank Keluar-nya — antrean kas keluar yang belum diposting ke buku besar.
     *
     * Query opsional: ?tahun=YYYY&bulan=MM
     */
    public function kasKeluar(Request $request): JsonResponse
    {
        $periode = $this->parsePeriode($request);

        $filters = array_filter([
            'tahun' => $periode['tahun'],
            'bulan' => $periode['bulan'],
        ], fn ($v) => $v !== null && $v !== '');

        return response()->json(['data' => $this->service->listBankKeluar($filters)]);
    }

    /**
     * POST /api/keuangan/ap-honor/payments
     * Buat draft pembayaran.
     * Body: { ledger_entry_ids: [uuid, ...], tanggal_pembayaran, metode, bank_pengirim, ..., catatan }
     */
    public function createPayment(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ledger_entry_ids' => 'required|array|min:1',
            'ledger_entry_ids.*' => 'uuid',
            'tanggal_pembayaran' => 'nullable|date',
            'metode' => 'required|in:transfer_bank,tunai,lainnya',
            'bank_pengirim' => 'nullable|string|max:50',
            'nomor_rekening_tujuan' => 'nullable|string|max:50',
            'atas_nama' => 'nullable|string|max:150',
            'catatan' => 'nullable|string|max:1000',
            'bukti_transfer' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120',
        ]);

        $userId = $request->user()?->id;
        if (! $userId) {
            return response()->json(['message' => 'Tidak terautentikasi.'], 401);
        }

        $buktiFile = $request->file('bukti_transfer');
        $result = $this->service->createPayment(
            ledgerEntryIds: $data['ledger_entry_ids'],
            paymentMeta: $data,
            userId: $userId,
            buktiTransferFile: $buktiFile,
        );

        if (! $result['success']) {
            return response()->json(['message' => $result['error']], 422);
        }

        return response()->json(
            ['data' => $this->service->getPayment($result['pembayaran']->id)],
            201,
        );
    }

    /**
     * PATCH /api/keuangan/ap-honor/payments/{id}
     * Edit draft pembayaran (header: tanggal, metode, info bank, catatan).
     */
    public function updatePayment(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'tanggal_pembayaran' => 'required|date',
            'metode' => 'required|in:transfer_bank,tunai,lainnya',
            'bank_pengirim' => 'nullable|string|max:50',
            'nomor_rekening_tujuan' => 'nullable|string|max:50',
            'atas_nama' => 'nullable|string|max:150',
            'catatan' => 'nullable|string|max:1000',
        ]);

        $userId = $request->user()?->id;
        if (! $userId) {
            return response()->json(['message' => 'Tidak terautentikasi.'], 401);
        }

        $result = $this->service->updatePayment($id, $data, $userId);
        if (! $result['success']) {
            return response()->json(['message' => $result['error']], 422);
        }

        return response()->json(['data' => $this->service->getPayment($id)]);
    }

    /**
     * POST /api/keuangan/ap-honor/payments/{id}/approve
     * Setujui pembayaran → honor entry berubah ke status lunas.
     */
    public function approvePayment(Request $request, string $id): JsonResponse
    {
        $userId = $request->user()?->id;
        if (! $userId) {
            return response()->json(['message' => 'Tidak terautentikasi.'], 401);
        }

        $result = $this->service->approvePayment($id, $userId);
        if (! $result['success']) {
            return response()->json(['message' => $result['error']], 422);
        }
        return response()->json([
            'data' => $this->service->getPayment($id),
            'info' => $result['info'] ?? null,
        ]);
    }

    /**
     * POST /api/keuangan/ap-honor/payments/{id}/cancel
     * Body: { alasan }
     */
    public function cancelPayment(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'alasan' => 'required|string|min:3|max:500',
        ]);

        $userId = $request->user()?->id;
        if (! $userId) {
            return response()->json(['message' => 'Tidak terautentikasi.'], 401);
        }

        $result = $this->service->cancelPayment($id, $userId, $data['alasan']);
        if (! $result['success']) {
            return response()->json(['message' => $result['error']], 422);
        }
        return response()->json(['data' => $this->service->getPayment($id)]);
    }
}