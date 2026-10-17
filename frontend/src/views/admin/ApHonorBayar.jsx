import React, { useState, useMemo } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { formatDate } from "../../utils/dateFormat";
import { useApi, useMutateKeys } from "@/hooks/useApi";

function formatRp(n) {
  return `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
}

const PERAN_LABEL = {
  ap_honor_surveior: "Surveior",
  ap_honor_verifikator: "Verifikator",
  ap_honor_rekomendator: "Rekomendator",
};

function getQueryParam(search, key) {
  const params = new URLSearchParams(search);
  return params.get(key);
}

export default function ApHonorBayar() {
  const history = useHistory();
  const location = useLocation();
  const idsParam = getQueryParam(location.search, "ids") || "";

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Fetch outstanding entries — all entries, then filter client-side by selected ids
  const { data: allEntriesData, isLoading, error: fetchError } = useApi(
    ["ap-honor-outstanding", idsParam],
    "/keuangan/ap-honor/outstanding",
    { enabled: !!idsParam }
  );

  // Filter to selected ids from URL param
  const data = (() => {
    if (!allEntriesData?.data?.entries) return null;
    const allEntries = allEntriesData.data.entries;
    const ids = new Set(idsParam.split(",").filter(Boolean));
    const selected = allEntries.filter(e => ids.has(e.id));
    if (selected.length === 0) return null;
    return { entries: selected };
  })();

  // Auto-fill bank info from single recipient
  const [bankPengirim, setBankPengirim] = useState("");
  const [nomorRekening, setNomorRekening] = useState("");
  const [atasNama, setAtasNama] = useState("");

  // Auto-fill bank info when data first becomes available (single recipient)
  useMemo(() => {
    if (!data) return;
    const uniquePenerima = {};
    for (const e of data.entries) {
      const taId = e.penerima?.tenaga_ahli_id;
      if (taId && !uniquePenerima[taId]) {
        uniquePenerima[taId] = e.penerima;
      }
    }
    const penerimaList = Object.values(uniquePenerima);
    if (penerimaList.length === 1) {
      const p = penerimaList[0];
      if (p?.nama_bank) setBankPengirim(p.nama_bank);
      if (p?.no_rekening) setNomorRekening(p.no_rekening);
      if (p?.atas_nama_rekening) setAtasNama(p.atas_nama_rekening);
    }
  }, [data]);

  // Payment form state
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [metode, setMetode] = useState("transfer_bank");
  const [catatan, setCatatan] = useState("");
  const [buktiFile, setBuktiFile] = useState(null);

  // Effective error from either URL param check or fetch
  const effectiveError = error || (!idsParam ? "Tidak ada honor yang dipilih. Kembali ke daftar honor." : "") || (fetchError ? fetchError.message : (!fetchError && data === null && !isLoading ? "Honor yang dipilih tidak ditemukan atau sudah dibayar. Kembali ke daftar." : ""));

  const total = useMemo(() => {
    if (!data) return 0;
    return data.entries.reduce((s, e) => s + (e.nominal_neto || 0), 0);
  }, [data]);

  const groupedByPenerima = useMemo(() => {
    if (!data) return [];
    const groups = {};
    for (const e of data.entries) {
      const key = e.penerima?.tenaga_ahli_id || e.penerima?.nomor_induk_surveior || "unknown";
      if (!groups[key]) {
        groups[key] = {
          penerima: e.penerima,
          entries: [],
          total: 0,
        };
      }
      groups[key].entries.push(e);
      groups[key].total += e.nominal_neto || 0;
    }
    return Object.values(groups);
  }, [data]);

  const mutate = useMutateKeys(["ap-honor-outstanding"]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!data || data.entries.length === 0) return;

    setSubmitting(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("tanggal_pembayaran", tanggal);
      fd.append("metode", metode);
      fd.append("bank_pengirim", bankPengirim || "");
      fd.append("nomor_rekening_tujuan", nomorRekening || "");
      fd.append("atas_nama", atasNama || "");
      fd.append("catatan", catatan || "");
      data.entries.forEach(e => fd.append("ledger_entry_ids[]", e.id));
      if (buktiFile) fd.append("bukti_transfer", buktiFile);

      const res = await mutate.mutateAsync({ path: "/keuangan/ap-honor/payments", method: "POST", body: fd });
      const paymentId = res?.data?.id;
      if (paymentId) {
        history.push(`/admin/ap-honor/payment/${paymentId}`);
      } else {
        history.push("/admin/ap-honor");
      }
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8" }}>Memuat data honor...</div>;
  }
  if (effectiveError && !data) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <div style={{ color: "#DC2626", fontSize: "13px", marginBottom: "16px" }}>{effectiveError}</div>
        <button className="btn btn-primary" onClick={() => history.push("/admin/ap-honor/list")}>
          ← Kembali ke daftar honor
        </button>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <button
          className="btn btn-ghost"
          onClick={() => history.push("/admin/ap-honor/list")}
          style={{ fontSize: "12px", padding: "4px 8px", marginBottom: "8px" }}
        >
          ← Kembali
        </button>
        <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>Buat Pembayaran Honor</h1>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
          Draft pembayaran dapat diedit/dibatalkan sebelum disetujui. Setelah disetujui, honor berubah status menjadi lunas.
        </p>
      </div>

      {error && (
        <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "10px 16px", borderRadius: "6px", marginBottom: "16px", fontSize: "13px" }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* Left: payment form */}
        <div className="card" style={{ padding: "20px" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>Detail Pembayaran</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "12px" }}>
              <label className="form-label">Tanggal Pembayaran *</label>
              <input
                className="form-input"
                type="date"
                value={tanggal}
                onChange={e => setTanggal(e.target.value)}
                required
              />
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label className="form-label">Metode Pembayaran *</label>
              <select className="form-input" value={metode} onChange={e => setMetode(e.target.value)} required>
                <option value="transfer_bank">Transfer Bank</option>
                <option value="tunai">Tunai</option>
                <option value="lainnya">Lainnya</option>
              </select>
            </div>
            {metode === "transfer_bank" && (
              <>
                <div style={{ marginBottom: "12px" }}>
                  <label className="form-label">Bank Pengirim</label>
                  <input
                    className="form-input"
                    value={bankPengirim}
                    onChange={e => setBankPengirim(e.target.value)}
                    placeholder="BCA, Mandiri, dll"
                  />
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <label className="form-label">Nomor Rekening Tujuan</label>
                  <input
                    className="form-input"
                    value={nomorRekening}
                    onChange={e => setNomorRekening(e.target.value)}
                    placeholder="1234567890"
                  />
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <label className="form-label">Atas Nama</label>
                  <input
                    className="form-input"
                    value={atasNama}
                    onChange={e => setAtasNama(e.target.value)}
                    placeholder="Nama penerima"
                  />
                </div>
              </>
            )}
            <div style={{ marginBottom: "16px" }}>
              <label className="form-label">Catatan</label>
              <textarea
                className="form-input"
                value={catatan}
                onChange={e => setCatatan(e.target.value)}
                rows={3}
                placeholder="Catatan internal (opsional)"
              />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label className="form-label">Bukti Transfer</label>
              <input
                className="form-input"
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                onChange={e => setBuktiFile(e.target.files[0] || null)}
                style={{ padding: "4px 8px" }}
              />
              <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "4px" }}>
                JPG, PNG, atau PDF. Maks 5 MB.
              </div>
              {buktiFile && (
                <div style={{ fontSize: "12px", color: "#16A34A", marginTop: "4px" }}>
                  {buktiFile.name} ({(buktiFile.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => history.push("/admin/ap-honor/list")}
                disabled={submitting}
              >
                Batal
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? "Menyimpan..." : "Simpan sebagai Draft"}
              </button>
            </div>
          </form>
        </div>

        {/* Right: summary */}
        <div className="card" style={{ padding: "20px" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>Ringkasan</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
            <div>
              <div style={{ fontSize: "11px", color: "#64748B", textTransform: "uppercase" }}>Jumlah line item</div>
              <div style={{ fontSize: "20px", fontWeight: "700", color: "#1E293B" }}>{data.entries.length}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "#64748B", textTransform: "uppercase" }}>Penerima</div>
              <div style={{ fontSize: "20px", fontWeight: "700", color: "#1E293B" }}>{groupedByPenerima.length}</div>
            </div>
          </div>
          <div style={{ background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
            <div style={{ fontSize: "11px", color: "#0C4A6E", textTransform: "uppercase" }}>Total Neto</div>
            <div style={{ fontSize: "26px", fontWeight: "700", color: "#0C4A6E" }}>{formatRp(total)}</div>
          </div>

          <div style={{ fontSize: "12px", fontWeight: "600", color: "#64748B", marginBottom: "8px" }}>Detail per penerima:</div>
          <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid #E2E8F0", borderRadius: "6px" }}>
            {groupedByPenerima.map((g, idx) => (
              <div
                key={idx}
                style={{ padding: "10px 12px", borderBottom: idx < groupedByPenerima.length - 1 ? "1px solid #E2E8F0" : "" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "500", color: "#334155" }}>{g.penerima?.nama || "—"}</div>
                    <div style={{ fontSize: "11px", color: "#94A3B8" }}>
                      {g.penerima?.nomor_induk_surveior} · {g.entries.length} honor
                    </div>
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#991B1B" }}>
                    {formatRp(g.total)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full list of selected entries */}
      <div className="card" style={{ padding: 0, marginTop: "20px" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0" }}>
          <span style={{ fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>Line item ({data.entries.length})</span>
        </div>
        <div className="table-container" style={{ border: "none", borderRadius: 0, maxHeight: "400px", overflowY: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Penerima</th>
                <th>Peran</th>
                <th>Faskes</th>
                <th>Tanggal Honor</th>
                <th style={{ textAlign: "right" }}>Gross</th>
                <th style={{ textAlign: "right" }}>DPP (50%)</th>
                <th style={{ textAlign: "right" }}>PPh 21</th>
                <th style={{ textAlign: "right" }}>Net</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map(e => (
                <tr key={e.id}>
                  <td>
                    <div style={{ fontSize: "13px", fontWeight: "500" }}>{e.penerima?.nama || "—"}</div>
                    <div style={{ fontSize: "11px", color: "#94A3B8" }}>{e.penerima?.nomor_induk_surveior}</div>
                  </td>
                  <td style={{ fontSize: "12px" }}>{PERAN_LABEL[e.tipe] || e.tipe}</td>
                  <td style={{ fontSize: "12px" }}>{e.siklus?.faskes_nama || "—"}</td>
                  <td style={{ fontSize: "12px" }}>{formatDate(e.tanggal_honor)}</td>
                  <td style={{ textAlign: "right", fontSize: "12px" }}>{formatRp(e.nominal_bruto)}</td>
                  <td style={{ textAlign: "right", fontSize: "12px", color: "#64748B" }}>{formatRp(e.dpp)}</td>
                  <td style={{ textAlign: "right", fontSize: "12px", color: "#64748B" }}>{formatRp(e.potongan_pph)}</td>
                  <td style={{ textAlign: "right", fontSize: "12px", fontWeight: "600", color: "#991B1B" }}>{formatRp(e.nominal_neto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}