<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Notification\NotifikasiTemplateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Pengaturan isi format pesan notifikasi.
 *
 * Endpoint:
 *   GET  /api/notifikasi-template                → daftar template (semua kanal)
 *   GET  /api/notifikasi-template/{channel}       → template satu kanal
 *   PUT  /api/notifikasi-template                → simpan batch template
 *   POST /api/notifikasi-template/preview        → pratinjau hasil render
 *   POST /api/notifikasi-template/reset          → kembalikan ke format bawaan
 *
 * Privilege: "Pengaturan Hak Akses" (Ubah)
 */
class NotifikasiTemplateController extends Controller
{
    public function __construct(private NotifikasiTemplateService $templates) {}

    /**
     * GET /api/notifikasi-template
     * Daftar template untuk seluruh kanal (dipakai halaman Pengaturan).
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => [
                'whatsapp' => $this->templates->listFor('whatsapp'),
                'email' => $this->templates->listFor('email'),
            ],
        ]);
    }

    /**
     * GET /api/notifikasi-template/{channel}
     */
    public function byChannel(string $channel): JsonResponse
    {
        if (! in_array($channel, ['whatsapp', 'email'], true)) {
            return response()->json(['message' => 'Kanal tidak dikenal.'], 422);
        }

        return response()->json([
            'data' => $this->templates->listFor($channel),
        ]);
    }

    /**
     * PUT /api/notifikasi-template
     * Body: { values: { "channel:jenis": { subject, body, aktif } } }
     */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'values' => 'required|array',
            'values.*' => 'nullable|array',
            'values.*.subject' => 'nullable|string|max:500',
            'values.*.body' => 'nullable|string|max:20000',
            'values.*.aktif' => 'nullable|boolean',
        ]);

        $updated = $this->templates->saveBatch($data['values']);

        Log::channel('single')->info('notifikasi_template.updated', [
            'user_id' => $request->user()?->id,
            'count' => $updated,
            'keys' => array_keys($data['values']),
        ]);

        return response()->json([
            'message' => "Berhasil menyimpan {$updated} template pesan.",
            'updated' => $updated,
        ]);
    }

    /**
     * POST /api/notifikasi-template/preview
     * Body: { channel, jenis, subject?, body? }
     *
     * Bila subject/body tidak dikirim, template yang tersimpan dipakai.
     * Hasil render memakai nilai contoh (contoh) dari katalog variabel.
     */
    public function preview(Request $request): JsonResponse
    {
        $data = $request->validate([
            'channel' => 'required|in:whatsapp,email',
            'jenis' => 'required|string|max:60',
            'subject' => 'nullable|string|max:500',
            'body' => 'nullable|string|max:20000',
        ]);

        $channel = $data['channel'];
        $jenis = $data['jenis'];

        $catalog = config("notifikasi.templates.{$jenis}");

        if (! $catalog || ! in_array($channel, $catalog['channels'] ?? [], true)) {
            return response()->json([
                'message' => 'Jenis notifikasi ini tidak tersedia untuk kanal tersebut.',
            ], 422);
        }

        $saved = $this->templates->resolve($channel, $jenis);
        $defaults = $catalog['defaults'][$channel] ?? [];

        $subject = $data['subject'] ?? $saved['subject'] ?? ($defaults['subject'] ?? '');
        $body = $data['body'] ?? $saved['body'] ?? ($defaults['body'] ?? '');

        // Nilai contoh dari katalog variabel.
        $context = [];
        foreach ($catalog['variables'] ?? [] as $key => $meta) {
            $context[$key] = $meta['contoh'] ?? '';
        }

        $missing = array_merge(
            $this->templates->missingPlaceholders($subject, $context),
            $this->templates->missingPlaceholders($body, $context)
        );

        return response()->json([
            'data' => [
                'subject' => $this->templates->render($subject, $context),
                'body' => $this->templates->render($body, $context),
                'missing' => array_values(array_unique($missing)),
            ],
        ]);
    }

    /**
     * POST /api/notifikasi-template/reset
     * Body: { channel, jenis } — hapus override, kembali ke format bawaan.
     */
    public function reset(Request $request): JsonResponse
    {
        $data = $request->validate([
            'channel' => 'required|in:whatsapp,email',
            'jenis' => 'required|string|max:60',
        ]);

        $this->templates->reset($data['channel'], $data['jenis']);

        Log::channel('single')->info('notifikasi_template.reset', [
            'user_id' => $request->user()?->id,
            'channel' => $data['channel'],
            'jenis' => $data['jenis'],
        ]);

        return response()->json([
            'message' => 'Template dikembalikan ke format bawaan.',
        ]);
    }
}
