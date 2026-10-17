<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AkunPengguna;
use App\Models\BiayaPerJenisFaskes;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Pks;
use App\Models\SiklusAkreditasi;
use App\Services\AttachmentService;
use App\Services\AuditService;
use App\Services\Keuangan\LedgerService;
use App\Services\Pks\PksDocxGenerator;
use App\Services\Pks\PksPdfGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PksController extends Controller
{
    public function __construct(
        private PksPdfGenerator $pdfGen,
        private PksDocxGenerator $docxGen,
        private AuditService $audit,
        private LedgerService $ledger,
        private AttachmentService $attachment,
    ) {}

    public function show(Pks $pks): JsonResponse
    {
        $this->ensureSameLembaga($pks);
        $pks->load(['siklus.faskes', 'siklus.lembaga', 'invoice', 'dibuatOleh']);
        $pks->estimasi_tagihan = $this->hitungEstimasiTagihan($pks);
        $pks->estimasi_rincian = $this->getRincianBiaya($pks);
        return response()->json(['data' => $pks]);
    }

    /**
     * GET /api/kontrak/{pks}/estimasi-biaya
     * Rincian biaya dari master biaya per jenis faskes (untuk preview sebelum invoice diterbitkan).
     */
    public function estimasiBiaya(Pks $pks): JsonResponse
    {
        $this->ensureSameLembaga($pks);
        $pks->load(['siklus.faskes.jenisFaskes']);
        $items = $this->getRincianBiaya($pks);
        return response()->json([
            'data' => [
                'pks_id' => $pks->id,
                'nomor_pks' => $pks->nomor_pks,
                'faskes' => $pks->siklus?->faskes?->nama,
                'jenis_faskes' => $pks->siklus?->faskes?->jenisFaskes?->nama,
                'items' => $items,
                'total' => array_sum(array_column($items, 'jumlah')),
            ],
        ]);
    }

    /**
     * Ambil rincian biaya aktif untuk jenis faskes terkait.
     */
    private function getRincianBiaya(Pks $pks): array
    {
        $faskes = $pks->siklus?->faskes;
        if (! $faskes || ! $faskes->jenis_faskes_id) {
            return [];
        }
        return BiayaPerJenisFaskes::where('jenis_faskes_id', $faskes->jenis_faskes_id)
            ->where('status', 'aktif')
            ->orderBy('nama_biaya')
            ->get()
            ->map(fn ($b) => [
                'id' => $b->id,
                'nama_biaya' => $b->nama_biaya,
                'deskripsi' => $b->deskripsi,
                'jumlah' => (float) $b->jumlah,
                'satuan' => $b->satuan,
                'tipe' => $b->tipe,
                'wajib' => (bool) $b->wajib,
            ])
            ->all();
    }

    public function index(Request $request): JsonResponse
    {
        \Log::info('PksController.index start', [
            'user_id' => $request->user()?->id,
            'faskes_id' => $request->user()?->faskes_id,
            'params' => $request->all(),
        ]);

        $user = $request->user();
        $faskesId = $user->faskes_id;
        $query = Pks::with(['siklus.faskes.jenisFaskes', 'siklus.lembaga', 'invoice']);

        // Filter per lembaga aktif (dari session) agar tabel hanya menampilkan
        // PKS untuk siklus yang berada di lembaga yang sama dengan user login.
        if ($lembagaId = session('lembaga_id')) {
            $query->whereHas('siklus', fn ($q) => $q->where('lembaga_id', $lembagaId));
        }

        // Faskes hanya bisa lihat PKS miliknya
        if ($faskesId) {
            $query->whereHas('siklus', function ($q) use ($faskesId) {
                $q->where('faskes_id', $faskesId);
            });
        }

        if ($request->filled('status')) {
            $query->where('status', (string) $request->string('status'));
        }
        if ($request->filled('search')) {
            $s = (string) $request->string('search');
            $query->where(function ($q) use ($s) {
                $q->where('nomor_pks', 'like', '%'.$s.'%')
                  ->orWhereHas('siklus.faskes', function ($fq) use ($s) {
                      $fq->where('nama', 'like', '%'.$s.'%');
                  });
            });
        }

        $perPage = min((int) $request->integer('per_page', 15), 100);
        $items = $query->orderByDesc('created_at')->paginate($perPage);

        \Log::info('PksController.index query done', ['total' => $items->total(), 'count' => $items->count()]);

        $items->getCollection()->transform(function ($pks) {
            $invoice = $pks->invoice;
            $pks->invoice_count = $invoice ? 1 : 0;
            $pks->invoice_lunas_count = $invoice && $invoice->isLunas() ? 1 : 0;
            $pks->total_invoice = $invoice ? (float) $invoice->total_tagihan : 0;
            $pks->total_diterima = $invoice ? (float) $invoice->totalDiterima() : 0;
            // Estimasi tagihan dari master biaya (untuk draft PKS yang belum punya invoice)
            $pks->estimasi_tagihan = $this->hitungEstimasiTagihan($pks);
            return $pks;
        });

        return response()->json($items);
    }

    /**
     * Hitung estimasi tagihan dari master biaya per jenis faskes.
     * Dipakai untuk draft PKS yang belum punya invoice.
     */
    private function hitungEstimasiTagihan(Pks $pks): float
    {
        $faskes = $pks->siklus?->faskes;
        if (! $faskes || ! $faskes->jenis_faskes_id) {
            return 0.0;
        }
        return (float) BiayaPerJenisFaskes::where('jenis_faskes_id', $faskes->jenis_faskes_id)
            ->where('status', 'aktif')
            ->sum('jumlah');
    }

    public function bySiklus(SiklusAkreditasi $siklus): JsonResponse
    {
        $pks = $siklus->pks()->where('status', '!=', Pks::STATUS_DRAFT)->first();
        return response()->json(['data' => $pks ? [$pks] : []]);
    }

    /**
     * GET /api/kontrak/siklus-eligible
     * Daftar siklus yang eligible untuk dibuatkan PKS:
     *   - status_kelengkapan = 'lengkap' ATAU status = 'verifikasi'
     *   - dan belum memiliki PKS
     */
    public function eligibleSiklus(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = SiklusAkreditasi::with(['faskes.jenisFaskes', 'lembaga'])
            ->where(function ($q) {
                $q->where('status_kelengkapan', 'lengkap')
                  ->orWhere('status', 'verifikasi');
            })
            ->whereDoesntHave('pks')
            ->orderBy('tanggal_pengajuan', 'desc');

        if ($user->faskes_id) {
            $query->where('faskes_id', $user->faskes_id);
        }

        $items = $query->limit(50)->get();

        \Log::info('[eligibleSiklus]', [
            'user_id' => $user->id,
            'faskes_id' => $user->faskes_id,
            'role' => $user->role?->nama ?? $user->role,
            'count' => $items->count(),
            'ids' => $items->pluck('id')->toArray(),
        ]);

        return response()->json(['data' => $items]);
    }

    public function download(Pks $pks)
    {
        $this->ensureSameLembaga($pks);
        $pks->load(['siklus.faskes', 'siklus.lembaga']);

        // Prioritaskan lampiran PDF jika ada (file yang diupload admin)
        if ($pks->path_lampiran_pdf && $this->attachment->exists($pks->path_lampiran_pdf)) {
            return $this->attachment->response(
                $pks->path_lampiran_pdf,
                $pks->lampiran_nama_asli ?? ('Lampiran-PKS-' . ($pks->nomor_pks ?? $pks->id) . '.pdf')
            );
        }

        // Fallback ke template auto-generate
        if (! $pks->path_pdf || ! $this->attachment->exists($pks->path_pdf)) {
            $pks->path_pdf = $this->pdfGen->generate($pks);
            $pks->save();
        }
        return $this->attachment->response($pks->path_pdf, 'PKS-' . ($pks->nomor_pks ?? $pks->id) . '.pdf');
    }

    public function downloadDocx(Pks $pks)
    {
        $this->ensureSameLembaga($pks);
        $pks->load(['siklus.faskes', 'siklus.lembaga']);
        if (! $pks->path_docx || ! $this->attachment->exists($pks->path_docx)) {
            $pks->path_docx = $this->docxGen->generate($pks);
            $pks->save();
        }
        return $this->attachment->response(
            $pks->path_docx,
            'PKS-' . ($pks->nomor_pks ?? $pks->id) . '.docx'
        );
    }

    public function downloadSignedPdf(Pks $pks)
    {
        $this->ensureSameLembaga($pks);
        if (! $pks->path_signed_pdf || ! $this->attachment->exists($pks->path_signed_pdf)) {
            return response()->json(['message' => 'File signed PDF tidak ditemukan.'], 404);
        }
        return $this->attachment->response(
            $pks->path_signed_pdf,
            'PKS-Tertanda-' . str_replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|'], '-', $pks->nomor_pks ?? $pks->id) . '.pdf'
        );
    }

    /**
     * FR-2.1: Admin membuat draf PKS untuk siklus yang dokumennya lengkap.
     */
    public function createDraft(Request $request, SiklusAkreditasi $siklus): JsonResponse
    {
        $data = $request->validate([
            'nomor_pks' => 'nullable|string|max:50|unique:pks,nomor_pks',
            'konten_pks' => 'nullable|array',
        ]);

        if ($siklus->pks) {
            return response()->json([
                'message' => 'PKS untuk siklus ini sudah ada.',
                'data' => $siklus->pks,
            ], 409);
        }

        if ($siklus->status_kelengkapan !== 'lengkap') {
            return response()->json([
                'message' => 'Dokumen siklus belum tervalidasi lengkap. PKS belum dapat dibuat.',
            ], 422);
        }

        $user = $request->user();

        return DB::transaction(function () use ($siklus, $user, $data) {
            $nomorPks = ! empty($data['nomor_pks'])
                ? $data['nomor_pks']
                : 'PKS/' . now()->format('Y') . '/' . strtoupper(Str::random(8));

            $pks = Pks::create([
                'siklus_id' => $siklus->id,
                'dibuat_oleh' => $user->id,
                'nomor_pks' => $nomorPks,
                'status' => Pks::STATUS_DRAFT,
                'konten_pks' => $data['konten_pks'] ?? null,
            ]);

            $pks->path_pdf = $this->pdfGen->generate($pks);
            $pks->save();

            $siklus->forceFill(['tahapan' => 3, 'status' => 'menunggu_kontrak'])->save();

            $this->audit->log('pks.draft.created', 'pks', $pks->id, [
                'nomor_pks' => $pks->nomor_pks,
                'siklus_id' => $siklus->id,
            ]);

            return response()->json(['data' => $pks->fresh()], 201);
        });
    }

    public function updateNomorPks(Request $request, Pks $pks): JsonResponse
    {
        $this->ensureSameLembaga($pks);
        $data = $request->validate([
            'nomor_pks' => 'required|string|max:50|unique:pks,nomor_pks,' . $pks->id,
        ]);

        $before = $pks->nomor_pks;
        $pks->forceFill(['nomor_pks' => $data['nomor_pks']])->save();

        $this->audit->log('pks.nomor_pks.updated', 'pks', $pks->id, [
            'before' => $before,
            'after' => $data['nomor_pks'],
        ]);

        return response()->json(['data' => $pks->fresh()]);
    }

    /**
     * FR-2.1: Admin mengirim draf PKS ke faskes.
     *
     * Opsi 1 — tanpa file: kirim via template PKS yang sudah di-generate dari sistem.
     * Opsi 2 — dengan file upload: kirim via file lampiran PDF yang diupload admin.
     *
     * Request bisa multipart/form-data (jika ada lampiran_pdf) atau JSON biasa.
     */
    public function kirim(Request $request, Pks $pks): JsonResponse
    {
        $this->ensureSameLembaga($pks);
        if ($pks->status !== Pks::STATUS_DRAFT) {
            return response()->json(['message' => 'PKS sudah dikirim atau tidak dalam status draft.'], 422);
        }

        $data = $request->validate([
            'lampiran_pdf' => 'nullable|file|mimes:pdf|max:10240', // max 10MB
            'keterangan' => 'nullable|string|max:500',
        ]);

        $user = $request->user();

        $updates = [
            'status' => Pks::STATUS_DIKIRIM,
            'draf_dikirim_pada' => now(),
        ];

        // Jika admin upload file PKS manual
        if ($request->hasFile('lampiran_pdf')) {
            $file = $request->file('lampiran_pdf');
            $path = $this->attachment->store($file, 'pks');
            $updates['path_lampiran_pdf'] = $path;
            $updates['lampiran_nama_asli'] = $file->getClientOriginalName();

            $this->audit->log('pks.draft.sent', 'pks', $pks->id, [
                'mode' => 'lampiran_upload',
                'filename' => $file->getClientOriginalName(),
                'size' => $file->getSize(),
            ]);
        } else {
            $this->audit->log('pks.draft.sent', 'pks', $pks->id, [
                'mode' => 'template_pdf',
            ]);
        }

        $pks->update($updates);
        $pks->siklus->forceFill(['tahapan' => 3, 'status' => 'menunggu_kontrak'])->save();

        return response()->json(['data' => $pks->fresh()]);
    }

    /**
     * FR-2.1: Faskes upload PKS yang sudah ditandatangani & distempel secara manual.
     * Status berubah ke 'ditandatangani', menunggu validasi admin.
     */
    public function tandaTangan(Request $request, Pks $pks): JsonResponse
    {
        $this->ensureSameLembaga($pks);
        if ($pks->status !== Pks::STATUS_DIKIRIM) {
            return response()->json(['message' => 'PKS belum dikirim atau status tidak valid.'], 422);
        }

        $data = $request->validate([
            'signed_pdf' => 'required|file|mimes:pdf|max:10240', // max 10MB
            'nama_penandatangan' => 'required|string|max:255',
            'jabatan_penandatangan' => 'required|string|max:255',
            'nik_penandatangan' => 'nullable|string|max:32',
        ]);

        $user = $request->user();
        $signedPath = $this->attachment->store($request->file('signed_pdf'), 'pks_signed');

        return DB::transaction(function () use ($pks, $data, $signedPath, $user) {
            $pks->update([
                'status' => Pks::STATUS_DITANDATANGANI,
                'tanda_tangan_pada' => now(),
                'path_signed_pdf' => $signedPath,
                'signed_uploaded_at' => now(),
                'nama_penandatangan' => $data['nama_penandatangan'],
                'jabatan_penandatangan' => $data['jabatan_penandatangan'],
                'nik_penandatangan' => $data['nik_penandatangan'] ?? null,
                'tanggal_disetujui' => now()->toDateString(),
            ]);

            $this->audit->log('pks.signed_uploaded', 'pks', $pks->id, [
                'nama_penandatangan' => $data['nama_penandatangan'],
                'by_faskes_user' => $user->id,
            ]);

            return response()->json(['data' => $pks->fresh()]);
        });
    }

    /**
     * Admin memvalidasi PKS yang sudah diupload faskes.
     * Setelah validasi: status -> 'selesai', tahapan siklus -> 4 (pembayaran),
     * invoice otomatis diterbitkan.
     */
    public function validateSigned(Request $request, Pks $pks): JsonResponse
    {
        $this->ensureSameLembaga($pks);
        if ($pks->status !== Pks::STATUS_DITANDATANGANI) {
            return response()->json(['message' => 'PKS belum diupload atau sudah divalidasi.'], 422);
        }

        $user = $request->user();

        return DB::transaction(function () use ($pks, $user) {
            $pks->update([
                'status' => 'selesai',
                'admin_validated_at' => now(),
                'admin_validated_by' => $user->id,
            ]);

            $this->audit->log('pks.admin_validated', 'pks', $pks->id, [
                'validated_by' => $user->id,
            ]);

            // Update siklus: tahapan 4 + status menunggu_pembayaran
            $pks->siklus->forceFill(['tahapan' => 4, 'status' => 'menunggu_pembayaran'])->save();

            // Terbitkan invoice otomatis
            $invoice = $this->terbitkanInvoiceOtomatis($pks);

            return response()->json([
                'data' => $pks->fresh(['adminValidator']),
                'invoice' => $invoice,
            ]);
        });
    }

    /**
     * FR-5.5: Admin merevisi PKS yang sudah disetujui — biasanya karena
     * perubahan lingkup/biaya setelah Invoice terbit.
     *
     * Alur:
     *   1) PKS lama ditandai 'direvisi'.
     *   2) Invoice lama (jika ada) ditandai 'superseded' + Ledger Entry
     *      penyesuaian (nominal_neto = -tagihan, agar rekonsiliasi tidak
     *      dobel hitung).
     *   3) PKS baru dapat dibuat untuk siklus yang sama — Admin akan
     *      membuat draf PKS baru secara manual lewat endpoint createDraft.
     *
     * Idempotent: pemanggilan berulang tidak akan membuat adjustment
     * duplikat untuk invoice yang sama.
     */
    public function revisi(Request $request, Pks $pks): JsonResponse
    {
        $this->ensureSameLembaga($pks);
        if (! in_array($pks->status, [Pks::STATUS_DISETUJUI, 'selesai'], true)) {
            return response()->json([
                'message' => "PKS dalam status {$pks->status} belum dapat direvisi. Tunggu sampai disetujui.",
            ], 422);
        }

        $data = $request->validate([
            'alasan' => 'required|string|max:500',
        ]);

        $user = $request->user();
        $invoice = $pks->invoice;

        return DB::transaction(function () use ($pks, $data, $user, $invoice) {
            $pks->update(['status' => 'direvisi']);

            $adjustment = null;
            if ($invoice && $invoice->status !== Invoice::STATUS_SUPERSEDED) {
                $result = $this->ledger->tandaiInvoiceSuperseded(
                    invoice: $invoice,
                    alasan: $data['alasan'],
                    pksRevisiId: $pks->id,
                );
                $adjustment = $result['adjustment_entry'];
            }

            $this->audit->record('pks.revisi', null, $pks, 'Pks', $pks->id);

            return response()->json([
                'data' => $pks->fresh(),
                'invoice' => $invoice?->fresh(),
                'adjustment_entry' => $adjustment,
                'message' => 'PKS ditandai direvisi. Invoice terkait ditandai superseded. Buat PKS baru untuk siklus ini jika diperlukan.',
            ]);
        });
    }

    /**
     * FR-5.5: Admin membatalkan PKS yang sudah disetujui. Sama seperti
     * revisi tetapi tanpa niat membuat PKS baru (pembatalan total).
     */
    public function batalkan(Request $request, Pks $pks): JsonResponse
    {
        $this->ensureSameLembaga($pks);
        if (! in_array($pks->status, [Pks::STATUS_DISETUJUI, 'selesai'], true)) {
            return response()->json([
                'message' => "PKS dalam status {$pks->status} belum dapat dibatalkan.",
            ], 422);
        }

        $data = $request->validate([
            'alasan' => 'required|string|max:500',
        ]);

        $user = $request->user();
        $invoice = $pks->invoice;

        return DB::transaction(function () use ($pks, $data, $user, $invoice) {
            $pks->update(['status' => Pks::STATUS_EXPIRED]);

            $adjustment = null;
            if ($invoice && $invoice->status !== Invoice::STATUS_SUPERSEDED) {
                $result = $this->ledger->tandaiInvoiceSuperseded(
                    invoice: $invoice,
                    alasan: 'PKS dibatalkan: ' . $data['alasan'],
                    pksRevisiId: $pks->id,
                );
                $adjustment = $result['adjustment_entry'];
            }

            $this->audit->record('pks.batalkan', null, $pks, 'Pks', $pks->id);

            return response()->json([
                'data' => $pks->fresh(),
                'invoice' => $invoice?->fresh(),
                'adjustment_entry' => $adjustment,
            ]);
        });
    }

    /**
     * Admin menolak PKS yang sudah diupload faskes.
     * Status kembali ke 'dikirim' agar faskes bisa upload ulang.
     */
    public function tolakSigned(Request $request, Pks $pks): JsonResponse
    {
        $this->ensureSameLembaga($pks);
        if ($pks->status !== Pks::STATUS_DITANDATANGANI) {
            return response()->json(['message' => 'PKS tidak dalam status menunggu validasi.'], 422);
        }

        $data = $request->validate([
            'alasan' => 'required|string|max:500',
        ]);

        $user = $request->user();

        return DB::transaction(function () use ($pks, $data, $user) {
            $pks->update([
                'status' => Pks::STATUS_DIKIRIM,
                'admin_validated_at' => null,
                'admin_validated_by' => null,
                'path_signed_pdf' => null,
                'signed_uploaded_at' => null,
            ]);

            $this->audit->log('pks.admin_rejected', 'pks', $pks->id, [
                'alasan' => $data['alasan'],
                'by' => $user->id,
            ]);

            return response()->json(['data' => $pks->fresh()]);
        });
    }

    /**
     * FR-2.2: Invoice diterbitkan otomatis dengan due date setelah PKS disetujui.
     * Isi invoice dihitung dari master biaya per jenis faskes.
     */
    private function terbitkanInvoiceOtomatis(Pks $pks): Invoice
    {
        if ($pks->invoice) {
            return $pks->invoice;
        }

        $siklus = $pks->siklus;
        $existingInvoice = Invoice::where('siklus_id', $siklus->id)->first();
        if ($existingInvoice) {
            return $existingInvoice;
        }

        $nomorInvoice = 'INV/' . now()->format('Y') . '/' . strtoupper(Str::random(8));

        $invoice = Invoice::create([
            'pks_id' => $pks->id,
            'siklus_id' => $siklus->id,
            'nomor_invoice' => $nomorInvoice,
            'dibuat_oleh' => $pks->dibuat_oleh,
            'total_tagihan' => 0, // di-update setelah item dibuat
            'status' => Invoice::STATUS_BELUM_BAYAR,
            'diterbitkan_pada' => now(),
            'due_date' => now()->addDays(30)->toDateString(),
            'keterangan' => 'Invoice otomatis diterbitkan setelah PKS disetujui.',
        ]);

        // Ambil biaya dari master biaya per jenis faskes
        $faskes = $siklus->faskes;
        $biayaList = collect();
        if ($faskes && $faskes->jenis_faskes_id) {
            $biayaList = BiayaPerJenisFaskes::where('jenis_faskes_id', $faskes->jenis_faskes_id)
                ->where('status', 'aktif')
                -> orderBy('nama_biaya')
                ->get();
        }

        $totalTagihan = 0.0;
        foreach ($biayaList as $biaya) {
            InvoiceItem::create([
                'id' => Str::uuid(),
                'invoice_id' => $invoice->id,
                'biaya_id' => $biaya->id,
                'nama_biaya' => $biaya->nama_biaya,
                'deskripsi' => $biaya->deskripsi,
                'jumlah' => $biaya->jumlah,
                'satuan' => $biaya->satuan,
                'tipe' => $biaya->tipe,
                'wajib' => $biaya->wajib,
            ]);
            $totalTagihan += (float) $biaya->jumlah;
        }

        $invoice->update(['total_tagihan' => $totalTagihan]);

        $this->audit->log('invoice.issued', 'invoice', $invoice->id, [
            'nomor_invoice' => $nomorInvoice,
            'total' => $totalTagihan,
            'jenis_faskes_id' => $faskes?->jenis_faskes_id,
            'jumlah_item' => $biayaList->count(),
        ]);

        return $invoice;
    }

    /**
     * Guard lembaga: PKS hanya bisa diakses dari session lembaga yang sama
     * dengan lembaga siklus di bawahnya. Pengecekan ini melengkapi trait
     * BelongsToLembaga pada SiklusAkreditasi (yang tidak otomatis mencakup
     * PKS karena tabel pks tidak memiliki kolom lembaga_id).
     */
    private function ensureSameLembaga(Pks $pks): void
    {
        $sessionLembagaId = session('lembaga_id');
        if ($sessionLembagaId === null) {
            // Superadmin tanpa pilihan lembaga: skip filter
            return;
        }

        $siklusLembagaId = $pks->siklus?->lembaga_id
            ?? $pks->siklus()->value('lembaga_id');

        if ($siklusLembagaId !== $sessionLembagaId) {
            abort(response()->json(['message' => 'PKS tidak ditemukan.'], 404));
        }
    }
}
