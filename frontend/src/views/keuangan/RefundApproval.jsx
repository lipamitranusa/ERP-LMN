import React, { useState, useEffect } from "react";
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
  return res;
}

function formatRp(n) {
  return `Rp ${Number(n).toLocaleString("id-ID")}`;
}

const STATUS_MAP = {
  requested: { label: "Menunggu approval", color: "#FEF9C3", text: "#854D0E" },
  approved: { label: "Disetujui (siap eksekusi)", color: "#DBEAFE", text: "#1E40AF" },
  executed: { label: "Sudah dieksekusi", color: "#DCFCE7", text: "#166534" },
  rejected: { label: "Ditolak", color: "#FEE2E2", text: "#991B1B" },
};

export default function RefundApproval() {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [catatan, setCatatan] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function reload() {
    api("/refund/pending")
      .then(r => r?.json())
      .then(d => {
        setRefunds(d?.data || []);
        setLoading(false);
      });
  }

  useEffect(() => { reload(); }, []);

  async function handleAction(refundId, action) {
    setSubmitting(true);
    let res;
    if (action === "approve") {
      res = await api(`/refund/${refundId}/approve`, { method: "POST", body: JSON.stringify({ catatan }) });
    } else if (action === "reject") {
      if (!catatan.trim()) { alert("Alasan penolakan wajib diisi."); setSubmitting(false); return; }
      res = await api(`/refund/${refundId}/reject`, { method: "POST", body: JSON.stringify({ alasan: catatan }) });
    } else if (action === "execute") {
      if (!confirm("Eksekusi refund ini? Tindakan ini akan membuat Ledger Entry dan tidak dapat dibatalkan.")) {
        setSubmitting(false);
        return;
      }
      res = await api(`/refund/${refundId}/execute`, { method: "POST" });
    }
    if (res.ok) {
      setSelected(null);
      setCatatan("");
      reload();
    } else {
      const data = await res.json();
      alert(data.message || "Gagal.");
    }
    setSubmitting(false);
  }

  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8" }}>Memuat...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>Approval Refund</h1>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>Approval berjenjang untuk permintaan refund pembayaran Faskes (FR-2.8).</p>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Faskes</th>
                <th>Invoice</th>
                <th style={{ textAlign: "right" }}>Nominal</th>
                <th>Alasan</th>
                <th>Status</th>
                <th style={{ width: "140px" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {refunds.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: "center", color: "#94A3B8", padding: "48px 16px" }}>Tidak ada refund yang perlu diproses.</td></tr>
              ) : refunds.map(r => {
                const s = STATUS_MAP[r.status] || STATUS_MAP.requested;
                return (
                  <tr key={r.id}>
                    <td style={{ fontSize: "12px", color: "#475569" }}>{formatDate(r.created_at)}</td>
                    <td style={{ fontSize: "13px", color: "#334155", fontWeight: "500" }}>{r.invoice?.siklus?.faskes?.nama || "—"}</td>
                    <td style={{ fontSize: "12px", color: "#64748B" }}>{r.invoice?.nomor_invoice || "—"}</td>
                    <td style={{ textAlign: "right", fontWeight: "500" }}>{formatRp(r.nominal)}</td>
                    <td style={{ fontSize: "12px", color: "#475569", maxWidth: "240px" }}>{r.alasan}</td>
                    <td>
                      <span style={{ padding: "2px 8px", borderRadius: "9999px", fontSize: "11px", fontWeight: "600", background: s.color, color: s.text }}>
                        {s.label}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => setSelected(r)}>Detail</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={() => setSelected(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "8px", maxWidth: "480px", width: "100%", padding: "24px" }}>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "600", color: "#1E293B" }}>Detail Refund</h3>
            <div style={{ marginTop: "16px", padding: "12px", background: "#F8FAFC", borderRadius: "6px", fontSize: "12px", color: "#475569" }}>
              <div>Faskes: <strong>{selected.invoice?.siklus?.faskes?.nama || "—"}</strong></div>
              <div>Nominal: <strong>{formatRp(selected.nominal)}</strong></div>
              <div>Alasan: {selected.alasan}</div>
            </div>

            <div style={{ marginTop: "16px" }}>
              <label className="form-label">Catatan approval</label>
              <textarea
                className="form-input"
                rows="3"
                value={catatan}
                onChange={e => setCatatan(e.target.value)}
                placeholder="Catatan untuk approval / alasan penolakan..."
              />
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
              <button className="btn btn-secondary" onClick={() => setSelected(null)} style={{ flex: 1 }}>Batal</button>
              {selected.status === "requested" && (
                <>
                  <button className="btn btn-danger" onClick={() => handleAction(selected.id, "reject")} disabled={submitting}>Tolak</button>
                  <button className="btn btn-primary" onClick={() => handleAction(selected.id, "approve")} disabled={submitting}>Setujui</button>
                </>
              )}
              {selected.status === "approved" && (
                <button className="btn btn-primary" onClick={() => handleAction(selected.id, "execute")} disabled={submitting}>Eksekusi Sekarang</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
