<?php

namespace App\Services\Notification;

use App\Models\NotifikasiTagihan;
use Illuminate\Support\Facades\Log;

/**
 * High-level notifier with WhatsApp → Email fallback and persistent
 * retry on failure (Bab 8 / skenario sistem down).
 *
 * Usage:
 *   $result = $notifier->sendWithFallback(
 *       recipientPhone: $faskes->telepon,
 *       recipientEmail: $faskes->email,
 *       subject: '...',
 *       message: '...',
 *       siklusId: $siklus->id,
 *       jenis: 'tagihan_h3',
 *   );
 *
 * Returns array with final status (terkirim / gagal) and which channel succeeded.
 */
class Notifier
{
    public const MAX_ATTEMPTS = 5;

    public function __construct(
        private WhatsAppChannel $whatsapp,
        private EmailChannel $email,
    ) {}

    /**
     * Send a notification with primary WhatsApp + email fallback.
     * Persists the attempt to notifikasi_tagihan for auditability and retry.
     *
     * @return array{status: string, channel: string, notifikasi_id: string, error?: string}
     */
    public function sendWithFallback(
        string $recipientPhone,
        ?string $recipientEmail,
        string $subject,
        string $message,
        string $siklusId,
        string $jenis,
        ?string $penugasanId = null,
    ): array {
        $phone = $this->whatsapp->send($recipientPhone, $subject, $message);
        if ($phone) {
            $notif = $this->persist([
                'siklus_id' => $siklusId,
                'penugasan_id' => $penugasanId,
                'jenis' => $jenis,
                'channel' => 'whatsapp',
                'recipient' => $recipientPhone,
                'status' => NotifikasiTagihan::STATUS_TERKIRIM,
                'dikirim_pada' => now(),
                'payload' => ['subject' => $subject, 'message' => $message],
            ]);
            return ['status' => 'terkirim', 'channel' => 'whatsapp', 'notifikasi_id' => $notif->id];
        }

        $whatsappError = $this->whatsapp->getLastError();
        Log::warning('notifier.whatsapp.fallback_email', [
            'siklus_id' => $siklusId,
            'jenis' => $jenis,
            'whatsapp_error' => $whatsappError,
        ]);

        if ($recipientEmail) {
            $emailOk = $this->email->send($recipientEmail, $subject, $message);
            if ($emailOk) {
                $notif = $this->persist([
                    'siklus_id' => $siklusId,
                    'penugasan_id' => $penugasanId,
                    'jenis' => $jenis,
                    'channel' => 'email',
                    'recipient' => $recipientEmail,
                    'status' => NotifikasiTagihan::STATUS_TERKIRIM,
                    'dikirim_pada' => now(),
                    'payload' => ['subject' => $subject, 'message' => $message, 'whatsapp_fallback_error' => $whatsappError],
                ]);
                return ['status' => 'terkirim', 'channel' => 'email', 'notifikasi_id' => $notif->id];
            }

            $emailError = $this->email->getLastError();
            $notif = $this->persistWithRetry([
                'siklus_id' => $siklusId,
                'penugasan_id' => $penugasanId,
                'jenis' => $jenis,
                'channel' => 'whatsapp',
                'recipient' => $recipientPhone,
                'error_message' => "WA: {$whatsappError}; Email: {$emailError}",
                'payload' => ['subject' => $subject, 'message' => $message],
            ]);
            return [
                'status' => 'gagal',
                'channel' => 'none',
                'notifikasi_id' => $notif->id,
                'error' => $emailError,
            ];
        }

        // No email fallback available
        $notif = $this->persistWithRetry([
            'siklus_id' => $siklusId,
            'penugasan_id' => $penugasanId,
            'jenis' => $jenis,
            'channel' => 'whatsapp',
            'recipient' => $recipientPhone,
            'error_message' => "WhatsApp gagal dan tidak ada email fallback: {$whatsappError}",
            'payload' => ['subject' => $subject, 'message' => $message],
        ]);
        return [
            'status' => 'gagal',
            'channel' => 'none',
            'notifikasi_id' => $notif->id,
            'error' => $whatsappError,
        ];
    }

    /**
     * Retry a previously failed notification. Used by the scheduler
     * (Bab 8: sistem down → reschedule retry, due date tidak dianggap lewat
     * karena keterlambatan notifikasi).
     */
    public function retry(NotifikasiTagihan $notif): array
    {
        $payload = $notif->payload ?? [];
        $subject = $payload['subject'] ?? 'Notifikasi';
        $message = $payload['message'] ?? '';

        $result = $this->sendWithFallback(
            recipientPhone: $notif->recipient,
            recipientEmail: $this->getFallbackEmailForSiklus($notif->siklus_id),
            subject: $subject,
            message: $message,
            siklusId: $notif->siklus_id,
            jenis: $notif->jenis,
            penugasanId: $notif->penugasan_id,
        );

        return $result;
    }

    private function getFallbackEmailForSiklus(string $siklusId): ?string
    {
        $siklus = \App\Models\SiklusAkreditasi::with('faskes')->find($siklusId);
        return $siklus?->faskes?->email ?? null;
    }

    private function persist(array $data): NotifikasiTagihan
    {
        return NotifikasiTagihan::create($data);
    }

    private function persistWithRetry(array $data): NotifikasiTagihan
    {
        $notif = $this->persist($data);
        $notif->attempt_count = ($notif->attempt_count ?? 0) + 1;
        $notif->next_retry_at = $this->calculateNextRetry($notif->attempt_count);
        $notif->status = NotifikasiTagihan::STATUS_GAGAL;
        $notif->save();
        return $notif;
    }

    private function calculateNextRetry(int $attempt): \DateTimeInterface
    {
        // Exponential backoff: 5m, 15m, 1h, 6h, 24h
        $minutes = match (true) {
            $attempt <= 1 => 5,
            $attempt === 2 => 15,
            $attempt === 3 => 60,
            $attempt === 4 => 360,
            default => 1440,
        };
        return now()->addMinutes($minutes);
    }
}
