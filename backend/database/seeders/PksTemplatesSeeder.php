<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PksTemplatesSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
[
            'id' => '01a157fe-ab51-7257-a7f9-66fa467e303c',
            'jenis_faskes_id' => 'jf-klinik-utama',
            'nama' => 'Template PKS — Klinik Utama',
            'blade' => 'pks-klinik',
            'konten' => '[HEADER]
[/HEADER]

[PASAL:1|Maksud dan Tujuan]
Maksud dari perjanjian ini adalah untuk melaksanakan survei akreditasi dalam rangka peningkatan mutu pelayanan dan keselamatan pasien di [JENIS_FASKES].

Tujuan perjanjian ini adalah:
1. Meningkatkan mutu pelayanan [JENIS_FASKES].
2. Meningkatkan keselamatan pasien.
3. Memenuhi standar akreditasi nasional (SNARS).
4. Menjamin keamanan dan kenyamanan pasien.
[/PASAL][PASAL:2|Ruang Lingkup]
1. Pelaksanaan survei akreditasi sesuai standar yang berlaku.
2. Pembiayaan survei akreditasi termasuk tarif survei, akomodasi, dan transportasi surveior.
3. Verifikasi hasil survei dan penerbitan rekomendasi ke Kementerian Kesehatan.
4. Penerbitan Sertifikat Akreditasi bagi [JENIS_FASKES] yang memenuhi standar.
[/PASAL][PASAL:3|Pelaksanaan Survei]
1. PIHAK KEDUA mengajukan permohonan akreditasi kepada PIHAK PERTAMA dengan memenuhi seluruh persyaratan.
2. PIHAK PERTAMA akan menugaskan surveior akreditasi yang terakreditasi setelah PIHAK KEDUA memenuhi persyaratan.
3. Surveior berpedoman pada Standar Akreditasi [JENIS_FASKES] (SNARS), Instrumen Akreditasi, Petunjuk Teknis, dan Kode Etik Surveior yang ditetapkan oleh Kementerian Kesehatan.
4. Surveior mengirimkan laporan hasil survei melalui Sistem Informasi Nasional Akreditasi Fasyankes (SINAF).
5. Survei verifikasi dapat dilaksanakan sesuai jadwal yang ditetapkan PIHAK PERTAMA.
[/PASAL][PASAL:4|Hak dan Kewajiban PIHAK PERTAMA]
Hak PIHAK PERTAMA:
1. Mendapatkan akses pemenuhan persyaratan survei akreditasi.
2. Mendapatkan akses terhadap dokumen pendukung standar akreditasi.
3. Mendapatkan tarif survei, akomodasi, dan transportasi sesuai peraturan yang berlaku.
4. Menerbitkan Sertifikat Akreditasi bagi [JENIS_FASKES] yang dinyatakan layak.

Kewajiban PIHAK PERTAMA:
1. Melaksanakan survei akreditasi secara profesional dan sesuai peraturan.
2. Menugaskan surveior yang kompeten dan tidak memiliki konflik kepentingan.
3. Menjaga kerahasiaan seluruh informasi dan dokumen yang diperoleh selama survei.
[/PASAL][PASAL:5|Hak dan Kewajiban PIHAK KEDUA]
Hak PIHAK KEDUA:
1. Mendapatkan informasi lengkap terkait pelaksanaan survei akreditasi.
2. Mengusulkan pergantian surveior jika terdapat potensi conflict of interest.
3. Mengajukan penundaan survei dengan alasan force majeure.
4. Mengajukan banding dan remedial sesuai mekanisme yang ditetapkan.
5. Mendapatkan Sertifikat Akreditasi jika dinyatakan memenuhi standar.
6. Mencantumkan status akreditasi untuk keperluan publikasi.

Kewajiban PIHAK KEDUA:
1. Membayar seluruh biaya survei sesuai invoice yang diterbitkan.
2. Menyediakan akses dan dokumen yang diperlukan untuk keperluan survei.
3. Memperbaiki temuan survei sesuai tenggat waktu yang ditetapkan.
4. Menjaga kerahasiaan dokumen akreditasi.
[/PASAL][PASAL:6|Standar dan Instrumen Akreditasi]
Survei akreditasi [JENIS_FASKES] dilaksanakan berdasarkan:
1. Standar Akreditasi [JENIS_FASKES] (SNARS).
2. Instrumen Akreditasi terbaru yang ditetapkan Kementerian Kesehatan.
3. Petunjuk Teknis Survei Akreditasi [JENIS_FASKES].
4. Kode Etik Surveior Akreditasi.
[/PASAL][PASAL:7|Pembiayaan]
Biaya akreditasi meliputi tarif survei, akomodasi, dan transportasi surveior yang akan diinformasikan melalui invoice resmi dari PIHAK PERTAMA. Pembayaran dilakukan sesuai tata cara yang ditetapkan.
[/PASAL][PASAL:8|Kerahasiaan]
Kedua belah pihak sepakat untuk menjaga kerahasiaan seluruh informasi dan dokumen yang dipertukarkan dalam рамках pelaksanaan akreditasi ini, serta tidak menyebarkannya kepada pihak ketiga manapun tanpa persetujuan tertulis dari kedua belah pihak.
[/PASAL][PASAL:9|Jangka Waktu dan Berakhirnya Perjanjian]
Perjanjian ini berlaku sejak ditandatangani oleh kedua belah pihak dan berlaku sampai diterbitkannya keputusan akreditasi oleh Kementerian Kesehatan RI.
[/PASAL][PASAL:10|Penutup]
Hal-hal yang belum atau belum cukup diatur dalam perjanjian ini akan diatur secara musyawarah dalam bentuk annexe/addendum yang merupakan bagian tidak terpisahkan dari perjanjian ini.

Demikian perjanjian ini dibuat dalam rangkap 2 (dua) bermeterai cukup dan masing-masing bermaterai cukup serta ditandatangani oleh kedua belah pihak.
[/PASAL]

[FOOTER]
[/FOOTER]',
            'is_default' => true,
            'aktif' => true,
            'dibuat_oleh' => null,
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-ab55-70ce-9505-65158c9769ac',
            'jenis_faskes_id' => 'jf-0002',
            'nama' => 'Template PKS — Klinik',
            'blade' => 'pks-klinik',
            'konten' => '[HEADER]
[/HEADER]

[PASAL:1|Maksud dan Tujuan]
Maksud dari perjanjian ini adalah untuk melaksanakan survei akreditasi dalam rangka peningkatan mutu pelayanan dan keselamatan pasien di [JENIS_FASKES].

Tujuan perjanjian ini adalah:
1. Meningkatkan mutu pelayanan [JENIS_FASKES].
2. Meningkatkan keselamatan pasien.
3. Memenuhi standar akreditasi nasional (SNARS).
4. Menjamin keamanan dan kenyamanan pasien.
[/PASAL][PASAL:2|Ruang Lingkup]
1. Pelaksanaan survei akreditasi sesuai standar yang berlaku.
2. Pembiayaan survei akreditasi termasuk tarif survei, akomodasi, dan transportasi surveior.
3. Verifikasi hasil survei dan penerbitan rekomendasi ke Kementerian Kesehatan.
4. Penerbitan Sertifikat Akreditasi bagi [JENIS_FASKES] yang memenuhi standar.
[/PASAL][PASAL:3|Pelaksanaan Survei]
1. PIHAK KEDUA mengajukan permohonan akreditasi kepada PIHAK PERTAMA dengan memenuhi seluruh persyaratan.
2. PIHAK PERTAMA akan menugaskan surveior akreditasi yang terakreditasi setelah PIHAK KEDUA memenuhi persyaratan.
3. Surveior berpedoman pada Standar Akreditasi [JENIS_FASKES] (SNARS), Instrumen Akreditasi, Petunjuk Teknis, dan Kode Etik Surveior yang ditetapkan oleh Kementerian Kesehatan.
4. Surveior mengirimkan laporan hasil survei melalui Sistem Informasi Nasional Akreditasi Fasyankes (SINAF).
5. Survei verifikasi dapat dilaksanakan sesuai jadwal yang ditetapkan PIHAK PERTAMA.
[/PASAL][PASAL:4|Hak dan Kewajiban PIHAK PERTAMA]
Hak PIHAK PERTAMA:
1. Mendapatkan akses pemenuhan persyaratan survei akreditasi.
2. Mendapatkan akses terhadap dokumen pendukung standar akreditasi.
3. Mendapatkan tarif survei, akomodasi, dan transportasi sesuai peraturan yang berlaku.
4. Menerbitkan Sertifikat Akreditasi bagi [JENIS_FASKES] yang dinyatakan layak.

Kewajiban PIHAK PERTAMA:
1. Melaksanakan survei akreditasi secara profesional dan sesuai peraturan.
2. Menugaskan surveior yang kompeten dan tidak memiliki konflik kepentingan.
3. Menjaga kerahasiaan seluruh informasi dan dokumen yang diperoleh selama survei.
[/PASAL][PASAL:5|Hak dan Kewajiban PIHAK KEDUA]
Hak PIHAK KEDUA:
1. Mendapatkan informasi lengkap terkait pelaksanaan survei akreditasi.
2. Mengusulkan pergantian surveior jika terdapat potensi conflict of interest.
3. Mengajukan penundaan survei dengan alasan force majeure.
4. Mengajukan banding dan remedial sesuai mekanisme yang ditetapkan.
5. Mendapatkan Sertifikat Akreditasi jika dinyatakan memenuhi standar.
6. Mencantumkan status akreditasi untuk keperluan publikasi.

Kewajiban PIHAK KEDUA:
1. Membayar seluruh biaya survei sesuai invoice yang diterbitkan.
2. Menyediakan akses dan dokumen yang diperlukan untuk keperluan survei.
3. Memperbaiki temuan survei sesuai tenggat waktu yang ditetapkan.
4. Menjaga kerahasiaan dokumen akreditasi.
[/PASAL][PASAL:6|Standar dan Instrumen Akreditasi]
Survei akreditasi [JENIS_FASKES] dilaksanakan berdasarkan:
1. Standar Akreditasi [JENIS_FASKES] (SNARS).
2. Instrumen Akreditasi terbaru yang ditetapkan Kementerian Kesehatan.
3. Petunjuk Teknis Survei Akreditasi [JENIS_FASKES].
4. Kode Etik Surveior Akreditasi.
[/PASAL][PASAL:7|Pembiayaan]
Biaya akreditasi meliputi tarif survei, akomodasi, dan transportasi surveior yang akan diinformasikan melalui invoice resmi dari PIHAK PERTAMA. Pembayaran dilakukan sesuai tata cara yang ditetapkan.
[/PASAL][PASAL:8|Kerahasiaan]
Kedua belah pihak sepakat untuk menjaga kerahasiaan seluruh informasi dan dokumen yang dipertukarkan dalam рамках pelaksanaan akreditasi ini, serta tidak menyebarkannya kepada pihak ketiga manapun tanpa persetujuan tertulis dari kedua belah pihak.
[/PASAL][PASAL:9|Jangka Waktu dan Berakhirnya Perjanjian]
Perjanjian ini berlaku sejak ditandatangani oleh kedua belah pihak dan berlaku sampai diterbitkannya keputusan akreditasi oleh Kementerian Kesehatan RI.
[/PASAL][PASAL:10|Penutup]
Hal-hal yang belum atau belum cukup diatur dalam perjanjian ini akan diatur secara musyawarah dalam bentuk annexe/addendum yang merupakan bagian tidak terpisahkan dari perjanjian ini.

Demikian perjanjian ini dibuat dalam rangkap 2 (dua) bermeterai cukup dan masing-masing bermaterai cukup serta ditandatangani oleh kedua belah pihak.
[/PASAL]

[FOOTER]
[/FOOTER]',
            'is_default' => true,
            'aktif' => true,
            'dibuat_oleh' => null,
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-ab57-703a-807e-5514ababba8c',
            'jenis_faskes_id' => null,
            'nama' => 'Template PKS — Laboratorium',
            'blade' => 'pks-lab',
            'konten' => '[HEADER]
[/HEADER]

[PASAL:1|Maksud dan Tujuan]
Maksud dari perjanjian ini adalah untuk melaksanakan survei akreditasi dalam рамках peningkatan mutu layanan dan validitas hasil pemeriksaan di [JENIS_FASKES].

Tujuan perjanjian ini adalah:
1. Meningkatkan mutu layanan laboratorium.
2. Menjamin validitas dan reliabilitas hasil pemeriksaan.
3. Memenuhi standar akreditasi nasional (SNARS / KARS).
4. Meningkatkan kepercayaan masyarakat terhadap hasil laboratorium.
[/PASAL][PASAL:2|Ruang Lingkup]
1. Pelaksanaan survei akreditasi laboratorium sesuai standar yang berlaku.
2. Pembinaan dan evaluasi berkelanjutan terhadap mutu layanan laboratorium.
3. Verifikasi hasil survei dan penerbitan rekomendasi ke Kementerian Kesehatan.
4. Penerbitan Sertifikat Akreditasi bagi laboratorium yang memenuhi standar.
[/PASAL][PASAL:3|Pelaksanaan Survei]
1. PIHAK KEDUA mengajukan permohonan akreditasi kepada PIHAK PERTAMA dengan memenuhi persyaratan.
2. PIHAK PERTAMA akan menugaskan surveior akreditasi yang terakreditasi setelah PIHAK KEDUA memenuhi persyaratan.
3. Surveior berpedoman pada Standar Akreditasi [JENIS_FASKES], Instrumen Akreditasi, Petunjuk Teknis Survei Akreditasi, dan Kode Etik Surveior.
4. Surveior mengirimkan laporan hasil survei melalui Sistem Informasi Nasional Akreditasi Fasyankes (SINAF).
5. PIHAK PERTAMA menyampaikan rekomendasi hasil survei ke Kementerian Kesehatan untuk penerbitan Sertifikat Akreditasi.
6. Survei verifikasi dapat dilaksanakan sesuai jadwal yang ditetapkan PIHAK PERTAMA.
[/PASAL][PASAL:4|Hak dan Kewajiban PIHAK PERTAMA]
Hak PIHAK PERTAMA:
1. Mendapatkan akses terhadap dokumen dan data laboratorium.
2. Mendapatkan tarif survei, akomodasi, dan transportasi sesuai peraturan.
3. Menerbitkan Sertifikat Akreditasi bagi laboratorium yang memenuhi standar.

Kewajiban PIHAK PERTAMA:
1. Melaksanakan survei akreditasi secara profesional dan independen.
2. Menugaskan surveior yang kompeten dan tidak memiliki konflik kepentingan.
3. Menjaga kerahasiaan seluruh informasi dan hasil pemeriksaan yang diperoleh.
[/PASAL][PASAL:5|Hak dan Kewajiban PIHAK KEDUA]
Hak PIHAK KEDUA:
1. Mendapatkan informasi terkait pelaksanaan survei akreditasi.
2. Mengusulkan perubahan surveior jika terdapat potensi conflict of interest.
3. Mengajukan penundaan survei dengan alasan force majeure.
4. Mengajukan banding dan remedial sesuai mekanisme yang berlaku.
5. Mendapatkan Sertifikat Akreditasi jika memenuhi standar.

Kewajiban PIHAK KEDUA:
1. Membayar tarif survei, akomodasi, dan transportasi surveior sesuai invoice.
2. Menyediakan akses dan data laboratorium yang diperlukan untuk survei.
3. Menjaga kerahasiaan hasil akreditasi.
[/PASAL][PASAL:6|Standar Akreditasi]
Survei akreditasi [JENIS_FASKES] dilaksanakan berdasarkan:
1. Standar Akreditasi [JENIS_FASKES] (SNARS / KARS).
2. Instrumen Akreditasi terbaru yang ditetapkan Kementerian Kesehatan.
3. Petunjuk Teknis Survei Akreditasi [JENIS_FASKES].
4. Kode Etik Surveior Akreditasi.
[/PASAL][PASAL:7|Pembiayaan]
Biaya akreditasi meliputi tarif survei, akomodasi, dan transportasi surveior yang akan diinformasikan melalui invoice resmi dari PIHAK PERTAMA. Pembayaran dilakukan sesuai tata cara yang ditetapkan.
[/PASAL][PASAL:8|Kerahasiaan]
Kedua belah pihak sepakat untuk menjaga kerahasiaan seluruh informasi dan data laboratorium yang dipertukarkan dalam рамках pelaksanaan akreditasi ini, serta tidak menyebarkannya kepada pihak ketiga tanpa persetujuan tertulis dari kedua belah pihak.
[/PASAL][PASAL:9|Jangka Waktu]
Perjanjian ini berlaku sejak ditandatangani oleh kedua belah pihak dan berlaku sampai diterbitkannya keputusan akreditasi oleh Kementerian Kesehatan RI.
[/PASAL][PASAL:10|Penutup]
Hal-hal yang belum atau belum cukup diatur dalam perjanjian ini akan diatur secara musyawarah dalam bentuk annexe/addendum yang merupakan bagian tidak terpisahkan dari perjanjian ini.

Demikian perjanjian ini dibuat dalam rangkap 2 (dua) bermeterai cukup dan masing-masing ditandatangani oleh kedua belah pihak.
[/PASAL]

[FOOTER]
[/FOOTER]',
            'is_default' => true,
            'aktif' => true,
            'dibuat_oleh' => null,
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ],

[
            'id' => '01a157fe-ab58-739e-94db-dc9fa79ca6cf',
            'jenis_faskes_id' => 'jf-0003',
            'nama' => 'Template PKS — Puskesmas',
            'blade' => 'pks-pus-kawasaki',
            'konten' => '[HEADER]
[/HEADER]

[PASAL:1|Maksud dan Tujuan]
Maksud dari perjanjian ini adalah untuk melaksanakan survei akreditasi dalam рамках peningkatan mutu pelayanan dan keselamatan pasien di [JENIS_FASKES].

Tujuan perjanjian ini adalah:
1. Meningkatkan mutu pelayanan [JENIS_FASKES].
2. Meningkatkan keselamatan pasien.
3. Memenuhi standar akreditasi nasional.
[/PASAL][PASAL:2|Ruang Lingkup]
1. Pelaksanaan survei akreditasi untuk peningkatan mutu pelayanan dan keselamatan pasien.
2. Pembiayaan survei akreditasi untuk peningkatan mutu pelayanan dan keselamatan pasien.
3. Hasil pelaksanaan survei untuk peningkatan mutu pelayanan dan keselamatan pasien.
[/PASAL][PASAL:3|Pelaksanaan Survei]
1. PIHAK KEDUA mengajukan permohonan akreditasi kepada PIHAK PERTAMA dengan memenuhi persyaratan.
2. PIHAK PERTAMA akan menugaskan surveior akreditasi setelah PIHAK KEDUA memenuhi persyaratan.
3. Surveior berpedoman pada Standar Akreditasi [JENIS_FASKES], Instrumen Akreditasi, Petunjuk Teknis Survei Akreditasi, dan Kode Etik Surveior yang ditetapkan oleh Kementerian Kesehatan.
4. Surveior mengirimkan laporan hasil survei melalui Sistem Informasi Nasional Akreditasi Fasyankes (SINAF) kepada PIHAK PERTAMA untuk verifikasi.
5. PIHAK PERTAMA mengirimkan rekomendasi ke Kementerian Kesehatan untuk penerbitan Sertifikat Akreditasi.
6. Survei verifikasi pertama dapat dilaksanakan dua tahun setelah survei awal, dan survei verifikasi kedua empat tahun setelah survei awal.
[/PASAL][PASAL:4|Hak dan Kewajiban PIHAK PERTAMA]
Hak PIHAK PERTAMA:
1. Mendapatkan akses pemenuhan persyaratan survei akreditasi.
2. Mendapatkan akses terhadap dokumen pendukung standar akreditasi.
3. Mendapatkan akses terhadap teknologi informasi sesuai kebutuhan survei.
4. Mendapatkan tarif survei, akomodasi, dan transportasi sesuai peraturan.

Kewajiban PIHAK PERTAMA:
1. Melaksanakan survei akreditasi sesuai peraturan.
2. Menugaskan surveior sesuai peraturan.
3. Menjaga kerahasiaan dokumen akreditasi dan tidak menyebarluaskan tanpa izin PIHAK KEDUA.
[/PASAL][PASAL:5|Hak dan Kewajiban PIHAK KEDUA]
Hak PIHAK KEDUA:
1. Mendapatkan informasi terkait pelaksanaan survei akreditasi.
2. Mengusulkan perubahan surveior jika ada potensi conflict of interest.
3. Mengajukan permohonan penundaan survei jika terjadi force majeure.
4. Mengajukan banding, kenaikan status, dan remedial sesuai peraturan.
5. Mendapatkan sertifikat jika lulus survei akreditasi.
6. Mencantumkan status akreditasi untuk publikasi.

Kewajiban PIHAK KEDUA:
1. Membayar tarif survei, akomodasi, dan transportasi surveior.
2. Menyediakan akses dan data yang diperlukan untuk survei.
3. Menjaga kerahasiaan dokumen akreditasi yang bersifat rahasia.
[/PASAL][PASAL:6|Pembiayaan]
Biaya akreditasi ditetapkan dalam invoice yang diterbitkan setelah PKS ini ditandatangani. Pembayaran mengikuti tata cara yang diinformasikan melalui sistem ERP akreditasi [NAMA_LEMBAGA].
[/PASAL][PASAL:7|Kerahasiaan]
Kedua belah pihak sepakat menjaga kerahasiaan seluruh informasi yang dipertukarkan dalam рамках pelaksanaan akreditasi ini dan tidak akan menyebarkannya kepada pihak ketiga tanpa persetujuan tertulis dari kedua belah pihak.
[/PASAL][PASAL:8|Perselisihan]
Apabila terjadi perselisihan dalam pelaksanaan perjanjian ini, kedua belah pihak sepakat untuk menyelesaikannya secara musyawarah untuk mufakat.
[/PASAL][PASAL:9|Jangka Waktu]
Perjanjian ini berlaku sejak ditandatangani oleh kedua belah pihak dan berlaku sampai dengan diterbitkannya keputusan akreditasi oleh Kementerian Kesehatan.
[/PASAL][PASAL:10|Penutup]
Hal-hal yang belum diatur dalam perjanjian ini akan diatur dalam annexe/addendum yang merupakan bagian tidak terpisahkan dari perjanjian ini.

Demikian perjanjian ini dibuat dalam rangkap 2 (dua) asli yang sama buninya dan masing-masing ditandatangani oleh kedua belah pihak.
[/PASAL]

[FOOTER]
[/FOOTER]',
            'is_default' => true,
            'aktif' => true,
            'dibuat_oleh' => null,
            'created_at' => '2026-10-20 13:27:50',
            'updated_at' => '2026-10-20 13:27:50',
        ]
        ];

        foreach ($data as $item) {
            DB::table('pks_templates')->updateOrInsert(
                ['id' => $item['id']],
                $item
            );
        }
    }
}