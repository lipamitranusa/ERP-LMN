import React, { useState, useMemo } from "react";
import { useHistory } from "react-router-dom";
import { formatDate } from "../../utils/dateFormat";
import { useApi } from "@/hooks/useApi";

function formatRp(n) {
  return `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
}

const STATUS_MAP = {
  belum_dibayar: { label: "Belum Dibayar", bg: "#FEF9C3", text: "#854D0E" },
  dibayar: { label: "Sudah Dibayar", bg: "#DCFCE7", text: "#166534" },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || { label: status, bg: "#F1F5F9", text: "#475569" };
  return (
    <span style={{
      padding: "3px 10px", borderRadius: "9999px",
      fontSize: "11px", fontWeight: "600",
      background: s.bg, color: s.text,
    }}>
      {s.label}
    </span>
  );
}

export default function HutangPajakList() {
  const history = useHistory();
  const [error] = useState("");

  const [filterStatus, setFilterStatus] = useState("");
  const [filterBulan, setFilterBulan] = useState("");
  const [search, setSearch] = useState("");

  const { data: dashboardData } = useApi("hutang-pajak-dashboard", "/keuangan/hutang-pajak/dashboard");

  const params = new URLSearchParams();
  if (filterStatus) params.set("status", filterStatus);
  if (filterBulan) {
    const [tahun, bulan] = filterBulan.split("-");
    params.set("tahun", tahun);
    params.set("bulan", bulan);
  }
  if (search.trim()) params.set("q", search);
  const qs = params.toString();
  const { data: listData, isLoading } = useApi(
    ["hutang-pajak-list", filterStatus, filterBulan],
    "/keuangan/hutang-pajak" + (qs ? "?" + qs : "")
  );

  const dashboard = dashboardData?.data ?? null;
  const data = listData?.data ?? null;

  const filteredEntries = useMemo(() => {
    if (!data?.entries) return [];
    if (!search.trim()) return data.entries;
    const q = search.toLowerCase();
    return data.entries.filter(e =>
      (e.nama_wajib_pajak || "").toLowerCase().includes(q) ||
      (e.nomor_pokok_wajib_pajak || "").toLowerCase().includes(q) ||
      (e.nomor_pembayaran || "").toLowerCase().includes(q)
    );
  }, [data, search]);

  if (isLoading && !data) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8" }}>Memuat data hutang pajak...</div>;
  }
  if (error && !data) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#DC2626", fontSize: "13px" }}>{error}</div>;
  }
  if (!data) return null;

  const belum = filteredEntries.filter(e => e.status === "belum_dibayar");
  const sudah = filteredEntries.filter(e => e.status === "dibayar");

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>Hutang Pajak PPh 21</h1>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
          Tracking hutang PPh 21 yang dipotong dari honor Surveior/Verifikator/Rekomendator.
        </p>
      </div>

      {/* KPI */}
      {dashboard && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "16px" }}>
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "12px 16px" }}>
            <div style={{ fontSize: "10px", fontWeight: "600", color: "#64748B", textTransform: "uppercase" }}>Total Belum Dibayar</div>
            <div style={{ fontSize: "18px", fontWeight: "700", color: "#991B1B" }}>{formatRp(dashboard.total_belum_dibayar)}</div>
            <div style={{ fontSize: "11px", color: "#64748B" }}>{dashboard.jumlah_belum_dibayar} item</div>
          </div>
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "12px 16px" }}>
            <div style={{ fontSize: "10px", fontWeight: "600", color: "#64748B", textTransform: "uppercase" }}>Dibayar Bulan Ini</div>
            <div style={{ fontSize: "18px", fontWeight: "700", color: "#166534" }}>{formatRp(dashboard.total_dibayar_bulan_ini)}</div>
            <div style={{ fontSize: "11px", color: "#64748B" }}>{dashboard.jumlah_dibayar_bulan_ini} item</div>
          </div>
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "12px 16px" }}>
            <div style={{ fontSize: "10px", fontWeight: "600", color: "#64748B", textTransform: "uppercase" }}>Jumlah Item</div>
            <div style={{ fontSize: "18px", fontWeight: "700", color: "#1E293B" }}>{data.entries.length}</div>
          </div>
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "12px 16px" }}>
            <div style={{ fontSize: "10px", fontWeight: "600", color: "#64748B", textTransform: "uppercase" }}>Total Keseluruhan</div>
            <div style={{ fontSize: "18px", fontWeight: "700", color: "#1E293B" }}>{formatRp(dashboard.total_seluruh)}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ padding: "16px 20px", marginBottom: "16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "12px", alignItems: "end" }}>
          <div>
            <label className="form-label">Cari NPWP / Nama / No. Pembayaran</label>
            <input
              className="form-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Ketik untuk mencari..."
            />
          </div>
          <div>
            <label className="form-label">Status</label>
            <select className="form-input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Semua</option>
              <option value="belum_dibayar">Belum Dibayar</option>
              <option value="dibayar">Sudah Dibayar</option>
            </select>
          </div>
          <div>
            <label className="form-label">Periode Pemotongan</label>
            <input
              className="form-input"
              type="month"
              value={filterBulan}
              onChange={e => setFilterBulan(e.target.value)}
            />
          </div>
          {(filterStatus || filterBulan || search) && (
            <button
              className="btn btn-secondary"
              style={{ fontSize: "12px", padding: "8px 12px" }}
              onClick={() => { setFilterStatus(""); setFilterBulan(""); setSearch(""); }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Summary row */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
        <div style={{ background: "#FEF9C3", border: "1px solid #FDE68A", borderRadius: "6px", padding: "6px 12px", fontSize: "12px", color: "#854D0E" }}>
          <strong>{belum.length}</strong> belum dibayar · {formatRp(belum.reduce((s, e) => s + e.jumlah_pajak, 0))}
        </div>
        <div style={{ background: "#DCFCE7", border: "1px solid #BBF7D0", borderRadius: "6px", padding: "6px 12px", fontSize: "12px", color: "#166534" }}>
          <strong>{sudah.length}</strong> sudah dibayar · {formatRp(sudah.reduce((s, e) => s + e.jumlah_pajak, 0))}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container" style={{ border: "none", borderRadius: 0, maxHeight: "600px", overflowY: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>NPWP</th>
                <th>Nama Wajib Pajak</th>
                <th>No. Pembayaran Honor</th>
                <th>Tanggal Pemotongan</th>
                <th>DPP</th>
                <th style={{ textAlign: "right" }}>Tarif (%)</th>
                <th style={{ textAlign: "right" }}>PPh 21 (Rp)</th>
                <th>Jatuh Tempo</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", color: "#94A3B8", padding: "32px 16px" }}>
                    Tidak ada data hutang pajak.
                  </td>
                </tr>
              ) : filteredEntries.map(e => (
                <tr
                  key={e.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => history.push(`/admin/hutang-pajak/${e.id}`)}
                >
                  <td style={{ fontSize: "12px", fontFamily: "ui-monospace, monospace" }}>
                    {e.nomor_pokok_wajib_pajak || "—"}
                  </td>
                  <td style={{ fontSize: "13px", fontWeight: "500" }}>{e.nama_wajib_pajak || "—"}</td>
                  <td style={{ fontSize: "12px", fontFamily: "ui-monospace, monospace" }}>{e.nomor_pembayaran}</td>
                  <td style={{ fontSize: "12px" }}>{formatDate(e.tanggal_pembayaran_honor)}</td>
                  <td style={{ fontSize: "12px" }}>{formatRp(e.dpp)}</td>
                  <td style={{ textAlign: "right", fontSize: "12px", color: "#64748B" }}>{e.tarif_persen}%</td>
                  <td style={{ textAlign: "right", fontSize: "12px", fontWeight: "600", color: "#991B1B" }}>{formatRp(e.jumlah_pajak)}</td>
                  <td style={{ fontSize: "12px", color: "#64748B" }}>{formatDate(e.tanggal_jatuh_tempo)}</td>
                  <td><StatusBadge status={e.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
