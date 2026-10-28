<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

/**
 * Resolver `lembaga_id` untuk entitas turunan yang tidak punya kolom
 * `lembaga_id` sendiri (invoice, pembayaran honor, hutang pajak).
 *
 * Kenapa perlu: `audit_trail.lembaga_id` dan `jurnal_umum.lembaga_id`
 * bertipe NOT NULL, sedangkan trait BelongsToLembaga hanya mengisi kolom
 * itu dari `session('lembaga_id')` — yang bernilai null ketika service
 * dipanggil dari console (`settlement:rebuild`), scheduler, atau
 * pemanggilan service langsung di dalam test.
 *
 * Semua query memakai query builder (bukan Eloquent) supaya global scope
 * per-lembaga tidak ikut menyaring: kita mencari lemma asli dari objek
 * yang diketahui id-nya, bukan melakukan listing data.
 */
class LembagaResolver
{
    /** Siklus akreditasi → lemma. */
    public function fromSiklus(?string $siklusId): ?string
    {
        if (! $siklusId) {
            return null;
        }

        return DB::table('siklus_akreditasi')->where('id', $siklusId)->value('lembaga_id');
    }

    /** Invoice → siklus (atau PKS bila siklus_id kosong) → lemma. */
    public function fromInvoice(?string $invoiceId): ?string
    {
        if (! $invoiceId) {
            return null;
        }

        $invoice = DB::table('invoice')->where('id', $invoiceId)->first();
        if (! $invoice) {
            return null;
        }

        return $this->fromSiklus($invoice->siklus_id)
            ?? ($invoice->pks_id ? $this->fromPks($invoice->pks_id) : null);
    }

    /** PKS → siklus → lemma. */
    public function fromPks(?string $pksId): ?string
    {
        if (! $pksId) {
            return null;
        }

        return $this->fromSiklus(DB::table('pks')->where('id', $pksId)->value('siklus_id'));
    }

    /**
     * Pembayaran honor → detail → ledger entry → siklus → lemma.
     * Bila detailnya belum ada, jatuh ke akun pembuat pembayaran.
     */
    public function fromPembayaranHonor(?string $pembayaranId): ?string
    {
        if (! $pembayaranId) {
            return null;
        }

        $siklusId = DB::table('pembayaran_honor_detail')
            ->join('ledger_entries', 'ledger_entries.id', '=', 'pembayaran_honor_detail.ledger_entry_id')
            ->where('pembayaran_honor_detail.pembayaran_honor_id', $pembayaranId)
            ->value('ledger_entries.siklus_id');

        $lembagaId = $this->fromSiklus($siklusId);
        if ($lembagaId) {
            return $lembagaId;
        }

        return $this->fromAkunPengguna(
            DB::table('pembayaran_honor')->where('id', $pembayaranId)->value('dibuat_oleh')
        );
    }

    /** Hutang pajak → pembayaran honor (atau akun pembuat) → lemma. */
    public function fromHutangPajak(?string $hutangId): ?string
    {
        if (! $hutangId) {
            return null;
        }

        $hutang = DB::table('hutang_pajak')->where('id', $hutangId)->first();
        if (! $hutang) {
            return null;
        }

        return $this->fromPembayaranHonor($hutang->pembayaran_honor_id)
            ?? $this->fromAkunPengguna($hutang->dibuat_oleh);
    }

    /** Jurnal umum sudah membawa kolom lemma_id sendiri. */
    public function fromJurnal(?string $jurnalId): ?string
    {
        if (! $jurnalId) {
            return null;
        }

        return DB::table('jurnal_umum')->where('id', $jurnalId)->value('lembaga_id');
    }

    public function fromAkunPengguna(?string $userId): ?string
    {
        if (! $userId) {
            return null;
        }

        return DB::table('akun_pengguna')->where('id', $userId)->value('lembaga_id');
    }

    /**
     * Fallback terakhir untuk data yang global (mis. Role): session
     * aktif, lalu lemma pertama sebagai default sistem — sama dengan
     * aturan backfill `lembaga_id` pada migrasi multi-lembaga.
     */
    public function fallback(): ?string
    {
        $sessionId = session('lembaga_id');
        if ($sessionId) {
            return $sessionId;
        }

        return DB::table('lembaga')->orderBy('id')->value('id');
    }

    /**
     * Pastikan ada lemma_id yang valid untuk kolom NOT NULL (audit_trail,
     * jurnal_umum). Urutan: hasil resolusi objek → lemma akun aktor →
     * session → lemma default sistem.
     */
    public function resolve(?string $candidate, ?string $aktorId = null): ?string
    {
        return $candidate
            ?? $this->fromAkunPengguna($aktorId)
            ?? $this->fallback();
    }
}
