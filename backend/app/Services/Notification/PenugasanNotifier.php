<?php

namespace App\Services\Notification;

use App\Models\NotifikasiTagihan;
use App\Models\Penugasan;
use App\Models\WhatsAppSetting;
use Illuminate\Support\Facades\Log;

/**
 * Notifikasi "penugasan baru" ke tenaga ahli.
 *
 * Nomor WhatsApp diambil dari master tenaga ahli (`tenaga_ahli.no_wa`).
 * Bila WhatsApp gagal (atau dimatikan admin di tab "Notifikasi" →
 * Pengaturan WhatsApp), Notifier otomatis jatuh ke email akun tenaga ahli.
 *
 * Sakelar admin ada di `whatsapp_settings` kategori `notifikasi`, kunci
 * `notify_penugasan_baru`.
 */
class PenugasanNotifier
{
    public const SETTING_KEY = 'notify_penugasan_baru';

    public function __construct(
        private Notifier $notifier,
    ) {}

    /**
     * Kirim notifikasi penugasan baru. Null bila tidak ada kanal yang bisa dipakai.
     *
     * @return array{status: string, channel: string, notifikasi_id: string, error?: string}|null
     */
    public function kirim(Penugasan $penugasan): ?array
    {
        $ta = $penugasan->tenagaAhli;
        $siklus = $penugasan->siklus;

        if (! $ta || ! $siklus) {
            return null;
        }

        $noWa = trim((string) $ta->no_wa);
        $email = $ta->akunPengguna()->first()?->email;

        // Sakelar admin: '0' = WhatsApp dimatikan. Baris yang belum ada
        // diperlakukan sebagai aktif agar notifikasi tetap terkirim.
        $waDimatikan = WhatsAppSetting::value(self::SETTING_KEY) === '0';

        // Tanpa nomor WA dan tanpa email, tidak ada kanal yang bisa dipakai —
        // jangan buat antrean retry yang tidak akan pernah terkirim.
        if (($waDimatikan || $noWa === '') && ! $email) {
            Log::info('penugasan.notifikasi.dilewati', [
                'penugasan_id' => $penugasan->id,
                'alasan' => 'tidak ada nomor WhatsApp maupun email tenaga ahli',
            ]);

            return null;
        }

        $jenisLabel = $penugasan->jenis === Penugasan::JENIS_VERIFIKASI ? 'Verifikasi' : 'Survei';
        $faskes = $siklus->faskes()->withoutGlobalScope('lembaga')->first();
        $faskesName = $faskes?->nama ?? 'Faskes';
        $nomorSurat = $penugasan->suratTugas?->nomor_surat ?? '-';
        $namaLembaga = $siklus->lembaga?->nama ?? config('app.name', 'Lembaga Akreditasi Kesehatan');

        $subject = "Penugasan Baru — {$jenisLabel} — {$faskesName}";

        $message = <<<TXT
        Yth. {$ta->nama},

        Anda menerima penugasan baru:
        Jenis: {$jenisLabel}
        Faskes: {$faskesName}
        Nomor Surat Tugas: {$nomorSurat}

        Silakan login ke sistem ERP Akreditasi untuk melihat detail dan mengkonfirmasi kesediaan.

        Terima kasih,
        {$namaLembaga}
        TXT;

        return $this->notifier->sendWithFallback(
            recipientPhone: $noWa,
            recipientEmail: $email,
            subject: $subject,
            message: $message,
            siklusId: $siklus->id,
            jenis: NotifikasiTagihan::JENIS_PENUGASAN_BARU,
            penugasanId: $penugasan->id,
            whatsappEnabled: ! $waDimatikan && $noWa !== '',
            context: [
                'nama_tenaga_ahli' => $ta->nama,
                'nomor_surat' => $nomorSurat,
                'nama_faskes' => $faskesName,
                'jenis_penugasan' => $jenisLabel,
                'nama_lembaga' => $namaLembaga,
            ],
        );
    }
}
