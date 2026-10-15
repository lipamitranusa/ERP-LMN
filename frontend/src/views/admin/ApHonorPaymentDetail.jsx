import React, { useState, useEffect, useRef } from "react";
import { useHistory, useParams } from "react-router-dom";
import { formatDate } from "../../utils/dateFormat";

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
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(body.message || `API error: ${res.status}`);
    e.status = res.status;
    throw e;
  }
  return body;
}

function formatRp(n) {
  return `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
}

const PERAN_LABEL = {
  surveior: "Surveior",
  verifikator: "Verifikator",
  rekomendator: "Rekomendator",
};

const METODE_LABEL = {
  transfer_bank: "Transfer Bank",
  tunai: "Tunai",
  lainnya: "Lainnya",
};

const STATUS_MAP = {
  draft:      { label: "Draft",      bg: "#F1F5F9", text: "#475569" },
  disetujui:  { label: "Disetujui",  bg: "#DCFCE7", text: "#166534" },
  dibatalkan: { label: "Dibatalkan", bg: "#FEE2E2", text: "#991B1B" },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.draft;
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

export default function ApHonorPaymentDetail() {
  const history = useHistory();
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionInProgress, setActionInProgress] = useState(false);

  // Cancel form state
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelAlasan, setCancelAlasan] = useState("");

  const load = () => {
    setLoading(true);
    api(`/keuangan/ap-honor/payments/${id}`)
      .then(d => {
        setData(d?.data || null);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  // Kirim Slip state
  const [showSlipPanel, setShowSlipPanel] = useState(false);
  const [slipData, setSlipData] = useState(null);
  const [slipLoading, setSlipLoading] = useState(false);
  const [slipError, setSlipError] = useState("");
  const [slipPreviewHtml, setSlipPreviewHtml] = useState("");
  const [sendChannel, setSendChannel] = useState("whatsapp");
  const [sendLoading, setSendLoading] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const slipIframeRef = useRef(null);

  const loadSlip = () => {
    if (!id) return;
    setSlipLoading(true);
    setSlipError("");
    fetch(`/api/ledger/slip-honor/${id}/generate`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then(r => r.json())
      .then(d => {
        if (d.message && !d.data) {
          setSlipError(d.message);
        } else {
          setSlipData(d.data);
          loadSlipHtml(id);
        }
        setSlipLoading(false);
      })
      .catch(err => {
        setSlipError(err.message);
        setSlipLoading(false);
      });
  };

  const loadSlipHtml = async (slipId) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/ledger/slip-honor/${slipId}/preview`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const html = await res.text();
      setSlipPreviewHtml(html);
    } else {
      setSlipError(`Preview gagal dimuat (HTTP ${res.status}).`);
    }
  };

  const handleSendSlip = async () => {
    setSendLoading(true);
    setSendResult(null);
    try {
      const res = await fetch(`/api/ledger/slip-honor/${id}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ channel: sendChannel }),
      });
      const d = await res.json();
      setSendResult(d);
    } catch (err) {
      setSendResult({ message: err.message, data: null });
    } finally {
      setSendLoading(false);
    }
  };

  const handlePrint = () => {
    setShowPrintModal(true);
    loadSlip();
  };

  const printSlipIframe = () => {
    if (slipIframeRef.current) {
      slipIframeRef.current.contentWindow.print();
    }
  };

  // Load slip data when panel opens
  useEffect(() => {
    if (showSlipPanel && !slipData) {
      loadSlip();
    }
    if (showPrintModal && !slipData) {
      loadSlip();
    }
  }, [showSlipPanel, showPrintModal]);

  const handleApprove = async () => {
    if (!window.confirm(`Setujui pembayaran ${data.nomor_pembayaran}? Honor akan berubah status menjadi lunas dan masuk bukti potong PPh 21.`)) return;
    setActionInProgress(true);
    setError("");
    try {
      await api(`/keuangan/ap-honor/payments/${id}/approve`, { method: "POST" });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleCancel = async (e) => {
    e.preventDefault();
    if (cancelAlasan.length < 3) {
      setError("Alasan pembatalan minimal 3 karakter.");
      return;
    }
    setActionInProgress(true);
    setError("");
    try {
      await api(`/keuangan/ap-honor/payments/${id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ alasan: cancelAlasan }),
      });
      setShowCancelForm(false);
      setCancelAlasan("");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionInProgress(false);
    }
  };

  if (loading && !data) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8" }}>Memuat detail pembayaran...</div>;
  }
  if (error && !data) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <div style={{ color: "#DC2626", fontSize: "13px", marginBottom: "16px" }}>{error}</div>
        <button className="btn btn-primary" onClick={() => history.push("/admin/ap-honor/history")}>
          ← Kembali ke riwayat
        </button>
      </div>
    );
  }
  if (!data) return null;

  const isDraft = data.status === "draft";
  const isApproved = data.status === "disetujui";
  const isCancelled = data.status === "dibatalkan";

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "24px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <button
            className="btn btn-ghost"
            onClick={() => history.push("/admin/ap-honor/history")}
            style={{ fontSize: "12px", padding: "4px 8px", marginBottom: "8px" }}
          >
            ← Kembali
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>
              {data.nomor_pembayaran}
            </h1>
            <StatusBadge status={data.status} />
          </div>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
            Tanggal pembayaran: {formatDate(data.tanggal_pembayaran)}
          </p>
        </div>
        {(isDraft || isApproved) && (
          <div style={{ display: "flex", gap: "8px" }}>
            {isDraft && (
              <button
                className="btn btn-primary"
                onClick={handleApprove}
                disabled={actionInProgress}
                style={{ background: "#16A34A" }}
              >
                ✓ Setujui Pembayaran
              </button>
            )}
            <button
              className="btn btn-secondary"
              onClick={() => setShowCancelForm(v => !v)}
              disabled={actionInProgress}
              style={{ color: "#DC2626" }}
            >
              {isApproved ? "Batalkan" : "Hapus Draft"}
            </button>
          </div>
        )}
        {isApproved && (
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="btn btn-primary"
              onClick={handlePrint}
              style={{ background: "#2563EB" }}
            >
              🖨️ Cetak Slip
            </button>
            <button
              className="btn btn-primary"
              onClick={() => { setShowSlipPanel(true); setSlipData(null); }}
              style={{ background: "#7C3AED" }}
            >
              📤 Kirim Slip
            </button>
          </div>
        )}
      </div>

      {error && (
        <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "10px 16px", borderRadius: "6px", marginBottom: "16px", fontSize: "13px" }}>
          {error}
        </div>
      )}

      {showCancelForm && (
        <div className="card" style={{ padding: "16px 20px", marginBottom: "16px", border: "1px solid #FECACA", background: "#FEF2F2" }}>
          <h3 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: "600", color: "#991B1B" }}>
            {isApproved ? "Batalkan pembayaran yang sudah disetujui" : "Hapus draft pembayaran"}
          </h3>
          {isApproved && (
            <p style={{ margin: "0 0 12px", fontSize: "12px", color: "#7F1D1D" }}>
              <strong>Perhatian:</strong> Jika dibatalkan, status honor akan dikembalikan ke belum_dibayar dan honor dapat dimasukkan ke pembayaran baru.
            </p>
          )}
          <form onSubmit={handleCancel}>
            <div style={{ marginBottom: "12px" }}>
              <label className="form-label">Alasan *</label>
              <textarea
                className="form-input"
                value={cancelAlasan}
                onChange={e => setCancelAlasan(e.target.value)}
                rows={2}
                required
                minLength={3}
                placeholder="Jelaskan alasan pembatalan..."
              />
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setShowCancelForm(false); setCancelAlasan(""); }}
                disabled={actionInProgress}
              >
                Tutup
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ background: "#DC2626" }}
                disabled={actionInProgress}
              >
                {actionInProgress ? "Memproses..." : "Konfirmasi Batalkan"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
        {/* Payment detail */}
        <div className="card" style={{ padding: "20px" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>Detail Pembayaran</h3>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px", fontSize: "13px" }}>
            <div style={{ color: "#64748B" }}>Nomor</div>
            <div style={{ fontFamily: "ui-monospace, monospace" }}>{data.nomor_pembayaran}</div>
            <div style={{ color: "#64748B" }}>Tanggal</div>
            <div>{formatDate(data.tanggal_pembayaran)}</div>
            <div style={{ color: "#64748B" }}>Metode</div>
            <div>{METODE_LABEL[data.metode] || data.metode}</div>
            {data.bank_pengirim && (
              <>
                <div style={{ color: "#64748B" }}>Bank Pengirim</div>
                <div>{data.bank_pengirim}</div>
              </>
            )}
            {data.nomor_rekening_tujuan && (
              <>
                <div style={{ color: "#64748B" }}>No. Rekening</div>
                <div style={{ fontFamily: "ui-monospace, monospace" }}>{data.nomor_rekening_tujuan}</div>
              </>
            )}
            {data.atas_nama && (
              <>
                <div style={{ color: "#64748B" }}>Atas Nama</div>
                <div>{data.atas_nama}</div>
              </>
            )}
            {data.catatan && (
              <>
                <div style={{ color: "#64748B" }}>Catatan</div>
                <div>{data.catatan}</div>
              </>
            )}
            {data.url_bukti_transfer && (
              <>
                <div style={{ color: "#64748B" }}>Bukti Transfer</div>
                <div>
                  <a
                    href={data.url_bukti_transfer}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#2563EB", fontSize: "13px", textDecoration: "underline" }}
                  >
                    Lihat Bukti Transfer
                  </a>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Status & total */}
        <div className="card" style={{ padding: "20px" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>Status & Total</h3>
          <div style={{ background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
            <div style={{ fontSize: "11px", color: "#0C4A6E", textTransform: "uppercase" }}>Total Pembayaran</div>
            <div style={{ fontSize: "26px", fontWeight: "700", color: "#0C4A6E" }}>{formatRp(data.total_nominal)}</div>
            <div style={{ fontSize: "12px", color: "#0C4A6E", marginTop: "4px" }}>{data.jumlah_line_item} line item</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px", fontSize: "13px" }}>
            <div style={{ color: "#64748B" }}>Dibuat oleh</div>
            <div>{data.dibuat_oleh || "—"}</div>
            <div style={{ color: "#64748B" }}>Tgl dibuat</div>
            <div>{formatDate(data.dibuat_pada)}</div>
            {data.disetujui_oleh && (
              <>
                <div style={{ color: "#64748B" }}>Disetujui oleh</div>
                <div>{data.disetujui_oleh}</div>
                <div style={{ color: "#64748B" }}>Tgl disetujui</div>
                <div>{formatDate(data.tanggal_disetujui)}</div>
              </>
            )}
            {isCancelled && (
              <>
                <div style={{ color: "#64748B" }}>Dibatalkan oleh</div>
                <div>{data.dibatalkan_oleh}</div>
                <div style={{ color: "#64748B" }}>Tgl dibatalkan</div>
                <div>{formatDate(data.tanggal_dibatalkan)}</div>
                <div style={{ color: "#64748B" }}>Alasan</div>
                <div style={{ color: "#991B1B" }}>{data.alasan_batal}</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Kirim Slip Panel */}
      {showSlipPanel && (
        <div className="card" style={{ padding: "24px", marginTop: "20px", border: "2px solid #7C3AED", background: "#FAF5FF" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#5B21B6" }}>📤 Kirim Slip Honorarium</h3>
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#7C3AED" }}>
                Kirim slip honor ke tenaga ahli via WhatsApp atau Email.
              </p>
            </div>
            <button
              onClick={() => { setShowSlipPanel(false); setSlipData(null); setSendResult(null); }}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: "#94A3B8", padding: "4px" }}
            >✕</button>
          </div>

          {slipLoading && <div style={{ textAlign: "center", padding: "20px", color: "#7C3AED" }}>Memuat data slip...</div>}

          {slipError && (
            <div style={{ background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: "8px", padding: "12px", color: "#991B1B", fontSize: "13px" }}>
              {slipError}
            </div>
          )}

          {slipData && (
            <>
              {/* Slip Summary */}
              <div style={{ background: "#fff", border: "1px solid #E9D5FF", borderRadius: "10px", padding: "16px", marginBottom: "16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "10px", fontWeight: "600", color: "#7C3AED", textTransform: "uppercase" }}>No. Pembayaran</div>
                    <div style={{ fontSize: "13px", fontWeight: "700", color: "#1E293B", fontFamily: "monospace" }}>{slipData.nomor_pembayaran}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "10px", fontWeight: "600", color: "#7C3AED", textTransform: "uppercase" }}>Penerima</div>
                    <div style={{ fontSize: "13px", fontWeight: "700", color: "#1E293B" }}>{slipData.tenaga_ahli?.nama || "—"}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "10px", fontWeight: "600", color: "#7C3AED", textTransform: "uppercase" }}>Total Neto</div>
                    <div style={{ fontSize: "16px", fontWeight: "800", color: "#16A34A" }}>{formatRp(slipData.total.neto)}</div>
                  </div>
                </div>
                <div style={{ borderTop: "1px solid #E9D5FF", paddingTop: "12px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", fontSize: "12px" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: "#64748B" }}>Bruto</div>
                    <div style={{ fontWeight: "600" }}>{formatRp(slipData.total.bruto)}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: "#64748B" }}>PPN</div>
                    <div style={{ fontWeight: "600", color: "#92400E" }}>{formatRp(slipData.total.ppn)}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: "#64748B" }}>PPh 21</div>
                    <div style={{ fontWeight: "600", color: "#92400E" }}>{formatRp(slipData.total.pph)}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: "#64748B" }}>AC-7</div>
                    <div style={{ fontWeight: "700", color: slipData.total.ac7_valid ? "#16A34A" : "#DC2626" }}>
                      {slipData.total.ac7_valid ? "✓ Valid" : "✕ Selisih"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Channel Selection */}
              {!sendResult && (
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748B", display: "block", marginBottom: "8px" }}>
                    Pilih Channel Pengiriman
                  </label>
                  <div style={{ display: "flex", gap: "12px" }}>
                    {[
                      { value: "whatsapp", label: "WhatsApp", icon: "💬" },
                      { value: "email", label: "Email", icon: "📧" },
                      { value: "both", label: "Keduanya", icon: "📤" },
                    ].map(ch => (
                      <label
                        key={ch.value}
                        style={{
                          display: "flex", alignItems: "center", gap: "8px",
                          padding: "10px 16px", borderRadius: "8px", cursor: "pointer",
                          border: `2px solid ${sendChannel === ch.value ? "#7C3AED" : "#E2E8F0"}`,
                          background: sendChannel === ch.value ? "#FAF5FF" : "#fff",
                          fontSize: "13px", fontWeight: sendChannel === ch.value ? "600" : "400",
                          color: sendChannel === ch.value ? "#5B21B6" : "#475569",
                          transition: "all 0.15s",
                        }}
                      >
                        <input
                          type="radio"
                          name="sendChannel"
                          value={ch.value}
                          checked={sendChannel === ch.value}
                          onChange={() => setSendChannel(ch.value)}
                          style={{ display: "none" }}
                        />
                        <span>{ch.icon}</span>
                        {ch.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Recipients Info */}
              {slipData.tenaga_ahli && (
                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "12px", marginBottom: "16px", fontSize: "12px" }}>
                  <div style={{ fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Penerima:</div>
                  <div><strong>{slipData.tenaga_ahli.nama}</strong> — {slipData.tenaga_ahli.nomor_induk}</div>
                  {slipData.tenaga_ahli.nama_bank && (
                    <div style={{ color: "#64748B", marginTop: "2px" }}>
                      {slipData.tenaga_ahli.nama_bank} — {slipData.tenaga_ahli.atas_nama_rekening} ({slipData.tenaga_ahli.no_rekening})
                    </div>
                  )}
                </div>
              )}

              {/* Send Button */}
              {!sendResult && (
                <button
                  className="btn btn-primary"
                  onClick={handleSendSlip}
                  disabled={sendLoading}
                  style={{ background: "#7C3AED", width: "100%", padding: "12px" }}
                >
                  {sendLoading ? "Mengirim..." : `📤 Kirim via ${sendChannel === "whatsapp" ? "WhatsApp" : sendChannel === "email" ? "Email" : "WhatsApp & Email"}`}
                </button>
              )}

              {/* Send Result */}
              {sendResult && (
                <div style={{
                  background: sendResult.data?.results?.some(r => r.status === "terkirim") ? "#DCFCE7" : "#FEE2E2",
                  border: `1px solid ${sendResult.data?.results?.some(r => r.status === "terkirim") ? "#BBF7D0" : "#FECACA"}`,
                  borderRadius: "10px", padding: "16px",
                }}>
                  <div style={{ fontWeight: "700", fontSize: "14px", color: sendResult.data?.results?.some(r => r.status === "terkirim") ? "#166534" : "#991B1B", marginBottom: "12px" }}>
                    {sendResult.message}
                  </div>
                  {sendResult.data?.results?.map((r, i) => (
                    <div key={i} style={{ fontSize: "12px", color: "#475569", marginBottom: "4px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{
                        display: "inline-block", width: "16px", height: "16px", borderRadius: "50%",
                        background: r.status === "terkirim" ? "#16A34A" : "#DC2626",
                        color: "white", textAlign: "center", lineHeight: "16px", fontSize: "10px",
                      }}>
                        {r.status === "terkirim" ? "✓" : "✕"}
                      </span>
                      <span><strong>{r.channel.toUpperCase()}</strong> — {r.nama} ({r.recipient})</span>
                      {r.error && <span style={{ color: "#DC2626", fontSize: "11px" }}>{r.error}</span>}
                    </div>
                  ))}
                  <button
                    className="btn btn-secondary"
                    onClick={() => { setSendResult(null); setSlipData(null); }}
                    style={{ marginTop: "12px" }}
                  >
                    Kirim lagi
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Print Preview Modal */}
      {showPrintModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: "20px",
        }}>
          <div style={{
            background: "#fff", borderRadius: "12px", maxWidth: "900px", width: "100%",
            maxHeight: "95vh", overflow: "hidden", display: "flex", flexDirection: "column",
          }}>
            {/* Modal Header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: "700", fontSize: "14px", color: "#1E293B" }}>Preview Slip Honorarium</div>
                {slipData && (
                  <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>
                    {slipData.nomor_pembayaran} — {slipData.tenaga_ahli?.nama}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                {slipData && (
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      const iframe = slipIframeRef.current;
                      if (iframe && iframe.contentWindow) {
                        iframe.contentWindow.print();
                      }
                    }}
                    style={{ background: "#2563EB", fontSize: "12px" }}
                  >
                    🖨️ Cetak
                  </button>
                )}
                <button
                  onClick={() => { setShowPrintModal(false); setSlipData(null); setSlipPreviewHtml(""); }}
                  style={{ background: "none", border: "1px solid #E2E8F0", cursor: "pointer", fontSize: "14px", padding: "6px 12px", borderRadius: "6px", color: "#64748B" }}
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflow: "auto", background: "#64748B", padding: "20px" }}>
              {slipLoading && <div style={{ textAlign: "center", padding: "40px", color: "#fff" }}>Memuat preview...</div>}
              {slipError && (
                <div style={{ background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: "8px", padding: "12px", color: "#991B1B" }}>
                  {slipError}
                </div>
              )}
              {slipData && (
                <iframe
                  ref={slipIframeRef}
                  srcDoc={slipPreviewHtml}
                  style={{ width: "100%", height: "100%", minHeight: "700px", border: "none", background: "#fff", borderRadius: "8px" }}
                  title="Slip Honor Preview"
                />
              )}
            </div>
          </div>
        </div>
      )}
      {data.details && data.details.length > 0 && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0" }}>
            <span style={{ fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>Line item ({data.details.length})</span>
          </div>
          <div className="table-container" style={{ border: "none", borderRadius: 0, maxHeight: "500px", overflowY: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Penerima</th>
                  <th>Faskes</th>
                  <th>Tanggal Honor</th>
                  <th style={{ textAlign: "right" }}>Gross</th>
                  <th style={{ textAlign: "right" }}>DPP (50%)</th>
                  <th style={{ textAlign: "right" }}>PPh 21</th>
                  <th style={{ textAlign: "right" }}>Net</th>
                </tr>
              </thead>
              <tbody>
                {data.details.map(d => (
                  <tr key={d.id}>
                    <td>
                      <div style={{ fontSize: "13px", fontWeight: "500" }}>{d.penerima?.nama || "—"}</div>
                      <div style={{ fontSize: "11px", color: "#94A3B8" }}>{d.penerima?.nomor_induk_surveior}</div>
                    </td>
                    <td style={{ fontSize: "12px" }}>{d.siklus_faskes_nama || "—"}</td>
                    <td style={{ fontSize: "12px" }}>{formatDate(d.tanggal_honor)}</td>
                    <td style={{ textAlign: "right", fontSize: "12px" }}>{formatRp(d.nominal_bruto)}</td>
                    <td style={{ textAlign: "right", fontSize: "12px", color: "#64748B" }}>{formatRp(d.dpp)}</td>
                    <td style={{ textAlign: "right", fontSize: "12px", color: "#64748B" }}>{formatRp(d.potongan_pph)}</td>
                    <td style={{ textAlign: "right", fontSize: "12px", fontWeight: "600", color: "#991B1B" }}>{formatRp(d.nominal_dibayar)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}