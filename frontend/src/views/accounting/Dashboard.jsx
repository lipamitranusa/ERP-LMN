import React, { useState, useEffect } from "react";

async function api(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/auth/login";
    return null;
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || `API error: ${res.status}`);
  return body;
}

function formatRp(n) {
  return `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
}

export default function AccountingDashboard() {
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/keuangan/accounting/dashboard")
      .then(d => { setDash(d?.data || null); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8" }}>Memuat dasbor akuntansi...</div>;
  }

  const b = dash?.bulan_ini || {};

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>Dasbor Akuntansi</h1>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
          Ringkasan posisi keuangan — {dash?.tanggal_snapshot}
        </p>
      </div>

      {/* KPI Row 1 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "16px" }}>
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "16px 20px" }}>
          <div style={{ fontSize: "11px", fontWeight: "600", color: "#64748B", textTransform: "uppercase", marginBottom: "4px" }}>Saldo Kas &amp; Bank</div>
          <div style={{ fontSize: "22px", fontWeight: "700", color: "#1E293B" }}>{formatRp(b.saldo_kas_bank)}</div>
          <div style={{ fontSize: "11px", color: "#64748B", marginTop: "4px" }}>Aset lancar</div>
        </div>
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "16px 20px" }}>
          <div style={{ fontSize: "11px", fontWeight: "600", color: "#64748B", textTransform: "uppercase", marginBottom: "4px" }}>Pendapatan Bulan Ini</div>
          <div style={{ fontSize: "22px", fontWeight: "700", color: "#166534" }}>{formatRp(b.total_pendapatan)}</div>
          <div style={{ fontSize: "11px", color: "#64748B", marginTop: "4px" }}>Bulan berjalan</div>
        </div>
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "16px 20px" }}>
          <div style={{ fontSize: "11px", fontWeight: "600", color: "#64748B", textTransform: "uppercase", marginBottom: "4px" }}>Beban Bulan Ini</div>
          <div style={{ fontSize: "22px", fontWeight: "700", color: "#991B1B" }}>{formatRp(b.total_beban)}</div>
          <div style={{ fontSize: "11px", color: "#64748B", marginTop: "4px" }}>Bulan berjalan</div>
        </div>
        <div style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "8px",
          padding: "16px 20px",
          borderColor: (b.laba_rugi_bulan ?? 0) >= 0 ? "#BBF7D0" : "#FECACA",
        }}>
          <div style={{ fontSize: "11px", fontWeight: "600", color: "#64748B", textTransform: "uppercase", marginBottom: "4px" }}>Laba / (Rugi)</div>
          <div style={{ fontSize: "22px", fontWeight: "700", color: (b.laba_rugi_bulan ?? 0) >= 0 ? "#166534" : "#991B1B" }}>
            {formatRp(b.laba_rugi_bulan)}
          </div>
          <div style={{ fontSize: "11px", color: "#64748B", marginTop: "4px" }}>Bulan berjalan</div>
        </div>
      </div>

      {/* KPI Row 2 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "16px" }}>
        <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "14px 20px" }}>
          <div style={{ fontSize: "11px", fontWeight: "600", color: "#64748B", textTransform: "uppercase", marginBottom: "4px" }}>Akun Perkiraan (COA)</div>
          <div style={{ fontSize: "20px", fontWeight: "700", color: "#475569" }}>{dash?.jumlah_coa ?? 0}</div>
          <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "4px" }}>Akun aktif</div>
        </div>
        <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "14px 20px" }}>
          <div style={{ fontSize: "11px", fontWeight: "600", color: "#64748B", textTransform: "uppercase", marginBottom: "4px" }}>Jurnal Bulan Ini</div>
          <div style={{ fontSize: "20px", fontWeight: "700", color: "#475569" }}>{b.jumlah_jurnal ?? 0}</div>
          <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "4px" }}>Transaksi</div>
        </div>
        <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "14px 20px" }}>
          <div style={{ fontSize: "11px", fontWeight: "600", color: "#64748B", textTransform: "uppercase", marginBottom: "4px" }}>Total Debit / Kredit</div>
          <div style={{ fontSize: "14px", fontWeight: "600", color: "#475569" }}>D: {formatRp(b.total_debit)}</div>
          <div style={{ fontSize: "14px", fontWeight: "600", color: "#475569" }}>K: {formatRp(b.total_kredit)}</div>
          <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "4px" }}>Bulan berjalan</div>
        </div>
      </div>

      {/* Quick info */}
      <div className="card" style={{ padding: "20px" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>Navigasi Modul Akuntansi</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
          {[
            { label: "Chart of Accounts", desc: "Master akun perkiraan", path: "/admin/accounting/coa" },
            { label: "Kategori Jurnal", desc: "Jenis transaksi jurnal", path: "/admin/accounting/kategori-jurnal" },
            { label: "Jurnal Umum", desc: "Input transaksi non-survei", path: "/admin/accounting/jurnal" },
            { label: "Buku Besar", desc: "Saldo & mutasi per akun", path: "/admin/accounting/buku-besar" },
          ].map((item, i) => (
            <div key={i} onClick={() => { window.location.href = item.path; }} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "12px", cursor: "pointer", transition: "border-color 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#2563EB"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "#E2E8F0"}>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#334155" }}>{item.label}</div>
              <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
