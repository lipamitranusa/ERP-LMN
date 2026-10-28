import React, { useState, useEffect, useRef } from "react";
import { useHistory, useParams } from "react-router-dom";
import { formatDate } from "@/utils/dateFormat";
import { useApi, useMutateKeys } from "@/hooks/useApi";
import { withLembaga } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Banknote, Pencil, Printer, Send, X } from "lucide-react";
import SettlementJournalPanel from "@/components/SettlementJournalPanel";
import { useAuth } from "@/hooks/useAuth";

function formatRp(n) { return `Rp ${Number(n || 0).toLocaleString("id-ID")}`; }
const METODE_LABEL = { transfer_bank: "Transfer Bank", tunai: "Tunai", lainnya: "Lainnya" };
function StatusBadge({ status }) {
  const map = { draft: { label: "Draft", bg: "#F1F5F9", text: "#475569" }, disetujui: { label: "Disetujui", bg: "#DCFCE7", text: "#166534" }, dibatalkan: { label: "Dibatalkan", bg: "#FEE2E2", text: "#991B1B" } };
  const s = map[status] || map.draft;
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: s.bg, color: s.text }}>{s.label}</span>;
}

export default function ApHonorPaymentDetail() {
  const history = useHistory();
  const { id } = useParams();
  const { can } = useAuth();
  const [error, setError] = useState("");
  const [actionInProgress, setActionInProgress] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelAlasan, setCancelAlasan] = useState("");
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

  const { data: response, isLoading } = useApi(["ap-honor-payment-detail", id], `/keuangan/ap-honor/payments/${id}`);
  // Endpoint membungkus payload dalam { data: ... } — tanpa di-unpack di sini
  // semua field pembayaran (nomor, status, detail) jadi undefined dan halaman
  // tampil kosong tanpa tombol aksi.
  const data = response?.data;
  const loadError = !data && response?.message ? response.message : "";
  const approveMutate = useMutateKeys([["ap-honor-payment-detail", id], ["ap-honor-history"]]);
  const cancelMutate = useMutateKeys([["ap-honor-payment-detail", id], ["ap-honor-history"]]);
  const bankKeluarMutate = useMutateKeys([["ap-honor-payment-detail", id], ["ap-honor-kas-keluar"], ["ap-honor-history"]]);

  const canPostJournal = can("Ledger/Keuangan", "Tambah");

  const handleBuatBankKeluar = async () => {
    // Jurnal Bank Keluar sudah ada → jangan buat lagi (satu kas keluar = satu jurnal).
    if (data?.sudah_dijurnal) return;
    if (!confirm(`Buat jurnal Bank Keluar untuk ${data?.nomor_pembayaran}?`)) return;
    setActionInProgress(true); setError("");
    try {
      await bankKeluarMutate.mutateAsync({
        path: "/keuangan/settlement/bank-keluar",
        method: "POST",
        body: { pembayaran_id: id },
      });
    } catch (err) { setError(err.message); } finally { setActionInProgress(false); }
  };

  const loadSlip = () => {
    if (!id) return;
    setSlipLoading(true); setSlipError("");
    fetch(withLembaga(`/api/ledger/slip-honor/${id}/generate`), { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then(r => r.json())
      .then(d => {
        if (d.message && !d.data) setSlipError(d.message);
        else { setSlipData(d.data); loadSlipHtml(id); }
        setSlipLoading(false);
      })
      .catch(err => { setSlipError(err.message); setSlipLoading(false); });
  };

  const loadSlipHtml = async (slipId) => {
    const res = await fetch(withLembaga(`/api/ledger/slip-honor/${slipId}/preview`), { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
    if (res.ok) setSlipPreviewHtml(await res.text());
    else setSlipError(`Preview gagal dimuat (HTTP ${res.status}).`);
  };

  const handleSendSlip = async () => {
    setSendLoading(true); setSendResult(null);
    try {
      const res = await fetch(withLembaga(`/api/ledger/slip-honor/${id}/send`), {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ channel: sendChannel }),
      });
      setSendResult(await res.json());
    } catch (err) { setSendResult({ message: err.message }); } finally { setSendLoading(false); }
  };

  useEffect(() => { if (showSlipPanel && !slipData) loadSlip(); if (showPrintModal && !slipData) loadSlip(); }, [showSlipPanel, showPrintModal]);

  const handleApprove = async () => {
    if (!confirm(`Setujui pembayaran ${data?.nomor_pembayaran}? Honor akan berubah status menjadi lunas.`)) return;
    setActionInProgress(true); setError("");
    try { await approveMutate.mutateAsync({ path: `/keuangan/ap-honor/payments/${id}/approve`, method: "POST" }); }
    catch (err) { setError(err.message); } finally { setActionInProgress(false); }
  };

  const handleCancel = async (e) => {
    e.preventDefault();
    if (cancelAlasan.length < 3) { setError("Alasan minimal 3 karakter."); return; }
    setActionInProgress(true); setError("");
    try { await cancelMutate.mutateAsync({ path: `/keuangan/ap-honor/payments/${id}/cancel`, method: "POST", body: { alasan: cancelAlasan } }); setShowCancelForm(false); setCancelAlasan(""); }
    catch (err) { setError(err.message); } finally { setActionInProgress(false); }
  };

  if (isLoading && !data) return <div className="p-10 text-center text-sm" style={{ color: "#94A3B8" }}>Memuat detail pembayaran...</div>;
  if (!data) {
    return (
      <div className="p-10 text-center space-y-3">
        <div className="text-sm" style={{ color: "#DC2626" }}>{loadError || "Pembayaran tidak ditemukan."}</div>
        <Button variant="outline" onClick={() => history.push("/admin/ap-honor/history")}>← Kembali ke Riwayat</Button>
      </div>
    );
  }

  const isDraft = data.status === "draft", isApproved = data.status === "disetujui", isCancelled = data.status === "dibatalkan";
  const tidakKonsisten = data.konsisten === false;

  return (
    <div className="space-y-5">
      <PageHeader
        title={<div className="flex items-center gap-3"><span>{data.nomor_pembayaran}</span><StatusBadge status={data.status} /></div>}
        subtitle={`Tanggal pembayaran: ${formatDate(data.tanggal_pembayaran)}`}
        actions={
          <div className="flex gap-2">
            {(isDraft || isApproved) && (
              <>
                {isDraft && <Button onClick={handleApprove} disabled={actionInProgress || tidakKonsisten} title={tidakKonsisten ? "Total pembayaran tidak sesuai jumlah line item" : undefined} className="bg-green-600 hover:bg-green-700"><span className="mr-1">✓</span> Setujui</Button>}
                {isDraft && <Button variant="outline" onClick={() => history.push(`/admin/ap-honor/bayar?edit=${id}`)} disabled={actionInProgress}><Pencil size={16} className="mr-1" /> Edit</Button>}
                <Button variant="outline" onClick={() => setShowCancelForm(v => !v)} disabled={actionInProgress} className="text-red-500">{isApproved ? "Batalkan" : "Hapus Draft"}</Button>
              </>
            )}
            {isApproved && (
              <>
                <Button onClick={() => { setShowPrintModal(true); setSlipData(null); }} className="bg-blue-600 hover:bg-blue-700"><Printer size={16} className="mr-1" /> Cetak Slip</Button>
                <Button onClick={() => { setShowSlipPanel(true); setSlipData(null); }} className="bg-purple-600 hover:bg-purple-700"><Send size={16} className="mr-1" /> Kirim Slip</Button>
                {canPostJournal && (data.sudah_dijurnal ? (
                  <span
                    className="inline-flex items-center px-3 py-2 rounded-md text-[12px] font-semibold"
                    style={{ background: "#DCFCE7", color: "#166534" }}
                    title="Jurnal Bank Keluar sudah dibuat untuk pembayaran ini."
                  >
                    Sudah dijurnal {data.jurnal_nomor ? `(${data.jurnal_nomor})` : ""}
                  </span>
                ) : (
                  <Button
                    onClick={handleBuatBankKeluar}
                    disabled={bankKeluarMutate.isLoading}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Banknote size={16} className="mr-1" />
                    {bankKeluarMutate.isLoading ? "Membuat jurnal..." : "Buat Bank Keluar"}
                  </Button>
                ))}
              </>
            )}
          </div>
        }
      />

      {error && <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

      {tidakKonsisten && (
        <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          Total pembayaran ({formatRp(data.total_nominal)}) tidak sesuai dengan jumlah line item ({formatRp(data.total_detail)}).
          Pembayaran ini tidak dapat disetujui sampai selaras.
        </div>
      )}

      {showCancelForm && (
        <Card className="p-4 border border-red-200 bg-red-50">
          <h3 className="text-sm font-semibold text-red-700 mb-3">{isApproved ? "Batalkan pembayaran yang sudah disetujui" : "Hapus draft pembayaran"}</h3>
          {isApproved && <p className="text-xs text-red-600 mb-3">Jika dibatalkan, status honor akan dikembalikan ke belum_dibayar.</p>}
          <form onSubmit={handleCancel} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">Alasan *</Label>
              <Textarea rows={2} value={cancelAlasan} onChange={e => setCancelAlasan(e.target.value)} required placeholder="Jelaskan alasan pembatalan..." />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => { setShowCancelForm(false); setCancelAlasan(""); }} disabled={actionInProgress}>Tutup</Button>
              <Button type="submit" disabled={actionInProgress} className="bg-red-600 hover:bg-red-700">{actionInProgress ? "Memproses..." : "Konfirmasi Batalkan"}</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-5">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Detail Pembayaran</h3>
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {[
              ["Nomor", <span className="font-mono">{data.nomor_pembayaran}</span>],
              ["Tanggal", formatDate(data.tanggal_pembayaran)],
              ["Metode", METODE_LABEL[data.metode] || data.metode],
              ...(data.bank_pengirim ? [["Bank Pengirim", data.bank_pengirim]] : []),
              ...(data.nomor_rekening_tujuan ? [["No. Rekening", <span className="font-mono">{data.nomor_rekening_tujuan}</span>]] : []),
              ...(data.atas_nama ? [["Atas Nama", data.atas_nama]] : []),
              ...(data.catatan ? [["Catatan", data.catatan]] : []),
              ...(data.url_bukti_transfer ? [["Bukti Transfer", <a href={data.url_bukti_transfer} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-[13px] underline">Lihat Bukti Transfer</a>]] : []),
            ].map(([label, value]) => (
              <React.Fragment key={label}>
                <div className="text-slate-500 dark:text-slate-400 dark:text-slate-500">{label}</div>
                <div>{value}</div>
              </React.Fragment>
            ))}
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Status & Total</h3>
            <div className="rounded-lg p-4 mb-4" style={{ background: "#F0F9FF", border: "1px solid #BAE6FD" }}>
              <div className="text-[11px] uppercase" style={{ color: "#0C4A6E" }}>Total Pembayaran</div>
              <div className="text-2xl font-bold" style={{ color: "#0C4A6E" }}>{formatRp(data.total_nominal)}</div>
              <div className="text-[12px] mt-1" style={{ color: "#0C4A6E" }}>{data.jumlah_line_item} line item</div>
            </div>
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              {[
                ["Dibuat oleh", data.dibuat_oleh || "—"],
                ["Tgl dibuat", formatDate(data.dibuat_pada)],
                ...(data.disetujui_oleh ? [["Disetujui oleh", data.disetujui_oleh], ["Tgl disetujui", formatDate(data.tanggal_disetujui)]] : []),
                ...(isCancelled ? [["Dibatalkan oleh", data.dibatalkan_oleh], ["Tgl dibatalkan", formatDate(data.tanggal_dibatalkan)], ["Alasan", <span className="text-red-600">{data.alasan_batal}</span>]] : []),
              ].map(([label, value]) => (
                <React.Fragment key={label}>
                  <div className="text-slate-500 dark:text-slate-400 dark:text-slate-500">{label}</div>
                  <div>{value}</div>
                </React.Fragment>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {isApproved && (
        <SettlementJournalPanel
          refType="settlement_ap_honor"
          refId={id}
          title="Jurnal Pelunasan Hutang Honor"
          onCreate={canPostJournal ? handleBuatBankKeluar : undefined}
          creating={bankKeluarMutate.isLoading}
          createLabel="Buat Jurnal Bank Keluar"
          emptyMessage="Kas keluar honor ini belum diposting ke buku besar. Klik tombol di bawah untuk membuat jurnal Bank Keluar (Debit Utang Honor / Kredit Kas-Bank)."
        />
      )}

      {/* Slip panel */}
      {showSlipPanel && (
        <Card className="p-6 border-2 border-purple-300 bg-purple-50">
          <div className="flex justify-between items-start mb-5">
            <div>
              <h3 className="text-base font-bold text-purple-800">Kirim Slip Honorarium</h3>
              <p className="text-[12px] text-purple-600 mt-0.5">Kirim slip honor ke tenaga ahli via WhatsApp atau Email.</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => { setShowSlipPanel(false); setSlipData(null); setSendResult(null); }}><X size={18} /></Button>
          </div>

          {slipLoading && <div className="text-center py-5 text-purple-600">Memuat data slip...</div>}
          {slipError && <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">{slipError}</div>}

          {slipData && (
            <>
              <div className="bg-white border border-purple-200 rounded-xl p-4 mb-4">
                <div className="grid grid-cols-3 gap-3 mb-3 text-center">
                  {[
                    ["No. Pembayaran", slipData.nomor_pembayaran, "font-mono text-[13px]"],
                    ["Penerima", slipData.tenaga_ahli?.nama || "—", "font-semibold"],
                    ["Total Neto", formatRp(slipData.total?.neto), "font-bold text-green-600 text-base"],
                  ].map(([label, val, cls]) => (
                    <div key={label}>
                      <div className="text-[10px] font-semibold uppercase text-purple-600 mb-1">{label}</div>
                      <div className={cls}>{val}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-2 pt-3 border-t border-purple-100 text-center text-[12px]">
                  {[["Bruto", formatRp(slipData.total?.bruto)], ["PPN", formatRp(slipData.total?.ppn)], ["PPh 21", formatRp(slipData.total?.pph)], ["AC-7", slipData.total?.ac7_valid ? "✓ Valid" : "✕ Selisih"]].map(([label, val]) => (
                    <div key={label}><div className="text-slate-500 dark:text-slate-400 dark:text-slate-500">{label}</div><div className="font-semibold">{val}</div></div>
                  ))}
                </div>
              </div>

              {!sendResult && (
                <>
                  <div className="mb-4">
                    <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 dark:text-slate-500 mb-2">Pilih Channel Pengiriman</p>
                    <div className="flex gap-3">
                      {[{ value: "whatsapp", label: "WhatsApp" }, { value: "email", label: "Email" }, { value: "both", label: "Keduanya" }].map(ch => (
                        <label key={ch.value} className="flex items-center gap-2 px-4 py-2.5 rounded-lg cursor-pointer border-2 transition-all" style={{ borderColor: sendChannel === ch.value ? "#7C3AED" : "#E2E8F0", background: sendChannel === ch.value ? "#FAF5FF" : "#fff", color: sendChannel === ch.value ? "#5B21B6" : "#475569", fontWeight: sendChannel === ch.value ? 600 : 400 }}>
                          <input type="radio" name="sendChannel" value={ch.value} checked={sendChannel === ch.value} onChange={() => setSendChannel(ch.value)} className="hidden" />
                          {ch.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={handleSendSlip} disabled={sendLoading}>{sendLoading ? "Mengirim..." : `Kirim via ${sendChannel === "whatsapp" ? "WhatsApp" : sendChannel === "email" ? "Email" : "WhatsApp & Email"}`}</Button>
                </>
              )}

              {sendResult && (
                <div className="rounded-xl p-4" style={{ background: sendResult.data?.results?.some(r => r.status === "terkirim") ? "#DCFCE7" : "#FEE2E2", border: `1px solid ${sendResult.data?.results?.some(r => r.status === "terkirim") ? "#BBF7D0" : "#FECACA"}` }}>
                  <div className="font-bold text-sm mb-3" style={{ color: sendResult.data?.results?.some(r => r.status === "terkirim") ? "#166534" : "#991B1B" }}>{sendResult.message}</div>
                  {sendResult.data?.results?.map((r, i) => (
                    <div key={i} className="text-[12px] text-slate-600 dark:text-slate-300 dark:text-slate-500 mb-1 flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white shrink-0" style={{ background: r.status === "terkirim" ? "#16A34A" : "#DC2626" }}>{r.status === "terkirim" ? "✓" : "✕"}</span>
                      <span><strong>{r.channel.toUpperCase()}</strong> — {r.nama} ({r.recipient})</span>
                      {r.error && <span className="text-red-500 text-[11px]">{r.error}</span>}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => { setSendResult(null); setSlipData(null); }}>Kirim lagi</Button>
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {/* Print modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-700">
              <div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">Preview Slip Honorarium</div>
                {slipData && <div className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-0.5">{slipData.nomor_pembayaran} — {slipData.tenaga_ahli?.nama}</div>}
              </div>
              <div className="flex gap-2">
                {slipData && <Button onClick={() => slipIframeRef.current?.contentWindow?.print()} className="bg-blue-600 hover:bg-blue-700" size="sm"><Printer size={14} className="mr-1" /> Cetak</Button>}
                <Button variant="outline" size="sm" onClick={() => { setShowPrintModal(false); setSlipData(null); setSlipPreviewHtml(""); }}>Tutup</Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-5" style={{ background: "#64748B" }}>
              {slipLoading && <div className="text-center py-10 text-white">Memuat preview...</div>}
              {slipError && <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700">{slipError}</div>}
              {slipData && <iframe ref={slipIframeRef} srcDoc={slipPreviewHtml} className="w-full bg-white rounded-lg" style={{ minHeight: "700px", border: "none" }} title="Slip Honor Preview" />}
            </div>
          </div>
        </div>
      )}

      {data.details?.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Line item ({data.details.length})</span>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: "500px" }}>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Penerima</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Faskes</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Tgl Honor</th>
                  <th className="text-right px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Gross</th>
                  <th className="text-right px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">DPP</th>
                  <th className="text-right px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">PPh 21</th>
                  <th className="text-right px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Net</th>
                </tr>
              </thead>
              <tbody>
                {data.details.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2"><div className="text-[13px] font-medium">{d.penerima?.nama || "—"}</div><div className="text-[11px]" style={{ color: "#94A3B8" }}>{d.penerima?.nomor_induk_surveior}</div></td>
                    <td className="px-4 py-2 text-[12px]">{d.siklus_faskes_nama || "—"}</td>
                    <td className="px-4 py-2 text-[12px]">{formatDate(d.tanggal_honor)}</td>
                    <td className="px-4 py-2 text-right text-[12px]">{formatRp(d.nominal_bruto)}</td>
                    <td className="px-4 py-2 text-right text-[12px]" style={{ color: "#64748B" }}>{formatRp(d.dpp)}</td>
                    <td className="px-4 py-2 text-right text-[12px]" style={{ color: "#64748B" }}>{formatRp(d.potongan_pph)}</td>
                    <td className="px-4 py-2 text-right text-[12px] font-semibold text-red-600">{formatRp(d.nominal_dibayar)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
