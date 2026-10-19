import React from "react";
import { useApi } from "@/hooks/useApi";
import { formatDate } from "@/utils/dateFormat";

/**
 * Panel kecil yang menampilkan jurnal settlement (Dr Bank, Cr Piutang/Hutang)
 * terkait dengan sumber tertentu (bukti_pembayaran, pembayaran_honor,
 * hutang_pajak). Tampil inline di halaman detail.
 *
 * Props:
 *   - refType: 'settlement_piutang' | 'settlement_ap_honor' | 'settlement_ap_pajak'
 *   - refId:   uuid sumber
 *   - title:   judul panel (opsional)
 */
export default function SettlementJournalPanel({ refType, refId, title = "Jurnal Settlement" }) {
  const { data, isLoading } = useApi(
    ["settlement-source", refType, refId],
    `/keuangan/settlement/source-info?ref_type=${encodeURIComponent(refType)}&ref_id=${encodeURIComponent(refId)}`,
    { enabled: !!refType && !!refId }
  );

  const result = data?.data;
  const jurnal = result?.jurnal;
  const source = result?.source;

  if (isLoading) {
    return (
      <div className="card" style={{ padding: "14px 18px", marginTop: "12px", fontSize: "12px", color: "#94A3B8" }}>
        Memuat jurnal settlement…
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="card" style={{ padding: "16px 20px", marginTop: "16px" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "8px",
        fontSize: "13px", fontWeight: 600, color: "#1E293B", marginBottom: "10px",
      }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
          <path d="M3 3h18v18H3zM3 9h18M9 21V9"/>
        </svg>
        {title}
      </div>

      {jurnal ? (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
            <span style={{ color: "#64748B" }}>Nomor Jurnal</span>
            <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#1E293B" }}>{jurnal.nomor}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
            <span style={{ color: "#64748B" }}>Tanggal</span>
            <span style={{ color: "#1E293B" }}>{formatDate(jurnal.tanggal)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "8px" }}>
            <span style={{ color: "#64748B" }}>Kategori</span>
            <span style={{ color: "#1E293B" }}>{jurnal.kategori?.nama || "—"}</span>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", marginTop: "8px" }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                <th style={{ padding: "6px 8px", textAlign: "left", fontSize: "10px", color: "#64748B", textTransform: "uppercase", fontWeight: 600 }}>Akun</th>
                <th style={{ padding: "6px 8px", textAlign: "right", fontSize: "10px", color: "#64748B", textTransform: "uppercase", fontWeight: 600 }}>Debit</th>
                <th style={{ padding: "6px 8px", textAlign: "right", fontSize: "10px", color: "#64748B", textTransform: "uppercase", fontWeight: 600 }}>Kredit</th>
              </tr>
            </thead>
            <tbody>
              {jurnal.details?.map((d, i) => (
                <tr key={i} style={{ borderTop: "1px solid #E2E8F0" }}>
                  <td style={{ padding: "6px 8px" }}>
                    <div style={{ color: "#1E293B" }}>{d.coa?.nama || "—"}</div>
                    <div style={{ fontFamily: "monospace", fontSize: "10px", color: "#64748B" }}>{d.coa?.kode}</div>
                  </td>
                  <td style={{ padding: "6px 8px", textAlign: "right", color: d.debit > 0 ? "#16A34A" : "#94A3B8" }}>
                    {d.debit > 0 ? "Rp " + Number(d.debit).toLocaleString("id-ID") : "—"}
                  </td>
                  <td style={{ padding: "6px 8px", textAlign: "right", color: d.kredit > 0 ? "#DC2626" : "#94A3B8" }}>
                    {d.kredit > 0 ? "Rp " + Number(d.kredit).toLocaleString("id-ID") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: "#F1F5F9", fontWeight: 600 }}>
                <td style={{ padding: "6px 8px", color: "#475569" }}>Total</td>
                <td style={{ padding: "6px 8px", textAlign: "right", color: "#1E293B" }}>
                  Rp {Number(jurnal.total_debit).toLocaleString("id-ID")}
                </td>
                <td style={{ padding: "6px 8px", textAlign: "right", color: "#1E293B" }}>
                  Rp {Number(jurnal.total_kredit).toLocaleString("id-ID")}
                </td>
              </tr>
            </tfoot>
          </table>

          {jurnal.keterangan && (
            <div style={{ marginTop: "8px", fontSize: "11px", color: "#64748B", fontStyle: "italic" }}>
              {jurnal.keterangan}
            </div>
          )}
        </div>
      ) : (
        <div style={{
          padding: "10px 12px", borderRadius: "6px",
          background: "#FEF9C3", border: "1px solid #FDE047",
          fontSize: "12px", color: "#854D0E",
        }}>
          <div style={{ fontWeight: 600, marginBottom: "2px" }}>⚠ Belum ada jurnal settlement</div>
          <div style={{ fontSize: "11px" }}>
            Sumber: {source ? `${source.type} #${(source.id || "").slice(0, 8)}` : "—"}
            <br />
            Jurnal akan dibuat otomatis saat settlement diproses. Untuk data historis,
            gunakan menu <b>Jurnal Settlement → Rebuild Jurnal</b>.
          </div>
        </div>
      )}
    </div>
  );
}
