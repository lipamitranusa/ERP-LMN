import React, { useState, useEffect, useRef } from "react";
import { useApi, useMutateKeys, useMutate } from "@/hooks/useApi";
import InvoiceStatusCard from "@/components/InvoiceStatusCard";
import { formatDate } from "../../utils/dateFormat";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const formatRp = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
const SATUAN_LABEL = {
  tetap: "Tetap",
  per_siklus: "Per Siklus",
  per_sertifikat: "Per Sertifikat",
  per_tahun: "Per Tahun",
  periksa: "Per Periksa",
  sekali: "Sekali Bayar",
};

const STATUS_LABELS = {
  draft: { label: "Draf", bg: "#F1F5F9", fg: "#475569" },
  dikirim: { label: "Menunggu Tanda Tangan Faskes", bg: "#DBEAFE", fg: "#1E40AF" },
  ditandatangani: { label: "Menunggu Validasi Admin", bg: "#FEF3C7", fg: "#92400E" },
  disetujui: { label: "Disetujui", bg: "#DCFCE7", fg: "#166534" },
  selesai: { label: "Selesai", bg: "#DCFCE7", fg: "#166534" },
  ditolak: { label: "Ditolak", bg: "#FEE2E2", fg: "#991B1B" },
  expired: { label: "Kedaluwarsa", bg: "#F1F5F9", fg: "#475569" },
};

function StatusBadge({ status }) {
  const info = STATUS_LABELS[status] || { label: status, bg: "#F1F5F9", fg: "#475569" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 10px", borderRadius: "9999px",
      fontSize: "11px", fontWeight: "600",
      background: info.bg, color: info.fg,
      whiteSpace: "nowrap",
    }}>{info.label}</span>
  );
}

function Stat({ label, value, color = "#1E293B" }) {
  return (
    <div className="card" style={{ padding: "12px 16px" }}>
      <div style={{ fontSize: "11px", color: "#64748B", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "18px", fontWeight: "700", color }}>{value}</div>
    </div>
  );
}

function InvoiceItems({ inv }) {
  const items = inv.items || [];
  if (items.length === 0) return null;
  return (
    <div style={{ marginTop: "12px", padding: "12px", background: "#F8FAFC", borderRadius: "8px" }}>
      <div style={{ fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "8px" }}>Rincian Biaya</div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#94A3B8", paddingBottom: "6px", borderBottom: "1px solid #E2E8F0" }}>Komponen</th>
            <th style={{ textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#94A3B8", paddingBottom: "6px", borderBottom: "1px solid #E2E8F0" }}>Satuan</th>
            <th style={{ textAlign: "right", fontSize: "11px", fontWeight: "600", color: "#94A3B8", paddingBottom: "6px", borderBottom: "1px solid #E2E8F0" }}>Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id}>
              <td style={{ padding: "4px 0", fontSize: "12px", color: "#334155" }}>{item.nama_biaya}</td>
              <td style={{ padding: "4px 0", fontSize: "12px", color: "#64748B" }}>{SATUAN_LABEL[item.satuan] || item.satuan}</td>
              <td style={{ padding: "4px 0", fontSize: "12px", fontWeight: "500", color: "#334155", textAlign: "right" }}>{formatRp(item.jumlah)}</td>
            </tr>
          ))}
          <tr style={{ borderTop: "1px solid #E2E8F0" }}>
            <td colSpan="2" style={{ paddingTop: "8px", fontSize: "12px", fontWeight: "600", color: "#1E293B", textAlign: "right" }}>Total</td>
            <td style={{ paddingTop: "8px", fontSize: "13px", fontWeight: "700", color: "#1E293B", textAlign: "right" }}>{formatRp(inv.total_tagihan)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function DetailPanel({ pksId, onClose }) {
  const [editingNomor, setEditingNomor] = useState(false);
  const [editNomorPks, setEditNomorPks] = useState("");
  const [tolakOpen, setTolakOpen] = useState(false);
  const [tolakAlasan, setTolakAlasan] = useState("");
  const [kirimOpen, setKirimOpen] = useState(false);
  const [kirimMode, setKirimMode] = useState("template");
  const [lampiranFile, setLampiranFile] = useState(null);
  const [error, setError] = useState("");

  // Kirim Tagihan state
  const [tagihanPanelOpen, setTagihanPanelOpen] = useState(false);
  const [tagihanInvId, setTagihanInvId] = useState(null);
  const [tagihanResult, setTagihanResult] = useState(null);
  const [tagihanPrintOpen, setTagihanPrintOpen] = useState(false);
  const [tagihanPreviewHtml, setTagihanPreviewHtml] = useState("");
  const slipIframeRef = useRef(null);
  const fileInputRef = useRef(null);

  // Detail PKS query
  const { data: pksData, isLoading: pksLoading } = useApi(
    ["kontrak-detail", pksId],
    `/kontrak/${pksId}`
  );
  const pks = pksData?.data;

  // Estimasi biaya (only for PKS with no invoice)
  const { data: estimasiData, isLoading: estimasiLoading } = useApi(
    ["kontrak-estimasi", pks?.id],
    `/kontrak/${pks?.id}/estimasi-biaya`,
    { enabled: !!pks && pks.invoice_count === 0 }
  );
  const estimasi = estimasiData?.data;

  // Tagihan generate query (triggered when tagihanInvId is set)
  const { data: tagihanData, isLoading: tagihanLoading, error: tagihanError, refetch: refetchTagihan } = useApi(
    ["tagihan-generate", tagihanInvId],
    `/invoice/${tagihanInvId}/tagihan/generate`,
    { enabled: !!tagihanInvId }
  );

  // Mutations
  const { mutate: mutateTagihan, isPending: tagihanSending } = useMutate({
    onSuccess: (data) => { setTagihanResult(data); },
    onError: (err) => { setTagihanResult({ message: err.message, data: null }); },
  });

  const { mutate: updateNomorPks, isPending: savingNomor } = useMutateKeys(["kontrak-detail", pksId], {
    onSuccess: (data) => {
      // The query cache for ["kontrak-detail", pksId] is already invalidated,
      // but we can also manually update it
      setEditingNomor(false);
    },
    onError: (err) => { alert(err.message); },
  });

  const { mutate: kirimPks, isPending: kirimLoading } = useMutateKeys(["kontrak-detail", pksId], {
    onSuccess: () => {
      setKirimOpen(false);
      setLampiranFile(null);
      setKirimMode("template");
    },
    onError: (err) => { setError(err.message); },
  });

  const { mutate: validateSigned, isPending: validating } = useMutateKeys(["kontrak-detail", pksId], {
    onError: (err) => { setError(err.message); },
  });

  const { mutate: tolakSigned, isPending: submittingTolak } = useMutateKeys(["kontrak-detail", pksId], {
    onSuccess: () => {
      setTolakOpen(false);
      setTolakAlasan("");
    },
    onError: (err) => { setError(err.message); },
  });

  const handleSendTagihan = () => {
    mutateTagihan({
      path: `/invoice/${tagihanInvId}/tagihan/send`,
      method: "POST",
      body: { channel: tagihanChannel },
    });
  };

  const handleUpdateNomorPks = () => {
    if (!pks || !editNomorPks.trim()) return;
    updateNomorPks({
      path: `/kontrak/${pks.id}/nomor-pks`,
      method: "PATCH",
      body: { nomor_pks: editNomorPks.trim() },
    });
  };

  const handleKirimSubmit = () => {
    if (!pks) return;
    setError("");
    const fd = new FormData();
    if (kirimMode === "upload" && lampiranFile) {
      fd.append("lampiran_pdf", lampiranFile);
    }
    kirimPks({
      path: `/kontrak/${pks.id}/kirim`,
      method: "POST",
      body: fd,
    });
  };

  const handleValidateSigned = () => {
    if (!pks) return;
    setError("");
    validateSigned({
      path: `/kontrak/${pks.id}/validate-signed`,
      method: "POST",
      body: {},
    });
  };

  const handleTolakSigned = () => {
    if (!pks || !tolakAlasan.trim()) return;
    setError("");
    tolakSigned({
      path: `/kontrak/${pks.id}/tolak-signed`,
      method: "POST",
      body: { alasan: tolakAlasan.trim() },
    });
  };

  function handleLampiranFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("File terlalu besar. Maksimum 10 MB.");
      return;
    }
    if (file.type !== "application/pdf") {
      setError("Hanya file PDF yang diperbolehkan.");
      return;
    }
    setLampiranFile(file);
    setError("");
    e.target.value = "";
  }

  function formatSize(bytes) {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  const [tagihanChannel, setTagihanChannel] = useState("whatsapp");

  async function handleDownloadSignedPdf(preview = false) {
    if (!pks?.path_signed_pdf) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/api/kontrak/${pks.id}/signed-pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Gagal mengambil file.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (preview) {
        window.open(url, "_blank");
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = `PKS-Tertanda-${pks.nomor_pks || pks.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      setError(err.message);
    }
  }

  const handleOpenTagihan = (invId) => {
    setTagihanInvId(invId);
    setTagihanPanelOpen(true);
    setTagihanResult(null);
  };

  if (pksLoading || !pks) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "#fff", padding: "24px", borderRadius: "8px" }}>Memuat detail PKS...</div>
      </div>
    );
  }

  function startEditNomor() {
    setEditNomorPks(pks?.nomor_pks || "");
    setEditingNomor(true);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "20px" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "12px", width: "100%", maxWidth: "720px", marginTop: "20px" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "11px", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Detail PKS</div>
            <div style={{ fontSize: "16px", fontWeight: "600", color: "#1E293B" }}>{pks.siklus?.faskes?.nama || "—"}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#94A3B8" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div style={{ padding: "20px" }}>
          {/* Status + Nomor PKS */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <StatusBadge status={pks.status} />
            {pks.siklus?.lembaga?.nama && (
              <span style={{ fontSize: "12px", color: "#64748B" }}>{pks.siklus.lembaga.nama}</span>
            )}
          </div>

          <div style={{ background: "#F8FAFC", borderRadius: "8px", padding: "14px 16px", marginBottom: "16px" }}>
            <div style={{ fontSize: "11px", color: "#94A3B8", textTransform: "uppercase", marginBottom: "4px" }}>Nomor PKS</div>
            {editingNomor ? (
              <div style={{ display: "flex", gap: "8px" }}>
                <input className="form-input" value={editNomorPks} onChange={e => setEditNomorPks(e.target.value)} style={{ flex: 1 }} />
                <Button size="sm" onClick={handleUpdateNomorPks} disabled={savingNomor}>{savingNomor ? "..." : "Simpan"}</Button>
                <Button variant="outline" size="sm" onClick={() => setEditingNomor(false)}>Batal</Button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ fontSize: "15px", fontWeight: "600", color: "#1E293B" }}>{pks.nomor_pks || "—"}</div>
                {pks.status === "draft" && (
                  <Button variant="ghost" size="icon" onClick={startEditNomor} title="Edit">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </Button>
                )}
              </div>
            )}
          </div>

          {(pks.nama_penandatangan || pks.signed_uploaded_at) && (
            <div style={{ background: "#F8FAFC", borderRadius: "6px", padding: "12px", marginBottom: "16px", fontSize: "12px", color: "#475569" }}>
              <div><strong>Penandatangan:</strong> {pks.nama_penandatangan} — {pks.jabatan_penandatangan}</div>
              {pks.nik_penandatangan && <div><strong>NIK:</strong> {pks.nik_penandatangan}</div>}
              <div><strong>Diupload:</strong> {formatDate(pks.signed_uploaded_at)}</div>
              {pks.admin_validated_at && <div style={{ color: "#166534", marginTop: "4px" }}>✓ Divalidasi: {formatDate(pks.admin_validated_at)}</div>}
            </div>
          )}

          {/* Estimasi biaya dari master biaya (untuk PKS yang belum punya invoice) */}
          {(!pks.invoice || (pks.invoice_count ?? 0) === 0) && estimasi && estimasi.items && estimasi.items.length > 0 && (
            <div style={{ background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: "8px", padding: "14px 16px", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "#0369A1", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.05em" }}>Estimasi Tagihan (dari master biaya)</div>
                  <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>Invoice akan diterbitkan otomatis setelah PKS divalidasi</div>
                </div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "#0369A1" }}>{formatRp(estimasi.total)}</div>
              </div>
              {estimasiLoading ? (
                <div style={{ fontSize: "12px", color: "#64748B" }}>Memuat rincian biaya...</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "4px" }}>
                  <tbody>
                    {estimasi.items.map((item) => (
                      <tr key={item.id} style={{ borderTop: "1px solid #E0F2FE" }}>
                        <td style={{ padding: "6px 0", fontSize: "12px", color: "#334155" }}>{item.nama_biaya}</td>
                        <td style={{ padding: "6px 0", fontSize: "11px", color: "#64748B", textAlign: "left" }}>{SATUAN_LABEL[item.satuan] || item.satuan}</td>
                        <td style={{ padding: "6px 0", fontSize: "12px", color: "#1E293B", textAlign: "right", fontWeight: "500" }}>{formatRp(item.jumlah)}</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: "2px solid #BAE6FD" }}>
                      <td colSpan="2" style={{ paddingTop: "8px", fontSize: "12px", fontWeight: "600", color: "#0369A1", textAlign: "right" }}>Total</td>
                      <td style={{ paddingTop: "8px", fontSize: "13px", fontWeight: "700", color: "#0369A1", textAlign: "right" }}>{formatRp(estimasi.total)}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          )}

          {error && (
            <div style={{ padding: "10px 12px", background: "#FEE2E2", color: "#991B1B", borderRadius: "6px", fontSize: "12px", marginBottom: "12px" }}>
              {error}
            </div>
          )}

          {pks.status === "draft" && (
            <div style={{ marginBottom: "16px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <Button onClick={() => { setKirimOpen(true); setError(""); setLampiranFile(null); setKirimMode("template"); }}>
                Kirim via Template PKS
              </Button>
              <Button variant="outline" onClick={() => { setKirimOpen(true); setError(""); setLampiranFile(null); setKirimMode("upload"); }}>
                Kirim dengan Lampiran
              </Button>
            </div>
          )}

          {/* Modal Kirim PKS */}
          {kirimOpen && (
            <div style={{
              position: "fixed", inset: 0, zIndex: 300,
              background: "rgba(15,23,42,0.5)",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "20px",
            }} onClick={() => !kirimLoading && setKirimOpen(false)}>
              <div style={{
                background: "#fff", borderRadius: "12px",
                maxWidth: "520px", width: "100%",
                boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
              }} onClick={e => e.stopPropagation()}>
                <div style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid #F1F5F9",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: "600", color: "#1E293B" }}>Kirim PKS ke Faskes</div>
                    <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>{pks.siklus?.faskes?.nama}</div>
                  </div>
                  <button onClick={() => !kirimLoading && setKirimOpen(false)} style={{ background: "none", border: "none", cursor: kirimLoading ? "wait" : "pointer", color: "#94A3B8" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>

                <div style={{ padding: "20px" }}>
                  {error && (
                    <div style={{ marginBottom: "12px", padding: "10px 14px", background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: "6px", color: "#991B1B", fontSize: "13px" }}>{error}</div>
                  )}

                  {/* Opsi 1: Via Template */}
                  <div
                    onClick={() => setKirimMode("template")}
                    style={{
                      border: `2px solid ${kirimMode === "template" ? "#2E7D32" : "#E2E8F0"}`,
                      borderRadius: "10px", padding: "14px",
                      marginBottom: "10px",
                      cursor: "pointer",
                      background: kirimMode === "template" ? "#F0FDF4" : "#FAFAFA",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                      <div style={{
                        width: "20px", height: "20px", borderRadius: "50%",
                        border: `2px solid ${kirimMode === "template" ? "#2E7D32" : "#CBD5E1"}`,
                        background: kirimMode === "template" ? "#2E7D32" : "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px",
                      }}>
                        {kirimMode === "template" && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" width="10" height="10">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "13px", fontWeight: "600", color: "#1E293B", marginBottom: "4px" }}>
                          Via Template PKS
                        </div>
                        <div style={{ fontSize: "12px", color: "#64748B" }}>
                          Kirim menggunakan draf PKS yang sudah di-generate sistem dari template sebelumnya.
                        </div>
                        <div style={{ marginTop: "8px", fontSize: "11px", color: "#2E7D32", fontWeight: "500" }}>
                          Standar — cocok jika data faskes & lembaga sudah lengkap di sistem.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Opsi 2: Upload & Kirim */}
                  <div
                    onClick={() => setKirimMode("upload")}
                    style={{
                      border: `2px solid ${kirimMode === "upload" ? "#2E7D32" : "#E2E8F0"}`,
                      borderRadius: "10px", padding: "14px",
                      marginBottom: "16px",
                      cursor: "pointer",
                      background: kirimMode === "upload" ? "#F0FDF4" : "#FAFAFA",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                      <div style={{
                        width: "20px", height: "20px", borderRadius: "50%",
                        border: `2px solid ${kirimMode === "upload" ? "#2E7D32" : "#CBD5E1"}`,
                        background: kirimMode === "upload" ? "#2E7D32" : "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px",
                      }}>
                        {kirimMode === "upload" && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" width="10" height="10">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "13px", fontWeight: "600", color: "#1E293B", marginBottom: "4px" }}>
                          Upload & Kirim
                        </div>
                        <div style={{ fontSize: "12px", color: "#64748B" }}>
                          Upload file PKS yang sudah disiapkan (misalnya dari Word/PDF editor eksternal), lalu kirim ke faskes.
                        </div>
                        <div style={{ marginTop: "8px", fontSize: "11px", color: "#92400E", fontWeight: "500" }}>
                          Gunakan jika PKS diedit di luar sistem sebelum dikirim.
                        </div>
                      </div>
                    </div>

                    {/* File upload area */}
                    {kirimMode === "upload" && (
                      <div style={{ marginTop: "12px", marginLeft: "32px" }}>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf"
                          onChange={handleLampiranFileChange}
                          style={{ display: "none" }}
                        />
                        {lampiranFile ? (
                          <div style={{
                            padding: "10px 14px",
                            border: "1px solid #BBF7D0",
                            borderRadius: "8px",
                            background: "#F0FDF4",
                            display: "flex", alignItems: "center", gap: "10px",
                          }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2" width="20" height="20">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                            </svg>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: "13px", fontWeight: "500", color: "#1E293B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {lampiranFile.name}
                              </div>
                              <div style={{ fontSize: "11px", color: "#2E7D32" }}>{formatSize(lampiranFile.size)}</div>
                            </div>
                            <button
                              onClick={() => setLampiranFile(null)}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", padding: "4px" }}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                              width: "100%", padding: "12px",
                              border: "2px dashed #CBD5E1",
                              borderRadius: "8px",
                              background: "#F8FAFC",
                              cursor: "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                              fontSize: "13px", color: "#64748B",
                            }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                            </svg>
                            Klik pilih file PDF
                          </button>
                        )}
                        <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "4px" }}>
                          Format: PDF · Maks 10 MB
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                    <Button variant="outline" onClick={() => setKirimOpen(false)} disabled={kirimLoading}>
                      Batal
                    </Button>
                    <Button onClick={handleKirimSubmit} disabled={kirimLoading || (kirimMode === "upload" && !lampiranFile)}>
                      {kirimLoading ? (
                        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ animation: "spin 1s linear infinite" }}>
                            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                          </svg>
                          Mengirim...
                        </span>
                      ) : "Kirim ke Faskes"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Kirim Tagihan Panel */}
          {tagihanPanelOpen && (
            <div style={{
              position: "fixed", inset: 0, zIndex: 300,
              background: "rgba(0,0,0,0.5)", display: "flex",
              alignItems: "center", justifyContent: "center",
            }}>
              <div style={{
                background: "#fff", borderRadius: "12px", padding: "24px",
                width: "500px", maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#1E293B" }}>Kirim Tagihan ke Faskes</h3>
                  <button onClick={() => { setTagihanPanelOpen(false); setTagihanResult(null); setTagihanInvId(null); }}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "#94A3B8", lineHeight: 1 }}>
                    ×
                  </button>
                </div>

                {tagihanLoading ? (
                  <div style={{ textAlign: "center", padding: "24px", color: "#64748B" }}>Memuat data tagihan...</div>
                ) : tagihanError ? (
                  <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: "8px", padding: "12px", color: "#DC2626", fontSize: "13px" }}>{tagihanError.message}</div>
                ) : tagihanData?.data ? (
                  <>
                    {tagihanResult ? (
                      <div>
                        {tagihanResult.data?.success || tagihanResult.success ? (
                          <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: "8px", padding: "16px", color: "#15803D", fontSize: "13px" }}>
                            <strong>Berhasil!</strong><br />
                            {tagihanResult.data?.whatsapp?.message || tagihanResult.data?.email?.message || tagihanResult.message}
                          </div>
                        ) : (
                          <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: "8px", padding: "12px", color: "#DC2626", fontSize: "13px" }}>
                            {tagihanResult.message || "Gagal mengirim tagihan."}
                          </div>
                        )}
                        <Button variant="outline" style={{ marginTop: "12px" }} onClick={() => { setTagihanPanelOpen(false); setTagihanResult(null); setTagihanInvId(null); }}>
                          Tutup
                        </Button>
                      </div>
                    ) : (
                      <>
                        {/* Preview info */}
                        <div style={{ background: "#F8FAFC", borderRadius: "8px", padding: "12px", marginBottom: "16px", fontSize: "12px" }}>
                          <div style={{ marginBottom: "4px" }}><strong>Invoice:</strong> {tagihanData.data.nomor_invoice}</div>
                          <div style={{ marginBottom: "4px" }}><strong>Total:</strong> {formatRp(tagihanData.data.total_tagihan)}</div>
                          <div style={{ marginBottom: "4px" }}><strong>Jatuh Tempo:</strong> {formatDate(tagihanData.data.due_date)}</div>
                          {tagihanData.data.faskes && (
                            <>
                              <div style={{ marginBottom: "4px" }}><strong>Faskes:</strong> {tagihanData.data.faskes.nama}</div>
                              {tagihanData.data.faskes.telepon && <div style={{ marginBottom: "4px" }}><strong>Telepon:</strong> {tagihanData.data.faskes.telepon}</div>}
                              {tagihanData.data.faskes.email && <div><strong>Email:</strong> {tagihanData.data.faskes.email}</div>}
                            </>
                          )}
                        </div>

                        {/* Channel selector */}
                        <div style={{ marginBottom: "16px" }}>
                          <label style={{ fontSize: "13px", fontWeight: "600", color: "#374151", display: "block", marginBottom: "8px" }}>Kirim via:</label>
                          <div style={{ display: "flex", gap: "8px" }}>
                            {["whatsapp", "email", "keduanya"].map(ch => (
                              <button key={ch} onClick={() => setTagihanChannel(ch)}
                                style={{
                                  padding: "8px 16px", borderRadius: "8px", border: `2px solid ${tagihanChannel === ch ? "#7C3AED" : "#E2E8F0"}`,
                                  background: tagihanChannel === ch ? "#F5F3FF" : "#fff",
                                  color: tagihanChannel === ch ? "#7C3AED" : "#64748B",
                                  fontWeight: "600", fontSize: "12px", cursor: "pointer",
                                }}>
                                {ch === "whatsapp" ? "WhatsApp" : ch === "email" ? "Email" : "Keduanya"}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          <Button variant="outline" onClick={() => { setTagihanPanelOpen(false); setTagihanResult(null); setTagihanInvId(null); }}>
                            Batal
                          </Button>
                          <Button onClick={handleSendTagihan} disabled={tagihanSending}
                            style={{ background: "#7C3AED", borderColor: "#7C3AED" }}>
                            {tagihanSending ? "Mengirim..." : "Kirim Tagihan"}
                          </Button>
                        </div>
                      </>
                    )}
                  </>
                ) : tagihanData?.message && !tagihanData?.data ? (
                  <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: "8px", padding: "12px", color: "#DC2626", fontSize: "13px" }}>{tagihanData.message}</div>
                ) : null}
              </div>
            </div>
          )}

          {/* Tagihan Print Preview Modal */}
          {tagihanPrintOpen && (
            <div style={{
              position: "fixed", inset: 0, zIndex: 400,
              background: "rgba(0,0,0,0.7)", display: "flex",
              alignItems: "center", justifyContent: "center",
            }}>
              <div style={{
                background: "#fff", borderRadius: "12px", padding: "24px",
                width: "800px", maxWidth: "95vw", height: "90vh",
                display: "flex", flexDirection: "column",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexShrink: 0 }}>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#1E293B" }}>Preview Tagihan</h3>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <Button variant="outline" size="sm" onClick={() => { if (slipIframeRef.current && slipIframeRef.current.contentWindow?.print) slipIframeRef.current.contentWindow.print(); }}>
                      Cetak
                    </Button>
                    <button onClick={() => setTagihanPrintOpen(false)}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "#94A3B8", lineHeight: 1 }}>
                      ×
                    </button>
                  </div>
                </div>
                <iframe
                  ref={slipIframeRef}
                  srcDoc={tagihanPreviewHtml}
                  style={{ flex: 1, border: "1px solid #E2E8F0", borderRadius: "8px", width: "100%" }}
                  title="Preview Tagihan"
                />
              </div>
            </div>
          )}

          {pks.status === "ditandatangani" && (
            <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#92400E", marginBottom: "6px" }}>PKS Ditandatangani — Perlu Validasi</div>
              <div style={{ fontSize: "12px", color: "#B45309", marginBottom: "12px" }}>Faskes telah mengupload PKS yang sudah ditandatangani. Silakan verifikasi sebelum memvalidasi.</div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <Button variant="outline" size="sm" onClick={() => handleDownloadSignedPdf(true)} disabled={!pks.path_signed_pdf}>Preview</Button>
                <Button variant="outline" size="sm" onClick={() => handleDownloadSignedPdf(false)} disabled={!pks.path_signed_pdf}>Download</Button>
                <Button size="sm" onClick={handleValidateSigned} disabled={validating}>{validating ? "Memvalidasi..." : "Validasi & Setujui"}</Button>
                <Button variant="ghost" size="sm" style={{ color: "#DC2626" }} onClick={() => setTolakOpen(!tolakOpen)}>Tolak</Button>
              </div>
              {tolakOpen && (
                <div style={{ marginTop: "12px", borderTop: "1px solid #FDE68A", paddingTop: "12px" }}>
                  <Textarea value={tolakAlasan} onChange={e => setTolakAlasan(e.target.value)} placeholder="Alasan penolakan..." rows={3} className="mb-2" style={{ fontSize: "12px", resize: "vertical" }} />
                  <div style={{ display: "flex", gap: "8px" }}>
                    <Button size="sm" style={{ background: "#DC2626", borderColor: "#DC2626" }} onClick={handleTolakSigned} disabled={submittingTolak || !tolakAlasan.trim()}>{submittingTolak ? "Menolak..." : "Kirim Penolakan"}</Button>
                    <Button variant="outline" size="sm" onClick={() => { setTolakOpen(false); setTolakAlasan(""); }}>Batal</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {pks.status === "selesai" && (
            <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#166534", marginBottom: "6px" }}>PKS Selesai Divalidasi</div>
              <div style={{ fontSize: "12px", color: "#15803D", marginBottom: "12px" }}>PKS sudah divalidasi. Invoice telah diterbitkan.</div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <Button variant="outline" size="sm" onClick={() => handleDownloadSignedPdf(true)} disabled={!pks.path_signed_pdf}>Preview</Button>
                <Button variant="outline" size="sm" onClick={() => handleDownloadSignedPdf(false)} disabled={!pks.path_signed_pdf}>Download</Button>
              </div>
            </div>
          )}

          {/* Invoices */}
          {pks.invoice && (
            <div>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "8px" }}>Invoice</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {[pks.invoice].map(inv => (
                  <div key={inv.id}>
                    <InvoiceStatusCard invoice={inv} />
                    <InvoiceItems inv={inv} />
                    <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const token = localStorage.getItem("token");
                          setTagihanPreviewHtml("");
                          const res = await fetch(`/api/invoice/${inv.id}/tagihan/preview`, {
                            headers: { Authorization: `Bearer ${token}` },
                          });
                          if (res.ok) {
                            const html = await res.text();
                            setTagihanPreviewHtml(html);
                            setTagihanPrintOpen(true);
                          }
                        }}
                      >
                        Cetak Tagihan
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenTagihan(inv.id)}
                      >
                        Kirim Tagihan
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function KontrakInvoicing() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [selectedPks, setSelectedPks] = useState(null);

  // Modal tambah PKS
  const [showAddModal, setShowAddModal] = useState(false);
  const [eligibleSiklus, setEligibleSiklus] = useState([]);
  const [selectedSiklus, setSelectedSiklus] = useState(null);
  const [nomorPksInput, setNomorPksInput] = useState("");
  const [error, setError] = useState("");

  // Ref untuk akses page terbaru di dalam callback (bypass closure)
  const pageRef = useRef(1);
  useEffect(() => { pageRef.current = page; }, [page]);

  // Build query params
  const params = new URLSearchParams();
  params.set("page", String(page));
  if (search) params.set("search", search);
  if (statusFilter) params.set("status", statusFilter);

  // Kontrak list query
  const { data: listData, isLoading: listLoading } = useApi(
    ["kontrak-list", page, search, statusFilter],
    `/kontrak?${params.toString()}`,
    { enabled: true }
  );

  const items = listData?.data || [];
  React.useEffect(() => {
    if (listData) {
      setTotal(listData.total || 0);
      setLastPage(listData.last_page || 1);
    }
  }, [listData]);

  // Load eligible siklus for add modal
  const { data: siklusData, isLoading: loadingSiklus } = useApi(
    ["siklus-eligible"],
    "/kontrak/siklus-eligible",
    { enabled: showAddModal }
  );

  React.useEffect(() => {
    if (siklusData) {
      setEligibleSiklus(siklusData.data || []);
    }
  }, [siklusData]);

  // Mutations
  const { mutate: createDraft, isPending: creating } = useMutateKeys(["kontrak-list"], {
    onSuccess: () => {
      setShowAddModal(false);
      if (pageRef.current !== 1) {
        setPage(1);
      }
    },
    onError: (err) => { setError(err.message); },
  });

  const handleCreateDraft = () => {
    if (!selectedSiklus) return;
    setError("");
    const body = {};
    if (nomorPksInput.trim()) body.nomor_pks = nomorPksInput.trim();
    createDraft({
      path: `/kontrak/siklus/${selectedSiklus.id}/draf`,
      method: "POST",
      body,
    });
  };

  function handleSearchKey(e) {
    if (e.key === "Enter") {
      setPage(1);
    }
  }

  const stats = {
    total: items.length,
    draft: items.filter(p => p.status === "draft").length,
    ditandatangani: items.filter(p => p.status === "ditandatangani").length,
    selesai: items.filter(p => p.status === "selesai" || p.status === "disetujui").length,
    totalInvoice: items.reduce((s, p) => s + (p.invoice_count || 0), 0),
    totalNilai: items.reduce((s, p) => s + (p.total_invoice || 0), 0),
  };

  return (
    <div>
      <div style={{ marginBottom: "20px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>Kontrak & Invoicing</h1>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>Daftar Perjanjian Kerja Sama (PKS) dan invoice yang terkait.</p>
        </div>
        <Button onClick={() => { setShowAddModal(true); setSelectedSiklus(null); setNomorPksInput(""); setError(""); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Tambah PKS
        </Button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
        <Stat label="Total PKS" value={total} color="#1E40AF" />
        <Stat label="Draf" value={stats.draft} color="#94A3B8" />
        <Stat label="Menunggu Validasi" value={stats.ditandatangani} color="#92400E" />
        <Stat label="Selesai" value={stats.selesai} color="#166534" />
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: "320px" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" width="16" height="16" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="form-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleSearchKey}
            placeholder="Cari nomor PKS atau nama faskes..."
            style={{ paddingLeft: "34px" }}
          />
        </div>
        <select
          className="form-input"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ width: "200px" }}
        >
          <option value="">Semua Status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: "40px" }}>No</th>
                <th>Nomor PKS</th>
                <th>Faskes</th>
                <th>Lembaga</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Invoice</th>
                <th style={{ textAlign: "right" }}>Total Tagihan</th>
                <th>Tanggal</th>
                <th style={{ width: "100px" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {listLoading ? (
                <tr><td colSpan="9" style={{ textAlign: "center", color: "#94A3B8", padding: "48px" }}>Memuat...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan="9" style={{ textAlign: "center", color: "#94A3B8", padding: "48px" }}>Tidak ada PKS ditemukan.</td></tr>
              ) : items.map((p, i) => (
                <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => setSelectedPks(p.id)}>
                  <td style={{ color: "#94A3B8", fontSize: "12px" }}>{(page - 1) * 15 + i + 1}</td>
                  <td style={{ fontWeight: "500", color: "#1E293B" }}>{p.nomor_pks || "—"}</td>
                  <td>
                    <div style={{ fontWeight: "500", color: "#1E293B", fontSize: "13px" }}>{p.siklus?.faskes?.nama || "—"}</div>
                    {p.siklus?.faskes?.jenisFaskes && (
                      <div style={{ fontSize: "11px", color: "#94A3B8" }}>{p.siklus.faskes.jenisFaskes.nama}</div>
                    )}
                  </td>
                  <td style={{ color: "#64748B", fontSize: "12px" }}>{p.siklus?.lembaga?.nama || "—"}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td style={{ textAlign: "right", fontSize: "12px", color: "#475569" }}>
                    {p.invoice_count || 0} {p.invoice_lunas_count > 0 && (
                      <span style={{ color: "#166534", fontSize: "11px" }}> ({p.invoice_lunas_count} lunas)</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: "500", color: "#1E293B" }}>
                    {p.invoice_count > 0 ? (
                      <div>{formatRp(p.total_invoice)}</div>
                    ) : p.estimasi_tagihan > 0 ? (
                      <div>
                        <div style={{ color: "#94A3B8", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Estimasi</div>
                        <div>{formatRp(p.estimasi_tagihan)}</div>
                      </div>
                    ) : (
                      <span style={{ color: "#94A3B8" }}>—</span>
                    )}
                  </td>
                  <td style={{ color: "#64748B", fontSize: "12px" }}>{formatDate(p.created_at)}</td>
                  <td>
                    <Button size="sm" onClick={e => { e.stopPropagation(); setSelectedPks(p.id); }}>
                      Detail
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {lastPage > 1 && (
          <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #E2E8F0" }}>
            <span style={{ fontSize: "12px", color: "#64748B" }}>
              Menampilkan {items.length} dari {total} PKS
            </span>
            <div style={{ display: "flex", gap: "4px" }}>
              <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹ Sebelumnya</Button>
              <span style={{ padding: "4px 12px", fontSize: "12px", color: "#475569" }}>{page} / {lastPage}</span>
              <Button variant="ghost" size="sm" disabled={page >= lastPage} onClick={() => setPage(p => p + 1)}>Selanjutnya ›</Button>
            </div>
          </div>
        )}
      </div>

      {selectedPks && (
        <DetailPanel pksId={selectedPks} onClose={() => { setSelectedPks(null); }} />
      )}

      {/* Modal Tambah PKS */}
      {showAddModal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(15,23,42,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => !creating && setShowAddModal(false)}
        >
          <div
            style={{
              background: "#fff", borderRadius: "12px",
              maxWidth: "560px", width: "100%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              padding: "16px 20px",
              borderBottom: "1px solid #F1F5F9",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <div style={{ fontSize: "15px", fontWeight: "600", color: "#1E293B" }}>Buat Draf PKS</div>
                <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>Pilih siklus akreditasi yang akan dibuatkan PKS.</div>
              </div>
              <button
                onClick={() => !creating && setShowAddModal(false)}
                disabled={creating}
                style={{ background: "none", border: "none", cursor: creating ? "wait" : "pointer", color: "#94A3B8" }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div style={{ padding: "20px" }}>
              {error && (
                <div style={{ marginBottom: "12px", padding: "10px 14px", background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: "6px", color: "#991B1B", fontSize: "13px" }}>{error}</div>
              )}

              {loadingSiklus ? (
                <div style={{ textAlign: "center", padding: "32px", color: "#94A3B8" }}>Memuat siklus eligible...</div>
              ) : eligibleSiklus.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px", color: "#94A3B8", fontSize: "13px" }}>
                  Tidak ada siklus eligible untuk dibuatkan PKS.<br />
                  Siklus harus memiliki kelengkapan dokumen "Lengkap" dan belum memiliki PKS.
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ fontSize: "12px", fontWeight: "600", color: "#475569", display: "block", marginBottom: "6px" }}>Pilih Siklus</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "260px", overflowY: "auto" }}>
                      {eligibleSiklus.map(siklus => (
                        <div
                          key={siklus.id}
                          onClick={() => setSelectedSiklus(siklus)}
                          style={{
                            padding: "12px 14px",
                            border: `2px solid ${selectedSiklus?.id === siklus.id ? "#2E7D32" : "#E2E8F0"}`,
                            borderRadius: "8px",
                            cursor: "pointer",
                            background: selectedSiklus?.id === siklus.id ? "#F0FDF4" : "#FAFAFA",
                            transition: "all 0.15s",
                          }}
                        >
                          <div style={{ fontSize: "13px", fontWeight: "600", color: "#1E293B" }}>{siklus.faskes?.nama || "—"}</div>
                          <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>
                            {siklus.faskes?.jenisFaskes?.nama} · {siklus.lembaga?.nama} · {siklus.tanggal_pengajuan ? formatDate(siklus.tanggal_pengajuan) : "—"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ fontSize: "12px", fontWeight: "600", color: "#475569", display: "block", marginBottom: "6px" }}>
                      Nomor PKS <span style={{ color: "#94A3B8", fontWeight: "400" }}>(opsional)</span>
                    </label>
                    <input
                      className="form-input"
                      value={nomorPksInput}
                      onChange={e => setNomorPksInput(e.target.value)}
                      placeholder="Contoh: PKS/LAM-KES/2026/0001"
                      style={{ fontSize: "13px" }}
                    />
                    <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "4px" }}>
                      Jika dikosongkan, nomor PKS akan dibuat otomatis.
                    </div>
                  </div>
                </>
              )}

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <Button variant="outline" onClick={() => setShowAddModal(false)} disabled={creating}>
                  Batal
                </Button>
                <Button onClick={handleCreateDraft} disabled={creating || !selectedSiklus}>
                  {creating ? "Membuat..." : "Buat Draf PKS"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
