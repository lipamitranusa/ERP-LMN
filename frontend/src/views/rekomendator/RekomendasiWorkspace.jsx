import React, { useState } from "react";
import { useApi, useMutateKeys } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { formatDate, formatDateTime } from "../../utils/dateFormat";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const STATUS_BADGE = {
  menunggu:   { label: "Menunggu Rekomendasi",  bg: "#FEF3C7", text: "#92400E" },
  disetujui:  { label: "Disetujui",              bg: "#DCFCE7", text: "#166534" },
  ditolak:    { label: "Ditolak",                bg: "#FEE2E2", text: "#991B1B" },
};

function StatusBadge({ status }) {
  const info = STATUS_BADGE[status] || { label: status || "—", bg: "#F1F5F9", text: "#475569" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 10px", borderRadius: "9999px",
      fontSize: "11px", fontWeight: "600",
      background: info.bg, color: info.text,
    }}>{info.label}</span>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(15,23,42,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: "12px", width: "100%", maxWidth: "720px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden",
        maxHeight: "92vh", display: "flex", flexDirection: "column",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#1E293B" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#94A3B8" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{
        fontSize: "11px", color: "#94A3B8", textTransform: "uppercase",
        letterSpacing: "0.05em", fontWeight: 700, marginBottom: "8px",
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function DokumenSurveior({ laporan }) {
  const p = laporan?.penugasan;
  if (!p) {
    return <div style={{ fontSize: "12px", color: "#94A3B8" }}>Tidak ada dokumen.</div>;
  }
  const pengerjaan = p.laporanPengerjaan;

  return (
    <div style={{ border: "1px solid #E2E8F0", borderRadius: "8px", overflow: "hidden" }}>
      <table className="data-table" style={{ margin: 0 }}>
        <tbody>
          <tr>
            <td style={{ fontSize: "12px", color: "#64748B", width: "180px" }}>Surveior</td>
            <td style={{ fontSize: "13px", color: "#0F172A", fontWeight: 500 }}>{p.tenagaAhli?.nama || "—"}</td>
          </tr>
          <tr>
            <td style={{ fontSize: "12px", color: "#64748B" }}>Status Penugasan</td>
            <td style={{ fontSize: "13px" }}>{p.status || "—"}</td>
          </tr>
          <tr>
            <td style={{ fontSize: "12px", color: "#64748B" }}>Tanggal Submit Laporan</td>
            <td style={{ fontSize: "13px" }}>{formatDateTime(laporan?.submitted_at)}</td>
          </tr>
          {pengerjaan && (
            <>
              <tr>
                <td style={{ fontSize: "12px", color: "#64748B" }}>Keterangan</td>
                <td style={{ fontSize: "13px", color: "#475569", whiteSpace: "pre-wrap" }}>{pengerjaan.keterangan || "—"}</td>
              </tr>
              {pengerjaan.file_path && (
                <tr>
                  <td style={{ fontSize: "12px", color: "#64748B" }}>File Laporan</td>
                  <td style={{ fontSize: "13px" }}>
                    <a
                      href={`/api/penugasan/${p.id}/laporan/download`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#1E40AF", textDecoration: "underline" }}
                    >
                      Unduh file
                    </a>
                  </td>
                </tr>
              )}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}

function DokumenVerifikator({ lv }) {
  const verifikator = lv?.verifikasiPenugasan?.tenagaAhli;
  const items = lv?.items || [];

  return (
    <div>
      <div style={{ marginBottom: "8px", fontSize: "12px", color: "#475569" }}>
        <strong>{verifikator?.nama || "—"}</strong>
        {" · Difinalisasi "}
        {formatDateTime(lv?.finalized_at)}
      </div>
      {items.length === 0 ? (
        <div style={{ fontSize: "12px", color: "#94A3B8" }}>Tidak ada item verifikasi.</div>
      ) : (
        <div style={{ border: "1px solid #E2E8F0", borderRadius: "8px", overflow: "hidden" }}>
          <table className="data-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th style={{ fontSize: "11px" }}>Kode</th>
                <th style={{ fontSize: "11px" }}>Elemen</th>
                <th style={{ fontSize: "11px" }}>Nilai Final</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => (
                <tr key={it.id}>
                  <td style={{ fontSize: "12px" }}><code style={{ background: "#F1F5F9", padding: "1px 5px", borderRadius: "3px" }}>{it.kode_elemen}</code></td>
                  <td style={{ fontSize: "12px", color: "#0F172A" }}>{it.nama_elemen}</td>
                  <td style={{ fontSize: "12px", fontWeight: 600, color: "#0F172A" }}>{it.nilai_final || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

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
          <div style={{ fontSize: "14px", fontWeight: "500", color: "#1E293B" }}>Tidak ada rekomendasi menunggu</div>
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
                  const verifikator = item?.verifikasiPenugasan?.tenagaAhli;
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
        <Modal title={`Review Rekomendasi — ${faskesName(selected)}`} onClose={closeDetail}>
          <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
            {detailLoading ? (
              <div style={{ padding: "20px", textAlign: "center", color: "#94A3B8" }}>Memuat detail...</div>
            ) : detailData ? (
              <>
                <Section title="Dokumen Surveior">
                  <DokumenSurveior laporan={detailData?.laporan} />
                </Section>

                <Section title="Dokumen Verifikator">
                  <DokumenVerifikator lv={detailData} />
                </Section>

                <Section title="Status Rekomendasi">
                  <StatusBadge status={detailData?.status_rekomendasi} />
                  {detailData?.direkomendasikan_at && (
                    <div style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>
                      Diputuskan: {formatDateTime(detailData.direkomendasikan_at)}
                    </div>
                  )}
                  {detailData?.catatan_rekomendasi && (
                    <div style={{ padding: "10px 12px", background: "#F8FAFC", borderRadius: "6px", fontSize: "13px", color: "#475569", whiteSpace: "pre-wrap", marginTop: "8px" }}>
                      {detailData.catatan_rekomendasi}
                    </div>
                  )}
                </Section>

                {canSetujui && detailData?.status_rekomendasi === "menunggu" && (
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
                )}
              </>
            ) : (
              <div style={{ padding: "20px", textAlign: "center", color: "#94A3B8" }}>Detail tidak tersedia.</div>
            )}
          </div>
          <div style={{ padding: "12px 24px", borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", gap: "8px", flexShrink: 0 }}>
            <Button variant="outline" onClick={closeDetail} disabled={actionLoading}>
              Tutup
            </Button>
            {canSetujui && detailData?.status_rekomendasi === "menunggu" && (
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
        </Modal>
      )}
    </div>
  );
}
