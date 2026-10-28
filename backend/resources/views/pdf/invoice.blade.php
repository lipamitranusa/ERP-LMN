@php
    $faskes = $tagihan['faskes'];
    $items = $tagihan['items'];
    $isLunas = $tagihan['status'] === 'lunas';
    $warna = $tagihan['status_color'];
    $fmt = fn ($n) => 'Rp '.number_format((float) $n, 0, ',', '.');
@endphp
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Invoice {{ $tagihan['nomor_invoice'] }}</title>
<style>
    @page { margin: 30px 28px 40px 28px; }
    * { box-sizing: border-box; }
    body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 10px; color: #1E293B; margin: 0; }

    table { border-collapse: collapse; }
    .kop td { vertical-align: top; }
    .kop-logo { width: 70px; }
    .kop-logo img { width: 56px; height: 56px; object-fit: contain; }
    .kop-inisial {
        width: 56px; height: 56px; background: #2563EB; color: #fff;
        text-align: center; vertical-align: middle; font-size: 20px; font-weight: bold;
    }
    .kop-nama { font-size: 13px; font-weight: bold; }
    .kop-sub { font-size: 9px; color: #64748B; line-height: 1.4; }
    .kop-judul { text-align: right; vertical-align: middle; }
    .kop-judul .judul { font-size: 20px; font-weight: bold; letter-spacing: 2px; color: #1E293B; }
    .kop-judul .nomor {
        display: inline-block; margin-top: 5px; padding: 3px 10px; background: #2563EB;
        color: #fff; font-size: 10px; font-weight: bold;
    }
    .garis { border-bottom: 2px solid #1E293B; }

    .meta { margin-top: 16px; width: 100%; }
    .meta td { width: 50%; vertical-align: top; }
    .meta-box { border: 1px solid #E2E8F0; padding: 10px 12px; }
    .meta-box h3 {
        font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748B;
        margin: 0 0 6px 0; padding-bottom: 4px; border-bottom: 1px solid #E2E8F0;
    }
    .meta-box table td { padding: 2px 0; font-size: 10px; }
    .meta-box table td:first-child { width: 110px; color: #64748B; }

    .total { margin-top: 14px; width: 100%; border: 2px solid {{ $warna }}; background: #F8FAFC; }
    .total td { padding: 12px 14px; }
    .total .label { font-size: 9px; color: {{ $warna }}; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
    .total .status { margin-top: 4px; display: inline-block; padding: 3px 10px; border: 1px solid {{ $warna }}; color: {{ $warna }}; font-weight: bold; font-size: 10px; }
    .total .nilai { text-align: right; font-size: 18px; font-weight: bold; color: {{ $warna }}; }

    .warn { margin-top: 10px; padding: 8px 10px; font-size: 9.5px; border: 1px solid #FECACA; background: #FEF2F2; color: #991B1B; }
    .warn-soon { margin-top: 10px; padding: 8px 10px; font-size: 9.5px; border: 1px solid #FDE68A; background: #FEF9C3; color: #92400E; }

    .items { margin-top: 14px; width: 100%; }
    .items thead th { background: #1E293B; color: #fff; padding: 7px 6px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.3px; }
    .items tbody td { padding: 7px 6px; border-bottom: 1px solid #E2E8F0; }
    .items tbody td.kiri { text-align: left; }
    .items tbody td.tengah { text-align: center; color: #64748B; }
    .items tbody td.kanan { text-align: right; font-weight: bold; white-space: nowrap; }
    .items tfoot td { padding: 8px 6px; background: #F1F5F9; font-weight: bold; font-size: 11px; }
    .items .sub { font-size: 8.5px; color: #64748B; }

    .bayar { margin-top: 12px; border: 1px solid #BFDBFE; background: #EFF6FF; padding: 10px 12px; }
    .bayar h3 { font-size: 9px; color: #1E40AF; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 6px 0; }
    .bayar table td { padding: 2px 0; font-size: 10px; }
    .bayar table td:first-child { width: 120px; color: #64748B; }
    .bayar .va { font-family: 'Courier New', monospace; font-weight: bold; font-size: 13px; color: #1E40AF; }

    .catatan { margin-top: 14px; border: 1px solid #E2E8F0; background: #F8FAFC; padding: 10px 12px; font-size: 9px; color: #475569; line-height: 1.6; }
    .tt { margin-top: 22px; width: 100%; }
    .tt td { text-align: center; font-size: 9.5px; }
    .tt .ruang { height: 60px; }
    .tt .nama { font-weight: bold; text-decoration: underline; }
    .tt .jabatan { color: #64748B; font-size: 9px; }

    .cetak { margin-top: 16px; text-align: center; font-size: 8.5px; color: #94A3B8; }
</style>
</head>
<body>

<table class="kop">
    <tr>
        <td class="kop-logo">
            @if ($logo)
                <img src="{{ $logo }}" alt="{{ $kop['nama'] }}">
            @else
                <div class="kop-inisial">{{ $kop['nama_singkat'] ?? 'LA' }}</div>
            @endif
        </td>
        <td>
            <div class="kop-nama">{{ $kop['nama'] }}</div>
            <div class="kop-sub">
                @if ($kop['alamat'])<div>{{ $kop['alamat'] }}</div>@endif
                @if ($kop['kota'])<div>{{ $kop['kota'] }}</div>@endif
                @if ($kop['telepon'])<div>Telp: {{ $kop['telepon'] }}</div>@endif
                @if ($kop['email'])<div>Email: {{ $kop['email'] }}</div>@endif
                @if ($kop['npwp'])<div>NPWP: {{ $kop['npwp'] }}</div>@endif
            </div>
        </td>
        <td class="kop-judul">
            <div class="judul">INVOICE</div>
            <div class="nomor">{{ $tagihan['nomor_invoice'] }}</div>
        </td>
    </tr>
</table>
<table class="garis"><tr><td></td></tr></table>

<table class="meta">
    <tr>
        <td style="padding-right:8px">
            <div class="meta-box">
                <h3>Tagihan Untuk</h3>
                <table>
                    <tr><td>Institusi</td><td>: {{ $faskes['nama'] }}</td></tr>
                    <tr><td>Jenis</td><td>: {{ $faskes['jenis'] }}</td></tr>
                    <tr><td>Alamat</td><td>: {{ $faskes['alamat'] }}, {{ $faskes['kota'] }}</td></tr>
                    <tr><td>Email</td><td>: {{ $faskes['email'] }}</td></tr>
                    <tr><td>Telepon</td><td>: {{ $faskes['telepon'] }}</td></tr>
                    @if ($faskes['nama_pimpinana'])
                        <tr><td>Penanggung Jawab</td><td>: {{ $faskes['nama_pimpinana'] }}</td></tr>
                    @endif
                </table>
            </div>
        </td>
        <td style="padding-left:8px">
            <div class="meta-box">
                <h3>Detail Invoice</h3>
                <table>
                    <tr><td>No. Invoice</td><td>: {{ $tagihan['nomor_invoice'] }}</td></tr>
                    @if ($tagihan['nomor_pks'])
                        <tr><td>No. PKS</td><td>: {{ $tagihan['nomor_pks'] }}</td></tr>
                    @endif
                    <tr><td>Tanggal Terbit</td><td>: {{ $tagihan['tanggal_terbit'] }}</td></tr>
                    <tr><td>Jatuh Tempo</td><td>: {{ $tagihan['due_date'] }}</td></tr>
                    <tr><td>Status</td><td>: {{ $tagihan['status_label'] }}</td></tr>
                    <tr><td>Dicetak</td><td>: {{ $tagihan['tanggal_cetak'] }}</td></tr>
                </table>
            </div>
        </td>
    </tr>
</table>

<table class="total">
    <tr>
        <td>
            <div class="label">Total Tagihan</div>
            <div class="status">{{ $tagihan['status_label'] }}</div>
        </td>
        <td class="nilai">{{ $fmt($tagihan['total_tagihan']) }}</td>
    </tr>
</table>

@if (! $isLunas && $tagihan['hari_due'] < 0)
    <div class="warn">
        <strong>PERHATIAN:</strong> Tagihan sudah melampaui jatuh tempo sejak {{ $tagihan['due_date'] }}. Mohon segera lakukan pembayaran.
    </div>
@elseif (! $isLunas && $tagihan['hari_due'] <= 3)
    <div class="warn-soon">
        Tagihan akan jatuh tempo dalam <strong>{{ $tagihan['hari_due'] }} hari</strong> ({{ $tagihan['due_date'] }}). Mohon perhatikan.
    </div>
@endif

<table class="items">
    <thead>
        <tr>
            <th style="width:28px">No</th>
            <th>Komponen Biaya</th>
            <th style="width:80px">Tipe</th>
            <th style="width:110px;text-align:right">Jumlah</th>
        </tr>
    </thead>
    <tbody>
        @forelse ($items as $item)
            <tr>
                <td class="tengah">{{ $item['no'] }}</td>
                <td class="kiri">
                    {{ $item['nama_biaya'] }}
                    @if ($item['deskripsi'])
                        <div class="sub">{{ $item['deskripsi'] }}</div>
                    @endif
                </td>
                <td class="tengah">{{ $item['satuan'] }}</td>
                <td class="kanan">{{ $fmt($item['jumlah']) }}</td>
            </tr>
        @empty
            <tr><td colspan="4" class="tengah">Tidak ada rincian biaya.</td></tr>
        @endforelse
    </tbody>
    <tfoot>
        <tr>
            <td colspan="3" style="text-align:right">TOTAL</td>
            <td style="text-align:right">{{ $fmt($tagihan['total_items']) }}</td>
        </tr>
        @if ((float) $tagihan['total_diterima'] > 0)
            <tr>
                <td colspan="3" style="text-align:right;font-size:10px;color:#475569">Sudah Diterima</td>
                <td style="text-align:right;font-size:10px">{{ $fmt($tagihan['total_diterima']) }}</td>
            </tr>
            <tr>
                <td colspan="3" style="text-align:right;font-size:10px;color:#475569">Sisa Tagihan</td>
                <td style="text-align:right;font-size:10px">{{ $fmt($tagihan['sisa_tagihan']) }}</td>
            </tr>
        @endif
    </tfoot>
</table>

@if ($tagihan['va_number'] && ! $isLunas)
    <div class="bayar">
        <h3>Informasi Pembayaran</h3>
        <table>
            <tr><td>Metode</td><td>: {{ $tagihan['metode_pembayaran'] }}</td></tr>
            @if ($tagihan['va_bank'])
                <tr><td>Bank</td><td>: {{ $tagihan['va_bank'] }}</td></tr>
            @endif
            <tr><td>No. Rekening</td><td><span class="va">{{ $tagihan['va_number'] }}</span></td></tr>
            @if ($tagihan['va_expired'])
                <tr><td>Berlaku s/d</td><td>: {{ $tagihan['va_expired'] }}</td></tr>
            @endif
        </table>
    </div>
@endif

<div class="catatan">
    <strong>Catatan:</strong> Invoice ini diterbitkan atas proses akreditasi faskes di bawah koordinasi {{ $tagihan['siklus']['nama'] }}.<br>
    Pembayaran dapat dilakukan via Virtual Account, QRIS, atau transfer manual ke rekening yang tertera. Bukti pembayaran harap disimpan sebagai referensi.<br>
    Jika ada pertanyaan, silakan hubungi kami melalui kontak yang tertera.
</div>

<table class="tt">
    <tr>
        <td style="width:50%"></td>
        <td style="width:50%">
            <div>{{ $kop['nama'] }}</div>
            <div class="ruang"></div>
            <div class="nama">{{ $kop['pejabat']['nama'] ?? '-' }}</div>
            <div class="jabatan">{{ $kop['pejabat']['jabatan'] ?? '' }}</div>
        </td>
    </tr>
</table>

<div class="cetak">
    Dokumen ini dicetak dari sistem ERP Akreditasi Faskes — {{ $tagihan['tanggal_cetak'] }}
</div>

</body>
</html>
