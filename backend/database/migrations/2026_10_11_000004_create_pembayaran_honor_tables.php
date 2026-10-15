<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel pembayaran_honor + pembayaran_honor_detail.
 *
 * pembayaran_honor — header satu transaksi pembayaran AP (Accounts Payable)
 *   untuk honor Surveior/Verifikator. Satu pembayaran dapat melunasi
 *   banyak honor entry sekaligus (batch).
 *
 * pembayaran_honor_detail — line items: setiap baris menghubungkan satu
 *   pembayaran dengan satu LedgerEntry honor. Satu honor entry hanya
 *   boleh ada di satu pembayaran (mencegah double-pay). Status lunas
 *   pada LedgerEntry di-trigger oleh insert ke tabel ini.
 *
 * FR-5.2/5.3/5.6/5.8 — pembayaran honor cair langsung via sistem ini
 * (lihat PRD v2.4 catatan FR-5.2).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pembayaran_honor', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nomor_pembayaran', 50)->unique()
                ->comment('Format: BYR/YYYY/MM/NNNN — auto-generated, urut per bulan');
            $table->date('tanggal_pembayaran');
            $table->string('metode', 30)
                ->comment('transfer_bank | tunai | lainnya');
            $table->string('bank_pengirim', 50)->nullable();
            $table->string('nomor_rekening_tujuan', 50)->nullable()
                ->comment('Rekening penerima honor (opsional)');
            $table->string('atas_nama', 150)->nullable();
            $table->decimal('total_nominal', 15, 2)
                ->comment('Total neto seluruh line item — invariant = SUM(detail.nominal_dibayar)');
            $table->string('status', 20)->default('draft')
                ->comment('draft | disetujui | dibatalkan');
            $table->uuid('dibuat_oleh')->nullable();
            $table->uuid('disetujui_oleh')->nullable();
            $table->timestamp('tanggal_disetujui')->nullable();
            $table->uuid('dibatalkan_oleh')->nullable();
            $table->timestamp('tanggal_dibatalkan')->nullable();
            $table->text('alasan_batal')->nullable();
            $table->text('catatan')->nullable();
            $table->timestamps();

            $table->foreign('dibuat_oleh')->references('id')->on('akun_pengguna')->nullOnDelete();
            $table->foreign('disetujui_oleh')->references('id')->on('akun_pengguna')->nullOnDelete();
            $table->foreign('dibatalkan_oleh')->references('id')->on('akun_pengguna')->nullOnDelete();
            $table->index('status');
            $table->index('tanggal_pembayaran');
        });

        Schema::create('pembayaran_honor_detail', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('pembayaran_honor_id');
            $table->uuid('ledger_entry_id');
            $table->decimal('nominal_dibayar', 15, 2)
                ->comment('Nominal neto yang dibayar — harus = ledger_entry.nominal_neto');
            $table->timestamps();

            $table->foreign('pembayaran_honor_id')->references('id')->on('pembayaran_honor')->cascadeOnDelete();
            $table->foreign('ledger_entry_id')->references('id')->on('ledger_entries')->cascadeOnDelete();
            // Cegah double-pay: satu honor entry hanya boleh di satu pembayaran
            $table->unique('ledger_entry_id', 'phd_ledger_entry_unique');
            $table->index('pembayaran_honor_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pembayaran_honor_detail');
        Schema::dropIfExists('pembayaran_honor');
    }
};
