import React, { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useHistory } from "react-router-dom";
import InvoiceStatusCard from "@/components/InvoiceStatusCard";
import PaymentMethodSelector from "@/components/PaymentMethodSelector";
import { formatDate, formatDateTime } from "@/utils/dateFormat";
import { useApi, useMutateKeys } from "@/hooks/useApi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, Clock, AlertTriangle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

function formatRp(n) {
  return `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
}

const BUKTI_STATUS = {
  menunggu: { label: "Menunggu verifikasi", bg: "#FEF9C3", fg: "#854D0E" },
  diterima: { label: "Diterima", bg: "#DCFCE7", fg: "#166534" },
  ditolak: { label: "Ditolak", bg: "#FEE2E2", fg: "#991B1B" },
};

const transferSchema = z.object({
  nominal: z.string().min(1, "Nominal wajib diisi"),
  nomor_referensi: z.string().min(1, "No. Referensi wajib diisi"),
  dari_rekening: z.string().min(1, "Dari rekening wajib diisi"),
});

function CopyButton({ text, label = "Salin" }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="outline" size="sm" onClick={handleCopy}
      className="h-7 px-3 text-xs gap-1.5"
      style={{ borderColor: "#4CAF50", color: copied ? "#166534" : "#4CAF50", background: copied ? "#DCFCE7" : "#fff" }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Tersalin!" : label}
    </Button>
  );
}

function CountdownTimer({ expiredAt }) {
  const [timeLeft, setTimeLeft] = useState(null);
  const intervalRef = useRef(null);

  const calc = useCallback(() => {
    if (!expiredAt) return null;
    const diff = new Date(expiredAt) - new Date();
    if (diff <= 0) return { h: 0, m: 0, s: 0, expired: true };
    return { h: Math.floor(diff / 3600000), m: Math.floor((diff % 3600000) / 60000), s: Math.floor((diff % 60000) / 1000), expired: false };
  }, [expiredAt]);

  useEffect(() => {
    setTimeLeft(calc());
    intervalRef.current = setInterval(() => {
      const t = calc();
      setTimeLeft(t);
      if (t?.expired) clearInterval(intervalRef.current);
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [calc]);

  if (!expiredAt || !timeLeft) return null;

  if (timeLeft.expired) {
    return (
      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
        <AlertTriangle size={16} className="shrink-0" />
        VA/QRIS telah expired — klik "Dapatkan Nomor VA Baru" untuk membuat ulang.
      </div>
    );
  }

  const { h, m, s } = timeLeft;
  const isUrgent = h < 1;
  return (
    <div className="flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold"
      style={{ background: isUrgent ? "#FEF9C3" : "#EFF6FF", border: `1px solid ${isUrgent ? "#FDE68A" : "#BFDBFE"}`, color: isUrgent ? "#92400E" : "#1E40AF" }}
    >
      <span className="flex items-center gap-1.5"><Clock size={15} />Berakhir dalam:</span>
      <span className="font-mono text-sm font-bold" style={{ color: isUrgent ? "#DC2626" : "#1E40AF" }}>
        {String(h).padStart(2,"0")}:{String(m).padStart(2,"0")}:{String(s).padStart(2,"0")}
      </span>
    </div>
  );
}

function getBankInstructions(vaNumber, gateway) {
  const total = gateway?.total ? formatRp(gateway.total) : "nominal tagihan";
  return [
    { key: "bca",     name: "BCA",     icon: "🏦", steps: [<span key="b">Pilih <strong>menu Multi Payment</strong> → <strong>BCA</strong>.</span>, <span key="b">Masukkan kode perusahaan / <strong>VA: {vaNumber}</strong>.</span>, <span key="b">Masukkan <strong>{total}</strong> sebagai jumlah.</span>, <span key="b">Ikuti instruksi sampai <strong>konfirmasi</strong>. Simpan bukti.</span>] },
    { key: "bni",     name: "BNI",     icon: "🏛️", steps: [<span key="b">Pilih <strong>Menu Lain → Transfer → Virtual Account Billing</strong>.</span>, <span key="b">Pilih rekening debet dan masukkan <strong>{vaNumber}</strong>.</span>, <span key="b">Pilih <strong>{total}</strong>. Lanjutkan dan <strong>konfirmasi</strong>.</span>] },
    { key: "mandiri", name: "Mandiri", icon: "🏪", steps: [<span key="b">Pilih <strong>Bayar → Multi Payment</strong>.</span>, <span key="b">Pilih <strong>Lembaga → VA</strong>, masukkan <strong>{vaNumber}</strong>.</span>, <span key="b">Masukkan <strong>{total}</strong>. <strong>Konfirmasi</strong> dan simpan bukti.</span>] },
    { key: "bri",     name: "BRI",     icon: "🏢", steps: [<span key="b">Pilih <strong>Menu Bayar → Multi Payment</strong>.</span>, <span key="b">Pilih layanan <strong>BRIVA</strong>.</span>, <span key="b">Masukkan <strong>{vaNumber}</strong>, nominal <strong>{total}</strong>.</span>, <span key="b"><strong>Konfirmasi</strong>, masukkan PIN, selesai.</span>] },
    { key: "permata", name: "Permata", icon: "💎", steps: [<span key="b">Pilih <strong>Bayar → Virtual Account Permata</strong>.</span>, <span key="b">Masukkan <strong>{vaNumber}</strong>.</span>, <span key="b">Nominal <strong>{total}</strong>. <strong>Konfirmasi</strong>.</span>] },
  ];
}

function VaInstructions({ method, vaNumber, gateway }) {
  const banks = method === "qris" ? null : getBankInstructions(vaNumber, gateway);
  return (
    <div className="mt-4">
      <h3 className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-500 mb-2.5">
        {method === "qris" ? "Petunjuk Pembayaran QRIS" : "Petunjuk Pembayaran Virtual Account"}
      </h3>
      {method === "qris" ? (
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3.5 text-[12px] text-slate-600 dark:text-slate-300 dark:text-slate-500 leading-relaxed">
          <ol className="list-decimal list-inside space-y-1">
            <li>Buka aplikasi <strong>m-BCA / BCA Mobile</strong>, atau aplikasi bank lainnya yang mendukung QRIS.</li>
            <li>Pilih menu <strong>Scan QR</strong>.</li>
            <li>Scan kode QR yang tersedia di halaman ini.</li>
            <li>Pastikan nominal yang tertera adalah <strong>{formatRp(gateway?.total)}</strong>.</li>
            <li>Masukkan PIN / konfirmasi pembayaran.</li>
            <li>Simpan bukti pembayaran (screenshot).</li>
          </ol>
          <div className="mt-2.5 p-2 rounded bg-green-100 text-green-800 text-[11px]">Pembayaran akan diverifikasi otomatis dalam 1-5 menit.</div>
        </div>
      ) : banks ? (
        <div className="flex flex-col gap-2.5">
          {banks.map(bank => (
            <div key={bank.name} className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 border border-slate-200 dark:border-slate-700">
              <div className="text-[12px] font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
                <span className="text-lg">{bank.icon}</span>{bank.name}
              </div>
              <ol className="list-decimal list-inside text-[12px] text-slate-600 dark:text-slate-300 dark:text-slate-500 space-y-0.5">{bank.steps}</ol>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3.5 text-[12px] text-slate-600 dark:text-slate-300 dark:text-slate-500 leading-relaxed">
          Lunasi ke nomor Virtual Account di atas melalui ATM, mobile banking, atau internet banking.
        </div>
      )}
    </div>
  );
}

export default function TagihanDetail() {
  const { id } = useParams();
  const history = useHistory();
  const [method, setMethod] = useState("virtual_account");
  const [nominal, setNominal] = useState("");
  const [noRef, setNoRef] = useState("");
  const [dariRek, setDariRek] = useState("");
  const [fileBukti, setFileBukti] = useState(null);
  const [fileError, setFileError] = useState("");
  const [vaData, setVaData] = useState(null);
  const [showMethodPicker, setShowMethodPicker] = useState(false);
  const [pendingMethod, setPendingMethod] = useState(null);

  const { data: invoiceData, isLoading: loading, refetch: refetchInvoice, isFetching } = useApi(
    ["invoice", id], `/invoice/${id}`, { enabled: !!id,
      refetchInterval: (data) => data?.status === "lunas" ? false : 10000,
    }
  );

  const invoice = invoiceData?.data || null;

  React.useEffect(() => {
    if (invoice?.payment_reference) {
      setVaData({
        reference: invoice.payment_reference,
        expiredAt: invoice.payment_expired_at,
        metode: invoice.metode_pembayaran,
        bank: invoice.va_bank,
      });
    }
  }, [invoice]);

  const { data: buktiData } = useApi(["invoice-bukti", id], `/invoice/${id}/bukti`, { enabled: !!id });
  const bukti = buktiData?.data || [];

  const gatewayMutation = useMutateKeys(["invoice", id, "invoices"], {
    onSuccess: (data) => {
      setVaData({
        reference: method === "qris" ? data.data.reference : data.data.nomor_va,
        expiredAt: data.data.expired_at,
        metode: method === "qris" ? "qris" : "va",
        bank: data.data.bank,
      });
      setTimeout(() => refetchInvoice(), 500);
    },
    onError: (err) => { setFileError(err.message); },
  });

  const buktiMutation = useMutateKeys(["invoice", id, "invoices", "invoice-bukti", id], {
    onSuccess: () => {
      setShowMethodPicker(false);
      setMethod("transfer_manual");
      setVaData(null);
      setNominal(""); setNoRef(""); setDariRek(""); setFileBukti(null);
      refetchInvoice();
      alert("Bukti transfer berhasil diunggah. Admin akan memverifikasi dalam 1x24 jam kerja.");
    },
    onError: (err) => { setFileError(err.message); },
  });

  const submitting = gatewayMutation.isPending || buktiMutation.isPending;

  function handleGatewayPayment(forceNew = false) {
    setFileError("");
    const endpoint = method === "qris" ? "bayar-qris" : "bayar-va";
    const path = forceNew ? `/invoice/${id}/${endpoint}?force=true` : `/invoice/${id}/${endpoint}`;
    gatewayMutation.mutate({ path, method: "POST", body: {} });
  }

  function handleGantiMetode() {
    if (!pendingMethod) return;
    setFileError("");
    setShowMethodPicker(false);
    const endpoint = pendingMethod === "qris" ? "bayar-qris" : "bayar-va";
    gatewayMutation.mutate({ path: `/invoice/${id}/${endpoint}?force=true`, method: "POST", body: {} });
  }

  function handleFileChange(file) {
    if (!file) { setFileBukti(null); setFileError(""); return; }
    if (file.size > 10 * 1024 * 1024) { setFileError("Ukuran file maksimal 10 MB."); setFileBukti(null); return; }
    setFileError("");
    setFileBukti(file);
  }

  function handleManualSubmit() {
    if (!fileBukti) { setFileError("Pilih file bukti transfer."); return; }
    const fd = new FormData();
    fd.append("nominal", nominal);
    fd.append("nomor_referensi", noRef);
    fd.append("dari_rekening", dariRek);
    fd.append("bukti", fileBukti);
    buktiMutation.mutate({ path: `/invoice/${id}/bukti-manual`, method: "POST", body: fd });
  }

  if (loading || !invoice) {
    return <div className="p-10 text-center text-slate-400 dark:text-slate-500 text-sm">Memuat...</div>;
  }

  const items = invoice.items || [];
  const isLunas = invoice.status === "lunas";
  const isRefunded = invoice.status === "refunded";
  const metode = vaData?.metode || invoice.metode_pembayaran;
  const isQris = metode === "qris" || method === "qris";
  const SATUAN_LABEL = { tetap: "Tetap", per_siklus: "Per Siklus", per_sertifikat: "Per Sertifikat", per_tahun: "Per Tahun", periksa: "Per Periksa", sekali: "Sekali Bayar" };
  const activeBukti = bukti.find(b => b.status_verifikasi === "menunggu" || b.status_verifikasi === "diterima");

  return (
    <div className="max-w-[720px] mx-auto">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => history.push("/faskes/tagihan")}
        className="mb-4 pl-0 text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:text-slate-500"
      >
        ← Kembali ke Daftar Tagihan
      </Button>

      <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-1">Detail Tagihan</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-5">
        Jatuh tempo: <strong className="text-slate-700 dark:text-slate-300 dark:text-slate-500">{formatDate(invoice.due_date)}</strong>
      </p>

      <InvoiceStatusCard invoice={invoice} />

      {activeBukti && !isLunas && (
        <Card className="p-4 mt-5 flex items-center gap-2.5"
          style={{ background: activeBukti.status_verifikasi === "diterima" ? "#DCFCE7" : "#FEF9C3", border: `1px solid ${activeBukti.status_verifikasi === "diterima" ? "#BBF7D0" : "#FDE68A"}` }}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: activeBukti.status_verifikasi === "diterima" ? "#4CAF50" : "#F59E0B" }}>
            {activeBukti.status_verifikasi === "diterima" ? (
              <Check size={16} className="text-white" />
            ) : (
              <Clock size={16} className="text-white" />
            )}
          </div>
          <div>
            <div className="text-[13px] font-semibold" style={{ color: activeBukti.status_verifikasi === "diterima" ? "#166534" : "#92400E" }}>
              {activeBukti.status_verifikasi === "diterima" ? "Bukti Diterima" : "Bukti Menunggu Verifikasi"}
            </div>
            <div className="text-[12px]" style={{ color: activeBukti.status_verifikasi === "diterima" ? "#15803D" : "#A16207" }}>
              {activeBukti.status_verifikasi === "diterima"
                ? "Pembayaran telah diverifikasi. Invoice akan diperbarui secara otomatis."
                : `Bukti transfer ${formatRp(activeBukti.nominal)} sedang diverifikasi admin. Mohon tunggu 1x24 jam kerja.`}
            </div>
          </div>
        </Card>
      )}

      {vaData && !isLunas && !isRefunded && !activeBukti && (
        <Card className="p-5 mt-5" style={{ border: "2px solid #4CAF50" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                {isQris ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2" width="18" height="18" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2" width="18" height="18" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                )}
              </div>
              <div>
                <div className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">{isQris ? "QRIS" : "Virtual Account"}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500">Aktif</div>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[11px] font-semibold">Otomatis</span>
          </div>

          <CountdownTimer expiredAt={vaData.expiredAt} />

          {vaData.reference && !isQris && (
            <div className="mt-3.5 p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-1">Nomor Virtual Account</div>
              <div className="flex items-center justify-between gap-2.5">
                <div className="font-mono text-lg font-bold text-slate-800 dark:text-slate-200 tracking-wide">{vaData.reference}</div>
                <CopyButton text={vaData.reference} label="Salin VA" />
              </div>
            </div>
          )}

          <div className="mt-3 p-2.5 rounded-md bg-blue-50 flex justify-between items-center">
            <span className="text-[12px] text-slate-600 dark:text-slate-300 dark:text-slate-500">Total Pembayaran</span>
            <span className="text-[15px] font-bold text-blue-700">{formatRp(invoice.total_tagihan)}</span>
          </div>

          <div className="mt-2.5 text-[11px] text-slate-400 dark:text-slate-500 text-center">
            Pembayaran akan diverifikasi otomatis 1-5 menit setelah transfer.
          </div>

          <VaInstructions method={isQris ? "qris" : "va"} vaNumber={vaData.reference} gateway={invoice} selectedBank={vaData.bank} />

          <Button variant="ghost" size="sm" onClick={refetchInvoice} disabled={isFetching} className="w-full mt-3 text-[12px] text-slate-500 dark:text-slate-400 dark:text-slate-500" >
            {isFetching ? "Memuat..." : "Cek Status Pembayaran"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleGatewayPayment(true)} className="w-full mt-2 text-[12px]">
            Dapatkan Nomor VA Baru
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setShowMethodPicker(true); setPendingMethod(method); }} className="w-full mt-1.5 text-[12px] text-slate-500 dark:text-slate-400 dark:text-slate-500">
            Ganti Metode Pembayaran
          </Button>
        </Card>
      )}

      {showMethodPicker && (
        <Card className="p-6 mt-5" style={{ border: "2px solid #4CAF50" }}>
          <h2 className="text-[15px] font-semibold text-slate-800 dark:text-slate-200 mb-1">Ganti Metode Pembayaran</h2>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-4">
            Nomor VA/QRIS sebelumnya akan <strong>dibatalkan</strong>.
          </p>
          <PaymentMethodSelector value={pendingMethod} onChange={setPendingMethod} disabled={submitting} />

          {pendingMethod === "transfer_manual" ? (
            <div className="mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ganti-nominal">Nominal *</Label>
                  <Input id="ganti-nominal" type="number" value={nominal} onChange={e => setNominal(e.target.value)} placeholder="5000000" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ganti-ref">No. Referensi Transfer *</Label>
                  <Input id="ganti-ref" value={noRef} onChange={e => setNoRef(e.target.value)} placeholder="TRX-202610-001" />
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                <Label htmlFor="ganti-rek">Dari rekening *</Label>
                <Input id="ganti-rek" value={dariRek} onChange={e => setDariRek(e.target.value)} placeholder="BCA 123-456-7890 a.n. Nama" />
              </div>
              <div className="mt-3 space-y-1.5">
                <Label htmlFor="ganti-bukti">File bukti (PDF / gambar) *</Label>
                <Input id="ganti-bukti" type="file" accept=".pdf,image/*" onChange={e => handleFileChange(e.target.files?.[0])} />
              </div>
              {fileError && <div className="mt-3 p-2.5 rounded-md bg-red-50 border border-red-200 text-red-700 text-[12px]">{fileError}</div>}
              <div className="flex gap-2.5 mt-5">
                <Button type="button" variant="outline" onClick={() => setShowMethodPicker(false)} disabled={submitting} className="flex-1">Batal</Button>
                <Button onClick={handleManualSubmit} disabled={submitting} className="flex-1">{submitting ? "Mengunggah..." : "Kirim Bukti Transfer"}</Button>
              </div>
            </div>
          ) : (
            <>
              {fileError && <div className="mt-3 p-2.5 rounded-md bg-red-50 border border-red-200 text-red-700 text-[12px]">{fileError}</div>}
              <div className="flex gap-2.5 mt-4">
                <Button variant="outline" onClick={() => setShowMethodPicker(false)} disabled={submitting} className="flex-1">Batal</Button>
                <Button onClick={handleGantiMetode} disabled={submitting || !pendingMethod} className="flex-1">
                  {submitting ? "Memproses..." : pendingMethod === "qris" ? "Generate QRIS Baru" : "Dapatkan VA Baru"}
                </Button>
              </div>
            </>
          )}
        </Card>
      )}

      {items.length > 0 && (
        <Card className="mt-5 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Rincian Biaya</span>
            {invoice.siklus?.faskes?.jenis_faskes && (
              <span className="ml-2 text-[12px] text-slate-500 dark:text-slate-400 dark:text-slate-500">— {invoice.siklus.faskes.jenis_faskes.nama}</span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wide">Komponen Biaya</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wide">Tipe</th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wide">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-800 dark:text-slate-200 text-[13px]">{item.nama_biaya}</div>
                      {item.deskripsi && <div className="text-[12px] text-slate-400 dark:text-slate-500 mt-0.5">{item.deskripsi}</div>}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 dark:text-slate-500">{SATUAN_LABEL[item.satuan] || item.satuan}</span>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap text-[13px]">{formatRp(item.jumlah)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <td colSpan="2" className="px-5 py-3 text-right font-semibold text-slate-800 dark:text-slate-200 text-[13px]">Total Tagihan</td>
                  <td className="px-5 py-3 text-right font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap text-[15px]">{formatRp(invoice.total_tagihan)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {!isLunas && !isRefunded && !vaData && !activeBukti && (
        <Card className="p-6 mt-5">
          <h2 className="text-[15px] font-semibold text-slate-800 dark:text-slate-200 mb-4">
            Pilih Metode Pembayaran
          </h2>
          <PaymentMethodSelector value={method} onChange={setMethod} disabled={submitting} />

          {method === "transfer_manual" ? (
            <div className="mt-5">
              <h3 className="text-[13px] font-semibold text-slate-600 dark:text-slate-300 dark:text-slate-500 mb-3">Unggah Bukti Transfer</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="tf-nominal">Nominal *</Label>
                  <Input id="tf-nominal" type="number" value={nominal} onChange={e => setNominal(e.target.value)} placeholder="5000000" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tf-ref">No. Referensi Transfer *</Label>
                  <Input id="tf-ref" value={noRef} onChange={e => setNoRef(e.target.value)} placeholder="TRX-202610-001" />
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                <Label htmlFor="tf-rek">Dari rekening *</Label>
                <Input id="tf-rek" value={dariRek} onChange={e => setDariRek(e.target.value)} placeholder="BCA 123-456-7890 a.n. RS Permata" />
              </div>
              <div className="mt-3 space-y-1.5">
                <Label htmlFor="tf-bukti">File bukti (PDF / gambar) *</Label>
                <Input id="tf-bukti" type="file" accept=".pdf,image/*" onChange={e => handleFileChange(e.target.files?.[0])} />
              </div>
              {fileError && <div className="mt-3 p-2.5 rounded-md bg-red-50 border border-red-200 text-red-700 text-[12px]">{fileError}</div>}
              <Button onClick={handleManualSubmit} disabled={submitting} className="w-full mt-4">{submitting ? "Mengunggah..." : "Kirim Bukti Transfer"}</Button>
            </div>
          ) : (
            <div className="mt-5">
              <div className="p-3 rounded-md bg-amber-50 text-amber-800 text-[12px] mb-3">Total yang harus dibayar: <strong>{formatRp(invoice.total_tagihan)}</strong></div>
              {fileError && <div className="p-2.5 rounded-md bg-red-50 border border-red-200 text-red-700 text-[12px] mb-3">{fileError}</div>}
              <Button onClick={() => handleGatewayPayment(false)} disabled={submitting} className="w-full">{submitting ? "Memproses..." : method === "qris" ? "Generate QRIS" : "Dapatkan Nomor VA"}</Button>
            </div>
          )}
        </Card>
      )}

      {bukti.length > 0 && (
        <Card className="mt-5 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Riwayat Pembayaran</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wide">Tanggal</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wide">Metode</th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wide">Nominal</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {bukti.map(b => {
                  const statusInfo = BUKTI_STATUS[b.status_verifikasi] || BUKTI_STATUS.menunggu;
                  return (
                    <tr key={b.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-5 py-3 text-[12px] text-slate-600 dark:text-slate-300 dark:text-slate-500">{formatDateTime(b.tanggal_submit)}</td>
                      <td className="px-5 py-3 text-[12px] text-slate-600 dark:text-slate-300 dark:text-slate-500">{b.metode === "transfer_manual" ? "Transfer" : b.metode === "qris" ? "QRIS" : "VA"}</td>
                      <td className="px-5 py-3 text-right font-medium text-slate-800 dark:text-slate-200 text-[13px]">{formatRp(b.nominal)}</td>
                      <td className="px-5 py-3">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: statusInfo.bg, color: statusInfo.fg }}>{statusInfo.label}</span>
                        {b.alasan_penolakan && <div className="text-[11px] text-red-600 mt-1">{b.alasan_penolakan}</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
