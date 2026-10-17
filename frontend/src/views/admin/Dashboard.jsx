import React from "react";
import { Link } from "react-router-dom";
import { formatDate } from "../../utils/dateFormat";
import { useApi } from "@/hooks/useApi";
import { SkeletonStatCards, SkeletonTable } from "@/components/Skeleton";

const LMNIcon = () => (
  <svg viewBox="0 0 36 36" width="32" height="32" fill="none">
    <circle cx="18" cy="18" r="15" stroke="#4CAF50" strokeWidth="3" strokeDasharray="22 73" strokeDashoffset="0" strokeLinecap="round"/>
    <path d="M18 11v14M12 18h12" stroke="#4CAF50" strokeWidth="3" strokeLinecap="round"/>
    <circle cx="18" cy="3.5" r="2" fill="#7E57C2"/>
    <circle cx="29.5" cy="9.5" r="2" fill="#EF5350"/>
    <circle cx="32" cy="20" r="2" fill="#FF9800"/>
    <circle cx="26" cy="30" r="2" fill="#FFEB3B"/>
    <circle cx="10" cy="30" r="2" fill="#42A5F5"/>
  </svg>
);

function StatusBadge({ status }) {
  const map = {
    menunggu: ["Menunggu", "warning"],
    menunggu_dokumen: ["Menunggu Dokumen", "warning"],
    menunggu_persetujuan: ["Menunggu Persetujuan", "warning"],
    menunggu_tindakan: ["Menunggu Tindakan", "warning"],
    aktifasi_akun: ["Aktifasi Akun", "warning"],
    lengkap: ["Lengkap", "success"],
    aktif: ["Aktif", "success"],
    selesai: ["Selesai", "success"],
    disetujui: ["Disetujui", "success"],
    final: ["Final", "success"],
    dibatalkan: ["Dibatalkan", "danger"],
    ditolak: ["Ditolak", "danger"],
    draft: ["Draft", "secondary"],
    terkirim: ["Terkirim", "info"],
    info: ["Info", "info"],
  };
  const [label, color] = map[status] || [status, "secondary"];
  return <span className={`status-badge status-${color}`}>{label}</span>;
}

function StatCard({ label, value, trend, trendDirection, iconColor, iconBg, icon }) {
  return (
    <div className="stat-card">
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "12px", color: "#64748B", fontWeight: "500", marginBottom: "6px" }}>
          {label}
        </div>
        <div style={{ fontSize: "26px", fontWeight: "700", color: "#1E293B", lineHeight: "1", marginBottom: "8px" }}>
          {value}
        </div>
        {trend && (
          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: trendDirection === "up" ? "#16A34A" : "#DC2626" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
              {trendDirection === "up"
                ? <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>
                : <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>
              }
            </svg>
            {trend}
          </div>
        )}
      </div>
      <div style={{
        width: "44px", height: "44px",
        borderRadius: "10px",
        background: iconBg,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <svg viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
          {icon}
        </svg>
      </div>
    </div>
  );
}

function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const { data, isLoading } = useApi("dashboard-prefetch", "/admin/dashboard");

  const stats = {
    siklus_total: data?.stats?.total_siklus ?? 0,
    siklus_aktif: data?.stats?.aktif_sekarang ?? 0,
    verif_done: data?.stats?.terverifikasi ?? 0,
    pending_review: data?.stats?.pending_review ?? 0,
  };
  const recentSiklus = data?.recent_siklus ?? [];
  const recentPenugasan = data?.penugasan_aktif ?? [];

  const hasData = !isLoading && !!data;

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
          <LMNIcon />
          <div>
            <h1 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#1E293B" }}>
              Dashboard
            </h1>
            <p style={{ margin: 0, fontSize: "13px", color: "#64748B" }}>
              Selamat datang, <strong style={{ color: "#334155", fontWeight: "500" }}>{user.nama || user.email?.split("@")[0] || "—"}</strong>
              <span style={{ marginLeft: "6px", padding: "2px 8px", background: "#E8F5E9", color: "#2E7D32", borderRadius: "9999px", fontSize: "11px", fontWeight: "600" }}>
                {user.role || "—"}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Stat cards — skeleton saat load, konten saat data siap */}
      {isLoading ? (
        <SkeletonStatCards />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "28px" }}>
          <StatCard
            label="Total Siklus"
            value={stats.siklus_total}
            trend="Semua waktu"
            trendDirection="up"
            iconColor="#4CAF50"
            iconBg="#E8F5E9"
            icon={<><path d="M3 3h7v7H3z"/><path d="M14 3h7v7h-7z"/><path d="M3 14h7v7H3z"/><path d="M14 14h7v7h-7z"/></>}
          />
          <StatCard
            label="Aktif Sekarang"
            value={stats.siklus_aktif}
            trend="Sedang berlangsung"
            trendDirection="up"
            iconColor="#2563EB"
            iconBg="#DBEAFE"
            icon={<><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></>}
          />
          <StatCard
            label="Terverifikasi"
            value={stats.verif_done}
            trend="—"
            iconColor="#7E57C2"
            iconBg="#EDE9F6"
            icon={<><polyline points="20 6 9 17 4 12"/></>}
          />
          <StatCard
            label="Pending Review"
            value={stats.pending_review}
            trend="Memerlukan perhatian"
            trendDirection="down"
            iconColor="#F59E0B"
            iconBg="#FEF9C3"
            icon={<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>}
          />
        </div>
      )}

      {/* Two-column: Siklus + Penugasan — working pages use dense table */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* Siklus terbaru */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>Siklus Terbaru</h2>
            <Link to="/admin/pendaftaran" className="btn btn-ghost btn-sm" style={{ color: "#4CAF50", fontSize: "12px" }}>
              Lihat semua
            </Link>
          </div>
          <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Faskes</th>
                  <th>Status</th>
                  <th>Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <SkeletonTable rows={5} cols={3} />
                ) : recentSiklus.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: "center", color: "#94A3B8", padding: "32px 16px", fontSize: "13px" }}>
                      Belum ada siklus
                    </td>
                  </tr>
                ) : (
                  recentSiklus.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: "500", color: "#1E293B" }}>
                        {s.faskes?.nama || s.faskes_id || "—"}
                      </td>
                      <td><StatusBadge status={s.status_kelengkapan || s.status} /></td>
                      <td style={{ color: "#64748B", fontSize: "12px" }}>
                        {formatDate(s.tanggal_pengajuan)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Penugasan aktif */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>Penugasan Aktif</h2>
            <Link to="/admin/penugasan" className="btn btn-ghost btn-sm" style={{ color: "#4CAF50", fontSize: "12px" }}>
              Lihat semua
            </Link>
          </div>
          <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Faskes</th>
                  <th>Jenis</th>
                  <th>Tenaga Ahli</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <SkeletonTable rows={5} cols={4} />
                ) : recentPenugasan.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center", color: "#94A3B8", padding: "32px 16px", fontSize: "13px" }}>
                      Belum ada penugasan aktif
                    </td>
                  </tr>
                ) : (
                  recentPenugasan.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: "500", color: "#1E293B", fontSize: "13px" }}>
                        {p.faskes || "—"}
                      </td>
                      <td>
                        <span style={{
                          padding: "2px 8px",
                          borderRadius: "9999px",
                          fontSize: "11px",
                          fontWeight: "600",
                          background: p.jenis === "survei" ? "#DBEAFE" : "#E8F5E9",
                          color: p.jenis === "survei" ? "#1E40AF" : "#166534",
                        }}>
                          {p.jenis}
                        </span>
                      </td>
                      <td style={{ color: "#334155", fontSize: "13px" }}>
                        {p.nama_tenaga_ahli || "—"}
                      </td>
                      <td><StatusBadge status={p.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
