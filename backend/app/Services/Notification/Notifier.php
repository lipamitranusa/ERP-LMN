<?php

namespace App\Services\Notification;

use App\Models\NotifikasiTagihan;
use App\Services\Invoice\InvoicePdfGenerator;
use App\Services\Invoice\TagihanService;
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
        private InvoicePdfGenerator $invoicePdf,
        private TagihanService $tagihanService,
        private NotifikasiTemplateService $templates,
    ) {}

    /**
     * Send a notification with primary WhatsApp + email fallback.
     * Persists the attempt to notifikasi_tagihan for auditability and retry.
     *
     * @param  array  $attachments  Lampiran untuk kanal email (mis. PDF invoice).
     * @param  string|null  $invoiceId  Id invoice terkait; dipakai agar retry
     *                                  bisa membuat ulang lampiran PDF.
     * @param  array  $context  Nilai placeholder untuk template pesan
     *                          (nama_variabel => nilai). Bila kosong, pesan
     *                          memakai $subject/$message apa adanya.
     * @param  bool  $whatsappEnabled  false berarti kanal WhatsApp dilewati
     *                                  (sakelar admin dimatikan atau nomor
     *                                  penerima tidak tersedia) — pesan
     *                                  langsung dikirim via email.
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
        array $attachments = [],
        ?string $invoiceId = null,
        array $context = [],
        bool $whatsappEnabled = true,
    ): array {
        // Template pesan: subjek + isi pesan per kanal diambil dari
        // pengaturan "Format Pesan". Bila kanal tidak punya template untuk
        // jenis notifikasi ini, pesan bawaan (hard-coded) dipakai. Bila admin
        // mematikan notifikasi ini di kanal tersebut, kanal itu dilewati.
        $waStatus = $this->templates->status('whatsapp', $jenis);
        $waTemplate = $waStatus === 'active'
            ? $this->templates->compose('whatsapp', $jenis, $context, [
                'subject' => $subject,
                'body' => $message,
            ])
            : null;

        $waSubject = $waTemplate['subject'] ?? $subject;
        $waMessage = $waTemplate['body'] ?? $message;

        $phone = false;
        $whatsappError = null;

        if (! $whatsappEnabled) {
            // Sakelar admin dimatikan atau nomor penerima tidak tersedia —
            // langsung ke email.
            $whatsappError = 'Notifikasi WhatsApp dilewati: dimatikan di pengaturan atau nomor penerima tidak tersedia.';
            Log::info('notifier.whatsapp.skipped', [
                'siklus_id' => $siklusId,
                'jenis' => $jenis,
            ]);
        } elseif ($waStatus === 'disabled') {
            // Admin mematikan notifikasi ini di WhatsApp — langsung ke email.
            $whatsappError = 'Notifikasi dimatikan pada pengaturan format pesan (WhatsApp).';
            Log::info('notifier.whatsapp.disabled_by_settings', [
                'siklus_id' => $siklusId,
                'jenis' => $jenis,
            ]);
        } else {
            $phone = $this->whatsapp->send($recipientPhone, $waSubject, $waMessage);
        }

        if ($phone) {
            $notif = $this->persist([
                'siklus_id' => $siklusId,
                'penugasan_id' => $penugasanId,
                'jenis' => $jenis,
                'channel' => 'whatsapp',
                'recipient' => $recipientPhone,
                'status' => NotifikasiTagihan::STATUS_TERKIRIM,
                'dikirim_pada' => now(),
                'payload' => ['subject' => $waSubject, 'message' => $waMessage, 'invoice_id' => $invoiceId],
            ]);
            return ['status' => 'terkirim', 'channel' => 'whatsapp', 'notifikasi_id' => $notif->id];
        }

        $whatsappError = $whatsappError ?? $this->whatsapp->getLastError();
        Log::warning('notifier.whatsapp.fallback_email', [
            'siklus_id' => $siklusId,
            'jenis' => $jenis,
            'whatsapp_error' => $whatsappError,
        ]);

        $emailStatus = $this->templates->status('email', $jenis);
        $emailTemplate = $emailStatus === 'active'
            ? $this->templates->compose('email', $jenis, $context, [
                'subject' => $subject,
                'body' => $message,
            ])
            : null;

        $emailSubject = $emailTemplate['subject'] ?? $subject;
        $emailMessage = $emailTemplate['body'] ?? $message;

        if ($emailStatus === 'disabled') {
            // Kedua kanal dimatikan — tidak ada yang dikirim, tapi tetap dicatat
            // sebagai audit. attempt_count di-set ke maksimum supaya tidak
            // pernah masuk antrean retry (dimatikan berarti memang tidak mau
            // dikirim, bukan "gagal sementara").
            $notif = $this->persist([
                'siklus_id' => $siklusId,
                'penugasan_id' => $penugasanId,
                'jenis' => $jenis,
                'channel' => 'none',
                'recipient' => $recipientPhone,
                'status' => NotifikasiTagihan::STATUS_GAGAL,
                'error_message' => 'Notifikasi dimatikan pada pengaturan format pesan untuk seluruh kanal.',
                'payload' => $this->retryPayload($subject, $message, $context, $invoiceId),
            ]);

            $notif->forceFill([
                'attempt_count' => self::MAX_ATTEMPTS,
                'next_retry_at' => null,
            ])->save();

            return [
                'status' => 'gagal',
                'channel' => 'none',
                'notifikasi_id' => $notif->id,
                'error' => 'Notifikasi dimatikan pada pengaturan.',
            ];
        }

        if ($recipientEmail) {
            $emailOk = $this->email->send($recipientEmail, $emailSubject, $emailMessage, null, $attachments);
            if ($emailOk) {
                $notif = $this->persist([
                    'siklus_id' => $siklusId,
                    'penugasan_id' => $penugasanId,
                    'jenis' => $jenis,
                    'channel' => 'email',
                    'recipient' => $recipientEmail,
                    'status' => NotifikasiTagihan::STATUS_TERKIRIM,
                    'dikirim_pada' => now(),
                    'payload' => ['subject' => $emailSubject, 'message' => $emailMessage, 'invoice_id' => $invoiceId, 'whatsapp_fallback_error' => $whatsappError],
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
                'payload' => $this->retryPayload($subject, $message, $context, $invoiceId),
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
            'payload' => $this->retryPayload($subject, $message, $context, $invoiceId),
        ]);
        return [
            'status' => 'gagal',
            'channel' => 'none',
            'notifikasi_id' => $notif->id,
            'error' => $whatsappError,
        ];
    }

    /**
     * Payload untuk notifikasi yang gagal dan akan dicoba ulang.
     *
     * Menyimpan `context` (nilai placeholder) sehingga percobaan ulang
     * merender ulang template dengan data yang sama — kalau tidak, placeholder
     * akan ter-substitute dengan string kosong pada retry.
     *
     * @return array<string, mixed>
     */
    private function retryPayload(
        string $subject,
        string $message,
        array $context,
        ?string $invoiceId,
    ): array {
        return [
            'subject' => $subject,
            'message' => $message,
            'context' => $context,
            'invoice_id' => $invoiceId,
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
        $invoiceId = $payload['invoice_id'] ?? null;

        // Nilai placeholder dari percobaan pertama — dipakai agar template
        // dirender ulang dengan data yang sama.
        $context = is_array($payload['context'] ?? null) ? $payload['context'] : [];

        $result = $this->sendWithFallback(
            recipientPhone: $notif->recipient,
            recipientEmail: $this->getFallbackEmailForSiklus($notif->siklus_id),
            subject: $subject,
            message: $message,
            siklusId: $notif->siklus_id,
            jenis: $notif->jenis,
            penugasanId: $notif->penugasan_id,
            attachments: $this->buildInvoiceAttachments($invoiceId),
            invoiceId: $invoiceId,
            context: $context,
        );

        return $result;
    }

    /**
     * Buat ulang lampiran PDF invoice untuk percobaan kirim ulang.
     */
    private function buildInvoiceAttachments(?string $invoiceId): array
    {
        if (! $invoiceId) {
            return [];
        }

        $invoice = \App\Models\Invoice::find($invoiceId);
        if (! $invoice) {
            return [];
        }

        try {
            $pdf = $this->invoicePdf->generate($this->tagihanService->build($invoice));

            return [[
                'name' => $pdf['filename'],
                'content' => $pdf['content'],
                'mime' => 'application/pdf',
            ]];
        } catch (\Throwable $e) {
            Log::error('notifier.invoice_pdf.failed', [
                'invoice_id' => $invoiceId,
                'error' => $e->getMessage(),
            ]);
            return [];
        }
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
