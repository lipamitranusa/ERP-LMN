<?php

namespace App\Services;

use App\Models\Lembaga;

/**
 * Sumber data tunggal untuk kop (header) dokumen cetak
 * (invoice, slip honorarium, bukti potong, dll).
 *
 * Pemanggil tidak perlu tahu tabel/eloquent; cukup inject service ini.
 * Tidak di-cache: dipanggil saat preview/cetak (on-demand) dan harus
 * mencerminkan update terbaru dari master lembaga.
 */
class LembagaHeaderService
{
    /**
     * Kop dokumen untuk lembaga tertentu. Tanpa argumen dipakai lembaga
     * aktif (konteks umum); untuk dokumen yang terikat sebuah siklus,
     * teruskan siklus->lembaga agar nama & logo sesuai penerbit dokumen.
     */
    public function getHeader(?Lembaga $lembaga = null): array
    {
        $lembaga = $lembaga ?? $this->resolveActive();

        if (! $lembaga) {
            return [
                'nama' => 'Lembaga Akreditasi',
                'nama_singkat' => null,
                'npwp' => null,
                'logo_url' => null,
                'alamat' => null,
                'kota' => null,
                'telepon' => null,
                'email' => null,
                'website' => null,
                'logo_path' => null,
                'pejabat' => ['nama' => null, 'jabatan' => null],
            ];
        }

        return [
            'nama' => $lembaga->nama,
            'nama_singkat' => $this->shortName($lembaga->nama),
            'npwp' => $lembaga->npwp,
            'logo_url' => $lembaga->logo_url,
            'logo_path' => $lembaga->logo_path,
            'alamat' => $lembaga->alamat,
            'kota' => $lembaga->kota,
            'telepon' => $lembaga->telepon,
            'email' => $lembaga->email,
            'website' => $lembaga->website,
            'pejabat' => [
                'nama' => $lembaga->nama_pejabat,
                'jabatan' => $lembaga->jabatan_pejabat,
            ],
        ];
    }

    /**
     * Lembaga aktif pertama. Mengikuti urutan: status=aktif, lalu apapun
     * yang ada, lalu fallback null. Tidak exception jika tabel kosong
     * karena sistem mungkin dijalankan sebelum master lembaga diisi.
     */
    private function resolveActive(): ?Lembaga
    {
        return Lembaga::query()
            ->where('status', 'aktif')
            ->orderBy('nama')
            ->first()
            ?? Lembaga::query()->orderBy('nama')->first();
    }

    /**
     * Singkatan untuk fallback jika tidak ada logo. Mengambil inisial
     * maksimal 2 kata pertama, upper-case. "PT Lembaga Akreditasi X"
     * menjadi "LA".
     */
    private function shortName(string $nama): string
    {
        $clean = preg_replace('/\b(PT|CV|PERUM|PERUSAHAAN)\b\.?/i', '', $nama);
        $words = array_values(array_filter(preg_split('/\s+/', trim($clean))));
        $initials = '';
        foreach (array_slice($words, 0, 2) as $w) {
            $initials .= mb_strtoupper(mb_substr($w, 0, 1));
        }
        return $initials ?: mb_strtoupper(mb_substr($nama, 0, 2));
    }
}
