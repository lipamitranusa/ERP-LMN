import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import { formatDate } from "@/utils/dateFormat";
import { useApi, useMutateKeys } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Banknote } from "lucide-react";

function formatRp(n) {
  return `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
}

const METODE_MAP = { transfer_bank: "Transfer Bank", tunai: "Tunai", lainnya: "Lainnya" };

export default function ApHonorKasKeluar() {
  const history = useHistory();
  const { can } = useAuth();
  const canPostJournal = can("Ledger/Keuangan", "Tambah");

  const [filterBulan, setFilterBulan] = useState("");
  const [creatingId, setCreatingId] = useState(null);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const params = new URLSearchParams();
  if (filterBulan) {
    const [tahun, bulan] = filterBulan.split("-");
    params.set("tahun", tahun);
    params.set("bulan", bulan);
  }
  const qs = params.toString();

  const { data, isLoading } = useApi(
    ["ap-honor-kas-keluar", filterBulan],
    `/keuangan/ap-honor/kas-keluar${qs ? "?" + qs : ""}`
  );

  const entries = data?.data?.data || [];
  const ringkasan = data?.data?.ringkasan || {};

  // Key invalidate harus ditulis sebagai array-of-array. Bentuk datar
  // ["a", "b"] dibaca useMutateKeys sebagai SATU key gabungan ("a" lalu "b"),
  // sedangkan query daftar terdaftar sebagai ["ap-honor-kas-keluar", filterBulan]
  // — tidak akan cocok, sehingga tabel tidak ter-refresh dan tombol "Buat Bank
  // Keluar" tetap muncul sampai halaman di-refresh manual.
  const createMutate = useMutateKeys(
    [["ap-honor-kas-keluar"], ["ap-honor-payment-detail"], ["ap-honor-history"]],
    {
      onSuccess: (res) => {
        setResult(res);
        setErrorMsg(null);
        setCreatingId(null);
      },
      onError: (err) => {
        setErrorMsg(err.message);
        setCreatingId(null);
      },
    }
  );

  function buatBankKeluar(pembayaranId) {
    setErrorMsg(null);
    setResult(null);
    setCreatingId(pembayaranId);
    createMutate.mutate({
      path: "/keuangan/settlement/bank-keluar",
      method: "POST",
      body: { pembayaran_id: pembayaranId },
    });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kas Keluar Honor"
        subtitle="Pembayaran honor yang sudah dibayar. Buat jurnal Bank Keluar (Debit Utang Honor / Kredit Kas-Bank) untuk setiap kas keluar yang sudah dikonfirmasi ke rekening."
        actions={
          <Button variant="outline" onClick={() => history.push("/admin/ap-honor")}>
            <ArrowLeft size={16} /> Dasbor AP
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-3 border">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Total pembayaran</div>
          <div className="text-xl font-bold mt-1 text-slate-800 dark:text-slate-200">{ringkasan.total_pembayaran ?? "—"}</div>
        </Card>
        <Card className="p-3 border" style={{ background: "#FEF2F2", borderColor: "#FECACA" }}>
          <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#991B1B" }}>Belum dijurnal</div>
          <div className="text-xl font-bold mt-1" style={{ color: "#991B1B" }}>{ringkasan.belum_dijurnal ?? 0}</div>
          <div className="text-[11px]" style={{ color: "#991B1B" }}>{formatRp(ringkasan.total_belum_dijurnal)}</div>
        </Card>
        <Card className="p-3 border" style={{ background: "#DCFCE7", borderColor: "#BBF7D0" }}>
          <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#166534" }}>Sudah dijurnal</div>
          <div className="text-xl font-bold mt-1" style={{ color: "#166534" }}>{ringkasan.sudah_dijurnal ?? 0}</div>
          <div className="text-[11px]" style={{ color: "#166534" }}>{formatRp(ringkasan.total_sudah_dijurnal)}</div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">Periode</Label>
            <Input type="month" value={filterBulan} onChange={(e) => setFilterBulan(e.target.value)} />
          </div>
          {filterBulan && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setFilterBulan("")}>
              Reset filter
            </Button>
          )}
        </div>
      </Card>

      {errorMsg && (
        <div className="px-4 py-3 rounded-md text-sm" style={{ background: "#FEE2E2", color: "#991B1B", border: "1px solid #FECACA" }}>
          Gagal membuat jurnal bank keluar: {errorMsg}
        </div>
      )}

      {result && (
        <div
          className="px-4 py-3 rounded-md text-sm font-medium"
          style={{
            background: (result.data?.created_count || 0) > 0 ? "#DCFCE7" : "#F8FAFC",
            color: (result.data?.created_count || 0) > 0 ? "#166534" : "#475569",
            border: `1px solid ${(result.data?.created_count || 0) > 0 ? "#BBF7D0" : "#E2E8F0"}`,
          }}
        >
          {result.message}
          {result.data?.created?.map((j) => (
            <div key={j.id} className="mt-1 text-[12px] font-normal">
              <b style={{ fontFamily: "monospace" }}>{j.nomor}</b> — {j.tanggal} —{" "}
              {j.details?.map((d) => (
                <span key={d.coa?.kode} style={{ marginRight: "10px" }}>
                  {d.debit > 0 ? `Dr ${d.coa?.kode} ${d.coa?.nama} ${formatRp(d.debit)}` : `Cr ${d.coa?.kode} ${d.coa?.nama} ${formatRp(d.kredit)}`}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-y-auto" style={{ maxHeight: "600px" }}>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Nomor</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Tanggal</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Metode</th>
                <th className="text-center px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Line</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Total</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Jurnal Bank Keluar</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-8 text-sm" style={{ color: "#94A3B8" }}>Memuat kas keluar...</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-sm" style={{ color: "#94A3B8" }}>Belum ada pembayaran honor yang disetujui.</td></tr>
              ) : entries.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      onClick={() => history.push(`/admin/ap-honor/payment/${p.id}`)}
                      className="font-mono text-[12px] font-medium text-blue-700 hover:underline"
                    >
                      {p.nomor_pembayaran}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-[12px]">{formatDate(p.tanggal_pembayaran)}</td>
                  <td className="px-4 py-2 text-[12px]">{METODE_MAP[p.metode] || p.metode}</td>
                  <td className="px-4 py-2 text-center text-[12px] text-slate-500 dark:text-slate-400 dark:text-slate-500">{p.jumlah_line_item}</td>
                  <td className="px-4 py-2 text-right text-[12px] font-semibold">{formatRp(p.total_nominal)}</td>
                  <td className="px-4 py-2 text-[12px]">
                    {p.sudah_dijurnal ? (
                      <span className="font-mono text-emerald-700">{p.jurnal_nomor}</span>
                    ) : canPostJournal ? (
                      <Button
                        size="sm"
                        className="h-7 text-[11px]"
                        style={{ background: "#DC2626", color: "#FFFFFF" }}
                        disabled={createMutate.isLoading}
                        onClick={() => buatBankKeluar(p.id)}
                      >
                        <Banknote size={13} className="mr-1" />
                        {creatingId === p.id ? "Membuat..." : "Buat Bank Keluar"}
                      </Button>
                    ) : (
                      <span className="text-amber-600">Belum dijurnal</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
