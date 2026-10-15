<?php

namespace App\Services\Notification;

interface NotificationChannelInterface
{
    /**
     * Send a message. Returns true on success, false on failure.
     * On failure, implementations should set $lastError for logging.
     */
    public function send(string $recipient, string $subject, string $message): bool;

    public function name(): string;

    public function getLastError(): ?string;
}
