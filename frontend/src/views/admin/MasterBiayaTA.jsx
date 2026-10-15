import React, { useState, useEffect } from "react";
import { formatDate } from "@/utils/dateFormat";

/**
 * MasterBiayaTA — Master Biaya Honor Tenaga Ahli per tipe faskes.
 *
 * Privilege: "Penugasan" (semua aksi — Administrator).
 * Field:
 *   - peran: surveior | verifikator | rekomendator
 *   - tipe_faskes: kode dari jenis_faskes (PUSKESMAS / KLINIK / KLU / LAB)
 *   - tarif_dasar: bruto honor (IDR)
 *   - keterangan: catatan opsional
 *   - aktif: boolean
 *
 * Catatan: PPN tidak dipotong dari honor (penerima individu/non-PKP);
 * PPh 21 dihitung progresif per PP 58/2023 di HonorCalculator.
 * Konfigurasi PPN yang tampil di header hanya untuk referensi tarif aktif.
 */
export default function MasterBiayaTA() {
  const [data, setData] = useState([]);
  const [jenisFaskes, setJenisFaskes] = useState([]);
  const [tarifPajak, setTarifPajak] = useState({ ppn: null, pph21: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // row yang sedang diedit
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(blankForm());
  const [saving, setSaving] = useState(false);

  function blankForm() {
    return { peran: "surveior", tipe_faskes: "PUSKESMAS", tarif_dasar: 0, keterangan: "", aktif: true };
  }

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/penugasan/master-biaya", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error(`Gagal memuat (${res.status})`);
      const body = await res.json();
      setData(body.data || []);
      setJenisFaskes(body.jenis_faskes_tersedia || []);
      setTarifPajak(body.tarif_pajak_aktif || { ppn: null, pph21: null });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editing
        ? `/api/penugasan/master-biaya/${editing.id}`
        : "/api/penugasan/master-biaya";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          ...form,
          tarif_dasar: Number(form.tarif_dasar),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || `HTTP ${res.status}`);
      setCreating(false);
      setEditing(null);
      setForm(blankForm());
      await load();
    } catch (err) {
      alert(`Gagal menyimpan: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(row) {
    if (!confirm(`Nonaktifkan tarif untuk ${row.peran} / ${row.tipe_faskes}?`)) return;
    try {
      const res = await fetch(`/api/penugasan/master-biaya/${row.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || `HTTP ${res.status}`);
      }
      await load();
    } catch (err) {
      alert(`Gagal: ${err.message}`);
    }
  }

  async function activate(row) {
    if (!confirm(`Aktifkan tarif untuk ${row.peran} / ${row.tipe_faskes}?`)) return;
    try {
      const res = await fetch(`/api/penugasan/master-biaya/${row.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ aktif: true }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || `HTTP ${res.status}`);
      }
      await load();
    } catch (err) {
      alert(`Gagal: ${err.message}`);
    }
  }

  function startEdit(row) {
    setEditing(row);
    setCreating(false);
    setForm({
      peran: row.peran,
      tipe_faskes: row.tipe_faskes,
      tarif_dasar: Number(row.tarif_dasar).toString(),
      keterangan: row.keterangan || "",
      aktif: !!row.aktif,
    });
  }

  function startCreate() {
    setCreating(true);
    setEditing(null);
    setForm(blankForm());
  }

  const ppnTarif = tarifPajak.ppn ? Number(tarifPajak.ppn.tarif_persen) : 0;
  const pphTarif = tarifPajak.pph21 ? Number(tarifPajak.pph21.tarif_persen) : 0;

  return (
    <div style={{ padding: "20px", maxWidth: "1100px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div>
          <h2 style={{ margin: 0, color: "#1E293B", fontSize: "20px" }}>Master Biaya Honor Tenaga Ahli</h2>
          <p style={{ margin: "4px 0 0", color: "#64748B", fontSize: "13px" }}>
            Tarif bruto honor per peran dan tipe faskes. PPN mengikuti Konfigurasi Pajak aktif.
          </p>
        </div>
        <button className="btn btn-primary" onClick={startCreate}>+ Tambah Tarif</button>
      </div>

      <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
        <div style={{ padding: "10px 14px", background: "#F1F5F9", borderRadius: "6px", fontSize: "12px" }}>
          <div style={{ color: "#64748B" }}>Tarif PPN aktif</div>
          <div style={{ fontWeight: 600, color: "#0F172A", fontSize: "14px" }}>
            {ppnTarif.toFixed(2)}% (berlaku {tarifPajak.ppn?.berlaku_sejak ? formatDate(tarifPajak.ppn.berlaku_sejak, { long: true }) : "—"})
          </div>
        </div>
        <div style={{ padding: "10px 14px", background: "#F1F5F9", borderRadius: "6px", fontSize: "12px" }}>
          <div style={{ color: "#64748B" }}>Tarif PPh 21 aktif</div>
          <div style={{ fontWeight: 600, color: "#0F172A", fontSize: "14px" }}>
            {pphTarif.toFixed(2)}% (berlaku {tarifPajak.pph21?.berlaku_sejak ? formatDate(tarifPajak.pph21.berlaku_sejak, { long: true }) : "—"})
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "10px 14px", borderRadius: "6px", marginBottom: "12px", fontSize: "13px" }}>
          {error}
        </div>
      )}

      {(creating || editing) && (
        <FormTarif
          form={form}
          setForm={setForm}
          jenisFaskes={jenisFaskes}
          editing={editing}
          saving={saving}
          onSubmit={submit}
          onCancel={() => { setCreating(false); setEditing(null); setForm(blankForm()); }}
        />
      )}

      <div className="card" style={{ padding: 0, marginTop: creating || editing ? "16px" : 0 }}>
        <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Peran</th>
                <th>Tipe Faskes</th>
                <th style={{ textAlign: "right" }}>Tarif Dasar (Bruto)</th>
                <th>Status</th>
                <th>Keterangan</th>
                <th style={{ width: "120px" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: "center", padding: "32px", color: "#94A3B8" }}>Memuat...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: "center", padding: "32px", color: "#94A3B8" }}>Belum ada master biaya. Klik + Tambah Tarif untuk mulai.</td></tr>
              ) : data.map(row => (
                <tr key={row.id}>
                  <td>{row.peran === "surveior" ? "Surveior" : row.peran === "verifikator" ? "Verifikator" : "Rekomendator"}</td>
                  <td><code style={{ background: "#F1F5F9", padding: "2px 6px", borderRadius: "3px" }}>{row.tipe_faskes}</code></td>
                  <td style={{ textAlign: "right", fontWeight: 600, color: "#0F172A" }}>
                    Rp {Number(row.tarif_dasar).toLocaleString("id-ID")}
                  </td>
                  <td>
                    {row.aktif ? (
                      <span style={{ background: "#DCFCE7", color: "#166534", padding: "2px 8px", borderRadius: "9999px", fontSize: "11px", fontWeight: 600 }}>Aktif</span>
                    ) : (
                      <span style={{ background: "#F1F5F9", color: "#475569", padding: "2px 8px", borderRadius: "9999px", fontSize: "11px", fontWeight: 600 }}>Nonaktif</span>
                    )}
                  </td>
                  <td style={{ color: "#64748B", fontSize: "12px" }}>{row.keterangan || "—"}</td>
                  <td>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => startEdit(row)}>Edit</button>
                      {row.aktif ? (
                        <button className="btn btn-ghost btn-sm" style={{ color: "#DC2626" }} onClick={() => deactivate(row)}>Nonaktifkan</button>
                      ) : (
                        <button className="btn btn-ghost btn-sm" style={{ color: "#16A34A" }} onClick={() => activate(row)}>Aktifkan</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FormTarif({ form, setForm, jenisFaskes, editing, saving, onSubmit, onCancel }) {
  return (
    <form onSubmit={onSubmit} className="card" style={{ padding: "16px" }}>
      <h3 style={{ margin: "0 0 12px", fontSize: "14px", color: "#1E293B" }}>
        {editing ? "Edit Tarif" : "Tambah Tarif"}
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
        <div>
          <label className="form-label">Peran *</label>
          <select className="form-input" value={form.peran} onChange={e => setForm({ ...form, peran: e.target.value })} disabled={!!editing} required>
            <option value="surveior">Surveior</option>
            <option value="verifikator">Verifikator</option>
            <option value="rekomendator">Rekomendator</option>
          </select>
        </div>
        <div>
          <label className="form-label">Tipe Faskes *</label>
          <select className="form-input" value={form.tipe_faskes} onChange={e => setForm({ ...form, tipe_faskes: e.target.value })} disabled={!!editing} required>
            {jenisFaskes.map(jf => (
              <option key={jf.id} value={jf.kode}>{jf.nama} ({jf.kode})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Tarif Dasar (Bruto) *</label>
          <input
            type="number"
            min="0"
            step="1000"
            className="form-input"
            value={form.tarif_dasar}
            onChange={e => setForm({ ...form, tarif_dasar: e.target.value })}
            required
          />
          <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>
            Bruto honor per penugasan. PPN tidak dipotong (penerima individu/non-PKP),
            PPh 21 dihitung progresif per PP 58/2023 — lihat HonorCalculator.
          </div>
        </div>
        <div style={{ gridColumn: "span 2" }}>
          <label className="form-label">Keterangan</label>
          <input
            type="text"
            className="form-input"
            value={form.keterangan}
            onChange={e => setForm({ ...form, keterangan: e.target.value })}
            placeholder="Catatan opsional"
            maxLength={500}
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: "8px", marginTop: "16px", justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Batal</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</button>
      </div>
    </form>
  );
}
