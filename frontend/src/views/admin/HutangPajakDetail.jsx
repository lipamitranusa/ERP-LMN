import React, { useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import { formatDate } from "../../utils/dateFormat";
import { useApi, useMutateKeys } from "@/hooks/useApi";

function formatRp(n) {
  return `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
}

const STATUS_MAP = {
  belum_dibayar: { label: "Belum Dibayar", bg: "#FEF9C3", text: "#854D0E" },
  dibayar: { label: "Sudah Dibayar", bg: "#DCFCE7", text: "#166534" },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || { label: status, bg: "#F1F5F9", text: "#475569" };
  return (
    <span style={{
      padding: "4px 12px", borderRadius: "9999px",
      fontSize: "12px", fontWeight: "600",
      background: s.bg, color: s.text,
    }}>
      {s.label}
    </span>
  );
}

export default function HutangPajakDetail() {
  const history = useHistory();
  const { id } = useParams();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [tanggalDibayar, setTanggalDibayar] = useState(() => new Date().toISOString().slice(0, 10));
  const [buktiFile, setBuktiFile] = useState(null);
  const [catatan, setCatatan] = useState("");

  const { data: dataObj, isLoading } = useApi(["hutang-pajak-detail", id], "/keuangan/hutang-pajak/" + id);
  const data = dataObj?.data ?? null;

  const mutate = useMutateKeys(["hutang-pajak-detail", id], {
    onError: (err) => setError(err.message),
  });

  const handleLunas = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("tanggal_dibayar", tanggalDibayar);
      fd.append("catatan", catatan || "");
      if (buktiFile) fd.append("bukti_setor", buktiFile);

      await mutate.mutateAsync({ path: "/keuangan/hutang-pajak/" + id + "/lunas", method: "POST", body: fd });
      setSubmitting(false);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  if (isLoading && !data) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8" }}>Memuat detail hutang pajak...</div>;
  }
  if (error && !data) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <div style={{ color: "#DC2626", fontSize: "13px", marginBottom: "16px" }}>{error}</div>
        <button className="btn btn-primary" onClick={() => history.push("/admin/hutang-pajak")}>
          ← Kembali ke daftar
        </button>
      </div>
    );
  }
  if (!data) return null;

  const isBelum = data.status === "belum_dibayar";

  return (
    <div>
      <div style={{ marginBottom: "24px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <button
            className="btn btn-ghost"
            onClick={() => history.push("/admin/hutang-pajak")}
            style={{ fontSize: "12px", padding: "4px 8px", marginBottom: "8px" }}
          >
            ← Kembali
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>
              Hutang PPh 21
            </h1>
            <StatusBadge status={data.status} />
          </div>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
            {data.nama_wajib_pajak || "—"} · NPWP: {data.nomor_pokok_wajib_pajak || "—"}
          </p>
        </div>
      </div>

      {error && (
        <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "10px 16px", borderRadius: "6px", marginBottom: "16px", fontSize: "13px" }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
        {/* Pajak detail */}
        <div className="card" style={{ padding: "20px" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>Detail Hutang Pajak</h3>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px", fontSize: "13px" }}>
            <div style={{ color: "#64748B" }}>Jenis Pajak</div>
            <div>{data.jenis_pajak_label}</div>
            <div style={{ color: "#64748B" }}>NPWP</div>
            <div style={{ fontFamily: "ui-monospace, monospace" }}>{data.nomor_pokok_wajib_pajak || "—"}</div>
            <div style={{ color: "#64748B" }}>Nama WP</div>
            <div>{data.nama_wajib_pajak || "—"}</div>
            <div style={{ color: "#64748B" }}>No. Pembayaran Honor</div>
            <div style={{ fontFamily: "ui-monospace, monospace" }}>{data.nomor_pembayaran}</div>
            <div style={{ color: "#64748B" }}>Tgl Pemotongan</div>
            <div>{formatDate(data.tanggal_pembayaran_honor)}</div>
            <div style={{ color: "#64748B" }}>DPP (50% × bruto)</div>
            <div style={{ fontFamily: "ui-monospace, monospace" }}>{formatRp(data.dpp)}</div>
            <div style={{ color: "#64748B" }}>Tarif Efektif</div>
            <div>{data.tarif_persen}%</div>
            <div style={{ color: "#64748B" }}>Jatuh Tempo</div>
            <div>{formatDate(data.tanggal_jatuh_tempo)}</div>
            <div style={{ color: "#64748B" }}>Dibuat oleh</div>
            <div>{data.dibuat_oleh || "—"}</div>
          </div>
        </div>

        {/* Nilai */}
        <div className="card" style={{ padding: "20px" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>Nilai</h3>
          <div style={{ background: "#FEF9C3", border: "1px solid #FDE68A", borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
            <div style={{ fontSize: "11px", color: "#854D0E", textTransform: "uppercase" }}>Hutang PPh 21 ke Ditjen Pajak</div>
            <div style={{ fontSize: "28px", fontWeight: "700", color: "#991B1B" }}>{formatRp(data.jumlah_pajak)}</div>
          </div>
          {data.status === "dibayar" && (
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px", fontSize: "13px" }}>
              <div style={{ color: "#64748B" }}>Tgl Dibayar</div>
              <div>{formatDate(data.tanggal_dibayar)}</div>
              <div style={{ color: "#64748B" }}>Dibayar oleh</div>
              <div>{data.dibayar_oleh || "—"}</div>
              {data.catatan && (
                <>
                  <div style={{ color: "#64748B" }}>Catatan</div>
                  <div>{data.catatan}</div>
                </>
              )}
              {data.url_bukti_setor && (
                <>
                  <div style={{ color: "#64748B" }}>Bukti Setor</div>
                  <div>
                    <a
                      href={data.url_bukti_setor}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#2563EB", fontSize: "13px", textDecoration: "underline" }}
                    >
                      Lihat Bukti Setor
                    </a>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pembayaran honor terkait */}
      {data.pembayaran_honor && (
        <div className="card" style={{ padding: 0, marginBottom: "20px" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0" }}>
            <span style={{ fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>Pembayaran Honor Terkait</span>
          </div>
          <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px", fontSize: "13px" }}>
            <div style={{ color: "#64748B" }}>No. Pembayaran</div>
            <div style={{ fontFamily: "ui-monospace, monospace" }}>{data.pembayaran_honor.nomor_pembayaran}</div>
            <div style={{ color: "#64748B" }}>Tanggal</div>
            <div>{formatDate(data.pembayaran_honor.tanggal_pembayaran)}</div>
            <div style={{ color: "#64748B" }}>Total Dibayar</div>
            <div style={{ fontWeight: "600", color: "#0C4A6E" }}>{formatRp(data.pembayaran_honor.total_nominal)}</div>
          </div>
          {data.pembayaran_honor.details?.length > 0 && (
            <div style={{ borderTop: "1px solid #E2E8F0" }}>
              <table className="data-table" style={{ borderRadius: 0 }}>
                <thead>
                  <tr>
                    <th>Penerima</th>
                    <th>ID Ledger</th>
                    <th style={{ textAlign: "right" }}>Netto Dibayar</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pembayaran_honor.details.map(d => (
                    <tr key={d.id}>
                      <td style={{ fontSize: "13px" }}>{d.penerima?.nama || "—"}</td>
                      <td style={{ fontSize: "12px", fontFamily: "ui-monospace, monospace" }}>{d.ledger_entry_id?.slice(0, 8)}...</td>
                      <td style={{ textAlign: "right", fontSize: "13px", fontWeight: "600" }}>{formatRp(d.nominal_dibayar)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Form setor pajak */}
      {isBelum && (
        <div className="card" style={{ padding: "20px" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>
            Tandai Lunas — Setor ke Ditjen Pajak
          </h3>
          <form onSubmit={handleLunas}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <div>
                <label className="form-label">Tanggal Setor *</label>
                <input
                  className="form-input"
                  type="date"
                  value={tanggalDibayar}
                  onChange={e => setTanggalDibayar(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="form-label">Bukti Setor</label>
                <input
                  className="form-input"
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={e => setBuktiFile(e.target.files[0] || null)}
                  style={{ padding: "4px 8px" }}
                />
                <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "4px" }}>JPG, PNG, atau PDF. Maks 5 MB.</div>
                {buktiFile && (
                  <div style={{ fontSize: "12px", color: "#16A34A", marginTop: "4px" }}>
                    {buktiFile.name} ({(buktiFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label className="form-label">Catatan</label>
              <textarea
                className="form-input"
                value={catatan}
                onChange={e => setCatatan(e.target.value)}
                rows={2}
                placeholder="Catatan setor pajak (opsional)"
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
                style={{ background: "#16A34A" }}
              >
                {submitting ? "Menyimpan..." : "Tandai Lunas"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
