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

function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const JENIS_COLOR = {
  adjustment:  { bg: "#EFF6FF", color: "#1D4ED8" },
  pemasukan:   { bg: "#DCFCE7", color: "#166534" },
  pengeluaran: { bg: "#FEE2E2", color: "#991B1B" },
  bkm:         { bg: "#F0FDF4", color: "#15803D" },
  bkk:         { bg: "#FEF2F2", color: "#B91C1C" },
  kkm:         { bg: "#F0FDF4", color: "#15803D" },
  kkk:         { bg: "#FEF2F2", color: "#B91C1C" },
};

function Modal({ title, children, onClose, wide }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
      <div style={{ background: "#fff", borderRadius: "8px", width: wide ? "720px" : "480px", maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "600" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#64748B" }}>×</button>
        </div>
        <div style={{ padding: "20px" }}>{children}</div>
      </div>
    </div>
  );
}

function JournalRow({ row, index, coaOptions, onChange, onRemove, errors }) {
  const update = (field, val) => onChange(index, field, val);

  return (
    <tr>
      <td style={{ width: "40px", textAlign: "center", fontSize: "12px", color: "#94A3B8" }}>{index + 1}</td>
      <td>
        <select
          className="form-input"
          value={row.coa_id || ""}
          onChange={e => update("coa_id", e.target.value)}
          style={{ fontSize: "13px" }}
        >
          <option value="">— Pilih Akun —</option>
          {coaOptions.map(c => (
            <option key={c.id} value={c.id}>{c.kode} — {c.nama}</option>
          ))}
        </select>
        {errors?.coa_id && <div style={{ fontSize: "11px", color: "#DC2626", marginTop: "2px" }}>{errors.coa_id}</div>}
      </td>
      <td style={{ width: "160px" }}>
        <input
          className="form-input"
          type="number"
          min="0"
          step="0.01"
          value={row.debit || ""}
          onChange={e => update("debit", e.target.value)}
          placeholder="0"
          style={{ fontSize: "13px", textAlign: "right" }}
        />
      </td>
      <td style={{ width: "160px" }}>
        <input
          className="form-input"
          type="number"
          min="0"
          step="0.01"
          value={row.kredit || ""}
          onChange={e => update("kredit", e.target.value)}
          placeholder="0"
          style={{ fontSize: "13px", textAlign: "right" }}
        />
      </td>
      <td>
        <input
          className="form-input"
          value={row.keterangan || ""}
          onChange={e => update("keterangan", e.target.value)}
          placeholder="Keterangan (opsional)"
          style={{ fontSize: "13px" }}
        />
      </td>
      <td style={{ width: "40px", textAlign: "center" }}>
        <button
          type="button"
          onClick={() => onRemove(index)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#DC2626", fontSize: "16px", padding: "2px" }}
        >×</button>
      </td>
    </tr>
  );
}

export default function AccountingJurnal() {
  const [jurnals, setJurnals] = useState([]);
  const [coaOptions, setCoaOptions] = useState([]);
  const [kategoriOptions, setKategoriOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [filter, setFilter] = useState({ tahun: new Date().getFullYear(), bulan: "" });
  const [form, setForm] = useState({ tanggal: new Date().toISOString().split("T")[0], kategori_id: "", keterangan: "", details: [{ coa_id: "", debit: "", kredit: "", keterangan: "" }] });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = async () => {
    setLoading(true);
    const [jData, cData, kData] = await Promise.all([
      api(`/keuangan/accounting/jurnal?tahun=${filter.tahun}${filter.bulan ? "&bulan=" + filter.bulan : ""}`),
      api("/keuangan/accounting/coa"),
      api("/keuangan/accounting/kategori"),
    ]);
    setJurnals(jData?.data || []);
    setCoaOptions(cData?.data || []);
    setKategoriOptions(kData?.data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [filter]);

  const totalDebit = () => form.details.reduce((s, r) => s + (parseFloat(r.debit) || 0), 0);
  const totalKredit = () => form.details.reduce((s, r) => s + (parseFloat(r.kredit) || 0), 0);
  const isBalanced = () => Math.abs(totalDebit() - totalKredit()) < 0.01;

  const updateRow = (i, field, val) => {
    const rows = [...form.details];
    if (field === "debit" && val) rows[i].kredit = "";
    if (field === "kredit" && val) rows[i].debit = "";
    rows[i][field] = val;
    setForm(f => ({ ...f, details: rows }));
  };

  const addRow = () => setForm(f => ({ ...f, details: [...f.details, { coa_id: "", debit: "", kredit: "", keterangan: "" }] }));
  const removeRow = (i) => setForm(f => ({ ...f, details: f.details.filter((_, idx) => idx !== i) }));

  const openNew = () => {
    setForm({ tanggal: new Date().toISOString().split("T")[0], kategori_id: kategoriOptions[0]?.id || "", keterangan: "", details: [{ coa_id: "", debit: "", kredit: "", keterangan: "" }] });
    setFormError(""); setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!form.kategori_id) { setFormError("Kategori wajib dipilih."); return; }
    const rows = form.details.filter(r => r.coa_id && (parseFloat(r.debit) > 0 || parseFloat(r.kredit) > 0));
    if (rows.length < 2) { setFormError("Minimal 2 baris dengan akun dan nominal."); return; }
    if (!isBalanced()) { setFormError("Total Debit harus sama dengan Total Kredit."); return; }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("tanggal", form.tanggal);
      fd.append("kategori_id", form.kategori_id);
      fd.append("keterangan", form.keterangan);
      rows.forEach((r, i) => {
        fd.append(`details[${i}][coa_id]`, r.coa_id);
        fd.append(`details[${i}][debit]`, r.debit || "0");
        fd.append(`details[${i}][kredit]`, r.kredit || "0");
        fd.append(`details[${i}][keterangan]`, r.keterangan || "");
      });

      const res = await fetch("/api/keuangan/accounting/jurnal", {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: fd,
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Gagal menyimpan");
      setShowForm(false);
      load();
    } catch (err) {
      setFormError(err.message);
      setSaving(false);
    }
  };

  const handleDelete = async (j) => {
    if (!window.confirm(`Hapus jurnal ${j.nomor}?`)) return;
    try {
      await api(`/keuangan/accounting/jurnal/${j.id}`, { method: "DELETE" });
      load();
    } catch (err) { alert(err.message); }
  };

  const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  const TAHUN_AKIR = new Date().getFullYear() + 1;
  const tahunOptions = Array.from({ length: 5 }, (_, i) => TAHUN_AKIR - 4 + i);

  return (
    <div>
      <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>Jurnal Umum</h1>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>Input transaksi non-survei — debit &amp; kredit harus seimbang.</p>
        </div>
        <button className="btn btn-primary" onClick={openNew} style={{ background: "#2563EB" }}>+ Entri Jurnal Baru</button>
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
              <option value="">Semua</option>
              {BULAN.map((b, i) => <option key={i+1} value={String(i+1).padStart(2,"0")}>{b}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: "140px" }}>Nomor</th>
              <th style={{ width: "100px" }}>Tanggal</th>
              <th style={{ width: "160px" }}>Kategori</th>
              <th>Keterangan</th>
              <th style={{ width: "120px", textAlign: "right" }}>Total Debit</th>
              <th style={{ width: "120px", textAlign: "right" }}>Total Kredit</th>
              <th style={{ width: "100px", textAlign: "center" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ textAlign: "center", color: "#94A3B8", padding: "32px" }}>Memuat...</td></tr>
            ) : jurnals.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: "center", color: "#94A3B8", padding: "32px" }}>Belum ada jurnal. Klik "Entri Jurnal Baru" untuk mulai.</td></tr>
            ) : jurnals.map(j => (
              <tr key={j.id}>
                <td>
                  <div style={{ fontFamily: "ui-monospace", fontSize: "12px", fontWeight: "700", color: "#1E293B" }}>{j.nomor}</div>
                  {j.kategori?.jenis && (
                    <span style={{ display: "inline-block", marginTop: "2px", padding: "1px 6px", borderRadius: "9999px", fontSize: "10px", fontWeight: "700", background: JENIS_COLOR[j.kategori.jenis]?.bg || "#F1F5F9", color: JENIS_COLOR[j.kategori.jenis]?.color || "#64748B", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {j.kategori.jenis.toUpperCase()}
                    </span>
                  )}
                </td>
                <td style={{ fontSize: "13px" }}>{formatDate(j.tanggal)}</td>
                <td>
                  <div style={{ fontSize: "13px" }}>{j.kategori?.nama || "-"}</div>
                </td>
                <td style={{ fontSize: "13px", color: "#475569" }}>{j.keterangan}</td>
                <td style={{ fontSize: "13px", textAlign: "right", fontFamily: "ui-monospace" }}>{formatRp(j.total_debit)}</td>
                <td style={{ fontSize: "13px", textAlign: "right", fontFamily: "ui-monospace" }}>{formatRp(j.total_kredit)}</td>
                <td style={{ textAlign: "center" }}>
                  <button className="btn btn-ghost" style={{ fontSize: "11px", padding: "2px 8px", color: "#2563EB" }} onClick={() => setShowDetail(j)}>Detail</button>
                  <button className="btn btn-ghost" style={{ fontSize: "11px", padding: "2px 8px", color: "#DC2626" }} onClick={() => handleDelete(j)}>Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title="Entri Jurnal Umum" onClose={() => setShowForm(false)} wide>
          <form onSubmit={handleSubmit}>
            {formError && <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "8px 12px", borderRadius: "4px", marginBottom: "12px", fontSize: "13px" }}>{formError}</div>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <div>
                <label className="form-label">Tanggal *</label>
                <input className="form-input" type="date" value={form.tanggal} onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))} required />
              </div>
              <div>
                <label className="form-label">Kategori *</label>
                <select className="form-input" value={form.kategori_id} onChange={e => setForm(f => ({ ...f, kategori_id: e.target.value }))}>
                  <option value="">— Pilih —</option>
                  {kategoriOptions.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Keterangan</label>
                <input className="form-input" value={form.keterangan} onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))} placeholder="Uraian transaksi" />
              </div>
            </div>

            <div style={{ marginBottom: "8px", fontSize: "12px", fontWeight: "600", color: "#64748B" }}>Rincian Jurnal</div>
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8px" }}>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  <th style={{ padding: "6px 8px", fontSize: "11px", textAlign: "center", borderBottom: "1px solid #E2E8F0", width: "40px" }}>#</th>
                  <th style={{ padding: "6px 8px", fontSize: "11px", borderBottom: "1px solid #E2E8F0" }}>Akun Perkiraan</th>
                  <th style={{ padding: "6px 8px", fontSize: "11px", textAlign: "right", borderBottom: "1px solid #E2E8F0", width: "120px" }}>Debit</th>
                  <th style={{ padding: "6px 8px", fontSize: "11px", textAlign: "right", borderBottom: "1px solid #E2E8F0", width: "120px" }}>Kredit</th>
                  <th style={{ padding: "6px 8px", fontSize: "11px", borderBottom: "1px solid #E2E8F0" }}>Keterangan</th>
                  <th style={{ padding: "6px 8px", fontSize: "11px", borderBottom: "1px solid #E2E8F0", width: "36px" }}></th>
                </tr>
              </thead>
              <tbody>
                {form.details.map((row, i) => (
                  <JournalRow key={i} row={row} index={i} coaOptions={coaOptions} onChange={updateRow} onRemove={removeRow} />
                ))}
              </tbody>
            </table>

            <button type="button" onClick={addRow} style={{ background: "none", border: "1px dashed #CBD5E1", borderRadius: "4px", padding: "6px 12px", fontSize: "12px", color: "#64748B", cursor: "pointer", width: "100%", marginBottom: "12px" }}>+ Tambah Baris</button>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginBottom: "16px", padding: "10px 12px", background: isBalanced() ? "#F0FDF4" : "#FEF2F2", borderRadius: "4px" }}>
              <div>
                <span style={{ fontSize: "11px", color: "#64748B" }}>Total Debit: </span>
                <span style={{ fontFamily: "ui-monospace", fontSize: "14px", fontWeight: "700" }}>{formatRp(totalDebit())}</span>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "#64748B" }}>Total Kredit: </span>
                <span style={{ fontFamily: "ui-monospace", fontSize: "14px", fontWeight: "700" }}>{formatRp(totalKredit())}</span>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: isBalanced() ? "#166534" : "#991B1B" }}>{isBalanced() ? "✓ Seimbang" : "✗ Tidak Seimbang"}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Batal</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Menyimpan..." : "Simpan Jurnal"}</button>
            </div>
          </form>
        </Modal>
      )}

      {showDetail && (
        <Modal title={`Jurnal ${showDetail.nomor}`} onClose={() => setShowDetail(null)} wide>
          <div style={{ marginBottom: "12px", fontSize: "13px", color: "#475569" }}>
            <strong>Tanggal:</strong> {formatDate(showDetail.tanggal)} &nbsp;|&nbsp;
            <strong>Kategori:</strong> {showDetail.kategori?.nama || "-"} &nbsp;|&nbsp;
            <strong>Keterangan:</strong> {showDetail.keterangan || "-"}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                <th style={{ padding: "6px 8px", fontSize: "11px", borderBottom: "1px solid #E2E8F0" }}>Kode</th>
                <th style={{ padding: "6px 8px", fontSize: "11px", borderBottom: "1px solid #E2E8F0" }}>Akun</th>
                <th style={{ padding: "6px 8px", fontSize: "11px", textAlign: "right", borderBottom: "1px solid #E2E8F0" }}>Debit</th>
                <th style={{ padding: "6px 8px", fontSize: "11px", textAlign: "right", borderBottom: "1px solid #E2E8F0" }}>Kredit</th>
                <th style={{ padding: "6px 8px", fontSize: "11px", borderBottom: "1px solid #E2E8F0" }}>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {showDetail.details?.map((d, i) => (
                <tr key={i}>
                  <td style={{ padding: "6px 8px", fontSize: "13px", fontFamily: "ui-monospace" }}>{d.coa?.kode}</td>
                  <td style={{ padding: "6px 8px", fontSize: "13px" }}>{d.coa?.nama}</td>
                  <td style={{ padding: "6px 8px", fontSize: "13px", textAlign: "right", fontFamily: "ui-monospace" }}>{parseFloat(d.debit) > 0 ? formatRp(d.debit) : ""}</td>
                  <td style={{ padding: "6px 8px", fontSize: "13px", textAlign: "right", fontFamily: "ui-monospace" }}>{parseFloat(d.kredit) > 0 ? formatRp(d.kredit) : ""}</td>
                  <td style={{ padding: "6px 8px", fontSize: "13px", color: "#64748B" }}>{d.keterangan || "-"}</td>
                </tr>
              ))}
              <tr style={{ background: "#F8FAFC", fontWeight: "600" }}>
                <td colSpan="2" style={{ padding: "8px", fontSize: "12px", textAlign: "right" }}>TOTAL</td>
                <td style={{ padding: "8px", fontSize: "13px", textAlign: "right", fontFamily: "ui-monospace" }}>{formatRp(showDetail.total_debit)}</td>
                <td style={{ padding: "8px", fontSize: "13px", textAlign: "right", fontFamily: "ui-monospace" }}>{formatRp(showDetail.total_kredit)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </Modal>
      )}
    </div>
  );
}
