import React, { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import SiklusStepper from "@/components/SiklusStepper";
import { formatDate } from "@/utils/dateFormat";
import { useApi, useMutateKeys } from "@/hooks/useApi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STAGE_LABELS = {
  1: "Pendaftaran", 2: "Validasi", 3: "Kontrak", 4: "Pembayaran",
  5: "Survei", 6: "Verifikasi", 7: "Selesai",
};

const schema = z.object({
  lembaga_id: z.string().min(1, "Lembaga akreditasi wajib dipilih"),
  tanggal_permohonan_survei: z.string().min(1, "Tanggal permohonan wajib diisi"),
  tipe_faskes: z.string().default(""),
  nama_penganggung_jawab: z.string().default(""),
  jabatan: z.string().default(""),
  kontak: z.string().default(""),
});

function AjukanForm({ onSuccess, authData }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const freshUser = authData?.user || user;
  const faskes = freshUser.faskes || {};
  const faskesLembagaId = faskes.lembaga_id || localStorage.getItem("lembaga_id") || null;
  const tipeFaskes = faskes.jenis_faskes?.nama || faskes.tipe_faskes || localStorage.getItem("tipe_faskes") || "";
  const today = new Date().toISOString().split("T")[0];

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      lembaga_id: "",
      tanggal_permohonan_survei: "",
      tipe_faskes: tipeFaskes,
      nama_penganggung_jawab: "",
      jabatan: "",
      kontak: "",
    },
  });

  const { data: lembagaData, isLoading: lembagaLoading } = useApi("lembaga-list", "/pendaftaran/lembaga");
  const lembagaList = lembagaData?.data || [];

  const watchedLembagaId = watch("lembaga_id");

  useEffect(() => {
    if (lembagaList.length === 1 && !faskesLembagaId) {
      setValue("lembaga_id", lembagaList[0].id, { shouldValidate: true });
    } else if (faskesLembagaId) {
      const match = lembagaList.find(l => l.id === faskesLembagaId);
      if (match) setValue("lembaga_id", match.id, { shouldValidate: true });
    }
  }, [lembagaList, faskesLembagaId, setValue]);

  const lembagaLocked = watchedLembagaId && (
    lembagaList.length === 1 || !!faskesLembagaId
  );

  const mutate = useMutateKeys(["siklus-list-faskes"], {
    onSuccess: (data) => {
      if (data?.data) onSuccess(data.data);
    },
    onError: (err) => alert(err.message),
  });

  const onSubmit = (data) => {
    const payload = {
      lembaga_id: data.lembaga_id,
      tanggal_permohonan_survei: data.tanggal_permohonan_survei,
      dfo_data: {
        tipe_faskes: data.tipe_faskes || null,
        nama_penganggung_jawab: data.nama_penganggung_jawab || null,
        jabatan: data.jabatan || null,
        kontak: data.kontak || null,
      },
    };
    mutate.mutate({ path: "/pendaftaran/siklus", method: "POST", body: payload });
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-slate-800 dark:text-slate-200 mb-1">
          Ajukan Permohonan Akreditasi
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
          Isi formulir di bawah untuk memulai proses akreditasi fasilitas kesehatan Anda.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-[860px]">
        <div className="col-span-2">
          <Card className="p-0">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-600" />
              <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">Informasi Lembaga</span>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="lembaga_id">Lembaga Akreditasi <span className="text-red-500">*</span></Label>
                <select
                  id="lembaga_id"
                  className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
                  {...register("lembaga_id")}
                  disabled={lembagaLoading || lembagaLocked}
                >
                  <option value="">{
                    lembagaLoading ? "Memuat..." :
                    lembagaList.length === 0 ? "Tidak ada lembaga" :
                    "— Pilih Lembaga —"
                  }</option>
                  {lembagaList.map(l => (
                    <option key={l.id} value={l.id}>{l.nama}</option>
                  ))}
                </select>
                {errors.lembaga_id && <p className="text-xs text-red-500 mt-1">{errors.lembaga_id.message}</p>}
                {lembagaLocked && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">
                    Terpilih otomatis dari data faskes Anda — tidak dapat diubah.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tanggal_permohonan_survei">
                  Tanggal Permohonan Survei <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="tanggal_permohonan_survei"
                  type="date"
                  min={today}
                  {...register("tanggal_permohonan_survei")}
                />
                {errors.tanggal_permohonan_survei && <p className="text-xs text-red-500 mt-1">{errors.tanggal_permohonan_survei.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tipe_faskes">Tipe Faskes</Label>
                <Input
                  id="tipe_faskes"
                  type="text"
                  {...register("tipe_faskes")}
                  readOnly
                  className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 dark:text-slate-500"
                  title="Diisi otomatis dari data faskes Anda"
                />
              </div>
            </div>
          </Card>
        </div>

        <div className="col-span-2">
          <Card className="p-0">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-violet-500" />
              <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">Penanggung Jawab</span>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="nama_pj">Nama Penanggung Jawab</Label>
                <Input id="nama_pj" type="text" {...register("nama_penganggung_jawab")} placeholder="Nama lengkap" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="jabatan">Jabatan</Label>
                <Input id="jabatan" type="text" {...register("jabatan")} placeholder="cth: Direktur, Manajer" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="kontak">Nomor Kontak / HP</Label>
                <Input id="kontak" type="text" {...register("kontak")} placeholder="cth: 0812-xxxx-xxxx" />
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3 max-w-[860px]">
        <Button onClick={handleSubmit(onSubmit)} disabled={mutate.isPending}>
          {mutate.isPending ? "Mengajukan..." : "Ajukan Permohonan"}
        </Button>
        <span className="text-[12px] text-slate-400 dark:text-slate-500">
          Setelah diajukan, tim LIPA MITRA NUSA akan memvalidasi kelengkapan dokumen Anda.
        </span>
      </div>

      <div className="mt-6 max-w-[860px] p-4 rounded-lg bg-blue-50 border border-blue-200">
        <div className="text-[13px] font-semibold text-blue-800 mb-2">
          Tahapan Selanjutnya
        </div>
        <div className="text-[13px] text-blue-600 grid grid-cols-2 gap-1">
          <span>1. Tim kami akan memvalidasi permohonan Anda</span>
          <span>2. Draf PKS akan dikirimkan untuk ditandatangani</span>
          <span>3. Invoice tagihan akan terbit otomatis</span>
          <span>4. Setelah lunas, Surat Tugas survei diterbitkan</span>
        </div>
      </div>
    </div>
  );
}

function StatusView({ siklus }) {
  const history = useHistory();
  const tahap = siklus.tahapan || 1;
  const subTahap = siklus.sub_tahapan_survei || 0;
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const { data: invoiceData } = useApi(
    ["invoice-status", siklus?.id],
    siklus?.id ? `/invoice/by-siklus/${siklus.id}` : "/pendaftaran/siklus?per_page=1",
    { enabled: !!siklus?.id }
  );

  const invoiceStatus = React.useMemo(() => {
    if (!invoiceData?.data?.[0]) return null;
    const inv = invoiceData.data[0];
    return { lunas: inv.status === "lunas", total: inv.total_tagihan };
  }, [invoiceData]);

  const surveiSelesai = siklus?.survei_selesai === true;
  const invoiceBelumLunas = invoiceStatus && !invoiceStatus.lunas;

  // Survei selesai tapi invoice belum lunas → proses tertahan di Pembayaran,
  // sama seperti yang ditampilkan stepper di portal admin.
  const tertahanPembayaran = Boolean(invoiceBelumLunas && surveiSelesai);
  const tahapAktif = tertahanPembayaran ? 4 : tahap;

  return (
    <div className="max-w-[720px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-slate-800 dark:text-slate-200 mb-1">
          Status Pengajuan
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
          {user.nama || "Faskes Anda"}
        </p>
      </div>

      <div className="mb-4 p-3 rounded-lg bg-orange-50 border border-orange-200 flex items-center gap-2.5">
        <svg viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" className="shrink-0">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        {tertahanPembayaran ? (
          <span className="text-[13px] text-amber-800">
            Survei telah selesai — mohon selesaikan pembayaran invoice agar proses verifikasi dapat dilanjutkan.
          </span>
        ) : (
          <span className="text-[13px] text-amber-800">
            Pengajuan Anda saat ini sedang dalam proses pada tahap <strong>Tahap {tahap}: {STAGE_LABELS[tahap]}</strong>. Tidak dapat mengajukan permohonan baru selama masih ada pengajuan yang aktif.
          </span>
        )}
      </div>

      <Card className="p-5 mb-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
            Tahapan Akreditasi
          </span>
          <span className="text-[12px] text-green-600 font-semibold">
            Tahap {tahapAktif}: {STAGE_LABELS[tahapAktif] || "—"}
          </span>
        </div>
        <SiklusStepper currentStage={tahap} stageStatus={siklus.status || "aktif"} subStage={subTahap} size="sm" surveiDone={surveiSelesai} invoiceBelumLunas={invoiceBelumLunas} />
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => history.push("/faskes/dokumen")}
          className="card text-left p-4 border border-slate-200 dark:border-slate-700 bg-white transition-all hover:border-slate-300 hover:shadow-sm"
        >
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <div className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">Unggah Dokumen</div>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500">
            {siklus.status_kelengkapan === "lengkap" ? "Semua dokumen lengkap" : "Screenshot DFO, Surat Permohonan, Self Assessment"}
          </div>
        </button>
        {tahap >= 3 && (
          <button
            onClick={() => history.push(`/faskes/kontrak/${siklus.id}`)}
            className="card text-left p-4 border border-slate-200 dark:border-slate-700 bg-white transition-all hover:border-slate-300 hover:shadow-sm"
          >
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="#7E57C2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              </div>
              <div className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">Kontrak & Tanda Tangan</div>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500">
              Lihat & tanda tangani PKS
            </div>
          </button>
        )}
        {tahap >= 4 && (
          <button
            onClick={() => history.push("/faskes/tagihan")}
            className="card text-left p-4 border border-slate-200 dark:border-slate-700 bg-white transition-all hover:border-slate-300 hover:shadow-sm"
          >
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                {invoiceBelumLunas && surveiSelesai ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                    <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
                  </svg>
                )}
              </div>
              <div className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">Tagihan & Pembayaran</div>
            </div>
            <div className="text-[11px]" style={{ color: invoiceBelumLunas && surveiSelesai ? "#D97706" : "#64748B" }}>
              {invoiceBelumLunas && surveiSelesai
                ? "Invoice belum dibayar — survei telah selesai"
                : "Lihat & bayar invoice"}
            </div>
          </button>
        )}
      </div>

      <Card className="p-5 mt-4">
        <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3">
          Detail Pengajuan
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 mb-0.5">No. Pengajuan</div>
            <div className="text-[13px] font-medium text-slate-700 dark:text-slate-300 dark:text-slate-500 font-mono">{siklus.id?.split("-")[0]?.toUpperCase() || "—"}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 mb-0.5">Lembaga</div>
            <div className="text-[13px] font-medium text-slate-700 dark:text-slate-300 dark:text-slate-500">{siklus.lembaga?.nama || "—"}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 mb-0.5">Tanggal Pengajuan</div>
            <div className="text-[13px] font-medium text-slate-700 dark:text-slate-300 dark:text-slate-500">{formatDate(siklus.tanggal_pengajuan)}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 mb-0.5">Tanggal Permohonan Survei</div>
            <div className="text-[13px] font-medium text-slate-700 dark:text-slate-300 dark:text-slate-500">{formatDate(siklus.tanggal_permohonan_survei)}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 mb-0.5">Status Kelengkapan</div>
            <div className="text-[13px] font-medium" style={{ color: siklus.status_kelengkapan === "lengkap" ? "#2E7D32" : "#D97706" }}>
              {siklus.status_kelengkapan === "lengkap" ? "Lengkap" : "Menunggu"}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function FaskesDashboard() {
  const queryClient = useQueryClient();

  const { data: authData, isLoading: authLoading } = useApi("auth-me", "/auth/me");

  const { data: siklusData, isLoading: siklusLoading } = useApi(
    "siklus-list",
    "/pendaftaran/siklus?per_page=1",
    { refetchInterval: 30000 }
  );

  const siklus = siklusData?.data?.[0] || null;
  const loading = authLoading || siklusLoading;

  useEffect(() => {
    if (authData?.user) {
      localStorage.setItem("user", JSON.stringify(authData.user));
      const tipeFaskes = authData.user.faskes?.jenis_faskes?.nama
        || authData.user.faskes?.tipe_faskes
        || "";
      if (tipeFaskes) localStorage.setItem("tipe_faskes", tipeFaskes);
      if (authData.lembaga_id) localStorage.setItem("lembaga_id", authData.lembaga_id);
    }
  }, [authData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="32" height="32" className="animate-spin mx-auto mb-2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          <div className="text-[13px] text-slate-400 dark:text-slate-500">Memuat...</div>
        </div>
      </div>
    );
  }

  if (!siklus) {
    return <AjukanForm authData={authData} onSuccess={(newSiklus) => {
      queryClient.invalidateQueries({ queryKey: ["siklus-list"] });
    }} />;
  }

  return <StatusView siklus={siklus} />;
}
