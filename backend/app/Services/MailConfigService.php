<?php

namespace App\Services;

use App\Models\MailSetting;

/**
 * Apply mail configuration from the database (mail_settings table) into
 * Laravel's mail config at runtime.
 *
 * Used by:
 *   - MailSettingController (test connection)  → applies the driver being tested
 *   - EmailChannel (invoice / notification send) → applies the active driver from DB
 */
class MailConfigService
{
    /**
     * Apply the given driver (or the default driver from DB) to Laravel's
     * mail config. Returns the effective driver name.
     */
    public static function apply(?string $driver = null): string
    {
        $driver = $driver ?? MailSetting::driver();
        $driverConfig = MailSetting::where('kategori', $driver)->get()->pluck('nilai', 'kunci')->toArray();

        $fromAddress = $driverConfig['from_address']
            ?: MailSetting::value('from_address')
            ?: config('mail.from.address')
            ?: 'noreply@localhost';
        $fromName = $driverConfig['from_name']
            ?: MailSetting::value('from_name')
            ?: config('mail.from.name')
            ?: 'ERP Akreditasi';

        $config = match ($driver) {
            'smtp' => [
                'mail.default' => 'smtp',
                'mail.mailers.smtp.host' => $driverConfig['host'] ?? '',
                'mail.mailers.smtp.port' => (int) ($driverConfig['port'] ?? 587),
                'mail.mailers.smtp.encryption' => $driverConfig['encryption'] ?: null,
                'mail.mailers.smtp.username' => $driverConfig['username'] ?? '',
                'mail.mailers.smtp.password' => $driverConfig['password'] ?? '',
                'mail.from.address' => $driverConfig['from_address']
                    ?: ($driverConfig['username'] ?? null)
                    ?: $fromAddress,
                'mail.from.name' => $fromName,
            ],
            'mailgun' => [
                'mail.default' => 'mailgun',
                'mail.mailers.mailgun.domain' => $driverConfig['domain'] ?? '',
                'mail.mailers.mailgun.secret' => $driverConfig['secret'] ?? '',
                'mail.mailers.mailgun.endpoint' => 'api.mailgun.net',
                'mail.from.address' => $fromAddress,
                'mail.from.name' => $fromName,
            ],
            'ses' => [
                'mail.default' => 'ses',
                'mail.mailers.ses.region' => 'ap-southeast-1',
                'mail.from.address' => $fromAddress,
                'mail.from.name' => $fromName,
            ],
            'postmark' => [
                'mail.default' => 'postmark',
                'mail.mailers.postmark.token' => $driverConfig['secret'] ?? '',
                'mail.from.address' => $fromAddress,
                'mail.from.name' => $fromName,
            ],
            default => [
                'mail.default' => $driver,
                'mail.from.address' => $fromAddress,
                'mail.from.name' => $fromName,
            ],
        };

        config($config);
        return $driver;
    }

    /**
     * Returns true if email is enabled and the effective driver is not 'log'.
     */
    public static function canSend(): bool
    {
        if (! MailSetting::isEnabled()) {
            return false;
        }
        return MailSetting::driver() !== 'log';
    }

    /**
     * The effective driver name from DB (not the env fallback).
     */
    public static function driver(): string
    {
        return MailSetting::driver();
    }
}
