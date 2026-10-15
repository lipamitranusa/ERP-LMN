<?php

namespace App\Services\Notification;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Email fallback channel.
 *
 * In Fase 1 / dev: logs to file (Mail::raw in log mode).
 * In production: uses Laravel's default mailer.
 */
class EmailChannel implements NotificationChannelInterface
{
    private ?string $lastError = null;

    public function send(string $recipient, string $subject, string $message): bool
    {
        $this->lastError = null;

        if (! filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
            $this->lastError = "Alamat email tidak valid: {$recipient}";
            return false;
        }

        $mailer = config('notifikasi.email_mailer');

        try {
            if ($mailer === 'log' || $mailer === 'array' || empty($mailer)) {
                // Dev/test path: no real SMTP, log it.
                Log::channel(config('notifikasi.log_channel', 'stack'))
                    ->info('email.send.log_only', [
                        'recipient' => $recipient,
                        'subject' => $subject,
                        'body_preview' => mb_substr($message, 0, 200),
                    ]);
                return true;
            }

            Mail::raw($message, function ($msg) use ($recipient, $subject) {
                $msg->to($recipient)->subject($subject);
            });

            Log::info('email.send.ok', ['recipient' => $recipient, 'subject' => $subject]);
            return true;
        } catch (\Throwable $e) {
            $this->lastError = $e->getMessage();
            Log::error('email.send.exception', ['recipient' => $recipient, 'error' => $e->getMessage()]);
            return false;
        }
    }

    public function name(): string
    {
        return 'email';
    }

    public function getLastError(): ?string
    {
        return $this->lastError;
    }
}
