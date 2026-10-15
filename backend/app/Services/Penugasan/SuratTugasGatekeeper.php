<?php

namespace App\Services\Penugasan;

use App\Models\SiklusAkreditasi;

/**
 * Gatekeeper for issuing Surat Tugas.
 *
 * FR-2.4 v2.2: Surat Tugas boleh terbit begitu:
 *  1. Dokumen Faskes tervalidasi lengkap
 *  2. PKS disetujui
 *  — TANPA menunggu Invoice Paid.
 *
 * Kalau salah satu syarat tidak terpenuhi, return array of errors (kosong = OK).
 */
class SuratTugasGatekeeper
{
    public function canIssue(SiklusAkreditasi $siklus): array
    {
        $errors = [];

        if ($siklus->status_kelengkapan !== 'lengkap') {
            $errors[] = 'Dokumen Faskes belum tervalidasi lengkap (FR-1.3).';
        }

        $pks = $siklus->pks;
        if (! $pks) {
            $errors[] = 'PKS belum dibuat untuk siklus ini (FR-2.1).';
        } elseif ($pks->status !== 'disetujui') {
            $errors[] = "PKS belum disetujui Faskes (status: {$pks->status}).";
        }

        // FR-2.4 v2.2: TIDAK cek invoice.status / total_pembayaran.
        // Status pembayaran dipantau terpisah oleh Keuangan via dasbor piutang.

        return $errors;
    }

    public function canIssueOrFail(SiklusAkreditasi $siklus): void
    {
        $errors = $this->canIssue($siklus);
        if (! empty($errors)) {
            throw new \DomainException(
                'Surat Tugas belum dapat diterbitkan: ' . implode(' ', $errors)
            );
        }
    }
}
