<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MailSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class MailSettingController extends Controller
{
    public function index(): JsonResponse
    {
        $all = MailSetting::all();
        $grouped = $all->groupBy('kategori')->map(fn ($items) => $items->values()->toArray());

        return response()->json([
            'data' => $all,
            'grouped' => $grouped,
        ]);
    }

    public function byKategori(string $kategori): JsonResponse
    {
        $items = MailSetting::where('kategori', $kategori)->get();
        return response()->json(['data' => $items]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'values' => 'required|array',
            'values.*' => 'nullable|string',
        ]);

        $updated = MailSetting::updateBatch($data['values']);

        Log::channel('single')->info('mail_settings.updated', [
            'user_id' => $request->user()?->id,
            'count' => $updated,
            'keys' => array_keys($data['values']),
        ]);

        return response()->json([
            'message' => "Berhasil menyimpan {$updated} pengaturan.",
            'updated' => $updated,
        ]);
    }

    /**
     * Test koneksi & kirim email test.
     */
    public function testConnection(Request $request): JsonResponse
    {
        $driver = $request->input('driver', MailSetting::driver());

        if ($driver === 'log') {
            return response()->json([
                'success' => true,
                'message' => 'Driver "log" — email tidak dikirim, hanya tercatat di log.',
            ]);
        }

        if ($driver === 'mailtrap') {
            return response()->json([
                'success' => true,
                'message' => 'Mailtrap — cek inbox di Mailtrap dashboard untuk email test.',
            ]);
        }

        $toEmail = $request->input('test_email', $request->user()?->email);
        $testMessage = $request->input('test_message', "Ini adalah email test dari sistem ERP Akreditasi LIPA MITRA NUSA.\n\nJika Anda menerima email ini, berarti konfigurasi mail server berhasil.");
        if (empty($toEmail)) {
            return response()->json(['success' => false, 'message' => 'Email test wajib diisi.'], 422);
        }

        try {
            $this->applyMailConfig($driver);

            $result = Mail::raw(
                $testMessage,
                function ($message) use ($toEmail) {
                    $fromAddress = MailSetting::value('from_address') ?: config('mail.from.address') ?: 'noreply@localhost';
                    $fromName = MailSetting::value('from_name') ?: config('mail.from.name') ?: 'ERP Akreditasi';

                    $message->to($toEmail)
                        ->from($fromAddress ?: 'noreply@localhost', $fromName ?: 'ERP Akreditasi')
                        ->subject('[TEST] Konfigurasi Mail Server — ERP Akreditasi');
                }
            );

            Log::channel('single')->info('mail_settings.test_sent', [
                'user_id' => $request->user()?->id,
                'to' => $toEmail,
                'driver' => $driver,
            ]);

            return response()->json([
                'success' => true,
                'message' => "Email test berhasil dikirim ke {$toEmail}.",
            ]);
        } catch (\Exception $e) {
            Log::channel('single')->error('mail_settings.test_failed', [
                'user_id' => $request->user()?->id,
                'driver' => $driver,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal mengirim email: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Terapkan konfigurasi mail dari database ke Laravel Mail config.
     */
    private function applyMailConfig(string $driver): void
    {
        $driverConfig = MailSetting::where('kategori', $driver)->get()->pluck('nilai', 'kunci')->toArray();

        if ($driver === 'smtp') {
            config([
                'mail.default' => 'smtp',
                'mail.mailers.smtp.host' => $driverConfig['host'] ?? '',
                'mail.mailers.smtp.port' => (int) ($driverConfig['port'] ?? 587),
                'mail.mailers.smtp.encryption' => $driverConfig['encryption'] ?: null,
                'mail.mailers.smtp.username' => $driverConfig['username'] ?? '',
                'mail.mailers.smtp.password' => $driverConfig['password'] ?? '',
                'mail.from.address' => $driverConfig['from_address'] ?: ($driverConfig['username'] ?: null),
                'mail.from.name' => MailSetting::value('from_name') ?: 'ERP Akreditasi',
            ]);
        } elseif ($driver === 'mailgun') {
            config([
                'mail.default' => 'mailgun',
                'mail.mailers.mailgun.domain' => $driverConfig['domain'] ?? '',
                'mail.mailers.mailgun.secret' => $driverConfig['secret'] ?? '',
                'mail.mailers.mailgun.endpoint' => 'api.mailgun.net',
                'mail.from.address' => $driverConfig['from_address'] ?: null,
                'mail.from.name' => MailSetting::value('from_name') ?: 'ERP Akreditasi',
            ]);
        } elseif ($driver === 'ses') {
            config([
                'mail.default' => 'ses',
                'mail.mailers.ses.region' => 'ap-southeast-1',
                'mail.from.address' => $driverConfig['from_address'] ?: null,
                'mail.from.name' => MailSetting::value('from_name') ?: 'ERP Akreditasi',
            ]);
        } elseif ($driver === 'postmark') {
            config([
                'mail.default' => 'postmark',
                'mail.mailers.postmark.token' => $driverConfig['secret'] ?? '',
                'mail.from.address' => $driverConfig['from_address'] ?: null,
                'mail.from.name' => MailSetting::value('from_name') ?: 'ERP Akreditasi',
            ]);
        }
    }
}
