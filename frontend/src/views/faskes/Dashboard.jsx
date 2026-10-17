import React, { useState, useCallback } from "react";
import { useHistory } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import SiklusStepper from "@/components/SiklusStepper";
import { formatDate } from "../../utils/dateFormat";
import { useApi, useMutateKeys } from "@/hooks/useApi";

const STAGE_LABELS = {
  1: "Pendaftaran", 2: "Validasi", 3: "Kontrak", 4: "Pembayaran",
  5: "Survei", 6: "Verifikasi", 7: "Selesai",
};

function AjukanForm({ onSuccess, authData }) {
  const [lembagaList, setLembagaList] = useState([]);
  const [lembagaLoading, setLembagaLoading] = useState(true);
  const [lembagaError, setLembagaError] = useState("");
  const [error, setError] = useState("");
  const [lembagaLocked, setLembagaLocked] = useState(false);

  // Ambil data user dari parent (sudah di-fetch sekali oleh FaskesDashboard)
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const freshUser = authData?.user || user;
  const faskes = freshUser.faskes || {};
  const faskesLembagaId = faskes.lembaga_id || localStorage.getItem("lembaga_id") || null;
  // Prioritas: jenis_faskes.nama > tipe_faskes > localStorage
  const tipeFaskes = faskes.jenis_faskes?.nama || faskes.tipe_faskes || localStorage.getItem("tipe_faskes") || "";

  const [form, setForm] = useState({
    lembaga_id: "",
    tanggal_permohonan_survei: "",
    tipe_faskes: tipeFaskes,
    nama_penganggung_jawab: "",
    jabatan: "",
    kontak: "",
  });

  const { data: lembagaData, isLoading: lembagaLoadingHook } = useApi(
    "lembaga-list",
    "/pendaftaran/lembaga"
  );

  // Sync hook state into component state
  React.useEffect(() => {
    setLembagaLoading(lembagaLoadingHook);
  }, [lembagaLoadingHook]);

  React.useEffect(() => {
    if (lembagaData?.data) {
      const list = lembagaData.data;
      setLembagaList(list);
      if (list.length === 1) {
        setForm(f => ({ ...f, lembaga_id: list[0].id }));
        setLembagaLocked(true);
      } else if (faskesLembagaId) {
        const match = list.find(l => l.id === faskesLembagaId);
        if (match) {
          setForm(f => ({ ...f, lembaga_id: match.id }));
          setLembagaLocked(true);
        }
      }
    }
    if (lembagaData && !lembagaData.data) {
      setLembagaError("Tidak dapat memuat daftar lembaga.");
    }
  }, [lembagaData, faskesLembagaId]);

  // Sync tipe_faskes ke form saat authData arrives (async — form sudah mount duluan)
  React.useEffect(() => {
    if (tipeFaskes && form.tipe_faskes !== tipeFaskes) {
      setForm(f => ({ ...f, tipe_faskes: tipeFaskes }));
    }
  }, [tipeFaskes]);

  // Sync error from query failure
  React.useEffect(() => {
    if (lembagaData === null || (lembagaData && !lembagaData.data && !lembagaLoadingHook)) {
      setLembagaError("Tidak dapat memuat daftar lembaga. Pastikan Anda memiliki koneksi internet dan coba refresh halaman.");
    }
  }, [lembagaData, lembagaLoadingHook]);

  const mutate = useMutateKeys(["siklus-list-faskes"], {
    onSuccess: (data) => {
      if (data?.data) {
        onSuccess(data.data);
      }
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  function set(key, value) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.lembaga_id || !form.tanggal_permohonan_survei) {
      setError("Lembaga dan tanggal permohonan wajib diisi.");
      return;
    }
    setError("");
    const payload = {
      lembaga_id: form.lembaga_id,
      tanggal_permohonan_survei: form.tanggal_permohonan_survei,
      dfo_data: {
        tipe_faskes: form.tipe_faskes || null,
        nama_penganggung_jawab: form.nama_penganggung_jawab || null,
        jabatan: form.jabatan || null,
        kontak: form.kontak || null,
      },
    };
    mutate.mutate({
      path: "/pendaftaran/siklus",
      method: "POST",
      body: payload,
    });
  }

  // Min date = today
  const today = new Date().toISOString().split("T")[0];

  const loading = mutate.isPending;

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: "700", color: "#1E293B" }}>
          Ajukan Permohonan Akreditasi
        </h1>
        <p style={{ margin: 0, fontSize: "14px", color: "#64748B" }}>
          Isi formulir di bawah untuk memulai proses akreditasi fasilitas kesehatan Anda.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", maxWidth: "860px" }}>
        {/* Kiri: Info Lembaga */}
        <div style={{ gridColumn: "1 / -1" }}>
          <div className="card" style={{ padding: "0" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#2E7D32" }} />
              <span style={{ fontSize: "13px", fontWeight: "600", color: "#1E293B" }}>Informasi Lembaga</span>
            </div>
            <div style={{ padding: "20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label className="form-label" htmlFor="lembaga_id">Lembaga Akreditasi <span style={{ color: "#DC2626" }}>*</span></label>
                <select
                  id="lembaga_id"
                  className="form-input"
                  value={form.lembaga_id}
                  onChange={e => !lembagaLocked && set("lembaga_id", e.target.value)}
                  required
                  disabled={lembagaLoading || lembagaLocked}
                >
                  <option value="">{
                    lembagaLoading ? "Memuat..." :
                    lembagaError ? "Gagal memuat" :
                    lembagaList.length === 0 ? "Tidak ada lembaga" :
                    "— Pilih Lembaga —"
                  }</option>
                  {lembagaList.map(l => (
                    <option key={l.id} value={l.id}>{l.nama}</option>
                  ))}
                </select>
                {lembagaError && (
                  <div style={{ fontSize: "11px", color: "#DC2626", marginTop: "4px" }}>{lembagaError}</div>
                )}
                {lembagaLocked && (
                  <div style={{ fontSize: "11px", color: "#64748B", marginTop: "4px" }}>
                    Terpilih otomatis dari data faskes Anda — tidak dapat diubah.
                  </div>
                )}
              </div>
              <div>
                <label className="form-label" htmlFor="tanggal_permohonan_survei">
                  Tanggal Permohonan Survei <span style={{ color: "#DC2626" }}>*</span>
                </label>
                <input
                  id="tanggal_permohonan_survei"
                  type="date"
                  className="form-input"
                  value={form.tanggal_permohonan_survei}
                  min={today}
                  onChange={e => set("tanggal_permohonan_survei", e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="form-label" htmlFor="tipe_faskes">Tipe Faskes</label>
                <input
                  id="tipe_faskes"
                  type="text"
                  className="form-input"
                  value={form.tipe_faskes}
                  readOnly
                  style={{ background: "#F8FAFC", color: "#475569" }}
                  title="Diisi otomatis dari data faskes Anda"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Kanan: Penanggung Jawab */}
        <div style={{ gridColumn: "1 / -1" }}>
          <div className="card" style={{ padding: "0" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#7E57C2" }} />
              <span style={{ fontSize: "13px", fontWeight: "600", color: "#1E293B" }}>Penanggung Jawab</span>
            </div>
            <div style={{ padding: "20px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
              <div>
                <label className="form-label" htmlFor="nama_pj">Nama Penanggung Jawab</label>
                <input
                  id="nama_pj"
                  type="text"
                  className="form-input"
                  value={form.nama_penganggung_jawab}
                  onChange={e => set("nama_penganggung_jawab", e.target.value)}
                  placeholder="Nama lengkap"
                />
              </div>
              <div>
                <label className="form-label" htmlFor="jabatan">Jabatan</label>
                <input
                  id="jabatan"
                  type="text"
                  className="form-input"
                  value={form.jabatan}
                  onChange={e => set("jabatan", e.target.value)}
                  placeholder="cth: Direktur, Manajer"
                />
              </div>
              <div>
                <label className="form-label" htmlFor="kontak">Nomor Kontak / HP</label>
                <input
                  id="kontak"
                  type="text"
                  className="form-input"
                  value={form.kontak}
                  onChange={e => set("kontak", e.target.value)}
                  placeholder="cth: 0812-xxxx-xxxx"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          marginTop: "16px", maxWidth: "860px",
          padding: "10px 14px",
          background: "#FEE2E2", border: "1px solid #FECACA",
          borderRadius: "6px", color: "#991B1B", fontSize: "13px",
        }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: "20px", display: "flex", alignItems: "center", gap: "12px", maxWidth: "860px" }}>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="btn btn-primary"
          style={{ padding: "10px 24px", fontSize: "14px" }}
        >
          {loading ? (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" style={{ animation: "spin 1s linear infinite", marginRight: "6px" }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              Mengajukan...
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" style={{ marginRight: "6px" }}>
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
              Ajukan Permohonan
            </>
          )}
        </button>
        <span style={{ fontSize: "12px", color: "#94A3B8" }}>
          Setelah diajukan, tim LIPA MITRA NUSA akan memvalidasi kelengkapan dokumen Anda.
        </span>
      </div>

      {/* Info box */}
      <div style={{
        marginTop: "24px", maxWidth: "860px",
        padding: "16px 20px",
        background: "#EFF6FF",
        border: "1px solid #BFDBFE",
        borderRadius: "8px",
      }}>
        <div style={{ fontSize: "13px", fontWeight: "600", color: "#1E40AF", marginBottom: "6px" }}>
          Tahapan Selanjutnya
        </div>
        <div style={{ fontSize: "13px", color: "#3B82F6", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
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

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: "700", color: "#1E293B" }}>
          Status Pengajuan
        </h1>
        <p style={{ margin: 0, fontSize: "14px", color: "#64748B" }}>
          {user.nama || "Faskes Anda"}
        </p>
      </div>

      {/* Info: pengajuan aktif */}
      <div style={{
        marginBottom: "16px",
        padding: "12px 16px",
        background: "#FFF7ED",
        border: "1px solid #FED7AA",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
      }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span style={{ fontSize: "13px", color: "#92400E" }}>
          Pengajuan Anda saat ini sedang dalam proses pada tahap <strong>Tahap {tahap}: {STAGE_LABELS[tahap]}</strong>. Tidak dapat mengajukan permohonan baru selama masih ada pengajuan yang aktif.
        </span>
      </div>

      {/* Stepper card */}
      <div className="card" style={{ padding: "20px", marginBottom: "20px" }}>
        <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "11px", fontWeight: "600", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Tahapan Akreditasi
          </span>
          <span style={{ fontSize: "12px", color: "#2E7D32", fontWeight: "600" }}>
            Tahap {tahap}: {STAGE_LABELS[tahap] || "—"}
          </span>
        </div>
        <SiklusStepper currentStage={tahap} stageStatus="aktif" subStage={subTahap} size="sm" surveiDone={surveiSelesai} invoiceBelumLunas={invoiceBelumLunas} />
      </div>

      {/* Action cards based on stage */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <button
          onClick={() => history.push("/faskes/dokumen")}
          className="card"
          style={{ padding: "16px", textAlign: "left", cursor: "pointer", border: "1px solid #E2E8F0", background: "#fff", transition: "all 0.15s" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <div style={{ fontSize: "13px", fontWeight: "600", color: "#1E293B" }}>Unggah Dokumen</div>
          </div>
          <div style={{ fontSize: "11px", color: "#64748B" }}>
            {siklus.status_kelengkapan === "lengkap" ? "Semua dokumen lengkap" : "DFO, Surat Permohonan, Self Assessment"}
          </div>
        </button>
        {tahap >= 3 && (
          <button
            onClick={() => history.push(`/faskes/kontrak/${siklus.id}`)}
            className="card"
            style={{ padding: "16px", textAlign: "left", cursor: "pointer", border: "1px solid #E2E8F0", background: "#fff", transition: "all 0.15s" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#EDE9F6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#7E57C2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              </div>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#1E293B" }}>Kontrak & Tanda Tangan</div>
            </div>
            <div style={{ fontSize: "11px", color: "#64748B" }}>
              Lihat & tanda tangani PKS
            </div>
          </button>
        )}
        {tahap >= 4 && (
          <button
            onClick={() => history.push("/faskes/tagihan")}
            className="card"
            style={{ padding: "16px", textAlign: "left", cursor: "pointer", border: "1px solid #E2E8F0", background: "#fff", transition: "all 0.15s" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#1E293B" }}>Tagihan & Pembayaran</div>
            </div>
            <div style={{ fontSize: "11px", color: invoiceBelumLunas && surveiSelesai ? "#D97706" : "#64748B" }}>
              {invoiceBelumLunas && surveiSelesai
                ? `⚠️ Invoice belum dibayar — survei telah selesai`
                : "Lihat & bayar invoice"}
            </div>
          </button>
        )}
      </div>

      {/* Siklus info */}
      <div className="card" style={{ padding: "16px 20px", marginTop: "16px" }}>
        <div style={{ fontSize: "11px", fontWeight: "600", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
          Detail Pengajuan
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
          <div>
            <div style={{ fontSize: "11px", color: "#94A3B8", marginBottom: "2px" }}>No. Pengajuan</div>
            <div style={{ fontSize: "13px", fontWeight: "500", color: "#334155", fontFamily: "monospace" }}>{siklus.id?.split("-")[0]?.toUpperCase() || "—"}</div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "#94A3B8", marginBottom: "2px" }}>Lembaga</div>
            <div style={{ fontSize: "13px", fontWeight: "500", color: "#334155" }}>{siklus.lembaga?.nama || "—"}</div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "#94A3B8", marginBottom: "2px" }}>Tanggal Pengajuan</div>
            <div style={{ fontSize: "13px", fontWeight: "500", color: "#334155" }}>{formatDate(siklus.tanggal_pengajuan)}</div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "#94A3B8", marginBottom: "2px" }}>Tanggal Permohonan Survei</div>
            <div style={{ fontSize: "13px", fontWeight: "500", color: "#334155" }}>{formatDate(siklus.tanggal_permohonan_survei)}</div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "#94A3B8", marginBottom: "2px" }}>Status Kelengkapan</div>
            <div style={{ fontSize: "13px", fontWeight: "500", color: siklus.status_kelengkapan === "lengkap" ? "#2E7D32" : "#D97706" }}>
              {siklus.status_kelengkapan === "lengkap" ? "Lengkap" : "Menunggu"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FaskesDashboard() {
  const queryClient = useQueryClient();

  const { data: authData, isLoading: authLoading } = useApi("auth-me", "/auth/me");

  const {
    data: siklusData,
    isLoading: siklusLoading,
  } = useApi(
    "siklus-list",
    "/pendaftaran/siklus?per_page=1",
    {
      refetchInterval: 30000,
    }
  );

  const siklus = siklusData?.data?.[0] || null;
  const loading = authLoading || siklusLoading;

  // Keep user data in localStorage when auth/me returns
  React.useEffect(() => {
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="32" height="32" style={{ animation: "spin 1s linear infinite", marginBottom: "8px" }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          <div style={{ fontSize: "13px", color: "#94A3B8" }}>Memuat...</div>
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
