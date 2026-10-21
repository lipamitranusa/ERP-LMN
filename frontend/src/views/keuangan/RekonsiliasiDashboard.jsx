import React, { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";

function formatRp(n) {
  return `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
}

function KpiCard({ label, value, sub, tone = "default" }) {
  const tones = {
    default: { bg: "#FFFFFF", text: "#1E293B", sub: "#64748B", border: "#E2E8F0" },
    success: { bg: "#DCFCE7", text: "#166534", sub: "#15803D", border: "#BBF7D0" },
    info: { bg: "#EDE9F6", text: "#5E35B1", sub: "#6D28D9", border: "#D1C4E9" },
    warn: { bg: "#FEF9C3", text: "#854D0E", sub: "#92400E", border: "#FDE68A" },
    danger: { bg: "#FEE2E2", text: "#991B1B", sub: "#B91C1C", border: "#FECACA" },
  };
  const t = tones[tone] || tones.default;
  return (
    <div style={{ background: t.bg, borderRadius: "10px", padding: "20px", border: `1px solid ${t.border}` }}>
      <div style={{ fontSize: "11px", fontWeight: "600", color: t.sub, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ fontSize: "24px", fontWeight: "700", color: t.text, marginTop: "6px", lineHeight: 1.2 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: "11px", color: t.sub, marginTop: "4px" }}>{sub}</div>}
    </div>
  );
}

function TrendArrow({ value }) {
  if (value > 0) return <span style={{ color: "#166534", fontSize: "12px" }}>▲</span>;
  if (value < 0) return <span style={{ color: "#991B1B", fontSize: "12px" }}>▼</span>;
  return <span style={{ color: "#64748B", fontSize: "12px" }}>—</span>;
}

export default function RekonsiliasiDashboard() {
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");
  const [trigger, setTrigger] = useState(0);

  const qs = React.useMemo(() => {
    const params = new URLSearchParams();
    if (dari) params.set("dari", dari);
    if (sampai) params.set("sampai", sampai);
    return params.toString() ? `?${params}` : "";
  }, [dari, sampai]);

  const { data, isLoading, isError, error } = useApi(
    ["rekonsiliasi", dari, sampai, trigger],
    `/dasbor/rekonsiliasi${qs}`
  );

  const kpi = data?.data?.kpi || null;
  const perFaskes = data?.data?.per_faskes || [];
  const loading = isLoading;
  const errMsg = error?.message || "";

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#1E293B" }}>
          Dasbor Rekonsiliasi
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
          Pemasukan − Honor Surveior & Verifikator · PRD FR-5.4
        </p>
      </div>

      {/* Filter periode */}
      <div className="card" style={{ padding: "16px 20px", marginBottom: "20px", display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <label style={{ fontSize: "11px", fontWeight: "600", color: "#64748B", display: "block", marginBottom: "4px" }}>Dari Tanggal</label>
          <input type="date" className="form-input" value={dari} onChange={e => setDari(e.target.value)} style={{ width: "160px" }} />
        </div>
        <div>
          <label style={{ fontSize: "11px", fontWeight: "600", color: "#64748B", display: "block", marginBottom: "4px" }}>Sampai Tanggal</label>
          <input type="date" className="form-input" value={sampai} onChange={e => setSampai(e.target.value)} style={{ width: "160px" }} />
        </div>
        <Button onClick={() => setTrigger(t => t + 1)}>
          Terapkan Filter
        </Button>
        {(dari || sampai) && (
          <Button variant="ghost" onClick={() => { setDari(""); setSampai(""); setTrigger(t => t + 1); }}>
            Reset
          </Button>
        )}
      </div>

      {errMsg && (
        <div style={{ padding: "12px 16px", background: "#FEE2E2", color: "#991B1B", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" }}>
          Gagal memuat data: {errMsg}
        </div>
      )}

      {loading ? (
        <div style={{ padding: "60px", textAlign: "center", color: "#94A3B8" }}>Memuat...</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            <KpiCard
              label="Total Pemasukan"
              value={formatRp(kpi?.pemasukan)}
              sub={kpi?.periode ? `${kpi.periode.dari} s/d ${kpi.periode.sampai}` : "Semua waktu"}
              tone="success"
            />
            <KpiCard
              label="Honor Surveior (Bruto)"
              value={formatRp(kpi?.honor_surveior_bruto)}
              sub="Belum dipotong pajak"
              tone="info"
            />
            <KpiCard
              label="Honor Verifikator (Bruto)"
              value={formatRp(kpi?.honor_verifikator_bruto)}
              sub="Belum dipotong pajak"
              tone="info"
            />
            <KpiCard
              label="Total Honor"
              value={formatRp(kpi?.honor_total_bruto)}
              sub={`PPN: ${formatRp(kpi?.potongan_ppn)} · PPh: ${formatRp(kpi?.potongan_pph)}`}
              tone="warn"
            />
          </div>

          {/* Laba Proyek — highlight */}
          <div className="card" style={{
            padding: "24px",
            marginBottom: "24px",
            background: (kpi?.margin_persen ?? 0) > 0 ? "#DCFCE7" : (kpi?.margin_persen ?? 0) < 0 ? "#FEE2E2" : "#F8FAFC",
            border: `2px solid ${(kpi?.margin_persen ?? 0) > 0 ? "#16A34A" : (kpi?.margin_persen ?? 0) < 0 ? "#DC2626" : "#CBD5E1"}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>
                  LABA PROYEK (Pemasukan − Total Honor)
                </div>
                <div style={{ fontSize: "32px", fontWeight: "800", color: (kpi?.margin_persen ?? 0) > 0 ? "#166534" : (kpi?.margin_persen ?? 0) < 0 ? "#991B1B" : "#475569" }}>
                  {formatRp(kpi?.laba_proyek)}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "11px", fontWeight: "600", color: "#64748B", marginBottom: "2px" }}>MARGIN</div>
                <div style={{ fontSize: "28px", fontWeight: "700", color: (kpi?.margin_persen ?? 0) > 0 ? "#166534" : (kpi?.margin_persen ?? 0) < 0 ? "#991B1B" : "#475569" }}>
                  <TrendArrow value={kpi?.margin_persen ?? 0} /> {(kpi?.margin_persen ?? 0).toFixed(1)}%
                </div>
                <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>
                  {kpi?.jumlah_siklus_aktif ?? 0} siklus aktif
                </div>
              </div>
            </div>
          </div>

          {/* Rincian Pajak */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
            <KpiCard
              label="Total Potongan PPN"
              value={formatRp(kpi?.potongan_ppn)}
              sub="Pajak OUTPUT yang dipungut dari honor"
              tone="warn"
            />
            <KpiCard
              label="Total Potongan PPh 21"
              value={formatRp(kpi?.potongan_pph)}
              sub="Dipotong langsung dari honor penerima"
              tone="warn"
            />
          </div>

          {/* Tabel Per Faskes */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9" }}>
              <span style={{ fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>Rekonsiliasi Per Faskes</span>
              <span style={{ marginLeft: "8px", fontSize: "12px", color: "#94A3B8" }}>
                ({perFaskes.length} Faskes)
              </span>
            </div>

            {perFaskes.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8", fontSize: "13px" }}>
                Belum ada data rekonsiliasi.
              </div>
            ) : (
              <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Faskes</th>
                      <th>Tipe</th>
                      <th style={{ textAlign: "center" }}>Jml Siklus</th>
                      <th style={{ textAlign: "right" }}>Pemasukan</th>
                      <th style={{ textAlign: "right" }}>Honor Surveior</th>
                      <th style={{ textAlign: "right" }}>Honor Verifikator</th>
                      <th style={{ textAlign: "right" }}>Total Honor</th>
                      <th style={{ textAlign: "right" }}>Laba</th>
                      <th style={{ textAlign: "right" }}>Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perFaskes.map(row => (
                      <tr key={row.faskes_id}>
                        <td>
                          <div style={{ fontWeight: "500", color: "#1E293B", maxWidth: "200px" }}>{row.faskes_nama}</div>
                        </td>
                        <td>
                          <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", background: "#F1F5F9", color: "#475569" }}>
                            {row.tipe_faskes || "—"}
                          </span>
                        </td>
                        <td style={{ textAlign: "center", color: "#475569", fontSize: "13px" }}>{row.jumlah_siklus}</td>
                        <td style={{ textAlign: "right", fontWeight: "500", color: "#166534", whiteSpace: "nowrap" }}>{formatRp(row.total_pemasukan)}</td>
                        <td style={{ textAlign: "right", color: "#475569", whiteSpace: "nowrap" }}>{formatRp(row.total_honor_surveior)}</td>
                        <td style={{ textAlign: "right", color: "#475569", whiteSpace: "nowrap" }}>{formatRp(row.total_honor_verifikator)}</td>
                        <td style={{ textAlign: "right", fontWeight: "600", color: "#92400E", whiteSpace: "nowrap" }}>{formatRp(row.total_honor)}</td>
                        <td style={{ textAlign: "right", fontWeight: "700", color: row.laba_proyek >= 0 ? "#166534" : "#991B1B", whiteSpace: "nowrap" }}>
                          {formatRp(row.laba_proyek)}
                        </td>
                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          <span style={{ color: row.margin_persen >= 0 ? "#166534" : "#991B1B", fontWeight: "600", fontSize: "12px" }}>
                            {row.margin_persen >= 0 ? "▲" : "▼"} {row.margin_persen.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
