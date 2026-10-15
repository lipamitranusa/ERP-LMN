import React from "react";

const STATUS_MAP = {
  lunas: { color: "#DCFCE7", textColor: "#166534", label: "Lunas", icon: "check" },
  sebagian: { color: "#DBEAFE", textColor: "#1E40AF", label: "Sebagian", icon: "clock" },
  belum_bayar: { color: "#FEE2E2", textColor: "#991B1B", label: "Belum Bayar", icon: "alert" },
  jatuh_tempo: { color: "#FEF3C7", textColor: "#92400E", label: "Jatuh Tempo", icon: "alert" },
  expired: { color: "#F1F5F9", textColor: "#475569", label: "Kedaluwarsa", icon: "x" },
  refunded: { color: "#EDE9F6", textColor: "#5E35B1", label: "Refund", icon: "rotate" },
};

function Icon({ name }) {
  if (name === "check") return (
    <svg viewBox="0 0 16 16" fill="none" width="12" height="12"><path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  );
  if (name === "clock") return (
    <svg viewBox="0 0 16 16" fill="none" width="12" height="12"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/><path d="M8 4v4l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
  );
  if (name === "alert") return (
    <svg viewBox="0 0 16 16" fill="none" width="12" height="12"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/><path d="M8 5v3M8 11v0.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
  );
  if (name === "x") return (
    <svg viewBox="0 0 16 16" fill="none" width="12" height="12"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  );
  if (name === "rotate") return (
    <svg viewBox="0 0 16 16" fill="none" width="12" height="12"><path d="M2 8a6 6 0 111.5 4M2 12V8h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
  );
  return null;
}

export default function InvoiceStatusCard({ invoice, onClick }) {
  const totalDiterima = parseFloat(invoice.total_diterima ?? 0);
  const totalTagihan = parseFloat(invoice.total_tagihan ?? 0);
  const sisa = parseFloat(invoice.sisa_tagihan ?? (totalTagihan - totalDiterima));
  const pct = totalTagihan > 0 ? Math.min(100, (totalDiterima / totalTagihan) * 100) : 0;
  const statusInfo = STATUS_MAP[invoice.status] || STATUS_MAP.belum_bayar;

  const formatRp = (n) => `Rp ${Number(n).toLocaleString("id-ID")}`;

  return (
    <div style={{
      background: "#FFFFFF",
      border: "1px solid #E2E8F0",
      borderRadius: "8px",
      padding: "20px",
      cursor: onClick ? "pointer" : "default",
      transition: "box-shadow 0.15s",
    }}
    onClick={onClick}
    onMouseEnter={e => { if (onClick) e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
    onMouseLeave={e => { if (onClick) e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <div>
          <div style={{ fontSize: "11px", fontWeight: "600", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>
            Invoice
          </div>
          <div style={{ fontSize: "15px", fontWeight: "600", color: "#1E293B" }}>
            {invoice.nomor_invoice}
          </div>
        </div>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          padding: "4px 10px", borderRadius: "9999px",
          fontSize: "11px", fontWeight: "600",
          background: statusInfo.color, color: statusInfo.textColor,
        }}>
          <Icon name={statusInfo.icon} />
          {statusInfo.label}
        </span>
      </div>

      <div style={{ marginBottom: "8px", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: "12px", color: "#64748B" }}>Total tagihan</span>
        <span style={{ fontSize: "13px", fontWeight: "600", color: "#1E293B" }}>{formatRp(totalTagihan)}</span>
      </div>
      <div style={{ marginBottom: "8px", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: "12px", color: "#64748B" }}>Sudah dibayar</span>
        <span style={{ fontSize: "13px", fontWeight: "600", color: "#166534" }}>{formatRp(totalDiterima)}</span>
      </div>
      {sisa > 0 && (
        <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: "12px", color: "#64748B" }}>Sisa</span>
          <span style={{ fontSize: "13px", fontWeight: "600", color: "#991B1B" }}>{formatRp(sisa)}</span>
        </div>
      )}

      <div style={{
        height: "6px",
        background: "#F1F5F9",
        borderRadius: "3px",
        overflow: "hidden",
      }}>
        <div style={{
          width: `${pct}%`,
          height: "100%",
          background: invoice.status === "lunas" ? "#4CAF50" : "#F59E0B",
          transition: "width 0.3s ease",
        }} />
      </div>
      <div style={{ marginTop: "6px", fontSize: "11px", color: "#94A3B8", textAlign: "right" }}>
        {pct.toFixed(0)}% terbayar
      </div>
    </div>
  );
}
