import React from "react";
import { useParams, useHistory } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { formatDate } from "../../utils/dateFormat";
import SettlementJournalPanel from "@/components/SettlementJournalPanel";
import { Button } from "@/components/ui/button";

function formatRp(n) {
  return `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
}

const STATUS_MAP = {
  belum_bayar: { label: "Belum Bayar",   color: "#FEE2E2", text: "#991B1B" },
  parsial:     { label: "Parsial",       color: "#FEF9C3", text: "#854D0E" },
  jatuh_tempo: { label: "Jatuh Tempo",   color: "#FFEDD5", text: "#9A3412" },
  lunas:       { label: "Lunas",         color: "#DCFCE7", text: "#166534" },
  expired:     { label: "Kedaluwarsa",   color: "#F1F5F9", text: "#475569" },
  refunded:    { label: "Refund",        color: "#EDE9F6", text: "#5E35B1" },
  superseded:  { label: "Diganti",       color: "#E2E8F0", text: "#64748B" },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.belum_bayar;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      padding: "4px 10px", borderRadius: "9999px",
      fontSize: "12px", fontWeight: "600",
      background: s.color, color: s.text,
    }}>
      {s.label}
    </span>
  );
}

function InfoRow({ label, value, strong = false }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "8px 0",
      borderBottom: "1px solid #F1F5F9",
    }}>
      <span style={{ fontSize: "13px", color: "#64748B" }}>{label}</span>
      <span style={{
        fontSize: "13px",
        fontWeight: strong ? "600" : "400",
        color: strong ? "#1E293B" : "#334155",
        textAlign: "right",
        maxWidth: "60%",
      }}>{value || "—"}</span>
    </div>
  );
}

function PaymentBadge({ status }) {
  const map = {
    pending:   { label: "Menunggu",   color: "#F59E0B", bg: "#FEF9C3" },
    diterima: { label: "Diterima",   color: "#16A34A", bg: "#DCFCE7" },
    ditolak:  { label: "Ditolak",   color: "#DC2626", bg: "#FEE2E2" },
  };
  const b = map[status] || { label: status, color: "#64748B", bg: "#F1F5F9" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 8px", borderRadius: "9999px",
      fontSize: "11px", fontWeight: "600",
      background: b.bg, color: b.color,
    }}>
      {b.label}
    </span>
  );
}

function ProgressBar({ received, total }) {
  const pct = total > 0 ? Math.min(100, (received / total) * 100) : 0;
  const color = pct >= 100 ? "#4CAF50" : pct > 0 ? "#F59E0B" : "#E2E8F0";
  return (
    <div>
      <div style={{
        height: "6px", borderRadius: "9999px",
        background: "#E2E8F0", overflow: "hidden",
      }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: color, borderRadius: "9999px",
          transition: "width 0.3s ease",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "11px", color: "#94A3B8" }}>
        <span>{formatRp(received)} diterima</span>
        <span>{pct.toFixed(1)}%</span>
      </div>
    </div>
  );
}

export default function PiutangDetail() {
  const { id } = useParams();
  const history = useHistory();

  const { data, isLoading } = useApi(["piutang-detail", id], "/piutang/" + id);

  const inv = data?.data;
  const error = data?.message && !inv ? data.message : "";

  if (isLoading) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8" }}>Memuat detail invoice...</div>;
  }
  if (error) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <div style={{ color: "#DC2626", fontSize: "13px", marginBottom: "16px" }}>{error}</div>
        <Button variant="outline" onClick={() => history.push("/admin/piutang")}>Kembali</Button>
      </div>
    );
  }
  if (!inv) return null;

  return (
    <div>
      {/* Header + back */}
      <div style={{ marginBottom: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Button
            variant="ghost"
            onClick={() => history.push("/admin/piutang")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </Button>
          <div>
            <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>
              Detail Invoice
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#94A3B8" }}>
              {inv.nomor_invoice}
            </p>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <StatusBadge status={inv.status_display} />
          </div>
        </div>
      </div>

      {/* Three-column grid: Invoice Info | Faskes | Siklus */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "20px" }}>
        {/* Invoice info */}
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ fontSize: "13px", fontWeight: "600", color: "#1E293B", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
            </svg>
            Informasi Invoice
          </div>
          <InfoRow label="Nomor Invoice" value={inv.nomor_invoice} strong />
          <InfoRow label="Diterbitkan" value={formatDate(inv.diterbitkan_pada)} />
          <InfoRow label="Jatuh Tempo" value={formatDate(inv.due_date)} />
          <InfoRow label="Metode Bayar" value={inv.metode_pembayaran} />
          <InfoRow label="Payment Ref." value={inv.payment_reference} />
          {inv.payment_expired_at && (
            <InfoRow label="Batas Pembayaran" value={formatDate(inv.payment_expired_at)} />
          )}
          {inv.tanggal_lunas && (
            <InfoRow label="Tanggal Lunas" value={formatDate(inv.tanggal_lunas)} />
          )}
          {inv.dibuat_oleh_nama && (
            <InfoRow label="Dibuat oleh" value={inv.dibuat_oleh_nama} />
          )}
          {inv.keterangan && (
            <InfoRow label="Keterangan" value={inv.keterangan} />
          )}
        </div>

        {/* Faskes info */}
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ fontSize: "13px", fontWeight: "600", color: "#1E293B", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Data Faskes
          </div>
          {inv.faskes ? (
            <>
              <InfoRow label="Nama" value={inv.faskes.nama} strong />
              <InfoRow label="Tipe" value={inv.faskes.tipe_faskes} />
              <InfoRow label="Alamat" value={inv.faskes.alamat} />
              <InfoRow label="Telepon" value={inv.faskes.telepon} />
              <InfoRow label="Email" value={inv.faskes.email} />
            </>
          ) : (
            <div style={{ color: "#94A3B8", fontSize: "13px" }}>Data Faskes tidak tersedia.</div>
          )}
        </div>

        {/* Siklus info */}
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ fontSize: "13px", fontWeight: "600", color: "#1E293B", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            Siklus Akreditasi
          </div>
          {inv.siklus ? (
            <>
              <InfoRow label="ID Siklus" value={inv.siklus.id} strong />
              <InfoRow label="Status Siklus" value={inv.siklus.status} />
              <InfoRow label="Tanggal Pengajuan" value={formatDate(inv.siklus.tanggal_pengajuan)} />
              <div style={{ marginTop: "8px" }}>
                <Button
                  variant="outline"
                  style={{ fontSize: "12px" }}
                  onClick={() => history.push(`/admin/pendaftaran/${inv.siklus.id}`)}
                >
                  Lihat Detail Siklus
                </Button>
              </div>
            </>
          ) : (
            <div style={{ color: "#94A3B8", fontSize: "13px" }}>Data siklus tidak tersedia.</div>
          )}
        </div>
      </div>

      {/* Ringkasan tagihan */}
      <div className="card" style={{ padding: "20px", marginBottom: "20px" }}>
        <div style={{ fontSize: "14px", fontWeight: "600", color: "#1E293B", marginBottom: "16px" }}>
          Ringkasan Tagihan
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "11px", color: "#94A3B8", marginBottom: "4px" }}>TOTAL TAGIHAN</div>
            <div style={{ fontSize: "20px", fontWeight: "700", color: "#1E293B" }}>
              {formatRp(inv.total_tagihan)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "#94A3B8", marginBottom: "4px" }}>SUDAH DIBAYAR</div>
            <div style={{ fontSize: "20px", fontWeight: "700", color: "#16A34A" }}>
              {formatRp(inv.total_diterima)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "#94A3B8", marginBottom: "4px" }}>SISA PIUTANG</div>
            <div style={{ fontSize: "20px", fontWeight: "700", color: inv.sisa_piutang > 0 ? "#DC2626" : "#16A34A" }}>
              {formatRp(inv.sisa_piutang)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "#94A3B8", marginBottom: "4px" }}>OVERDUE</div>
            <div style={{ fontSize: "20px", fontWeight: "700", color: inv.hari_overdue > 0 ? "#DC2626" : "#94A3B8" }}>
              {inv.hari_overdue > 0 ? `${inv.hari_overdue} hari` : "—"}
            </div>
          </div>
        </div>
        <div style={{ marginTop: "16px" }}>
          <ProgressBar received={inv.total_diterima} total={inv.total_tagihan} />
        </div>
      </div>

      {/* Histori pembayaran */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0" }}>
          <span style={{ fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>
            Histori Pembayaran
          </span>
        </div>
        <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Metode</th>
                <th style={{ textAlign: "right" }}>Nominal</th>
                <th>Status</th>
                <th>Diverifikasi oleh</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {inv.bukti_pembayaran && inv.bukti_pembayaran.length > 0 ? (
                inv.bukti_pembayaran.map(b => (
                  <React.Fragment key={b.id}>
                    <tr>
                      <td style={{ fontSize: "12px", color: "#334155" }}>{formatDate(b.tanggal)}</td>
                      <td style={{ fontSize: "12px", color: "#334155" }}>
                        {b.metode === "va" ? "Virtual Account" :
                         b.metode === "qris" ? "QRIS" :
                         b.metode === "transfer_manual" ? "Transfer Manual" :
                         b.metode || "—"}
                      </td>
                      <td style={{ textAlign: "right", fontSize: "12px", fontWeight: "600", color: "#16A34A" }}>
                        {formatRp(b.nominal)}
                      </td>
                      <td><PaymentBadge status={b.status_verifikasi} /></td>
                      <td style={{ fontSize: "12px", color: "#64748B" }}>{b.diverifikasi_oleh_nama || "—"}</td>
                      <td style={{ fontSize: "12px", color: "#64748B" }}>{b.keterangan || "—"}</td>
                    </tr>
                    {b.status_verifikasi === "diterima" && (
                      <tr>
                        <td colSpan="6" style={{ padding: 0, background: "#F8FAFC" }}>
                          <SettlementJournalPanel
                            refType="settlement_piutang"
                            refId={b.id}
                            title="Jurnal Penerimaan Kas"
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", color: "#94A3B8", padding: "32px 16px" }}>
                    Belum ada pembayaran yang terekam.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
