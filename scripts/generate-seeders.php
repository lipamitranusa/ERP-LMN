<?php
/**
 * Regenerate file seeder dari isi database saat ini.
 *
 * Usage: php scripts/generate-seeders.php
 *
 * Semua seeder ditulis lewat DB::table() (bukan Eloquent) supaya:
 * - kolom json/jsonb ditulis apa adanya, tidak di-encode dua kali
 *   oleh cast 'array' di model,
 * - created_at/updated_at tidak ditimpa auto-timestamp Eloquent,
 * - field di luar $fillable model tetap tertulis.
 */

require __DIR__ . '/../backend/vendor/autoload.php';

$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$outDir = __DIR__ . '/../backend/database/seeders/';
if (!is_dir($outDir)) {
    mkdir($outDir, true);
}

// Hapus semua file seeder (kecuali DatabaseSeeder.php yang akan di-replace)
foreach (glob($outDir . '*.php') as $f) {
    if (basename($f) !== 'DatabaseSeeder.php') {
        unlink($f);
    }
}

// Ambil info nullability kolom supaya nilai NULL bisa ditulis eksplisit
// (kolom NOT NULL dilewati agar default DB yang berlaku)
$nullableMap = [];
foreach (\Illuminate\Support\Facades\DB::select("
    SELECT table_name, column_name, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
") as $col) {
    $nullableMap[$col->table_name][$col->column_name] = ($col->is_nullable === 'YES');
}

// deleted_at tidak ada di DB, tapi sisanya (created_at/updated_at) ikut
// di-seed supaya data hasil seeder identik dengan DB sekarang.
$tsFields = ['deleted_at'];

// Tabel yang perlu treatment khusus
$specialTables = [
    'akun_pengguna' => function (array $row): array {
        // Password: hash password default saat runtime, bukan copy hash live
        // Ini menghindari expose credential di committed seeder
        $row['password_hash'] = \Illuminate\Support\Facades\Hash::make('password');
        return $row;
    },
];

// Convert value ke PHP expression (boolean, int, float, string)
function toPhpExpr($value): string {
    global $tsFields;
    if (is_null($value)) {
        return 'null';
    }
    if (is_bool($value)) {
        return $value ? 'true' : 'false';
    }
    if (is_int($value)) {
        return (string) $value;
    }
    if (is_float($value)) {
        return (string) $value;
    }
    // String: var_export menghasilkan PHP single-quoted string yang valid
    // (escape ' dan \ dengan benar, newline tetap literal di dalam kutip).
    return var_export((string) $value, true);
}

// Convert row array ke PHP array string
function rowToPhpArray(array $row, array $nullableCols = []): string {
    global $tsFields;
    $pairs = [];
    foreach ($row as $key => $value) {
        if (in_array($key, $tsFields, true)) {
            continue;
        }
        if (is_null($value)) {
            // Kolom NOT NULL: lewati agar default DB yang berlaku
            // Kolom nullable: tulis null eksplisit supaya akurat
            if (!($nullableCols[$key] ?? false)) {
                continue;
            }
        }
        $valExpr = toPhpExpr($value);
        $pairs[] = "            '$key' => $valExpr,";
    }
    if (empty($pairs)) {
        return '[]';
    }
    return "[\n" . implode("\n", $pairs) . "\n        ]";
}

$seedingOrder = [
    'roles',
    'menu_actions',
    'role_privileges',
    'lembaga',
    'jenis_faskes',
    'faskes',
    'tenaga_ahli',
    'kategori_jurnal',
    'coa',
    'konfigurasi_pajak',
    'master_biaya_tenaga_ahli',
    'biaya_per_jenis_faskes',
    'siklus_akreditasi',
    'pks',
    'invoice',
    'invoice_items',
    'penugasan',
    'surat_tugas',
    'histori_antrian_penugasan',
    'dokumen_permohonan',
    'checklist_validasi',
    'laporan_pengerjaan',
    'konfigurasi_penugasan',
    'akun_pengguna',
    'akun_pengguna_lembaga',
    'pks_templates',
    'payment_settings',
    'mail_settings',
    'whatsapp_settings',
];

$modelMap = [
    'roles'                      => 'App\\Models\\Role',
    'menu_actions'               => 'App\\Models\\MenuAction',
    'role_privileges'            => 'App\\Models\\RolePrivilege',
    'lembaga'                    => 'App\\Models\\Lembaga',
    'jenis_faskes'               => 'App\\Models\\JenisFaskes',
    'faskes'                     => 'App\\Models\\Faskes',
    'tenaga_ahli'               => 'App\\Models\\TenagaAhli',
    'kategori_jurnal'           => 'App\\Models\\KategoriJurnal',
    'coa'                        => 'App\\Models\\Coa',
    'konfigurasi_pajak'         => 'App\\Models\\KonfigurasiPajak',
    'master_biaya_tenaga_ahli'  => 'App\\Models\\MasterBiayaTenagaAhli',
    'biaya_per_jenis_faskes'    => 'App\\Models\\BiayaPerJenisFaskes',
    'siklus_akreditasi'         => 'App\\Models\\SiklusAkreditasi',
    'pks'                        => 'App\\Models\\Pks',
    'invoice'                    => 'App\\Models\\Invoice',
    'invoice_items'              => 'App\\Models\\InvoiceItem',
    'penugasan'                  => 'App\\Models\\Penugasan',
    'surat_tugas'                => 'App\\Models\\SuratTugas',
    'histori_antrian_penugasan' => 'App\\Models\\HistoriAntrianPenugasan',
    'dokumen_permohonan'         => 'App\\Models\\DokumenPermohonan',
    'checklist_validasi'         => 'App\\Models\\ChecklistValidasi',
    'laporan_pengerjaan'         => 'App\\Models\\LaporanPengerjaan',
    'konfigurasi_penugasan'      => 'App\\Models\\KonfigurasiPenugasan',
    'akun_pengguna'             => 'App\\Models\\AkunPengguna',
    'akun_pengguna_lembaga'     => null, // tidak ada model Eloquent -> pakai DB::table
    'pks_templates'              => 'App\\Models\\PksTemplate',
    'payment_settings'           => 'App\\Models\\PaymentSetting',
    'mail_settings'             => 'App\\Models\\MailSetting',
    'whatsapp_settings'         => 'App\\Models\\WhatsAppSetting',
];

$generated = [];

foreach ($seedingOrder as $table) {
    $rows = \Illuminate\Support\Facades\DB::table($table)->get()->map(fn ($r) => (array) $r)->all();
    if (empty($rows)) {
        echo "Skipping $table (no data)\n";
        continue;
    }

    $className = str_replace(' ', '', ucwords(str_replace('_', ' ', $table))) . 'Seeder';
    $nullableCols = $nullableMap[$table] ?? [];

    $dataItems = [];
    foreach ($rows as $row) {
        $arr = (array) $row;
        if (isset($specialTables[$table])) {
            $arr = $specialTables[$table]($arr);
        }
        $dataItems[] = rowToPhpArray($arr, $nullableCols);
    }
    $dataArrayStr = implode(",\n\n", $dataItems);

    // Semua seeder pakai DB::table (bukan Eloquent) supaya:
    // - kolom json tidak ter-encode dua kali (cast 'array' di model),
    // - created_at/updated_at tidak ditimpa oleh auto-timestamp Eloquent,
    // - field di luar $fillable tetap tertulis.
    $imports = "use Illuminate\\Support\\Facades\\DB;\n";
    $body = <<<BODY
        foreach (\$data as \$item) {
            DB::table('{$table}')->updateOrInsert(
                ['id' => \$item['id']],
                \$item
            );
        }
BODY;

    $seederContent = <<<PHP
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
{$imports}
class {$className} extends Seeder
{
    public function run(): void
    {
        \$data = [
{$dataArrayStr}
        ];

{$body}
    }
}
PHP;

    $filePath = $outDir . $className . '.php';
    file_put_contents($filePath, $seederContent);
    $generated[] = $table;
    echo "Generated: $className.php (" . count($rows) . " rows)\n";
}

// Generate DatabaseSeeder.php
$seederClassLines = implode("\n", array_map(function ($t) {
    $cn = str_replace(' ', '', ucwords(str_replace('_', ' ', $t))) . 'Seeder';
    return "            {$cn}::class,";
}, $generated));

$dbSeederContent = <<<PHP
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        \$this->call([
{$seederClassLines}
        ]);
    }
}
PHP;

file_put_contents($outDir . 'DatabaseSeeder.php', $dbSeederContent);
echo "\nGenerated DatabaseSeeder.php with " . count($generated) . " seeders.\n";

// Clean up temp file
$jsonPath = __DIR__ . '/../seeder_data.json';
if (file_exists($jsonPath)) {
    unlink($jsonPath);
    echo "Cleaned up seeder_data.json\n";
}

echo "\nDone!\n";
