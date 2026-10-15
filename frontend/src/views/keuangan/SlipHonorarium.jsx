import React, { useState, useEffect, useCallback } from "react";

async function api(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/auth/login";
    return null;
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Error ${res.status}`);
  }
  return res;
}

function formatRp(n) {
  return `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
}

function bulanIndo(n) {
  return ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"][n];
}

function tipeLabel(tipe) {
  return tipe === "ap_honor_surveior" ? "Surveior" : "Verifikator";
}

function tipeBadge(tipe) {
  const isS = tipe === "ap_honor_surveior";
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: "9999px",
      fontSize: "11px", fontWeight: "600",
      background: isS ? "#EDE9F6" : "#FEF3C7",
      color: isS ? "#5E35B1" : "#92400E",
    }}>
      {isS ? "Surveior" : "Verifikator"}
    </span>
  );
}

function statusBadge(status) {
  const map = {
    lunas: { label: "Lunas", bg: "#DCFCE7", color: "#166534" },
    belum_dibayar: { label: "Belum Dibayar", bg: "#FEF9C3", color: "#854D0E" },
    sebagian: { label: "Sebagian", bg: "#EDE9F6", color: "#5E35B1" },
  };
  const s = map[status] || { label: status, bg: "#F1F5F9", color: "#475569" };
  return (
    <span style={{ display: "inline-block", padding: "1px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "600", background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function Ac7Box({ ac7, size = "normal" }) {
  const isValid = ac7.valid;
  const bg = isValid ? "#DCFCE7" : "#FEE2E2";
  const border = isValid ? "#BBF7D0" : "#FECACA";
  const textColor = isValid ? "#166534" : "#991B1B";

  if (size === "small") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: "4px",
        padding: "2px 8px", borderRadius: "9999px", fontSize: "10px", fontWeight: "700",
        background: bg, color: textColor,
      }}>
        {isValid ? "✓ AC-7" : "! SELISIH"}
      </span>
    );
  }

  return (
    <div style={{
      padding: "12px 16px", borderRadius: "10px", background: bg,
      border: `2px solid ${border}`, marginTop: "12px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
        <span style={{ fontSize: "11px", fontWeight: "800", color: textColor, letterSpacing: "0.05em" }}>
          {isValid ? "✓ VERIFIKASI AC-7 LULUS" : "✕ SELISIH PADA AC-7"}
        </span>
        <span style={{ marginLeft: "auto", fontSize: "10px", fontWeight: "700", color: textColor }}>
          {ac7.persamaan}
        </span>
      </div>

      {/* Visual breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "6px" }}>
        {[
          { label: "BRUTO", value: formatRp(ac7.bruto || ac7.total_bruto), color: "#1E293B", bg: "#fff" },
          { label: "− PPN", value: formatRp(ac7.ppn || 0), color: "#92400E", bg: "#fff" },
          { label: "− PPh 21", value: formatRp(ac7.pph || 0), color: "#92400E", bg: "#fff" },
          { label: "=", value: "=", color: "#475569", bg: "#fff" },
          { label: "NETO", value: formatRp(ac7.neto_tersimpan || ac7.total_neto), color: "#166534", bg: isValid ? "#DCFCE7" : "#FEE2E2" },
        ].map(c => (
          <div key={c.label} style={{ background: c.bg, borderRadius: "6px", padding: "8px 6px", textAlign: "center" }}>
            <div style={{ fontSize: "8px", fontWeight: "700", color: "#94A3B8", letterSpacing: "0.05em" }}>{c.label}</div>
            <div style={{ fontSize: "13px", fontWeight: "700", color: c.color, marginTop: "2px" }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "8px", fontSize: "11px", color: textColor, fontStyle: "italic" }}>
        Rumus: <strong>{ac7.rumus}</strong>
        {!isValid && <span style={{ marginLeft: "12px" }}>Selisih: <strong>{formatRp(Math.abs(ac7.selisih))}</strong></span>}
      </div>
    </div>
  );
}

function SlipRow({ slip, onClick }) {
  return (
    <tr onClick={onClick} style={{ cursor: "pointer" }}>
      <td>
        <div style={{ fontWeight: "600", color: "#1E293B", fontSize: "13px" }}>{slip.nama}</div>
        <div style={{ fontSize: "11px", color: "#94A3B8" }}>{slip.npwp || slip.nik || "—"}</div>
      </td>
      <td>
        <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "9999px", fontSize: "11px", fontWeight: "600", background: "#F1F5F9", color: "#475569" }}>
          {slip.peran || "—"}
        </span>
      </td>
      <td style={{ textAlign: "center", color: "#475569", fontSize: "12px" }}>
        {slip.jumlah_penugasan}
        <div style={{ fontSize: "10px", color: "#94A3B8" }}>
          {slip.jumlah_survei}S · {slip.jumlah_verifikasi}V
        </div>
      </td>
      <td style={{ textAlign: "right", fontWeight: "500", color: "#1E293B", whiteSpace: "nowrap", fontSize: "12px" }}>
        {formatRp(slip.total_bruto)}
      </td>
      <td style={{ textAlign: "right", color: "#92400E", whiteSpace: "nowrap", fontSize: "12px" }}>
        {formatRp(slip.total_potongan_ppn)}
      </td>
      <td style={{ textAlign: "right", color: "#92400E", whiteSpace: "nowrap", fontSize: "12px" }}>
        {formatRp(slip.total_potongan_pph)}
      </td>
      <td style={{ textAlign: "right", fontWeight: "700", color: "#166534", whiteSpace: "nowrap", fontSize: "12px" }}>
        {formatRp(slip.total_neto)}
      </td>
      <td>
        <Ac7Box ac7={slip.ac7_total} size="small" />
      </td>
      <td>
        <button style={{ background: "none", border: "none", cursor: "pointer", color: "#4F46E5", fontSize: "11px", fontWeight: "600", padding: "2px 6px" }}>
          Slip →
        </button>
      </td>
    </tr>
  );
}

function SlipDetailModal({ tenagaAhliId, periode, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api(`/ledger/slip-honor/${tenagaAhliId}?periode=${periode}`)
      .then(r => r.json())
      .then(d => { setData(d.data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [tenagaAhliId, periode]);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: "20px",
    }}>
      <div style={{
        background: "#fff", borderRadius: "12px", maxWidth: "800px", width: "100%",
        maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontWeight: "700", fontSize: "14px", color: "#1E293B" }}>Slip Honorarium</div>
              {data && (
                <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                  {data.tenaga_ahli.nama} — {data.tenaga_ahli.npwp ? `NPWP: ${data.tenaga_ahli.npwp}` : `NIK: ${data.tenaga_ahli.nik}`}
                </div>
              )}
              {data && (
                <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>
                  {data.tenaga_ahli.nama_pajak || data.tenaga_ahli.nama}
                  {data.tenaga_ahli.alamat_pajak ? ` · ${data.tenaga_ahli.alamat_pajak}` : ""}
                </div>
              )}
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: "#94A3B8", padding: "4px 8px" }}>✕</button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8" }}>Memuat...</div>
        ) : error ? (
          <div style={{ padding: "20px", color: "#991B1B" }}>{error}</div>
        ) : (
          <>
            <div style={{ flex: 1, overflow: "auto", padding: "20px" }}>
              {/* Periode badge */}
              <div style={{ marginBottom: "16px" }}>
                <span style={{ display: "inline-block", padding: "4px 12px", borderRadius: "9999px", fontSize: "12px", fontWeight: "700", background: "#4F46E5", color: "#fff" }}>
                  Periode {data.periode}
                </span>
                <span style={{ marginLeft: "8px", fontSize: "12px", color: "#64748B" }}>
                  {data.entries.length} penugasan
                </span>
              </div>

              {/* Entries table */}
              <div style={{ marginBottom: "20px" }}>
                <table className="data-table" style={{ fontSize: "12px" }}>
                  <thead>
                    <tr>
                      <th>Jenis</th>
                      <th>Faskes / Siklus</th>
                      <th style={{ textAlign: "right" }}>Bruto</th>
                      <th style={{ textAlign: "right" }}>−PPN</th>
                      <th style={{ textAlign: "right" }}>−PPh</th>
                      <th style={{ textAlign: "right" }}>= Neto</th>
                      <th>AC-7</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.entries.map(e => (
                      <tr key={e.id}>
                        <td>{tipeBadge(e.tipe)}</td>
                        <td style={{ color: "#475569", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis" }}>
                          <div style={{ fontWeight: "500", color: "#1E293B" }}>{e.faskes_nama || "—"}</div>
                          <div style={{ fontSize: "10px", color: "#94A3B8" }}>{e.siklus_nama || "—"}</div>
                        </td>
                        <td style={{ textAlign: "right", fontWeight: "600", whiteSpace: "nowrap" }}>{formatRp(e.nominal_bruto)}</td>
                        <td style={{ textAlign: "right", color: "#92400E", whiteSpace: "nowrap" }}>{formatRp(e.potongan_ppn)}</td>
                        <td style={{ textAlign: "right", color: "#92400E", whiteSpace: "nowrap" }}>{formatRp(e.potongan_pph)}</td>
                        <td style={{ textAlign: "right", fontWeight: "700", color: "#166534", whiteSpace: "nowrap" }}>{formatRp(e.nominal_neto)}</td>
                        <td><Ac7Box ac7={e.ac7} size="small" /></td>
                        <td>{statusBadge(e.status_pembayaran)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#F8FAFC", fontWeight: "700" }}>
                      <td colSpan="2" style={{ textAlign: "right", color: "#475569", fontSize: "11px" }}>TOTAL</td>
                      <td style={{ textAlign: "right", fontWeight: "700", color: "#1E293B" }}>{formatRp(data.total.bruto)}</td>
                      <td style={{ textAlign: "right", fontWeight: "600", color: "#92400E" }}>{formatRp(data.total.potongan_ppn)}</td>
                      <td style={{ textAlign: "right", fontWeight: "600", color: "#92400E" }}>{formatRp(data.total.potongan_pph)}</td>
                      <td style={{ textAlign: "right", fontWeight: "800", color: "#166534" }}>{formatRp(data.total.neto)}</td>
                      <td colSpan="2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* AC-7 total verification */}
              <Ac7Box ac7={data.ac7} />

              {/* Tariff snapshot */}
              {data.entries[0]?.tarif_snapshot && (
                <div style={{ marginTop: "16px", background: "#F8FAFC", borderRadius: "8px", padding: "12px", fontSize: "11px", color: "#64748B" }}>
                  <div style={{ fontWeight: "700", color: "#475569", marginBottom: "6px" }}>SNAPSHOT TARIF (saat entry dibuat)</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                    {[
                      { label: "PPN", val: data.entries[0].tarif_snapshot.ppn },
                      { label: "PPh 21", val: data.entries[0].tarif_snapshot.pph },
                    ].map(s => (
                      <div key={s.label} style={{ background: "#fff", borderRadius: "6px", padding: "8px" }}>
                        <div style={{ fontSize: "10px", fontWeight: "600", color: "#94A3B8" }}>{s.label}</div>
                        <div style={{ fontSize: "13px", fontWeight: "700", color: "#1E293B" }}>
                          {s.val ? `${s.val.tarif_persen}% (sejak ${s.val.berlaku_sejak})` : "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function SlipHonorarium() {
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [bulan, setBulan] = useState(new Date().getMonth() + 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSlip, setSelectedSlip] = useState(null);

  const periode = `${tahun}-${String(bulan).padStart(2, "0")}`;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api(`/ledger/slip-honor?periode=${periode}`);
      const d = await res.json();
      setData(d.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [periode]);

  useEffect(() => { loadData(); }, [loadData]);

  const TAHUN_OPTIONS = [2024, 2025, 2026, 2027];

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#1E293B" }}>Slip Honorarium</h1>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
          Rincian bruto / PPN / PPh / neto per tenaga ahli · PRD AC-7
        </p>
      </div>

      {/* Filter */}
      <div className="card" style={{ padding: "16px 20px", marginBottom: "20px", display: "flex", gap: "12px", alignItems: "flex-end" }}>
        <div>
          <label style={{ fontSize: "11px", fontWeight: "600", color: "#64748B", display: "block", marginBottom: "4px" }}>Tahun</label>
          <select className="form-input" value={tahun} onChange={e => setTahun(Number(e.target.value))} style={{ width: "110px" }}>
            {TAHUN_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: "11px", fontWeight: "600", color: "#64748B", display: "block", marginBottom: "4px" }}>Bulan</label>
          <select className="form-input" value={bulan} onChange={e => setBulan(Number(e.target.value))} style={{ width: "150px" }}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{bulanIndo(m)}</option>
            ))}
          </select>
        </div>
        <button onClick={loadData} className="btn btn-primary" style={{ height: "38px" }}>
          Lihat Data
        </button>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", background: "#FEE2E2", color: "#991B1B", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: "60px", textAlign: "center", color: "#94A3B8" }}>Memuat...</div>
      ) : (
        <>
          {/* Summary */}
          {data && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "20px" }}>
              {[
                { label: "Periode", value: `${bulanIndo(bulan)} ${tahun}`, tone: "default" },
                { label: "Jumlah TA", value: data.jumlah_tenaga_ahli, tone: "info" },
                { label: "Total Bruto", value: formatRp(data.total_bruto), tone: "default" },
                { label: "Total PPN", value: formatRp(data.total_potongan_ppn), tone: "warn" },
                { label: "Total PPh", value: formatRp(data.total_potongan_pph), tone: "warn" },
                { label: "Total Neto", value: formatRp(data.total_neto), tone: "success" },
              ].map((c, i) => (
                <div key={i} style={{
                  background: c.tone === "success" ? "#DCFCE7" : c.tone === "warn" ? "#FEF9C3" : c.tone === "info" ? "#EDE9F6" : "#fff",
                  borderRadius: "8px", padding: "14px 16px",
                  border: `1px solid ${c.tone === "success" ? "#BBF7D0" : c.tone === "warn" ? "#FDE68A" : c.tone === "info" ? "#D1C4E9" : "#E2E8F0"}`,
                }}>
                  <div style={{ fontSize: "10px", fontWeight: "600", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>{c.label}</div>
                  <div style={{ fontSize: "15px", fontWeight: "700", color: c.tone === "success" ? "#166534" : "#1E293B", marginTop: "4px" }}>{c.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Table */}
          <div className="card" style={{ padding: 0 }}>
            {data?.slips?.length === 0 ? (
              <div style={{ padding: "60px", textAlign: "center", color: "#94A3B8", fontSize: "13px" }}>
                Tidak ada slip honorarium untuk periode ini.
              </div>
            ) : (
              <div className="table-container" style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tenaga Ahli</th>
                      <th>Peran</th>
                      <th style={{ textAlign: "center" }}>Jml Tug.</th>
                      <th style={{ textAlign: "right" }}>Bruto</th>
                      <th style={{ textAlign: "right" }}>− PPN</th>
                      <th style={{ textAlign: "right" }}>− PPh 21</th>
                      <th style={{ textAlign: "right" }}>= Neto</th>
                      <th>AC-7</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.slips?.map(slip => (
                      <SlipRow
                        key={slip.tenaga_ahli_id}
                        slip={slip}
                        onClick={() => setSelectedSlip(slip)}
                      />
                    ))}
                  </tbody>
                  {data?.slips?.length > 0 && (
                    <tfoot>
                      <tr style={{ background: "#F8FAFC" }}>
                        <td colSpan="3" style={{ textAlign: "right", fontWeight: "700", color: "#475569", fontSize: "11px" }}>GRAND TOTAL</td>
                        <td style={{ textAlign: "right", fontWeight: "800", color: "#1E293B" }}>{formatRp(data.total_bruto)}</td>
                        <td style={{ textAlign: "right", fontWeight: "600", color: "#92400E" }}>{formatRp(data.total_potongan_ppn)}</td>
                        <td style={{ textAlign: "right", fontWeight: "600", color: "#92400E" }}>{formatRp(data.total_potongan_pph)}</td>
                        <td style={{ textAlign: "right", fontWeight: "800", color: "#166534" }}>{formatRp(data.total_neto)}</td>
                        <td colSpan="2"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {selectedSlip && (
        <SlipDetailModal
          tenagaAhliId={selectedSlip.tenaga_ahli_id}
          periode={periode}
          onClose={() => setSelectedSlip(null)}
        />
      )}
    </div>
  );
}
