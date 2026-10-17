import React, { useState, useCallback, useRef } from "react";
import { useParams, useHistory } from "react-router-dom";
import InvoiceStatusCard from "@/components/InvoiceStatusCard";
import PaymentMethodSelector from "@/components/PaymentMethodSelector";
import { formatDate, formatDateTime } from "../../utils/dateFormat";
import { useApi, useMutateKeys } from "@/hooks/useApi";

function formatRp(n) {
  return `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
}

const BUKTI_STATUS = {
  menunggu: { label: "Menunggu verifikasi", color: "#FEF9C3", text: "#854D0E" },
  diterima: { label: "Diterima", color: "#DCFCE7", text: "#166534" },
  ditolak: { label: "Ditolak", color: "#FEE2E2", text: "#991B1B" },
};

function CopyButton({ text, label = "Salin" }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <button
      onClick={handleCopy}
      style={{
        padding: "4px 12px",
        border: "1px solid #4CAF50",
        borderRadius: "6px",
        background: copied ? "#DCFCE7" : "#fff",
        color: copied ? "#166534" : "#4CAF50",
        fontSize: "12px",
        fontWeight: "600",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "4px",
        transition: "all 0.15s",
      }}
    >
      {copied ? (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          Tersalin!
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

function CountdownTimer({ expiredAt }) {
  const [timeLeft, setTimeLeft] = useState(null);
  const intervalRef = useRef(null);

  const calc = useCallback(() => {
    if (!expiredAt) return null;
    const now = new Date();
    const exp = new Date(expiredAt);
    const diff = exp - now;
    if (diff <= 0) return { h: 0, m: 0, s: 0, expired: true };
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return { h, m, s, expired: false };
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
      <div style={{
        padding: "10px 14px",
        background: "#FEE2E2",
        border: "1px solid #FECACA",
        borderRadius: "8px",
        color: "#991B1B",
        fontSize: "12px",
        fontWeight: "600",
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        VA/QRIS telah expired — klik "Dapatkan Nomor VA Baru" untuk membuat ulang.
      </div>
    );
  }

  const { h, m, s } = timeLeft;
  const isUrgent = h < 1;
  return (
    <div style={{
      padding: "10px 14px",
      background: isUrgent ? "#FEF9C3" : "#EFF6FF",
      border: `1px solid ${isUrgent ? "#FDE68A" : "#BFDBFE"}`,
      borderRadius: "8px",
      color: isUrgent ? "#92400E" : "#1E40AF",
      fontSize: "12px",
      fontWeight: "600",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "8px",
    }}>
      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        Berakhir dalam:
      </span>
      <span style={{
        fontFamily: "monospace",
        fontSize: "14px",
        fontWeight: "700",
        color: isUrgent ? "#DC2626" : "#1E40AF",
      }}>
        {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
      </span>
    </div>
  );
}

function VaInstructions({ method, vaNumber, gateway, selectedBank }) {
  const banks = method === "qris" ? null : getBankInstructions(vaNumber, gateway, selectedBank);
  return (
    <div style={{ marginTop: "16px" }}>
      <h3 style={{ margin: "0 0 10px", fontSize: "13px", fontWeight: "600", color: "#374151" }}>
        {method === "qris" ? "Petunjuk Pembayaran QRIS" : "Petunjuk Pembayaran Virtual Account"}
      </h3>
      {method === "qris" ? (
        <div style={{ background: "#F8FAFC", borderRadius: "8px", padding: "14px", fontSize: "12px", color: "#475569", lineHeight: "1.7" }}>
          <ol style={{ margin: 0, paddingLeft: "18px" }}>
            <li>Buka aplikasi <strong>m-BCA / BCA Mobile</strong>, atau aplikasi bank lainnya yang mendukung QRIS.</li>
            <li>Pilih menu <strong>Scan QR</strong>.</li>
            <li>Scan kode QR yang tersedia di halaman ini.</li>
            <li>Pastikan nominal yang tertera adalah <strong>{formatRp(gateway?.total)}</strong>.</li>
            <li>Masukkan PIN / konfirmasi pembayaran.</li>
            <li>Simpan bukti pembayaran (screenshot).</li>
          </ol>
          <div style={{ marginTop: "10px", padding: "8px 10px", background: "#DCFCE7", borderRadius: "4px", fontSize: "11px", color: "#166534" }}>
            Pembayaran akan diverifikasi otomatis dalam 1-5 menit.
          </div>
        </div>
      ) : banks ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {banks.map(bank => (
            <div key={bank.name} style={{ background: "#F8FAFC", borderRadius: "8px", padding: "12px 14px", border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#1E293B", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "18px" }}>{bank.icon}</span>
                {bank.name}
              </div>
              <ol style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "#475569", lineHeight: "1.8" }}>
                {bank.steps.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: "#F8FAFC", borderRadius: "8px", padding: "14px", fontSize: "12px", color: "#475569", lineHeight: "1.7" }}>
          Lunasi ke nomor Virtual Account di atas melalui ATM, mobile banking, atau internet banking.
        </div>
      )}
    </div>
  );
}

function getBankInstructions(vaNumber, gateway, selectedBank) {
  const total = gateway?.total ? formatRp(gateway.total) : "nominal tagihan";
  const allBanks = [
    {
      key: "bca",
      name: "BCA",
      icon: "🏦",
      steps: [
        <>Pilih <strong>menu Multi Payment</strong> → <strong>BCA</strong>.</>,
        <>Masukkan kode perusahaan / <strong>VA: {vaNumber}</strong>.</>,
        <>Masukkan <strong>{total}</strong> sebagai jumlah.</>,
        <>Ikuti instruksi sampai <strong>konfirmasi</strong>. Simpan bukti.</>,
      ],
    },
    {
      key: "bni",
      name: "BNI",
      icon: "🏛️",
      steps: [
        <>Pilih <strong>Menu Lain → Transfer → Virtual Account Billing</strong>.</>,
        <>Pilih rekening debet dan masukkan <strong>{vaNumber}</strong>.</>,
        <>Pilih <strong>{total}</strong>. Lanjutkan dan <strong>konfirmasi</strong>.</>,
      ],
    },
    {
      key: "mandiri",
      name: "Mandiri",
      icon: "🏪",
      steps: [
        <>Pilih <strong>Bayar → Multi Payment</strong>.</>,
        <>Pilih <strong>Lembaga → VA</strong>, masukkan <strong>{vaNumber}</strong>.</>,
        <>Masukkan <strong>{total}</strong>. <strong>Konfirmasi</strong> dan simpan bukti.</>,
      ],
    },
    {
      key: "bri",
      name: "BRI",
      icon: "🏢",
      steps: [
        <>Pilih <strong>Menu Bayar → Multi Payment</strong>.</>,
        <>Pilih layanan <strong>BRIVA</strong>.</>,
        <>Masukkan <strong>{vaNumber}</strong>, nominal <strong>{total}</strong>.</>,
        <><strong>Konfirmasi</strong>, masukkan PIN, selesai.</>,
      ],
    },
    {
      key: "permata",
      name: "Permata",
      icon: "💎",
      steps: [
        <>Pilih <strong>Bayar → Virtual Account Permata</strong>.</>,
        <>Masukkan <strong>{vaNumber}</strong>.</>,
        <>Nominal <strong>{total}</strong>. <strong>Konfirmasi</strong>.</>,
      ],
    },
  ];

  if (selectedBank) {
    const bank = allBanks.find(b => b.key === selectedBank);
    return bank ? [bank] : allBanks;
  }

  return allBanks;
}

export default function TagihanDetail() {
  const { id } = useParams();
  const history = useHistory();
  const [method, setMethod] = useState("virtual_account");
  const [error, setError] = useState("");

  // Manual transfer form
  const [nominal, setNominal] = useState("");
  const [noRef, setNoRef] = useState("");
  const [dariRek, setDariRek] = useState("");
  const [fileBukti, setFileBukti] = useState(null);

  // VA/QRIS display state
  const [vaData, setVaData] = useState(null);

  // Ganti metode pembayaran
  const [showMethodPicker, setShowMethodPicker] = useState(false);
  const [pendingMethod, setPendingMethod] = useState(null);

  // Fetch invoice detail
  const {
    data: invoiceData,
    isLoading: loading,
    refetch: refetchInvoice,
    isFetching,
  } = useApi(
    ["invoice", id],
    `/invoice/${id}`,
    {
      enabled: !!id,
      // Polling: refetch every 10 seconds for faster payment detection
      refetchInterval: (data) => {
        // Stop polling once paid
        if (data?.status === "lunas") return false;
        return 10000;
      },
    }
  );

  const invoice = invoiceData?.data || null;

  // Sync vaData from invoice data
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

  // Fetch bukti list
  const { data: buktiData } = useApi(
    ["invoice-bukti", id],
    `/invoice/${id}/bukti`,
    { enabled: !!id }
  );

  const bukti = buktiData?.data || [];

  // Gateway payment mutation (VA or QRIS)
  const gatewayMutation = useMutateKeys(["invoice", id, "invoices"], {
    onSuccess: (data) => {
      setVaData({
        reference: method === "qris" ? data.data.reference : data.data.nomor_va,
        expiredAt: data.data.expired_at,
        metode: method === "qris" ? "qris" : "va",
        bank: data.data.bank,
      });
      // Reload after DB update
      setTimeout(() => refetchInvoice(), 500);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  // Ganti metode mutation
  const gantiMetodeMutation = useMutateKeys(["invoice", id, "invoices"], {
    onSuccess: (data) => {
      setVaData({
        reference: pendingMethod === "qris" ? data.data.reference : data.data.nomor_va,
        expiredAt: data.data.expired_at,
        metode: pendingMethod === "qris" ? "qris" : "va",
        bank: data.data.bank,
      });
      setMethod(pendingMethod);
      setTimeout(() => refetchInvoice(), 500);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  // Manual bukti upload mutation
  const buktiMutation = useMutateKeys(["invoice", id, "invoices", "invoice-bukti", id], {
    onSuccess: () => {
      setShowMethodPicker(false);
      setMethod("transfer_manual");
      setVaData(null);
      setNominal(""); setNoRef(""); setDariRek(""); setFileBukti(null);
      refetchInvoice();
      alert("Bukti transfer berhasil diunggah. Admin akan memverifikasi dalam 1x24 jam kerja.");
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  function handleGatewayPayment(forceNew = false) {
    setError("");
    const endpoint = method === "qris" ? "bayar-qris" : "bayar-va";
    const path = forceNew ? `/invoice/${id}/${endpoint}?force=true` : `/invoice/${id}/${endpoint}`;
    gatewayMutation.mutate({
      path,
      method: "POST",
      body: {},
    });
  }

  function handleGantiMetode() {
    if (!pendingMethod) return;
    setError("");
    setShowMethodPicker(false);
    const endpoint = pendingMethod === "qris" ? "bayar-qris" : "bayar-va";
    gantiMetodeMutation.mutate({
      path: `/invoice/${id}/${endpoint}?force=true`,
      method: "POST",
      body: {},
    });
  }

  function handleManualSubmit(e) {
    e.preventDefault();
    setError("");
    if (!fileBukti) { setError("Pilih file bukti transfer."); return; }
    const fd = new FormData();
    fd.append("nominal", nominal);
    fd.append("nomor_referensi", noRef);
    fd.append("dari_rekening", dariRek);
    fd.append("bukti", fileBukti);
    buktiMutation.mutate({
      path: `/invoice/${id}/bukti-manual`,
      method: "POST",
      body: fd,
    });
  }

  const submitting = gatewayMutation.isPending || gantiMetodeMutation.isPending || buktiMutation.isPending;

  if (loading || !invoice) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8" }}>Memuat...</div>;
  }

  const items = invoice.items || [];
  const isLunas = invoice.status === "lunas";
  const isRefunded = invoice.status === "refunded";
  const metode = vaData?.metode || invoice.metode_pembayaran;
  const isQris = metode === "qris" || method === "qris";
  const TIPE_LABEL = { tetap: "Tetap", per_siklus: "Per Siklus", per_sertifikat: "Per Sertifikat" };
  const SATUAN_LABEL = { tetap: "Tetap", per_siklus: "Per Siklus", per_sertifikat: "Per Sertifikat", per_tahun: "Per Tahun", periksa: "Per Periksa", sekali: "Sekali Bayar" };
  const activeBukti = bukti.find(b => b.status_verifikasi === "menunggu" || b.status_verifikasi === "diterima");

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto" }}>
      <button
        onClick={() => history.push("/faskes/tagihan")}
        className="btn btn-ghost btn-sm"
        style={{ marginBottom: "16px", padding: "6px 0" }}
      >
        ← Kembali ke Daftar Tagihan
      </button>

      <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>Detail Tagihan</h1>
      <p style={{ margin: "4px 0 20px", fontSize: "13px", color: "#64748B" }}>
        Jatuh tempo: <strong style={{ color: "#334155" }}>{formatDate(invoice.due_date)}</strong>
      </p>

      <InvoiceStatusCard invoice={invoice} />

      {/* Bukti aktif sedang diverifikasi/diterima */}
      {activeBukti && !isLunas && (
        <div className="card" style={{ padding: "16px 20px", marginTop: "20px", background: activeBukti.status_verifikasi === "diterima" ? "#DCFCE7" : "#FEF9C3", border: `1px solid ${activeBukti.status_verifikasi === "diterima" ? "#BBF7D0" : "#FDE68A"}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "32px", height: "32px", borderRadius: "50%",
              background: activeBukti.status_verifikasi === "diterima" ? "#4CAF50" : "#F59E0B",
              color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              {activeBukti.status_verifikasi === "diterima" ? (
                <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
                  <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/><path d="M8 4v4l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              )}
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: "600", color: activeBukti.status_verifikasi === "diterima" ? "#166534" : "#92400E" }}>
                {activeBukti.status_verifikasi === "diterima" ? "Bukti Diterima" : "Bukti Menunggu Verifikasi"}
              </div>
              <div style={{ fontSize: "12px", color: activeBukti.status_verifikasi === "diterima" ? "#15803D" : "#A16207" }}>
                {activeBukti.status_verifikasi === "diterima"
                  ? "Pembayaran telah diverifikasi. Invoice akan diperbarui secara otomatis."
                  : `Bukti transfer ${formatRp(activeBukti.nominal)} sedang diverifikasi admin. Mohon tunggu 1x24 jam kerja.`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VA / QRIS Display Card */}
      {vaData && !isLunas && !isRefunded && !activeBukti && (
        <div className="card" style={{ padding: "20px", marginTop: "20px", border: "2px solid #4CAF50" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{
                width: "32px", height: "32px", borderRadius: "50%",
                background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {isQris ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2" width="18" height="18">
                    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2" width="18" height="18">
                    <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
                  </svg>
                )}
              </div>
              <div>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#1E293B" }}>
                  {isQris ? "QRIS" : "Virtual Account"}
                </div>
                <div style={{ fontSize: "11px", color: "#64748B" }}>Aktif</div>
              </div>
            </div>
            <span style={{
              padding: "3px 10px", borderRadius: "20px",
              background: "#DCFCE7", color: "#166534",
              fontSize: "11px", fontWeight: "600",
            }}>
              Otomatis
            </span>
          </div>

          {/* Countdown */}
          <CountdownTimer expiredAt={vaData.expiredAt} />

          {/* VA Number */}
          {vaData.reference && !isQris && (
            <div style={{
              marginTop: "14px", padding: "14px",
              background: "#F8FAFC", borderRadius: "8px",
              border: "1px solid #E2E8F0",
            }}>
              <div style={{ fontSize: "11px", color: "#64748B", marginBottom: "4px" }}>
                Nomor Virtual Account
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                <div style={{ fontFamily: "monospace", fontSize: "18px", fontWeight: "700", color: "#1E293B", letterSpacing: "1px" }}>
                  {vaData.reference}
                </div>
                <CopyButton text={vaData.reference} label="Salin VA" />
              </div>
            </div>
          )}

          {/* Total */}
          <div style={{
            marginTop: "12px", padding: "10px 14px",
            background: "#EFF6FF", borderRadius: "6px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: "12px", color: "#475569" }}>Total Pembayaran</span>
            <span style={{ fontSize: "15px", fontWeight: "700", color: "#1E40AF" }}>{formatRp(invoice.total_tagihan)}</span>
          </div>

          {/* Expired note */}
          <div style={{ marginTop: "10px", fontSize: "11px", color: "#94A3B8", textAlign: "center" }}>
            Pembayaran akan diverifikasi otomatis 1-5 menit setelah transfer.
          </div>

          {/* VA Instructions */}
          <VaInstructions method={isQris ? "qris" : "va"} vaNumber={vaData.reference} gateway={invoice} selectedBank={vaData.bank} />

          {/* Cek status pembayaran manual — untuk kasus webhook belum sampai */}
          <button
            onClick={refetchInvoice}
            disabled={isFetching}
            className="btn btn-ghost"
            style={{ width: "100%", marginTop: "12px", fontSize: "12px", color: "#475569" }}
            title="Paksa refresh status invoice dari server"
          >
            {isFetching ? "Memuat..." : "Cek Status Pembayaran"}
          </button>

          {/* Refresh VA — selalu generate VA baru dari Midtrans */}
          <button
            onClick={() => handleGatewayPayment(true)}
            className="btn btn-secondary"
            style={{ width: "100%", marginTop: "8px", fontSize: "12px" }}
          >
            Dapatkan Nomor VA Baru
          </button>

          {/* Ganti metode pembayaran */}
          <button
            onClick={() => { setShowMethodPicker(true); setPendingMethod(method); }}
            className="btn btn-ghost"
            style={{ width: "100%", marginTop: "8px", fontSize: "12px", color: "#64748B" }}
          >
            Ganti Metode Pembayaran
          </button>
        </div>
      )}

      {/* Form Ganti Metode — tampil di luar card VA/QRIS */}
      {showMethodPicker && (
        <div className="card" style={{ padding: "24px", marginTop: "20px", border: "2px solid #4CAF50" }}>
          <h2 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: "600", color: "#1E293B" }}>
            Ganti Metode Pembayaran
          </h2>
          <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#64748B" }}>
            Nomor VA/QRIS sebelumnya akan <strong>dibatalkan</strong>.
          </p>
          <PaymentMethodSelector value={pendingMethod} onChange={setPendingMethod} disabled={submitting} />

          {pendingMethod === "transfer_manual" ? (
            <form onSubmit={(e) => {
              e.preventDefault();
              setError("");
              if (!fileBukti) { setError("Pilih file bukti transfer."); return; }
              const fd = new FormData();
              fd.append("nominal", nominal);
              fd.append("nomor_referensi", noRef);
              fd.append("dari_rekening", dariRek);
              fd.append("bukti", fileBukti);
              buktiMutation.mutate({
                path: `/invoice/${id}/bukti-manual`,
                method: "POST",
                body: fd,
              });
            }} style={{ marginTop: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label className="form-label">Nominal *</label>
                  <input type="number" className="form-input" value={nominal} onChange={e => setNominal(e.target.value)} placeholder="5000000" required />
                </div>
                <div>
                  <label className="form-label">No. Referensi Transfer *</label>
                  <input className="form-input" value={noRef} onChange={e => setNoRef(e.target.value)} placeholder="TRX-202610-001" required />
                </div>
              </div>
              <div style={{ marginTop: "12px" }}>
                <label className="form-label">Dari rekening *</label>
                <input className="form-input" value={dariRek} onChange={e => setDariRek(e.target.value)} placeholder="BCA 123-456-7890 a.n. Nama" required />
              </div>
              <div style={{ marginTop: "12px" }}>
                <label className="form-label">File bukti (PDF / gambar) *</label>
                <input type="file" accept=".pdf,image/*" onChange={e => setFileBukti(e.target.files?.[0])} required className="form-input" />
              </div>
              {error && <div style={{ marginTop: "12px", padding: "10px 12px", background: "#FEE2E2", color: "#991B1B", borderRadius: "6px", fontSize: "12px" }}>{error}</div>}
              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                <button type="button" onClick={() => setShowMethodPicker(false)} className="btn btn-ghost" style={{ flex: 1 }} disabled={submitting}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting}>{submitting ? "Mengunggah..." : "Kirim Bukti Transfer"}</button>
              </div>
            </form>
          ) : (
            <>
              <div style={{ marginTop: "16px", padding: "12px", background: "#FEF9C3", color: "#854D0E", fontSize: "12px", borderRadius: "6px" }}>
                Total yang harus dibayar: <strong>{formatRp(invoice.total_tagihan)}</strong>
              </div>
              {error && <div style={{ marginTop: "12px", padding: "10px 12px", background: "#FEE2E2", color: "#991B1B", borderRadius: "6px", fontSize: "12px" }}>{error}</div>}
              <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                <button onClick={() => setShowMethodPicker(false)} className="btn btn-ghost" style={{ flex: 1 }} disabled={submitting}>Batal</button>
                <button onClick={handleGantiMetode} className="btn btn-primary" style={{ flex: 1 }} disabled={submitting || !pendingMethod}>
                  {submitting ? "Memproses..." : pendingMethod === "qris" ? "Generate QRIS Baru" : "Dapatkan VA Baru"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Rincian Biaya */}
      {items.length > 0 && (
        <div className="card" style={{ padding: 0, marginTop: "20px" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9" }}>
            <span style={{ fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>Rincian Biaya</span>
            {invoice.siklus?.faskes?.jenis_faskes && (
              <span style={{ marginLeft: "8px", fontSize: "12px", color: "#64748B" }}>
                — {invoice.siklus.faskes.jenis_faskes.nama}
              </span>
            )}
          </div>
          <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Komponen Biaya</th>
                  <th>Tipe</th>
                  <th style={{ textAlign: "right" }}>Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: "500", color: "#1E293B" }}>{item.nama_biaya}</div>
                      {item.deskripsi && <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "2px" }}>{item.deskripsi}</div>}
                    </td>
                    <td>
                      <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", background: "#F1F5F9", color: "#475569" }}>
                        {SATUAN_LABEL[item.satuan] || item.satuan}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: "600", color: "#1E293B", whiteSpace: "nowrap" }}>{formatRp(item.jumlah)}</td>
                  </tr>
                ))}
                <tr style={{ background: "#F8FAFC" }}>
                  <td colSpan="2" style={{ fontWeight: "600", color: "#1E293B", textAlign: "right", paddingRight: "16px" }}>Total Tagihan</td>
                  <td style={{ fontWeight: "700", color: "#1E293B", textAlign: "right", whiteSpace: "nowrap", fontSize: "15px" }}>{formatRp(invoice.total_tagihan)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment method selection */}
      {!isLunas && !isRefunded && !vaData && !activeBukti && (
        <div className="card" style={{ padding: "24px", marginTop: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "15px", fontWeight: "600", color: "#1E293B", marginBottom: "16px" }}>
            Pilih Metode Pembayaran
          </h2>
          <PaymentMethodSelector value={method} onChange={setMethod} disabled={submitting} />

          {method === "transfer_manual" ? (
            <form onSubmit={handleManualSubmit} style={{ marginTop: "20px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "12px" }}>Unggah Bukti Transfer</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label className="form-label">Nominal *</label>
                  <input type="number" className="form-input" value={nominal} onChange={e => setNominal(e.target.value)} placeholder="5000000" required />
                </div>
                <div>
                  <label className="form-label">No. Referensi Transfer *</label>
                  <input className="form-input" value={noRef} onChange={e => setNoRef(e.target.value)} placeholder="TRX-202610-001" required />
                </div>
              </div>
              <div style={{ marginTop: "12px" }}>
                <label className="form-label">Dari rekening *</label>
                <input className="form-input" value={dariRek} onChange={e => setDariRek(e.target.value)} placeholder="BCA 123-456-7890 a.n. RS Permata" required />
              </div>
              <div style={{ marginTop: "12px" }}>
                <label className="form-label">File bukti (PDF / gambar) *</label>
                <input type="file" accept=".pdf,image/*" onChange={e => setFileBukti(e.target.files?.[0])} required className="form-input" />
              </div>
              {error && (
                <div style={{ marginTop: "12px", padding: "10px 12px", background: "#FEE2E2", color: "#991B1B", borderRadius: "6px", fontSize: "12px" }}>{error}</div>
              )}
              <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: "100%", marginTop: "16px" }}>
                {submitting ? "Mengunggah..." : "Kirim Bukti Transfer"}
              </button>
            </form>
          ) : (
            <div style={{ marginTop: "20px" }}>
              <div style={{ padding: "12px", background: "#FEF9C3", color: "#854D0E", fontSize: "12px", borderRadius: "6px", marginBottom: "12px" }}>
                Total yang harus dibayar: <strong>{formatRp(invoice.total_tagihan)}</strong>
              </div>
              {error && (
                <div style={{ padding: "10px 12px", background: "#FEE2E2", color: "#991B1B", borderRadius: "6px", fontSize: "12px", marginBottom: "12px" }}>{error}</div>
              )}
              <button onClick={() => handleGatewayPayment(false)} className="btn btn-primary" disabled={submitting} style={{ width: "100%" }}>
                {submitting ? "Memproses..." : method === "qris" ? "Generate QRIS" : "Dapatkan Nomor VA"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Riwayat bukti pembayaran */}
      {bukti.length > 0 && (
        <div className="card" style={{ marginTop: "20px", padding: 0 }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0" }}>
            <span style={{ fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>Riwayat Pembayaran</span>
          </div>
          <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Metode</th>
                  <th style={{ textAlign: "right" }}>Nominal</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bukti.map(b => {
                  const statusInfo = BUKTI_STATUS[b.status_verifikasi] || BUKTI_STATUS.menunggu;
                  return (
                    <tr key={b.id}>
                      <td style={{ fontSize: "12px", color: "#475569" }}>{formatDateTime(b.tanggal_submit)}</td>
                      <td style={{ fontSize: "12px", color: "#475569" }}>
                        {b.metode === "transfer_manual" ? "Transfer" : b.metode === "qris" ? "QRIS" : "VA"}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: "500", color: "#1E293B" }}>{formatRp(b.nominal)}</td>
                      <td>
                        <span style={{ padding: "2px 8px", borderRadius: "9999px", fontSize: "11px", fontWeight: "600", background: statusInfo.color, color: statusInfo.text }}>
                          {statusInfo.label}
                        </span>
                        {b.alasan_penolakan && (
                          <div style={{ fontSize: "11px", color: "#991B1B", marginTop: "4px" }}>{b.alasan_penolakan}</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
