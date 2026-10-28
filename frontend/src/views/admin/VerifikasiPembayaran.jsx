import React, { useState } from "react";
import { useApi, useMutateKeys } from "@/hooks/useApi";
import { withLembaga } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

function formatRp(n) {
  return `Rp ${Number(n).toLocaleString("id-ID")}`;
}

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return `${Math.floor(diff / 60000)} menit lalu`;
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.floor(hours / 24)} hari lalu`;
}

function extFromPath(path) {
  if (!path) return "";
  const m = path.match(/\.([a-zA-Z0-9]+)$/);
  return m ? m[1].toLowerCase() : "";
}

const verifySchema = z.object({
  alasan: z.string().trim().min(1, "Alasan penolakan wajib diisi."),
});

function BuktiPreviewModal({ bukti, onClose }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const ext = extFromPath(bukti?.path_bukti);
  const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
  const isPdf = ext === "pdf";
  const token = localStorage.getItem("token");

  React.useEffect(() => {
    if (!bukti) return;
    let cancelled = false;
    setLoading(true);
    setLoadError("");

    fetch(withLembaga(`/api/bukti/${bukti.id}/view`), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        if (!r.ok) throw new Error("Gagal memuat bukti.");
        return r.blob();
      })
      .then(blob => {
        if (!cancelled) {
          const url = URL.createObjectURL(blob);
          setBlobUrl(url);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setLoadError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [bukti?.id]);

  if (!bukti) return null;

  function handleDownload() {
    const link = document.createElement("a");
    link.href = `/api/bukti/${bukti.id}/download?token=${token}`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,0.7)",
        zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: "12px", width: "100%",
          maxWidth: "900px", maxHeight: "90vh",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid #F1F5F9",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "600", color: "#1E293B" }}>
              Bukti Transfer
            </h3>
            <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
              {bukti.invoice?.nomor_invoice} • {formatRp(bukti.nominal)} • {bukti.nomor_referensi}
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <Button variant="secondary" size="sm" onClick={handleDownload}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </Button>
          </div>
        </div>

        <div style={{
          flex: 1, overflow: "auto", padding: "20px",
          background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center",
          minHeight: "300px",
        }}>
          {loading && <div style={{ color: "#94A3B8" }}>Memuat bukti...</div>}
          {loadError && <div style={{ color: "#DC2626" }}>{loadError}</div>}
          {blobUrl && isImage && (
            <img
              src={blobUrl}
              alt="Bukti transfer"
              style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: "6px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
            />
          )}
          {blobUrl && isPdf && (
            <iframe
              src={blobUrl}
              title="Bukti transfer"
              style={{ width: "100%", height: "70vh", border: "1px solid #E2E8F0", borderRadius: "6px", background: "#fff" }}
            />
          )}
          {blobUrl && !isImage && !isPdf && (
            <div style={{ textAlign: "center", color: "#475569" }}>
              <p>Preview tidak tersedia untuk tipe file ini.</p>
              <Button variant="primary" onClick={handleDownload}>Download File</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VerifikasiModal({ bukti, onClose, mutateVerify }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(verifySchema),
    defaultValues: { alasan: "" },
  });

  const onTolak = (data) => {
    mutateVerify.mutate({
      path: `/bukti/${bukti.id}/verifikasi`,
      method: "POST",
      body: { status: "ditolak", alasan_penolakan: data.alasan },
    });
    onClose();
  };

  const onTerima = () => {
    mutateVerify.mutate({
      path: `/bukti/${bukti.id}/verifikasi`,
      method: "POST",
      body: { status: "diterima", alasan_penolakan: null },
    });
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "8px", maxWidth: "480px", width: "100%", padding: "24px" }}>
        <form onSubmit={handleSubmit(onTolak)}>
        <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "600", color: "#1E293B" }}>Verifikasi Bukti Transfer</h3>
        <div style={{ marginTop: "16px", padding: "12px", background: "#F8FAFC", borderRadius: "6px", fontSize: "12px", color: "#475569" }}>
          <div>Faskes: <strong>{bukti.invoice?.siklus?.faskes?.nama || "—"}</strong></div>
          <div>Nominal: <strong>{formatRp(bukti.nominal)}</strong></div>
          <div>Referensi: <strong>{bukti.nomor_referensi || "—"}</strong></div>
          <div>Dari: {bukti.dari_rekening || "—"}</div>
        </div>

        <div style={{ marginTop: "12px", padding: "10px 12px", background: "#FFFBEB", border: "1px solid #FDE047", borderRadius: "6px", fontSize: "11px", color: "#854D0E" }}>
          Setelah bukti <strong>diterima</strong>, penerimaan kas belum masuk buku besar. Buat jurnal Bank Masuk
          (Debit Bank / Kredit Piutang Usaha) dari halaman <strong>Piutang → Detail Invoice</strong>.
        </div>

        <div style={{ marginTop: "16px" }}>
          <label className="form-label">Alasan penolakan *</label>
          <Textarea rows="3" {...register("alasan")} placeholder="Contoh: Nominal tidak sesuai dengan tagihan." />
          {errors.alasan && (
            <p style={{ marginTop: "4px", fontSize: "12px", color: "#DC2626" }}>{errors.alasan.message}</p>
          )}
          <div style={{ marginTop: "4px", fontSize: "11px", color: "#64748B" }}>
            Alasan ini dikirim ke Faskes via WhatsApp/email agar mereka dapat mengunggah ulang bukti.
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
          <Button type="button" variant="outline" onClick={onClose} style={{ flex: 1 }}>Batal</Button>
          <Button type="submit" variant="destructive" disabled={mutateVerify.isPending} style={{ flex: 1 }}>Tolak</Button>
          <Button type="button" onClick={onTerima} disabled={mutateVerify.isPending} style={{ flex: 1 }}>Terima</Button>
        </div>
        </form>
      </div>
    </div>
  );
}

export default function VerifikasiPembayaran() {
  const [selectedBukti, setSelectedBukti] = useState(null);
  const [previewBukti, setPreviewBukti] = useState(null);

  const { data, isLoading } = useApi("verifikasi-pembayaran", "/bukti/antrian");
  const mutateVerify = useMutateKeys(["verifikasi-pembayaran"], {
    onSuccess: () => setSelectedBukti(null),
  });

  const bukti = data?.data || [];

  if (isLoading) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8" }}>Memuat...</div>;
  }

  const overdue = bukti.filter(b => b.is_overdue);
  const fresh = bukti.filter(b => !b.is_overdue);

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>Verifikasi Pembayaran Manual</h1>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
          Validasi bukti transfer yang diunggah Faskes. SLA maksimal 1x24 jam kerja (FR-2.6).
        </p>
      </div>

      {overdue.length > 0 && (
        <div style={{ padding: "12px 16px", background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: "8px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#991B1B" strokeWidth="2" width="16" height="16">
            <circle cx="12" cy="12" r="10"/><path d="M12 6v6M12 16v0.5" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: "12px", color: "#991B1B", fontWeight: "500" }}>
            {overdue.length} bukti melewati SLA 24 jam
          </span>
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Submit</th>
                <th>Faskes</th>
                <th>Invoice</th>
                <th style={{ textAlign: "right" }}>Nominal</th>
                <th>Referensi</th>
                <th>SLA</th>
                <th style={{ width: "220px" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {bukti.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: "center", color: "#94A3B8", padding: "48px 16px" }}>
                  Tidak ada bukti yang menunggu verifikasi.
                </td></tr>
              ) : (
                [...overdue, ...fresh].map(b => (
                  <tr key={b.id} style={b.is_overdue ? { background: "#FEF2F2" } : {}}>
                    <td style={{ fontSize: "12px", color: "#475569" }}>{timeAgo(b.tanggal_submit)}</td>
                    <td style={{ fontSize: "13px", color: "#334155", fontWeight: "500" }}>
                      {b.invoice?.siklus?.faskes?.nama || "—"}
                    </td>
                    <td style={{ fontSize: "12px", color: "#64748B" }}>{b.invoice?.nomor_invoice || "—"}</td>
                    <td style={{ textAlign: "right", fontWeight: "500" }}>{formatRp(b.nominal)}</td>
                    <td style={{ fontSize: "12px", color: "#64748B" }}>{b.nomor_referensi || "—"}</td>
                    <td>
                      {b.is_overdue ? (
                        <span style={{ padding: "2px 8px", borderRadius: "9999px", fontSize: "11px", fontWeight: "600", background: "#FEE2E2", color: "#991B1B" }}>
                          Overdue
                        </span>
                      ) : (
                        <span style={{ fontSize: "12px", color: "#64748B" }}>{timeAgo(b.tanggal_submit)}</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                        <Button variant="ghost" size="sm" onClick={() => setPreviewBukti(b)} title="Lihat bukti" style={{ color: "#4CAF50", padding: "4px 8px", fontSize: "12px" }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                          </svg>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => {
                          const token = localStorage.getItem("token");
                          const link = document.createElement("a");
                          link.href = `/api/bukti/${b.id}/download?token=${token}`;
                          link.style.display = "none";
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }} title="Download bukti" style={{ color: "#475569", padding: "4px 8px", fontSize: "12px" }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                        </Button>
                        <Button size="sm" onClick={() => setSelectedBukti(b)} style={{ padding: "4px 12px", fontSize: "12px" }}>
                          Verifikasi
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {previewBukti && (
        <BuktiPreviewModal bukti={previewBukti} onClose={() => setPreviewBukti(null)} />
      )}

      {selectedBukti && (
        <VerifikasiModal bukti={selectedBukti} onClose={() => setSelectedBukti(null)} mutateVerify={mutateVerify} />
      )}
    </div>
  );
}
