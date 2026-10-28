import React from "react";
import { formatDateTime } from "../../utils/dateFormat";

const STATUS_BADGE = {
  menunggu:  { label: "Menunggu Rekomendasi", bg: "#FEF3C7", text: "#92400E" },
  disetujui: { label: "Disetujui",             bg: "#DCFCE7", text: "#166534" },
  ditolak:   { label: "Ditolak",               bg: "#FEE2E2", text: "#991B1B" },
};

export function StatusBadge({ status }) {
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

export function Modal({ title, onClose, children }) {
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

export function Section({ title, children }) {
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

export function DokumenSurveior({ laporan, surveyor }) {
  const fallback = laporan?.penugasan
    ? [{
        id: laporan.penugasan.id,
        nama: laporan.penugasan.tenaga_ahli?.nama,
        peran: laporan.penugasan.tenaga_ahli?.peran,
        status: laporan.penugasan.status,
        submitted_at: laporan?.submitted_at,
        keterangan: laporan.penugasan.laporan_pengerjaan?.keterangan,
      }]
    : [];
  const list = Array.isArray(surveyor) && surveyor.length > 0 ? surveyor : fallback;

  if (!list.length) {
    return <div style={{ fontSize: "12px", color: "#94A3B8" }}>Tidak ada dokumen.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {list.map((s, idx) => (
        <div key={s.id} style={{ border: "1px solid #E2E8F0", borderRadius: "8px", overflow: "hidden" }}>
          <div style={{
            padding: "8px 12px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0",
            fontSize: "11px", fontWeight: 700, color: "#475569",
            textTransform: "uppercase", letterSpacing: "0.05em",
          }}>
            Surveior {idx + 1}{s.jenis_tenaga_ahli ? ` — ${s.jenis_tenaga_ahli}` : s.peran ? ` — ${s.peran}` : ""}
          </div>
          <table className="data-table" style={{ margin: 0 }}>
            <tbody>
              <tr>
                <td style={{ fontSize: "12px", color: "#64748B", width: "180px" }}>Surveior</td>
                <td style={{ fontSize: "13px", color: "#0F172A", fontWeight: 500 }}>{s.nama || "—"}</td>
              </tr>
              {s.nomor_induk_surveior && (
                <tr>
                  <td style={{ fontSize: "12px", color: "#64748B" }}>Nomor Induk Surveior</td>
                  <td style={{ fontSize: "13px", color: "#475569" }}>{s.nomor_induk_surveior}</td>
                </tr>
              )}
              <tr>
                <td style={{ fontSize: "12px", color: "#64748B" }}>Status Penugasan</td>
                <td style={{ fontSize: "13px" }}>{s.status || "—"}</td>
              </tr>
              <tr>
                <td style={{ fontSize: "12px", color: "#64748B" }}>Tanggal Submit Laporan</td>
                <td style={{ fontSize: "13px" }}>{formatDateTime(s.submitted_at)}</td>
              </tr>
              <tr>
                <td style={{ fontSize: "12px", color: "#64748B" }}>Keterangan</td>
                <td style={{ fontSize: "13px", color: "#475569", whiteSpace: "pre-wrap" }}>{s.keterangan || "—"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

export function DokumenVerifikator({ lv }) {
  const verifikator = lv?.verifikasi_penugasan?.tenaga_ahli;

  return (
    <table className="data-table" style={{ margin: 0 }}>
      <tbody>
        <tr>
          <td style={{ fontSize: "12px", color: "#64748B", width: "180px" }}>Verifikator</td>
          <td style={{ fontSize: "13px", color: "#0F172A", fontWeight: 500 }}>{verifikator?.nama || "—"}</td>
        </tr>
        <tr>
          <td style={{ fontSize: "12px", color: "#64748B" }}>Tanggal Selesai Verifikasi</td>
          <td style={{ fontSize: "13px" }}>{formatDateTime(lv?.finalized_at)}</td>
        </tr>
      </tbody>
    </table>
  );
}

/**
 * Modal detail rekomendasi — dipakai workspace (menunggu keputusan) dan
 * halaman riwayat (sudah diputuskan).
 */
export default function RekomendasiDetailModal({
  title,
  detail,
  loading,
  onClose,
  extraBody,
  footer,
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
        {loading ? (
          <div style={{ padding: "20px", textAlign: "center", color: "#94A3B8" }}>Memuat detail...</div>
        ) : detail ? (
          <>
            <Section title="Dokumen Surveior">
              <DokumenSurveior laporan={detail?.laporan} surveyor={detail?.surveyor} />
            </Section>

            <Section title="Dokumen Verifikator">
              <DokumenVerifikator lv={detail} />
            </Section>

            <Section title="Status Rekomendasi">
              <StatusBadge status={detail?.status_rekomendasi} />
              {detail?.direkomendasikan_at && (
                <div style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>
                  Diputuskan: {formatDateTime(detail.direkomendasikan_at)}
                </div>
              )}
              {detail?.catatan_rekomendasi && (
                <div style={{ padding: "10px 12px", background: "#F8FAFC", borderRadius: "6px", fontSize: "13px", color: "#475569", whiteSpace: "pre-wrap", marginTop: "8px" }}>
                  {detail.catatan_rekomendasi}
                </div>
              )}
            </Section>

            {extraBody}
          </>
        ) : (
          <div style={{ padding: "20px", textAlign: "center", color: "#94A3B8" }}>Detail tidak tersedia.</div>
        )}
      </div>
      {footer}
    </Modal>
  );
}
