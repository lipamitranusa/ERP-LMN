<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/**
 * Frontend adalah SPA React (BrowserRouter) yang dilayani dari domain yang
 * sama dengan API — jadi setiap path non-API harus mengembalikan index.html
 * agar deep link (mis. /kontrak/{id}) bisa ditangani router di sisi klien.
 *
 * Route API didaftarkan sebelum route web, sehingga endpoint /api/* yang
 * terdaftar tetap menang. Path /api/* yang TIDAK terdaftar akan jatuh ke
 * fallback di bawah — karena itu fallback ini mengembalikan JSON 404, bukan
 * HTML, supaya frontend tidak salah mengira respons error API.
 */
$spaFallback = function (Request $request) {
    if ($request->is('api/*')) {
        return response()->json(['message' => 'Not Found'], 404);
    }

    $index = public_path('index.html');

    if (! is_file($index)) {
        return response(
            "Frontend belum di-build.\n"
            . "Jalankan di folder frontend/: npm ci && npm run build\n"
            . "Lalu salin frontend/dist/index.html dan frontend/dist/assets/ ke backend/public/.",
            503
        );
    }

    // index.html tidak boleh di-cache lama: nama asset di dalamnya berubah
    // setiap build, jadi browser harus selalu mengambil versi terbaru.
    return response()->file($index, [
        'Cache-Control' => 'no-cache, no-store, must-revalidate',
    ]);
};

Route::get('/', $spaFallback);
Route::fallback($spaFallback);
