<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AkunPengguna;
use App\Models\Laporan;
use App\Models\LaporanVerifikasi;
use App\Models\NotifikasiTagihan;
use App\Models\Penugasan;
use App\Models\SiklusAkreditasi;
use App\Models\SuratTugas;
use App\Models\VerifikasiItem;
use App\Services\AttachmentService;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * FR-4.1: Admin appoints Verifikator & issues Surat Tugas Verifikator.
 * Privilege: "Verifikasi"
 */
class AdminVerifikasiController extends Controller
{
    /**
     * GET /api/verifikasi/siklus/{siklus}
     * Overview semua verifikasi untuk satu siklus.
     */
    public function index(SiklusAkreditasi $siklus): JsonResponse
    {
        $verifikasi = LaporanVerifikasi::with(['laporan.penugasan.tenagaAhli'])
            ->whereHas('laporan', fn ($q) => $q->where('siklus_id', $siklus->id))
            ->get();

        return response()->json(['data' => $verifikasi]);
    }

    /**
     * POST /api/verifikasi/verifikator
     * FR-4.1: Tunjuk verifikator (dari antrian round-robin) + buat LaporanVerifikasi.
     * Setelah laporan survei diserahkan (submitted), admin menunjuk verifikator.
     */
    public function appointVerifikator(Request $request, AuditService $audit): JsonResponse
    {
        $data = $request->validate([
            'siklus_id' => 'required|uuid',
        ]);

        // findWithLembagaCheck() memberikan error 403 yang informatif jika
        // siklus ada di lembaga lain dari session user, bukan 404 generik.
        $siklus = SiklusAkreditasi::findWithLembagaCheck($data['siklus_id']);

        // Cek apakah sudah ada laporan survei untuk siklus ini
        $laporanSurvei = Laporan::whereHas('penugasan', function ($q) use ($siklus) {
            $q->where('siklus_id', $siklus->id)
              ->where('jenis', Penugasan::JENIS_SURVEI)
              ->where('status', Penugasan::STATUS_SELESAI);
        })->first();

        if (! $laporanSurvei) {
            return response()->json([
                'message' => 'Laporan survei belum tersedia. Penunjukan verifikator menunggu laporan survei selesai.',
            ], 422);
        }

        // Cek apakah verifikasi sudah ada
        $existing = LaporanVerifikasi::where('laporan_id', $laporanSurvei->id)->first();
        if ($existing) {
            return response()->json([
                'message' => 'Verifikasi sudah ditunjuk untuk siklus ini.',
                'data' => $existing->load(['laporan.penugasan.tenagaAhli', 'items']),
            ], 422);
        }

        // Ambil verifikator dari antrian round-robin (mirip FR-3.3)
        $verifikator = $this->getNextVerifikator($siklus);
        if (! $verifikator) {
            return response()->json([
                'message' => 'Tidak ada verifikator eligible di antrian.',
            ], 422);
        }

        // Buat penugasan verifikasi
        $penugasan = Penugasan::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'tenaga_ahli_id' => $verifikator->id,
            'jenis' => Penugasan::JENIS_VERIFIKASI,
            'status' => Penugasan::STATUS_MENUNGGU,
        ]);

        // Buat laporan verifikasi + simpan referensi penugasan verifikasi
        $lv = LaporanVerifikasi::create([
            'id' => (string) Str::uuid(),
            'laporan_id' => $laporanSurvei->id,
            'verifikasi_penugasan_id' => $penugasan->id,
            'status_final' => LaporanVerifikasi::STATUS_DRAFT,
        ]);

        // Update status siklus → verifikasi (tahapan 6)
        $siklus->forceFill([
            'status' => 'verifikasi',
            'tahapan' => 6,
        ])->save();

        $audit->record('verifikasi.appoint', null, $lv, 'LaporanVerifikasi', $lv->id);

        return response()->json([
            'data' => $lv->load(['laporan.penugasan.tenagaAhli', 'items']),
            'message' => "Verifikator {$verifikator->nama} ditunjuk.",
        ], 201);
    }

    /**
     * POST /api/verifikasi/surat-tugas
     * FR-4.1: Terbitkan Surat Tugas Verifikator (PDF).
     */
    public function issueSuratTugas(Request $request, AttachmentService $attachment, AuditService $audit): JsonResponse
    {
        $data = $request->validate([
            'laporan_verifikasi_id' => 'required|uuid|exists:laporan_verifikasi,id',
        ]);

        $lv = LaporanVerifikasi::with('laporan.penugasan.tenagaAhli')->findOrFail($data['laporan_verifikasi_id']);
        $penugasan = $lv->verifikasiPenugasan;
        $penugasan->load(['siklus.faskes', 'tenagaAhli']);

        $existing = SuratTugas::where('penugasan_id', $penugasan->id)->first();
        if ($existing) {
            return response()->json([
                'message' => 'Surat Tugas sudah pernah diterbitkan untuk penugasan verifikasi ini.',
            ], 422);
        }

        $nomorSurat = $this->generateNomorSurat();

        $pdf = \PDF::loadView('surat_tugas.verifikasi', [
            'nomorSurat' => $nomorSurat,
            'penugasan' => $penugasan,
        ]);

        $filename = "{$nomorSurat}.pdf";
        $path = $attachment->put($pdf->output(), 'surat_tugas_verifikasi', $filename);

        $surat = SuratTugas::create([
            'id' => (string) Str::uuid(),
            'penugasan_id' => $penugasan->id,
            'nomor_surat' => $nomorSurat,
            'path_pdf' => $path,
            'tanggal_terbit' => now(),
            'diterbitkan_oleh' => $request->user()->id,
        ]);

        $audit->record('verifikasi.surat_tugas', null, $surat, 'SuratTugas', $surat->id);

        return response()->json([
            'data' => $surat,
            'message' => 'Surat Tugas Verifikator berhasil diterbitkan.',
        ], 201);
    }

    /**
     * GET /api/verifikasi/elemen-standar
     * Daftar elemen penilaian standar (template). Ini adalah endpoint placeholder —
     * di implementasi nyata, elemen dimuat dari master data lembaga atau file konfigurasi.
     */
    public function elemenStandar(): JsonResponse
    {
        // Placeholder: 10 elemen penilaian dummy untuk demo
        $elemen = [
            ['kode' => 'EP-1.1', 'nama' => 'Pelayanan yang人为本'],
            ['kode' => 'EP-1.2', 'nama' => 'Identifikasi Pasien dengan Benar'],
            ['kode' => 'EP-2.1', 'nama' => 'Peningkatan Mutu dan Keselamatan Pasien'],
            ['kode' => 'EP-2.2', 'nama' => 'Tatalaksana Resiko'],
            ['kode' => 'EP-3.1', 'nama' => 'Akses dan Kontinuitas Pelaporan'],
            ['kode' => 'EP-3.2', 'nama' => 'Manajemen Rekam Medis'],
            ['kode' => 'EP-4.1', 'nama' => 'Pelatihan dan Kompetensi Staf'],
            ['kode' => 'EP-4.2', 'nama' => '卫生 Lingkungan'],
            ['kode' => 'EP-5.1', 'nama' => 'Kepatuhan terhadap Protocol Klinis'],
            ['kode' => 'EP-5.2', 'nama' => 'Manajemen Obat-alahan'],
        ];

        return response()->json(['data' => $elemen]);
    }

    /**
     * POST /api/verifikasi/items/init
     * Inisialisasi item verifikasi berdasarkan template elemen standar + nilai FA.
     * FR-4.2: Mempersiapkan workspace split-screen.
     */
    public function initItems(Request $request): JsonResponse
    {
        $data = $request->validate([
            'laporan_verifikasi_id' => 'required|uuid|exists:laporan_verifikasi,id',
            'items' => 'required|array|min:1',
            'items.*.kode_elemen' => 'required|string',
            'items.*.nama_elemen' => 'required|string',
            'items.*.nilai_default' => 'required|string',
        ]);

        $lv = LaporanVerifikasi::findOrFail($data['laporan_verifikasi_id']);

        if ($lv->isFinal()) {
            return response()->json(['message' => 'Verifikasi sudah final, tidak dapat diubah.'], 422);
        }

        // Hapus item lama jika ada (misalnya inisialisasi ulang)
        $lv->items()->delete();

        $created = [];
        foreach ($data['items'] as $item) {
            $v = VerifikasiItem::create([
                'id' => (string) Str::uuid(),
                'laporan_verifikasi_id' => $lv->id,
                'kode_elemen' => $item['kode_elemen'],
                'nama_elemen' => $item['nama_elemen'],
                'nilai_default' => $item['nilai_default'],
            ]);
            $created[] = $v;
        }

        return response()->json([
            'data' => $lv->fresh(['items']),
            'message' => 'Item verifikasi diinisialisasi.',
        ], 201);
    }

    /**
     * Ambil kandidat verifikator berikutnya dari antrian round-robin.
     */
    private function getNextVerifikator(SiklusAkreditasi $siklus): ?\App\Models\TenagaAhli
    {
        $kandidat = PenugasanController::getEligibleCandidatesFor(
            $siklus,
            \App\Models\HistoriAntrianPenugasan::PERAN_VERIFIKATOR
        );

        return $kandidat->first();
    }

    /**
     * Generate nomor surat urut untuk verifikasi.
     */
    private function generateNomorSurat(): string
    {
        $year = now()->year;
        $prefix = 'STV';
        $count = SuratTugas::where('nomor_surat', 'LIKE', "STV-{$year}-%")->count() + 1;

        return sprintf('%s-%d-%04d', $prefix, $year, $count);
    }
}
