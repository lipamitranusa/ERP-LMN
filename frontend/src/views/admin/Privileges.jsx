import React, { useState, useEffect } from "react";
import { useApi, useMutateKeys } from "@/hooks/useApi";

const ACTION_COLORS = {
  Lihat: { bg: "#DBEAFE", text: "#1E40AF" },
  Tambah: { bg: "#D1FAE5", text: "#065F46" },
  Ubah: { bg: "#FEF3C7", text: "#92400E" },
  Hapus: { bg: "#FEE2E2", text: "#991B1B" },
  Setujui: { bg: "#EDE9F6", text: "#5E35B1" },
  Ekspor: { bg: "#E0F2FE", text: "#0369A1" },
  Final: { bg: "#FFEDD5", text: "#9A3412" },
};

function ActionBadge({ action }) {
  const c = ACTION_COLORS[action] || { bg: "#F1F5F9", text: "#475569" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "1px 6px", borderRadius: "9999px",
      fontSize: "10px", fontWeight: "600",
      background: c.bg, color: c.text,
    }}>
      {action}
    </span>
  );
}

export default function Privileges() {
  // Local edits: { [roleId]: { [actionId]: true|false } }
  const [edits, setEdits] = useState({});
  const [dirtyRoles, setDirtyRoles] = useState(new Set());
  const [saving, setSaving] = useState(false);

  const { data, isLoading, error, refetch } = useApi("privilege-matrix", "/admin/privilege-matrix");
  const mutate = useMutateKeys(["privilege-matrix"]);

  // Reset edits when data refetches after mutation
  useEffect(() => {
    if (data) {
      setEdits({});
      setDirtyRoles(new Set());
    }
  }, [data]);

  const errMsg = error ? error.message : "";

  function hasPrivilege(roleId, actionId) {
    if (edits[roleId] && Object.prototype.hasOwnProperty.call(edits[roleId], actionId)) {
      return edits[roleId][actionId];
    }
    return !!(data?.privilege_map?.[roleId]?.[actionId]);
  }

  function toggle(roleId, actionId) {
    setEdits(prev => ({
      ...prev,
      [roleId]: {
        ...(prev[roleId] || {}),
        [actionId]: !hasPrivilege(roleId, actionId),
      },
    }));
    setDirtyRoles(prev => new Set([...prev, roleId]));
  }

  async function saveRole(roleId) {
    if (!data) return;
    setSaving(true);
    try {
      const rolePrivileges = (data.modules || [])
        .flatMap(mod => mod.actions || [])
        .map(a => ({
          menu_action_id: a.id,
          diizinkan: hasPrivilege(roleId, a.id),
        }));

      await mutate.mutateAsync({
        path: `/admin/roles/${roleId}/privileges`,
        method: "PUT",
        body: { privileges: rolePrivileges },
      });
      setDirtyRoles(prev => {
        const next = new Set(prev);
        next.delete(roleId);
        return next;
      });
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveAll() {
    if (!data) return;
    setSaving(true);
    try {
      for (const roleId of dirtyRoles) {
        const rolePrivileges = (data.modules || [])
          .flatMap(mod => mod.actions || [])
          .map(a => ({
            menu_action_id: a.id,
            diizinkan: hasPrivilege(roleId, a.id),
          }));

        await mutate.mutateAsync({
          path: `/admin/roles/${roleId}/privileges`,
          method: "PUT",
          body: { privileges: rolePrivileges },
        });
      }
      setDirtyRoles(new Set());
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return <div style={{ textAlign: "center", color: "#94A3B8", padding: "64px 16px" }}>Memuat matriks privilege...</div>;
  }
  if (errMsg) {
    return (
      <div style={{ textAlign: "center", padding: "64px 16px" }}>
        <div style={{ color: "#DC2626", fontSize: "13px", marginBottom: "16px" }}>{errMsg}</div>
        <button className="btn btn-secondary" onClick={() => refetch()}>Coba lagi</button>
      </div>
    );
  }
  if (!data) return null;

  const { roles = [], modules = [], privilege_map = {} } = data;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>Matriks Privilege</h1>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
            {roles.length} role × {(modules || []).reduce((s, m) => s + (m.actions?.length || 0), 0)} action — ubah dengan klik sel pada matriks.
          </p>
        </div>
        {dirtyRoles.size > 0 && (
          <button className="btn btn-primary" onClick={saveAll} disabled={saving}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
            </svg>
            Simpan {dirtyRoles.size} perubahan
          </button>
        )}
      </div>

      {/* Matrix */}
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="data-table" style={{ minWidth: "700px", whiteSpace: "nowrap" }}>
          <thead>
            <tr>
              <th style={{ minWidth: "220px", position: "sticky", left: 0, background: "#F8FAFC", zIndex: 2, borderRight: "1px solid #E2E8F0" }}>
                Modul / Action
              </th>
              {roles.map(r => (
                <th key={r.id} style={{ minWidth: "110px", textAlign: "center", background: "#F8FAFC" }}>
                  <div style={{ fontWeight: "600", color: "#1E293B", fontSize: "12px" }}>{r.nama_role}</div>
                  {r.is_default ? (
                    <div style={{ fontSize: "10px", color: "#94A3B8", fontWeight: "400" }}>default</div>
                  ) : (
                    <div style={{ fontSize: "10px", color: "#7E57C2", fontWeight: "400" }}>kustom</div>
                  )}
                  {dirtyRoles.has(r.id) && (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: "10px", padding: "2px 6px", color: "#4CAF50", marginTop: "2px" }}
                      onClick={() => saveRole(r.id)}
                      disabled={saving}
                    >
                      Simpan
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(modules || []).map(mod => (
              <React.Fragment key={mod.modul}>
                {/* Module header row */}
                <tr style={{ background: "#F1F5F9" }}>
                  <td colSpan={roles.length + 1} style={{ padding: "6px 12px", fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                    {mod.modul}
                  </td>
                </tr>
                {/* Action rows */}
                {(mod.actions || []).map((act, j) => (
                  <tr key={act.id} style={{ background: j % 2 === 0 ? "#FFFFFF" : "#FAFAFA" }}>
                    <td style={{ paddingLeft: "24px", color: "#334155", fontSize: "12px", position: "sticky", left: 0, background: j % 2 === 0 ? "#FFFFFF" : "#FAFAFA", zIndex: 1 }}>
                      <ActionBadge action={act.action} />
                    </td>
                    {roles.map(r => (
                      <td key={r.id} style={{ textAlign: "center" }}>
                        <button
                          onClick={() => toggle(r.id, act.id)}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            padding: "4px", borderRadius: "4px",
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            transition: "background 0.15s",
                          }}
                          title={`${r.nama_role} — ${mod.modul} / ${act.action}`}
                        >
                          {hasPrivilege(r.id, act.id) ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          )}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: "20px", marginTop: "16px", fontSize: "12px", color: "#94A3B8" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span>Dijinkan</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          <span>Tidak diizinkan</span>
        </div>
        <div style={{ color: "#94A3B8" }}>· Klik sel untuk toggle. Default role tidak bisa dihapus.</div>
      </div>
    </div>
  );
}
