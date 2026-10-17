<?php
require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$t = App\Models\TenagaAhli::first();
if (!$t) { echo "No records\n"; exit; }

echo "Before: no_wa = " . ($t->no_wa ?? 'NULL') . "\n";
$t->update(['no_wa' => '081234567890']);
$t->refresh();
echo "After update: no_wa = " . ($t->no_wa ?? 'NULL') . "\n";
