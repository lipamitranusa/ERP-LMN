<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Validasi format NPWP Indonesia.
 *
 * Menerima 15 atau 16 digit (16 digit = NPWP NIK-based sejak 2024).
 * Boleh dalam format berformat XX.XXX.XXX.X-XXX.XXX (15) atau polos.
 *
 * Contoh valid:
 *   - "01.234.567.8-901.000"
 *   - "012345678901000"
 *   - "1234567890123456" (16 digit)
 * Contoh invalid:
 *   - "123" (terlalu pendek)
 *   - "01.234.567.8-901" (tidak lengkap)
 *   - "ABCD.EFG.HIJ.K-LMN.OPQ" (bukan digit)
 */
class IndonesianNpwp implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value === null || $value === '') {
            return; // nullable — pemrosesan lain menentukan required
        }

        // Terima int dan string — beberapa klien HTTP / test mengirim integer
        // (terutama numeric polos tanpa leading zero).
        if (! is_string($value) && ! is_int($value)) {
            $fail('NPWP harus berupa teks atau angka.');
            return;
        }
        $value = (string) $value;

        $digits = preg_replace('/\D/', '', $value);
        $len = strlen($digits);

        if ($len !== 15 && $len !== 16) {
            $fail('NPWP harus terdiri dari 15 atau 16 digit angka.');
            return;
        }

        // Untuk format ber-format (mengandung "." atau "-"), periksa pola
        // XX.XXX.XXX.X-XXX.XXX (15) atau XX.XXX.XXX.X-XXX.XXXX (16)
        if (preg_match('/[.\-]/', $value)) {
            $pattern = $len === 15
                ? '/^\d{2}\.\d{3}\.\d{3}\.\d{1}-\d{3}\.\d{3}$/'
                : '/^\d{2}\.\d{3}\.\d{3}\.\d{1}-\d{3}\.\d{4}$/';
            if (! preg_match($pattern, $value)) {
                $fail('Format NPWP tidak sesuai. Gunakan XX.XXX.XXX.X-XXX.XXX (15 digit) atau XX.XXX.XXX.X-XXX.XXXX (16 digit).');
            }
        }
    }
}
