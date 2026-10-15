import React, { useState, useEffect } from "react";

async function api(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, { ...options, headers });
  if (res.status === 401) { localStorage.removeItem("token"); window.location.href = "/auth/login"; return null; }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || `API error: ${res.status}`);
  return body;
}

function formatRp(n) {
  return `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
}

function Modal({ title, children, onClose, wide }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
      <div style={{ background: "#fff", borderRadius: "8px", maxWidth: wide ? "900px" : "560px", width: "95vw", maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "600" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#64748B" }}>×</button>
        </div>
        <div style={{ padding: "20px" }}>{children}</div>
      </div>
    </div>
  );
}

/**
 * props: {
 *   type: 'bkm' | 'bkk' | 'kkm' | 'kkk',
 *   title: string,
 *   subtitle: string,
 *   color: { bg, border, badge, badgeText, accent },
 *   icon: string,
 *   jenis: string,
 * }
 */
export default function KasBankForm({ type, title, subtitle, color, icon, jenis }) {
  const [coaList, setCoaList] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form fields
  const [form, setForm] = useState({
    tanggal: new Date().toISOString().split("T")[0],
    ref: "",                          // Nomor referensi manual
    akun_kas_bank: "",               // Type: akun Kas/Bank yang dipilih
    details: [{ coa_id: "", deskripsi: "", nominal: 0 }], // Baris detail
    keterangan: "",
  });

  // ── Load COA + history ──────────────────────────────────────────────────
  const load = () => {
    setLoading(true);
    Promise.all([
      api("/keuangan/accounting/coa"),
      api(`/keuangan/accounting/jurnal?kategori_jenis=${type}`),
    ]).then(([coaData, jurnalData]) => {
      setCoaList(coaData?.data || []);
      setRecords((jurnalData?.data || []).slice(0, 50));
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  // ── Akun dropdown options ──────────────────────────────────────────────
  const bankAccounts = coaList.filter(a =>
    a.jenis === "aktiva_lancar" && a.kode.match(/^110[1-4]/)
  );
  const counterpartAccounts = coaList;

  // ── Detail row helpers ──────────────────────────────────────────────────
  const updateDetail = (i, field, val) => {
    const rows = [...form.details];
    rows[i][field] = val;
    setForm(f => ({ ...f, details: rows }));
  };
  const addDetail = () => setForm(f => ({ ...f, details: [...f.details, { coa_id: "", deskripsi: "", nominal: 0 }] }));
  const removeDetail = (i) => setForm(f => ({ ...f, details: f.details.filter((_, idx) => idx !== i) }));

  const totalNominal = form.details.reduce((s, r) => s + (parseFloat(r.nominal) || 0), 0);

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!form.akun_kas_bank) { setFormError("Type (Akun Kas/Bank) wajib dipilih."); return; }
    const validDetails = form.details.filter(r => r.coa_id && parseFloat(r.nominal) > 0);
    if (validDetails.length === 0) { setFormError("Minimal 1 baris detail dengan akun dan nominal."); return; }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("jenis", type);
      fd.append("tanggal", form.tanggal);
      fd.append("ref", form.ref || "");
      fd.append("akun_kas_bank", form.akun_kas_bank);
      fd.append("keterangan", form.keterangan || "");
      // details[].nominal: semua amounts di satu sisi sesuai jenis (KREDIT=BKM/KKM, DEBIT=BKK/KKK)
      validDetails.forEach((r, i) => {
        fd.append(`details[${i}][coa_id]`, r.coa_id);
        fd.append(`details[${i}][nominal]`, r.nominal);
        fd.append(`details[${i}][keterangan]`, r.deskripsi || "");
      });

      const res = await fetch("/api/keuangan/accounting/auto-jurnal", {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: fd,
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Gagal menyimpan.");

      setSuccessMsg(`${jenis} berhasil direkam — ${body.data.nomor}`);
      setShowForm(false);
      setForm({
        tanggal: new Date().toISOString().split("T")[0],
        ref: "",
        akun_kas_bank: "",
        details: [{ coa_id: "", deskripsi: "", nominal: 0 }],
        keterangan: "",
      });
      setTimeout(() => setSuccessMsg(""), 5000);
      load();
    } catch (err) {
      setFormError(err.message);
      setSubmitting(false);
    }
  };

  const openNew = () => {
    setForm({
      tanggal: new Date().toISOString().split("T")[0],
      ref: "",
      akun_kas_bank: "",
      details: [{ coa_id: "", deskripsi: "", nominal: 0 }],
      keterangan: "",
    });
    setFormError("");
    setShowForm(true);
  };

  const isDebit = ["bkm", "kkm"].includes(type);
  const selectedBank = bankAccounts.find(a => a.id === form.akun_kas_bank);

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ fontSize: "22px" }}>{icon}</span>
            <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>{title}</h1>
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: "#64748B" }}>{subtitle}</p>
        </div>
        <button className="btn btn-primary" onClick={openNew} style={{ background: color.accent }}>
          + Entri {jenis}
        </button>
      </div>

      {/* ── Success message ─────────────────────────────────────────────── */}
      {successMsg && (
        <div style={{ background: "#DCFCE7", color: "#166534", padding: "10px 16px", borderRadius: "6px", marginBottom: "16px", fontSize: "13px", border: "1px solid #BBF7D0" }}>
          <strong>Berhasil!</strong> {successMsg}
        </div>
      )}

      {/* ── Tabel history ──────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: "140px" }}>Nomor</th>
              <th style={{ width: "100px" }}>Tanggal</th>
              <th>Akun Kas/Bank</th>
              <th>Keterangan</th>
              <th style={{ width: "130px", textAlign: "right" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ textAlign: "center", color: "#94A3B8", padding: "32px" }}>Memuat...</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: "center", color: "#94A3B8", padding: "32px" }}>Belum ada data {jenis}.</td></tr>
            ) : records.map(r => (
              <tr key={r.id}>
                <td>
                  <span style={{ fontFamily: "ui-monospace", fontSize: "12px", fontWeight: "700" }}>{r.nomor}</span>
                  <span style={{ display: "inline-block", marginLeft: "6px", padding: "1px 5px", borderRadius: "9999px", fontSize: "10px", fontWeight: "700", background: color.bg, color: color.badgeText }}>
                    {type.toUpperCase()}
                  </span>
                </td>
                <td style={{ fontSize: "13px" }}>
                  {r.tanggal ? new Date(r.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-"}
                </td>
                <td style={{ fontSize: "12px" }}>
                  {r.details?.[0]?.coa?.kode} {r.details?.[0]?.coa?.nama}
                </td>
                <td style={{ fontSize: "12px", color: "#64748B" }}>{r.keterangan || "-"}</td>
                <td style={{ fontSize: "13px", textAlign: "right", fontFamily: "ui-monospace", fontWeight: "600" }}>
                  {formatRp(r.total_debit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Form Modal ─────────────────────────────────────────────────── */}
      {showForm && (
        <Modal title={`Entri ${jenis}`} onClose={() => setShowForm(false)} wide>
          <form onSubmit={handleSubmit}>
            {formError && (
              <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "8px 12px", borderRadius: "4px", marginBottom: "12px", fontSize: "13px" }}>
                {formError}
              </div>
            )}

            {/* ── Header fields ───────────────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              <div>
                <label className="form-label">Tanggal *</label>
                <input className="form-input" type="date" value={form.tanggal}
                  onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))} required />
              </div>
              <div>
                <label className="form-label">No. Referensi</label>
                <input className="form-input" value={form.ref}
                  onChange={e => setForm(f => ({ ...f, ref: e.target.value }))}
                  placeholder="mis. RV-2026-001" />
              </div>
              <div>
                <label className="form-label">Type — Akun Kas/Bank *</label>
                <select className="form-input" value={form.akun_kas_bank}
                  onChange={e => setForm(f => ({ ...f, akun_kas_bank: e.target.value }))} required>
                  <option value="">— Pilih Akun —</option>
                  {bankAccounts.map(a => (
                    <option key={a.id} value={a.id}>{a.kode} — {a.nama}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ── Detail table ────────────────────────────────────────── */}
            <div style={{ marginBottom: "8px", fontSize: "12px", fontWeight: "600", color: "#64748B" }}>
              Rincian — kas/bank akan di-{isDebit ? "DEBIT" : "KREDIT"} dari {selectedBank ? `${selectedBank.kode} ${selectedBank.nama}` : "akun yang dipilih"}
            </div>
            <div style={{ overflowX: "auto", marginBottom: "12px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #E2E8F0", borderRadius: "6px", overflow: "hidden" }}>
                <thead>
                  <tr style={{ background: "#F8FAFC" }}>
                    <th style={{ padding: "6px 10px", fontSize: "11px", textAlign: "left", borderBottom: "1px solid #E2E8F0", width: "40px" }}>#</th>
                    <th style={{ padding: "6px 10px", fontSize: "11px", textAlign: "left", borderBottom: "1px solid #E2E8F0", minWidth: "200px" }}>Akun Counterpart</th>
                    <th style={{ padding: "6px 10px", fontSize: "11px", textAlign: "left", borderBottom: "1px solid #E2E8F0" }}>Deskripsi / Keterangan</th>
                    <th style={{ padding: "6px 10px", fontSize: "11px", textAlign: "right", borderBottom: "1px solid #E2E8F0", width: "150px" }}>
                      {isDebit ? "KREDIT (Rp)" : "DEBIT (Rp)"}
                    </th>
                    <th style={{ padding: "6px 10px", fontSize: "11px", borderBottom: "1px solid #E2E8F0", width: "36px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {form.details.map((row, i) => (
                    <tr key={i}>
                      <td style={{ padding: "4px 8px", textAlign: "center", fontSize: "12px", color: "#94A3B8" }}>{i + 1}</td>
                      <td style={{ padding: "4px 4px" }}>
                        <select className="form-input" style={{ fontSize: "13px" }}
                          value={row.coa_id}
                          onChange={e => updateDetail(i, "coa_id", e.target.value)}>
                          <option value="">— Pilih Akun —</option>
                          {counterpartAccounts.filter(a => a.id !== form.akun_kas_bank).map(a => (
                            <option key={a.id} value={a.id}>{a.kode} — {a.nama}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: "4px 4px" }}>
                        <input className="form-input" style={{ fontSize: "13px" }}
                          value={row.deskripsi}
                          onChange={e => updateDetail(i, "deskripsi", e.target.value)}
                          placeholder="Keterangan baris..." />
                      </td>
                      <td style={{ padding: "4px 4px" }}>
                        <input className="form-input" style={{ fontSize: "13px", textAlign: "right", fontFamily: "ui-monospace" }}
                          type="text"
                          value={row.nominal > 0 ? row.nominal.toLocaleString("id-ID") : ""}
                          onChange={e => updateDetail(i, "nominal", parseInt(e.target.value.replace(/\D/g, "")) || 0)}
                          placeholder="0" />
                      </td>
                      <td style={{ padding: "4px 4px", textAlign: "center" }}>
                        {form.details.length > 1 && (
                          <button type="button" onClick={() => removeDetail(i)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#DC2626", fontSize: "16px" }}>×</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: isDebit ? "#FEF2F2" : "#F0FDF4", fontWeight: "700" }}>
                    <td colSpan="3" style={{ padding: "8px 10px", fontSize: "13px", textAlign: "right", color: "#475569" }}>
                      Kas/Bank — {selectedBank ? `${selectedBank.kode} ${selectedBank.nama}` : "—"} [{isDebit ? "DEBIT" : "KREDIT"}]
                    </td>
                    <td style={{ padding: "8px 10px", fontSize: "14px", textAlign: "right", fontFamily: "ui-monospace", color: "#1E293B" }}>
                      {formatRp(totalNominal)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <button type="button" onClick={addDetail}
              style={{ background: "none", border: "1px dashed #CBD5E1", borderRadius: "4px", padding: "5px 12px", fontSize: "12px", color: "#64748B", cursor: "pointer", width: "100%", marginBottom: "12px" }}>
              + Tambah Baris
            </button>

            <div style={{ marginBottom: "16px" }}>
              <label className="form-label">Keterangan / Catatan</label>
              <textarea className="form-input" rows={2} value={form.keterangan}
                onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))}
                placeholder="Catatan umum transaksi..." />
            </div>

            {/* ── Total & balance check ─────────────────────────────────── */}
            <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "16px", padding: "10px 14px", background: "#F8FAFC", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "11px", color: "#64748B" }}>Jumlah Baris</div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "#1E293B" }}>{form.details.filter(r => r.coa_id && r.nominal > 0).length} transaksi</div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "#64748B" }}>Total {isDebit ? "KREDIT" : "DEBIT"}</div>
                <div style={{ fontSize: "16px", fontWeight: "700", fontFamily: "ui-monospace", color: "#1E293B" }}>{formatRp(totalNominal)}</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Batal</button>
              <button type="submit" className="btn btn-primary" disabled={submitting} style={{ background: color.accent }}>
                {submitting ? "Menyimpan..." : `Simpan ${jenis}`}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
