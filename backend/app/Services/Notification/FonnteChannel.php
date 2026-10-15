<?php

namespace App\Services\Notification;

use App\Models\WhatsAppSetting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Fonnte WhatsApp Gateway driver.
 *
 * Fonnte (https://fonnte.com) adalah gateway WhatsApp populer di
 * Indonesia yang menyediakan API sederhana untuk mengirim pesan WA
 * lewat perangkat yang sudah ter-scan QR — alternatif yang lebih
 * ringan dibanding Meta WhatsApp Cloud API (tidak butuh proses
 * approval template dari Meta).
 *
 * Credentials (dibaca dari tabel `whatsapp_settings` kategori `fonnte`):
 *   - api_token       — token dari dashboard Fonnte
 *   - device_number   — nomor pengirim (mis. 6281234567890); opsional
 *                        jika hanya ada satu device yang ter-scan
 *
 * API contract: POST https://api.fonnte.com/send
 *   Header: Authorization: <token>
 *   Body:   target=<phone>&message=<text>&countryCode=62
 *
 * Referensi: https://docs.fonnte.com/send-message
 */
class FonnteChannel implements NotificationChannelInterface
{
    private const API_URL = 'https://api.fonnte.com/send';

    private ?string $lastError = null;

    public function send(string $recipient, string $subject, string $message): bool
    {
        $this->lastError = null;

        $token = WhatsAppSetting::value('fonnte.api_token')
            ?? WhatsAppSetting::value('api_token');
        $device = WhatsAppSetting::value('fonnte.device_number')
            ?? WhatsAppSetting::value('device_number');

        // Fallback mode: no token → log only (dev/test).
        if (! $token) {
            Log::channel(config('notifikasi.log_channel', 'stack'))
                ->info('fonnte.send.log_only', [
                    'recipient' => $recipient,
                    'subject' => $subject,
                    'message_preview' => mb_substr($message, 0, 200),
                ]);
            return true;
        }

        $phone = $this->normalizePhone($recipient);
        if (! $phone) {
            $this->lastError = "Nomor WhatsApp tidak valid: {$recipient}";
            return false;
        }

        // Fonnte menerima subject+message digabung dengan newline
        // (subjek sebagai header pesan). Jika subject kosong, kirim
        // pesan apa adanya.
        $body = $subject ? "*{$subject}*\n\n{$message}" : $message;

        $payload = [
            'target' => $phone,
            'message' => $body,
            'countryCode' => '62',
        ];
        if ($device) {
            $payload['device'] = $device;
        }

        try {
            $response = Http::withHeaders(['Authorization' => $token])
                ->timeout(15)
                ->asForm()
                ->post(self::API_URL, $payload);

            if (! $response->successful()) {
                $this->lastError = "Fonnte API HTTP {$response->status()}: " . $response->body();
                Log::warning('fonnte.send.failed', [
                    'recipient' => $phone,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return false;
            }

            $body = $response->json();
            // Fonnte response shape: { status: true, ... } atau { reason: "...", status: false }
            if (is_array($body) && array_key_exists('status', $body) && $body['status'] === false) {
                $this->lastError = 'Fonnte menolak: ' . ($body['reason'] ?? 'unknown reason');
                Log::warning('fonnte.send.rejected', [
                    'recipient' => $phone,
                    'reason' => $body['reason'] ?? null,
                ]);
                return false;
            }

            Log::info('fonnte.send.ok', [
                'recipient' => $phone,
                'detail' => $body['detail'] ?? null,
            ]);
            return true;
        } catch (\Throwable $e) {
            $this->lastError = $e->getMessage();
            Log::error('fonnte.send.exception', [
                'recipient' => $phone,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    public function name(): string
    {
        return 'fonnte';
    }

    public function getLastError(): ?string
    {
        return $this->lastError;
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
