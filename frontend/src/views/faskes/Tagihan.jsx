import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import InvoiceStatusCard from "@/components/InvoiceStatusCard";
import PaymentMethodSelector from "@/components/PaymentMethodSelector";
import { formatDate } from "@/utils/dateFormat";
import { useApi } from "@/hooks/useApi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

function formatRp(n) {
  return `Rp ${Number(n).toLocaleString("id-ID")}`;
}

export default function FaskesTagihan() {
  const history = useHistory();
  const [selectedSiklus, setSelectedSiklus] = useState(null);

  const { data: siklusListData, isLoading: loading } = useApi(
    "siklus-list-faskes",
    "/pendaftaran/siklus?per_page=50"
  );

  const siklusList = siklusListData?.data || [];

  React.useEffect(() => {
    if (siklusList.length > 0 && !selectedSiklus) {
      setSelectedSiklus(siklusList[0].id);
    }
  }, [siklusList, selectedSiklus]);

  const { data: invoicesData } = useApi(
    ["invoices", selectedSiklus],
    selectedSiklus ? `/invoice/by-siklus/${selectedSiklus}` : "/pendaftaran/siklus?per_page=50",
    { enabled: !!selectedSiklus }
  );

  const invoices = invoicesData?.data || [];

  if (loading) {
    return <div className="p-10 text-center text-slate-400 dark:text-slate-500 text-sm">Memuat...</div>;
  }

  if (siklusList.length === 0) {
    return (
      <div className="max-w-[640px] mx-auto mt-10 p-8 text-center">
        <div className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">Belum ada tagihan untuk Anda.</div>
      </div>
    );
  }

  return (
    <div className="max-w-[720px] mx-auto">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => history.push("/faskes")}
        className="mb-4 pl-0 text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:text-slate-500"
      >
        ← Kembali ke Status Pengajuan
      </Button>

      <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-1">
        Tagihan
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-6">
        Daftar invoice untuk setiap siklus akreditasi Anda.
      </p>

      {siklusList.length > 1 && (
        <div className="mb-5 space-y-1.5">
          <Label htmlFor="siklus-select">Pilih siklus</Label>
          <select
            id="siklus-select"
            className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
            value={selectedSiklus || ""}
            onChange={e => setSelectedSiklus(e.target.value)}
          >
            {siklusList.map(s => (
              <option key={s.id} value={s.id}>
                {s.faskes?.nama || "Siklus"} — {formatDate(s.tanggal_pengajuan)}
              </option>
            ))}
          </select>
        </div>
      )}

      {invoices.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
            Belum ada invoice untuk siklus ini. Invoice akan muncul setelah PKS disetujui.
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {invoices.map(inv => (
            <InvoiceStatusCard
              key={inv.id}
              invoice={inv}
              onClick={() => history.push(`/faskes/tagihan/${inv.id}`)}
            />
          ))}

          {(() => {
            const unpaid = invoices.find(inv => inv.status !== "lunas" && inv.status !== "refunded");
            return unpaid ? (
              <Button
                onClick={() => history.push(`/faskes/tagihan/${unpaid.id}`)}
                className="mt-2"
              >
                Bayar Sekarang
              </Button>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
}
