<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AkunPengguna;
use App\Models\Role;
use App\Models\TenagaAhli;
use App\Models\Faskes;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * FR-6.6, NFR-3: CRUD Akun Pengguna.
 * Akun hanya boleh dibuat oleh Divisi SDM / Admin Lembaga (tidak ada self-registration).
 *
 * Untuk Role Surveior/Verifikator, tenaga_ahli_id WAJIB diisi dan
 * record TenagaAhli terkait HARUS memiliki nomor_induk_surveior.
 */
class AkunPenggunaController extends Controller
{
    public function __construct(private AuditService $audit) {}

    public function index(Request $request): JsonResponse
    {
        // Tanpa trait scope: filter default + pivot secara eksplisit agar
        // user multi-lembaga (yang lembaga_id default ≠ lembaga aktif tapi
        // ada di pivot) tetap muncul di list.
        $query = AkunPengguna::withoutGlobalScope('lembaga')
            ->with(['role', 'faskes:id,nama,kota', 'tenagaAhli:id,nama', 'lembagas:id,nama', 'lembaga:id,nama'])
            ->orderBy('created_at', 'desc');

        // Auto-scope ke lembaga aktif session: lembaga_id default ATAU ada di pivot
        $sessionLembagaId = session('lembaga_id');
        if ($sessionLembagaId) {
            $query->where(function ($q) use ($sessionLembagaId) {
                $q->where('lembaga_id', $sessionLembagaId)
                  ->orWhereHas('lembagas', fn ($sq) => $sq->where('lembaga.id', $sessionLembagaId));
            });
        }

        if ($request->filled('q')) {
            $q = $request->string('q');
            $query->where(fn($sq) => $sq
                ->where('nama', 'like', "%{$q}%")
                ->orWhere('email', 'like', "%{$q}%")
                ->orWhere('username', 'like', "%{$q}%")
            );
        }
        if ($request->filled('status_akun')) {
            $query->where('status_akun', $request->string('status_akun'));
        }
        if ($request->filled('lembaga_id')) {
            // Override auto-scope: filter via pivot sesuai request
            $lembagaId = $request->string('lembaga_id');
            $query->where(function ($q) use ($lembagaId) {
                $q->where('lembaga_id', $lembagaId)
                  ->orWhereHas('lembagas', fn ($sq) => $sq->where('lembaga.id', $lembagaId));
            });
        }

        $perPage = min((int) $request->integer('per_page', 25), 50);
        $items = $query->paginate($perPage);

        // Tambahkan lembaga_ids + lembagas + lembaga (singular) ke setiap item
        $items->getCollection()->transform(function ($u) {
            $u->lembaga_ids = $u->lembagas->pluck('id')->all();
            // Jika lembagas (pivot) kosong, fallback ke lembaga_id tunggal
            if (empty($u->lembaga_ids) && $u->lembaga_id) {
                $u->lembaga_ids = [$u->lembaga_id];
            }
            return $u;
        });

        return response()->json($items);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules());

        $this->validateTenagaAhliForRole($data);

        $password = $data['password'] ?? Str::random(12);

        // lembaga_id (default) = lembaga pertama dari array lembaga_ids
        $lembagaIds = $this->resolveLembagaIds($data);
        $lembagaIds = $this->selaraskanLembagaDenganTenagaAhli($lembagaIds, $data);
        $defaultLembagaId = $lembagaIds[0] ?? null;

        $akun = AkunPengguna::create([
            'id' => (string) Str::uuid(),
            'role_id' => $data['role_id'],
            'faskes_id' => $data['faskes_id'] ?? null,
            'tenaga_ahli_id' => $data['tenaga_ahli_id'] ?? null,
            'nama' => $data['nama'],
            'username' => $data['username'] ?? null,
            'email' => $data['email'],
            'password_hash' => Hash::make($password),
            'status_akun' => $data['status_akun'] ?? 'Aktif',
            'failed_login_attempts' => 0,
            'locked_until' => null,
            'lembaga_id' => $defaultLembagaId,
            'created_at' => now(),
        ]);

        // Sync multi-lembaga ke pivot
        if (! empty($lembagaIds)) {
            $akun->lembagas()->sync($lembagaIds);
        }

        $this->audit->record('akun.create', null, $akun, 'AkunPengguna', $akun->id);

        $response = [
            'data' => [
                'id' => $akun->id,
                'nama' => $akun->nama,
                'email' => $akun->email,
                'role_id' => $akun->role_id,
                'status_akun' => $akun->status_akun,
                'lembaga_id' => $akun->lembaga_id,
                'lembaga_ids' => $akun->lembagas()->pluck('lembaga.id')->all(),
                'lembagas' => $akun->lembagas()->get(['lembaga.id', 'lembaga.nama'])->all(),
            ],
        ];

        // Return generated password only on creation
        if (! isset($data['password'])) {
            $response['generated_password'] = $password;
            $response['message'] = 'Akun berhasil dibuat. Password sementara: ' . $password;
        }

        return response()->json($response, 201);
    }

    public function show(Request $request, string $akun): JsonResponse
    {
        // Bypass trait scope agar user multi-lembaga yang lembaga_id default
        // ≠ session lembaga tapi ada di pivot tetap bisa di-load
        $id = $this->resolveId($request, $akun);
        $akun = AkunPengguna::withoutGlobalScope('lembaga')->findOrFail($id);
        $this->ensureLembagaAccess($akun);
        $akun->load(['role', 'lembagas', 'lembaga']);
        $akun->lembaga_ids = $akun->lembagas->pluck('id')->all();
        if (empty($akun->lembaga_ids) && $akun->lembaga_id) {
            $akun->lembaga_ids = [$akun->lembaga_id];
        }
        return response()->json(['data' => $akun]);
    }

    public function update(Request $request, string $akun): JsonResponse
    {
        // Bypass trait scope + manual lookup agar user multi-lembaga bisa di-edit
        $id = $this->resolveId($request, $akun);

        \Log::info('UPDATE AKUN', [
            'route_akun' => $akun,
            'resolved_id' => $id,
            'request_all' => $request->all(),
        ]);

        $akun = AkunPengguna::withoutGlobalScope('lembaga')->findOrFail($id);
        $this->ensureLembagaAccess($akun);

        \Log::info('UPDATE AKUN FOUND', ['akun_id' => $akun->id]);

        $data = $request->validate($this->rules($akun->id));

        $this->validateTenagaAhliForRole($data, $akun);

        $before = $akun->replicate();

        // lembaga_id (default) = lembaga pertama dari array lembaga_ids
        $lembagaIds = $this->resolveLembagaIds($data);
        $lembagaIds = $this->selaraskanLembagaDenganTenagaAhli($lembagaIds, $data);
        $defaultLembagaId = $lembagaIds[0] ?? null;

        $updateFields = [
            'role_id' => $data['role_id'],
            'faskes_id' => $data['faskes_id'] ?? null,
            'tenaga_ahli_id' => $data['tenaga_ahli_id'] ?? null,
            'nama' => $data['nama'],
            'username' => $data['username'] ?? null,
            'status_akun' => $data['status_akun'] ?? 'Aktif',
            'lembaga_id' => $defaultLembagaId,
        ];

        // Only update password if explicitly provided
        if (! empty($data['password'])) {
            $updateFields['password_hash'] = Hash::make($data['password']);
        }

        // If unlocking account
        if (isset($data['unlock']) && $data['unlock']) {
            $updateFields['failed_login_attempts'] = 0;
            $updateFields['locked_until'] = null;
        }

        $akun->forceFill($updateFields)->save();

        // Sync multi-lembaga ke pivot (replace existing)
        $akun->lembagas()->sync($lembagaIds);

        $this->audit->record('akun.update', $before, $akun->fresh(), 'AkunPengguna', $akun->id);

        $fresh = $akun->fresh();
        $fresh->lembaga_ids = $lembagaIds;
        $fresh->lembagas;
        return response()->json(['data' => $fresh->only(['id', 'nama', 'username', 'email', 'role_id', 'status_akun', 'locked_until', 'lembaga_id', 'lembaga_ids'])]);
    }

    public function destroy(Request $request, string $akun): JsonResponse
    {
        // Bypass trait scope + manual lookup agar user multi-lembaga bisa di-hapus
        $id = $this->resolveId($request, $akun);
        $akun = AkunPengguna::withoutGlobalScope('lembaga')->findOrFail($id);
        $this->ensureLembagaAccess($akun);
        $before = $akun->replicate();
        $akun->delete();
        $this->audit->record('akun.delete', $before, null, 'AkunPengguna', $before->id);
        return response()->json(['message' => 'Akun pengguna dihapus.']);
    }

    public function resetPassword(Request $request, string $akun): JsonResponse
    {
        // Bypass trait scope + manual lookup agar user multi-lembaga bisa di-reset
        $id = $this->resolveId($request, $akun);
        $akun = AkunPengguna::withoutGlobalScope('lembaga')->findOrFail($id);
        $this->ensureLembagaAccess($akun);

        $request->validate([
            'password' => 'nullable|string|min:8',
        ]);

        $password = $request->filled('password')
            ? $request->string('password')->toString()
            : Str::random(12);

        $before = $akun->replicate();
        $akun->forceFill([
            'password_hash' => Hash::make($password),
            'failed_login_attempts' => 0,
            'locked_until' => null,
        ])->save();

        $this->audit->record('akun.reset_password', $before, $akun->fresh(), 'AkunPengguna', $akun->id);

        return response()->json([
            'message' => 'Password berhasil direset.',
            'new_password' => $password,
        ]);
    }

    private function rules(?string $ignoreId = null): array
    {
        return [
            'nama' => 'required|string|max:255',
            'username' => [
                'nullable',
                'string',
                'max:50',
                function ($attribute, $value, $fail) use ($ignoreId) {
                    if (!$value) return;
                    $query = AkunPengguna::withoutGlobalScope('lembaga')
                        ->where('username', $value);
                    if ($ignoreId) {
                        $query->where('id', '!=', $ignoreId);
                    }
                    if ($query->exists()) {
                        $fail('Username sudah digunakan oleh akun lain.');
                    }
                },
            ],
            'email' => [
                'required',
                'email',
                function ($attribute, $value, $fail) use ($ignoreId) {
                    \Log::info('EMAIL VALIDATION', ['ignoreId' => $ignoreId, 'value' => $value]);
                    $query = AkunPengguna::withoutGlobalScope('lembaga')
                        ->where('email', $value);
                    if ($ignoreId) {
                        $query->where('id', '!=', $ignoreId);
                    }
                    if ($query->exists()) {
                        $fail('Email sudah digunakan oleh akun lain.');
                    }
                },
            ],
            'role_id' => 'required|uuid|exists:roles,id',
            'faskes_id' => 'nullable|uuid|exists:faskes,id',
            'tenaga_ahli_id' => 'nullable|uuid|exists:tenaga_ahli,id',
            // Multi-lembaga: array minimal 1 lembaga
            'lembaga_ids' => 'required|array|min:1',
            'lembaga_ids.*' => 'uuid|exists:lembaga,id',
            // legacy: lembaga_id tunggal (opsional, default = lembaga_ids[0])
            'lembaga_id' => 'nullable|uuid|exists:lembaga,id',
            'password' => 'nullable|string|min:8',
            'status_akun' => 'nullable|in:Aktif,Nonaktif,Terkunci',
            'unlock' => 'nullable|boolean',
        ];
    }

    /**
     * Guard lembaga: akun hanya bisa di-show/update/delete dari session
     * lembaga yang user admin ini punya akses. Akses = lembaga_id default
     * OR ada di pivot `akun_pengguna_lembaga`.
     *
     * Superadmin tanpa session lembaga: skip check.
     */
    private function ensureLembagaAccess(AkunPengguna $akun): void
    {
        $sessionLembagaId = session('lembaga_id');
        if ($sessionLembagaId === null) {
            // Superadmin tanpa pilihan lembaga: skip
            return;
        }

        $hasAccess = $akun->belongsToLembaga($sessionLembagaId);

        if (! $hasAccess) {
            abort(response()->json([
                'message' => 'Akun ini tidak memiliki akses ke lembaga Anda saat ini.',
            ], 404));
        }
    }

    /**
     * Resolve ID user dari route parameter dengan robust:
     * - Prioritas 1: ambil dari `request->route('akun')` (eksplisit, anti-matching-issue)
     * - Prioritas 2: ekstrak UUID dari string (kalau frontend kirim object JSON sebagai path)
     * - Validasi format UUID; kalau tidak valid → 404
     */
    private function resolveId(Request $request, ?string $param = null): string
    {
        // 1) Ambil dari route parameter eksplisit
        $routeId = $request->route('akun');
        if (is_string($routeId) && $routeId !== '') {
            $param = $routeId;
        }

        if (! is_string($param) || $param === '') {
            abort(response()->json(['message' => 'ID user tidak valid.'], 400));
        }

        // 2) Kalau param adalah JSON string (mis. frontend kirim object stringified),
        //    ekstrak field "id" dari JSON
        if (str_starts_with($param, '{')) {
            $decoded = json_decode($param, true);
            if (is_array($decoded) && isset($decoded['id']) && is_string($decoded['id'])) {
                $param = $decoded['id'];
            }
        }

        // 3) Validasi format UUID (Laravel Str::uuid())
        if (! preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $param)) {
            abort(response()->json(['message' => 'ID user bukan format UUID yang valid.'], 400));
        }

        return $param;
    }

    /**
     * Resolve daftar lembaga yang akan di-attach ke user.
     * Prioritas: lembaga_ids[] → lembaga_id (legacy) → existing data.
     */
    private function resolveLembagaIds(array $data): array
    {
        if (! empty($data['lembaga_ids'])) {
            return array_values(array_unique($data['lembaga_ids']));
        }
        if (! empty($data['lembaga_id'])) {
            return [$data['lembaga_id']];
        }
        return [];
    }

    /**
     * Selaraskan lembaga akun reksa dengan lembaga tenaga ahlinya.
     *
     * Reksa honor dibayar ke tenaga ahli reksa, jadi akun reksa dan
     * TA-nya harus satu lembaga. Bila TA reksa sudah punya lembaga,
     * lembaga itu ditambahkan (dan dijadikan default) daftar lembaga
     * akun —(account) reksa tidak boleh menunjuk TA lembaga lain.
     */
    private function selaraskanLembagaDenganTenagaAhli(array $lembagaIds, array $data): array
    {
        $roleId = $data['role_id'] ?? null;
        $tenagaAhliId = $data['tenaga_ahli_id'] ?? null;

        if (! $roleId || ! $tenagaAhliId) {
            return $lembagaIds;
        }

        $role = Role::find($roleId);
        if ($role?->nama_role !== 'Rekomendator') {
            return $lembagaIds;
        }

        $ta = TenagaAhli::withoutGlobalScope('lembaga')->find($tenagaAhliId);
        if (! $ta || ! $ta->lembaga_id) {
            return $lembagaIds;
        }

        if (! in_array($ta->lembaga_id, $lembagaIds, true)) {
            // TA reksa milik lembaga lain → samakan dengan TA, dan jadikan
            // default supaya session user mengarah ke lembaga yang benar.
            array_unshift($lembagaIds, $ta->lembaga_id);
        } elseif ($lembagaIds[0] !== $ta->lembaga_id) {
            $lembagaIds = array_values(array_unique(array_merge([$ta->lembaga_id], $lembagaIds)));
        }

        return $lembagaIds;
    }

    /**
     * FR-3.6: Untuk Role Surveior/Verifikator, tenaga_ahli_id WAJIB diisi.
     * Validate at create/update time.
     */
    private function validateTenagaAhliForRole(array $data, ?AkunPengguna $existingAccount = null): void
    {
        $roleId = $data['role_id'] ?? $existingAccount?->role_id;
        if (! $roleId) {
            return;
        }

        $role = Role::find($roleId);
        if (! $role) {
            return;
        }

        $surveiorVerifikatorRoles = ['Surveior', 'Verifikator'];
        $needsTenagaAhli = in_array($role->nama_role, $surveiorVerifikatorRoles, true);
        $hasTenagaAhli = ! empty($data['tenaga_ahli_id']);

        if ($needsTenagaAhli && ! $hasTenagaAhli) {
            abort(response()->json([
                'message' => "Akun dengan Role '{$role->nama_role}' wajib terkait ke record Tenaga Ahli (nomor_induk_surveior).",
                'errors' => [
                    'tenaga_ahli_id' => ["Field ini wajib diisi untuk Akun dengan Role {$role->nama_role}."],
                ],
            ], 422));
        }

        // Validate tenaga_ahli has nomor_induk_surveior
        if ($hasTenagaAhli) {
            $ta = TenagaAhli::find($data['tenaga_ahli_id']);
            if (! $ta || empty($ta->nomor_induk_surveior)) {
                abort(response()->json([
                    'message' => 'Tenaga Ahli yang dipilih tidak memiliki nomor_induk_surveior. Pastikan data tenaga ahli sudah lengkap.',
                    'errors' => [
                        'tenaga_ahli_id' => ['Tenaga Ahli harus memiliki nomor_induk_surveior yang valid.'],
                    ],
                ], 422));
            }
        }
    }

    /**
     * GET /api/master/akun/template
     * Download CSV template for batch import.
     */
    public function template(): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="template_akun.csv"',
        ];

        $columns = ['nama', 'username', 'email', 'role_nama', 'faskes_id', 'tenaga_ahli_nik', 'password', 'status_akun'];

        $callback = function () use ($columns) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, $columns);
            fputcsv($handle, [
                'Ahmad Fauzi', 'ahmad_fauzi', 'ahmad@email.com', 'Admin',
                '', '', 'password123', 'Aktif',
            ]);
            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * POST /api/master/akun/import
     * Batch import akun pengguna dari CSV.
     */
    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:5120',
        ]);

        $file = $request->file('file');
        $handle = fopen($file->getRealPath(), 'r');

        $headers = fgetcsv($handle);
        if (! $headers) {
            fclose($handle);
            return response()->json(['message' => 'File CSV tidak valid atau kosong.'], 422);
        }
        $headers = array_map(fn ($h) => trim(strtolower($h)), $headers);

        $results = ['success' => 0, 'failed' => 0, 'rows' => []];
        $rowNumber = 1;

        while (($row = fgetcsv($handle)) !== false) {
            $rowNumber++;
            if (count($row) === 1 && empty(trim($row[0]))) continue;

            $data = array_combine($headers, $row);
            if (! $data) {
                $results['rows'][] = ['row' => $rowNumber, 'status' => 'failed', 'message' => 'Format baris tidak valid.'];
                $results['failed']++;
                continue;
            }

            $errors = [];
            $nama = trim($data['nama'] ?? '');
            $username = trim($data['username'] ?? '');
            $email = trim($data['email'] ?? '');
            $roleNama = trim($data['role_nama'] ?? '');
            $faskesId = trim($data['faskes_id'] ?? '');
            $taNik = trim($data['tenaga_ahli_nik'] ?? '');
            $passwordRaw = trim($data['password'] ?? '');
            $status = trim($data['status_akun'] ?? 'Aktif');

            if (empty($nama)) $errors[] = 'nama wajib diisi.';
            if (empty($email)) $errors[] = 'email wajib diisi.';
            if (empty($roleNama)) $errors[] = 'role_nama wajib diisi.';
            if (! filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'format email tidak valid.';
            if (! in_array($status, ['Aktif', 'Nonaktif', 'Terkunci'], true)) $errors[] = "status_aktif harus Aktif, Nonaktif, atau Terkunci.";

            if (! empty($errors)) {
                $results['rows'][] = [
                    'row' => $rowNumber, 'status' => 'failed',
                    'nama' => $nama ?: '?', 'email' => $email ?: '?',
                    'message' => implode(' ', $errors),
                ];
                $results['failed']++;
                continue;
            }

            // Validate username uniqueness if provided
            if (! empty($username) && AkunPengguna::where('username', $username)->exists()) {
                $results['rows'][] = [
                    'row' => $rowNumber, 'status' => 'failed',
                    'nama' => $nama, 'email' => $email,
                    'message' => "username '$username' sudah digunakan.",
                ];
                $results['failed']++;
                continue;
            }

            if (AkunPengguna::where('email', $email)->exists()) {
                $results['rows'][] = [
                    'row' => $rowNumber, 'status' => 'failed',
                    'nama' => $nama, 'email' => $email,
                    'message' => "Email '$email' sudah digunakan.",
                ];
                $results['failed']++;
                continue;
            }

            $role = Role::where('nama_role', $roleNama)->first();
            if (! $role) {
                $results['rows'][] = [
                    'row' => $rowNumber, 'status' => 'failed',
                    'nama' => $nama, 'email' => $email,
                    'message' => "Role '$roleNama' tidak ditemukan.",
                ];
                $results['failed']++;
                continue;
            }

            $faskesIdResolved = null;
            if (! empty($faskesId)) {
                $faskes = Faskes::find($faskesId);
                if (! $faskes) {
                    $results['rows'][] = [
                        'row' => $rowNumber, 'status' => 'failed',
                        'nama' => $nama, 'email' => $email,
                        'message' => "faskes_id '$faskesId' tidak ditemukan.",
                    ];
                    $results['failed']++;
                    continue;
                }
                $faskesIdResolved = $faskes->id;
            }

            $taIdResolved = null;
            if (! empty($taNik)) {
                $ta = TenagaAhli::where('nomor_induk_surveior', $taNik)->first();
                if (! $ta) {
                    $results['rows'][] = [
                        'row' => $rowNumber, 'status' => 'failed',
                        'nama' => $nama, 'email' => $email,
                        'message' => "tenaga_ahli_nik '$taNik' tidak ditemukan di master tenaga ahli.",
                    ];
                    $results['failed']++;
                    continue;
                }
                $taIdResolved = $ta->id;
            }

            if (in_array($role->nama_role, ['Surveior', 'Verifikator'], true) && ! $taIdResolved) {
                $results['rows'][] = [
                    'row' => $rowNumber, 'status' => 'failed',
                    'nama' => $nama, 'email' => $email,
                    'message' => "Akun dengan role '$role->nama_role' wajib terkait ke tenaga ahli (tenaga_ahli_nik).",
                ];
                $results['failed']++;
                continue;
            }

            try {
                $password = $passwordRaw ?: Str::random(12);
                $akun = AkunPengguna::create([
                    'id' => (string) Str::uuid(),
                    'role_id' => $role->id,
                    'faskes_id' => $faskesIdResolved,
                    'tenaga_ahli_id' => $taIdResolved,
                    'nama' => $nama,
                    'username' => $username ?: null,
                    'email' => $email,
                    'password_hash' => Hash::make($password),
                    'status_akun' => $status,
                    'failed_login_attempts' => 0,
                    'locked_until' => null,
                    'created_at' => now(),
                ]);

                $this->audit->record('akun.create', null, $akun, 'AkunPengguna', $akun->id);

                $results['rows'][] = [
                    'row' => $rowNumber, 'status' => 'success',
                    'nama' => $nama, 'email' => $email,
                    'message' => 'Akun berhasil diimport.',
                ];
                $results['success']++;
            } catch (\Throwable $e) {
                $results['rows'][] = [
                    'row' => $rowNumber, 'status' => 'failed',
                    'nama' => $nama, 'email' => $email,
                    'message' => 'Error: ' . $e->getMessage(),
                ];
                $results['failed']++;
            }
        }

        fclose($handle);

        return response()->json([
            'message' => "Import selesai. {$results['success']} berhasil, {$results['failed']} gagal.",
            'results' => $results,
        ]);
    }
}
