<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Penugasan;
use App\Models\SiklusAkreditasi;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * GET /api/admin/dashboard
     * Metric untuk dashboard admin.
     */
    public function stats(Request $request): JsonResponse
    {
        // Total Siklus = unik siklus yang punya penugasan
        $totalSiklus = Penugasan::distinct('siklus_id')->count('siklus_id');

        // Aktif Sekarang = unik siklus survei sedang_bertugas/selesai, belum punya verifikasi selesai
        $siklusSelesaiVerifikasi = Penugasan::where('jenis', Penugasan::JENIS_VERIFIKASI)
            ->where('status', Penugasan::STATUS_SELESAI)
            ->pluck('siklus_id');
        $aktifSekarang = Penugasan::where('jenis', Penugasan::JENIS_SURVEI)
            ->whereIn('status', [Penugasan::STATUS_SEDANG_BERTUGAS, Penugasan::STATUS_SELESAI])
            ->whereNotIn('siklus_id', $siklusSelesaiVerifikasi)
            ->distinct('siklus_id')->count('siklus_id');

        // Terverifikasi = penugasan verifikasi dengan status selesai
        $terverifikasi = Penugasan::where('jenis', Penugasan::JENIS_VERIFIKASI)
            ->where('status', Penugasan::STATUS_SELESAI)
            ->count();

        // Pending Review = penugasan dengan status menunggu
        $pendingReview = Penugasan::where('status', Penugasan::STATUS_MENUNGGU)->count();

        // Penugasan aktif untuk tabel (hanya status sedang_bertugas)
        $penugasanAktif = Penugasan::with(['tenagaAhli', 'siklus.faskes'])
            ->where('jenis', Penugasan::JENIS_SURVEI)
            ->where('status', Penugasan::STATUS_SEDANG_BERTUGAS)
            ->orderBy('tanggal_mulai_survei', 'desc')
            ->limit(10)
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'jenis' => $p->jenis,
                'status' => $p->status,
                'faskes' => $p->siklus?->faskes?->nama,
                'nama_tenaga_ahli' => $p->tenagaAhli?->nama,
                'tanggal_mulai_survei' => $p->tanggal_mulai_survei,
                'tanggal_selesai_survei' => $p->tanggal_selesai_survei,
                'tanggal_selesai' => $p->tanggal_selesai,
            ]);

        // Siklus terbaru (5 terakhir)
        $recentSiklus = SiklusAkreditasi::with('faskes')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get()
            ->map(fn ($s) => [
                'id' => $s->id,
                'faskes' => $s->faskes ? ['nama' => $s->faskes->nama] : null,
                'status' => $s->status,
                'tanggal_pengajuan' => $s->tanggal_pengajuan,
            ]);

        return response()->json([
            'stats' => [
                'total_siklus' => $totalSiklus,
                'aktif_sekarang' => $aktifSekarang,
                'terverifikasi' => $terverifikasi,
                'pending_review' => $pendingReview,
            ],
            'penugasan_aktif' => $penugasanAktif,
            'recent_siklus' => $recentSiklus,
        ]);
    }
}
