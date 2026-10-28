import React, { useState } from "react";
import { useApi, useMutateKeys } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { formatDateTime } from "../../utils/dateFormat";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import RekomendasiDetailModal, { Section, StatusBadge } from "./RekomendasiDetail";

export default function RekomendasiWorkspace() {
  const { menuActions } = useAuth();
  const canSetujui = menuActions?.some(a => a.modul === "Rekomendasi" && a.action === "Setujui");

  const [selected, setSelected] = useState(null);
  const [catatan, setCatatan] = useState("");

  const { data: rawData, isLoading } = useApi("rekomendasi-list", "/rekomendasi");
  const items = Array.isArray(rawData?.data) ? rawData.data : [];

  const { data: detailData, isLoading: detailLoading } = useApi(
    ["rekomendasi-detail", selected?.id],
    selected ? "/rekomendasi/" + selected.id : "/rekomendasi",
    { enabled: !!selected }
  );
  // Endpoint membungkus payload di { data: ... }
  const detail = detailData?.data ?? null;

  const setujuiMutate = useMutateKeys(["rekomendasi-list"], {
    onSuccess: (d) => {
      alert(d.message || "Rekomendasi disetujui.");
      setSelected(null);
    },
  });

  const tolakMutate = useMutateKeys(["rekomendasi-list"], {
    onSuccess: (d) => {
      alert(d.message || "Rekomendasi ditolak.");
      setSelected(null);
    },
  });

  function openDetail(lv) {
    setSelected(lv);
    setCatatan("");
  }

  function closeDetail() {
    setSelected(null);
    setCatatan("");
  }

  function handleSetujui() {
    if (!selected) return;
    if (!confirm("Setujui hasil verifikasi ini? AP honor untuk surveior, verifikator, dan rekomendator akan dicatat.")) return;
    setujuiMutate.mutate({
      path: `/rekomendasi/${selected.id}/setujui`,
      method: "POST",
    });
  }

  function handleTolak() {
    if (!selected) return;
    if (!catatan.trim() || catatan.trim().length < 5) {
      alert("Catatan penolakan wajib diisi (min. 5 karakter).");
      return;
    }
    if (!confirm("Tolak hasil verifikasi ini?")) return;
    tolakMutate.mutate({
      path: `/rekomendasi/${selected.id}/tolak`,
      method: "POST",
      body: { catatan: catatan.trim() },
    });
  }

  const faskesName = (item) => item?.laporan?.penugasan?.siklus?.faskes?.nama || "—";
  const actionLoading = setujuiMutate.isPending || tolakMutate.isPending;

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>
          Rekomendasi
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
          Daftar laporan verifikasi yang menunggu validasi rekomendator. Setelah disetujui,
          AP honor untuk surveior, verifikator, dan rekomendator akan dicatat sekaligus.
        </p>
      </div>

      {isLoading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8" }}>Memuat...</div>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: "48px", textAlign: "center" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="40" height="40" style={{ margin: "0 auto 12px" }}>
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#1E293B" }}>Tidak ada rekomendasi menunggu</div>
          <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "4px" }}>
            Semua laporan verifikasi sudah diproses.
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Faskes</th>
                  <th>Lembaga</th>
                  <th>Verifikator</th>
                  <th>Tanggal Final</th>
                  <th>Status</th>
                  <th style={{ width: "100px" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const verifikator = item?.verifikasi_penugasan?.tenaga_ahli;
                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 500, color: "#0F172A" }}>{faskesName(item)}</td>
                      <td style={{ color: "#475569" }}>{item?.laporan?.penugasan?.siklus?.lembaga?.nama || "—"}</td>
                      <td style={{ color: "#475569" }}>{verifikator?.nama || "—"}</td>
                      <td style={{ color: "#64748B", fontSize: "12px" }}>{formatDateTime(item.finalized_at)}</td>
                      <td><StatusBadge status={item.status_rekomendasi} /></td>
                      <td>
                        <Button size="sm" onClick={() => openDetail(item)}>
                          Review
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <RekomendasiDetailModal
          title={`Review Rekomendasi — ${faskesName(selected)}`}
          detail={detail}
          loading={detailLoading}
          onClose={closeDetail}
          extraBody={
            canSetujui && detail?.status_rekomendasi === "menunggu" ? (
              <Section title="Catatan Rekomendator (opsional)">
                <Textarea
                  rows={3}
                  value={catatan}
                  onChange={e => setCatatan(e.target.value)}
                  placeholder="Tambahkan catatan jika diperlukan (mis. untuk rekomendasi atau justifikasi penolakan)..."
                  style={{ resize: "vertical" }}
                  maxLength={2000}
                />
                <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "4px" }}>
                  Catatan wajib diisi (min. 5 karakter) hanya jika Anda memilih <strong>Tolak</strong>.
                </div>
              </Section>
            ) : null
          }
          footer={
            <div style={{ padding: "12px 24px", borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", gap: "8px", flexShrink: 0 }}>
              <Button variant="outline" onClick={closeDetail} disabled={actionLoading}>
                Tutup
              </Button>
              {canSetujui && detail?.status_rekomendasi === "menunggu" && (
                <div style={{ display: "flex", gap: "8px" }}>
                  <Button
                    style={{ background: "#DC2626", borderColor: "#DC2626" }}
                    onClick={handleTolak}
                    disabled={actionLoading}
                  >
                    Tolak
                  </Button>
                  <Button
                    style={{ background: "#16A34A", borderColor: "#16A34A" }}
                    onClick={handleSetujui}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Memproses..." : "Setujui"}
                  </Button>
                </div>
              )}
            </div>
          }
        />
      )}
    </div>
  );
}
