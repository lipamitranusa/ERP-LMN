<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$template = \App\Models\PksTemplate::with('jenisFaskes:id,nama,kode')->first();
if (!$template) {
    echo "No template found!\n";
    exit(1);
}

echo "Template: " . $template->nama . "\n";
echo "JenisFaskes: " . ($template->jenisFaskes ? $template->jenisFaskes->nama : 'NULL') . "\n";
echo "Blade: " . $template->blade . "\n";
echo "Konten keys: " . json_encode(array_keys($template->konten ?? [])) . "\n";

// Test the previewPdf logic
$jenisFaskes = $template->jenisFaskes;
echo "jenisFaskes: " . ($jenisFaskes ? $jenisFaskes->nama . ' / kode=' . $jenisFaskes->kode : 'NULL') . "\n";

// Check if konten is array
$konten = $template->konten;
echo "konten type: " . gettype($konten) . "\n";
if (is_array($konten)) {
    echo "pasal1 length: " . strlen($konten['pasal1'] ?? '') . "\n";
}
