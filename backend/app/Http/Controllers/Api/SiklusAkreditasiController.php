<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lembaga;
use App\Models\Penugasan;
use App\Models\SiklusAkreditasi;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * FR-1.1: Form permohonan penilaian oleh Faskes (DFO, tanggal, pilih lembaga).
 * Privilege check: Pendaftaran & Validasi Dokumen
 */
class SiklusAkreditasiController extends Controller
{
    /**
     * GET /api/pendaftaran/siklus
     * Faskes melihat permohonan miliknya; Admin melihat semua.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        // Eager load invoice + identitas Lembaga — N+1 sebelumnya: tiap siklus
        // trigger lazy load invoice + 1 query cekSurveiSelesai. Untuk 15
        // baris × ~100ms latency Supabase = ~3s, ini sumber utama "loading
        // lambat" yang dirasakan Faskes.
        $query = SiklusAkreditasi::with([
            'faskes:id,nama',
            'lembaga:id,nama',
            'invoice:id,siklus_id,status,total_tagihan,tanggal_lunas',
        ])->withCount('catatanRevisi');

        if ($request->filled('q')) {
            $term = $request->string('q')->toString();
            $query->where(fn ($q) => $q->whereHas('faskes', fn ($fq) => $fq->where('nama', 'like', '%' . $term . '%'))
                ->orWhere('status', 'like', '%' . $term . '%'));
        }

        // Faskes hanya bisa lihat miliknya
        if ($user->faskes_id) {
            $query->where('faskes_id', $user->faskes_id);
        }

        if ($request->filled('faskes_id') && $user->role->nama_role === 'Admin Lembaga') {
            $query->where('faskes_id', $request->string('faskes_id'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('status_kelengkapan')) {
            $query->where('status_kelengkapan', $request->string('status_kelengkapan'));
        }

        // Filter riwayat / aktif untuk portal faskes:
        //  riwayat → siklus yang sudah masuk histori (tuntas + pembayaran lunas)
        //  aktif   → siklus yang masih berjalan (belum masuk histori)
        if ($request->boolean('riwayat')) {
            // Histori perlu menampilkan dokumen yang diunggah pada tiap
            // pengajuan, jadi relasinya ikut di-eager-load (bukan N+1).
            $query->selesaiLengkap()->with([
                'dokumen:id,siklus_id,jenis_dokumen,versi,nama_file_asli,ukuran_file,mime_type,diunggah_oleh,tanggal_unduh',
                'dokumen.uploader:id,nama',
            ]);
        } elseif ($request->boolean('aktif')) {
            $query->belumSelesaiLengkap();
        }

        $perPage = min((int) $request->integer('per_page', 15), 50);
        $items = $query->orderBy('tanggal_pengajuan', 'desc')->paginate($perPage);

        // Batch cekSurveiSelesai — 1 query untuk semua siklus di page,
        // bukan 1 query per siklus. Ambil daftar siklus_id yang punya
        // laporan_pengerjaan jenis survei, lalu set flag in-memory.
        $siklusIds = $items->getCollection()->pluck('id')->all();
        $selesaiIds = $this->batchCekSurveiSelesai($siklusIds);

        $items->getCollection()->transform(function ($siklus) use ($selesaiIds) {
            $siklus->survei_selesai = in_array($siklus->id, $selesaiIds, true);
            $siklus->selesai_lengkap = $siklus->isSelesaiLengkap();
            $siklus->invoice_belum_lunas = $siklus->invoice
                && ! in_array($siklus->invoice->status, ['lunas', 'dibayar'], true);
            $siklus->status = $this->statusTerlihat($siklus);
            return $siklus;
        });

        return response()->json($items);
    }

    /**
     * Status yang ditampilkan ke user.
     *
     * Siklus yang masih berstatus 'menunggu_pembayaran' tapi invoice-nya
     * sudah lunas (data lama / siklus yang sudah lanjut tahap) menampilkan
     * status pembayaran invoice, bukan "Menunggu Pembayaran" yang basi.
     */
    private function statusTerlihat(SiklusAkreditasi $siklus): string
    {
        if ($siklus->status !== 'menunggu_pembayaran' || ! $siklus->invoice) {
            return $siklus->status;
        }

        $statusInvoice = $siklus->invoice->status;
        if (in_array($statusInvoice, ['lunas', 'dibayar', 'sebagian', 'refunded', 'superseded'], true)) {
            return $statusInvoice;
        }

        return $siklus->status;
    }

    /**
     * POST /api/pendaftaran/siklus
     * Faskes membuat permohonan baru.
     */
    public function store(Request $request, AuditService $audit): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'faskes_id' => 'nullable|uuid|exists:faskes,id',
            'lembaga_id' => 'required|uuid|exists:lembaga,id',
            'tanggal_permohonan_survei' => 'required|date|after_or_equal:today',
            'dfo_data' => 'nullable|array',
            'dfo_data.nama_penganggung_jawab' => 'nullable|string|max:255',
            'dfo_data.jabatan' => 'nullable|string|max:255',
            'dfo_data.kontak' => 'nullable|string|max:100',
            'dfo_data.tipe_faskes' => 'nullable|string|max:100',
            'dfo_data.jumlah_tempat_tidur' => 'nullable|integer|min:0',
            'dfo_data.jenis_layanan' => 'nullable|string|max:255',
        ]);

        // Faskes tidak boleh membuat permohonan untuk faskes lain
        $faskesId = $user->faskes_id ?? ($data['faskes_id'] ?? null);

        if (! $faskesId) {
            abort(response()->json(['message' => 'faskes_id wajib diisi untuk akun non-Faskes.'], 422));
        }

        // Satu faskes hanya boleh punya satu pengajuan yang masih berjalan.
        // Pengajuan yang sudah masuk histori (tuntas + pembayaran lunas) tidak
        // dihitung, sehingga faskes dapat mengajukan akreditasi kembali.
        if ($user->faskes_id) {
            $siklusAktif = SiklusAkreditasi::where('faskes_id', $faskesId)
                ->belumSelesaiLengkap()
                ->exists();

            if ($siklusAktif) {
                abort(response()->json([
                    'message' => 'Anda masih memiliki pengajuan akreditasi yang sedang berjalan. Selesaikan proses saat ini sebelum mengajukan yang baru.',
                ], 422));
            }
        }

        $siklus = SiklusAkreditasi::create([
            'id' => (string) Str::uuid(),
            'faskes_id' => $faskesId,
            'lembaga_id' => $data['lembaga_id'],
            'tanggal_pengajuan' => now()->toDateString(),
            'tanggal_permohonan_survei' => $data['tanggal_permohonan_survei'],
            'dfo_data' => $data['dfo_data'] ?? null,
            'status' => 'menunggu_dokumen',
            'status_kelengkapan' => 'menunggu',
            // Tahapan selalu diisi sejak dibuat. Kalau NULL, accessor
            // getTahapanAttribute() akan mencoba membaca relasi `pks` saat
            // serialisasi → lazy loading violation → HTTP 500.
            'tahapan' => 1,
            'created_at' => now(),
        ]);

        $audit->record('siklus.create', null, $siklus, 'SiklusAkreditasi', $siklus->id);

        $siklus->load(['faskes', 'lembaga']);

        return response()->json(['data' => $siklus], 201);
    }

    /**
     * GET /api/pendaftaran/siklus/{id}
     */
    public function show(Request $request, SiklusAkreditasi $siklus): JsonResponse
    {
        $user = $request->user();
        $user->load('faskes');

        // Faskes hanya bisa lihat permohonan miliknya
        if ($user->faskes_id && $user->faskes_id !== $siklus->faskes_id) {
            abort(response()->json(['message' => 'Tidak diizinkan.'], 403));
        }

        $siklus->load([
            'faskes.jenisFaskes',
            'lembaga',
            'dokumen' => fn ($q) => $q->orderBy('jenis_dokumen')->orderBy('versi', 'desc'),
            'checklist.validator',
            'catatanRevisi.creator',
            'validator',
            'invoice',
        ]);

        // Normalize dokumen fields for frontend compatibility
        $siklus->setRelation('dokumen', $siklus->dokumen->map(function ($d) {
            $d->created_at = $d->tanggal_unduh;
            $d->file_url = $d->id ? url("/api/pendaftaran/dokumen/{$d->id}/serve") : null;
            return $d;
        }));

        $siklus->survei_selesai = $this->cekSurveiSelesai($siklus->id);
        $siklus->invoice_belum_lunas = $siklus->invoice
            && ! in_array($siklus->invoice->status, ['lunas', 'dibayar'], true);
        $siklus->status = $this->statusTerlihat($siklus);

        return response()->json(['data' => $siklus]);
    }

    /**
     * PUT /api/pendaftaran/siklus/{id}
     * Faskes bisa update data DFO; Admin tidak bisa mengubah permohonan Faskes.
     */
    public function update(Request $request, SiklusAkreditasi $siklus, AuditService $audit): JsonResponse
    {
        $user = $request->user();
        $before = $siklus->replicate();

        // Only faskes can update their own siklus; only DFO data
        if ($user->faskes_id && $user->faskes_id !== $siklus->faskes_id) {
            abort(response()->json(['message' => 'Tidak diizinkan.'], 403));
        }

        $data = $request->validate([
            'tanggal_permohonan_survei' => 'sometimes|date',
            'dfo_data' => 'sometimes|array',
            'dfo_data.nama_penganggung_jawab' => 'nullable|string|max:255',
            'dfo_data.jabatan' => 'nullable|string|max:255',
            'dfo_data.kontak' => 'nullable|string|max:100',
            'dfo_data.tipe_faskes' => 'nullable|string|max:100',
            'dfo_data.jumlah_tempat_tidur' => 'nullable|integer|min:0',
            'dfo_data.jenis_layanan' => 'nullable|string|max:255',
        ]);

        $siklus->forceFill([
            'tanggal_permohonan_survei' => $data['tanggal_permohonan_survei'] ?? $siklus->tanggal_permohonan_survei,
            'dfo_data' => $data['dfo_data'] ?? $siklus->dfo_data,
        ])->save();

        $audit->record('siklus.update', $before, $siklus->fresh(), 'SiklusAkreditasi', $siklus->id);

        return response()->json(['data' => $siklus->fresh()->load(['faskes', 'lembaga'])]);
    }

    /**
     * DELETE /api/pendaftaran/siklus/{id}
     * Hanya Admin Lembaga atau Faskes yang belum memiliki dokumen.
     */
    public function destroy(SiklusAkreditasi $siklus, AuditService $audit): JsonResponse
    {
        if ($siklus->dokumen()->exists()) {
            abort(response()->json(['message' => 'Tidak dapat menghapus siklus yang sudah memiliki dokumen diunggah.'], 422));
        }

        $user = request()->user();
        if ($user->faskes_id && $user->faskes_id !== $siklus->faskes_id) {
            abort(response()->json(['message' => 'Tidak diizinkan.'], 403));
        }

        $before = $siklus->replicate();
        $siklus->delete();
        $audit->record('siklus.delete', $before, null, 'SiklusAkreditasi', $before->id);

        return response()->json(['message' => 'Siklus akreditasi dihapus.']);
    }

    /**
     * GET /api/pendaftaran/lembaga
     * Daftar lembaga untuk dropdown.
     */
    public function lembaga(): JsonResponse
    {
        $list = Lembaga::where('status', 'aktif')
            ->orderBy('nama')
            ->get(['id', 'nama', 'alamat', 'kota', 'telepon', 'email', 'website']);

        return response()->json(['data' => $list]);
    }

    /**
     * GET /api/admin/siklus
     * Siklus eligible untuk dropdown penugasan: tahapan >= 3 (Kontrak/Survei).
     * Mengembalikan siklus yang belum memiliki penugasan aktif, plus siklus aktif survei/verifikasi.
     * Response sudah termasuk field flat `faskes_nama` dan `lembaga_nama` agar frontend tidak
     * perlu bergantung pada relasi eager-load (lebih robust untuk dropdown).
     */
    public function forPenugasan(Request $request): JsonResponse
    {
        $jenis = $request->string('jenis')->toString();

        $query = Penugasan::whereIn('status', [
            Penugasan::STATUS_MENUNGGU,
            Penugasan::STATUS_SEDANG_BERTUGAS,
            Penugasan::STATUS_SELESAI,
        ]);

        // Jika jenis diisi: kecualikan siklus yang sudah punya penugasan (aktif/selesai) untuk jenis tsb
        // Jika jenis kosong: kecualikan semua jenis (untuk listing umum)
        if (in_array($jenis, [Penugasan::JENIS_SURVEI, Penugasan::JENIS_VERIFIKASI], true)) {
            $siklusDenganPenugasanAktif = $query->where('jenis', $jenis)->pluck('siklus_id');
        } else {
            $siklusDenganPenugasanAktif = $query->pluck('siklus_id');
        }

        $items = SiklusAkreditasi::with([
            'faskes' => fn($q) => $q->withoutGlobalScope('lembaga'),
            'faskes.jenisFaskes' => fn($q) => $q->withoutGlobalScope('lembaga'),
            'lembaga:id,nama',
        ])
            ->whereHas('faskes', fn($q) => $q->withoutGlobalScope('lembaga'))
            ->whereNotIn('id', $siklusDenganPenugasanAktif)
            ->where(function ($q) {
                $q->where('tahapan', '>=', 3)
                  ->orWhereIn('status', ['menunggu_kontrak', 'menunggu_pembayaran', 'aktif', 'survei', 'verifikasi']);
            })
            ->orderBy('tanggal_pengajuan', 'desc')
            ->limit(100)
            ->get()
            ->map(function ($s) {
                $s->faskes_nama = $s->faskes?->nama;
                $s->jenis_faskes = $s->faskes?->jenisFaskes?->nama;
                $s->lembaga_nama = $s->lembaga?->nama;
                return $s;
            });

        return response()->json(['data' => $items]);
    }

    /**
     * Cek apakah survei dianggap selesai:
     * True jika sudah ada minimal 1 laporan_pengerjaan untuk siklus ini (dari surveyor manapun).
     */
    private function cekSurveiSelesai(string $siklusId): bool
    {
        return \App\Models\LaporanPengerjaan::whereHas('penugasan', function ($q) use ($siklusId) {
            $q->where('siklus_id', $siklusId)
              ->where('jenis', Penugasan::JENIS_SURVEI);
        })->exists();
    }

    /**
     * Batch version: cekSurveiSelesai untuk banyak siklus sekaligus.
     * Mengembalikan array id siklus yang survei-nya sudah selesai.
     * 1 query saja, bukan 1 query per siklus (menghemat ~14 query di
     * halaman paginated 15 baris).
     */
    private function batchCekSurveiSelesai(array $siklusIds): array
    {
        if (empty($siklusIds)) {
            return [];
        }
        return \App\Models\LaporanPengerjaan::query()
            ->whereHas('penugasan', function ($q) use ($siklusIds) {
                $q->whereIn('siklus_id', $siklusIds)
                  ->where('jenis', Penugasan::JENIS_SURVEI);
            })
            // Kolom id wajib ikut dipilih: relasi penugasan adalah BelongsTo
            // yang dicocokkan via primary key, jadi tanpa id relasinya tidak
            // ter-resolve dan pluck('penugasan.siklus_id') mengembalikan null.
            ->with('penugasan:id,siklus_id')
            ->get()
            ->pluck('penugasan.siklus_id')
            ->filter()
            ->unique()
            ->values()
            ->all();
    }
}
