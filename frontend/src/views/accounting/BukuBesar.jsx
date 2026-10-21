import React, { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function formatRp(n) {
  return `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
}

function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function Modal({ title, children, onClose, wide }) {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50">
      <div
        className="rounded-lg max-h-[92vh] overflow-y-auto bg-card text-card-foreground border border-border"
        style={{ width: wide ? "820px" : "480px" }}
      >
        <div className="px-5 py-4 border-b border-border flex justify-between items-center">
          <h3 className="m-0 text-[15px] font-semibold text-foreground">{title}</h3>
          <button
            onClick={onClose}
            className="bg-transparent border-0 text-[20px] cursor-pointer text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const JENIS_LABEL = {
  aktiva_lancar: "Aktiva Lancar", aktiva_tetap: "Aktiva Tetap",
  kewajiban_lancar: "Kewajiban Lancar", kewajiban_jangka_panjang: "Kewajiban Jangka Panjang",
  modal: "Modal",
  pendapatan: "Pendapatan", pendapatan_lain: "Pendapatan Lain",
  beban: "Beban", beban_lain: "Beban Lain",
};
const KELOMPOK_LABEL = { debit: "Debit", kredit: "Kredit", debit_kredit: "Debit / Kredit" };

export default function AccountingBukuBesar() {
  const now = new Date();
  const [filter, setFilter] = useState({ tahun: now.getFullYear(), bulan: String(now.getMonth() + 1).padStart(2, "0") });
  const [selectedAkun, setSelectedAkun] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});

  const qs = `/keuangan/accounting/buku-besar?tahun=${filter.tahun}&bulan=${filter.bulan}`;
  const { data: bbData, isLoading: loading } = useApi(["buku-besar", filter.tahun, filter.bulan], qs);
  const data = bbData?.data || [];

  const detailQs = selectedAkun ? `/keuangan/accounting/buku-besar/${selectedAkun.id}?tahun=${filter.tahun}&bulan=${filter.bulan}` : null;
  const { data: detailData, isLoading: loadingDetail } = useApi(
    selectedAkun ? ["buku-besar-detail", selectedAkun.id, filter.tahun, filter.bulan] : ["buku-besar-detail"],
    detailQs,
    { enabled: !!selectedAkun }
  );

  const toggleGroup = (key) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  const TAHUN_AKIR = now.getFullYear() + 1;
  const tahunOptions = Array.from({ length: 5 }, (_, i) => TAHUN_AKIR - 4 + i);

  const grouped = data.reduce((acc, item) => {
    const group = JENIS_LABEL[item.jenis] || item.jenis;
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {});

  const balanceColor = (saldo, kelompok) => {
    if (Math.abs(parseFloat(saldo)) < 0.01) return "";
    if (kelompok === "kredit") return "text-green-700 dark:text-green-400";
    if (kelompok === "debit") return "text-red-700 dark:text-red-400";
    return parseFloat(saldo) >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400";
  };

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">Buku Besar</h1>
        <p className="page-subtitle">Saldo awal, mutasi, dan saldo akhir per akun perkiraan.</p>
      </div>

      <Card className="p-5">
        <div className="flex gap-3 items-end">
          <div>
            <label className="form-label">Tahun</label>
            <select
              className="form-input"
              value={filter.tahun}
              onChange={e => setFilter(f => ({ ...f, tahun: parseInt(e.target.value) }))}
            >
              {tahunOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Bulan</label>
            <select
              className="form-input"
              value={filter.bulan}
              onChange={e => setFilter(f => ({ ...f, bulan: e.target.value }))}
            >
              {BULAN.map((b, i) => <option key={i+1} value={String(i+1).padStart(2,"0")}>{b}</option>)}
            </select>
          </div>
          <Button>Tampilkan</Button>
        </div>
      </Card>

      {loading ? (
        <div className="p-10 text-center text-muted-foreground">Memuat...</div>
      ) : (
        Object.entries(grouped).map(([groupLabel, items]) => {
          const groupKey = groupLabel;
          const isOpen = expandedGroups[groupKey] !== false;
          return (
            <div key={groupLabel} className="mb-4">
              <div
                onClick={() => toggleGroup(groupKey)}
                className={cn(
                  "flex justify-between items-center cursor-pointer px-3 py-2 bg-muted rounded-t-md",
                  isOpen ? "border-b border-border" : ""
                )}
                style={{ borderRadius: isOpen ? "6px 6px 0 0" : "6px" }}
              >
                <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">{groupLabel}</span>
                <span className="text-base text-muted-foreground">{isOpen ? "▴" : "▾"}</span>
              </div>
              {isOpen && (
                <Card className="p-0 rounded-t-none overflow-hidden">
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: "80px" }}>Kode</th>
                          <th>Nama Akun</th>
                          <th style={{ textAlign: "right", width: "130px" }}>Saldo Awal</th>
                          <th style={{ textAlign: "right", width: "110px" }}>Mutasi Debit</th>
                          <th style={{ textAlign: "right", width: "110px" }}>Mutasi Kredit</th>
                          <th style={{ textAlign: "right", width: "130px" }}>Saldo Akhir</th>
                          <th style={{ width: "80px", textAlign: "center" }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(akun => (
                          <tr key={akun.id}>
                            <td className="font-mono text-[13px] font-semibold">{akun.kode}</td>
                            <td className="text-[13px]">{akun.nama}</td>
                            <td className="text-[13px] text-right font-mono">{formatRp(akun.saldo_awal)}</td>
                            <td className="text-[13px] text-right font-mono text-green-700 dark:text-green-400">
                              {parseFloat(akun.mutasi_debit) > 0 ? formatRp(akun.mutasi_debit) : "-"}
                            </td>
                            <td className="text-[13px] text-right font-mono text-red-700 dark:text-red-400">
                              {parseFloat(akun.mutasi_kredit) > 0 ? formatRp(akun.mutasi_kredit) : "-"}
                            </td>
                            <td className={cn("text-[13px] text-right font-mono font-semibold", balanceColor(akun.saldo_akhir, akun.kelompok))}>
                              {formatRp(akun.saldo_akhir)}
                            </td>
                            <td className="text-center">
                              <Button variant="ghost" size="sm" onClick={() => setSelectedAkun(akun)}>Detail</Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>
          );
        })
      )}

      {selectedAkun && (
        <Modal title={`Buku Besar — ${selectedAkun.kode} ${selectedAkun.nama}`} onClose={() => setSelectedAkun(null)} wide>
          {loadingDetail ? (
            <div className="p-8 text-center text-muted-foreground">Memuat...</div>
          ) : detailData ? (
            (() => {
              const dd = detailData?.data || detailData;
              return (
            <>
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label: "Saldo Awal", value: formatRp(dd.saldo_awal), color: "" },
                  { label: "Total Debit", value: formatRp(dd.mutasi_debit), color: "text-green-700 dark:text-green-400" },
                  { label: "Total Kredit", value: formatRp(dd.mutasi_kredit), color: "text-red-700 dark:text-red-400" },
                  { label: "Saldo Akhir", value: formatRp(dd.saldo_akhir), fontWeight: "font-bold", color: "" },
                ].map((item, i) => (
                  <div key={i} className="bg-muted border border-border rounded-md px-3.5 py-2.5">
                    <div className="text-[11px] text-muted-foreground font-semibold uppercase">{item.label}</div>
                    <div className={cn("text-[15px] font-mono mt-0.5", item.fontWeight || "font-semibold", item.color)}>{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Nomor Jurnal</th>
                      <th>Keterangan</th>
                      <th style={{ textAlign: "right" }}>Debit</th>
                      <th style={{ textAlign: "right" }}>Kredit</th>
                      <th style={{ textAlign: "right" }}>Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dd.details?.length === 0 ? (
                      <tr><td colSpan="6" className="text-center text-muted-foreground py-6 text-sm">Tidak ada transaksi pada periode ini.</td></tr>
                    ) : (
                      <>
                        <tr className="bg-blue-50 dark:bg-blue-950/40">
                          <td colSpan="3" className="italic text-muted-foreground">Saldo Awal</td>
                          <td></td>
                          <td></td>
                          <td className="text-right font-mono font-semibold">{formatRp(dd.saldo_awal)}</td>
                        </tr>
                        {(dd.details || []).map((d, i) => (
                          <tr key={i}>
                            <td className="text-[13px]">{formatDate(d.tanggal)}</td>
                            <td className="text-[13px] font-mono">{d.nomor_jurnal}</td>
                            <td className="text-[13px]">{d.keterangan}</td>
                            <td className="text-[13px] text-right font-mono text-green-700 dark:text-green-400">{parseFloat(d.debit) > 0 ? formatRp(d.debit) : "-"}</td>
                            <td className="text-[13px] text-right font-mono text-red-700 dark:text-red-400">{parseFloat(d.kredit) > 0 ? formatRp(d.kredit) : "-"}</td>
                            <td className="text-[13px] text-right font-mono font-semibold">{formatRp(d.saldo)}</td>
                          </tr>
                        ))}
                        <tr className="bg-muted font-semibold">
                          <td colSpan="3" className="text-[13px]">Saldo Akhir</td>
                          <td className="text-[13px] text-right font-mono text-green-700 dark:text-green-400">{formatRp(dd.mutasi_debit)}</td>
                          <td className="text-[13px] text-right font-mono text-red-700 dark:text-red-400">{formatRp(dd.mutasi_kredit)}</td>
                          <td className="text-[13px] text-right font-mono">{formatRp(dd.saldo_akhir)}</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </>
              );
            })()
          ) : null}
        </Modal>
      )}
    </div>
  );
}
