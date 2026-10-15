<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>PKS — {{ $pks->nomor_pks ?? 'DRAFT' }}</title>
    <style>
        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 11pt;
            color: #1E293B;
            line-height: 1.6;
            margin: 40px 60px;
        }
        .doc-header { text-align: center; margin-bottom: 6px; }
        .doc-header h1 { font-size: 14pt; font-weight: bold; text-transform: uppercase; margin: 0; letter-spacing: 1px; }
        .doc-header .nomor-line { font-size: 11pt; margin: 4px 0 2px; }
        .doc-header .tentang-line { font-size: 11pt; margin: 0; }
        .header-rule { border-top: 2px solid #1E293B; margin: 8px 0 20px; }
        .opening { margin-bottom: 16px; text-align: justify; }
        .parties { margin-bottom: 20px; }
        .party-block { margin-bottom: 14px; text-align: justify; }
        .party-block p { margin: 2px 0; }
        .party-block strong { font-weight: bold; }
        .tentang-clause { margin-bottom: 20px; text-align: justify; }
        .pasal-block { margin-bottom: 14px; text-align: justify; }
        .pasal-title { font-weight: bold; margin-bottom: 4px; }
        .pasal-content ol { padding-left: 20px; margin: 4px 0; }
        .pasal-content ol li { margin-bottom: 5px; }
        .pasal-header, .pasal-footer { font-size: 10pt; color: #475569; margin-bottom: 4px; text-align: justify; }
        .signatures { margin-top: 36px; page-break-inside: avoid; }
        .signatures table { width: 100%; border-collapse: collapse; }
        .signatures td { width: 50%; vertical-align: top; padding: 0 20px; }
        .signatures td:first-child { padding-left: 0; }
        .signatures td:last-child { padding-right: 0; }
        .signatures .party-label { font-weight: bold; text-align: center; margin-bottom: 4px; }
        .signatures .party-detail { font-size: 10pt; text-align: center; margin-bottom: 2px; }
        .signatures .ttd-box { border: 1px dashed #94A3B8; height: 80px; text-align: center; vertical-align: middle; margin: 6px 0; }
        .signatures .ttd-box img { max-height: 70px; max-width: 200px; }
        .signatures .ttd-name { text-align: center; border-top: 1px solid #1E293B; padding-top: 4px; font-size: 10pt; }
        .signatures .ttd-jabatan { text-align: center; font-size: 9pt; color: #475569; }
        .doc-footer { margin-top: 28px; font-size: 8pt; color: #94A3B8; text-align: center; border-top: 1px solid #E2E8F0; padding-top: 8px; }
    </style>
</head>
<body>

    <!-- Header -->
    <div class="doc-header">
        <h1>PERJANJIAN KERJA SAMA</h1>
        <div class="nomor-line">NOMOR : {{ $pks->nomor_pks ?? '[belum diterbitkan]' }}</div>
        <div class="tentang-line">TENTANG</div>
    </div>
    <div class="header-rule"></div>

    <!-- Opening -->
    <p class="opening">
        Pada hari ini, {{ $pks->tanda_tangan_pada ? $pks->tanda_tangan_pada->translatedFormat('d F Y') : now()->translatedFormat('d F Y') }},
        yang bertanda tangan di bawah ini:
    </p>

    <!-- PIHAK PERTAMA -->
    <div class="parties">
        <div class="party-block">
            <p><strong>PIHAK PERTAMA:</strong></p>
            <p>
                <strong>Nama &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</strong> {{ $ppt_nama_pejabat ?? 'dr. Sophiati Sutjahjani, M.Kes' }}<br>
                <strong>Jabatan &nbsp;:</strong> {{ $ppt_jabatan_pejabat ?? 'Directeur' }}<br>
                <strong>Bertindak atas nama:</strong> PT. {{ $lembaga->nama ?? 'Lembaga Penyelenggara Akreditasi' }}<br>
                <strong>Alamat &nbsp;&nbsp;:</strong> {{ $lembaga->alamat ?? '-' }}{{ $lembaga->kota ? ', ' . $lembaga->kota : '' }}
            </p>
            <p>
                Selanjutnya dalam perjanjian ini disebut <strong>PIHAK PERTAMA</strong>.
            </p>
        </div>

        <!-- PIHAK KEDUA -->
        <div class="party-block">
            <p><strong>PIHAK KEDUA:</strong></p>
            <p>
                <strong>Nama &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</strong> {{ $pkh_nama_penandatangan ?? $faskes->nama ?? 'Faskes' }}<br>
                <strong>Jabatan &nbsp;:</strong> {{ $pkh_jabatan ?? 'Pimpinan' }}<br>
                <strong>Berdasarkan:</strong> {{ $faskes->nama ?? 'Faskes' }}<br>
                <strong>Alamat &nbsp;&nbsp;:</strong> {{ $faskes->alamat ?? '-' }}{{ $faskes->kota ? ', ' . $faskes->kota : '' }}
            </p>
            <p>
                Selanjutnya dalam perjanjian ini disebut <strong>PIHAK KEDUA</strong>.
            </p>
        </div>
    </div>

    <!-- Tentang -->
    <p class="tentang-clause">
        Kedua belah pihak sepakat menandatangani perjanjian kerja sama pelaksanaan
        <strong>{{ $tentang ?? 'Survei Akreditasi' }}</strong>
        dengan ketentuan sebagai berikut:
    </p>


    @if(!empty($header))
        <div style="margin-bottom: 16px; text-align: justify; font-size: 11pt;">{!! nl2br(e($header)) !!}</div>
    @endif

    <!-- Dynamic Clauses -->
    @foreach($pasal ?? [] as $p)
        @if(!empty($p['isi']))
            @if(!empty($p['header']))
                <div class="pasal-header">{!! nl2br(e($p['header'])) !!}</div>
            @endif
            <div class="pasal-block">
                @if(!empty($p['judul']))
                    <div class="pasal-title">Pasal {{ $p['nomor'] }}</div>
                    <div class="pasal-title">{{ $p['judul'] }}</div>
                @else
                    <div class="pasal-title">Pasal {{ $p['nomor'] }}</div>
                @endif
                <div class="pasal-content">{!! nl2br(e($p['isi'])) !!}</div>
            </div>
            @if(!empty($p['footer']))
                <div class="pasal-footer">{!! nl2br(e($p['footer'])) !!}</div>
            @endif
        @endif
    @endforeach


    @if(!empty($footer))
        <div style="margin-top: 16px; text-align: justify; font-size: 11pt;">{!! nl2br(e($footer)) !!}</div>
    @endif
    <!-- Signature blocks -->
    <div class="signatures">
        <table>
            <tr>
                <td>
                    <div class="party-label">PIHAK PERTAMA</div>
                    <div class="party-detail">PT. {{ $lembaga->nama ?? 'Lembaga' }}</div>
                    <div class="ttd-box">&nbsp;</div>
                    <div class="ttd-name">{{ $ppt_nama_pejabat ?? 'dr. Sophiati Sutjahjani, M.Kes' }}</div>
                    <div class="ttd-jabatan">{{ $ppt_jabatan_pejabat ?? 'Directeur' }}</div>
                </td>
                <td>
                    <div class="party-label">PIHAK KEDUA</div>
                    <div class="party-detail">{{ $faskes->nama ?? 'Faskes' }}</div>
                    <div class="ttd-box">
                        @if ($pks->path_tanda_tangan)
                            <img src="{{ storage_path('app/' . $pks->path_tanda_tangan) }}" alt="Tanda tangan">
                        @endif
                    </div>
                    <div class="ttd-name">{{ $pks->nama_penandatangan ?? $pkh_nama_penandatangan ?? '-' }}</div>
                    @if ($pks->jabatan_penandatangan || $pkh_jabatan)
                        <div class="ttd-jabatan">{{ $pks->jabatan_penandatangan ?? $pkh_jabatan }}</div>
                    @endif
                </td>
            </tr>
        </table>
    </div>

    <!-- Footer -->
    <div class="doc-footer">
        Dokumen ini diterbitkan oleh Sistem ERP Akreditasi — {{ $lembaga->nama ?? 'LIPA MITRA NUSA' }}.
        @if ($pks->tanda_tangan_pada)
            Disetujui secara elektronik pada {{ $pks->tanda_tangan_pada->translatedFormat('d F Y, H:i') }} WIB.
        @endif
    </div>

</body>
</html>
