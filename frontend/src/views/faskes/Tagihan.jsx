import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import InvoiceStatusCard from "@/components/InvoiceStatusCard";
import PaymentMethodSelector from "@/components/PaymentMethodSelector";
import { formatDate } from "../../utils/dateFormat";
import { useApi } from "@/hooks/useApi";

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
    {
      enabled: !!selectedSiklus,
      // Refetch when tab becomes visible (e.g., after paying in another tab)
    }
  );

  const invoices = invoicesData?.data || [];

  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8" }}>Memuat...</div>;
  }

  if (siklusList.length === 0) {
    return (
      <div style={{ maxWidth: "640px", margin: "40px auto", padding: "32px", textAlign: "center" }}>
        <div style={{ fontSize: "14px", color: "#64748B" }}>Belum ada tagihan untuk Anda.</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto" }}>
      <button
        onClick={() => history.push("/faskes")}
        className="btn btn-ghost btn-sm"
        style={{ marginBottom: "16px", padding: "6px 0" }}
      >
        ← Kembali ke Status Pengajuan
      </button>

      <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>
        Tagihan
      </h1>
      <p style={{ margin: "4px 0 24px", fontSize: "13px", color: "#64748B" }}>
        Daftar invoice untuk setiap siklus akreditasi Anda.
      </p>

      {/* Siklus selector */}
      {siklusList.length > 1 && (
        <div style={{ marginBottom: "20px" }}>
          <label className="form-label">Pilih siklus</label>
          <select
            className="form-input"
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
        <div className="card" style={{ padding: "32px", textAlign: "center" }}>
          <div style={{ fontSize: "13px", color: "#64748B" }}>
            Belum ada invoice untuk siklus ini. Invoice akan muncul setelah PKS disetujui.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
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
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => history.push(`/faskes/tagihan/${unpaid.id}`)}
                style={{ marginTop: "8px" }}
              >
                Bayar Sekarang
              </button>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
}
