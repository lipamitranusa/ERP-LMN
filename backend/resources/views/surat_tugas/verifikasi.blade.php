<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Surat Tugas Verifikasi {{ $nomorSurat }}</title>
<style>
    body { font-family: 'Times New Roman', serif; font-size: 12pt; margin: 2cm; color: #000; }
    .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 20px; }
    .header h2 { margin: 0; font-size: 16pt; }
    .header p { margin: 2px 0; font-size: 11pt; }
    .title { text-align: center; font-size: 14pt; font-weight: bold; text-decoration: underline; margin: 20px 0; }
    .field { margin: 10px 0; }
    .field .label { font-weight: bold; display: inline-block; min-width: 200px; }
    .field .value { display: inline; }
    .content { margin: 30px 0; line-height: 1.8; text-align: justify; }
    .signature { margin-top: 50px; text-align: right; }
    .signature p { margin: 3px 0; }
    .bold { font-weight: bold; }
</style>
</head>
<body>
    <div class="header">
        <h2>LIPA MITRA NUSA</h2>
        <p>Jl. Sudirman No. 123, Jakarta Selatan</p>
        <p>Telp: (021) 1234567 | Email: info@lipamitra.co.id</p>
    </div>

    <p class="bold" style="text-align:center; font-size:13pt;">SURAT TUGAS VERIFIKASI</p>
    <p style="text-align:center; margin-bottom: 30px;">Nomor: {{ $nomorSurat }}</p>

    <div class="content">
        <p>Yang bertanda tangan di bawah ini, <strong>LIPA MITRA NUSA</strong>, dengan ini menugaskan kepada:</p>

        <div class="field">
            <span class="label">Nama</span>
            <span class="value">: {{ $penugasan->tenagaAhli->nama }}</span>
        </div>
        <div class="field">
            <span class="label">Nomor Induk</span>
            <span class="value">: {{ $penugasan->tenagaAhli->nomor_induk_surveior }}</span>
        </div>
        <div class="field">
            <span class="label">Unit/Bagian</span>
            <span class="value">: Divisi Verifikasi Akreditasi</span>
        </div>

        <p style="margin-top: 20px;">Untuk melaksanakan <strong>verifikasi akreditasi</strong> pada:</p>

        <div class="field">
            <span class="label">Nama Fasilitas Kesehatan</span>
            <span class="value">: {{ $penugasan->siklus->faskes->nama }}</span>
        </div>
        <div class="field">
            <span class="label">Tipe</span>
            <span class="value">: {{ $penugasan->siklus->faskes->tipe_faskes }}</span>
        </div>
        <div class="field">
            <span class="label">Alamat</span>
            <span class="value">: {{ $penugasan->siklus->faskes->alamat }}</span>
        </div>

        <p style="margin-top: 20px;">
            Tugas verifikasi ini dilaksanakan setelah laporan survei (Fakta &amp; Analisis) diterima.
            Verifikator wajib meneliti kesesuaian setiap Elemen Penilaian (EP) terhadap
            Fakta dan Analisis (FA) yang telah disusun oleh Surveior, dan memberikan penilaian akhir
            sesuai standar akreditasi yang berlaku.
        </p>

        <p>
            Hasil verifikasi wajib dilaporkan ke Sekretariat <strong>LIPA MITRA NUSA</strong>
            paling lambat 7 (tujuh) hari kerja setelah verifikasi selesai dilakukan.
            Tombol "Final" pada sistem tidak dapat diklik sebelum seluruh item verifikasi terisi
            dan diverifikasi oleh Verifikator.
        </p>

        <p>Surat Tugas ini dibuat untuk dapat digunakan sebagaimana mestinya.</p>
    </div>

    <div class="signature">
        <p>Jakarta, {{ \Carbon\Carbon::now()->locale('id')->format('d F Y') }}</p>
        <p><strong>Plt. Direktur Eksekutif</strong></p>
        <br><br><br>
        <p><strong>( Ir. H. Budi Santoso, M.Kes )</strong></p>
        <p>NIP. 196501011990031001</p>
    </div>
</body>
</html>
