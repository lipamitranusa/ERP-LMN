<?php

use App\Models\AkunPengguna;
use App\Models\LedgerEntry;
use App\Models\TenagaAhli;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Backfill entry AP honor rekomendator yang tercatat tanpa tenaga_ahli.
 *
 * Reksa adalah akun (role Rekomendator) yang belum tentu tertaut ke
 * tenaga_ahli. Karena data rekening hanya ada di tenaga_ahli, entry honor
 * reksa lama tidak punya informasi rekening untuk pembayaran AP.
 *
 * Migrasi ini menautkan entry tersebut ke tenaga_ahli milik akun reksanya
 * (bila ada) dan menyalin data rekening ke dalam detail entry.
 */
return new class extends Migration
{
    public function up(): void
    {
        $entries = DB::table('ledger_entries')
            ->where('tipe', LedgerEntry::TIPE_AP_HONOR_REKOMENDATOR)
            ->whereNull('penerima_tenaga_ahli_id')
            ->get(['id', 'siklus_id', 'detail']);

        foreach ($entries as $entry) {
            $detail = json_decode($entry->detail ?? '[]', true) ?: [];
            $akunId = $detail['akun_pengguna_id'] ?? null;
            if (! $akunId) {
                continue;
            }

            $akun = AkunPengguna::withoutGlobalScope('lembaga')->find($akunId);
            $taId = $akun?->tenaga_ahli_id;
            if (! $taId) {
                continue;
            }

            // Jangan duplikat: satu siklus hanya boleh punya satu entry
            // honor reksa untuk tenaga ahli yang sama.
            $alreadyLinked = DB::table('ledger_entries')
                ->where('tipe', LedgerEntry::TIPE_AP_HONOR_REKOMENDATOR)
                ->where('siklus_id', $entry->siklus_id)
                ->where('penerima_tenaga_ahli_id', $taId)
                ->exists();
            if ($alreadyLinked) {
                continue;
            }

            $ta = TenagaAhli::withoutGlobalScope('lembaga')->find($taId);
            $detail['tenaga_ahli_id'] = $taId;
            $detail['no_rekening'] = $ta?->no_rekening;
            $detail['nama_bank'] = $ta?->nama_bank;
            $detail['atas_nama_rekening'] = $ta?->atas_nama_rekening;

            DB::table('ledger_entries')
                ->where('id', $entry->id)
                ->update([
                    'penerima_tenaga_ahli_id' => $taId,
                    'detail' => json_encode($detail),
                ]);
        }
    }

    public function down(): void
    {
        // Backfill bersifat additive (menautkan & melengkapi data), tidak
        // dihapus saat rollback agar riwayat honor tetap konsisten.
    }
};
