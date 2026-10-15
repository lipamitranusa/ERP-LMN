<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Tarif Dasar Akreditasi
    |--------------------------------------------------------------------------
    |
    | Tarif standar yang digunakan saat penerbitan Invoice otomatis setelah
    | PKS disetujui (FR-2.2). Nilai ini bisa diubah via Modul Konfigurasi
    | di masa depan tanpa deploy.
    |
    */
    'tarif_dasar' => env('AKREDITASI_TARIF_DASAR', 5_000_000),

    /*
    |--------------------------------------------------------------------------
    | Due Date Invoice (hari)
    |--------------------------------------------------------------------------
    |
    | Jumlah hari dari tanggal Invoice diterbitkan sampai jatuh tempo.
    | FR-2.2: due_date dihitung otomatis setelah PKS disetujui.
    |
    */
    'invoice_due_days' => env('AKREDITASI_INVOICE_DUE_DAYS', 30),

    /*
    |--------------------------------------------------------------------------
    | Bukti Transfer Manual — SLA Verifikasi
    |--------------------------------------------------------------------------
    | FR-2.6: bukti transfer manual divalidasi dalam 1x24 jam kerja.
    | UI menampilkan "Overdue" jika waktu verifikasi melebihi nilai ini.
    */
    'bukti_sla_hours' => 24,
];
