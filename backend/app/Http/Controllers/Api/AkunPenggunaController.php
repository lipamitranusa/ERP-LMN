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
        $query = AkunPengguna::with(['role', 'faskes:id,nama,kota', 'tenagaAhli:id,nama'])->orderBy('created_at', 'desc');

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

        $perPage = min((int) $request->integer('per_page', 25), 50);
        $items = $query->paginate($perPage);

        return response()->json($items);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules());

        $this->validateTenagaAhliForRole($data);

        $password = $data['password'] ?? Str::random(12);

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
            'created_at' => now(),
        ]);

        $this->audit->record('akun.create', null, $akun, 'AkunPengguna', $akun->id);

        $response = [
            'data' => [
                'id' => $akun->id,
                'nama' => $akun->nama,
                'email' => $akun->email,
                'role_id' => $akun->role_id,
                'status_akun' => $akun->status_akun,
            ],
        ];

        // Return generated password only on creation
        if (! isset($data['password'])) {
            $response['generated_password'] = $password;
            $response['message'] = 'Akun berhasil dibuat. Password sementara: ' . $password;
        }

        return response()->json($response, 201);
    }

    public function show(AkunPengguna $akun): JsonResponse
    {
        $akun->load('role');
        return response()->json(['data' => $akun]);
    }

    public function update(Request $request, AkunPengguna $akun): JsonResponse
    {
        $data = $request->validate($this->rules($akun->id));

        $this->validateTenagaAhliForRole($data, $akun);

        $before = $akun->replicate();

        $updateFields = [
            'role_id' => $data['role_id'],
            'faskes_id' => $data['faskes_id'] ?? null,
            'tenaga_ahli_id' => $data['tenaga_ahli_id'] ?? null,
            'nama' => $data['nama'],
            'username' => $data['username'] ?? null,
            'status_akun' => $data['status_akun'] ?? 'Aktif',
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
        $this->audit->record('akun.update', $before, $akun->fresh(), 'AkunPengguna', $akun->id);

        return response()->json(['data' => $akun->fresh()->only(['id', 'nama', 'username', 'email', 'role_id', 'status_akun', 'locked_until'])]);
    }

    public function destroy(AkunPengguna $akun): JsonResponse
    {
        $before = $akun->replicate();
        $akun->delete();
        $this->audit->record('akun.delete', $before, null, 'AkunPengguna', $before->id);
        return response()->json(['message' => 'Akun pengguna dihapus.']);
    }

    public function resetPassword(Request $request, AkunPengguna $akun): JsonResponse
    {
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
        $uniqueEmail = $ignoreId
            ? "required|email|unique:akun_pengguna,email,{$ignoreId}"
            : 'required|email|unique:akun_pengguna,email';
        $uniqueUsername = $ignoreId
            ? "nullable|string|max:50|unique:akun_pengguna,username,{$ignoreId}"
            : 'nullable|string|max:50|unique:akun_pengguna,username';

        return [
            'nama' => 'required|string|max:255',
            'username' => $uniqueUsername,
            'email' => $uniqueEmail,
            'role_id' => 'required|uuid|exists:roles,id',
            'faskes_id' => 'nullable|uuid|exists:faskes,id',
            'tenaga_ahli_id' => 'nullable|uuid|exists:tenaga_ahli,id',
            'password' => 'nullable|string|min:8',
            'status_akun' => 'nullable|in:Aktif,Nonaktif,Terkunci',
            'unlock' => 'nullable|boolean',
        ];
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
