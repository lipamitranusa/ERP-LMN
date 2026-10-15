<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WhatsAppSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Pengaturan WhatsApp Business API (Meta WhatsApp Cloud API).
 * Privilege: "Pengaturan Hak Akses" (di grup Pengaturan bersama Mail & Payment).
 */
class WhatsAppSettingController extends Controller
{
    /**
     * GET /api/whatsapp-settings
     * Semua pengaturan WhatsApp, dikelompokkan per kategori.
     */
    public function index(): JsonResponse
    {
        $all = WhatsAppSetting::all();

        return response()->json([
            'data' => $all,
            'grouped' => $all->groupBy('kategori')->map(fn ($items) => $items->values()->toArray()),
        ]);
    }

    /**
     * PUT /api/whatsapp-settings
     * Simpan perubahan pengaturan.
     */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'values' => 'required|array',
            'values.*' => 'nullable|string',
        ]);

        $updated = WhatsAppSetting::updateBatch($data['values']);

        Log::channel('single')->info('whatsapp_settings.updated', [
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
     * POST /api/whatsapp-settings/test-send
     * Kirim 1 pesan test ke nomor tertentu via driver yang sedang aktif.
     * Body: { phone, message, subject? }
     *
     * Tidak seperti testConnection (yang hanya cek kredensial), endpoint
     * ini benar-benar mengirim pesan — memvalidasi end-to-end pipeline
     * (config reading → driver dispatch → API call → delivery).
     */
    public function testSend(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => 'required|string|min:8|max:20',
            'message' => 'required|string|min:1|max:1000',
            'subject' => 'nullable|string|max:100',
        ]);

        $driver = WhatsAppSetting::driver();
        $phone = $data['phone'];
        $subject = $data['subject'] ?? 'Test pesan dari ERP';
        $message = $data['message'];

        $wa = app(\App\Services\Notification\WhatsAppChannel::class);
        $ok = $wa->send($phone, $subject, $message);

        if ($ok) {
            return response()->json([
                'success' => true,
                'message' => 'Pesan test berhasil dikirim via ' . $this->driverLabel($driver) . '. Cek WhatsApp di nomor tujuan.',
                'driver' => $driver,
            ]);
        }

        $err = $wa->getLastError();
        Log::channel('single')->warning('whatsapp_settings.test_send_failed', [
            'user_id' => $request->user()?->id,
            'driver' => $driver,
            'phone' => $phone,
            'error' => $err,
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Pesan test gagal: ' . ($err ?: 'unknown error'),
            'driver' => $driver,
        ], 422);
    }

    /**
     * Label Indonesia untuk driver — dipakai di response message.
     */
    private function driverLabel(string $driver): string
    {
        return match ($driver) {
            'fonnte' => 'Fonnte',
            'log' => 'mode log (tidak benar-benar terkirim)',
            default => 'WhatsApp Cloud API (Meta)',
        };
    }
    public function testConnection(Request $request): JsonResponse
    {
        $driver = \App\Models\WhatsAppSetting::driver();

        return match ($driver) {
            'fonnte' => $this->testFonnteConnection($request),
            'log' => response()->json([
                'success' => true,
                'message' => 'Mode log: pesan hanya akan ditulis ke log aplikasi, tidak ada koneksi yang diuji.',
            ]),
            default => $this->testMetaConnection($request),
        };
    }

    /**
     * Test koneksi Meta WhatsApp Cloud API.
     * Memerlukan App ID + App Secret untuk OAuth token, lalu verifikasi
     * Phone Number ID via Graph API.
     */
    private function testMetaConnection(Request $request): JsonResponse
    {
        $appId = WhatsAppSetting::value('app_id');
        $appSecret = WhatsAppSetting::value('app_secret');

        if (empty($appId) || empty($appSecret)) {
            return response()->json([
                'success' => false,
                'message' => 'App ID dan App Secret belum dikonfigurasi.',
            ], 422);
        }

        try {
            // Dapatkan Access Token via Graph API
            $response = Http::asForm()->post(
                'https://graph.facebook.com/v18.0/oauth/access_token',
                [
                    'grant_type' => 'client_credentials',
                    'client_id' => $appId,
                    'client_secret' => $appSecret,
                ]
            );

            if (!$response->successful()) {
                $body = $response->json();
                Log::channel('single')->warning('whatsapp_settings.test_failed', [
                    'user_id' => $request->user()?->id,
                    'error' => $body,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Gagal mendapatkan access token: ' . ($body['error']['message'] ?? 'Unknown error'),
                ], 422);
            }

            $accessToken = $response['access_token'];
            $phoneNumberId = WhatsAppSetting::value('phone_number_id');

            if (empty($phoneNumberId)) {
                return response()->json([
                    'success' => true,
                    'message' => 'Access token berhasil diperoleh. Phone Number ID belum dikonfigurasi.',
                    'access_token_obtained' => true,
                ]);
            }

            // Verify Phone Number ID dengan GET /phone_number
            $phoneResponse = Http::withToken($accessToken)
                ->get("https://graph.facebook.com/v18.0/{$phoneNumberId}", [
                    'fields' => 'id,display_phone_number,verified_name,code_verification_status,quality_rating',
                ]);

            if (!$phoneResponse->successful()) {
                $body = $phoneResponse->json();
                return response()->json([
                    'success' => false,
                    'message' => 'Phone Number ID tidak valid atau tidak memiliki akses: ' . ($body['error']['message'] ?? 'Unknown error'),
                ], 422);
            }

            $phoneData = $phoneResponse->json();

            Log::channel('single')->info('whatsapp_settings.test_success', [
                'user_id' => $request->user()?->id,
                'phone_number_id' => $phoneNumberId,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Koneksi berhasil. WhatsApp Business API terhubung.',
                'phone' => [
                    'number' => $phoneData['display_phone_number'] ?? null,
                    'name' => $phoneData['verified_name'] ?? null,
                    'status' => $phoneData['code_verification_status'] ?? null,
                    'rating' => $phoneData['quality_rating'] ?? null,
                ],
            ]);
        } catch (\Exception $e) {
            Log::channel('single')->error('whatsapp_settings.test_exception', [
                'user_id' => $request->user()?->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error koneksi: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Test koneksi Fonnte. Panggil endpoint `/device` untuk memastikan
     * token valid dan menampilkan daftar device yang terhubung.
     *
     * https://docs.fonnte.com/device
     */
    private function testFonnteConnection(Request $request): JsonResponse
    {
        $token = WhatsAppSetting::value('fonnte.api_token')
            ?? WhatsAppSetting::value('api_token');

        if (empty($token)) {
            return response()->json([
                'success' => false,
                'message' => 'API Token Fonnte belum dikonfigurasi. Buka tab Fonnte, isikan token dari dashboard.fonnte.com.',
            ], 422);
        }

        try {
            $response = Http::withHeaders(['Authorization' => $token])
                ->timeout(10)
                ->post('https://api.fonnte.com/device');

            if (! $response->successful()) {
                Log::channel('single')->warning('whatsapp_settings.fonnte_test_failed', [
                    'user_id' => $request->user()?->id,
                    'status' => $response->status(),
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Fonnte API HTTP ' . $response->status() . ': ' . $response->body(),
                ], 422);
            }

            $data = $response->json();
            // Fonnte response: { status: true, data: [{name, number, ...}, ...] }
            if (! is_array($data) || ! ($data['status'] ?? false)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Fonnte menolak token: ' . ($data['reason'] ?? 'unknown reason'),
                ], 422);
            }

            $devices = is_array($data['data'] ?? null) ? $data['data'] : [];
            $deviceNumbers = array_map(
                fn($d) => $d['number'] ?? ($d['phone'] ?? null),
                $devices
            );
            $deviceNumbers = array_values(array_filter($deviceNumbers));

            Log::channel('single')->info('whatsapp_settings.fonnte_test_success', [
                'user_id' => $request->user()?->id,
                'device_count' => count($devices),
            ]);

            $configuredDevice = WhatsAppSetting::value('fonnte.device_number')
                ?? WhatsAppSetting::value('device_number');
            $deviceWarning = null;
            if ($configuredDevice && $deviceNumbers && ! in_array($configuredDevice, $deviceNumbers, true)) {
                $deviceWarning = "Nomor perangkat '{$configuredDevice}' tidak ditemukan di daftar device Fonnte yang aktif.";
            }

            return response()->json([
                'success' => true,
                'message' => $deviceWarning ?? 'Koneksi Fonnte berhasil.',
                'phone' => [
                    'number' => $deviceNumbers[0] ?? null,
                    'name' => $devices[0]['name'] ?? null,
                    'status' => $devices[0]['status'] ?? 'connected',
                    'rating' => null,
                    'devices' => $deviceNumbers,
                    'device_count' => count($devices),
                ],
            ]);
        } catch (\Exception $e) {
            Log::channel('single')->error('whatsapp_settings.fonnte_test_exception', [
                'user_id' => $request->user()?->id,
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Error koneksi Fonnte: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * POST /api/webhooks/whatsapp
     * Webhook endpoint untuk menerima notifikasi dari Meta.
     * Diverifikasi menggunakan verify_token.
     */
    public function webhook(Request $request): JsonResponse
    {
        $mode = $request->query('hub_mode');
        $verifyToken = $request->query('hub_verify_token');
        $challenge = $request->query('hub_challenge');

        // Verify webhook challenge
        if ($mode === 'subscribe' && $verifyToken === WhatsAppSetting::value('verify_token')) {
            Log::channel('single')->info('whatsapp.webhook.verified', [
                'ip' => $request->ip(),
            ]);
            return response($challenge, 200)->header('Content-Type', 'text/plain');
        }

        // Handle incoming notifications
        if ($request->has('entry')) {
            Log::channel('single')->info('whatsapp.webhook.notification', [
                'entry' => $request->input('entry'),
            ]);
        }

        return response()->json(['status' => 'ok']);
    }
}
