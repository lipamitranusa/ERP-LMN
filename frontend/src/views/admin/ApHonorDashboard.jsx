import React from "react";
import { useHistory } from "react-router-dom";
import { formatDate } from "../../utils/dateFormat";
import { useApi } from "@/hooks/useApi";

function formatRp(n) {
  return `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
}

function KpiCard({ label, value, sub, tone = "default" }) {
  const tones = {
    default: { bg: "#FFFFFF", text: "#1E293B", sub: "#64748B", border: "#E2E8F0" },
    warn:    { bg: "#FEF9C3", text: "#854D0E", sub: "#92400E", border: "#FDE68A" },
    danger:  { bg: "#FEE2E2", text: "#991B1B", sub: "#991B1B", border: "#FECACA" },
    success: { bg: "#DCFCE7", text: "#166534", sub: "#166534", border: "#BBF7D0" },
    info:    { bg: "#EDE9F6", text: "#5E35B1", sub: "#5E35B1", border: "#D1C4E9" },
  };
  const t = tones[tone];
  return (
    <div style={{
      background: t.bg, borderRadius: "8px", padding: "16px 20px",
      border: `1px solid ${t.border}`,
    }}>
      <div style={{ fontSize: "11px", fontWeight: "600", color: t.sub, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ fontSize: "22px", fontWeight: "700", color: t.text, marginTop: "4px", lineHeight: 1.2 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: "11px", color: t.sub, marginTop: "4px" }}>{sub}</div>}
    </div>
  );
}

function AgingBar({ buckets }) {
  const total = Object.values(buckets).reduce((s, b) => s + (b.nilai || 0), 0);
  if (total === 0) {
    return (
      <div style={{ padding: "32px", textAlign: "center", color: "#94A3B8", fontSize: "13px" }}>
        Tidak ada AP honor outstanding.
      </div>
    );
  }
  const segments = [
    { key: "0_30", label: "0-30 hari", color: "#10B981" },
    { key: "31_60", label: "31-60 hari", color: "#F59E0B" },
    { key: "61_90", label: "61-90 hari", color: "#EA580C" },
    { key: ">90", label: ">90 hari", color: "#DC2626" },
  ];

  return (
    <div>
      <div style={{ display: "flex", height: "32px", borderRadius: "6px", overflow: "hidden", border: "1px solid #E2E8F0" }}>
        {segments.map(s => {
          const pct = (buckets[s.key]?.nilai || 0) / total * 100;
          if (pct === 0) return null;
          return (
            <div
              key={s.key}
              title={`${s.label}: ${formatRp(buckets[s.key]?.nilai || 0)} (${buckets[s.key]?.count || 0} honor)`}
              style={{ width: `${pct}%`, background: s.color }}
            />
          );
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginTop: "12px", fontSize: "11px" }}>
        {segments.map(s => (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: s.color, flexShrink: 0 }} />
            <span style={{ color: "#64748B" }}>{s.label}</span>
            <span style={{ marginLeft: "auto", fontWeight: "600", color: "#1E293B" }}>
              {formatRp(buckets[s.key]?.nilai || 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const STATUS_PAYMENT_MAP = {
  draft:       { label: "Draft",       bg: "#F1F5F9", text: "#475569" },
  disetujui:   { label: "Disetujui",   bg: "#DCFCE7", text: "#166534" },
  dibatalkan:  { label: "Dibatalkan",  bg: "#FEE2E2", text: "#991B1B" },
};

const METODE_MAP = {
  transfer_bank: "Transfer Bank",
  tunai: "Tunai",
  lainnya: "Lainnya",
};

function StatusBadge({ status }) {
  const s = STATUS_PAYMENT_MAP[status] || STATUS_PAYMENT_MAP.draft;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      padding: "2px 8px", borderRadius: "9999px",
      fontSize: "11px", fontWeight: "600",
      background: s.bg, color: s.text,
    }}>
      {s.label}
    </span>
  );
}

export default function ApHonorDashboard() {
  const history = useHistory();

  const { data: dashData, isLoading: dashLoading, error: dashError } = useApi(
    "ap-honor-dashboard",
    "/keuangan/ap-honor/dashboard"
  );
  const { data: paymentsData, isLoading: paymentsLoading, error: paymentsError } = useApi(
    "ap-honor-payments-recent",
    "/keuangan/ap-honor/payments"
  );

  const isLoading = dashLoading || paymentsLoading;
  const error = dashError?.message || paymentsError?.message || "";

  const kpi = dashData?.data?.kpi || {};
  const aging = dashData?.data?.aging || {};
  const top_penerima = dashData?.data?.top_penerima || [];
  const tanggal_snapshot = dashData?.data?.tanggal_snapshot;
  const recent_payments = (paymentsData?.data || []).slice(0, 5);

  if (isLoading && !dashData) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8" }}>Memuat dasbor AP...</div>;
  }
  if (error) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#DC2626", fontSize: "13px" }}>{error}</div>;
  }
  if (!dashData) return null;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>Dasbor AP Honor</h1>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
            Accounts Payable honor Surveior, Verifikator & Rekomendator. Snapshot per {tanggal_snapshot}.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className="btn btn-secondary"
            onClick={() => history.push("/admin/ap-honor/history")}
          >
            Riwayat Pembayaran
          </button>
          <button
            className="btn btn-primary"
            onClick={() => history.push("/admin/ap-honor/list")}
          >
            Bayar Honor
          </button>
        </div>
      </div>

      {/* KPI row — baris 1: ringkasan utama */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginBottom: "12px" }}>
        <KpiCard
          label="AP Honor Outstanding"
          value={formatRp(kpi.total_ap_outstanding)}
          sub={`${kpi.jumlah_honor_belum_dibayar} honor`}
          tone="warn"
        />
        <KpiCard
          label="Dibayar Bulan Ini"
          value={formatRp(kpi.total_dibayar_bulan_ini)}
          sub={`${kpi.jumlah_pembayaran_bulan_ini} pembayaran disetujui`}
          tone="success"
        />
      </div>

      {/* KPI row — baris 2: breakdown per peran */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
        <KpiCard
          label="Surveior Outstanding"
          value={kpi.jumlah_surveior_outstanding}
          sub="Honor surveior yang belum dibayar"
          tone="info"
        />
        <KpiCard
          label="Verifikator Outstanding"
          value={kpi.jumlah_verifikator_outstanding}
          sub="Honor verifikator yang belum dibayar"
          tone="info"
        />
        <KpiCard
          label="Rekomendator Outstanding"
          value={kpi.jumlah_rekomendator_outstanding}
          sub="Honor rekomendator yang belum dibayar"
          tone="info"
        />
      </div>

      {/* Aging buckets */}
      <div className="card" style={{ padding: "20px", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <span style={{ fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>Aging AP Honor</span>
          <span style={{ fontSize: "11px", color: "#94A3B8" }}>hari sejak honor menjadi tagihan</span>
        </div>
        <AgingBar buckets={aging} />
      </div>

      {/* Two-column: top penerima + recent payments */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px", alignItems: "start" }}>
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0" }}>
            <span style={{ fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>Top penerima honor</span>
          </div>
          <div className="table-container" style={{ border: "none", borderRadius: 0, maxHeight: "300px", overflowY: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Penerima</th>
                  <th style={{ textAlign: "center" }}>Honor</th>
                  <th style={{ textAlign: "right" }}>Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {top_penerima.length === 0 ? (
                  <tr><td colSpan="3" style={{ textAlign: "center", color: "#94A3B8", padding: "24px 16px" }}>Tidak ada AP outstanding.</td></tr>
                ) : top_penerima.map(row => (
                  <tr key={row.tenaga_ahli_id}>
                    <td>
                      <div style={{ fontSize: "13px", fontWeight: "500", color: "#334155" }}>{row.nama}</div>
                      <div style={{ fontSize: "11px", color: "#94A3B8" }}>{row.nomor_induk_surveior}</div>
                    </td>
                    <td style={{ textAlign: "center", fontSize: "12px", color: "#475569" }}>{row.jumlah_honor}</td>
                    <td style={{ textAlign: "right", fontWeight: "600", color: "#991B1B" }}>
                      {formatRp(row.total_neto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>Pembayaran terbaru</span>
            <span style={{ fontSize: "11px", color: "#94A3B8" }}>5 terakhir</span>
          </div>
          <div className="table-container" style={{ border: "none", borderRadius: 0, maxHeight: "300px", overflowY: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nomor</th>
                  <th>Tanggal</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {recent_payments.length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign: "center", color: "#94A3B8", padding: "24px 16px" }}>Belum ada pembayaran.</td></tr>
                ) : recent_payments.map(p => (
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
                    <td style={{ fontSize: "12px", color: "#475569" }}>{formatDate(p.tanggal_pembayaran)}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td style={{ textAlign: "right", fontSize: "12px", fontWeight: "600" }}>
                      {formatRp(p.total_nominal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}