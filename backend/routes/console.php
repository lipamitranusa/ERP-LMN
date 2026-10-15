<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Scheduled Tasks
|--------------------------------------------------------------------------
|
| Tasks registered here run automatically via `php artisan schedule:run`
| (called by OS cron every minute). Each task is described inline.
|
*/

// NFR-1 / FR-5.4a / AC-9: kirim invoice reminder setiap pagi pukul 08:00 WIB.
//   - H-3 dan H-1 sebelum due_date
//   - Overdue (lewat due_date, survei masih berjalan)
//   - Retry otomatis untuk notifikasi yang gagal
Schedule::command('notifikasi:tagihan:harian')
    ->dailyAt('08:00')
    ->timezone('Asia/Jakarta')
    ->withoutOverlapping()
    ->onOneServer()
    ->name('notifikasi-tagihan-harian');
