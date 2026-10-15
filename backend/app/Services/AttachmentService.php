<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Service untuk mengelola file attachment di Cloudflare R2.
 *
 * Path convention:
 *   {module}/{yyyy}/{mm}/{uuid}_{filename}
 *
 * Module: dokumen, pks, surat_tugas, bukti_pembayaran, bukti_potong, dll.
 */
class AttachmentService
{
    private string $disk = 'r2';

    /**
     * Upload file ke R2 dan return path/key.
     */
    public function store(UploadedFile $file, string $module, ?string $oldPath = null): string
    {
        $path = $this->buildPath($module, $file->getClientOriginalName());

        Storage::disk($this->disk)->put($path, $file->getContent());

        // Delete old file if replacing
        if ($oldPath && $oldPath !== $path) {
            $this->delete($oldPath);
        }

        return $path;
    }

    /**
     * Upload dari local path (string content, misal PDF yang di-generate).
     */
    public function put(string $content, string $module, string $filename, ?string $oldPath = null): string
    {
        $path = $this->buildPath($module, $filename);

        Storage::disk($this->disk)->put($path, $content);

        if ($oldPath && $oldPath !== $path) {
            $this->delete($oldPath);
        }

        return $path;
    }

    /**
     * Copy file dari disk lokal ke R2.
     */
    public function copyFromLocal(string $localPath, string $module, string $filename, ?string $oldPath = null): string
    {
        $path = $this->buildPath($module, $filename);

        $content = Storage::disk('local')->get($localPath);
        Storage::disk($this->disk)->put($path, $content);

        if ($oldPath && $oldPath !== $path) {
            $this->delete($oldPath);
        }

        return $path;
    }

    /**
     * Hapus file dari R2.
     */
    public function delete(string $path): bool
    {
        if (! $path) {
            return false;
        }
        return Storage::disk($this->disk)->delete($path);
    }

    /**
     * Cek apakah file ada di R2.
     */
    public function exists(string $path): bool
    {
        if (! $path) {
            return false;
        }
        return Storage::disk($this->disk)->exists($path);
    }

    /**
     * Get signed URL untuk download (expire dalam $minutes menit).
     * Cocok untuk file sensitif yang tidak boleh public.
     */
    public function signedUrl(string $path, int $minutes = 60): string
    {
        return Storage::disk($this->disk)->temporaryUrl($path, now()->addMinutes($minutes));
    }

    /**
     * Get public URL (jika bucket public). Tanpa signature.
     * URL format: https://pub.r2.dev/{bucket}/{path}
     */
    public function publicUrl(string $path): string
    {
        $baseUrl = env('CLOUDFLARE_R2_URL', 'https://pub.r2.dev');
        $bucket = env('CLOUDFLARE_R2_BUCKET', '');
        return rtrim($baseUrl, '/') . '/' . ltrim($bucket . '/' . $path, '/');
    }

    /**
     * Stream file ke HTTP response (untuk download via controller).
     */
    public function response(string $path, ?string $downloadName = null, bool $inline = false)
    {
        $disk = Storage::disk($this->disk);

        if (! $disk->exists($path)) {
            abort(404, 'File tidak ditemukan.');
        }

        $name = $downloadName ?? pathinfo($path, PATHINFO_BASENAME);
        $mime = $disk->mimeType($path) ?? 'application/octet-stream';

        $disposition = $inline ? 'inline' : 'attachment';

        return response($disk->get($path), 200, [
            'Content-Type' => $mime,
            'Content-Disposition' => $disposition . '; filename="' . $name . '"',
            'Content-Length' => $disk->size($path),
        ]);
    }

    /**
     * Build storage path: {module}/{yyyy}/{mm}/{uuid}_{filename}
     */
    private function buildPath(string $module, string $filename): string
    {
        $now = now();
        $safeName = $this->sanitizeFilename($filename);
        $uuid = Str::random(8);

        return sprintf(
            '%s/%d/%02d/%s_%s',
            $module,
            $now->year,
            $now->month,
            $uuid,
            $safeName
        );
    }

    /**
     * Remove dangerous characters from filename.
     */
    private function sanitizeFilename(string $filename): string
    {
        // Keep only safe characters, limit length
        $name = preg_replace('/[^a-zA-Z0-9._-]/', '_', $filename);
        if (strlen($name) > 100) {
            $ext = pathinfo($name, PATHINFO_EXTENSION);
            $name = substr(pathinfo($name, PATHINFO_FILENAME), 0, 94) . '.' . $ext;
        }
        return $name;
    }
}
