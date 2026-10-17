import React, { useState } from "react";
import { useApi } from "@/hooks/useApi";

function formatRp(n) {
  return `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
}

function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function Modal({ title, children, onClose, wide }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
      <div style={{ background: "#fff", borderRadius: "8px", width: wide ? "820px" : "480px", maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "600" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#64748B" }}>×</button>
        </div>
        <div style={{ padding: "20px" }}>{children}</div>
      </div>
    </div>
  );
}

const JENIS_LABEL = {
  aktiva_lancar: "Aktiva Lancar", aktiva_tetap: "Aktiva Tetap",
  kewajiban_lancar: "Kewajiban Lancar", kewajiban_jangka_panjang: "Kewajiban Jangka Panjang",
  modal: "Modal",
  pendapatan: "Pendapatan", pendapatan_lain: "Pendapatan Lain",
  beban: "Beban", beban_lain: "Beban Lain",
};
const KELOMPOK_LABEL = { debit: "Debit", kredit: "Kredit", debit_kredit: "Debit / Kredit" };

export default function AccountingBukuBesar() {
  const now = new Date();
  const [filter, setFilter] = useState({ tahun: now.getFullYear(), bulan: String(now.getMonth() + 1).padStart(2, "0") });
  const [selectedAkun, setSelectedAkun] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});

  const qs = `/keuangan/accounting/buku-besar?tahun=${filter.tahun}&bulan=${filter.bulan}`;
  const { data: bbData, isLoading: loading } = useApi(["buku-besar", filter.tahun, filter.bulan], qs);
  const data = bbData?.data || [];

  const detailQs = selectedAkun ? `/keuangan/accounting/buku-besar/${selectedAkun.id}?tahun=${filter.tahun}&bulan=${filter.bulan}` : null;
  const { data: detailData, isLoading: loadingDetail } = useApi(
    selectedAkun ? ["buku-besar-detail", selectedAkun.id, filter.tahun, filter.bulan] : ["buku-besar-detail"],
    detailQs,
    { enabled: !!selectedAkun }
  );

  const toggleGroup = (key) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  const TAHUN_AKIR = now.getFullYear() + 1;
  const tahunOptions = Array.from({ length: 5 }, (_, i) => TAHUN_AKIR - 4 + i);

  const grouped = data.reduce((acc, item) => {
    const group = JENIS_LABEL[item.jenis] || item.jenis;
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {});

  const bgColor = (saldo, kelompok) => {
    if (Math.abs(parseFloat(saldo)) < 0.01) return {};
    if (kelompok === "kredit") return { color: "#166534" };
    if (kelompok === "debit") return { color: "#991B1B" };
    return { color: parseFloat(saldo) >= 0 ? "#166534" : "#991B1B" };
  };

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>Buku Besar</h1>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>Saldo awal, mutasi, dan saldo akhir per akun perkiraan.</p>
      </div>

      <div className="card" style={{ padding: "16px 20px", marginBottom: "16px" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "end" }}>
          <div>
            <label className="form-label">Tahun</label>
            <select className="form-input" value={filter.tahun} onChange={e => setFilter(f => ({ ...f, tahun: parseInt(e.target.value) }))}>
              {tahunOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Bulan</label>
            <select className="form-input" value={filter.bulan} onChange={e => setFilter(f => ({ ...f, bulan: e.target.value }))}>
              {BULAN.map((b, i) => <option key={i+1} value={String(i+1).padStart(2,"0")}>{b}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" style={{ background: "#2563EB" }}>Tampilkan</button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8" }}>Memuat...</div>
      ) : (
        Object.entries(grouped).map(([groupLabel, items]) => {
          const groupKey = groupLabel;
          const isOpen = expandedGroups[groupKey] !== false;
          return (
            <div key={groupLabel} style={{ marginBottom: "16px" }}>
              <div
                onClick={() => toggleGroup(groupKey)}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", padding: "8px 12px", background: "#F1F5F9", borderRadius: "6px 6px 0 0", borderBottom: isOpen ? "1px solid #E2E8F0" : "none" }}
              >
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>{groupLabel}</span>
                <span style={{ fontSize: "16px", color: "#64748B" }}>{isOpen ? "▴" : "▾"}</span>
              </div>
              {isOpen && (
                <div className="card" style={{ padding: 0, borderRadius: "0 0 6px 6px" }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: "80px" }}>Kode</th>
                        <th>Nama Akun</th>
                        <th style={{ textAlign: "right", width: "130px" }}>Saldo Awal</th>
                        <th style={{ textAlign: "right", width: "110px" }}>Mutasi Debit</th>
                        <th style={{ textAlign: "right", width: "110px" }}>Mutasi Kredit</th>
                        <th style={{ textAlign: "right", width: "130px" }}>Saldo Akhir</th>
                        <th style={{ width: "80px", textAlign: "center" }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(akun => (
                        <tr key={akun.id}>
                          <td style={{ fontFamily: "ui-monospace", fontSize: "13px", fontWeight: "600" }}>{akun.kode}</td>
                          <td style={{ fontSize: "13px" }}>{akun.nama}</td>
                          <td style={{ fontSize: "13px", textAlign: "right", fontFamily: "ui-monospace" }}>{formatRp(akun.saldo_awal)}</td>
                          <td style={{ fontSize: "13px", textAlign: "right", fontFamily: "ui-monospace", color: "#166534" }}>{parseFloat(akun.mutasi_debit) > 0 ? formatRp(akun.mutasi_debit) : "-"}</td>
                          <td style={{ fontSize: "13px", textAlign: "right", fontFamily: "ui-monospace", color: "#991B1B" }}>{parseFloat(akun.mutasi_kredit) > 0 ? formatRp(akun.mutasi_kredit) : "-"}</td>
                          <td style={{ fontSize: "13px", textAlign: "right", fontFamily: "ui-monospace", fontWeight: "600", ...bgColor(akun.saldo_akhir, akun.kelompok) }}>
                            {formatRp(akun.saldo_akhir)}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button className="btn btn-ghost" style={{ fontSize: "11px", padding: "2px 8px", color: "#2563EB" }} onClick={() => setSelectedAkun(akun)}>Detail</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })
      )}

      {selectedAkun && (
        <Modal title={`Buku Besar — ${selectedAkun.kode} ${selectedAkun.nama}`} onClose={() => setSelectedAkun(null)} wide>
          {loadingDetail ? (
            <div style={{ padding: "32px", textAlign: "center", color: "#94A3B8" }}>Memuat...</div>
          ) : detailData ? (
            (() => {
              const dd = detailData?.data || detailData;
              return (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "16px" }}>
                {[
                  { label: "Saldo Awal", value: formatRp(dd.saldo_awal) },
                  { label: "Total Debit", value: formatRp(dd.mutasi_debit), color: "#166534" },
                  { label: "Total Kredit", value: formatRp(dd.mutasi_kredit), color: "#991B1B" },
                  { label: "Saldo Akhir", value: formatRp(dd.saldo_akhir), fontWeight: "700", color: "#1E293B" },
                ].map((item, i) => (
                  <div key={i} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "10px 14px" }}>
                    <div style={{ fontSize: "11px", color: "#64748B", fontWeight: "600", textTransform: "uppercase" }}>{item.label}</div>
                    <div style={{ fontSize: "15px", fontFamily: "ui-monospace", fontWeight: item.fontWeight || "600", color: item.color || "#1E293B", marginTop: "2px" }}>{item.value}</div>
                  </div>
                ))}
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F8FAFC" }}>
                    <th style={{ padding: "6px 8px", fontSize: "11px", borderBottom: "1px solid #E2E8F0" }}>Tanggal</th>
                    <th style={{ padding: "6px 8px", fontSize: "11px", borderBottom: "1px solid #E2E8F0" }}>Nomor Jurnal</th>
                    <th style={{ padding: "6px 8px", fontSize: "11px", borderBottom: "1px solid #E2E8F0" }}>Keterangan</th>
                    <th style={{ padding: "6px 8px", fontSize: "11px", textAlign: "right", borderBottom: "1px solid #E2E8F0" }}>Debit</th>
                    <th style={{ padding: "6px 8px", fontSize: "11px", textAlign: "right", borderBottom: "1px solid #E2E8F0" }}>Kredit</th>
                    <th style={{ padding: "6px 8px", fontSize: "11px", textAlign: "right", borderBottom: "1px solid #E2E8F0" }}>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {dd.details?.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: "center", color: "#94A3B8", padding: "24px", fontSize: "13px" }}>Tidak ada transaksi pada periode ini.</td></tr>
                  ) : (
                    <>
                      <tr key="saldo-awal" style={{ background: "#EFF6FF" }}>
                        <td colSpan="3" style={{ padding: "6px 8px", fontSize: "12px", fontStyle: "italic", color: "#475569" }}>Saldo Awal</td>
                        <td style={{ padding: "6px 8px" }}></td>
                        <td style={{ padding: "6px 8px" }}></td>
                        <td style={{ padding: "6px 8px", fontSize: "13px", textAlign: "right", fontFamily: "ui-monospace", fontWeight: "600", color: "#475569" }}>{formatRp(dd.saldo_awal)}</td>
                      </tr>
                      {dd.details?.map((d, i) => (
                        <tr key={d.id ?? i} style={{ borderBottom: "1px solid #F1F5F9" }}>
                          <td style={{ padding: "6px 8px", fontSize: "12px", color: "#64748B" }}>{formatDate(d.tanggal)}</td>
                          <td style={{ padding: "6px 8px", fontSize: "12px", fontFamily: "ui-monospace" }}>{d.nomor}</td>
                          <td style={{ padding: "6px 8px", fontSize: "12px", color: "#475569" }}>{d.keterangan || d.keterangan_detail || "-"}</td>
                          <td style={{ padding: "6px 8px", fontSize: "12px", textAlign: "right", fontFamily: "ui-monospace" }}>{parseFloat(d.debit) > 0 ? formatRp(d.debit) : ""}</td>
                          <td style={{ padding: "6px 8px", fontSize: "12px", textAlign: "right", fontFamily: "ui-monospace" }}>{parseFloat(d.kredit) > 0 ? formatRp(d.kredit) : ""}</td>
                          <td style={{ padding: "6px 8px", fontSize: "12px", textAlign: "right", fontFamily: "ui-monospace" }}>{formatRp(d.saldo_run)}</td>
                        </tr>
                      ))}
                      <tr key="saldo-akhir" style={{ background: "#F0FDF4", fontWeight: "600" }}>
                        <td colSpan="3" style={{ padding: "8px", fontSize: "12px" }}>Saldo Akhir</td>
                        <td style={{ padding: "8px", fontSize: "13px", textAlign: "right", fontFamily: "ui-monospace" }}>{formatRp(dd.mutasi_debit)}</td>
                        <td style={{ padding: "8px", fontSize: "13px", textAlign: "right", fontFamily: "ui-monospace" }}>{formatRp(dd.mutasi_kredit)}</td>
                        <td style={{ padding: "8px", fontSize: "13px", textAlign: "right", fontFamily: "ui-monospace" }}>{formatRp(dd.saldo_akhir)}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </>
              );
            })()
          ) : null}
        </Modal>
      )}
    </div>
  );
}
