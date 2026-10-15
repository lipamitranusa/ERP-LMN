<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AkunPengguna;
use App\Models\HistoriAntrianPenugasan;
use App\Models\KonfigurasiPenugasan;
use App\Models\LaporanPengerjaan;
use App\Models\Penugasan;
use App\Models\SiklusAkreditasi;
use App\Models\TenagaAhli;
use App\Services\AttachmentService;
use App\Services\AuditService;
use App\Services\Keuangan\LedgerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * FR-3.3, FR-3.4, FR-3.5, FR-3.7, FR-3.8: Manajemen penugasan & antrian round-robin.
 * Privilege: Penugasan
 */
class PenugasanController extends Controller
{
    /**
     * GET /api/penugasan
     * Daftar semua penugasan (untuk halaman admin).
     * Default: sembunyikan status=dibatalkan & digantikan. Set ?include_inactive=1 untuk menampilkan.
     */
    public function listAll(Request $request): JsonResponse
    {
        $query = Penugasan::with(['tenagaAhli', 'siklus.faskes', 'suratTugas']);

        // Rekomendator tidak lagi memakai baris penugasan — direkomendator
        // dikonfigurasi global via konfigurasi_penugasan.default_rekomendator_user_id.
        $query->where('jenis', '!=', Penugasan::JENIS_REKOMENDASI);

        if ($request->filled('jenis')) {
            $query->where('jenis', $request->string('jenis'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('siklus_id')) {
            $query->where('siklus_id', $request->string('siklus_id'));
        }

        // Filter inactive (auto-replaced / digantikan) — sembunyikan by default
        $includeInactive = $request->string('include_inactive')->toString() === '1';
        if (! $includeInactive) {
            $query->whereNotIn('status', [Penugasan::STATUS_DIBATALKAN, Penugasan::STATUS_DIGANTIKAN]);
        }

        $list = $query
            ->orderBy('id', 'desc')
            ->limit(200)
            ->get();

        return response()->json(['data' => $list]);
    }

    /**
     * GET /api/penugasan/siklus/active
     * Daftar penugasan dengan status aktif (menunggu / sedang_bertugas).
     * Dipakai oleh Dashboard Admin untuk menampilkan "Penugasan Aktif".
     */
    public function siklusActive(Request $request): JsonResponse
    {
        $activeStatuses = [Penugasan::STATUS_MENUNGGU, Penugasan::STATUS_SEDANG_BERTUGAS];

        $list = Penugasan::with(['tenagaAhli', 'siklus.faskes'])
            ->whereIn('status', $activeStatuses)
            ->orderBy('updated_at', 'desc')
            ->limit(20)
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'jenis' => $p->jenis,
                'status' => $p->status,
                'tenaga_ahli' => $p->tenagaAhli ? ['nama' => $p->tenagaAhli->nama] : null,
            ]);

        return response()->json($list->all());
    }

    /**
     * GET /api/penugasan/{siklusId}/histori
     * History pergantian surveyor/verifikator untuk siklus tertentu (chronological).
     */
    public function histori(string $siklusId, Request $request): JsonResponse
    {
        $jenis = $request->string('jenis')->toString();
        $query = \App\Models\HistoriPergantianPenugasan::with([
            'tenagaAhliLama:id,nama,nomor_induk_surveior,jenis',
            'tenagaAhliBaru:id,nama,nomor_induk_surveior,jenis',
            'admin:id,nama',
        ])
            ->where('siklus_id', $siklusId)
            ->orderBy('created_at', 'desc');

        if ($jenis !== '') {
            $query->where('jenis', $jenis);
        }

        return response()->json(['data' => $query->limit(100)->get()]);
    }

    /**
     * POST /api/penugasan/{penugasan}/replace
     * Admin mengganti surveyor/verifikator tertentu dengan yang lain.
     * TA pengganti harus: peran sama, jenis sama (TKPP→TKPP atau TKSDU→TKSDU), tidak sedang bertugas.
     */
    public function replace(Request $request, Penugasan $penugasan, AuditService $audit): JsonResponse
    {
        if (! in_array($penugasan->status, [
            Penugasan::STATUS_MENUNGGU,
            Penugasan::STATUS_SEDANG_BERTUGAS,
            Penugasan::STATUS_DITOLAK,
        ], true)) {
            return response()->json([
                'message' => 'Hanya penugasan aktif (menunggu/sedang bertugas/ditolak) yang dapat diganti.',
            ], 422);
        }

        $data = $request->validate([
            'tenaga_ahli_baru_id' => 'required|uuid|exists:tenaga_ahli,id',
            'alasan' => 'nullable|string|max:500',
        ]);

        $siklus = $penugasan->siklus;
        $taLama = $penugasan->tenagaAhli;
        $peran = $penugasan->jenis === Penugasan::JENIS_SURVEI
            ? TenagaAhli::PERAN_SURVEIOR
            : TenagaAhli::PERAN_VERIFIKATOR;

        $taBaru = TenagaAhli::findOrFail($data['tenaga_ahli_baru_id']);

        // Validasi peran
        if (! in_array($taBaru->peran, [$peran, TenagaAhli::PERAN_KEDUA], true)) {
            return response()->json([
                'message' => "Tenaga ahli baru bukan {$peran}.",
            ], 422);
        }

        // Validasi jenis sama (TKPP→TKPP, TKSDU→TKSDU)
        if ($penugasan->jenis === Penugasan::JENIS_SURVEI
            && $taLama->jenis !== $taBaru->jenis) {
            return response()->json([
                'message' => "Tenaga ahli pengganti harus berjenis sama ({$taLama->jenis}).",
            ], 422);
        }

        // Validasi: TA baru tidak sedang bertugas
        if ($taBaru->status_penugasan_saat_ini === TenagaAhli::STATUS_SEDANG_BERTUGAS) {
            return response()->json([
                'message' => "Tenaga ahli {$taBaru->nama} sedang bertugas di siklus lain dan tidak dapat dipilih.",
            ], 422);
        }

        if (! $taBaru->isAktif()) {
            return response()->json(['message' => "Tenaga ahli {$taBaru->nama} tidak aktif."], 422);
        }

        if ($taBaru->id === $taLama->id) {
            return response()->json(['message' => 'Tenaga ahli pengganti sama dengan yang lama.'], 422);
        }

        $user = $request->user();

        $newPenugasan = DB::transaction(function () use ($penugasan, $siklus, $taLama, $taBaru, $peran, $data, $user, $audit) {
            // Tandai penugasan lama sebagai 'digantikan'
            $penugasan->forceFill(['status' => Penugasan::STATUS_DIGANTIKAN])->save();

            // Buat penugasan baru untuk TA pengganti
            $new = Penugasan::create([
                'id' => (string) Str::uuid(),
                'siklus_id' => $siklus->id,
                'tenaga_ahli_id' => $taBaru->id,
                'jenis' => $penugasan->jenis,
                'status' => Penugasan::STATUS_MENUNGGU,
            ]);

            // Update histori antrian untuk TA baru
            HistoriAntrianPenugasan::updateOrCreate(
                ['tenaga_ahli_id' => $taBaru->id, 'peran' => $peran],
                [
                    'status_kesediaan' => HistoriAntrianPenugasan::STATUS_DITAWARKAN,
                    'tanggal_status' => now(),
                    'ditugaskan_oleh' => $user->id,
                ]
            );

            // Catat history pergantian
            \App\Models\HistoriPergantianPenugasan::create([
                'id' => (string) Str::uuid(),
                'siklus_id' => $siklus->id,
                'jenis' => $penugasan->jenis,
                'penugasan_lama_id' => $penugasan->id,
                'penugasan_baru_id' => $new->id,
                'tenaga_ahli_lama_id' => $taLama->id,
                'tenaga_ahli_baru_id' => $taBaru->id,
                'alasan' => $data['alasan'] ?? null,
                'diganti_oleh' => $user->id,
            ]);

            $audit->log('penugasan.replaced', 'penugasan', $penugasan->id, [
                'tenaga_ahli_lama' => $taLama->nama,
                'tenaga_ahli_baru' => $taBaru->nama,
                'siklus_id' => $siklus->id,
            ]);

            // Reset status TA lama jika tidak ada penugasan aktif lain
            $otherActiveLama = Penugasan::where('tenaga_ahli_id', $taLama->id)
                ->whereIn('status', [Penugasan::STATUS_SEDANG_BERTUGAS, Penugasan::STATUS_MENUNGGU])
                ->where('id', '!=', $penugasan->id)
                ->exists();
            if (! $otherActiveLama && $taLama->status_penugasan_saat_ini !== TenagaAhli::STATUS_TIDAK_BERTUGAS) {
                $taLama->forceFill(['status_penugasan_saat_ini' => TenagaAhli::STATUS_TIDAK_BERTUGAS])->save();
            }

            // Set status TA baru ke menunggu
            $taBaru->forceFill(['status_penugasan_saat_ini' => 'menunggu'])->save();

            return $new;
        });

        $newPenugasan->load(['tenagaAhli', 'siklus.faskes']);

        return response()->json([
            'data' => $newPenugasan,
            'message' => "Tenaga ahli {$taLama->nama} diganti dengan {$taBaru->nama}.",
        ], 201);
    }

    public function index(SiklusAkreditasi $siklus): JsonResponse
    {
        $penugasan = Penugasan::with(['tenagaAhli', 'suratTugas'])
            ->where('siklus_id', $siklus->id)
            ->orderBy('jenis')
            ->get();

        return response()->json(['data' => $penugasan]);
    }

    /**
     * GET /api/penugasan/saya
     * Penugasan untuk tenaga ahli yang sedang login.
     */
    public function myAssignments(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->tenaga_ahli_id) {
            return response()->json(['data' => []]);
        }

        $penugasan = Penugasan::with(['siklus.faskes', 'suratTugas', 'laporanPengerjaan'])
            ->where('tenaga_ahli_id', $user->tenaga_ahli_id)
            ->orderBy('id', 'desc')
            ->get();

        // Cek apakah setiap siklus+jenis sudah punya laporan (dari surveyor lain)
        $siklusJenisDenganLaporan = LaporanPengerjaan::whereHas('penugasan', function ($q) use ($user) {
            $q->where('tenaga_ahli_id', '!=', $user->tenaga_ahli_id);
        })->get()->map(fn($lp) => $lp->penugasan->siklus_id . '|' . $lp->penugasan->jenis)->values()->toArray();

        $data = $penugasan->map(function ($p) use ($siklusJenisDenganLaporan) {
            $key = $p->siklus_id . '|' . $p->jenis;
            $p->sudah_ada_laporan = in_array($key, $siklusJenisDenganLaporan, true);
            return $p;
        });

        return response()->json(['data' => $data]);
    }

    /**
     * GET /api/penugasan/kandidat/{siklus}/{jenis}
     * Kandidat eligible sesuai role (surveior/verifikator) + queue round-robin.
     * FR-3.7: Surveior dengan status "sedang bertugas" tidak eligible.
     * FR-3.8: Batas penugasan per periode (opsional).
     */
    public function kandidat(SiklusAkreditasi $siklus, string $jenis): JsonResponse
    {
        $peran = $jenis === Penugasan::JENIS_SURVEI
            ? TenagaAhli::PERAN_SURVEIOR
            : TenagaAhli::PERAN_VERIFIKATOR;

        $kandidat = $this->getEligibleCandidates($siklus, $peran);

        return response()->json([
            'data' => $kandidat,
            'meta' => [
                'peran' => $peran,
                'jumlah' => $kandidat->count(),
            ],
        ]);
    }

    /**
     * POST /api/penugasan
     * Buat penugasan baru: otomatis tawarkan ke kandidat pertama di antrian.
     * FR-3.3: alur penggantian round-robin.
     * FR-3.5: jika ditolak, otomatis tawarkan ke kandidat berikutnya.
     */
    public function store(Request $request, AuditService $audit): JsonResponse
    {
        $data = $request->validate([
            'siklus_id' => 'required|uuid|exists:siklus_akreditasi,id',
            'jenis' => 'required|string|in:survei,verifikasi',
        ]);

        $siklus = SiklusAkreditasi::findOrFail($data['siklus_id']);

        // Guard: survei sudah selesai → tidak bisa tawarkan penugasan survei lagi
        if ($data['jenis'] === Penugasan::JENIS_SURVEI) {
            $surveiSelesai = \App\Models\LaporanPengerjaan::whereHas('penugasan', function ($q) use ($siklus) {
                $q->where('siklus_id', $siklus->id)->where('jenis', Penugasan::JENIS_SURVEI);
            })->exists();
            if ($surveiSelesai) {
                return response()->json([
                    'message' => 'Survei untuk siklus ini sudah selesai. Tidak dapat menugaskan surveyor lagi.',
                ], 422);
            }
        }

        $peran = $data['jenis'] === Penugasan::JENIS_SURVEI
            ? TenagaAhli::PERAN_SURVEIOR
            : TenagaAhli::PERAN_VERIFIKATOR;

        // AC-8: Verifikator boleh punya multiple penugasan concurrent. Jika kandidat
        // sudah punya verifikasi aktif di siklus ini, coba kandidat berikutnya.
        if ($data['jenis'] === Penugasan::JENIS_VERIFIKASI) {
            $surveiSelesai = \App\Models\LaporanPengerjaan::whereHas('penugasan', function ($q) use ($siklus) {
                $q->where('siklus_id', $siklus->id)->where('jenis', Penugasan::JENIS_SURVEI);
            })->exists();
            if (! $surveiSelesai) {
                return response()->json([
                    'message' => 'Survei untuk siklus ini belum selesai. Verifikasi hanya dapat dilakukan setelah laporan survei dikirim.',
                ], 422);
            }

            $kandidat = null;
            foreach (self::getEligibleCandidatesFor($siklus, $peran) as $c) {
                $verifikasiAktif = Penugasan::where('siklus_id', $siklus->id)
                    ->where('tenaga_ahli_id', $c->id)
                    ->where('jenis', Penugasan::JENIS_VERIFIKASI)
                    ->whereIn('status', [Penugasan::STATUS_MENUNGGU, Penugasan::STATUS_SEDANG_BERTUGAS])
                    ->exists();
                if (! $verifikasiAktif) {
                    $kandidat = $c;
                    break;
                }
            }
            if (! $kandidat) {
                return response()->json([
                    'message' => 'Tidak ada kandidat eligible tersedia di antrian.',
                ], 422);
            }
        } else {
            // Survei: simple first-eligible
            $kandidat = self::getEligibleCandidatesFor($siklus, $peran)->first();
            if (! $kandidat) {
                return response()->json([
                    'message' => 'Tidak ada kandidat eligible tersedia di antrian.',
                ], 422);
            }
        }

        $penugasan = Penugasan::create([
            'id' => (string) Str::uuid(),
            'siklus_id' => $siklus->id,
            'tenaga_ahli_id' => $kandidat->id,
            'jenis' => $data['jenis'],
            'status' => Penugasan::STATUS_MENUNGGU,
        ]);

        // Update histori antrian: статус ditawakan
        HistoriAntrianPenugasan::updateOrCreate(
            ['tenaga_ahli_id' => $kandidat->id, 'peran' => $peran],
            [
                'status_kesediaan' => HistoriAntrianPenugasan::STATUS_DITAWARKAN,
                'tanggal_status' => now(),
                'ditugaskan_oleh' => $request->user()->id,
            ]
        );

        $audit->record('penugasan.create', null, $penugasan, 'Penugasan', $penugasan->id);

        // Update status_penugasan_saat_ini TA ke 'menunggu' agar tidak muncul lagi di dropdown
        if ($kandidat->status_penugasan_saat_ini !== TenagaAhli::STATUS_SEDANG_BERTUGAS) {
            $kandidat->forceFill(['status_penugasan_saat_ini' => 'menunggu'])->save();
        }

        $penugasan->load(['tenagaAhli', 'siklus.faskes']);

        return response()->json([
            'data' => $penugasan,
            'message' => "Penugasan {$data['jenis']} ditawarkan ke {$kandidat->nama}.",
        ], 201);
    }

    /**
     * POST /api/penugasan/appoint
     * Admin menunjuk tenaga ahli tertentu secara manual + upload surat tugas (opsional).
     *
     * Untuk jenis=survei: butuh 2 tenaga ahli (1 TKPP + 1 TKSDU). Kirim sebagai:
     *   - tenaga_ahli_ids[] = [id_tkpp, id_tksdu]   (FormData array)
     *   - atau tenaga_ahli_id (single) untuk back-compat
     *
     * Untuk jenis=verifikasi: butuh 1 verifikator. Kirim sebagai:
     *   - tenaga_ahli_id (single) ATAU tenaga_ahli_ids[] = [id_verifikator]
     *
     * Field surat_tugas (file PDF, opsional) digunakan untuk SEMUA penugasan yang dibuat.
     */
    public function appoint(Request $request, AttachmentService $attachment, AuditService $audit): JsonResponse
    {
        $data = $request->validate([
            'siklus_id' => 'required|uuid|exists:siklus_akreditasi,id',
            'jenis' => 'required|string|in:survei,verifikasi',
            'tenaga_ahli_id' => 'nullable|uuid|exists:tenaga_ahli,id',
            'tenaga_ahli_ids' => 'nullable|array|min:1|max:5',
            'tenaga_ahli_ids.*' => 'uuid|exists:tenaga_ahli,id',
            'tanggal_mulai_survei' => 'nullable|date|after_or_equal:today',
            'tanggal_selesai_survei' => 'nullable|date|after_or_equal:tanggal_mulai_survei',
            'surat_tugas' => 'nullable|file|mimes:pdf|max:10240',
        ]);

        $siklus = SiklusAkreditasi::findOrFail($data['siklus_id']);

        // Guard: untuk penugasan survei, tolak jika survei sudah selesai
        // (ada laporan_pengerjaan untuk siklus + jenis survei).
        if ($data['jenis'] === Penugasan::JENIS_SURVEI) {
            $surveiSelesai = \App\Models\LaporanPengerjaan::whereHas('penugasan', function ($q) use ($siklus) {
                $q->where('siklus_id', $siklus->id)->where('jenis', Penugasan::JENIS_SURVEI);
            })->exists();
            if ($surveiSelesai) {
                return response()->json([
                    'message' => 'Survei untuk siklus ini sudah selesai. Tidak dapat menugaskan surveyor lagi.',
                ], 422);
            }
        }

        // Guard: untuk penugasan verifikasi, tolak jika survei belum selesai
        // (verifikasi adalah tinjauan hasil survei — lihat FR-4.1).
        if ($data['jenis'] === Penugasan::JENIS_VERIFIKASI) {
            $surveiSelesai = \App\Models\LaporanPengerjaan::whereHas('penugasan', function ($q) use ($siklus) {
                $q->where('siklus_id', $siklus->id)->where('jenis', Penugasan::JENIS_SURVEI);
            })->exists();
            if (! $surveiSelesai) {
                return response()->json([
                    'message' => 'Survei untuk siklus ini belum selesai. Verifikasi hanya dapat dilakukan setelah laporan survei dikirim.',
                ], 422);
            }

            // Tolak double-tunjuk verifikator jika sudah ada penugasan verifikasi
            // yang aktif/selesai (status menunggu/sedang_bertugas/selesai).
            $verifikasiAktif = Penugasan::where('siklus_id', $siklus->id)
                ->where('jenis', Penugasan::JENIS_VERIFIKASI)
                ->whereIn('status', [Penugasan::STATUS_MENUNGGU, Penugasan::STATUS_SEDANG_BERTUGAS, Penugasan::STATUS_SELESAI])
                ->exists();
            if ($verifikasiAktif) {
                return response()->json([
                    'message' => 'Verifikasi untuk siklus ini sudah berjalan/selesai. Tidak dapat menugaskan verifikator lagi.',
                ], 422);
            }
        }

        // Normalisasi: kumpulkan ID dari tenaga_ahli_ids[] atau tenaga_ahli_id
        $taIds = $data['tenaga_ahli_ids'] ?? [];
        if (! empty($data['tenaga_ahli_id'])) {
            $taIds[] = $data['tenaga_ahli_id'];
        }
        $taIds = array_values(array_unique($taIds));

        if (empty($taIds)) {
            return response()->json(['message' => 'Pilih minimal satu tenaga ahli.'], 422);
        }

        // Validasi jumlah per jenis
        if ($data['jenis'] === Penugasan::JENIS_SURVEI) {
            if (count($taIds) < 2) {
                return response()->json([
                    'message' => 'Untuk penugasan survei, harus memilih 2 tenaga ahli (1 TKPP + 1 TKSDU).',
                ], 422);
            }
        } else {
            // verifikasi: 1 saja
            if (count($taIds) !== 1) {
                $taIds = [reset($taIds)];
            }
        }

        $peran = $data['jenis'] === Penugasan::JENIS_SURVEI
            ? TenagaAhli::PERAN_SURVEIOR
            : TenagaAhli::PERAN_VERIFIKATOR;

        $tenagaAhliList = TenagaAhli::whereIn('id', $taIds)->get();

        // Validasi setiap tenaga ahli
        $jenisCounts = [TenagaAhli::JENIS_TKPP => 0, TenagaAhli::JENIS_TKSDU => 0];
        foreach ($tenagaAhliList as $ta) {
            // Peran harus sesuai
            if (! in_array($ta->peran, [$peran, TenagaAhli::PERAN_KEDUA], true)) {
                return response()->json([
                    'message' => "Tenaga ahli {$ta->nama} bukan {$peran}.",
                ], 422);
            }
            if ($ta->status_aktif !== TenagaAhli::STATUS_AKTIF) {
                return response()->json(['message' => "Tenaga ahli {$ta->nama} tidak aktif."], 422);
            }
            if ($ta->status_penugasan_saat_ini === TenagaAhli::STATUS_SEDANG_BERTUGAS) {
                return response()->json(['message' => "Tenaga ahli {$ta->nama} sedang bertugas di siklus lain."], 422);
            }
            if ($data['jenis'] === Penugasan::JENIS_SURVEI) {
                if ($ta->jenis === TenagaAhli::JENIS_TKPP) $jenisCounts[TenagaAhli::JENIS_TKPP]++;
                if ($ta->jenis === TenagaAhli::JENIS_TKSDU) $jenisCounts[TenagaAhli::JENIS_TKSDU]++;
            }
        }

        // Untuk survei: harus 1 TKPP + 1 TKSDU
        if ($data['jenis'] === Penugasan::JENIS_SURVEI) {
            if ($jenisCounts[TenagaAhli::JENIS_TKPP] !== 1 || $jenisCounts[TenagaAhli::JENIS_TKSDU] !== 1) {
                return response()->json([
                    'message' => "Untuk survei, harus tepat 1 TKPP dan 1 TKSDU. Saat ini: TKPP={$jenisCounts[TenagaAhli::JENIS_TKPP]}, TKSDU={$jenisCounts[TenagaAhli::JENIS_TKSDU]}.",
                ], 422);
            }
        }

        // Auto-cancel surveyor/verifikator lama yang TIDAK ada di daftar baru
        // (memungkinkan admin langsung mengganti tanpa harus decline manual).
        // TA yang sama (ada di keduanya) di-keep.
        $existingActive = Penugasan::where('siklus_id', $siklus->id)
            ->where('jenis', $data['jenis'])
            ->whereIn('status', [Penugasan::STATUS_MENUNGGU, Penugasan::STATUS_SEDANG_BERTUGAS])
            ->get();

        $existingTaIds = $existingActive->pluck('tenaga_ahli_id')->all();
        $newTaIds = $taIds;

        // TA yang harus di-keep (ada di existing DAN di new)
        $keepTaIds = array_values(array_intersect($existingTaIds, $newTaIds));
        // TA existing yang harus di-cancel (tidak ada di new)
        $cancelIds = array_values(array_diff($existingTaIds, $newTaIds));
        // TA baru yang harus di-create (tidak ada di existing)
        $createIds = array_values(array_diff($newTaIds, $existingTaIds));

        // Filter tenagaAhliList: hanya yang perlu di-create
        $tenagaAhliList = $tenagaAhliList->filter(fn ($ta) => in_array($ta->id, $createIds, true))->values();

        $cancelled = [];
        if (! empty($cancelIds)) {
            $cancelled = Penugasan::where('siklus_id', $siklus->id)
                ->where('jenis', $data['jenis'])
                ->whereIn('status', [Penugasan::STATUS_MENUNGGU, Penugasan::STATUS_SEDANG_BERTUGAS])
                ->whereIn('tenaga_ahli_id', $cancelIds)
                ->get();

            foreach ($cancelled as $old) {
                $old->forceFill(['status' => Penugasan::STATUS_DIBATALKAN])->save();
                $audit->log('penugasan.auto_replaced', 'penugasan', $old->id, [
                    'reason' => 'digantikan oleh penugasan baru dari admin',
                ]);
            }
        }

        // Untuk response ke frontend, sertakan TA yang di-keep
        $kept = $tenagaAhliList->merge(
            TenagaAhli::whereIn('id', $keepTaIds)->get()
        );

        $penugasanList = DB::transaction(function () use ($data, $siklus, $tenagaAhliList, $peran, $request, $audit, $attachment) {
            // Jika ada file surat tugas, upload sekali dan reuse path/nomor untuk semua penugasan
            $suratPath = null;
            $suratNomor = null;
            if ($request->hasFile('surat_tugas')) {
                $suratPath = $attachment->store($request->file('surat_tugas'), 'surat_tugas');
                $suratNomor = self::generateNomorSurat($siklus, $data['jenis']);
            }

            $created = [];
            foreach ($tenagaAhliList as $tenagaAhli) {
                $penugasan = Penugasan::create([
                    'id' => (string) Str::uuid(),
                    'siklus_id' => $siklus->id,
                    'tenaga_ahli_id' => $tenagaAhli->id,
                    'jenis' => $data['jenis'],
                    'status' => Penugasan::STATUS_MENUNGGU,
                    'tanggal_mulai_survei' => $data['tanggal_mulai_survei'] ?? null,
                    'tanggal_selesai_survei' => $data['tanggal_selesai_survei'] ?? null,
                ]);

                // Simpan histori antrian
                HistoriAntrianPenugasan::updateOrCreate(
                    ['tenaga_ahli_id' => $tenagaAhli->id, 'peran' => $peran],
                    [
                        'status_kesediaan' => HistoriAntrianPenugasan::STATUS_DITAWARKAN,
                        'tanggal_status' => now(),
                        'ditugaskan_oleh' => $request->user()->id,
                    ]
                );

                // Buat SuratTugas untuk setiap penugasan (path & nomor sama)
                if ($suratPath) {
                    \App\Models\SuratTugas::create([
                        'penugasan_id' => $penugasan->id,
                        'nomor_surat' => $suratNomor,
                        'path_pdf' => $suratPath,
                        'diterbitkan_oleh' => $request->user()->id,
                        'tanggal_terbit' => now()->toDateString(),
                    ]);
                }

                $audit->record('penugasan.appoint', null, $penugasan, 'Penugasan', $penugasan->id);
                $created[] = $penugasan;
            }
            return $created;
        });

        // Update status_penugasan_saat_ini TA yang baru saja ditugaskan ke 'menunggu'
        // (agar tidak muncul lagi di dropdown sebagai kandidat)
        foreach ($penugasanList as $p) {
            $ta = $p->tenagaAhli;
            if ($ta && $ta->status_penugasan_saat_ini !== TenagaAhli::STATUS_SEDANG_BERTUGAS) {
                $ta->forceFill(['status_penugasan_saat_ini' => 'menunggu'])->save();
            }
        }

        $penugasanIds = collect($penugasanList)->pluck('id')->toArray();
        // Sertakan penugasan existing yang di-keep + yang baru dibuat
        $keepPenugasanIds = Penugasan::where('siklus_id', $siklus->id)
            ->where('jenis', $data['jenis'])
            ->whereIn('status', [Penugasan::STATUS_MENUNGGU, Penugasan::STATUS_SEDANG_BERTUGAS])
            ->whereIn('tenaga_ahli_id', $keepTaIds)
            ->pluck('id')
            ->all();
        $allIds = array_unique(array_merge($penugasanIds, $keepPenugasanIds));

        $loaded = Penugasan::with(['tenagaAhli', 'siklus.faskes', 'suratTugas'])
            ->whereIn('id', $allIds)
            ->get();

        // Bangun message berdasarkan semua TA akhir (kept + created)
        $finalNames = $loaded->map(fn ($p) => $p->tenagaAhli->nama)->join(', ');
        $message = "Tenaga ahli {$finalNames} ditugaskan untuk penugasan {$data['jenis']}.";
        if (count($cancelled) > 0) {
            $cancelledNames = TenagaAhli::whereIn('id', collect($cancelled)->pluck('tenaga_ahli_id'))->pluck('nama')->join(', ');
            $message .= " ({$cancelledNames} sebelumnya digantikan)";
        }

        return response()->json([
            'data' => $loaded,
            'message' => $message,
        ], 200);
    }

    /**
     * POST /api/penugasan/{penugasan}/decline
     * Admin menolak penugasan yang sedang menunggu (status=menunggu).
     * Setelah ditolak, sistem otomatis menawarkan ke kandidat berikutnya.
     */
    public function tolak(Request $request, Penugasan $penugasan, AuditService $audit): JsonResponse
    {
        if ($penugasan->status !== Penugasan::STATUS_MENUNGGU) {
            return response()->json(['message' => 'Hanya penugasan berstatus menunggu yang dapat dibatalkan.'], 422);
        }

        $data = $request->validate([
            'alasan' => 'nullable|string|max:500',
        ]);

        $jenis = $penugasan->jenis;
        $peran = $jenis === Penugasan::JENIS_SURVEI
            ? TenagaAhli::PERAN_SURVEIOR
            : TenagaAhli::PERAN_VERIFIKATOR;

        HistoriAntrianPenugasan::updateOrCreate(
            ['tenaga_ahli_id' => $penugasan->tenaga_ahli_id, 'peran' => $peran],
            [
                'status_kesediaan' => HistoriAntrianPenugasan::STATUS_DITOLAK,
                'tanggal_status' => now(),
                'catatan_penolakan' => $data['alasan'] ?? null,
            ]
        );

        $ta = $penugasan->tenagaAhli;
        $penugasanId = $penugasan->id;
        $before = $penugasan->replicate();
        $penugasan->delete();

        // Reset status TA jika tidak ada penugasan aktif lain
        if ($ta) {
            $otherActive = Penugasan::where('tenaga_ahli_id', $ta->id)
                ->whereIn('status', [Penugasan::STATUS_SEDANG_BERTUGAS, Penugasan::STATUS_MENUNGGU])
                ->exists();
            if (! $otherActive && $ta->status_penugasan_saat_ini !== TenagaAhli::STATUS_TIDAK_BERTUGAS) {
                $ta->forceFill(['status_penugasan_saat_ini' => TenagaAhli::STATUS_TIDAK_BERTUGAS])->save();
            }
        }

        $audit->record('penugasan.batal', $before, null, 'Penugasan', $penugasanId);

        return response()->json([
            'message' => 'Penugasan dibatalkan dan dihapus.',
        ]);
    }

    /**
     * Generate nomor surat tugas otomatis dengan format:
     *   ST/[jenis]/[tahun]/[kode-faskes-slug]/[seq-4digit]
     * Selalu return nilai unik; jika seq kembar, naik sampai ketemu yang belum dipakai.
     */
    public static function generateNomorSurat(SiklusAkreditasi $siklus, string $jenis): string
    {
        $jenisCode = $jenis === Penugasan::JENIS_SURVEI ? 'SRV' : 'VER';
        $tahun = now()->format('Y');
        $faskesKode = strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $siklus->faskes?->nama ?? 'FASKES'), 0, 6));
        if ($faskesKode === '') $faskesKode = 'FASKES';

        $prefix = "ST/{$jenisCode}/{$tahun}/{$faskesKode}/";
        for ($i = 1; $i < 10000; $i++) {
            $seq = str_pad((string) $i, 4, '0', STR_PAD_LEFT);
            $nomor = $prefix . $seq;
            if (! \App\Models\SuratTugas::where('nomor_surat', $nomor)->exists()) {
                return $nomor;
            }
        }
        // Fallback dengan random suffix
        return $prefix . strtoupper(Str::random(4));
    }

    /**
     * PATCH /api/penugasan/{penugasan}/konfirmasi
     * Surveior/Verifikator konfirmasi kesediaan (FR-3.4).
     * Payload: { "konfirmasi": true|false, "catatan": "..." }
     */
    public function konfirmasiKesediaan(Request $request, Penugasan $penugasan, AuditService $audit): JsonResponse
    {
        $user = $request->user();

        // Hanya tenaga ahli yang ditugaskan yang bisa konfirmasi
        if ($user->tenaga_ahli_id !== $penugasan->tenaga_ahli_id) {
            abort(response()->json(['message' => 'Tidak diizinkan.'], 403));
        }

        $data = $request->validate([
            'konfirmasi' => 'required|boolean',
            'catatan' => 'nullable|string|max:2000',
        ]);

        $peran = $penugasan->tenagaAhli->isSurveior()
            ? HistoriAntrianPenugasan::PERAN_SURVEIOR
            : HistoriAntrianPenugasan::PERAN_VERIFIKATOR;

        if ($data['konfirmasi']) {
            // Diterima
            $penugasan->forceFill(['status' => Penugasan::STATUS_SEDANG_BERTUGAS])->save();

            // Update tenaga ahli: sedang bertugas
            $penugasan->tenagaAhli->forceFill(['status_penugasan_saat_ini' => TenagaAhli::STATUS_SEDANG_BERTUGAS])->save();

            // Update histori antrian
            HistoriAntrianPenugasan::updateOrCreate(
                ['tenaga_ahli_id' => $penugasan->tenaga_ahli_id, 'peran' => $peran],
                [
                    'status_kesediaan' => HistoriAntrianPenugasan::STATUS_DITERIMA,
                    'tanggal_status' => now(),
                ]
            );

            $audit->record('penugasan.konfirmasi_terima', null, $penugasan, 'Penugasan', $penugasan->id);

            return response()->json([
                'data' => $penugasan->fresh()->load(['tenagaAhli', 'siklus.faskes']),
                'message' => 'Kesediaan dikonfirmasi. Penugasan sedang berjalan.',
            ]);
        } else {
            // Ditolak oleh surveyor. Sistem TIDAK auto-replace —
            // admin wajib menugaskan ulang via endpoint replace/appoint.
            $catatan = $data['catatan'] ?? null;

            // Catat penolakan di histori
            HistoriAntrianPenugasan::updateOrCreate(
                ['tenaga_ahli_id' => $penugasan->tenaga_ahli_id, 'peran' => $peran],
                [
                    'status_kesediaan' => HistoriAntrianPenugasan::STATUS_DITOLAK,
                    'tanggal_status' => now(),
                    'catatan_penolakan' => $catatan,
                ]
            );

            // Reset status TA yang menolak → tidak_bertugas (agar bisa ditugas di siklus lain)
            $taMenolak = $penugasan->tenagaAhli;
            $otherActiveMenolak = Penugasan::where('tenaga_ahli_id', $taMenolak->id)
                ->whereIn('status', [Penugasan::STATUS_SEDANG_BERTUGAS, Penugasan::STATUS_MENUNGGU])
                ->where('id', '!=', $penugasan->id)
                ->exists();
            if (! $otherActiveMenolak) {
                $taMenolak->forceFill(['status_penugasan_saat_ini' => TenagaAhli::STATUS_TIDAK_BERTUGAS])->save();
            }

            // Set penugasan ke status 'ditolak'. Admin wajib replace manual.
            $penugasan->forceFill(['status' => Penugasan::STATUS_DITOLAK])->save();
            $audit->record('penugasan.ditolak_surveior', null, $penugasan, 'Penugasan', $penugasan->id);

            return response()->json([
                'data' => $penugasan->fresh()->load(['tenagaAhli', 'siklus.faskes']),
                'message' => 'Penolakan dicatat. Admin akan menugaskan pengganti.',
            ]);
        }
    }

    /**
     * PUT /api/penugasan/{penugasan}/selesai
     * Tandai penugasan selesai (dipanggil saat laporan dikirim).
     * Payload (FormData): file_laporan (opsional, image/pdf), keterangan (opsional)
     * Reset status tenaga ahli.
     */
    public function selesai(Request $request, Penugasan $penugasan, AttachmentService $attachment, AuditService $audit): JsonResponse
    {
        if (! $penugasan->isSedangBertugas()) {
            abort(response()->json(['message' => 'Penugasan belum berjalan.'], 422));
        }

        $data = $request->validate([
            'file_laporan' => 'nullable|file|mimes:jpg,jpeg,png,gif,pdf|max:10240',
            'keterangan' => 'nullable|string|max:1000',
        ]);

        $user = $request->user();

        // Cek apakah sudah ada laporan untuk siklus+jenis yang sama ( surveyor lain sudah upload )
        $sudahAdaLaporan = LaporanPengerjaan::whereHas('penugasan', function ($q) use ($penugasan) {
            $q->where('siklus_id', $penugasan->siklus_id)
              ->where('jenis', $penugasan->jenis);
        })->exists();

        // Simpan laporan pengerjaan jika ada file DAN belum ada yang upload
        if ($request->hasFile('file_laporan') && ! $sudahAdaLaporan) {
            $file = $request->file('file_laporan');
            $path = $attachment->store($file, 'laporan_pengerjaan');

            LaporanPengerjaan::updateOrCreate(
                ['penugasan_id' => $penugasan->id],
                [
                    'path_file' => $path,
                    'nama_file_asli' => $file->getClientOriginalName(),
                    'tipe_file' => $file->getMimeType(),
                    'ukuran_file' => $file->getSize(),
                    'keterangan' => $data['keterangan'] ?? null,
                    'diunggah_oleh' => $user->id,
                ]
            );

            $audit->log('laporan_pengerjaan.uploaded', 'laporan_pengerjaan', $penugasan->id, [
                'file' => $file->getClientOriginalName(),
                'size' => $file->getSize(),
            ]);
        }

        $peran = $penugasan->tenagaAhli->isSurveior()
            ? HistoriAntrianPenugasan::PERAN_SURVEIOR
            : HistoriAntrianPenugasan::PERAN_VERIFIKATOR;

        $previousStatus = $penugasan->status;

        $penugasan->forceFill([
            'status' => Penugasan::STATUS_SELESAI,
            'tanggal_selesai' => now()->toDateString(),
        ])->save();

        // AP honor (surveior / verifikator / rekomendator) tidak lagi
        // dibuat di sini — pencatatan ditunda sampai rekomendasi disetujui.
        // Lihat LedgerService::triggerHonorSetelahRekomendasi.

        $otherActive = Penugasan::where('tenaga_ahli_id', $penugasan->tenaga_ahli_id)
            ->whereIn('status', [Penugasan::STATUS_SEDANG_BERTUGAS, Penugasan::STATUS_MENUNGGU])
            ->where('id', '!=', $penugasan->id)
            ->exists();

        if (! $otherActive) {
            $penugasan->tenagaAhli->forceFill(['status_penugasan_saat_ini' => TenagaAhli::STATUS_TIDAK_BERTUGAS])->save();
        }

        HistoriAntrianPenugasan::updateOrCreate(
            ['tenaga_ahli_id' => $penugasan->tenaga_ahli_id, 'peran' => $peran],
            [
                'status_kesediaan' => HistoriAntrianPenugasan::STATUS_SIAP,
                'tanggal_status' => now(),
            ]
        );

        // ── Auto-advance tahap siklus ──
        $siklus = $penugasan->siklus;
        if ($penugasan->jenis === Penugasan::JENIS_SURVEI) {
            // Cek apakah sudah ada minimal 1 laporan untuk survei siklus ini
            $sudahAdaLaporan = LaporanPengerjaan::whereHas('penugasan', function ($q) use ($siklus) {
                $q->where('siklus_id', $siklus->id)
                  ->where('jenis', Penugasan::JENIS_SURVEI);
            })->exists();

            if ($sudahAdaLaporan) {
                $siklus->forceFill(['tahapan' => 5])->save();
                $audit->log('siklus.tahapan_advance', 'siklus', $siklus->id, ['tahapan' => 5]);
            }
        } elseif ($penugasan->jenis === Penugasan::JENIS_VERIFIKASI) {
            // Cek apakah SEMUA penugasan verifikasi di siklus ini sudah selesai
            $semuaVerifikasiSelesai = ! Penugasan::where('siklus_id', $siklus->id)
                ->where('jenis', Penugasan::JENIS_VERIFIKASI)
                ->whereNotIn('status', [Penugasan::STATUS_SELESAI, Penugasan::STATUS_DITOLAK, Penugasan::STATUS_DIBATALKAN])
                ->exists();

            if ($semuaVerifikasiSelesai) {
                $siklus->forceFill(['tahapan' => 7])->save();
                $audit->log('siklus.tahapan_advance', 'siklus', $siklus->id, ['tahapan' => 7]);
            }
        }

        $audit->record('penugasan.selesai', null, $penugasan, 'Penugasan', $penugasan->id);

        return response()->json([
            'data' => $penugasan->fresh()->load(['tenagaAhli', 'laporanPengerjaan']),
            'message' => 'Penugasan ditandai selesai. Laporan pengerjaan telah diunggah.',
        ]);
    }

    /**
     * GET /api/penugasan/eligible/{siklusId}/{jenis}
     * Helper: cek apakah tenaga ahli tertentu eligible.
     */
    public function cekEligible(string $siklusId, string $jenis): JsonResponse
    {
        $siklus = SiklusAkreditasi::findOrFail($siklusId);

        $peran = $jenis === Penugasan::JENIS_SURVEI
            ? TenagaAhli::PERAN_SURVEIOR
            : TenagaAhli::PERAN_VERIFIKATOR;

        $kandidat = $this->getEligibleCandidates($siklus, $peran);

        return response()->json([
            'data' => $kandidat,
            'meta' => ['peran' => $peran, 'jumlah' => $kandidat->count()],
        ]);
    }

    /**
     * Ambil kandidat eligible untuk peran tertentu, berdasarkan antrian round-robin.
     * FR-3.7: Surveior "sedang bertugas" di-exclude.
     * FR-3.8: Batas penugasan per periode (jika diaktifkan).
     *
     * @param  \Illuminate\Database\Eloquent\Collection  $kandidat
     */
    public function getEligibleCandidates(SiklusAkreditasi $siklus, string $peran): \Illuminate\Database\Eloquent\Collection
    {
        return self::getEligibleCandidatesFor($siklus, $peran);
    }

    public static function getEligibleCandidatesFor(SiklusAkreditasi $siklus, string $peran): \Illuminate\Database\Eloquent\Collection
    {
        // Dapatkan pengaturan batas per periode
        $batasAktif = KonfigurasiPenugasan::boolValue('batas_periode_aktif');
        $batasNilai = KonfigurasiPenugasan::intValue('batas_periode_nilai', 0);

        $query = TenagaAhli::query()
            ->whereIn('peran', [$peran, TenagaAhli::PERAN_KEDUA])
            ->where('status_aktif', TenagaAhli::STATUS_AKTIF);

        // FR-3.7: Surveior tidak boleh sedang bertugas
        if ($peran === HistoriAntrianPenugasan::PERAN_SURVEIOR) {
            $query->where('status_penugasan_saat_ini', '!=', TenagaAhli::STATUS_SEDANG_BERTUGAS);
        }

        // FR-3.8: Batas penugasan per periode (jika diaktifkan)
        // Exclude surveiors whose active assignments have reached their batas limit
        if ($batasAktif && $batasNilai > 0) {
            $query->where(function ($q) use ($batasNilai) {
                $q->whereNull('batas_penugasan_per_periode')
                    ->orWhereRaw('batas_penugasan_per_periode > ?', [$batasNilai]);
            });
        }

        $all = $query->get();

        // FR-3.8: Filter out surveiors whose active assignment count >= their batas limit
        if ($batasAktif && $batasNilai > 0) {
            $all = $all->filter(function ($ta) {
                if ($ta->batas_penugasan_per_periode === null) {
                    return true;
                }
                $activeCount = Penugasan::where('tenaga_ahli_id', $ta->id)
                    ->whereIn('status', [Penugasan::STATUS_SEDANG_BERTUGAS, Penugasan::STATUS_MENUNGGU])
                    ->count();
                return $activeCount < $ta->batas_penugasan_per_periode;
            });
        }

        // Urutkan berdasarkan histori antrian round-robin, tie-break by id
        return $all->sortBy(function ($ta) use ($peran): array {
            $histori = HistoriAntrianPenugasan::where('tenaga_ahli_id', $ta->id)
                ->where('peran', $peran)
                ->first();

            return [(int) ($histori ? $histori->nomor_urut : PHP_INT_MAX), $ta->id];
        })->values();
    }
}
