<?php

namespace App\Services\Notification;

use App\Models\WhatsAppSetting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * WhatsApp dispatcher — memilih driver yang dikonfigurasi di
 * `whatsapp_settings.driver` (umum.driver) lalu delegate ke channel
 * yang sesuai.
 *
 * Driver yang didukung:
 *   - whatsapp_cloud  → Meta WhatsApp Cloud API (lihat sendViaMeta)
 *   - fonnte          → Fonnte gateway (lihat FonnteChannel)
 *   - log             → log saja, tanpa API call (development)
 *
 * Fase 1: ketika driver = log atau credentials kosong, fallback ke
 * log-only mode — dev/test tidak butuh akses WhatsApp riil.
 */
class WhatsAppChannel implements NotificationChannelInterface
{
    public const DRIVER_META = 'whatsapp_cloud';
    public const DRIVER_FONNTE = 'fonnte';
    public const DRIVER_LOG = 'log';

    private ?string $lastError = null;

    public function __construct(
        private FonnteChannel $fonnte,
    ) {}

    public function send(string $recipient, string $subject, string $message): bool
    {
        $this->lastError = null;

        $driver = WhatsAppSetting::driver();

        return match ($driver) {
            self::DRIVER_FONNTE => $this->sendViaFonnte($recipient, $subject, $message),
            self::DRIVER_LOG => $this->logOnly($recipient, $subject, $message, 'whatsapp.send.log_only'),
            default => $this->sendViaMeta($recipient, $subject, $message),
        };
    }

    public function name(): string
    {
        return 'whatsapp';
    }

    public function getLastError(): ?string
    {
        return $this->lastError;
    }

    /**
     * Kirim via Meta WhatsApp Cloud API.
     * Credentials dibaca dari env (sebelum fase 2 di mana sepenuhnya
     * berpindah ke tabel `whatsapp_settings`).
     */
    private function sendViaMeta(string $recipient, string $subject, string $message): bool
    {
        $phone = $this->normalizePhone($recipient);
        if (! $phone) {
            $this->lastError = "Nomor WhatsApp tidak valid: {$recipient}";
            return false;
        }

        $apiUrl = env('WHATSAPP_API_URL');
        $phoneId = env('WHATSAPP_PHONE_NUMBER_ID');
        $token = env('WHATSAPP_ACCESS_TOKEN');

        // Fallback mode: no credentials → log only.
        if (! $apiUrl || ! $phoneId || ! $token) {
            return $this->logOnly($recipient, $subject, $message, 'whatsapp.send.log_only');
        }

        try {
            $response = Http::withToken($token)
                ->timeout(10)
                ->post("{$apiUrl}/{$phoneId}/messages", [
                    'messaging_product' => 'whatsapp',
                    'to' => $phone,
                    'type' => 'text',
                    'text' => ['body' => $message],
                ]);

            if (! $response->successful()) {
                $this->lastError = "WhatsApp API HTTP {$response->status()}: " . $response->body();
                Log::warning('whatsapp.send.failed', [
                    'recipient' => $phone,
                    'status' => $response->successful() ? '?' : $response->status(),
                    'body' => $response->body(),
                ]);
                return false;
            }

            Log::info('whatsapp.send.ok', [
                'recipient' => $phone,
                'message_id' => $response->json('messages.0.id'),
            ]);
            return true;
        } catch (\Throwable $e) {
            $this->lastError = $e->getMessage();
            Log::error('whatsapp.send.exception', [
                'recipient' => $phone,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Delegate ke FonnteChannel. Tampung lastError dari sana supaya
     * Notifier (email fallback path) bisa log error Fonnte juga.
     */
    private function sendViaFonnte(string $recipient, string $subject, string $message): bool
    {
        $ok = $this->fonnte->send($recipient, $subject, $message);
        $this->lastError = $this->fonnte->getLastError();
        return $ok;
    }

    private function logOnly(string $recipient, string $subject, string $message, string $event): bool
    {
        Log::channel(config('notifikasi.log_channel', 'stack'))
            ->info($event, [
                'recipient' => $recipient,
                'subject' => $subject,
                'message_preview' => mb_substr($message, 0, 200),
            ]);
        return true;
    }

    private function normalizePhone(string $raw): ?string
    {
        $digits = preg_replace('/[^0-9]/', '', $raw);
        if (empty($digits)) return null;
        // Convert 08xx → 628xx (Indonesia format)
        if (str_starts_with($digits, '0')) {
            $digits = '62' . substr($digits, 1);
        }
        if (strlen($digits) < 9) return null;
        return $digits;
    }
}
