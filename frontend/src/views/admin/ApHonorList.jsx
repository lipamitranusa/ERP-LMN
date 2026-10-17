import React, { useState, useMemo } from "react";
import { useHistory } from "react-router-dom";
import { formatDate } from "../../utils/dateFormat";
import { useApi } from "@/hooks/useApi";

function formatRp(n) {
  return `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
}

const PERAN_LABEL = {
  ap_honor_surveior: "Surveior",
  ap_honor_verifikator: "Verifikator",
  ap_honor_rekomendator: "Rekomendator",
};

export default function ApHonorList() {
  const history = useHistory();
  const [filterPeran, setFilterPeran] = useState("");
  const [filterPenerima, setFilterPenerima] = useState("");
  const [filterBulan, setFilterBulan] = useState("");
  const [search, setSearch] = useState("");

  // Selected entries (by ledger entry id)
  const [selectedIds, setSelectedIds] = useState(new Set());

  const params = new URLSearchParams();
  if (filterPeran) params.set("peran", filterPeran);
  if (filterPenerima) params.set("penerima_id", filterPenerima);
  if (filterBulan) {
    const [tahun, bulan] = filterBulan.split("-");
    params.set("tahun", tahun);
    params.set("bulan", bulan);
  }
  const qs = params.toString();

  const { data, isLoading, error } = useApi(
    ["ap-honor-outstanding", filterPeran, filterPenerima, filterBulan],
    `/keuangan/ap-honor/outstanding${qs ? "?" + qs : ""}`
  );

  const filteredEntries = useMemo(() => {
    if (!data?.data?.entries) return [];
    let list = data.data.entries;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        (e.penerima?.nama || "").toLowerCase().includes(q) ||
        (e.penerima?.nomor_induk_surveior || "").toLowerCase().includes(q) ||
        (e.siklus?.faskes_nama || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, search]);

  const selectedEntries = useMemo(() => {
    return filteredEntries.filter(e => selectedIds.has(e.id));
  }, [filteredEntries, selectedIds]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredEntries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEntries.map(e => e.id)));
    }
  };

  const handleBayar = () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds).join(",");
    history.push(`/admin/ap-honor/bayar?ids=${ids}`);
  };

  if (isLoading && !data) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8" }}>Memuat data honor outstanding...</div>;
  }
  if (error) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#DC2626", fontSize: "13px" }}>{error.message}</div>;
  }
  if (!data) return null;

  const { ringkasan, per_penerima } = data.data;
  const allChecked = filteredEntries.length > 0 && selectedIds.size === filteredEntries.length;
  const selectedTotal = selectedEntries.reduce((s, e) => s + (e.nominal_neto || 0), 0);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>Pembayaran Honor TA</h1>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
          Pilih honor yang akan dibayar, lalu klik "Bayar Honor" untuk membuat pembayaran.
        </p>
      </div>

      {/* Summary bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "16px" }}>
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "12px 16px" }}>
          <div style={{ fontSize: "10px", fontWeight: "600", color: "#64748B", textTransform: "uppercase" }}>Total honor</div>
          <div style={{ fontSize: "18px", fontWeight: "700", color: "#1E293B" }}>{ringkasan.jumlah_honor}</div>
        </div>
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "12px 16px" }}>
          <div style={{ fontSize: "10px", fontWeight: "600", color: "#64748B", textTransform: "uppercase" }}>Penerima</div>
          <div style={{ fontSize: "18px", fontWeight: "700", color: "#1E293B" }}>{ringkasan.jumlah_penerima}</div>
        </div>
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "12px 16px" }}>
          <div style={{ fontSize: "10px", fontWeight: "600", color: "#64748B", textTransform: "uppercase" }}>Total neto outstanding</div>
          <div style={{ fontSize: "18px", fontWeight: "700", color: "#991B1B" }}>{formatRp(ringkasan.total_neto)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: "16px 20px", marginBottom: "16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: "12px", alignItems: "end" }}>
          <div>
            <label className="form-label">Cari nama / NS / Faskes</label>
            <input
              className="form-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Ketik untuk mencari..."
            />
          </div>
          <div>
            <label className="form-label">Peran</label>
            <select className="form-input" value={filterPeran} onChange={e => setFilterPeran(e.target.value)}>
              <option value="">Semua</option>
              <option value="surveior">Surveior</option>
              <option value="verifikator">Verifikator</option>
              <option value="rekomendator">Rekomendator</option>
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
          <div>
            <label className="form-label">Penerima</label>
            <select
              className="form-input"
              value={filterPenerima}
              onChange={e => setFilterPenerima(e.target.value)}
            >
              <option value="">Semua</option>
              {per_penerima.map(p => (
                <option key={p.tenaga_ahli_id} value={p.tenaga_ahli_id}>
                  {p.nama}
                </option>
              ))}
            </select>
          </div>
          {(filterPeran || filterBulan || filterPenerima || search) && (
            <button
              className="btn btn-secondary"
              style={{ fontSize: "12px", padding: "8px 12px" }}
              onClick={() => { setFilterPeran(""); setFilterBulan(""); setFilterPenerima(""); setSearch(""); }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Selection bar */}
      <div style={{
        background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: "8px",
        padding: "10px 16px", marginBottom: "12px", display: "flex",
        alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: "13px", color: "#0C4A6E" }}>
          <strong>{selectedIds.size}</strong> honor dipilih · Total: <strong>{formatRp(selectedTotal)}</strong>
        </span>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className="btn btn-secondary"
            style={{ fontSize: "12px", padding: "6px 12px" }}
            onClick={() => setSelectedIds(new Set())}
            disabled={selectedIds.size === 0}
          >
            Batal Pilih
          </button>
          <button
            className="btn btn-primary"
            style={{ fontSize: "12px", padding: "6px 16px" }}
            onClick={handleBayar}
            disabled={selectedIds.size === 0}
          >
            Bayar Honor ({selectedIds.size})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container" style={{ border: "none", borderRadius: 0, maxHeight: "600px", overflowY: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: "40px" }}>
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleSelectAll}
                    style={{ cursor: "pointer" }}
                  />
                </th>
                <th>Penerima</th>
                <th>Peran</th>
                <th>Faskes</th>
                <th>Tanggal Honor</th>
                <th style={{ textAlign: "right" }}>Gross</th>
                <th style={{ textAlign: "right" }}>DPP (50%)</th>
                <th style={{ textAlign: "right" }}>PPh 21</th>
                <th style={{ textAlign: "right" }}>Net</th>
                <th style={{ textAlign: "center" }}>Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: "center", color: "#94A3B8", padding: "32px 16px" }}>
                    Tidak ada honor outstanding yang cocok dengan filter.
                  </td>
                </tr>
              ) : filteredEntries.map(e => (
                <tr
                  key={e.id}
                  style={{ background: selectedIds.has(e.id) ? "#F0F9FF" : "", cursor: "pointer" }}
                  onClick={() => toggleSelect(e.id)}
                >
                  <td onClick={ev => ev.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(e.id)}
                      onChange={() => toggleSelect(e.id)}
                      style={{ cursor: "pointer" }}
                    />
                  </td>
                  <td>
                    <div style={{ fontSize: "13px", fontWeight: "500", color: "#334155" }}>{e.penerima?.nama || "—"}</div>
                    <div style={{ fontSize: "11px", color: "#94A3B8" }}>{e.penerima?.nomor_induk_surveior}</div>
                  </td>
                  <td style={{ fontSize: "12px", color: "#475569" }}>{PERAN_LABEL[e.tipe] || e.tipe}</td>
                  <td style={{ fontSize: "12px", color: "#475569" }}>{e.siklus?.faskes_nama || "—"}</td>
                  <td style={{ fontSize: "12px", color: "#475569" }}>{formatDate(e.tanggal_honor)}</td>
                  <td style={{ textAlign: "right", fontSize: "12px" }}>{formatRp(e.nominal_bruto)}</td>
                  <td style={{ textAlign: "right", fontSize: "12px", color: "#64748B" }}>{formatRp(e.dpp)}</td>
                  <td style={{ textAlign: "right", fontSize: "12px", color: "#64748B" }}>{formatRp(e.potongan_pph)}</td>
                  <td style={{ textAlign: "right", fontSize: "12px", fontWeight: "600", color: "#991B1B" }}>{formatRp(e.nominal_neto)}</td>
                  <td style={{ textAlign: "center" }}>
                    <span style={{
                      padding: "2px 8px", borderRadius: "9999px",
                      fontSize: "11px", fontWeight: "600",
                      background: e.hari_outstanding > 90 ? "#FEE2E2" : e.hari_outstanding > 30 ? "#FEF9C3" : "#DCFCE7",
                      color: e.hari_outstanding > 90 ? "#991B1B" : e.hari_outstanding > 30 ? "#854D0E" : "#166534",
                    }}>
                      {e.hari_outstanding} hari
                    </span>
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