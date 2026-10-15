<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Notification Channels
    |--------------------------------------------------------------------------
    |
    | NFR-1: WhatsApp Business API (Meta Cloud API) is the primary channel.
    | Email is the fallback. The Notifier service tries WhatsApp first,
    | falls back to email on failure, and persists every attempt.
    |
    */

    // Log channel used by the WhatsApp/Email drivers in dev/test
    // (when no real credentials are configured).
    'log_channel' => env('NOTIFIKASI_LOG_CHANNEL', 'stack'),

    // Email mailer for fallback. 'log' / 'array' = dev (no SMTP).
    'email_mailer' => env('NOTIFIKASI_EMAIL_MAILER', env('MAIL_MAILER', 'log')),

    /*
    |--------------------------------------------------------------------------
    | Invoice Reminder Schedule
    |--------------------------------------------------------------------------
    | FR-5.4a: reminders are sent H-3 and H-1 before due date, and a
    | "terlambat" reminder after due date if survei is berjalan.
    | AC-9: only if the invoice is overdue AND a survei is in progress.
    */
    'reminder_offsets_days' => [3, 1],

    // Maximum retry attempts for failed notifications.
    'max_attempts' => 5,
];
