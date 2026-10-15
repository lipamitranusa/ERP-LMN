<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditTrail;
use App\Models\KonfigurasiPajak;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * FR-5.7: Master data tarif PPN & PPh Pasal 21.
 *
 * Privilege: "Ledger/Keuangan" (Lihat, Tambah, Ubah)
 *
 * Tabel `konfigurasi_pajak` menyimpan snapshot tarif historis per
 * `berlaku_sejak`. Keuangan dapat menambah baris baru untuk mencerminkan
 * perubahan regulasi tanpa deploy ulang kode; {@see HonorCalculator}
 * akan otomatis mengambil tarif aktif pada tanggal transaksi.
 */
class KonfigurasiPajakController extends Controller
{
    public function __construct(private AuditService $audit) {}

    /**
     * GET /api/keuangan/konfigurasi-pajak
     * Daftar semua tarif (PPN & PPh21), bisa difilter per jenis.
     */
    public function index(Request $request): JsonResponse
    {
        $query = KonfigurasiPajak::query()->orderByDesc('berlaku_sejak')->orderByDesc('id');

        if ($jenis = $request->string('jenis_pajak')->toString()) {
            $query->where('jenis_pajak', $jenis);
        }

        return response()->json(['data' => $query->get()]);
    }

    /**
     * GET /api/keuangan/konfigurasi-pajak/aktif
     * Tarif aktif saat ini per jenis (snapshot untuk UI pembayaran).
     */
    public function aktif(Request $request): JsonResponse
    {
        $ppn = KonfigurasiPajak::activeRate(KonfigurasiPajak::JENIS_PPN);
        $pph = KonfigurasiPajak::activeRate(KonfigurasiPajak::JENIS_PPH21);

        return response()->json([
            'data' => [
                'ppn' => $ppn,
                'pph21' => $pph,
                'tanggal_snapshot' => now()->toDateString(),
            ],
        ]);
    }

    /**
     * POST /api/keuangan/konfigurasi-pajak
     * Tambah tarif baru (untuk perubahan regulasi/penyesuaian metode).
     * Field wajib: jenis_pajak, tarif_persen, berlaku_sejak.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'jenis_pajak' => 'required|in:ppn,pph21',
            'tarif_persen' => 'required|numeric|min:0|max:100',
            'berlaku_sejak' => 'required|date',
            'keterangan' => 'nullable|string|max:500',
        ]);

        $user = $request->user();

        $entry = DB::transaction(function () use ($data, $user) {
            $row = KonfigurasiPajak::create([
                'id' => (string) Str::uuid(),
                'jenis_pajak' => $data['jenis_pajak'],
                'tarif_persen' => $data['tarif_persen'],
                'berlaku_sejak' => $data['berlaku_sejak'],
                'keterangan' => $data['keterangan'] ?? null,
                'dibuat_oleh' => $user?->id,
            ]);

            $this->audit->log('konfigurasi_pajak.created', 'konfigurasi_pajak', $row->id, [
                'jenis_pajak' => $row->jenis_pajak,
                'tarif_persen' => (float) $row->tarif_persen,
                'berlaku_sejak' => $row->berlaku_sejak?->toDateString(),
            ]);

            return $row;
        });

        return response()->json(['data' => $entry], 201);
    }

    /**
     * GET /api/keuangan/konfigurasi-pajak/{id}
     */
    public function show(KonfigurasiPajak $konfigurasiPajak): JsonResponse
    {
        return response()->json(['data' => $konfigurasiPajak]);
    }

    /**
     * PUT /api/keuangan/konfigurasi-pajak/{id}
     * Koreksi administratif (mis. typo keterangan). Perubahan tarif hanya
     * dilakukan dengan menambah baris baru agar histori tetap utuh.
     */
    public function update(Request $request, KonfigurasiPajak $konfigurasiPajak): JsonResponse
    {
        $data = $request->validate([
            'keterangan' => 'nullable|string|max:500',
        ]);

        $before = $konfigurasiPajak->only(['keterangan']);
        $konfigurasiPajak->update($data);

        if ($before !== $konfigurasiPajak->only(['keterangan'])) {
            $this->audit->record(
                'konfigurasi_pajak.updated',
                null,
                $konfigurasiPajak,
                'KonfigurasiPajak',
                $konfigurasiPajak->id,
            );
        }

        return response()->json(['data' => $konfigurasiPajak]);
    }
}
