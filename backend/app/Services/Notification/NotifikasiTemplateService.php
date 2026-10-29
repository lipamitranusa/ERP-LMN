<?php

namespace App\Services\Notification;

use App\Models\NotifikasiTemplate;

/**
 * Pengaturan isi format pesan notifikasi.
 *
 * Sumber kebenaran untuk format pesan adalah tabel `notifikasi_template`
 * (yang dapat diubah admin lewat tab "Format Pesan"). Bila belum ada baris
 * untuk kombinasi kanal + jenis, format bawaan dari `config/notifikasi.php`
 * dipakai. Bila tidak ada keduanya, pemanggil jatuh ke pesan hard-coded
 * miliknya sendiri (lihat parameter `$fallback`).
 *
 * Placeholder ditulis `{{nama_variabel}}`.
 */
class NotifikasiTemplateService
{
    public const CHANNEL_WHATSAPP = 'whatsapp';
    public const CHANNEL_EMAIL = 'email';

    /**
     * Katalog lengkap jenis notifikasi (dari config) — dipakai untuk
     * mengisi UI dan untuk menggabungkan data template tersimpan.
     */
    public function catalog(?string $channel = null): array
    {
        $catalog = config('notifikasi.templates', []);

        if ($channel !== null) {
            $catalog = array_filter(
                $catalog,
                fn ($def) => in_array($channel, $def['channels'] ?? [], true)
            );
        }

        return $catalog;
    }

    /**
     * Daftar template untuk kanal tertentu, digabung dengan data yang
     * tersimpan di DB. Kanal tanpa jenis notifikasi yang cocok → [].
     */
    public function listFor(string $channel): array
    {
        $saved = NotifikasiTemplate::where('channel', $channel)->get()->keyBy('jenis');

        $out = [];

        foreach ($this->catalog($channel) as $jenis => $def) {
            $row = $saved->get($jenis);
            $defaults = $def['defaults'][$channel] ?? [];

            $out[] = [
                'channel' => $channel,
                'jenis' => $jenis,
                'label' => $def['label'] ?? $jenis,
                'deskripsi' => $def['deskripsi'] ?? null,
                'variables' => $def['variables'] ?? [],
                'subject' => $row?->subject ?? ($defaults['subject'] ?? ''),
                'body' => $row?->body ?? ($defaults['body'] ?? ''),
                'aktif' => $row?->aktif ?? (bool) ($defaults['aktif'] ?? true),
                'body_templateable' => (bool) ($defaults['body_templateable'] ?? true),
                'customized' => $row !== null,
                'updated_at' => $row?->updated_at?->toDateTimeString(),
            ];
        }

        return $out;
    }

    /**
     * Template untuk kombinasi kanal + jenis, lengkap dengan status aktifnya.
     *
     * @return array{subject: string, body: string, body_templateable: bool, aktif: bool}|null
     *         null bila jenis notifikasi ini memang tidak dikirim lewat kanal tsb.
     */
    public function resolve(string $channel, string $jenis): ?array
    {
        $def = config("notifikasi.templates.{$jenis}");

        if (! $def || ! in_array($channel, $def['channels'] ?? [], true)) {
            return null;
        }

        $row = NotifikasiTemplate::findFor($channel, $jenis);
        $defaults = $def['defaults'][$channel] ?? [];

        return [
            'subject' => $row?->subject ?? ($defaults['subject'] ?? ''),
            'body' => $row?->body ?? ($defaults['body'] ?? ''),
            'body_templateable' => (bool) ($defaults['body_templateable'] ?? true),
            'aktif' => $row ? $row->aktif : (bool) ($defaults['aktif'] ?? true),
        ];
    }

    /**
     * Apakah jenis notifikasi ini memang dikirim lewat kanal ini?
     * (berbeda dengan `isActive` — kanal memang dipakai, tapi dimatikan admin)
     */
    public function supports(string $channel, string $jenis): bool
    {
        $def = config("notifikasi.templates.{$jenis}");

        return $def !== null && in_array($channel, $def['channels'] ?? [], true);
    }

    /**
     * Apakah jenis notifikasi ini AKTIF dikirim lewat kanal ini?
     */
    public function isActive(string $channel, string $jenis): bool
    {
        $template = $this->resolve($channel, $jenis);

        return $template !== null && $template['aktif'];
    }

    /**
     * Status pengiriman jenis notifikasi ini lewat kanal ini.
     *
     * - 'not_supported' → jenis notifikasi ini tidak ada di kanal ini, pemanggil
     *   bebas memakai pesan bawaan (hard-coded) miliknya.
     * - 'disabled'      → admin mematikan notifikasi ini pada kanal ini, jadi
     *   TIDAK BOLEH dikirim.
     * - 'active'        → kanal ini mengirim notifikasi ini.
     */
    public function status(string $channel, string $jenis): string
    {
        $template = $this->resolve($channel, $jenis);

        if ($template === null) {
            return 'not_supported';
        }

        return $template['aktif'] ? 'active' : 'disabled';
    }

    /**
     * Susun pesan final untuk kanal + jenis tertentu.
     *
     * @param  array  $context  nilai placeholder (nama_variabel => nilai)
     * @param  array  $fallback  ['subject' => ..., 'body' => ...] dipakai bila
     *                           channel ini tidak punya template untuk jenis ini
     * @return array{subject: string, body: string, missing: array<int,string>}|null
     *         null bila kanal tsb TIDAK dipakai untuk jenis notifikasi ini —
     *         baik karena jenis ini tidak ada di kanal tsb, maupun karena
     *         admin mematikan notifikasi ini.
     */
    public function compose(string $channel, string $jenis, array $context, array $fallback = []): ?array
    {
        $template = $this->resolve($channel, $jenis);

        // Tidak ada template untuk kanal ini → pemanggil pakai pesan bawaan.
        if (! $template) {
            return null;
        }

        // Notifikasi dimatikan admin untuk kanal ini.
        if (! $template['aktif']) {
            return null;
        }

        $subject = $this->render($template['subject'], $context);
        $missing = $this->missingPlaceholders($template['subject'], $context);

        // Isi pesan pada kanal ini berupa dokumen (HTML/PDF), bukan teks bebas.
        if ($template['body_templateable']) {
            $body = $this->render($template['body'], $context);
            $missing = array_merge($missing, $this->missingPlaceholders($template['body'], $context));
        } else {
            $body = $fallback['body'] ?? $template['body'];
        }

        return [
            'subject' => $subject,
            'body' => $body,
            'missing' => array_values(array_unique($missing)),
        ];
    }

    /**
     * Ganti placeholder `{{nama}}` dengan nilainya.
     */
    public function render(string $text, array $context): string
    {
        if ($text === '') {
            return '';
        }

        return preg_replace_callback(
            '/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/',
            function (array $m) use ($context) {
                $key = $m[1];

                if (! array_key_exists($key, $context)) {
                    return '';
                }

                $value = $context[$key];

                return is_scalar($value) || $value === null
                    ? (string) $value
                    : json_encode($value, JSON_UNESCAPED_UNICODE);
            },
            $text
        );
    }

    /**
     * Daftar placeholder yang dipakai teks tapi nilainya tidak tersedia.
     */
    public function missingPlaceholders(string $text, array $context): array
    {
        if (! preg_match_all('/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/', $text, $matches)) {
            return [];
        }

        return array_values(array_filter(
            array_unique($matches[1]),
            fn ($key) => ! array_key_exists($key, $context)
        ));
    }

    /**
     * Simpan batch template. Key format: "channel:jenis".
     *
     * @param  array<string, array{subject?: string, body?: string, aktif?: bool}>  $values
     * @return int jumlah template yang tersimpan
     */
    public function saveBatch(array $values): int
    {
        $saved = 0;

        foreach ($values as $compositeKey => $payload) {
            if (! str_contains($compositeKey, ':')) {
                continue;
            }

            [$channel, $jenis] = explode(':', $compositeKey, 2);
            $payload = is_array($payload) ? $payload : [];

            $attributes = [];

            if (array_key_exists('subject', $payload) && $payload['subject'] !== null) {
                $attributes['subject'] = (string) $payload['subject'];
            }

            if (array_key_exists('body', $payload) && $payload['body'] !== null) {
                $attributes['body'] = (string) $payload['body'];
            }

            if (array_key_exists('aktif', $payload) && $payload['aktif'] !== null) {
                $attributes['aktif'] = (bool) $payload['aktif'];
            }

            NotifikasiTemplate::updateOrCreate(
                ['channel' => $channel, 'jenis' => $jenis],
                $attributes
            );

            $saved++;
        }

        return $saved;
    }

    /**
     * Kembalikan template ke format bawaan (hapus override admin).
     */
    public function reset(string $channel, string $jenis): void
    {
        NotifikasiTemplate::where('channel', $channel)->where('jenis', $jenis)->delete();
    }
}
