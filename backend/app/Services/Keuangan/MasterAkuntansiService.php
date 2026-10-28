<?php

namespace App\Services\Keuangan;

use App\Models\Lembaga;
use Illuminate\Support\Facades\DB;
use Ramsey\Uuid\Uuid;

/**
 * MasterAkuntansiService — menyalin master akuntansi (chart of accounts +
 * kategori jurnal) dari satu lembaga ke lembaga lain.
 *
 * Konteks: COA dan kategori_jurnal di-scope per lembaga (unique constraint
 * coa(lembaga_id, kode) dan kategori_jurnal(lembaga_id, nama)), sehingga
 * setiap lembaga wajib punya salinan master sendiri. Tanpa itu, semua
 * modul akuntansi (buku besar, bank masuk, jurnal settlement) kosong untuk
 * lembaga yang master-nya belum dibuat.
 *
 * Aturan:
 *   - Idempotent: dijalankan berkali-kali aman. Akun yang sudah ada
 *     (lembaga_id + kode) di-update isinya, id-nya TIDAK diganti agar
 *     referensi jurnal_umum_detail.coa_id tidak putus.
 *   - kategori_jurnal disalin lebih dulu karena coa.kategori_id menunjuk
 *     ke kategori_jurnal.id — id lama dipetakan ke id baru.
 *   - Id baru dibuat deterministik (UUID v5 dari lemma + kode) supaya
 *     replikasi ulang menghasilkan id yang sama.
 */
class MasterAkuntansiService
{
    private const UUID_NAMESPACE = '2f6c9b4a-7d1e-4c58-9a3f-1b8d5e0c7a92';

    /**
     * Salin COA + kategori jurnal ke lemma target.
     *
     * @return array{source: ?string, coa: int, kategori: int}
     */
    public function replicate(string $targetLembagaId, ?string $sourceLembagaId = null): array
    {
        $sourceLembagaId = $sourceLembagaId ?: $this->defaultSourceLembagaId();

        if (! $sourceLembagaId || $sourceLembagaId === $targetLembagaId) {
            return ['source' => $sourceLembagaId, 'coa' => 0, 'kategori' => 0];
        }

        $kategoriMap = $this->replicateKategori($sourceLembagaId, $targetLembagaId);
        $coaCount = $this->replicateCoa($sourceLembagaId, $targetLembagaId, $kategoriMap);

        return [
            'source' => $sourceLembagaId,
            'coa' => $coaCount,
            'kategori' => count($kategoriMap),
        ];
    }

    /**
     * Salin master ke seluruh lemma yang belum punya COA.
     */
    public function replicateToAll(?string $sourceLembagaId = null): array
    {
        $sourceLembagaId = $sourceLembagaId ?: $this->defaultSourceLembagaId();
        $results = [];

        foreach (Lembaga::query()->orderBy('id')->get() as $lembaga) {
            $results[$lembaga->id] = $this->replicate($lembaga->id, $sourceLembagaId);
        }

        return $results;
    }

    /**
     * Source default = lemma yang paling lengkap master COA-nya.
     */
    public function defaultSourceLembagaId(): ?string
    {
        $row = DB::table('coa')
            ->select('lembaga_id', DB::raw('COUNT(*) as jml'))
            ->groupBy('lembaga_id')
            ->orderByDesc('jml')
            ->first();

        return $row?->lembaga_id;
    }

    private function replicateKategori(string $sourceId, string $targetId): array
    {
        $map = [];

        $rows = DB::table('kategori_jurnal')
            ->where('lembaga_id', $sourceId)
            ->orderBy('urutan')
            ->get();

        foreach ($rows as $row) {
            $existing = DB::table('kategori_jurnal')
                ->where('lembaga_id', $targetId)
                ->where('nama', $row->nama)
                ->first();

            $newId = $existing->id ?? $this->deterministicId('kategori_jurnal', $targetId, $row->nama);

            $payload = [
                'nama' => $row->nama,
                'jenis' => $row->jenis,
                'urutan' => $row->urutan,
                'is_aktif' => $row->is_aktif,
                'updated_at' => now(),
            ];

            if ($existing) {
                DB::table('kategori_jurnal')->where('id', $newId)->update($payload);
            } else {
                DB::table('kategori_jurnal')->insert($payload + [
                    'id' => $newId,
                    'lembaga_id' => $targetId,
                    'created_at' => now(),
                ]);
            }

            $map[$row->id] = $newId;
        }

        return $map;
    }

    private function replicateCoa(string $sourceId, string $targetId, array $kategoriMap): int
    {
        $count = 0;

        $rows = DB::table('coa')
            ->where('lembaga_id', $sourceId)
            ->orderBy('kode')
            ->get();

        foreach ($rows as $row) {
            $existing = DB::table('coa')
                ->where('lembaga_id', $targetId)
                ->where('kode', $row->kode)
                ->first();

            $newId = $existing->id ?? $this->deterministicId('coa', $targetId, $row->kode);

            $payload = [
                'kode' => $row->kode,
                'nama' => $row->nama,
                'jenis' => $row->jenis,
                'kelompok' => $row->kelompok,
                'kategori_id' => $row->kategori_id ? ($kategoriMap[$row->kategori_id] ?? null) : null,
                'is_aktif' => $row->is_aktif,
                'urutan' => $row->urutan,
                'deskripsi' => $row->deskripsi,
                'updated_at' => now(),
            ];

            if ($existing) {
                DB::table('coa')->where('id', $newId)->update($payload);
            } else {
                DB::table('coa')->insert($payload + [
                    'id' => $newId,
                    'lembaga_id' => $targetId,
                    'created_at' => now(),
                ]);
            }

            $count++;
        }

        return $count;
    }

    /**
     * UUID v5 deterministik dari (tabel, lemma, kode) — replikasi ulang
     * menghasilkan id yang sama sehingga tidak menghasilkan duplikat.
     */
    private function deterministicId(string $table, string $lembagaId, string $key): string
    {
        return Uuid::uuid5(
            self::UUID_NAMESPACE,
            "{$table}|{$lembagaId}|{$key}",
        )->toString();
    }
}
