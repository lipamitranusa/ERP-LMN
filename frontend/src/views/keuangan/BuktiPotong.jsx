import React, { useState } from "react";
import { useApi } from "@/hooks/useApi";

async function apiBlob(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = { ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/auth/login";
    return null;
  }
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res;
}

function formatRp(n) {
  return `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
}

function bulanIndo(n) {
  return ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"][n];
}

const BULAN_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: bulanIndo(i + 1),
}));

const TAHUN_DEFAULT = new Date().getFullYear();

// Label manusiawi untuk kode masalah di tabel Gap NPWP (FR-5.9 BP21)
const MASALAH_LABEL = {
  npwp_dan_nik_kosong: "NPWP & NIK kosong",
  npwp_placeholder: "NPWP placeholder (00/11)",
  npwp_tidak_valid: "NPWP tidak valid",
  nama_pajak_kosong: "Nama pajak kosong",
  status_ptkp_kosong: "Status PTKP kosong (BP21)",
  kode_kpp_kosong: "Kode KPP kosong (BP21)",
  kode_objek_pajak_kosong: "Kode objek pajak kosong (BP21)",
};

export default function BuktiPotong() {
  const [tahun, setTahun] = useState(TAHUN_DEFAULT);
  const [bulan, setBulan] = useState(new Date().getMonth() + 1);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState("rekap"); // "rekap" | "gap"
  const [expandedTa, setExpandedTa] = useState(null);

  const periode = `${tahun}-${String(bulan).padStart(2, "0")}`;

  const { data, isLoading, error } = useApi(
    ["bukti-potong", tahun, bulan],
    "/keuangan/bukti-potong?periode=" + periode
  );

  const ringkasan = data?.ringkasan;
  const rekap = data?.rekap || [];
  const gap = data?.gap_npwp || [];

  async function handleExportXml() {
    setExporting(true);
    try {
      const res = await apiBlob(`/keuangan/bukti-potong/export-xml?periode=${periode}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Bp21-${tahun}-${String(bulan).padStart(2, "0")}.xml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Gagal mengekspor XML: " + err.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#1E293B" }}>
          Bukti Potong PPh Pasal 21
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
          Penerbitan bukti potong pajak per periode · Format ekspor BP21 untuk Coretax DJP (FR-5.8 + FR-5.9)
        </p>
      </div>

      {/* Filter Periode */}
      <div className="card" style={{ padding: "16px 20px", marginBottom: "20px", display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <label style={{ fontSize: "11px", fontWeight: "600", color: "#64748B", display: "block", marginBottom: "4px" }}>Tahun</label>
          <select className="form-input" value={tahun} onChange={e => setTahun(Number(e.target.value))} style={{ width: "120px" }}>
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: "11px", fontWeight: "600", color: "#64748B", display: "block", marginBottom: "4px" }}>Bulan</label>
          <select className="form-input" value={bulan} onChange={e => setBulan(Number(e.target.value))} style={{ width: "150px" }}>
            {BULAN_OPTIONS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", background: "#FEE2E2", color: "#991B1B", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" }}>
          {error.message}
        </div>
      )}

      {isLoading ? (
        <div style={{ padding: "60px", textAlign: "center", color: "#94A3B8" }}>Memuat...</div>
      ) : (
        <>
          {/* Ringkasan */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "20px" }}>
            {[
              { label: "Periode", value: `${bulanIndo(bulan)} ${tahun}`, tone: "default" },
              { label: "Jumlah Penerima", value: ringkasan?.jumlah_penerima ?? 0, tone: "info" },
              { label: "Total Bruto", value: formatRp(ringkasan?.total_bruto), tone: "default" },
              { label: "Total Pot. PPN", value: formatRp(ringkasan?.total_potongan_ppn), tone: "warn" },
              { label: "Total Pot. PPh 21", value: formatRp(ringkasan?.total_potongan_pph), tone: "warn" },
              { label: "Total Neto", value: formatRp(ringkasan?.total_neto), tone: "success" },
            ].map((c, i) => (
              <div key={i} style={{
                background: c.tone === "success" ? "#DCFCE7" : c.tone === "warn" ? "#FEF9C3" : c.tone === "info" ? "#EDE9F6" : "#fff",
                borderRadius: "8px", padding: "14px 16px",
                border: `1px solid ${c.tone === "success" ? "#BBF7D0" : c.tone === "warn" ? "#FDE68A" : c.tone === "info" ? "#D1C4E9" : "#E2E8F0"}`,
              }}>
                <div style={{ fontSize: "10px", fontWeight: "600", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>{c.label}</div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: c.tone === "success" ? "#166534" : "#1E293B", marginTop: "4px" }}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* Action bar */}
          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "16px", flexWrap: "wrap" }}>
            <div style={{ flex: 1 }} />

            {/* Alert belum siap export */}
            {ringkasan?.jumlah_belum_siap_export > 0 && (
              <div style={{ padding: "8px 12px", background: "#FEE2E2", color: "#991B1B", borderRadius: "6px", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {ringkasan.jumlah_belum_siap_export} tenaga ahli belum siap export — lihat tab "Gap NPWP" untuk detail & lengkapi via Master Tenaga Ahli.
              </div>
            )}

            {ringkasan?.siap_export ? (
              <button onClick={handleExportXml} className="btn btn-primary" disabled={exporting} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {exporting ? "Mengunduh..." : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                )}
                Ekspor XML BP21 (Coretax)
              </button>
            ) : (
              <button className="btn btn-ghost" disabled style={{ opacity: 0.5, cursor: "not-allowed" }}>
                {rekap.length === 0 ? "Tidak ada data" : "Lengkapi identitas pajak (NPWP, PTKP, KPP) terlebih dahulu"}
              </button>
            )}
          </div>

          {/* Tab: Rekap | Gap */}
          <div style={{ display: "flex", gap: "0", marginBottom: "0", borderBottom: "2px solid #E2E8F0" }}>
            {[
              { key: "rekap", label: `Daftar Penerima (${rekap.length})` },
              { key: "gap", label: `Gap NPWP (${gap.length})` },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: "8px 20px",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: activeTab === tab.key ? "#4F46E5" : "#64748B",
                  borderBottom: activeTab === tab.key ? "2px solid #4F46E5" : "2px solid transparent",
                  marginBottom: "-2px",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab: Rekap */}
          {activeTab === "rekap" && (
            <div className="card" style={{ padding: 0 }}>
              {rekap.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8", fontSize: "13px" }}>
                  Tidak ada entry honor pada periode ini.
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Penerima</th>
                      <th>NPWP / NIK</th>
                      <th>PTKP / KPP</th>
                      <th style={{ textAlign: "center" }}>Jml Penugasan</th>
                      <th style={{ textAlign: "right" }}>Total Bruto</th>
                      <th style={{ textAlign: "right" }}>Pot. PPN</th>
                      <th style={{ textAlign: "right" }}>Pot. PPh 21</th>
                      <th style={{ textAlign: "right" }}>Total Neto</th>
                      <th style={{ textAlign: "center" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rekap.map((r, idx) => (
                      <React.Fragment key={r.tenaga_ahli_id}>
                        <tr
                          style={{ cursor: "pointer" }}
                          onClick={() => setExpandedTa(expandedTa === idx ? null : idx)}
                        >
                          <td>
                            <div style={{ fontWeight: "500", color: "#1E293B" }}>{r.nama}</div>
                            <div style={{ fontSize: "11px", color: "#94A3B8" }}>{r.nomor_induk_surveior}</div>
                          </td>
                          <td style={{ fontSize: "12px", color: "#475569", fontFamily: "monospace" }}>
                            {r.npwp || r.nik || "—"}
                          </td>
                          <td style={{ fontSize: "12px", color: "#475569", fontFamily: "monospace" }}>
                            <div>{r.status_ptkp || <span style={{ color: "#DC2626" }}>PTKP —</span>}</div>
                            <div style={{ color: "#94A3B8" }}>KPP {r.kode_kpp || "—"}</div>
                          </td>
                          <td style={{ textAlign: "center", color: "#475569", fontSize: "13px" }}>
                            {r.jumlah_penugasan}
                            <span style={{ marginLeft: "4px", color: "#94A3B8", fontSize: "11px" }}>
                              ({r.jumlah_survei || 0}S · {r.jumlah_verifikasi || 0}V{r.jumlah_rekomendator ? ` · ${r.jumlah_rekomendator}R` : ""})
                            </span>
                          </td>
                          <td style={{ textAlign: "right", fontWeight: "500", color: "#1E293B", whiteSpace: "nowrap" }}>{formatRp(r.total_bruto)}</td>
                          <td style={{ textAlign: "right", color: "#92400E", whiteSpace: "nowrap" }}>{formatRp(r.total_potongan_ppn)}</td>
                          <td style={{ textAlign: "right", color: "#92400E", whiteSpace: "nowrap" }}>{formatRp(r.total_potongan_pph)}</td>
                          <td style={{ textAlign: "right", fontWeight: "700", color: "#166534", whiteSpace: "nowrap" }}>{formatRp(r.total_neto)}</td>
                          <td style={{ textAlign: "center" }}>
                            {r.npwp_siap_pakai ? (
                              <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "9999px", fontSize: "10px", fontWeight: "700", background: "#DCFCE7", color: "#166534" }}>
                                SIAP
                              </span>
                            ) : (
                              <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "9999px", fontSize: "10px", fontWeight: "700", background: "#FEE2E2", color: "#991B1B" }}>
                                GAP
                              </span>
                            )}
                          </td>
                        </tr>
                        {expandedTa === idx && (
                          <tr>
                            <td colSpan="9" style={{ background: "#F8FAFC", padding: "12px 20px" }}>
                              <table style={{ width: "100%", fontSize: "12px", color: "#475569" }}>
                                <thead>
                                  <tr>
                                    <th>Tanggal</th>
                                    <th>Tipe</th>
                                    <th>Faskes</th>
                                    <th style={{ textAlign: "right" }}>Bruto</th>
                                    <th style={{ textAlign: "right" }}>Pot. PPN</th>
                                    <th style={{ textAlign: "right" }}>Pot. PPh</th>
                                    <th style={{ textAlign: "right" }}>Neto</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {r.entries.map(e => (
                                    <tr key={e.id}>
                                      <td>{e.tanggal}</td>
                                      <td>{e.tipe === "ap_honor_surveior" ? "Surveior" : "Verifikator"}</td>
                                      <td>{e.faskes_nama || "—"}</td>
                                      <td style={{ textAlign: "right" }}>{formatRp(e.nominal_bruto)}</td>
                                      <td style={{ textAlign: "right" }}>{formatRp(e.potongan_ppn)}</td>
                                      <td style={{ textAlign: "right" }}>{formatRp(e.potongan_pph)}</td>
                                      <td style={{ textAlign: "right", fontWeight: "600", color: "#166534" }}>{formatRp(e.nominal_neto)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Tab: Gap NPWP */}
          {activeTab === "gap" && (
            <div className="card" style={{ padding: 0 }}>
              {gap.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8", fontSize: "13px" }}>
                  Semua tenaga ahli pada periode ini sudah memiliki identitas pajak lengkap.
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tenaga Ahli</th>
                      <th>Nomor Induk</th>
                      <th>NPWP</th>
                      <th>PTKP / KPP</th>
                      <th>Kode Pajak</th>
                      <th>Masalah</th>
                      <th>Total Neto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gap.map(g => (
                      <tr key={g.tenaga_ahli_id}>
                        <td style={{ fontWeight: "500", color: "#1E293B" }}>{g.nama}</td>
                        <td style={{ fontSize: "12px", color: "#64748B", fontFamily: "monospace" }}>{g.nomor_induk_surveior}</td>
                        <td style={{ fontSize: "12px", fontFamily: "monospace", color: "#64748B" }}>{g.npwp || g.nik || "—"}</td>
                        <td style={{ fontSize: "12px", fontFamily: "monospace", color: "#64748B" }}>
                          <div>{g.status_ptkp || <span style={{ color: "#DC2626" }}>—</span>}</div>
                          <div>{g.kode_kpp || <span style={{ color: "#DC2626" }}>—</span>}</div>
                        </td>
                        <td style={{ fontSize: "12px", fontFamily: "monospace", color: "#64748B" }}>{g.kode_objek_pajak || "—"}</td>
                        <td>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                            {g.masalah.map(m => (
                              <span key={m} title={MASALAH_LABEL[m] || m} style={{ display: "inline-block", padding: "1px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "600", background: "#FEE2E2", color: "#991B1B" }}>
                                {m}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ textAlign: "right", fontWeight: "500", color: "#475569", whiteSpace: "nowrap" }}>{formatRp(g.total_neto_periode_ini)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
