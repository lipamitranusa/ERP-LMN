import React, { useState } from "react";
import { useApi, useMutateKeys } from "@/hooks/useApi";
import { formatDate } from "@/utils/dateFormat";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const JENIS_LABEL = {
  conflict_of_interest: "Conflict of Interest (CoI)",
  force_majeure: "Force Majeure",
};

const EMPTY_FORM = { penugasan_id: "", jenis: "conflict_of_interest", deskripsi: "" };

const schema = z.object({
  penugasan_id: z.string().min(1, "Pilih penugasan terlebih dahulu"),
  jenis: z.string().default("conflict_of_interest"),
  deskripsi: z.string().min(10, "Deskripsi minimal 10 karakter"),
});

export default function LaporanKendala() {
  const [showModal, setShowModal] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const { data: rawData, isLoading } = useApi("laporan-kendala-saya", "/penugasan/kendala/saya");
  const items = rawData?.data || (Array.isArray(rawData) ? rawData : []);

  const { data: penugasanList } = useApi("active-penugasan", "/penugasan/saya");

  const myPenugasan = React.useMemo(() => {
    const list = Array.isArray(penugasanList) ? penugasanList : penugasanList?.data || [];
    return list.filter(p => p.status === "menunggu" || p.status === "sedang_bertugas");
  }, [penugasanList]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_FORM,
  });

  const submitMutate = useMutateKeys(["laporan-kendala-saya"], {
    onSuccess: () => { setShowModal(false); setSubmitError(""); },
    onError: err => setSubmitError(err.message || "Gagal mengirim laporan."),
  });

  function openModal() {
    setSubmitError("");
    reset({ penugasan_id: myPenugasan[0]?.id || "", jenis: "conflict_of_interest", deskripsi: "" });
    setShowModal(true);
  }

  const onSubmit = (data) => {
    submitMutate.mutate({
      path: "/penugasan/kendala",
      method: "POST",
      body: data,
    });
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Laporan Kendala</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-0.5">
            Laporkan Conflict of Interest atau Force Majeure selama penugasan.
          </p>
        </div>
        <Button onClick={openModal}>
          <Plus size={16} />
          Buat Laporan
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">Memuat...</div>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-500 mb-1">Belum ada laporan</div>
          <div className="text-xs text-slate-400 dark:text-slate-500">
            Anda belum pernah melaporkan kendala. Klik "Buat Laporan" jika ada halangan.
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map(k => (
            <Card key={k.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-xs font-semibold"
                    style={{
                      background: k.jenis === "conflict_of_interest" ? "#FEE2E2" : "#FEF3C7",
                      color: k.jenis === "conflict_of_interest" ? "#991B1B" : "#92400E",
                      borderColor: "transparent",
                    }}
                  >
                    {JENIS_LABEL[k.jenis] || k.jenis}
                  </Badge>
                  <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
                    {k.penugasan?.siklus?.faskes?.nama || "—"}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="text-xs font-semibold"
                  style={{
                    background: k.status === "selesai" ? "#DCFCE7" : k.status === "diproses" ? "#FEF3C7" : "#DBEAFE",
                    color: k.status === "selesai" ? "#166534" : k.status === "diproses" ? "#92400E" : "#1E40AF",
                    borderColor: "transparent",
                  }}
                >
                  {k.status === "selesai" ? "Selesai" : k.status === "diproses" ? "Sedang Diproses" : "Dilaporkan"}
                </Badge>
              </div>
              <div className="text-sm text-slate-700 dark:text-slate-300 dark:text-slate-500 mt-1">
                {k.deskripsi}
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                Dilaporkan: {formatDate(k.tanggal_laporan, { long: true })}
              </div>
              {k.catatan_admin && (
                <div className="mt-3 p-3 rounded-md bg-sky-50 border border-sky-200 text-xs text-sky-800">
                  <strong>Catatan Admin:</strong> {k.catatan_admin}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={v => !submitMutate.isPending && setShowModal(v)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Buat Laporan Kendala</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {submitError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {submitError}
                </div>
              )}
            {myPenugasan.length === 0 ? (
              <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                Tidak ada penugasan aktif. Anda hanya bisa melapor untuk penugasan yang sedang menunggu atau sedang bertugas.
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="lk-penugasan">Penugasan *</Label>
                  <select
                    id="lk-penugasan"
                    className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
                    {...register("penugasan_id")}
                  >
                    <option value="">— Pilih —</option>
                    {myPenugasan.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.jenis} — {p.siklus?.faskes?.nama || "Faskes"}
                      </option>
                    ))}
                  </select>
                  {errors.penugasan_id && <p className="text-xs text-red-500 mt-1">{errors.penugasan_id.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="lk-jenis">Jenis Kendala *</Label>
                  <select
                    id="lk-jenis"
                    className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
                    {...register("jenis")}
                  >
                    <option value="conflict_of_interest">Conflict of Interest (CoI)</option>
                    <option value="force_majeure">Force Majeure</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="lk-deskripsi">Deskripsi *</Label>
                  <Textarea
                    id="lk-deskripsi"
                    rows={4}
                    {...register("deskripsi")}
                    placeholder="Jelaskan kendala yang Anda alami..."
                    maxLength={5000}
                  />
                  {errors.deskripsi && <p className="text-xs text-red-500 mt-1">{errors.deskripsi.message}</p>}
                  <p className="text-xs text-slate-400 dark:text-slate-500">Minimal 10 karakter. Admin akan menerima laporan ini dan menindaklanjuti.</p>
                </div>
              </>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)} disabled={submitMutate.isPending}>
                Batal
              </Button>
              <Button type="submit" disabled={submitMutate.isPending || myPenugasan.length === 0}>
                {submitMutate.isPending ? "Mengirim..." : "Kirim Laporan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
