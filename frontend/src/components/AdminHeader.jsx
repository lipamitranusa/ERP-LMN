import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useLembaga } from "@/contexts/LembagaContext";
import { useAuth } from "@/hooks/useAuth";

const LMNIcon = () => (
  <svg viewBox="0 0 36 36" width="28" height="28" fill="none">
    <circle cx="18" cy="18" r="15" stroke="#4CAF50" strokeWidth="3" strokeDasharray="22 73" strokeDashoffset="0" strokeLinecap="round"/>
    <path d="M18 11v14M12 18h12" stroke="#4CAF50" strokeWidth="3" strokeLinecap="round"/>
    <circle cx="18" cy="3.5" r="2" fill="#7E57C2"/>
    <circle cx="29.5" cy="9.5" r="2" fill="#EF5350"/>
    <circle cx="32" cy="20" r="2" fill="#FF9800"/>
    <circle cx="26" cy="30" r="2" fill="#FFEB3B"/>
    <circle cx="10" cy="30" r="2" fill="#42A5F5"/>
  </svg>
);

function AdminHeader() {
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [lembagaMenuOpen, setLembagaMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const lembagaMenuRef = useRef(null);
  // Subscribe ke useAuth agar re-render saat user data di-refresh oleh
  // fetchMe (penting untuk lembaga_ids yang mungkin baru ditambahkan admin)
  const { user: authUser } = useAuth();
  const user = authUser || JSON.parse(localStorage.getItem("user") || "{}");
  const { lembagaId, lembagaName, switchLembaga } = useLembaga();

  // Fetch daftar lembaga untuk selector. Filter di-frontend berdasarkan
  // akses lembaga user (user.lembaga_ids) — jika user hanya punya
  // akses 1 lembaga, dropdown cuma tampilkan 1 itu.
  // Fallback: jika user.lembaga_ids tidak ada (mis. legacy data), tampilkan
  // semua lembaga.
  const { data: lembagaList } = useQuery({
    queryKey: ["lembaga-list"],
    queryFn: () => api("/master/lembaga?per_page=100").then(r => r.data ?? []),
    enabled: lembagaMenuOpen,
  });
  const userLembagaIds = user.lembaga_ids;
  const allLembagas = lembagaList || [];
  const accessibleLembagas = Array.isArray(userLembagaIds) && userLembagaIds.length > 0
    ? allLembagas.filter(l => userLembagaIds.includes(l.id))
    : allLembagas;  // fallback untuk legacy user tanpa lembaga_ids
  // Jika lembaga aktif tidak ada di accessible (mis. user baru di-add
  // lembaga lain setelah login), tetap tampilkan dropdown dengan lembaga
  // aktif disorot + lembaga accessible lainnya.
  const displayLembagas = accessibleLembagas.length > 0
    ? accessibleLembagas
    : allLembagas;

  const selectedLembaga = allLembagas.find(l => l.id === lembagaId);
  // Fallback: gunakan nama dari context (jika list belum di-fetch)
  const displayName = selectedLembaga?.nama || lembagaName || "Lembaga";

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
      if (lembagaMenuRef.current && !lembagaMenuRef.current.contains(e.target)) {
        setLembagaMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSwitchLembaga = async (newId) => {
    setLembagaMenuOpen(false);
    const lembaga = displayLembagas.find(l => l.id === newId);
    try {
      await switchLembaga(newId, lembaga?.nama);
      window.location.reload();
    } catch {
      // error handled by context
    }
  };

  // Update sidebar user info
  useEffect(() => {
    const nameEl = document.getElementById("sidebar-user-name");
    const roleEl = document.getElementById("sidebar-user-role");
    if (nameEl) nameEl.textContent = user.nama || user.name || user.email || "—";
    if (roleEl) roleEl.textContent = user.role || "—";
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("menu_actions");
    // JANGAN hapus lembaga_id — simpan untuk auto-restore saat login ulang
    window.location.href = "/auth/login";
  };

  return (
    <header style={{
      position: "sticky",
      top: 0,
      zIndex: 50,
      background: "#FFFFFF",
      borderBottom: "1px solid #E2E8F0",
      height: "64px",
      display: "flex",
      alignItems: "center",
      paddingLeft: "32px",
      paddingRight: "32px",
    }}>
      {/* Breadcrumb / brand */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px" }}>
        {/* Mobile logo */}
        <Link to="/admin/dashboard" style={{ display: "none", alignItems: "center", gap: "6px", textDecoration: "none" }} className="mobile-logo">
          <LMNIcon />
          <span style={{ color: "#1E293B", fontSize: "14px", fontWeight: "700" }}>LMN</span>
        </Link>
      </div>

      {/* Right: notifications + user menu */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>

        {/* Lembaga selector */}
        {lembagaId && (
          <div ref={lembagaMenuRef} style={{ position: "relative" }}>
            <button
              className="btn btn-ghost"
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "6px 10px", borderRadius: "8px",
                color: "#334155", background: "#F0FDF4",
                border: "1px solid #BBF7D0",
                fontSize: "13px", maxWidth: "200px",
              }}
              onClick={() => setLembagaMenuOpen(v => !v)}
              title="Ganti Lembaga"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {displayName}
              </span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12" style={{ color: "#94A3B8", flexShrink: 0 }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {lembagaMenuOpen && (
              <div style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                right: 0,
                width: "220px",
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                overflow: "hidden",
                zIndex: 100,
              }}>
                <div style={{ padding: "8px 12px 6px", borderBottom: "1px solid #F1F5F9" }}>
                  <div style={{ fontSize: "11px", fontWeight: "600", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Pilih Lembaga
                  </div>
                </div>
                <div style={{ padding: "4px", maxHeight: "200px", overflowY: "auto" }}>
                  {displayLembagas.length === 0 ? (
                    <div style={{ padding: "12px", textAlign: "center", color: "#94A3B8", fontSize: "12px" }}>
                      Anda belum punya akses ke lembaga manapun.
                    </div>
                  ) : displayLembagas.map(l => (
                    <button
                      key={l.id}
                      onClick={() => handleSwitchLembaga(l.id)}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: "8px",
                        padding: "8px 10px", borderRadius: "6px",
                        fontSize: "13px", color: l.id === lembagaId ? "#16A34A" : "#334155",
                        background: l.id === lembagaId ? "#F0FDF4" : "transparent",
                        border: "none", cursor: "pointer", width: "100%", textAlign: "left",
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" style={{ marginTop: "2px", flexShrink: 0, color: l.id === lembagaId ? "#16A34A" : "#CBD5E1" }}>
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      </svg>
                      <div>
                        <div style={{ fontWeight: l.id === lembagaId ? "600" : "400" }}>{l.nama}</div>
                        {l.nama_pt && <div style={{ fontSize: "11px", color: "#94A3B8" }}>{l.nama_pt}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notification bell */}
        <button
          className="btn btn-ghost"
          style={{ width: "36px", height: "36px", padding: 0, borderRadius: "8px", color: "#64748B" }}
          title="Notifikasi"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </button>

        {/* User menu */}
        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            className="btn btn-ghost"
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "6px 8px", borderRadius: "8px",
              color: "#334155",
            }}
            onClick={() => setUserMenuOpen(v => !v)}
          >
            <div style={{
              width: "32px", height: "32px",
              borderRadius: "50%",
              background: "#E8F5E9",
              border: "1px solid #C8E6C9",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "13px", fontWeight: "500", color: "#1E293B", lineHeight: "1.2" }}>
                {user.nama || user.email?.split("@")[0] || "—"}
              </div>
              <div style={{ fontSize: "11px", color: "#64748B", lineHeight: "1.2" }}>
                {user.role || "—"}
              </div>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" style={{ color: "#94A3B8", marginLeft: "2px" }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {/* Dropdown */}
          {userMenuOpen && (
            <div style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              width: "220px",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
              overflow: "hidden",
              zIndex: 100,
            }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #F1F5F9" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#1E293B" }}>
                  {user.nama || "—"}
                </div>
                <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                  {user.email || "—"}
                </div>
              </div>
              <div style={{ padding: "6px" }}>
                <Link
                  to="/admin/profile"
                  style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", borderRadius: "6px", fontSize: "13px", color: "#334155", textDecoration: "none" }}
                  onClick={() => setUserMenuOpen(false)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                  Profil Saya
                </Link>
                <Link
                  to="/admin/settings"
                  style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", borderRadius: "6px", fontSize: "13px", color: "#334155", textDecoration: "none" }}
                  onClick={() => setUserMenuOpen(false)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                  Pengaturan
                </Link>
              </div>
              <div style={{ padding: "6px", borderTop: "1px solid #F1F5F9" }}>
                <button
                  onClick={handleLogout}
                  style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "8px 10px", borderRadius: "6px",
                    fontSize: "13px", color: "#DC2626",
                    background: "transparent", border: "none",
                    cursor: "pointer", width: "100%", textAlign: "left",
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Keluar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default AdminHeader;
