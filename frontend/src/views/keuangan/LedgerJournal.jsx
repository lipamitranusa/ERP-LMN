import React, { useState } from "react";
import { useApi, useMutateKeys } from "@/hooks/useApi";
import { formatDateTime } from "../../utils/dateFormat";
import { Button } from "@/components/ui/button";

function formatRp(n) {
  return `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
}

function tipeBadge(tipe) {
  const map = {
    piutang_lunas: { label: "Piutang Lunas", bg: "#DCFCE7", color: "#166534" },
    ap_honor_surveior: { label: "Honor Surveior", bg: "#EDE9F6", color: "#5E35B1" },
    ap_honor_verifikator: { label: "Honor Verifikator", bg: "#FEF3C7", color: "#92400E" },
    penyesuaian_pks: { label: "Penyesuaian PKS", bg: "#FEE2E2", color: "#991B1B" },
    refund: { label: "Refund", bg: "#F3E8FF", color: "#7C3AED" },
  };
  const s = map[tipe] || { label: tipe, bg: "#F1F5F9", color: "#475569" };
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "9999px", fontSize: "11px", fontWeight: "600", background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function statusBadge(status) {
  const map = {
    lunas: { label: "Lunas", bg: "#DCFCE7", color: "#166534" },
    belum_dibayar: { label: "Belum Dibayar", bg: "#FEF9C3", color: "#854D0E" },
    sebagian: { label: "Sebagian", bg: "#EDE9F6", color: "#5E35B1" },
  };
  const s = map[status] || { label: status, bg: "#F1F5F9", color: "#475569" };
  return (
    <span style={{ display: "inline-block", padding: "1px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "600", background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function Ac7Badge({ valid, selisih }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      padding: "2px 8px", borderRadius: "9999px", fontSize: "10px", fontWeight: "700",
      background: valid ? "#DCFCE7" : "#FEE2E2",
      color: valid ? "#166534" : "#991B1B",
    }}>
      {valid ? "✓ AC-7" : `! SELISIH ${formatRp(Math.abs(selisih))}`}
    </span>
  );
}

function AuditTrailRow({ audit }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid #F1F5F9" }}>
      <div
        onClick={() => setOpen(!open)}
        style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", cursor: "pointer", background: "#F8FAFC", fontSize: "12px" }}
      >
        <span style={{ fontSize: "10px", color: "#94A3B8" }}>{formatDateTime(audit.created_at)}</span>
        <span style={{ fontWeight: "600", color: "#475569" }}>{audit.aksi}</span>
        <span style={{ color: "#94A3B8", marginLeft: "auto" }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{ padding: "8px 12px", fontSize: "11px", color: "#64748B" }}>
          {audit.data_sesudah && (
            <div><strong>Data:</strong> <pre style={{ margin: "4px 0", whiteSpace: "pre-wrap", fontSize: "10px" }}>{JSON.stringify(audit.data_sesudah, null, 2)}</pre></div>
          )}
          {audit.user_agent && <div><strong>Source:</strong> {audit.user_agent}</div>}
          {audit.ip_address && <div><strong>IP:</strong> {audit.ip_address}</div>}
        </div>
      )}
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div style={{ background: "#F8FAFC", borderRadius: "8px", padding: "10px 12px" }}>
      <div style={{ fontSize: "10px", fontWeight: "600", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "13px", color: "#1E293B" }}>{value}</div>
    </div>
  );
}

function EntryDetailModal({ entryId, onClose }) {
  const { data, isLoading, error } = useApi(
    ["ledger-entry", entryId],
    "/ledger/entry/" + entryId,
    { enabled: !!entryId }
  );

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: "20px",
    }}>
      <div style={{
        background: "#fff", borderRadius: "12px", maxWidth: "700px", width: "100%",
        maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: "700", fontSize: "14px", color: "#1E293B" }}>Detail Ledger Entry</div>
            <div style={{ fontSize: "11px", color: "#94A3B8", fontFamily: "monospace" }}>{entryId}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: "#94A3B8", padding: "4px 8px" }}>✕</button>
        </div>

        {isLoading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8" }}>Memuat...</div>
        ) : error ? (
          <div style={{ padding: "20px", color: "#991B1B" }}>{error.message}</div>
        ) : (
          <>
            <div style={{ flex: 1, overflow: "auto", padding: "20px" }}>
              {/* AC-7 Badge */}
              <div style={{
                padding: "12px 16px", borderRadius: "8px", marginBottom: "16px",
                background: data.ac7.valid ? "#DCFCE7" : "#FEE2E2",
                border: `1px solid ${data.ac7.valid ? "#BBF7D0" : "#FECACA"}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: data.ac7.valid ? "#166534" : "#991B1B" }}>
                    {data.ac7.valid ? "✓ AC-7 TERPENUHI — Invariant berlaku" : "✕ AC-7 GAGAL — Selisih terdeteksi!"}
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: "600", color: data.ac7.valid ? "#166534" : "#991B1B" }}>
                    {data.ac7.persamaan}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px" }}>
                  {[
                    { label: "BRUTO", value: formatRp(data.ac7.bruto), color: "#1E293B" },
                    { label: "− PPN", value: formatRp(data.ac7.ppn), color: "#92400E" },
                    { label: "− PPh 21", value: formatRp(data.ac7.pph), color: "#92400E" },
                    { label: "= NETO", value: formatRp(data.ac7.neto_tersimpan), color: "#166534" },
                  ].map(c => (
                    <div key={c.label} style={{ background: "#fff", borderRadius: "6px", padding: "8px 10px", textAlign: "center" }}>
                      <div style={{ fontSize: "9px", fontWeight: "700", color: "#94A3B8", letterSpacing: "0.05em" }}>{c.label}</div>
                      <div style={{ fontSize: "13px", fontWeight: "700", color: c.color, marginTop: "2px" }}>{c.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Entry info */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <InfoCard label="Tipe" value={data.entry.tipe_label} />
                <InfoCard label="Status Pembayaran" value={<div style={{ marginTop: "-4px" }}>{statusBadge(data.entry.status_pembayaran)}</div>} />
                <InfoCard label="Nominal Bruto" value={<span style={{ color: "#1E293B", fontWeight: "600" }}>{formatRp(data.entry.nominal_bruto)}</span>} />
                <InfoCard label="Nominal Neto" value={<span style={{ color: "#166534", fontWeight: "700" }}>{formatRp(data.entry.nominal_neto)}</span>} />
                <InfoCard label="Pot. PPN" value={<span style={{ color: "#92400E" }}>{formatRp(data.entry.potongan_ppn)}</span>} />
                <InfoCard label="Pot. PPh 21" value={<span style={{ color: "#92400E" }}>{formatRp(data.entry.potongan_pph)}</span>} />
              </div>

              {/* Trace */}
              {data.trace.length > 0 && (
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "8px" }}>TRACE (AC-6)</div>
                  <div style={{ border: "1px solid #E2E8F0", borderRadius: "8px", overflow: "hidden" }}>
                    {data.trace.map((step, i) => (
                      <div key={i} style={{ display: "flex", gap: "12px", padding: "10px 12px", borderBottom: i < data.trace.length - 1 ? "1px solid #F1F5F9" : "none", background: i % 2 === 0 ? "#FAFAFA" : "#fff" }}>
                        <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#4F46E5", color: "#fff", fontSize: "10px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px" }}>
                          {step.urutan}
                        </span>
                        <div>
                          <div style={{ fontSize: "12px", fontWeight: "600", color: "#1E293B" }}>{step.kejadian}</div>
                          <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>{step.sumber}</div>
                          <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>{step.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Siklus / Faskes */}
              {data.siklus && (
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "8px" }}>SIKLUS / FASKES</div>
                  <div style={{ background: "#F8FAFC", borderRadius: "8px", padding: "12px", fontSize: "12px" }}>
                    <div><strong>Siklus:</strong> {data.siklus.nama}</div>
                    <div><strong>Faskes:</strong> {data.siklus.faskes_nama || "—"}</div>
                    <div><strong>Status:</strong> {data.siklus.status}</div>
                  </div>
                </div>
              )}

              {/* Related entries */}
              {data.related_entries?.length > 0 && (
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "8px" }}>ENTRY TERKAIT (Siklus Sama)</div>
                  <div style={{ border: "1px solid #E2E8F0", borderRadius: "8px", overflow: "hidden" }}>
                    {data.related_entries.map(e => (
                      <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderBottom: "1px solid #F1F5F9", fontSize: "11px" }}>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          {tipeBadge(e.tipe)}
                          <span style={{ color: "#64748B" }}>{e.penerima_nama || "—"}</span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ color: "#1E293B", fontWeight: "600" }}>{formatRp(e.nominal_bruto)}</div>
                          <div style={{ color: "#94A3B8", fontSize: "10px" }}>{formatDateTime(e.created_at)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Audit Trail */}
              <div>
                <div style={{ fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "8px" }}>AUDIT TRAIL (AC-6)</div>
                <div style={{ border: "1px solid #E2E8F0", borderRadius: "8px", overflow: "hidden" }}>
                  {data.audit_trail?.length > 0 ? (
                    data.audit_trail.map(a => <AuditTrailRow key={a.id} audit={a} />)
                  ) : (
                    <div style={{ padding: "16px", color: "#94A3B8", fontSize: "12px", textAlign: "center" }}>Tidak ada audit trail.</div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function LedgerJournal() {
  // Filters
  const [tipeFilter, setTipeFilter] = useState("");
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [selectedEntry, setSelectedEntry] = useState(null);

  const TIPE_OPTIONS = [
    { value: "piutang_lunas", label: "Piutang Lunas" },
    { value: "ap_honor_surveior", label: "Honor Surveior" },
    { value: "ap_honor_verifikator", label: "Honor Verifikator" },
    { value: "penyesuaian_pks", label: "Penyesuaian PKS" },
    { value: "refund", label: "Refund" },
  ];

  const buildParams = (pg) => {
    const params = new URLSearchParams({ page: pg });
    if (tipeFilter) params.set("tipe", tipeFilter);
    if (dari) params.set("dari", dari);
    if (sampai) params.set("sampai", sampai);
    if (statusFilter) params.set("status", statusFilter);
    if (q) params.set("q", q);
    return params.toString();
  };

  const qs = buildParams(page);

  const { data, isLoading, error, refetch } = useApi(
    ["ledger-journal", tipeFilter, dari, sampai, statusFilter, q, page],
    "/ledger/journal?" + qs
  );

  const entries = data?.entries || [];
  const pagination = data?.pagination || null;
  const saldoAwal = data?.saldo_awal || 0;

  function handleFilterClick() {
    setPage(1);
  }

  function handleReset() {
    setTipeFilter("");
    setDari("");
    setSampai("");
    setStatusFilter("");
    setQ("");
    setPage(1);
  }

  // Running balance
  let runningBalance = saldoAwal;
  const rows = entries.map(e => {
    const isDebit = e.tipe !== "piutang_lunas" && e.tipe !== "refund";
    const debit = isDebit ? parseFloat(e.nominal_bruto) : 0;
    const credit = !isDebit ? parseFloat(e.nominal_neto) : 0;
    runningBalance += credit - debit;
    return { ...e, debit, credit, balance: runningBalance, isDebit };
  });

  function verifyAc7(e) {
    const bruto = parseFloat(e.nominal_bruto || 0);
    const ppn = parseFloat(e.potongan_ppn || 0);
    const pph = parseFloat(e.potongan_pph || 0);
    const neto = parseFloat(e.nominal_neto || 0);
    const calculated = Math.round((bruto - ppn - pph) * 100) / 100;
    return { valid: Math.abs(neto - calculated) < 0.01, selisih: neto - calculated };
  }

  return (
    <div style={{ maxWidth: "1300px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#1E293B" }}>Buku Besar Ledger</h1>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
          Seluruh Ledger Entry Fase 1–2 tertelusuri · PRD AC-6
        </p>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: "16px 20px", marginBottom: "20px", display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <label style={{ fontSize: "11px", fontWeight: "600", color: "#64748B", display: "block", marginBottom: "4px" }}>Tipe</label>
          <select className="form-input" value={tipeFilter} onChange={e => setTipeFilter(e.target.value)} style={{ width: "160px" }}>
            <option value="">Semua Tipe</option>
            {TIPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: "11px", fontWeight: "600", color: "#64748B", display: "block", marginBottom: "4px" }}>Dari</label>
          <input type="date" className="form-input" value={dari} onChange={e => setDari(e.target.value)} style={{ width: "140px" }} />
        </div>
        <div>
          <label style={{ fontSize: "11px", fontWeight: "600", color: "#64748B", display: "block", marginBottom: "4px" }}>Sampai</label>
          <input type="date" className="form-input" value={sampai} onChange={e => setSampai(e.target.value)} style={{ width: "140px" }} />
        </div>
        <div>
          <label style={{ fontSize: "11px", fontWeight: "600", color: "#64748B", display: "block", marginBottom: "4px" }}>Status Bayar</label>
          <select className="form-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: "140px" }}>
            <option value="">Semua</option>
            <option value="lunas">Lunas</option>
            <option value="belum_dibayar">Belum Dibayar</option>
            <option value="sebagian">Sebagian</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: "11px", fontWeight: "600", color: "#64748B", display: "block", marginBottom: "4px" }}>Cari</label>
          <input type="text" className="form-input" value={q} onChange={e => setQ(e.target.value)} placeholder="Nama TA, ID..." style={{ width: "160px" }} />
        </div>
        <Button onClick={handleFilterClick}>
          Filter
        </Button>
        {(tipeFilter || dari || sampai || statusFilter || q) && (
          <Button variant="ghost" onClick={handleReset}>
            Reset
          </Button>
        )}
      </div>

      {/* Saldo Awal */}
      {saldoAwal !== 0 && (
        <div style={{ padding: "8px 16px", background: "#F8FAFC", borderRadius: "8px", marginBottom: "12px", fontSize: "12px", color: "#64748B", display: "flex", gap: "24px" }}>
          <span><strong>Saldo Awal Periode:</strong> {formatRp(saldoAwal)}</span>
        </div>
      )}

      {error && (
        <div style={{ padding: "12px 16px", background: "#FEE2E2", color: "#991B1B", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" }}>
          {error.message}
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        {isLoading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#94A3B8" }}>Memuat...</div>
        ) : entries.length === 0 ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#94A3B8", fontSize: "13px" }}>Belum ada data ledger entry.</div>
        ) : (
          <div className="table-container" style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Tipe</th>
                  <th>Faskes</th>
                  <th>Penerima</th>
                  <th style={{ textAlign: "right" }}>Debit (Honor)</th>
                  <th style={{ textAlign: "right" }}>Credit (Pemasukan)</th>
                  <th style={{ textAlign: "right" }}>Saldo</th>
                  <th>AC-7</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(e => {
                  const ac7 = verifyAc7(e);
                  return (
                    <tr key={e.id} style={{ cursor: "pointer" }} onClick={() => setSelectedEntry(e.id)}>
                      <td style={{ fontSize: "12px", color: "#475569", whiteSpace: "nowrap" }}>
                        {formatDateTime(e.created_at)}
                      </td>
                      <td>{tipeBadge(e.tipe)}</td>
                      <td style={{ fontSize: "12px", color: "#475569", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {e.siklus?.faskes?.nama || "—"}
                      </td>
                      <td style={{ fontSize: "12px", color: "#1E293B", maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {e.penerima?.nama || (e.tipe === "piutang_lunas" ? "Pemasukan" : "—")}
                      </td>
                      <td style={{ textAlign: "right", color: "#92400E", fontWeight: e.debit > 0 ? "600" : "400", whiteSpace: "nowrap", fontSize: "12px" }}>
                        {e.debit > 0 ? formatRp(e.debit) : "—"}
                      </td>
                      <td style={{ textAlign: "right", color: "#166534", fontWeight: e.credit > 0 ? "600" : "400", whiteSpace: "nowrap", fontSize: "12px" }}>
                        {e.credit > 0 ? formatRp(e.credit) : "—"}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: "700", color: e.balance >= 0 ? "#166534" : "#991B1B", whiteSpace: "nowrap", fontSize: "12px" }}>
                        {formatRp(e.balance)}
                      </td>
                      <td>
                        <Ac7Badge valid={ac7.valid} selisih={ac7.selisih} />
                      </td>
                      <td>{statusBadge(e.status_pembayaran)}</td>
                      <td>
                        <button style={{ background: "none", border: "none", cursor: "pointer", color: "#4F46E5", fontSize: "11px", fontWeight: "600", padding: "2px 6px" }}>
                          Detail →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.last_page > 1 && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid #F1F5F9", display: "flex", gap: "8px", justifyContent: "center", alignItems: "center" }}>
            <Button
              variant="ghost"
              disabled={pagination.current_page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              ← Prev
            </Button>
            <span style={{ fontSize: "12px", color: "#64748B" }}>
              Halaman {pagination.current_page} / {pagination.last_page} ({pagination.total} entry)
            </span>
            <Button
              variant="ghost"
              disabled={pagination.current_page >= pagination.last_page}
              onClick={() => setPage(p => p + 1)}
            >
              Next →
            </Button>
          </div>
        )}
      </div>

      {selectedEntry && (
        <EntryDetailModal entryId={selectedEntry} onClose={() => setSelectedEntry(null)} />
      )}
    </div>
  );
}
