<?php

namespace App\Providers;

use App\Models\AkunPengguna;
use App\Models\BuktiPembayaran;
use App\Models\CatatanRevisi;
use App\Models\ChecklistValidasi;
use App\Models\DokumenPermohonan;
use App\Models\HistoriAntrianPenugasan;
use App\Models\Invoice;
use App\Models\Laporan;
use App\Models\LaporanKendala;
use App\Models\LaporanVerifikasi;
use App\Models\LedgerEntry;
use App\Models\MenuAction;
use App\Models\NotifikasiTagihan;
use App\Models\Penugasan;
use App\Models\Pks;
use App\Models\RefundRequest;
use App\Models\Role;
use App\Models\RolePrivilege;
use App\Models\SiklusAkreditasi;
use App\Models\SuratTugas;
use App\Models\TenagaAhli;
use App\Models\VerifikasiItem;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\Request;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Route;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(\App\Services\AuditService::class, function ($app) {
            return new \App\Services\AuditService($app->make(Request::class));
        });
    }

    public function boot(): void
    {
        // ── Perf safety net: throw kalau ada lazy load di non-production ──
        // Mengubah N+1 yang tidak terlihat menjadi exception yang langsung
        // menunjuk ke controller/model yang harus di-fix dengan with()/withCount().
        // Di production di-skip agar tidak menambah overhead runtime.
        \Illuminate\Database\Eloquent\Model::preventLazyLoading(! app()->isProduction());

        RateLimiter::for('login', fn (Request $request) => Limit::perMinute(10)->by(strtolower((string) $request->input('login')).'|'.$request->ip()));
        // UUID route model binding
        Route::model('akun', AkunPengguna::class);
        Route::model('role', Role::class);
        Route::model('menuAction', MenuAction::class);
        Route::model('rolePrivilege', RolePrivilege::class);
        Route::model('siklus', SiklusAkreditasi::class);
        Route::model('dokumen', DokumenPermohonan::class);
        Route::model('catatan', CatatanRevisi::class);
        Route::model('checklist', ChecklistValidasi::class);
        Route::model('penugasan', Penugasan::class);
        Route::model('surat', SuratTugas::class);
        Route::model('kendala', LaporanKendala::class);
        Route::model('tenagaAhli', TenagaAhli::class);
        Route::model('histori', HistoriAntrianPenugasan::class);
        Route::model('laporan', Laporan::class);
        Route::model('laporanVerifikasi', LaporanVerifikasi::class);
        Route::model('verifikasiItem', VerifikasiItem::class);
        Route::model('notifikasiTagihan', NotifikasiTagihan::class);
        Route::model('pks', Pks::class);
        Route::model('invoice', Invoice::class);
        Route::model('bukti', BuktiPembayaran::class);
        Route::model('refund', RefundRequest::class);

        // Morph map untuk audit trail
        Relation::morphMap([
            'AkunPengguna' => AkunPengguna::class,
            'Role' => Role::class,
            'SiklusAkreditasi' => SiklusAkreditasi::class,
            'DokumenPermohonan' => DokumenPermohonan::class,
            'ChecklistValidasi' => ChecklistValidasi::class,
            'CatatanRevisi' => CatatanRevisi::class,
            'Penugasan' => Penugasan::class,
            'SuratTugas' => SuratTugas::class,
            'LaporanKendala' => LaporanKendala::class,
            'HistoriAntrianPenugasan' => HistoriAntrianPenugasan::class,
            'TenagaAhli' => TenagaAhli::class,
            'Laporan' => Laporan::class,
            'LaporanVerifikasi' => LaporanVerifikasi::class,
            'VerifikasiItem' => VerifikasiItem::class,
            'NotifikasiTagihan' => NotifikasiTagihan::class,
            'Pks' => Pks::class,
            'Invoice' => Invoice::class,
            'BuktiPembayaran' => BuktiPembayaran::class,
            'RefundRequest' => RefundRequest::class,
            'LedgerEntry' => LedgerEntry::class,
        ]);
    }
}

