<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AkunPengguna;
use App\Models\Role;
use App\Models\TenagaAhli;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * CRUD for Master Data Tenaga Ahli (Surveior / Verifikator).
 * Privilege: Master Data / [Lihat|Tambah|Ubah|Hapus]
 *
 * FR-NFR: Saat membuat tenaga ahli, opsi "Buat Akun Login" memungkinkan
 * pembuatan AkunPengguna sekaligus agar tidak perlu input dua kali.
 */
class MasterTenagaAhliController extends Controller
{
    public function __construct(private AuditService $audit) {}

    public function index(Request $request): JsonResponse
    {
        $query = TenagaAhli::with('akunPengguna');

        // Override global scope jika user kirim lembaga_id eksplisit
        // (untuk superadmin yang ingin filter per lembaga via dropdown)
        if ($request->filled('lembaga_id')) {
            $query->withoutGlobalScope('lembaga')
                ->where('lembaga_id', $request->string('lembaga_id'));
        }

        if ($request->filled('q')) {
            $q = $request->string('q')->toString();
            $query->where(function ($w) use ($q) {
                $w->where('nama', 'like', "%{$q}%")
                  ->orWhere('nomor_induk_surveior', 'like', "%{$q}%");
            });
        }
        if ($request->filled('peran')) {
            $query->where('peran', $request->string('peran'));
        }
        if ($request->filled('jenis')) {
            $query->where('jenis', $request->string('jenis'));
        }
        if ($request->filled('status_aktif')) {
            $query->where('status_aktif', $request->string('status_aktif'));
        }

        $list = $query
            ->orderBy('nama')
            ->limit(200)
            ->get()
            ->map(fn ($t) => array_merge($t->only([
                'id', 'nomor_induk_surveior', 'nama', 'no_wa', 'peran', 'jenis',
                'status_aktif', 'status_penugasan_saat_ini', 'batas_penugasan_per_periode',
                'npwp', 'nik', 'nama_pajak', 'kode_objek_pajak',
                'status_ptkp', 'kode_kpp',
            ]), [
                'has_akun' => $t->akunPengguna->count() > 0,
                'akun_email' => $t->akunPengguna->first()?->email,
                'akun_username' => $t->akunPengguna->first()?->username,
                'akun_id' => $t->akunPengguna->first()?->id,
                'no_rekening' => $t->no_rekening,
                'nama_bank' => $t->nama_bank,
                'atas_nama_rekening' => $t->atas_nama_rekening,
            ]));

        return response()->json(['data' => $list]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateData($request);

        $ta = TenagaAhli::create(array_merge($data, [
            'id' => (string) Str::uuid(),
            'status_penugasan_saat_ini' => TenagaAhli::STATUS_TIDAK_BERTUGAS,
        ]));

        $this->audit->log('tenaga_ahli.created', 'tenaga_ahli', $ta->id, ['nama' => $ta->nama]);

        $result = ['data' => $ta];

        // Buat akun login sekaligus jika diminta
        if (($data['buat_akun'] ?? false) && ! empty($data['email'])) {
            $akunResult = $this->createAkun($ta, $data);
            if ($akunResult instanceof JsonResponse) {
                // rollback tenaga ahli if akun gagal
                $ta->delete();
                return $akunResult;
            }
            $result['akun'] = $akunResult['akun'];
            $result['generated_password'] = $akunResult['generated_password'];
        }

        return response()->json($result, 201);
    }

    public function update(Request $request, TenagaAhli $tenagaAhli): JsonResponse
    {
        $data = $this->validateData($request, $tenagaAhli->id);

        $tenagaAhli->update($data);
        $this->audit->log('tenaga_ahli.updated', 'tenaga_ahli', $tenagaAhli->id, ['nama' => $tenagaAhli->nama]);

        $result = ['data' => $tenagaAhli->fresh()];

        // Buat akun login sekaligus jika diminta (untuk update yang belum punya akun)
        if (($data['buat_akun'] ?? false)
            && ! empty($data['email'])
            && ! $tenagaAhli->akunPengguna()->exists()
        ) {
            $akunResult = $this->createAkun($tenagaAhli, $data);
            if ($akunResult instanceof JsonResponse) {
                return $akunResult;
            }
            $result['akun'] = $akunResult['akun'];
            $result['generated_password'] = $akunResult['generated_password'];
        }

        return response()->json($result);
    }

    public function destroy(TenagaAhli $tenagaAhli): JsonResponse
    {
        // Jika sudah ada penugasan, tidak bisa dihapus
        if ($tenagaAhli->penugasan()->exists()) {
            return response()->json([
                'message' => 'Tidak dapat menghapus tenaga ahli yang sudah memiliki penugasan.',
            ], 422);
        }

        // Hapus akun pengguna yang terhubung jika ada
        if ($tenagaAhli->akunPengguna()->exists()) {
            $tenagaAhli->akunPengguna()->delete();
        }

        $tenagaAhli->delete();
        $this->audit->log('tenaga_ahli.deleted', 'tenaga_ahli', $tenagaAhli->id);

        return response()->json(['message' => 'Tenaga ahli berhasil dihapus.']);
    }

    /**
     * Buat AkunPengguna yang linked ke tenaga ahli yang baru dibuat.
     */
    private function createAkun(TenagaAhli $ta, array $data): array|JsonResponse
    {
        // Cari role berdasarkan peran tenaga ahli
        $roleName = match ($ta->peran) {
            'surveior' => 'Surveior',
            'verifikator' => 'Verifikator',
            'rekomendator' => 'Rekomendator',
            'kedua' => $data['role_id']
                ? null // akan pakai role_id yang dipilih user
                : 'Surveior',
            default => null,
        };

        $roleId = $data['role_id'] ?? null;

        if (! $roleId && $roleName) {
            $role = Role::where('nama_role', $roleName)->first();
            if (! $role) {
                return response()->json([
                    'message' => "Role '{$roleName}' tidak ditemukan. Pastikan role Surveior/Verifikator/Rekomendator sudah ada di sistem.",
                ], 422)->throwResponse();
            }
            $roleId = $role->id;
        }

        if (! $roleId) {
            return response()->json([
                'message' => 'Role akun wajib dipilih saat membuat akun login.',
            ], 422)->throwResponse();
        }

        // Cek email unik
        $existingEmail = AkunPengguna::where('email', $data['email'])->exists();
        if ($existingEmail) {
            return response()->json([
                'message' => "Email {$data['email']} sudah digunakan oleh akun lain.",
                'errors' => ['email' => ['Email sudah digunakan oleh akun lain.']],
            ], 422)->throwResponse();
        }

        $password = $data['password'] ?? Str::random(12);

        $akun = AkunPengguna::create([
            'id' => (string) Str::uuid(),
            'role_id' => $roleId,
            'tenaga_ahli_id' => $ta->id,
            'faskes_id' => null,
            'nama' => $ta->nama,
            'email' => $data['email'],
            'password_hash' => Hash::make($password),
            'status_akun' => 'Aktif',
            'failed_login_attempts' => 0,
            'locked_until' => null,
            'lembaga_id' => $ta->lembaga_id,
            'created_at' => now(),
        ]);

        // Akun harus punya akses lemma agar muncul di daftar kandidat
        // reksa / pemilihan default reksa (filter by lemma_id + pivot).
        if ($ta->lembaga_id) {
            $akun->lembagas()->sync([$ta->lembaga_id]);
        }

        $this->audit->log('akun.create', 'AkunPengguna', $akun->id);

        return [
            'akun' => [
                'id' => $akun->id,
                'email' => $akun->email,
                'role_id' => $akun->role_id,
                'status_akun' => $akun->status_akun,
            ],
            'generated_password' => $password,
        ];
    }

    private function validateData(Request $request, ?string $id = null): array
    {
        $nikRule = ['required', 'string', 'max:30'];
        if ($id) {
            $nikRule[] = Rule::unique('tenaga_ahli', 'nomor_induk_surveior')
                ->ignore($id)
                ->where('lembaga_id', $request->input('lembaga_id'));
        } else {
            $nikRule[] = Rule::unique('tenaga_ahli', 'nomor_induk_surveior')
                ->where('lembaga_id', $request->input('lembaga_id'));
        }

        $rules = [
            'nomor_induk_surveior' => $nikRule,
            'nama' => 'required|string|max:255',
            'no_wa' => 'nullable|string|max:20|regex:/^[0-9+\-\s()]*$/',
            'peran' => 'required|string|in:surveior,verifikator,rekomendator,kedua',
            'jenis' => 'nullable|string|in:TKPP,TKSDU',
            'status_aktif' => 'required|string|in:Aktif,Nonaktif,Cuti,Resign',
            'batas_penugasan_per_periode' => 'nullable|integer|min:0',
            'lembaga_id' => 'required|uuid|exists:lembaga,id',
            // FR-5.8: NPWP & NIK untuk bukti potong PPh 21
            'npwp' => ['nullable', 'string', 'max:30', new \App\Rules\IndonesianNpwp()],
            'nik' => ['nullable', 'string', 'max:20', 'regex:/^\d{16}$/'],
            'nama_pajak' => 'nullable|string|max:255',
            'alamat_pajak' => 'nullable|string|max:500',
            'kota_pajak' => 'nullable|string|max:100',
            'kode_objek_pajak' => 'nullable|string|max:10',
            // FR-5.9 — identitas pajak untuk bukti potong BP21
            'status_ptkp' => ['nullable', 'string', Rule::in(TenagaAhli::STATUS_PTKP_OPTIONS)],
            'kode_kpp' => ['nullable', 'string', 'max:10', 'regex:/^\d{1,10}$/'],
            'no_rekening' => 'nullable|string|max:50',
            'nama_bank' => 'nullable|string|max:100',
            'atas_nama_rekening' => 'nullable|string|max:100',
            // Opsi buat akun login
            'buat_akun' => 'nullable|boolean',
            'email' => [
                'nullable',
                'email',
                'max:255',
                Rule::unique('akun_pengguna', 'email'),
            ],
            'password' => 'nullable|string|min:8',
            'role_id' => 'nullable|uuid|exists:roles,id',
        ];

        $data = $request->validate($rules);

        // Validasi tambahan: email wajib jika buat_akun
        if (($data['buat_akun'] ?? false) && empty($data['email'])) {
            $request->validate([
                'email' => 'required|email|max:255',
            ]);
        }

        // Bump verifikasi timestamp bila NPWP diisi
        if (! empty($data['npwp'])) {
            $data['npwp_diverifikasi_at'] = now();
        }

        return $data;
    }

    /**
     * GET /api/master/tenaga-ahli/template
     * Download CSV template for batch import.
     */
    public function template(): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="template_tenaga_ahli.csv"',
        ];

        $columns = [
            'nomor_induk_surveior', 'nama', 'no_wa', 'peran', 'jenis',
            'status_aktif', 'batas_penugasan_per_periode',
            'npwp', 'nik', 'nama_pajak', 'alamat_pajak', 'kota_pajak',
            'kode_objek_pajak', 'status_ptkp', 'kode_kpp',
            'no_rekening', 'nama_bank', 'atas_nama_rekening',
            'buat_akun', 'username', 'email', 'password', 'role_nama',
        ];

        $callback = function () use ($columns) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, $columns);
            // Example row
            fputcsv($handle, [
                'NS-0001', 'Dr. Budi Santoso', '081234567890', 'surveior', 'TKPP',
                'Aktif', '5',
                '', '', '', '', '', '', 'TK/0', '',
                '', '', '',
                'ya', 'budi_santoso', 'budi@email.com', '', 'Surveior',
            ]);
            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * POST /api/master/tenaga-ahli/import
     * Batch import tenaga ahli from CSV.
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

        // Normalize header names
        $headers = array_map(fn ($h) => trim(strtolower($h)), $headers);

        $results = ['success' => 0, 'failed' => 0, 'rows' => []];
        $rowNumber = 1;

        while (($row = fgetcsv($handle)) !== false) {
            $rowNumber++;
            if (count($row) === 1 && empty(trim($row[0]))) {
                continue; // skip blank rows
            }

            $data = array_combine($headers, $row);
            if (! $data) {
                $results['rows'][] = ['row' => $rowNumber, 'status' => 'failed', 'message' => 'Format baris tidak valid.'];
                $results['failed']++;
                continue;
            }

            // Validate required fields
            $errors = [];

            $nik = trim($data['nomor_induk_surveior'] ?? '');
            $nama = trim($data['nama'] ?? '');
            $peran = strtolower(trim($data['peran'] ?? ''));
            $status = trim($data['status_aktif'] ?? '');

            if (empty($nik)) $errors[] = 'nomor_induk_surveior wajib diisi.';
            if (empty($nama)) $errors[] = 'nama wajib diisi.';
            if (! in_array($peran, ['surveior', 'verifikator', 'rekomendator', 'kedua'], true)) $errors[] = "peran harus surveior, verifikator, rekomendator, atau keduanya. Nilai '$peran' tidak valid.";
            if (! in_array($status, ['Aktif', 'Nonaktif', 'Cuti', 'Resign'], true)) $errors[] = "status_aktif harus Aktif, Nonaktif, Cuti, atau Resign.";

            // Validate NPWP if provided
            $npwp = trim($data['npwp'] ?? '');
            if (! empty($npwp)) {
                $npwpClean = preg_replace('/[^0-9]/', '', $npwp);
                if (strlen($npwpClean) !== 15) {
                    $errors[] = 'NPWP harus 15 digit.';
                }
            }

            // Validate NIK if provided
            $nikKtp = trim($data['nik'] ?? '');
            if (! empty($nikKtp)) {
                if (! preg_match('/^\d{16}$/', $nikKtp)) {
                    $errors[] = 'NIK harus 16 digit.';
                }
            }

            // Validate buat_akun
            $buatAkun = strtolower(trim($data['buat_akun'] ?? ''));
            if (! empty($buatAkun) && ! in_array($buatAkun, ['ya', 'tidak', '1', '0', 'yes', 'no'], true)) {
                $errors[] = "buat_akun harus ya/tidak.";
            }

            // Validate username uniqueness if provided
            $username = trim($data['username'] ?? '');
            if (! empty($username) && AkunPengguna::where('username', $username)->exists()) {
                $errors[] = "username '$username' sudah digunakan.";
            }

            if (! empty($errors)) {
                $results['rows'][] = [
                    'row' => $rowNumber,
                    'status' => 'failed',
                    'nik' => $nik ?: '?',
                    'nama' => $nama ?: '?',
                    'message' => implode(' ', $errors),
                ];
                $results['failed']++;
                continue;
            }

            // Check duplicate NIK
            $exists = TenagaAhli::where('nomor_induk_surveior', $nik)->exists();
            if ($exists) {
                $results['rows'][] = [
                    'row' => $rowNumber,
                    'status' => 'failed',
                    'nik' => $nik,
                    'nama' => $nama,
                    'message' => "nomor_induk_surveior '$nik' sudah terdaftar.",
                ];
                $results['failed']++;
                continue;
            }

            try {
                $batas = trim($data['batas_penugasan_per_periode'] ?? '');
                $jenis = strtoupper(trim($data['jenis'] ?? ''));
                if (! in_array($jenis, ['TKPP', 'TKSDU', ''], true)) $jenis = '';

                $ta = TenagaAhli::create([
                    'id' => (string) Str::uuid(),
                    'nomor_induk_surveior' => $nik,
                    'nama' => $nama,
                    'no_wa' => trim($data['no_wa'] ?? '') ?: null,
                    'peran' => $peran,
                    'jenis' => $peran === 'rekomendator' ? null : ($jenis ?: null),
                    'status_aktif' => $status,
                    'status_penugasan_saat_ini' => TenagaAhli::STATUS_TIDAK_BERTUGAS,
                    'batas_penugasan_per_periode' => is_numeric($batas) ? (int) $batas : null,
                    'npwp' => $npwp ?: null,
                    'nik' => $nikKtp ?: null,
                    'nama_pajak' => trim($data['nama_pajak'] ?? '') ?: null,
                    'alamat_pajak' => trim($data['alamat_pajak'] ?? '') ?: null,
                    'kota_pajak' => trim($data['kota_pajak'] ?? '') ?: null,
                    'kode_objek_pajak' => trim($data['kode_objek_pajak'] ?? '') ?: null,
                    'status_ptkp' => trim($data['status_ptkp'] ?? '') ?: null,
                    'kode_kpp' => trim($data['kode_kpp'] ?? '') ?: null,
                    'no_rekening' => trim($data['no_rekening'] ?? '') ?: null,
                    'nama_bank' => trim($data['nama_bank'] ?? '') ?: null,
                    'atas_nama_rekening' => trim($data['atas_nama_rekening'] ?? '') ?: null,
                ]);

                $this->audit->log('tenaga_ahli.created', 'tenaga_ahli', $ta->id, [
                    'nama' => $ta->nama,
                    'sumber' => 'import_csv',
                ]);

                // Buat akun jika diminta
                $akunCreated = null;
                $generatedPassword = null;
                if (in_array($buatAkun, ['ya', '1', 'yes'], true)) {
                    $email = trim($data['email'] ?? '');
                    $passwordRaw = trim($data['password'] ?? '');
                    $roleName = trim($data['role_nama'] ?? '');

                    if (! empty($email) && ! AkunPengguna::where('email', $email)->exists()) {
                        $roleId = null;
                        if (! empty($roleName)) {
                            $role = Role::where('nama_role', $roleName)->first();
                            $roleId = $role?->id;
                        }
                        if (! $roleId) {
                            // Auto-match by peran
                            $roleNameByPeran = match ($peran) {
                                'surveior' => 'Surveior',
                                'verifikator' => 'Verifikator',
                                'rekomendator' => 'Rekomendator',
                                default => null,
                            };
                            if ($roleNameByPeran) {
                                $role = Role::where('nama_role', $roleNameByPeran)->first();
                                $roleId = $role?->id;
                            }
                        }

                        if ($roleId) {
                            $generatedPassword = $passwordRaw ?: Str::random(12);
                            $akun = AkunPengguna::create([
                                'id' => (string) Str::uuid(),
                                'role_id' => $roleId,
                                'tenaga_ahli_id' => $ta->id,
                                'faskes_id' => null,
                                'nama' => $ta->nama,
                                'username' => $username ?: null,
                                'email' => $email,
                                'password_hash' => Hash::make($generatedPassword),
                                'status_akun' => 'Aktif',
                                'failed_login_attempts' => 0,
                                'locked_until' => null,
                                'lembaga_id' => $ta->lembaga_id,
                                'created_at' => now(),
                            ]);
                            if ($ta->lembaga_id) {
                                $akun->lembagas()->sync([$ta->lembaga_id]);
                            }
                            $this->audit->log('akun.create', 'AkunPengguna', $akun->id);
                            $akunCreated = $email;
                        }
                    }
                }

                $results['rows'][] = [
                    'row' => $rowNumber,
                    'status' => 'success',
                    'nik' => $nik,
                    'nama' => $nama,
                    'message' => 'Berhasil diimport.',
                    'akun' => $akunCreated ? "Akun dibuat: $akunCreated" : null,
                ];
                $results['success']++;
            } catch (\Throwable $e) {
                $results['rows'][] = [
                    'row' => $rowNumber,
                    'status' => 'failed',
                    'nik' => $nik ?: '?',
                    'nama' => $nama ?: '?',
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
