import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import { formatDate } from "../../utils/dateFormat";
import { useApi } from "@/hooks/useApi";

function formatRp(n) {
  return `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
}

const STATUS_MAP = {
  draft:      { label: "Draft",      bg: "#F1F5F9", text: "#475569" },
  disetujui:  { label: "Disetujui",  bg: "#DCFCE7", text: "#166534" },
  dibatalkan: { label: "Dibatalkan", bg: "#FEE2E2", text: "#991B1B" },
};

const METODE_MAP = {
  transfer_bank: "Transfer Bank",
  tunai: "Tunai",
  lainnya: "Lainnya",
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.draft;
  return (
    <span style={{
      padding: "2px 8px", borderRadius: "9999px",
      fontSize: "11px", fontWeight: "600",
      background: s.bg, color: s.text,
    }}>
      {s.label}
    </span>
  );
}

export default function ApHonorHistory() {
  const history = useHistory();
  const [filterStatus, setFilterStatus] = useState("");
  const [filterBulan, setFilterBulan] = useState("");

  const params = new URLSearchParams();
  if (filterStatus) params.set("status", filterStatus);
  if (filterBulan) {
    const [tahun, bulanNum] = filterBulan.split("-");
    params.set("tahun", tahun);
    params.set("bulan", bulanNum);
  }
  const qs = params.toString();

  const { data, isLoading, error } = useApi(
    ["ap-honor-history", filterStatus, filterBulan],
    `/keuangan/ap-honor/payments${qs ? "?" + qs : ""}`
  );

  const payments = data?.data || [];
  const total = payments.reduce((s, p) => s + (p.total_nominal || 0), 0);
  const totalDisetujui = payments.filter(p => p.status === "disetujui").reduce((s, p) => s + (p.total_nominal || 0), 0);

  if (isLoading && !data) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8" }}>Memuat riwayat pembayaran...</div>;
  }
  if (error) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#DC2626", fontSize: "13px" }}>{error.message}</div>;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <button
            className="btn btn-ghost"
            onClick={() => history.push("/admin/ap-honor")}
            style={{ fontSize: "12px", padding: "4px 8px", marginBottom: "8px" }}
          >
            ← Dasbor AP
          </button>
          <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>Riwayat Pembayaran Honor</h1>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className="btn btn-primary"
            onClick={() => history.push("/admin/ap-honor/list")}
          >
            Bayar Honor Baru
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: "12px 20px", marginBottom: "16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "12px", alignItems: "end" }}>
          <div>
            <label className="form-label">Status</label>
            <select className="form-input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Semua status</option>
              <option value="draft">Draft</option>
              <option value="disetujui">Disetujui</option>
              <option value="dibatalkan">Dibatalkan</option>
            </select>
          </div>
          <div>
            <label className="form-label">Periode</label>
            <input
              className="form-input"
              type="month"
              value={filterBulan}
              onChange={e => setFilterBulan(e.target.value)}
            />
          </div>
          {(filterStatus || filterBulan) && (
            <button
              className="btn btn-secondary"
              onClick={() => { setFilterStatus(""); setFilterBulan(""); }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "12px 16px" }}>
          <div style={{ fontSize: "11px", color: "#64748B", textTransform: "uppercase" }}>Total semua status</div>
          <div style={{ fontSize: "20px", fontWeight: "700" }}>{formatRp(total)}</div>
          <div style={{ fontSize: "11px", color: "#64748B" }}>{payments.length} pembayaran</div>
        </div>
        <div style={{ background: "#DCFCE7", border: "1px solid #BBF7D0", borderRadius: "8px", padding: "12px 16px" }}>
          <div style={{ fontSize: "11px", color: "#166534", textTransform: "uppercase" }}>Total disetujui</div>
          <div style={{ fontSize: "20px", fontWeight: "700", color: "#166534" }}>{formatRp(totalDisetujui)}</div>
          <div style={{ fontSize: "11px", color: "#166534" }}>
            {payments.filter(p => p.status === "disetujui").length} pembayaran
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container" style={{ border: "none", borderRadius: 0, maxHeight: "600px", overflowY: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nomor</th>
                <th>Tanggal</th>
                <th>Metode</th>
                <th>Status</th>
                <th style={{ textAlign: "center" }}>Line</th>
                <th style={{ textAlign: "right" }}>Total</th>
                <th>Dibuat oleh</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", color: "#94A3B8", padding: "32px 16px" }}>
                    Tidak ada pembayaran yang cocok dengan filter.
                  </td>
                </tr>
              ) : payments.map(p => (
                <tr
                  key={p.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => history.push(`/admin/ap-honor/payment/${p.id}`)}
                  onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                  onMouseLeave={e => e.currentTarget.style.background = ""}
                >
                  <td style={{ fontFamily: "ui-monospace, monospace", fontSize: "12px", fontWeight: "500" }}>
                    {p.nomor_pembayaran}
                  </td>
                  <td style={{ fontSize: "12px" }}>{formatDate(p.tanggal_pembayaran)}</td>
                  <td style={{ fontSize: "12px" }}>{METODE_MAP[p.metode] || p.metode}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td style={{ textAlign: "center", fontSize: "12px", color: "#475569" }}>{p.jumlah_line_item}</td>
                  <td style={{ textAlign: "right", fontSize: "12px", fontWeight: "600" }}>{formatRp(p.total_nominal)}</td>
                  <td style={{ fontSize: "12px", color: "#475569" }}>{p.dibuat_oleh || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}