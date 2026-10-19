import React, { useState } from "react";
import { useParams, useHistory } from "react-router-dom";
import SiklusStepper from "@/components/SiklusStepper";
import { formatDate } from "../../utils/dateFormat";
import { useApi, useMutateKeys } from "@/hooks/useApi";

const DOKUMEN_LABELS = {
  dfo: "Screenshot DFO",
  sisdmk: "Sisdmk",
  aspak: "ASPak",
  inm: "INM",
  ikp: "IKP",
};

const DOKUMEN_ORDER = ["dfo", "sisdmk", "aspak", "inm", "ikp"];

function StatusBadge({ label, type = "default" }) {
  const base = {
    lengkap: "status-lengkap", selesai: "status-selesai", aktif: "status-aktif",
    menunggu: "status-menunggu", ditolak: "status-ditolak", draft: "status-draft",
    info: "status-terkirim",
  };
  const cls = base[label] || base[type] || "status-draft";
  return <span className={`status-badge ${cls}`}>{label?.replace(/_/g, " ")}</span>;
}

function FilePreviewModal({ dokumen, onClose }) {
  const [blobUrl, setBlobUrl] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (!dokumen?.id) return;
    setLoading(true);
    setError(null);
    // Keep raw fetch for blob response — useApi returns parsed JSON
    const token = localStorage.getItem("token");
    const headers = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    fetch(`/api/pendaftaran/dokumen/${dokumen.id}/serve`, { headers })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}: Gagal memuat file`);
        return r.blob();
      })
      .then(blob => {
        setBlobUrl(URL.createObjectURL(blob));
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [dokumen?.id]);

  React.useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  if (!dokumen) return null;

  const isImage = dokumen.mime_type?.startsWith('image/') ||
    dokumen.file_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px",
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: "8px", maxWidth: "960px", width: "100%",
        boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
        maxHeight: "90vh",
        display: "flex", flexDirection: "column",
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          padding: "16px 20px", display: "flex", alignItems: "center",
          justifyContent: "space-between", borderBottom: "1px solid #E2E8F0",
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>
              {dokumen.jenis_dokumen?.toUpperCase()}
            </div>
            <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "2px" }}>
              {dokumen.nama_file_asli || dokumen.jenis_dokumen} · {formatDate(dokumen.created_at)}
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <a
              href={`/api/pendaftaran/dokumen/${dokumen.id}/download`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}
            >
              <svg viewBox="0 0 24 24" fill="none" width="12" height="12" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
              Unduh
            </a>
            <button onClick={onClose} style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#94A3B8", padding: "4px",
            }}>
              <svg viewBox="0 0 24 24" fill="none" width="20" height="20" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
        <div style={{ padding: "0", flex: 1, overflow: "hidden", textAlign: "center", minHeight: "400px", display: "flex", flexDirection: "column" }}>
          {loading && (
            <div style={{ color: "#94A3B8", padding: "60px", display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>Memuat file...</div>
          )}
          {error && (
            <div style={{ color: "#EF4444", padding: "60px", display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>{error}</div>
          )}
          {!loading && !error && blobUrl && (
            isImage ? (
              <img
                src={blobUrl}
                alt={dokumen.nama_file_asli || dokumen.jenis_dokumen}
                style={{ maxWidth: "100%", maxHeight: "calc(90vh - 80px)", objectFit: "contain", flex: 1 }}
              />
            ) : (
              <embed
                src={blobUrl}
                type={dokumen.mime_type || "application/pdf"}
                width="100%"
                style={{ flex: 1, minHeight: "400px", border: "none" }}
              />
            )
          )}
          {!loading && !error && !blobUrl && (
            <div style={{ color: "#94A3B8", padding: "60px", display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              Format file tidak didukung untuk preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SiklusDetail() {
  const { id } = useParams();
  const history = useHistory();
  const [uploadLoading, setUploadLoading] = useState(null);
  const [catatanText, setCatatanText] = useState("");
  const [previewDokumen, setPreviewDokumen] = useState(null);

  const { data, isLoading } = useApi(
    ["siklus-detail", id],
    `/pendaftaran/siklus/${id}`,
    { enabled: !!id }
  );

  const siklus = data?.data ?? null;
  const dokumen = siklus?.dokumen ?? [];
  const checklist = siklus?.checklist ?? [];
  const catatan = siklus?.catatan_revisi ?? [];

  const mutateUpload = useMutateKeys([["siklus-detail"], ["siklus-list"]], {
    onSuccess: (data) => {
      if (data?.data) {
        // dokumen list is nested in siklus.data.dokumen, refetch handles it
      }
    },
  });

  const mutateValidate = useMutateKeys([["siklus-detail"], ["siklus-list"]], {
    onSuccess: (data) => {
      if (data?.data) {
        // refetch will update siklus + checklist
      }
      alert("Validasi berhasil disimpan!");
    },
  });

  const mutateCatatan = useMutateKeys(["siklus-detail"], {
    onSuccess: () => {
      setCatatanText("");
    },
  });

  async function handleUpload(e, jenis) {
    e.preventDefault();
    const file = e.target.files[0];
    if (!file) return;
    setUploadLoading(jenis);
    const formData = new FormData();
    formData.append("jenis_dokumen", jenis);
    formData.append("file", file);
    try {
      await mutateUpload.mutateAsync({
        path: `/pendaftaran/siklus/${id}/dokumen`,
        method: "POST",
        body: formData,
      });
    } catch (err) {
      alert(err.message);
    }
    setUploadLoading(null);
  }

  async function handleValidateAll() {
    const allLengkap = DOKUMEN_ORDER.every(j => {
      const chk = checklist.find(c => c.jenis_dokumen === j);
      return chk?.status_validasi === "lengkap";
    });
    if (!allLengkap) {
      alert("Semua dokumen harus validasi lengkap terlebih dahulu.");
      return;
    }
    const items = DOKUMEN_ORDER.map(j => ({ jenis_dokumen: j, status_validasi: "lengkap" }));
    mutateValidate.mutate({
      path: `/pendaftaran/siklus/${id}/checklist`,
      method: "PUT",
      body: { items },
    });
  }

  async function handleValidateSingle(jenis) {
    mutateValidate.mutate({
      path: `/pendaftaran/siklus/${id}/checklist`,
      method: "PUT",
      body: { items: [{ jenis_dokumen: jenis, status_validasi: "lengkap" }] },
    });
  }

  async function handleSubmitCatatan(e) {
    e.preventDefault();
    if (!catatanText.trim()) return;
    mutateCatatan.mutate({
      path: `/pendaftaran/siklus/${id}/catatan-revisi`,
      method: "POST",
      body: { catatan: catatanText },
    });
  }

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "300px" }}>
        <div style={{ color: "#94A3B8", fontSize: "13px" }}>Memuat data siklus...</div>
      </div>
    );
  }

  if (!siklus) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "300px" }}>
        <div style={{ color: "#94A3B8", fontSize: "13px" }}>Data siklus tidak ditemukan</div>
      </div>
    );
  }

  const tahapNum = siklus.tahapan || siklus.status_tahapan || 1;
  const subTahapNum = siklus.sub_tahapan_survei || siklus.sub_tahapan || 0;
  const tahapStatus = siklus.tahapan_status || siklus.status || "aktif";

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: "24px" }}>
        <button
          onClick={() => history.push("/admin/pendaftaran")}
          className="btn btn-ghost btn-sm"
          style={{ marginBottom: "12px", padding: "6px 0", gap: "4px" }}
        >
          <svg viewBox="0 0 24 24" fill="none" width="16" height="16" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          Kembali ke Pendaftaran
        </button>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>
              {siklus.faskes?.nama || siklus.nama || "Detail Siklus"}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "6px" }}>
              <StatusBadge label={siklus.status_kelengkapan || siklus.status} />
              {siklus.faskes?.jenis && (
                <span style={{ fontSize: "12px", color: "#94A3B8" }}>{siklus.faskes.jenis}</span>
              )}
              {siklus.faskes?.alamat && (
                <span style={{ fontSize: "12px", color: "#94A3B8" }}>{siklus.faskes.alamat}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="card" style={{ padding: "24px", marginBottom: "20px" }}>
        <div style={{ marginBottom: "8px" }}>
          <span style={{ fontSize: "11px", fontWeight: "600", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Tahapan Akreditasi
          </span>
        </div>
        <SiklusStepper
          currentStage={tahapNum}
          stageStatus={tahapStatus}
          subStage={subTahapNum}
          size="md"
          surveiDone={siklus.survei_selesai === true}
          invoiceBelumLunas={siklus.invoice_belum_lunas === true}
        />
      </div>

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "20px", alignItems: "start" }} className="siklus-detail-grid">
        {/* Left: Checklist + Dokumen */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Checklist */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{
              padding: "16px 20px",
              borderBottom: "1px solid #E2E8F0",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>
                Checklist Validasi Dokumen
              </span>
              <button className="btn btn-primary btn-sm" onClick={handleValidateAll}>
                <svg viewBox="0 0 24 24" fill="none" width="14" height="14" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12l5 5L20 7"/>
                </svg>
                Tandai Semua Lengkap
              </button>
            </div>
            <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: "36px" }}>#</th>
                    <th>Jenis Dokumen</th>
                    <th style={{ width: "80px" }}>Versi</th>
                    <th style={{ width: "100px" }}>Status</th>
                    <th style={{ width: "120px", textAlign: "center" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {DOKUMEN_ORDER.map((j, idx) => {
                    const doc = dokumen.find(d => d.jenis_dokumen === j);
                    const chk = checklist.find(c => c.jenis_dokumen === j);
                    const isLengkap = chk?.status_validasi === "lengkap";
                    const isUploaded = !!doc;
                    const loading = uploadLoading === j;

                    return (
                      <tr key={j}>
                        <td style={{ color: "#94A3B8", fontSize: "12px" }}>{idx + 1}</td>
                        <td>
                          <span style={{ fontWeight: "500", color: "#334155" }}>
                            {DOKUMEN_LABELS[j] || j}
                          </span>
                          {doc?.created_at && (
                            <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>
                              Uploaded {formatDate(doc.created_at)}
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: "12px", color: "#64748B" }}>
                          {doc?.versi ? `v${doc.versi}` : "—"}
                        </td>
                        <td>
                          {isLengkap ? (
                            <span className="status-badge status-lengkap">Lengkap</span>
                          ) : isUploaded ? (
                            <span className="status-badge status-menunggu">Pending</span>
                          ) : (
                            <span className="status-badge status-ditolak">Belum Upload</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
                            <input
                              type="file"
                              accept=".pdf"
                              onChange={e => handleUpload(e, j)}
                              style={{ display: "none" }}
                              id={`upload-${j}`}
                            />
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => document.getElementById(`upload-${j}`).click()}
                              disabled={loading}
                              title={doc ? "Upload ulang" : "Upload"}
                            >
                              {loading ? (
                                <span style={{ fontSize: "10px" }}>...</span>
                              ) : doc ? (
                                <svg viewBox="0 0 24 24" fill="none" width="12" height="12" stroke="currentColor" strokeWidth="2">
                                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                                </svg>
                              ) : (
                                <svg viewBox="0 0 24 24" fill="none" width="12" height="12" stroke="currentColor" strokeWidth="2">
                                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                                </svg>
                              )}
                            </button>

                            {doc && (
                              <>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => setPreviewDokumen(doc)}
                                  title="Lihat file"
                                  style={{ padding: "6px" }}
                                >
                                  <svg viewBox="0 0 24 24" fill="none" width="12" height="12" stroke="currentColor" strokeWidth="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                    <circle cx="12" cy="12" r="3"/>
                                  </svg>
                                </button>
                                {!isLengkap && (
                                  <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => handleValidateSingle(j)}
                                    title="Tandai lengkap"
                                    style={{ padding: "6px", color: "#4CAF50" }}
                                  >
                                    <svg viewBox="0 0 24 24" fill="none" width="12" height="12" stroke="currentColor" strokeWidth="2">
                                      <path d="M5 12l5 5L20 7"/>
                                    </svg>
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dokumen terupload */}
          {dokumen.length > 0 && (
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0" }}>
                <span style={{ fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>
                  Riwayat Dokumen
                </span>
              </div>
              <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Jenis</th>
                      <th style={{ width: "70px" }}>Versi</th>
                      <th style={{ width: "140px" }}>Tanggal Upload</th>
                      <th style={{ width: "80px" }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dokumen.map((d, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: "500", color: "#334155" }}>
                          {DOKUMEN_LABELS[d.jenis_dokumen] || d.jenis_dokumen}
                        </td>
                        <td style={{ fontSize: "12px", color: "#64748B" }}>v{d.versi}</td>
                        <td style={{ fontSize: "12px", color: "#64748B" }}>
                          {formatDate(d.created_at)}
                        </td>
                        <td>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setPreviewDokumen(d)}
                            style={{ padding: "4px 8px" }}
                          >
                            Lihat
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right: Info & Catatan */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Info faskes */}
          <div className="card" style={{ padding: "20px" }}>
            <div style={{ fontSize: "13px", fontWeight: "600", color: "#1E293B", marginBottom: "16px" }}>
              Info Faskes
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                ["Nama", siklus.faskes?.nama || "—"],
                ["Jenis", siklus.faskes?.jenis || "—"],
                ["Alamat", siklus.faskes?.alamat || "—"],
                ["Email", siklus.faskes?.email || "—"],
                ["Telepon", siklus.faskes?.telepon || "—"],
                ["Penanggung Jawab", siklus.faskes?.penanggung_jawab || "—"],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: "11px", fontWeight: "600", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>
                    {label}
                  </div>
                  <div style={{ fontSize: "13px", color: "#334155" }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Catatan revisi */}
          <div className="card" style={{ padding: "20px" }}>
            <div style={{ fontSize: "13px", fontWeight: "600", color: "#1E293B", marginBottom: "16px" }}>
              Catatan Revisi
            </div>

            {catatan.length === 0 ? (
              <div style={{
                padding: "20px", textAlign: "center",
                color: "#94A3B8", fontSize: "13px",
                background: "#F8FAFC", borderRadius: "6px",
                border: "1px dashed #E2E8F0",
              }}>
                Belum ada catatan revisi
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px", maxHeight: "240px", overflowY: "auto" }}>
                {catatan.map(c => (
                  <div key={c.id} style={{
                    padding: "12px",
                    background: "#F8FAFC",
                    borderRadius: "6px",
                    border: "1px solid #E2E8F0",
                  }}>
                    <div style={{ fontSize: "11px", color: "#94A3B8", marginBottom: "4px" }}>
                      {c.user?.nama || "System"} · {formatDate(c.created_at)}
                    </div>
                    <div style={{ fontSize: "13px", color: "#334155", lineHeight: "1.5" }}>
                      {c.catatan}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmitCatatan}>
              <textarea
                className="form-input"
                placeholder="Tulis catatan revisi..."
                rows="2"
                value={catatanText}
                onChange={e => setCatatanText(e.target.value)}
                style={{ marginBottom: "10px", resize: "vertical" }}
              />
              <button
                type="submit"
                className="btn btn-secondary btn-sm"
                disabled={mutateCatatan.isPending || !catatanText.trim()}
                style={{ width: "100%" }}
              >
                {mutateCatatan.isPending ? "Mengirim..." : "Kirim Catatan"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {previewDokumen && (
        <FilePreviewModal dokumen={previewDokumen} onClose={() => setPreviewDokumen(null)} />
      )}
    </div>
  );
}

export default SiklusDetail;
