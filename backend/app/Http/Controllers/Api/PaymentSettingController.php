<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

class PaymentSettingController extends Controller
{
    public function index(): JsonResponse
    {
        $all = PaymentSetting::all();
        $grouped = $all->groupBy('kategori')->map(fn($items) => $items->values()->toArray());

        return response()->json([
            'data' => $all,
            'grouped' => $grouped,
        ]);
    }

    public function byKategori(string $kategori): JsonResponse
    {
        $items = PaymentSetting::where('kategori', $kategori)->get();
        return response()->json(['data' => $items]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'values' => 'required|array',
            'values.*' => 'nullable|string',
        ]);

        $updated = PaymentSetting::updateBatch($data['values']);

        Log::info('payment_settings.updated', [
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
     * Test koneksi ke gateway: ping API dengan API key yang disuplai.
     */
    public function testConnection(Request $request): JsonResponse
    {
        $driver = $request->input('driver', 'midtrans');
        $mode = $request->input('mode', 'sandbox');

        if ($driver === 'midtrans') {
            $serverKey = $request->input('server_key', '');
            if (empty($serverKey)) {
                return response()->json(['success' => false, 'message' => 'Server Key tidak boleh kosong.'], 422);
            }

            try {
                $baseUrl = $mode === 'production'
                    ? 'https://api.midtrans.com'
                    : 'https://api.sandbox.midtrans.com';

                // Midtrans tidak punya endpoint "ping". Kita validasi dengan membuat
                // transaksi dummy yang akan ditolak (oleh sistem) tapi tervalidasi
                // (oleh auth) — kalau Server Key invalid → 401, kalau valid → 4xx dengan body.
                $response = Http::withBasicAuth($serverKey, '')
                    ->withHeaders(['Accept' => 'application/json'])
                    ->post("{$baseUrl}/snap/v1/transactions", [
                        'transaction_details' => [
                            'order_id' => 'CONN-TEST-' . uniqid(),
                            'gross_amount' => 1,
                        ],
                    ]);

                $status = $response->status();

                // 401/403 = key invalid; 400/422 dengan body error validasi = key valid
                // (artinya request sampai ke Midtrans dan ditolak di level data, bukan auth)
                if ($status === 401 || $status === 403) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Server Key ditolak oleh Midtrans (HTTP ' . $status . '). Periksa kembali Server Key Anda.',
                    ], 422);
                }

                if ($status >= 200 && $status < 500) {
                    return response()->json([
                        'success' => true,
                        'message' => "Koneksi berhasil — Server Key valid (HTTP {$status}).",
                    ]);
                }

                return response()->json([
                    'success' => false,
                    'message' => 'Midtrans tidak dapat dihubungi (HTTP ' . $status . ').',
                ], 422);
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Gagal terhubung: ' . $e->getMessage(),
                ], 422);
            }
        }

        if ($driver === 'xendit') {
            $apiKey = $request->input('api_key', '');
            if (empty($apiKey)) {
                return response()->json(['success' => false, 'message' => 'API Key tidak boleh kosong.'], 422);
            }

            try {
                $response = Http::withToken($apiKey, 'Basic')
                    ->get('https://api.xendit.co/balance');

                if ($response->successful()) {
                    return response()->json([
                        'success' => true,
                        'message' => 'Koneksi berhasil — API Key valid.',
                    ]);
                }

                return response()->json([
                    'success' => false,
                    'message' => 'API Key tidak valid atau tidak terjangkau.',
                ], 422);
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Gagal terhubung: ' . $e->getMessage(),
                ], 422);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Fake gateway — koneksi tidak diperlukan.',
        ]);
    }
}
