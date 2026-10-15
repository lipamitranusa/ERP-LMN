import React, { useState, useEffect, useMemo } from "react";
import { useHistory } from "react-router-dom";
import { formatDate } from "../../utils/dateFormat";

async function api(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/auth/login";
    return null;
  }
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res;
}

function formatRp(n) {
  return `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
}

// PRD Bab 3 node AE: 4 status utama Invoice
// - Belum Bayar: belum_bayar, belum lewat due_date
// - Jatuh Tempo: belum_bayar/sebagian, SUDAH lewat due_date
// - Parsial: sebagian, belum lewat due_date
// - Lunas: lunas
const STATUS_MAP = {
  belum_bayar:   { label: "Belum Bayar",   color: "#FEE2E2", text: "#991B1B", bg: "#FEE2E2" },
  parsial:       { label: "Parsial",       color: "#FEF9C3", text: "#854D0E", bg: "#FEF9C3" },
  jatuh_tempo:   { label: "Jatuh Tempo",   color: "#FFEDD5", text: "#9A3412", bg: "#FFEDD5" },
  lunas:         { label: "Lunas",         color: "#DCFCE7", text: "#166534", bg: "#DCFCE7" },
  expired:       { label: "Kedaluwarsa",   color: "#F1F5F9", text: "#475569", bg: "#F1F5F9" },
  refunded:      { label: "Refund",        color: "#EDE9F6", text: "#5E35B1", bg: "#EDE9F6" },
  superseded:    { label: "Diganti",       color: "#E2E8F0", text: "#64748B", bg: "#E2E8F0" },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.belum_bayar;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      padding: "2px 8px", borderRadius: "9999px",
      fontSize: "11px", fontWeight: "600",
      background: s.color, color: s.text,
    }}>
      {s.label}
    </span>
  );
}

function KpiCard({ label, value, sub, tone = "default" }) {
  const tones = {
    default: { bg: "#FFFFFF", text: "#1E293B", sub: "#64748B" },
    warn:    { bg: "#FEF9C3", text: "#854D0E", sub: "#92400E" },
    danger:  { bg: "#FEE2E2", text: "#991B1B", sub: "#991B1B" },
    success: { bg: "#DCFCE7", text: "#166534", sub: "#166534" },
    info:    { bg: "#EDE9F6", text: "#5E35B1", sub: "#5E35B1" },
  };
  const t = tones[tone];
  return (
    <div style={{
      background: t.bg, borderRadius: "8px", padding: "16px 20px",
      border: "1px solid #E2E8F0",
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
  const total = Object.values(buckets).reduce((s, b) => s + b.nilai, 0);
  if (total === 0) {
    return (
      <div style={{ padding: "32px", textAlign: "center", color: "#94A3B8", fontSize: "13px" }}>
        Tidak ada piutang aktif.
      </div>
    );
  }
  const segments = [
    { key: "belum_jatuh_tempo", label: "Belum jatuh tempo", color: "#10B981" },
    { key: "0_30", label: "0-30 hari", color: "#F59E0B" },
    { key: "31_60", label: "31-60 hari", color: "#EA580C" },
    { key: "61_90", label: "61-90 hari", color: "#DC2626" },
    { key: ">90", label: ">90 hari", color: "#991B1B" },
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
              title={`${s.label}: ${formatRp(buckets[s.key]?.nilai || 0)} (${buckets[s.key]?.count || 0} invoice)`}
              style={{ width: `${pct}%`, background: s.color }}
            />
          );
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px", marginTop: "12px", fontSize: "11px" }}>
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

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "Semua status" },
  { value: "belum_bayar", label: "Belum Bayar" },
  { value: "jatuh_tempo", label: "Jatuh Tempo" },
  { value: "parsial", label: "Parsial" },
  { value: "lunas", label: "Lunas" },
  { value: "expired", label: "Kedaluwarsa" },
  { value: "refunded", label: "Refund" },
];

export default function PiutangDashboard() {
  const history = useHistory();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterJatuhTempo, setFilterJatuhTempo] = useState(false);
  const [search, setSearch] = useState("");

  const loadData = (status, jatuhTempo) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (jatuhTempo) params.set("jatuh_tempo", "1");
    const qs = params.toString();
    api(`/piutang/dasbor${qs ? "?" + qs : ""}`)
      .then(r => r?.json())
      .then(d => {
        setData(d?.data || null);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData(filterStatus, filterJatuhTempo);
  }, [filterStatus, filterJatuhTempo]);

  const filteredInvoices = useMemo(() => {
    if (!data?.invoice_list) return [];
    let list = data.invoice_list;

    // Apply status filter — compare against computed status_display
    if (filterStatus) {
      list = list.filter(inv => inv.status_display === filterStatus);
    }

    // Apply overdue filter
    if (filterJatuhTempo) {
      list = list.filter(inv => inv.hari_overdue > 0);
    }

    // Apply search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(inv =>
        (inv.nomor_invoice || "").toLowerCase().includes(q) ||
        (inv.faskes_nama || "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [data, filterStatus, filterJatuhTempo, search]);

  if (loading && !data) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8" }}>Memuat dasbor piutang...</div>;
  }
  if (error) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#DC2626", fontSize: "13px" }}>{error}</div>;
  }
  if (!data) return null;

  const { kpi, aging, per_faskes } = data;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>Dasbor Piutang</h1>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
          Status pembayaran Faskes secara real-time, independen dari alur penugasan Surat Tugas.
          Snapshot per {kpi.tanggal_snapshot}.
        </p>
      </div>

      {/* KPI row — 4 cards per PRD status breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
        <KpiCard
          label="Total piutang aktif"
          value={formatRp(kpi.total_piutang_aktif)}
          sub={`${kpi.jumlah_invoice_aktif} invoice belum lunas`}
          tone="warn"
        />
        <KpiCard
          label="Jatuh tempo"
          value={formatRp(kpi.nilai_jatuh_tempo)}
          sub={`${kpi.jumlah_jatuh_tempo} invoice lewat due date`}
          tone="danger"
        />
        <KpiCard
          label="Lunas bulan ini"
          value={formatRp(kpi.total_lunas_bulan_ini)}
          sub={`${kpi.jumlah_belum_bayar} belum · ${kpi.jumlah_sebagian} parsial`}
          tone="success"
        />
        <KpiCard
          label="Sudah diterima"
          value={formatRp(kpi.total_diterima_aktif)}
          sub="Akumulasi pembayaran invoice aktif"
          tone="info"
        />
      </div>

      {/* Aging buckets */}
      <div className="card" style={{ padding: "20px", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <span style={{ fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>Aging piutang</span>
          <span style={{ fontSize: "11px", color: "#94A3B8" }}>hari lewat jatuh tempo</span>
        </div>
        <AgingBar buckets={aging} />
      </div>

      {/* Two-column: top Faskes + filters */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px", alignItems: "start" }}>
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0" }}>
            <span style={{ fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>Top Faskes dengan piutang</span>
          </div>
          <div className="table-container" style={{ border: "none", borderRadius: 0, maxHeight: "300px", overflowY: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Faskes</th>
                  <th style={{ textAlign: "right" }}>Sisa piutang</th>
                </tr>
              </thead>
              <tbody>
                {per_faskes.length === 0 ? (
                  <tr><td colSpan="2" style={{ textAlign: "center", color: "#94A3B8", padding: "24px 16px" }}>Tidak ada piutang aktif.</td></tr>
                ) : per_faskes.map(row => (
                  <tr key={row.faskes_id}>
                    <td>
                      <div style={{ fontSize: "13px", fontWeight: "500", color: "#334155" }}>{row.faskes_nama}</div>
                      <div style={{ fontSize: "11px", color: "#94A3B8" }}>{row.tipe_faskes} · {row.jumlah_invoice} invoice</div>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: "600", color: row.sisa_piutang > 0 ? "#991B1B" : "#166534" }}>
                      {formatRp(row.sisa_piutang)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Filter panel */}
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ fontSize: "14px", fontWeight: "600", color: "#1E293B", marginBottom: "12px" }}>Filter</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div>
              <label className="form-label">Cari nomor invoice / Faskes</label>
              <input
                className="form-input"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Ketik untuk mencari..."
              />
            </div>
            <div>
              <label className="form-label">Status Invoice</label>
              <select className="form-input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                {STATUS_FILTER_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={filterJatuhTempo}
                onChange={e => setFilterJatuhTempo(e.target.checked)}
              />
              <span style={{ fontSize: "12px", color: "#475569" }}>Hanya yang sudah jatuh tempo</span>
            </label>
            {(filterStatus || filterJatuhTempo) && (
              <button
                className="btn btn-secondary"
                style={{ fontSize: "12px", padding: "6px 12px" }}
                onClick={() => { setFilterStatus(""); setFilterJatuhTempo(false); }}
              >
                Reset filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Invoice list */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>
            Daftar invoice ({filteredInvoices.length})
          </span>
          <span style={{ fontSize: "11px", color: "#94A3B8" }}>Diurutkan berdasarkan due date</span>
        </div>
        <div className="table-container" style={{ border: "none", borderRadius: 0, maxHeight: "480px", overflowY: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Faskes</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Total Tagihan</th>
                <th style={{ textAlign: "right" }}>Diterima</th>
                <th style={{ textAlign: "right" }}>Sisa</th>
                <th>Jatuh Tempo</th>
                <th>Overdue</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: "center", color: "#94A3B8", padding: "32px 16px" }}>Tidak ada invoice yang cocok dengan filter.</td></tr>
              ) : filteredInvoices.map(inv => (
                <tr
                  key={inv.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => history.push(`/admin/piutang/${inv.id}`)}
                  onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                  onMouseLeave={e => e.currentTarget.style.background = ""}
                >
                  <td>
                    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: "12px", color: "#1E293B", fontWeight: "500" }}>
                      {inv.nomor_invoice}
                    </div>
                  </td>
                  <td style={{ fontSize: "12px", color: "#334155" }}>
                    {inv.faskes_nama || "—"}
                    {inv.faskes_telepon && (
                      <div style={{ fontSize: "10px", color: "#94A3B8" }}>{inv.faskes_telepon}</div>
                    )}
                  </td>
                  <td><StatusBadge status={inv.status_display} /></td>
                  <td style={{ textAlign: "right", fontSize: "12px" }}>{formatRp(inv.total_tagihan)}</td>
                  <td style={{ textAlign: "right", fontSize: "12px", color: "#166534" }}>{formatRp(inv.total_diterima)}</td>
                  <td style={{ textAlign: "right", fontSize: "12px", fontWeight: "600", color: inv.sisa_piutang > 0 ? "#991B1B" : "#166534" }}>
                    {formatRp(inv.sisa_piutang)}
                  </td>
                  <td style={{ fontSize: "12px", color: "#475569" }}>{formatDate(inv.due_date)}</td>
                  <td>
                    {inv.hari_overdue > 0 ? (
                      <span style={{
                        padding: "2px 8px", borderRadius: "9999px",
                        fontSize: "11px", fontWeight: "600",
                        background: inv.hari_overdue > 90 ? "#FEE2E2" : inv.hari_overdue > 30 ? "#FEF9C3" : "#FEF9C3",
                        color: inv.hari_overdue > 90 ? "#991B1B" : "#854D0E",
                      }}>
                        {inv.hari_overdue} hari
                      </span>
                    ) : (
                      <span style={{ fontSize: "11px", color: "#94A3B8" }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
