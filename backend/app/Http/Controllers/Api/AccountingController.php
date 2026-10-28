<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Keuangan\AccountingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * AccountingController — REST API untuk modul Akuntansi / CA.
 *
 * Privilege: "Ledger/Keuangan"
 *   - Lihat: dashboard, coa list, jurnal list, buku besar
 *   - Tambah/Ubah: CRUD coa, kategori, jurnal umum
 *   - Hapus: hanya jurnal yang bukan dari transaksi sistem
 */
class AccountingController extends Controller
{
    public function __construct(private AccountingService $svc) {}

    // ─── Dashboard ────────────────────────────────────────────────────────

    public function dashboard(): JsonResponse
    {
        return response()->json(['data' => $this->svc->dashboard()]);
    }

    // ─── COA ─────────────────────────────────────────────────────────────

    public function coaIndex(Request $request): JsonResponse
    {
        $filters = array_filter([
            'jenis' => $request->string('jenis')->toString() ?: null,
            'q' => $request->string('q')->toString() ?: null,
        ], fn ($v) => $v !== null && $v !== '');

        return response()->json(['data' => $this->svc->listCoa($filters)]);
    }

    public function coaStore(Request $request): JsonResponse
    {
        $data = $request->validate([
            'kode' => [
                'required', 'string', 'max:20',
                // Kode akun unik per lembaga (bukan global).
                Rule::unique('coa', 'kode')->where(
                    fn ($q) => $q->where('lembaga_id', session('lembaga_id'))
                ),
            ],
            'nama' => 'required|string|max:200',
            'jenis' => 'required|in:aktiva_lancar,aktiva_tetap,kewajiban_lancar,kewajiban_jangka_panjang,modal,pendapatan,pendapatan_lain,beban,beban_lain',
            'kelompok' => 'required|in:debit,kredit,debit_kredit',
            'kategori_id' => 'nullable|uuid|exists:kategori_jurnal,id',
            'is_aktif' => 'boolean',
            'urutan' => 'integer',
            'deskripsi' => 'nullable|string',
        ]);

        $coa = $this->svc->createCoa($data);
        return response()->json(['data' => $coa], 201);
    }

    public function coaUpdate(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'kode' => [
                'sometimes', 'string', 'max:20',
                Rule::unique('coa', 'kode')
                    ->where(fn ($q) => $q->where('lembaga_id', session('lembaga_id')))
                    ->ignore($id),
            ],
            'nama' => 'sometimes|string|max:200',
            'jenis' => 'sometimes|in:aktiva_lancar,aktiva_tetap,kewajiban_lancar,kewajiban_jangka_panjang,modal,pendapatan,pendapatan_lain,beban,beban_lain',
            'kelompok' => 'sometimes|in:debit,kredit,debit_kredit',
            'kategori_id' => 'nullable|uuid|exists:kategori_jurnal,id',
            'is_aktif' => 'boolean',
            'urutan' => 'integer',
            'deskripsi' => 'nullable|string',
        ]);

        $coa = $this->svc->updateCoa($id, $data);
        if (! $coa) return response()->json(['message' => 'Akun tidak ditemukan.'], 404);
        return response()->json(['data' => $coa]);
    }

    public function coaDestroy(string $id): JsonResponse
    {
        try {
            $ok = $this->svc->deleteCoa($id);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
        if (! $ok) return response()->json(['message' => 'Akun tidak ditemukan.'], 404);
        return response()->json(['message' => 'Akun berhasil dihapus.']);
    }

    // ─── Kategori Jurnal ─────────────────────────────────────────────────

    public function kategoriIndex(): JsonResponse
    {
        return response()->json(['data' => $this->svc->listKategori()]);
    }

    public function kategoriStore(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nama' => 'required|string|max:100',
            'jenis' => 'required|in:pemasukan,pengeluaran,adjustment',
            'urutan' => 'integer',
            'is_aktif' => 'boolean',
        ]);

        return response()->json(['data' => $this->svc->createKategori($data)], 201);
    }

    public function kategoriUpdate(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'nama' => 'sometimes|string|max:100',
            'jenis' => 'sometimes|in:pemasukan,pengeluaran,adjustment',
            'urutan' => 'integer',
            'is_aktif' => 'boolean',
        ]);

        $k = $this->svc->updateKategori($id, $data);
        if (! $k) return response()->json(['message' => 'Kategori tidak ditemukan.'], 404);
        return response()->json(['data' => $k]);
    }

    public function kategoriDestroy(string $id): JsonResponse
    {
        try {
            $ok = $this->svc->deleteKategori($id);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
        if (! $ok) return response()->json(['message' => 'Kategori tidak ditemukan.'], 404);
        return response()->json(['message' => 'Kategori berhasil dihapus.']);
    }

    // ─── Jurnal Umum ─────────────────────────────────────────────────────

    public function jurnalIndex(Request $request): JsonResponse
    {
        $filters = array_filter([
            'kategori_id' => $request->string('kategori_id')->toString() ?: null,
            'tahun' => $request->integer('tahun') ?: null,
            'bulan' => $request->integer('bulan') ?: null,
            'tanggal_dari' => $request->string('tanggal_dari')->toString() ?: null,
            'tanggal_sampai' => $request->string('tanggal_sampai')->toString() ?: null,
            'q' => $request->string('q')->toString() ?: null,
        ], fn ($v) => $v !== null && $v !== '');

        return response()->json(['data' => $this->svc->listJurnal($filters)]);
    }

    public function jurnalShow(string $id): JsonResponse
    {
        $data = $this->svc->getJurnal($id);
        if (! $data) return response()->json(['message' => 'Jurnal tidak ditemukan.'], 404);
        return response()->json(['data' => $data]);
    }

    public function jurnalStore(Request $request): JsonResponse
    {
        $data = $request->validate([
            'details' => 'required|array|min:2',
            'details.*.coa_id' => 'required|uuid|exists:coa,id',
            'details.*.debit' => 'nullable|numeric|min:0',
            'details.*.kredit' => 'nullable|numeric|min:0',
            'details.*.keterangan' => 'nullable|string|max:200',
            'tanggal' => 'required|date',
            'kategori_id' => 'nullable|uuid|exists:kategori_jurnal,id',
            'keterangan' => 'required|string|max:500',
        ]);

        $userId = $request->user()?->id;
        if (! $userId) return response()->json(['message' => 'Tidak terautentikasi.'], 401);

        $result = $this->svc->createJurnal([
            'details' => $data['details'],
            'tanggal' => $data['tanggal'],
            'kategori_id' => $data['kategori_id'] ?? null,
            'keterangan' => $data['keterangan'],
            'userId' => $userId,
        ]);

        if (! $result['success']) return response()->json(['message' => $result['error']], 422);
        return response()->json(['data' => $result['jurnal']], 201);
    }

    /**
     * Auto-generate jurnal dari BKM / BKK / KKM / KKK.
     *
     * Multi-row: details[0..N][coa_id, nominal, keterangan]
     * Single-row: nominal + akun_counterpart (legacy)
     */
    public function autoJurnalStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'jenis'           => 'required|string|in:bkm,bkk,kkm,kkk',
            'tanggal'         => 'required|date',
            'akun_kas_bank'   => 'required_without:details|nullable|uuid|exists:coa,id',
            'nominal'         => 'nullable|numeric|min:1',
            'akun_counterpart'=> 'nullable|uuid|exists:coa,id',
            'keterangan'      => 'nullable|string|max:500',
            'ref'             => 'nullable|string|max:100',
        ]);

        $userId = $request->user()?->id ?? 'system';
        $data = [
            'jenis'      => $validated['jenis'],
            'tanggal'    => $validated['tanggal'],
            'keterangan' => trim(($validated['ref'] ?? '') . ' ' . ($validated['keterangan'] ?? '')),
            'userId'     => $userId,
        ];

        // Multi-row: details[] submitted — {coa_id, nominal, keterangan}
        if ($request->has('details')) {
            $rawDetails = $request->input('details', []);
            $details = [];
            $hasDetail = false;
            foreach ($rawDetails as $row) {
                if (empty($row['coa_id'])) continue;
                $nominal = isset($row['nominal']) ? (float) $row['nominal'] : 0;
                if ($nominal <= 0) continue;
                $details[] = [
                    'coa_id'    => $row['coa_id'],
                    'nominal'   => $nominal,
                    'keterangan' => $row['keterangan'] ?? null,
                ];
                $hasDetail = true;
            }
            if (! $hasDetail) {
                return response()->json(['message' => 'Minimal 1 baris detail dengan nominal.'], 422);
            }
            $data['akun_kas_bank'] = $validated['akun_kas_bank'];
            $data['details'] = $details;
        } else {
            // Single-row (legacy)
            $data['akun_kas_bank']   = $validated['akun_kas_bank'];
            $data['nominal']          = (float) ($validated['nominal'] ?? 0);
            $data['akun_counterpart'] = $validated['akun_counterpart'];
        }

        $result = $this->svc->autoGenerateJurnal($data);

        if (! $result['success']) {
            return response()->json(['message' => $result['error']], 422);
        }

        return response()->json([
            'message' => 'Jurnal berhasil digenerate.',
            'data'    => $result['jurnal'],
        ], 201);
    }

    public function jurnalDestroy(string $id): JsonResponse
    {
        $userId = request()->user()?->id;
        try {
            $ok = $this->svc->deleteJurnal($id, $userId ?? 'system');
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
        if (! $ok) return response()->json(['message' => 'Jurnal tidak ditemukan.'], 404);
        return response()->json(['message' => 'Jurnal berhasil dihapus.']);
    }

    // ─── Buku Besar ───────────────────────────────────────────────────────

    public function bukuBesar(Request $request): JsonResponse
    {
        $filters = array_filter([
            'coa_id' => $request->string('coa_id')->toString() ?: null,
            'tahun' => $request->integer('tahun') ?: null,
            'bulan' => $request->integer('bulan') ?: null,
        ], fn ($v) => $v !== null && $v !== '');

        return response()->json(['data' => $this->svc->bukuBesar($filters)]);
    }

    public function bukuBesarDetail(Request $request, string $coaId): JsonResponse
    {
        $filters = array_filter([
            'tahun' => $request->integer('tahun') ?: null,
            'bulan' => $request->integer('bulan') ?: null,
        ], fn ($v) => $v !== null && $v !== '');

        $data = $this->svc->bukuBesarDetail($coaId, $filters);
        if (! $data) return response()->json(['message' => 'Akun tidak ditemukan.'], 404);
        return response()->json(['data' => $data]);
    }
}
