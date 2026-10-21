import React, { useState } from "react";
import { formatDate } from "@/utils/dateFormat";
import { useApi, useMutate } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";

function formatRp(n) {
  return `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
}

function LabelBadge({ children, tone }) {
  const tones = {
    ppn: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    pph21: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    default: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:text-slate-500",
  };
  const cls = tones[children] || tones.default;
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${cls}`}>
      {children}
    </span>
  );
}

export default function KonfigurasiPajak() {
  const [showForm, setShowForm] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Form state
  const [jenisPajak, setJenisPajak] = useState("ppn");
  const [tarifPersen, setTarifPersen] = useState("");
  const [berlakuSejak, setBerlakuSejak] = useState("");
  const [keterangan, setKeterangan] = useState("");

  const { data: tarifListData, isLoading: loading, error } = useApi("konfigurasi-pajak", "/keuangan/konfigurasi-pajak");
  const { data: aktifData } = useApi("konfigurasi-pajak-aktif", "/keuangan/konfigurasi-pajak/aktif");

  const tarifList = tarifListData?.data || [];
  const aktif = aktifData?.data;

  const submitMutate = useMutate({
    onSuccess: () => {
      resetForm();
      setShowForm(false);
    },
    onError: (err) => {
      setSubmitError(err.message);
    },
  });

  function resetForm() {
    setJenisPajak("ppn");
    setTarifPersen("");
    setBerlakuSejak("");
    setKeterangan("");
    setSubmitError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError("");
    submitMutate.mutate({
      path: "/keuangan/konfigurasi-pajak",
      method: "POST",
      body: {
        jenis_pajak: jenisPajak,
        tarif_persen: parseFloat(tarifPersen),
        berlaku_sejak: berlakuSejak,
        keterangan: keterangan || undefined,
      },
    });
  }

  const ppnList = tarifList.filter(t => t.jenis_pajak === "ppn").sort((a, b) => new Date(b.berlaku_sejak) - new Date(a.berlaku_sejak));
  const pphList = tarifList.filter(t => t.jenis_pajak === "pph21").sort((a, b) => new Date(b.berlaku_sejak) - new Date(a.berlaku_sejak));

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#1E293B" }}>
          Konfigurasi Tarif Pajak
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
          Master data PPN &amp; PPh Pasal 21 · PRD FR-5.7
        </p>
      </div>

      {/* Tarif Aktif */}
      {aktif && (
        <div className="card" style={{ padding: "20px", marginBottom: "20px", border: "2px solid #16A34A", background: "#F0FDF4" }}>
          <div style={{ fontSize: "12px", fontWeight: "700", color: "#166534", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
            Tarif Aktif Saat Ini
          </div>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "160px" }}>
              <div style={{ fontSize: "11px", color: "#64748B", marginBottom: "2px" }}>PPN</div>
              <div style={{ fontSize: "28px", fontWeight: "800", color: "#166534" }}>
                {aktif.ppn ? `${aktif.ppn.tarif_persen}%` : "—"}
              </div>
              {aktif.ppn && <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>Berlaku sejak {formatDate(aktif.ppn.berlaku_sejak)}</div>}
            </div>
            <div style={{ width: "1px", background: "#BBF7D0", alignSelf: "stretch" }} />
            <div style={{ flex: 1, minWidth: "160px" }}>
              <div style={{ fontSize: "11px", color: "#64748B", marginBottom: "2px" }}>PPh Pasal 21</div>
              <div style={{ fontSize: "28px", fontWeight: "800", color: "#5E35B1" }}>
                {aktif.pph21 ? `${aktif.pph21.tarif_persen}%` : "—"}
              </div>
              {aktif.pph21 && <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>Berlaku sejak {formatDate(aktif.pph21.berlaku_sejak)}</div>}
            </div>
            <div style={{ flex: 1, minWidth: "200px" }}>
              <div style={{ fontSize: "11px", color: "#64748B", marginBottom: "2px" }}>Snapshot tanggal</div>
              <div style={{ fontSize: "16px", fontWeight: "600", color: "#475569", marginTop: "4px" }}>{formatDate(aktif.tanggal_snapshot)}</div>
            </div>
          </div>
          <div style={{ marginTop: "12px", padding: "10px 12px", background: "#DCFCE7", borderRadius: "6px", fontSize: "12px", color: "#166534" }}>
            💡 Mengubah tarif tidak mempengaruhi entry yang sudah tercatat. Entry lama tetap menggunakan tarif saat transaksi dibuat (snapshot).
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: "12px 16px", background: "#FEE2E2", color: "#991B1B", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" }}>
          {error}
        </div>
      )}

      {/* Tambah Tarif */}
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>Riwayat Tarif</div>
        <Button onClick={() => { resetForm(); setShowForm(!showForm); }}>
          {showForm ? "Batal" : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Tambah Tarif Baru
            </>
          )}
        </Button>
      </div>

      {showForm && (
        <div className="card" style={{ padding: "24px", marginBottom: "20px", border: "2px solid #4F46E5" }}>
          <h3 style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>Tambah Tarif Pajak Baru</h3>
          <p style={{ margin: "0 0 16px", fontSize: "12px", color: "#64748B" }}>
            Tarif baru akan berlaku untuk transaksi mulai tanggal yang ditentukan. Tarif lama tidak berubah.
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label className="form-label">Jenis Pajak *</label>
                <select className="form-input" value={jenisPajak} onChange={e => setJenisPajak(e.target.value)} required>
                  <option value="ppn">PPN (Pajak Pertambahan Nilai)</option>
                  <option value="pph21">PPh Pasal 21</option>
                </select>
              </div>
              <div>
                <label className="form-label">Tarif (%) *</label>
                <input type="number" step="0.01" min="0" max="100" className="form-input"
                  value={tarifPersen} onChange={e => setTarifPersen(e.target.value)} placeholder="Contoh: 11.00" required />
              </div>
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label className="form-label">Berlaku Sejak *</label>
              <input type="date" className="form-input" value={berlakuSejak}
                onChange={e => setBerlakuSejak(e.target.value)} required />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label className="form-label">Keterangan (opsional)</label>
              <input type="text" className="form-input" value={keterangan}
                onChange={e => setKeterangan(e.target.value)} placeholder="Contoh: PPN naik 12% mulai 1 April 2026" />
            </div>

            {/* Simulasi */}
            {tarifPersen && berlakuSejak && (
              <div style={{ padding: "12px", background: "#F8FAFC", borderRadius: "8px", marginBottom: "16px", fontSize: "12px" }}>
                <strong>Simulasi contoh honor Rp 2.500.000:</strong><br />
                {jenisPajak === "ppn" ? "PPN" : "PPh 21"} {tarifPersen}% = {formatRp(2500000 * parseFloat(tarifPersen) / 100)}
              </div>
            )}

            {submitError && (
              <div style={{ padding: "10px 12px", background: "#FEE2E2", color: "#991B1B", borderRadius: "6px", fontSize: "12px", marginBottom: "12px" }}>
                {submitError}
              </div>
            )}

            <div style={{ display: "flex", gap: "10px" }}>
              <Button type="submit" disabled={submitMutate.isPending}>
                {submitMutate.isPending ? "Menyimpan..." : "Simpan Tarif"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Batal
              </Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ padding: "60px", textAlign: "center", color: "#94A3B8" }}>Memuat...</div>
      ) : (
        <>
          {/* Tabel PPN */}
          <div style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <LabelBadge children="ppn" />
              <span style={{ fontSize: "13px", fontWeight: "600", color: "#1E293B" }}>Pajak Pertambahan Nilai</span>
            </div>
            <div className="card" style={{ padding: 0 }}>
              {ppnList.length === 0 ? (
                <div style={{ padding: "32px", textAlign: "center", color: "#94A3B8", fontSize: "13px" }}>Belum ada konfigurasi PPN.</div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tarif</th>
                      <th>Berlaku Sejak</th>
                      <th>Keterangan</th>
                      <th>Dibuat Oleh</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ppnList.map(t => {
                      const isActive = aktif?.ppn?.id === t.id;
                      return (
                        <tr key={t.id} style={isActive ? { background: "#F0FDF4" } : {}}>
                          <td style={{ fontWeight: "700", color: "#166534", fontSize: "15px" }}>{t.tarif_persen}%</td>
                          <td style={{ fontSize: "13px", color: "#475569" }}>{formatDate(t.berlaku_sejak)}</td>
                          <td style={{ fontSize: "12px", color: "#64748B" }}>{t.keterangan || "—"}</td>
                          <td style={{ fontSize: "12px", color: "#94A3B8" }}>{t.dibuat_oleh || "—"}</td>
                          <td>
                            {isActive ? (
                              <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "9999px", fontSize: "10px", fontWeight: "700", background: "#DCFCE7", color: "#166534" }}>
                                AKTIF
                              </span>
                            ) : (
                              <span style={{ color: "#94A3B8", fontSize: "11px" }}>Histori</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Tabel PPh 21 */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <LabelBadge children="pph21" />
              <span style={{ fontSize: "13px", fontWeight: "600", color: "#1E293B" }}>PPh Pasal 21</span>
            </div>
            <div className="card" style={{ padding: 0 }}>
              {pphList.length === 0 ? (
                <div style={{ padding: "32px", textAlign: "center", color: "#94A3B8", fontSize: "13px" }}>Belum ada konfigurasi PPh 21.</div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tarif</th>
                      <th>Berlaku Sejak</th>
                      <th>Keterangan</th>
                      <th>Dibuat Oleh</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pphList.map(t => {
                      const isActive = aktif?.pph21?.id === t.id;
                      return (
                        <tr key={t.id} style={isActive ? { background: "#F5F3FF" } : {}}>
                          <td style={{ fontWeight: "700", color: "#5E35B1", fontSize: "15px" }}>{t.tarif_persen}%</td>
                          <td style={{ fontSize: "13px", color: "#475569" }}>{formatDate(t.berlaku_sejak)}</td>
                          <td style={{ fontSize: "12px", color: "#64748B" }}>{t.keterangan || "—"}</td>
                          <td style={{ fontSize: "12px", color: "#94A3B8" }}>{t.dibuat_oleh || "—"}</td>
                          <td>
                            {isActive ? (
                              <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "9999px", fontSize: "10px", fontWeight: "700", background: "#EDE9F6", color: "#5E35B1" }}>
                                AKTIF
                              </span>
                            ) : (
                              <span style={{ color: "#94A3B8", fontSize: "11px" }}>Histori</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
