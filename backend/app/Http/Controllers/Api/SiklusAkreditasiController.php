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
        $query = SiklusAkreditasi::with(['faskes', 'lembaga', 'dokumen', 'pks', 'invoice', 'suratTugas'])
            ->withCount('catatanRevisi');

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

        $perPage = min((int) $request->integer('per_page', 15), 50);
        $items = $query->orderBy('tanggal_pengajuan', 'desc')->paginate($perPage);

        // Tambahkan flag survei_selesai ke setiap siklus
        $items->getCollection()->transform(function ($siklus) {
            $siklus->survei_selesai = $this->cekSurveiSelesai($siklus->id);
            $siklus->invoice_belum_lunas = $siklus->invoice
                && ! in_array($siklus->invoice->status, ['lunas', 'dibayar'], true);
            return $siklus;
        });

        return response()->json($items);
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

        $siklus = SiklusAkreditasi::create([
            'id' => (string) Str::uuid(),
            'faskes_id' => $faskesId,
            'lembaga_id' => $data['lembaga_id'],
            'tanggal_pengajuan' => now()->toDateString(),
            'tanggal_permohonan_survei' => $data['tanggal_permohonan_survei'],
            'dfo_data' => $data['dfo_data'] ?? null,
            'status' => 'menunggu_dokumen',
            'status_kelengkapan' => 'menunggu',
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
}
