import React, { useState, useEffect } from "react";
import { useApi, useMutateKeys } from "@/hooks/useApi";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";

const ACTION_COLORS = {
  Lihat:    { light: "bg-blue-50 text-blue-700", dark: "dark:bg-blue-900/40 dark:text-blue-300" },
  Tambah:   { light: "bg-green-50 text-green-700", dark: "dark:bg-green-900/40 dark:text-green-300" },
  Ubah:     { light: "bg-amber-50 text-amber-700", dark: "dark:bg-amber-900/40 dark:text-amber-300" },
  Hapus:    { light: "bg-red-50 text-red-700", dark: "dark:bg-red-900/40 dark:text-red-300" },
  Setujui:  { light: "bg-purple-50 text-purple-700", dark: "dark:bg-purple-900/40 dark:text-purple-300" },
  Ekspor:   { light: "bg-cyan-50 text-cyan-700", dark: "dark:bg-cyan-900/40 dark:text-cyan-300" },
  Final:    { light: "bg-orange-50 text-orange-700", dark: "dark:bg-orange-900/40 dark:text-orange-300" },
};

function ActionBadge({ action }) {
  const c = ACTION_COLORS[action] || { light: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 dark:text-slate-500", dark: "dark:bg-slate-800 dark:text-slate-300 dark:text-slate-500" };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${c.light} ${c.dark}`}>
      {action}
    </span>
  );
}

export default function Privileges() {
  const [edits, setEdits] = useState({});
  const [dirtyRoles, setDirtyRoles] = useState(new Set());
  const [saving, setSaving] = useState(false);

  const { data, isLoading, error, refetch } = useApi("privilege-matrix", "/admin/privilege-matrix");
  const mutate = useMutateKeys(["privilege-matrix"]);

  useEffect(() => {
    if (data) {
      setEdits({});
      setDirtyRoles(new Set());
    }
  }, [data]);

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
    return (
      <div className="space-y-5">
        <PageHeader title="Matriks Privilege" subtitle="Memuat..." />
        <div className="text-center py-16 text-slate-400 dark:text-slate-500">Memuat matriks privilege...</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="space-y-5">
        <PageHeader title="Matriks Privilege" />
        <div className="text-center py-16">
          <p className="text-red-600 text-sm mb-4">{error.message}</p>
          <Button variant="outline" onClick={() => refetch()}>Coba lagi</Button>
        </div>
      </div>
    );
  }
  if (!data) return null;

  const { roles = [], modules = [] } = data;
  const totalActions = modules.reduce((s, m) => s + (m.actions?.length || 0), 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Matriks Privilege"
        subtitle={`${roles.length} role × ${totalActions} action — ubah dengan klik sel pada matriks.`}
        actions={
          dirtyRoles.size > 0 ? (
            <Button onClick={saveAll} disabled={saving}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
              </svg>
              Simpan {dirtyRoles.size} perubahan
            </Button>
          ) : null
        }
      />

      <Card className="overflow-auto">
        <table className="w-full text-sm" style={{ minWidth: "700px", whiteSpace: "nowrap" }}>
          <thead>
            <tr>
              <th
                className="sticky left-0 z-10 bg-muted border-r border-border px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                style={{ minWidth: "220px" }}
              >
                Modul / Action
              </th>
              {roles.map(r => (
                <th
                  key={r.id}
                  className="px-3 py-3 text-center bg-muted"
                  style={{ minWidth: "110px" }}
                >
                  <div className="font-semibold text-foreground text-xs">{r.nama_role}</div>
                  <div className={`text-[10px] font-normal ${r.is_default ? "text-muted-foreground" : "text-purple-700 dark:text-purple-300"}`}>
                    {r.is_default ? "default" : "kustom"}
                  </div>
                  {dirtyRoles.has(r.id) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1 h-5 px-2 text-[10px] text-green-600 hover:text-green-700"
                      onClick={() => saveRole(r.id)}
                      disabled={saving}
                    >
                      Simpan
                    </Button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modules.map(mod => (
              <React.Fragment key={mod.modul}>
                <tr className="bg-slate-100 dark:bg-slate-800 dark:bg-slate-800">
                  <td colSpan={roles.length + 1} className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 dark:text-slate-500">
                    {mod.modul}
                  </td>
                </tr>
                {(mod.actions || []).map((act, j) => (
                  <tr key={act.id} className={j % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-800/50"}>
                    <td className="sticky left-0 z-10 px-6 py-2 text-xs text-slate-700 dark:text-slate-300 dark:text-slate-500 bg-inherit">
                      <ActionBadge action={act.action} />
                    </td>
                    {roles.map(r => (
                      <td key={r.id} className="px-3 py-2 text-center">
                        <button
                          onClick={() => toggle(r.id, act.id)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-muted transition-colors"
                          title={`${r.nama_role} — ${mod.modul} / ${act.action}`}
                        >
                          {hasPrivilege(r.id, act.id) ? (
                            <Check size={16} className="text-green-600 dark:text-green-400" strokeWidth={2.5} />
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-slate-300 dark:text-slate-500 dark:text-slate-600 dark:text-slate-300 dark:text-slate-500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
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
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Check size={14} className="text-green-600 dark:text-green-400" strokeWidth={2.5} />
          <span>Dijinkan</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-slate-300 dark:text-slate-500 dark:text-slate-600 dark:text-slate-300 dark:text-slate-500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          <span>Tidak diizinkan</span>
        </div>
        <span>· Klik sel untuk toggle.</span>
      </div>
    </div>
  );
}
