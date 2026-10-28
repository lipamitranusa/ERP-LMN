<?php

namespace App\Services\Notification;

use App\Models\MailSetting;
use App\Services\MailConfigService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Email notification channel.
 *
 * Mail configuration comes from the mail_settings table (set via the
 * "Pengaturan Mail" screen), not from the .env MAIL_MAILER value — the env
 * value is only the bootstrap fallback for a fresh install.
 *
 * When the active driver is 'log' the message is written to the log instead
 * of being sent, and the caller is told so it can mark the attempt as
 * "recorded" rather than "delivered".
 */
class EmailChannel implements NotificationChannelInterface
{
    private ?string $lastError = null;

    /**
     * @param  string|null  $html  Optional HTML body; when given the message
     *                            is sent as HTML with the plain text as
     *                            alternative part.
     * @param  array  $attachments  Optional attachments. Each item accepts
     *                               'content' (binary string) or 'path'
     *                               (file on disk), plus 'name' and 'mime'.
     */
    public function send(string $recipient, string $subject, string $message, ?string $html = null, array $attachments = []): bool
    {
        $this->lastError = null;

        if (! filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
            $this->lastError = "Alamat email tidak valid: {$recipient}";
            return false;
        }

        if (! MailSetting::isEnabled()) {
            $this->lastError = 'Email dinonaktifkan pada Pengaturan Mail.';
            return false;
        }

        $driver = MailConfigService::apply();

        try {
            if ($driver === 'log') {
                Log::channel(config('notifikasi.log_channel', 'stack'))
                    ->info('email.send.log_only', [
                        'recipient' => $recipient,
                        'subject' => $subject,
                        'body_preview' => mb_substr($message, 0, 200),
                    ]);
                return true;
            }

            $fromAddress = config('mail.from.address') ?: 'noreply@localhost';
            $fromName = config('mail.from.name') ?: 'ERP Akreditasi';

            if ($html !== null) {
                Mail::html($html, function ($msg) use ($recipient, $subject, $message, $fromAddress, $fromName, $attachments) {
                    $msg->to($recipient)
                        ->from($fromAddress, $fromName)
                        ->subject($subject)
                        ->text($message);

                    $this->applyAttachments($msg, $attachments);
                });
            } else {
                Mail::raw($message, function ($msg) use ($recipient, $subject, $fromAddress, $fromName, $attachments) {
                    $msg->to($recipient)
                        ->from($fromAddress, $fromName)
                        ->subject($subject);

                    $this->applyAttachments($msg, $attachments);
                });
            }

            Log::info('email.send.ok', [
                'recipient' => $recipient,
                'subject' => $subject,
                'driver' => $driver,
            ]);
            return true;
        } catch (\Throwable $e) {
            $this->lastError = $e->getMessage();
            Log::error('email.send.exception', [
                'recipient' => $recipient,
                'driver' => $driver,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    public function name(): string
    {
        return 'email';
    }

    /**
     * Pasang lampiran ke message. Format item:
     *   ['name' => 'Invoice-123.pdf', 'content' => $binary, 'mime' => 'application/pdf']
     *   ['name' => 'file.pdf', 'path' => '/abs/path/file.pdf']
     */
    private function applyAttachments($msg, array $attachments): void
    {
        foreach ($attachments as $attachment) {
            $name = $attachment['name'] ?? 'attachment';
            $mime = $attachment['mime'] ?? null;

            if (isset($attachment['path'])) {
                $options = array_filter(['as' => $name, 'mime' => $mime]);
                $msg->attach($attachment['path'], $options);
                continue;
            }

            if (isset($attachment['content'])) {
                $options = array_filter(['as' => $name, 'mime' => $mime]);
                $msg->attachData($attachment['content'], $name, $options);
            }
        }
    }

    public function getLastError(): ?string
    {
        return $this->lastError;
    }
}
