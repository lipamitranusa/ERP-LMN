<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $templates = DB::table('pks_templates')->get();

        foreach ($templates as $t) {
            $raw = $t->konten;
            if (!$raw) continue;

            // Decode the current content (stored as JSON string, Eloquent decodes it)
            $decoded = json_decode($raw, true);
            if (is_string($decoded)) {
                $decoded = json_decode($decoded, true); // double-encode fallback
            }
            if (!is_array($decoded)) continue;

            // Convert structured {header, footer, pasalnya[]} to marker text string
            $markerText = $this->toMarkerText($decoded);
            DB::table('pks_templates')->where('id', $t->id)->update([
                'konten' => $markerText,
            ]);
        }
    }

    private function toMarkerText(array $konten): string
    {
        $text = '';

        $header = trim($konten['header'] ?? '');
        if ($header !== '') {
            $text .= "[HEADER]\n{$header}\n[/HEADER]\n\n";
        }

        foreach ($konten['pasalnya'] ?? [] as $pasal) {
            $nomor = trim($pasal['nomor'] ?? '');
            $judul = trim($pasal['judul'] ?? '');
            $isi = trim($pasal['isi'] ?? '');
            if ($isi === '') continue;
            $text .= "[PASAL:{$nomor}|{$judul}]\n{$isi}\n[/PASAL]\n\n";
        }

        $footer = trim($konten['footer'] ?? '');
        if ($footer !== '') {
            $text .= "[FOOTER]\n{$footer}\n[/FOOTER]";
        }

        return $text;
    }

    public function down(): void
    {
        // No rollback needed — data is transformed, not lost
    }
};
