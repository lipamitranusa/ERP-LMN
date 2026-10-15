<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Surat Tugas {{ $surat['nomor_surat'] }}</title>
<style>
    body { font-family: 'Times New Roman', serif; font-size: 12pt; margin: 2cm; color: #000; }
    .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 20px; }
    .header h2 { margin: 0; font-size: 16pt; }
    .header p { margin: 2px 0; font-size: 11pt; }
    .title { text-align: center; font-size: 14pt; font-weight: bold; text-decoration: underline; margin: 20px 0; }
    .field { margin: 10px 0; }
    .field .label { font-weight: bold; display: inline-block; min-width: 180px; }
    .field .value { display: inline; }
    .content { margin: 30px 0; line-height: 1.8; text-align: justify; }
    .signature { margin-top: 50px; text-align: right; }
    .signature p { margin: 3px 0; }
    .bold { font-weight: bold; }
</style>
</head>
<body>
    <div class="header">
        <h2>{{ $surat['nama_lembaga'] }}</h2>
        <p>Jl. Sudirman No. 123, Jakarta Selatan</p>
        <p>Telp: (021) 1234567 | Email: info@lipamitra.co.id</p>
    </div>

    <p class="bold" style="text-align:center; font-size:13pt;">SURAT TUGAS</p>
    <p style="text-align:center; margin-bottom: 30px;">Nomor: {{ $surat['nomor_surat'] }}</p>

    <div class="content">
        <p>Yang bertanda tangan di bawah ini, <strong>{{ $surat['nama_lembaga'] }}</strong>, dengan ini menugaskan kepada:</p>

        <div class="field">
            <span class="label">Nama</span>
            <span class="value">: {{ $surat['nama_surveior'] }}</span>
        </div>
        <div class="field">
            <span class="label">Nomor Induk Surveior</span>
            <span class="value">: {{ $surat['nomor_induk_surveior'] }}</span>
        </div>
        <div class="field">
            <span class="label">Unit/Bagian</span>
            <span class="value">: Divisi Survei Akreditasi</span>
        </div>

        <p style="margin-top: 20px;">Untuk melaksanakan <strong>survei akreditasi</strong> pada:</p>

        <div class="field">
            <span class="label">Nama Fasilitas Kesehatan</span>
            <span class="value">: {{ $surat['nama_faskes'] }}</span>
        </div>
        <div class="field">
            <span class="label">Tipe</span>
            <span class="value">: {{ $surat['tipe_faskes'] }}</span>
        </div>
        <div class="field">
            <span class="label">Alamat</span>
            <span class="value">: {{ $surat['alamat_faskes'] }}</span>
        </div>

        <p style="margin-top: 20px;">
            Survei ini dilaksanakan sesuai dengan standar dan instrumen akreditasi yang berlaku.
            Hasil survei wajib dilaporkan ke Sekretariat {{ $surat['nama_lembaga'] }}
            paling lambat 14 (empat belas) hari kerja setelah survei selesai dilakukan.
        </p>

        <p>Surat Tugas ini dibuat untuk dapat digunakan sebagaimana mestinya.</p>
    </div>

    <div class="signature">
        <p>Jakarta, {{ $surat['tanggal_terbit'] }}</p>
        <p><strong>Plt. Direktur Eksekutif</strong></p>
        <br><br><br>
        <p><strong>( Ir. H. Budi Santoso, M.Kes )</strong></p>
        <p>NIP. 196501011990031001</p>
    </div>
</body>
</html>
