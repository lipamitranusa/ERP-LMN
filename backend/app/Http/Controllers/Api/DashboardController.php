<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Penugasan;
use App\Models\SiklusAkreditasi;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    private const CACHE_TTL = 60; // 1 menit — cukup untuk dashboard

    /**
     * GET /api/admin/dashboard
     */
    public function stats(Request $request): JsonResponse
    {
        $lembagaId = session('lembaga_id');
        // Cache key include lembaga_id agar tiap lembaga punya cache sendiri
        // dan data tidak bocor lintas lembaga.
        $cacheKey = 'dashboard:stats:' . ($lembagaId ?? 'all');

        $stats = Cache::remember($cacheKey, self::CACHE_TTL, function () use ($lembagaId) {
            // Subquery: penugasan verifikasi selesai, di-scope ke lembaga aktif
            $verifikasiSelesai = DB::table('penugasan')
                ->where('jenis', 'verifikasi')
                ->where('status', 'selesai');
            if ($lembagaId) {
                $verifikasiSelesai->whereIn('siklus_id', function ($q) use ($lembagaId) {
                    $q->select('id')->from('siklus_akreditasi')
                      ->where('lembaga_id', $lembagaId);
                });
            }
            $verifikasiSelesai = $verifikasiSelesai->select('siklus_id');

            $counts = DB::table('penugasan')
                ->selectRaw("
                    COUNT(DISTINCT siklus_id) as total_siklus,
                    COUNT(DISTINCT CASE
                        WHEN jenis = 'survei'
                        AND status IN ('sedang_bertugas', 'selesai')
                        AND siklus_id NOT IN (SELECT siklus_id FROM ({$verifikasiSelesai->toSql()}) as t)
                        THEN siklus_id
                    END) as aktif_sekarang,
                    COUNT(CASE WHEN jenis = 'verifikasi' AND status = 'selesai' THEN 1 END) as terverifikasi,
                    COUNT(CASE WHEN status = 'menunggu' THEN 1 END) as pending_review
                ")
                ->setBindings($verifikasiSelesai->getBindings());

            // Filter penugasan ke lembaga aktif via siklus_id IN (subquery)
            if ($lembagaId) {
                $counts->whereIn('siklus_id', function ($q) use ($lembagaId) {
                    $q->select('id')->from('siklus_akreditasi')
                      ->where('lembaga_id', $lembagaId);
                });
            }

            $counts = $counts->first();

            return [
                'total_siklus' => (int) ($counts->total_siklus ?? 0),
                'aktif_sekarang' => (int) ($counts->aktif_sekarang ?? 0),
                'terverifikasi' => (int) ($counts->terverifikasi ?? 0),
                'pending_review' => (int) ($counts->pending_review ?? 0),
            ];
        });

        // ✅ Eager load semua relasi sekaligus — 1 query, tidak N+1
        $penugasanAktif = Penugasan::with([
                'tenagaAhli',
                'siklus.faskes',
            ])
            ->where('jenis', Penugasan::JENIS_SURVEI)
            ->where('status', Penugasan::STATUS_SEDANG_BERTUGAS)
            ->when($lembagaId, function ($q) use ($lembagaId) {
                $q->whereHas('siklus', fn ($sq) => $sq->where('lembaga_id', $lembagaId));
            })
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

        $recentSiklus = SiklusAkreditasi::with('faskes:id,nama')
            ->when($lembagaId, fn ($q) => $q->where('lembaga_id', $lembagaId))
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
            'stats' => $stats,
            'penugasan_aktif' => $penugasanAktif,
            'recent_siklus' => $recentSiklus,
        ]);
    }
}
