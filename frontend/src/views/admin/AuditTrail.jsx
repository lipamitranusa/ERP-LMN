import React, { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { formatDateTime } from "../../utils/dateFormat";

const actionColors = {
  create:   { bg: "#E8F5E9", color: "#166534", label: "Tambah" },
  read:     { bg: "#DBEAFE", color: "#1E40AF", label: "Lihat" },
  update:   { bg: "#FEF9C3", color: "#854D0E", label: "Ubah" },
  delete:   { bg: "#FEE2E2", color: "#991B1B", label: "Hapus" },
  approve:  { bg: "#EDE9F6", color: "#5E35B1", label: "Setujui" },
  export:   { bg: "#FFF3E0", color: "#E65100", label: "Ekspor" },
  finalize: { bg: "#F1F5F9", color: "#475569", label: "Final" },
};

function AuditTrail() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 20;

  const { data, isLoading } = useApi("audit-trail", "/admin/audit-trail");
  const logs = Array.isArray(data) ? data : data?.data || [];

  const filtered = logs.filter(l => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      (l.user?.nama || "").toLowerCase().includes(q) ||
      (l.action || "").toLowerCase().includes(q) ||
      (l.module || "").toLowerCase().includes(q) ||
      (l.description || "").toLowerCase().includes(q)
    );
  });

  const paginated = filtered.slice(0, page * perPage);
  const hasMore = filtered.length > paginated.length;

  function getActionStyle(action) {
    const key = (action || "").toLowerCase();
    for (const [k, v] of Object.entries(actionColors)) {
      if (key.includes(k)) return v;
    }
    return { bg: "#F1F5F9", color: "#475569", label: action || "—" };
  }

  function timeAgo(dateStr) {
    if (!dateStr) return "—";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Baru saja";
    if (mins < 60) return `${mins} menit lalu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} jam lalu`;
    const days = Math.floor(hours / 24);
    return `${days} hari lalu`;
  }

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>Audit Trail</h1>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>{logs.length} aktivitas tercatat</p>
      </div>

      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: "320px" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            className="form-input"
            placeholder="Cari user, modul, atau aktivitas..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: "38px" }}
          />
        </div>
        <span style={{ fontSize: "13px", color: "#94A3B8" }}>{filtered.length} hasil</span>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: "130px" }}>Waktu</th>
                <th style={{ width: "140px" }}>User</th>
                <th style={{ width: "100px" }}>Aksi</th>
                <th>Modul</th>
                <th>Deskripsi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="5" style={{ textAlign: "center", color: "#94A3B8", padding: "48px 16px" }}>Memuat...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: "center", color: "#94A3B8", padding: "48px 16px" }}>
                  {search ? "Tidak ada hasil" : "Belum ada aktivitas tercatat"}
                </td></tr>
              ) : paginated.map(log => {
                const actionStyle = getActionStyle(log.action);
                return (
                  <tr key={log.id}>
                    <td style={{ fontSize: "12px", whiteSpace: "nowrap" }}>
                      <div style={{ fontWeight: "500", color: "#334155" }}>{timeAgo(log.created_at)}</div>
                      <div style={{ fontSize: "11px", color: "#94A3B8" }}>
                        {log.created_at ? formatDateTime(log.created_at) : "—"}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#E8F5E9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                          </svg>
                        </div>
                        <span style={{ fontSize: "13px", fontWeight: "500", color: "#334155" }}>{log.user?.nama || "—"}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ padding: "2px 8px", borderRadius: "9999px", fontSize: "11px", fontWeight: "600", background: actionStyle.bg, color: actionStyle.color }}>
                        {actionStyle.label}
                      </span>
                    </td>
                    <td style={{ color: "#64748B", fontSize: "13px" }}>{log.module || "—"}</td>
                    <td style={{ color: "#475569", fontSize: "13px" }}>{log.description || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {hasMore && (
          <div style={{ padding: "16px 20px", textAlign: "center", borderTop: "1px solid #F1F5F9" }}>
            <button className="btn btn-secondary" onClick={() => setPage(p => p + 1)}>Muat lebih banyak</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AuditTrail;
