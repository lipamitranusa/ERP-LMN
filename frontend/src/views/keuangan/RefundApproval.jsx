import React, { useState } from "react";
import { formatDate } from "@/utils/dateFormat";
import { useApi, useMutateKeys } from "@/hooks/useApi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

function formatRp(n) {
  return `Rp ${Number(n).toLocaleString("id-ID")}`;
}

const STATUS_MAP = {
  requested: { label: "Menunggu approval", color: "#FEF9C3", text: "#854D0E" },
  approved: { label: "Disetujui (siap eksekusi)", color: "#DBEAFE", text: "#1E40AF" },
  executed: { label: "Sudah dieksekusi", color: "#DCFCE7", text: "#166534" },
  rejected: { label: "Ditolak", color: "#FEE2E2", text: "#991B1B" },
};

const schema = z.object({
  catatan: z.string().default(""),
});

export default function RefundApproval() {
  const [selected, setSelected] = useState(null);

  const { data, isLoading } = useApi("refund-pending", "/refund/pending");
  const refunds = data?.data || [];

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { catatan: "" },
  });

  const actionMutation = useMutateKeys(["refund-pending"], {
    onSuccess: () => {
      setSelected(null);
      reset({ catatan: "" });
    },
  });

  function openDetail(r) {
    setSelected(r);
    reset({ catatan: "" });
  }

  const onSubmit = (data, refundId, action) => {
    if (action === "reject" && !data.catatan.trim()) {
      alert("Alasan penolakan wajib diisi.");
      return;
    }
    if (action === "execute") {
      if (!confirm("Eksekusi refund ini? Tindakan ini akan membuat Ledger Entry dan tidak dapat dibatalkan.")) {
        return;
      }
    }

    let path, body;
    if (action === "approve") {
      path = `/refund/${refundId}/approve`;
      body = { catatan: data.catatan };
    } else if (action === "reject") {
      path = `/refund/${refundId}/reject`;
      body = { alasan: data.catatan };
    } else if (action === "execute") {
      path = `/refund/${refundId}/execute`;
      body = undefined;
    }

    actionMutation.mutate({ path, method: "POST", body });
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Approval Refund</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-0.5">Approval berjenjang untuk permintaan refund pembayaran Faskes (FR-2.8).</p>
      </div>

      <Card className="overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Faskes</th>
              <th>Invoice</th>
              <th style={{ textAlign: "right" }}>Nominal</th>
              <th>Alasan</th>
              <th>Status</th>
              <th style={{ width: "140px" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="7" style={{ textAlign: "center", color: "#94A3B8", padding: "48px 16px" }}>Memuat...</td></tr>
            ) : refunds.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: "center", color: "#94A3B8", padding: "48px 16px" }}>Tidak ada refund yang perlu diproses.</td></tr>
            ) : refunds.map(r => {
              const s = STATUS_MAP[r.status] || STATUS_MAP.requested;
              return (
                <tr key={r.id}>
                  <td style={{ fontSize: "12px", color: "#475569" }}>{formatDate(r.created_at)}</td>
                  <td style={{ fontSize: "13px", color: "#334155", fontWeight: "500" }}>{r.invoice?.siklus?.faskes?.nama || "—"}</td>
                  <td style={{ fontSize: "12px", color: "#64748B" }}>{r.invoice?.nomor_invoice || "—"}</td>
                  <td style={{ textAlign: "right", fontWeight: "500" }}>{formatRp(r.nominal)}</td>
                  <td style={{ fontSize: "12px", color: "#475569", maxWidth: "240px" }}>{r.alasan}</td>
                  <td>
                    <span style={{ padding: "2px 8px", borderRadius: "9999px", fontSize: "11px", fontWeight: "600", background: s.color, color: s.text }}>
                      {s.label}
                    </span>
                  </td>
                  <td>
                    <Button variant="secondary" size="sm" onClick={() => openDetail(r)}>Detail</Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={() => setSelected(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "8px", maxWidth: "480px", width: "100%", padding: "24px" }}>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "600", color: "#1E293B" }}>Detail Refund</h3>
            <div style={{ marginTop: "16px", padding: "12px", background: "#F8FAFC", borderRadius: "6px", fontSize: "12px", color: "#475569" }}>
              <div>Faskes: <strong>{selected.invoice?.siklus?.faskes?.nama || "—"}</strong></div>
              <div>Nominal: <strong>{formatRp(selected.nominal)}</strong></div>
              <div>Alasan: {selected.alasan}</div>
            </div>

            <form onSubmit={handleSubmit((data) => onSubmit(data, selected.id, selected.status === "requested" ? "approve" : "execute"))}>
              <div className="mt-4 space-y-1.5">
                <Label htmlFor="refund-catatan">Catatan approval</Label>
                <Textarea
                  id="refund-catatan"
                  rows={3}
                  {...register("catatan")}
                  placeholder="Catatan untuk approval / alasan penolakan..."
                />
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
                <Button type="button" variant="secondary" onClick={() => setSelected(null)} style={{ flex: 1 }}>
                  Batal
                </Button>
                {selected.status === "requested" && (
                  <>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleSubmit((data) => onSubmit(data, selected.id, "reject"))}
                      disabled={actionMutation.isPending}
                    >
                      Tolak
                    </Button>
                    <Button
                      type="submit"
                      disabled={actionMutation.isPending}
                    >
                      Setujui
                    </Button>
                  </>
                )}
                {selected.status === "approved" && (
                  <Button
                    type="button"
                    onClick={handleSubmit((data) => onSubmit(data, selected.id, "execute"))}
                    disabled={actionMutation.isPending}
                  >
                    Eksekusi Sekarang
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
