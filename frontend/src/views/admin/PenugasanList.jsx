import React, { useState, useEffect, useRef } from "react";
import { formatDateTime, formatDate } from "../../utils/dateFormat";
import { useApi, useMutateKeys, useMutate } from "@/hooks/useApi";

/**
 * SearchableSelect — combo box dengan filter teks untuk daftar panjang.
 * Props: options, value, onChange(value), placeholder, required, disabledHint
 */
function SearchableSelect({ options, value, onChange, placeholder = "— Pilih —", required, disabledHint }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const selected = options.find(o => o.id === value);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        // Kembalikan input ke nama item yang dipilih, atau kosong
        setQuery(selected ? selected.nama : "");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [selected]);

  // Sync textbox dengan item yang dipilih dari luar
  useEffect(() => {
    setQuery(selected ? selected.nama : "");
  }, [value]);

  const filtered = query.trim()
    ? options.filter(o => {
        const q = query.toLowerCase();
        return (o.nama || "").toLowerCase().includes(q)
          || (o.nomor_induk_surveior || "").toLowerCase().includes(q)
          || (o.jenis || "").toLowerCase().includes(q);
      })
    : options;

  function pick(opt) {
    onChange(opt.id);
    setQuery(opt.nama);
    setOpen(false);
  }

  function clearPick() {
    onChange("");
    setQuery("");
    setOpen(true);
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <input
        type="text"
        className="form-input"
        placeholder={placeholder}
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        required={required && !value}
        autoComplete="off"
        style={{ paddingRight: "30px" }}
      />
      {value && (
        <button
          type="button"
          onClick={clearPick}
          style={{
            position: "absolute", right: "6px", top: "50%", transform: "translateY(-50%)",
            background: "transparent", border: "none", cursor: "pointer",
            color: "#94A3B8", padding: "4px", lineHeight: 1,
          }}
          aria-label="Clear selection"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "#fff", border: "1px solid #E2E8F0", borderRadius: "6px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)", maxHeight: "240px", overflowY: "auto",
          zIndex: 50,
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "10px 12px", color: "#94A3B8", fontSize: "12px" }}>
              {disabledHint || "Tidak ada hasil"}
            </div>
          ) : (
            filtered.map(o => (
              <div
                key={o.id}
                onClick={() => pick(o)}
                style={{
                  padding: "8px 12px", cursor: "pointer", fontSize: "13px",
                  background: o.id === value ? "#F1F5F9" : "transparent",
                  borderBottom: "1px solid #F1F5F9",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                onMouseLeave={e => e.currentTarget.style.background = o.id === value ? "#F1F5F9" : "transparent"}
              >
                <div style={{ color: "#1E293B", fontWeight: "500" }}>{o.nama}</div>
                <div style={{ color: "#94A3B8", fontSize: "11px", marginTop: "2px" }}>
                  {o.nomor_induk_surveior}
                  {o.jenis ? ` • ${o.jenis}` : ""}
                  {o.status_penugasan_saat_ini && o.status_penugasan_saat_ini !== "tidak_bertugas"
                    ? ` • ${o.status_penugasan_saat_ini}`
                    : ""}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    menunggu: ["Menunggu", "warning"],
    aktif: ["Aktif", "success"],
    selesai: ["Selesai", "success"],
    dibatalkan: ["Dibatalkan", "danger"],
    ditolak: ["Ditolak", "danger"],
    draft: ["Draft", "secondary"],
    menunggu_tindakan: ["Menunggu Tindakan", "warning"],
  };
  const [label, color] = map[status] || [status, "secondary"];
  return <span className={`status-badge status-${color}`}>{label}</span>;
}

function PenugasanList() {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    siklus_id: "",
    jenis: "survei",
    surveyor_tkpp_id: "",   // untuk jenis=survei
    surveyor_tksdu_id: "",   // untuk jenis=survei
    verifikator_id: "",     // untuk jenis=verifikasi
    tanggal_mulai_survei: "",
    tanggal_selesai_survei: "",
    surat: null,
  });
  const [search, setSearch] = useState("");
  const [penugasanRefreshKey, setPenugasanRefreshKey] = useState(0);
  const [detailGroup, setDetailGroup] = useState(null);
  const [replaceTarget, setReplaceTarget] = useState(null); // penugasan yang akan diganti
  const [replaceCandidates, setReplaceCandidates] = useState([]);
  const [replaceChoice, setReplaceChoice] = useState("");
  const [replaceReason, setReplaceReason] = useState("");

  // React Query data fetching
  const { data: penugasanData, isLoading } = useApi(["penugasan-list", penugasanRefreshKey], "/penugasan");
  const { data: siklusData } = useApi(["siklus-list", form.jenis], `/admin/siklus?jenis=${form.jenis}`);
  const { data: tkppData, isLoading: tkppLoading, error: tkppError } = useApi(
    ["tkpp-options", form.siklus_id],
    form.siklus_id ? `/admin/tenaga-ahli?peran=surveior&jenis=TKPP&siklus_id=${form.siklus_id}` : null
  );
  const { data: tksduData, isLoading: tksduLoading, error: tksduError } = useApi(
    ["tksdu-options", form.siklus_id],
    form.siklus_id ? `/admin/tenaga-ahli?peran=surveior&jenis=TKSDU&siklus_id=${form.siklus_id}` : null
  );
  const { data: verifikatorData } = useApi(
    ["verifikator-options", form.siklus_id],
    form.siklus_id ? `/admin/tenaga-ahli?peran=verifikator&siklus_id=${form.siklus_id}` : null
  );
  const { data: historiData } = useApi(
    ["penugasan-histori", detailGroup?.siklus_id, detailGroup?.jenis],
    detailGroup ? `/penugasan/${detailGroup.siklus_id}/histori?jenis=${detailGroup.jenis}` : "",
    { enabled: !!detailGroup }
  );

  const histori = historiData?.data || [];

  const mutatePenugasan = useMutateKeys(["penugasan-list"], {});
  const [appointLoading, setAppointLoading] = useState(false);
  const [appointError, setAppointError] = useState("");
  const mutateReplaceCandidates = useMutate({
    onSuccess: (d) => setReplaceCandidates(d?.data || []),
    onError: () => setReplaceCandidates([]),
  });
  const mutateReplaceSubmit = useMutate({
    onSuccess: (d) => {
      setReplaceTarget(null);
      setReplaceChoice("");
      setReplaceReason("");
      alert(d.message || "Berhasil.");
    },
    onError: (err) => alert(err.message),
  });

  const data = penugasanData?.data || [];
  const siklus = siklusData?.data || [];
  const surveyorTKPP = tkppData?.data || [];
  const surveyorTKSDU = tksduData?.data || [];
  const verifikator = verifikatorData?.data || [];

  function handleAppoint(e) {
    e.preventDefault();
    if (!form.siklus_id) {
      alert("Pilih siklus terlebih dahulu.");
      return;
    }
    const body = new FormData();
    body.append("siklus_id", form.siklus_id);
    body.append("jenis", form.jenis);
    if (form.jenis === "survei") {
      if (!form.surveyor_tkpp_id || !form.surveyor_tksdu_id) {
        alert("Pilih kedua surveyor (TKPP dan TKSDU).");
        return;
      }
      if (form.surveyor_tkpp_id === form.surveyor_tksdu_id) {
        alert("TKPP dan TKSDU tidak boleh orang yang sama.");
        return;
      }
      body.append("tenaga_ahli_ids[]", form.surveyor_tkpp_id);
      body.append("tenaga_ahli_ids[]", form.surveyor_tksdu_id);
    } else {
      if (!form.verifikator_id) {
        alert("Pilih verifikator.");
        return;
      }
      body.append("tenaga_ahli_id", form.verifikator_id);
    }
    if (form.surat) body.append("surat_tugas", form.surat);
    if (form.tanggal_mulai_survei) body.append("tanggal_mulai_survei", form.tanggal_mulai_survei);
    if (form.tanggal_selesai_survei) body.append("tanggal_selesai_survei", form.tanggal_selesai_survei);

    // Direct fetch — avoids useMutate/useMutateKeys FormData ambiguity
    setAppointLoading(true);
    setAppointError("");
    const token = localStorage.getItem("token");
    // Penting: sertakan lembaga_id di URL — endpoint ini lookup siklus
    // dengan BelongsToLembaga trait, dan middleware sync session dari
    // query param ini. Tanpa lembaga_id, session bisa nyangkut di
    // lembaga default user saat API dipanggil.
    const lembagaId = localStorage.getItem("lembaga_id");
    const url = lembagaId
      ? `/api/penugasan/appoint?lembaga_id=${encodeURIComponent(lembagaId)}`
      : "/api/penugasan/appoint";
    fetch(url, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body,
    })
      .then(async res => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message || `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then(() => {
        setShowModal(false);
        setForm({
          siklus_id: "", jenis: "survei",
          surveyor_tkpp_id: "", surveyor_tksdu_id: "",
          verifikator_id: "", surat: null,
          tanggal_mulai_survei: "", tanggal_selesai_survei: "",
        });
        setPenugasanRefreshKey(k => k + 1);
      })
      .catch(err => {
        setAppointError(err.message);
      })
      .finally(() => setAppointLoading(false));
  }

  function handleBatal(penugasanIds) {
    if (!Array.isArray(penugasanIds) || penugasanIds.length === 0) return;
    if (!confirm(`Batalkan ${penugasanIds.length} penugasan ini? Penugasan akan dihapus dan siklus dapat ditugaskan ulang.`)) return;
    // Call batal for each penugasan
    penugasanIds.forEach(id => {
      mutatePenugasan.mutate({
        path: `/penugasan/${id}/batal`,
        method: "POST",
        onError: (err) => alert(`Gagal membatalkan penugasan ${id}: ${err.message}`),
      });
    });
  }

  // Buka modal replace: load kandidat TA sejenis yang tidak sedang bertugas
  function openReplace(penugasan) {
    setReplaceTarget(penugasan);
    setReplaceChoice("");
    setReplaceReason("");

    const isSurvei = penugasan.jenis === "survei";
    const jenis = penugasan.tenaga_ahli?.jenis; // TKPP / TKSDU / null
    const peran = isSurvei ? "surveior" : "verifikator";
    // Untuk replace, tampilkan semua kandidat (termasuk yang sibuk).
    // Backend sudah validasi: TA sibuk yang dipilih akan ditolak dengan pesan jelas.
    const qs = new URLSearchParams({ peran, exclude_bertugas: "0" });
    if (isSurvei && jenis) qs.set("jenis", jenis);

    mutateReplaceCandidates.mutate({
      path: `/admin/tenaga-ahli?${qs.toString()}`,
      method: "GET",
    });
  }

  function submitReplace() {
    if (!replaceTarget || !replaceChoice) return;
    const body = new FormData();
    body.append("tenaga_ahli_baru_id", replaceChoice);
    if (replaceReason.trim()) body.append("alasan", replaceReason.trim());
    mutateReplaceSubmit.mutate({ path: `/penugasan/${replaceTarget.id}/replace`, method: "POST", body });
  }

  const filtered = (() => {
    // Group penugasan per (siklus_id, jenis) → 1 baris dengan multiple surveyor
    const groups = new Map();
    for (const p of data) {
      const key = `${p.siklus_id}|${p.jenis}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          siklus: p.siklus,
          siklus_id: p.siklus_id,
          jenis: p.jenis,
          items: [],
          tenaga_ahli_list: [],
        });
      }
      const g = groups.get(key);
      g.items.push(p);
      if (p.tenaga_ahli?.nama) {
        g.tenaga_ahli_list.push({
          id: p.tenaga_ahli.id,
          nama: p.tenaga_ahli.nama,
          jenis: p.tenaga_ahli.jenis,
          status: p.status,
        });
      }
    }
    const arr = Array.from(groups.values());
    if (!search) return arr;
    const q = search.toLowerCase();
    return arr.filter(g =>
      (g.siklus?.faskes?.nama || "").toLowerCase().includes(q)
      || g.tenaga_ahli_list.some(t => (t.nama || "").toLowerCase().includes(q))
      || g.jenis.toLowerCase().includes(q)
      || g.items.some(p => (p.status || "").toLowerCase().includes(q))
    );
  })();

  return (
    <div>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>
            Penugasan Surveior & Verifikator
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
            {data.length} entri penugasan ({filtered.length} grup)
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Tunjuk Tenaga Ahli
        </button>
      </div>

      {/* Search */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: "320px" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            className="form-input"
            placeholder="Cari faskes atau tenaga ahli..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: "38px" }}
          />
        </div>
        <span style={{ fontSize: "13px", color: "#94A3B8" }}>{filtered.length} hasil</span>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: "40px" }}>No</th>
                <th>Faskes</th>
                <th>Jenis</th>
                <th>Tenaga Ahli</th>
                <th>Status</th>
                <th style={{ width: "120px" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="6" style={{ textAlign: "center", color: "#94A3B8", padding: "48px 16px" }}>Memuat...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: "center", color: "#94A3B8", padding: "48px 16px" }}>
                  {search ? "Tidak ada hasil" : "Belum ada penugasan"}
                </td></tr>
              ) : filtered.map((g, i) => {
                  // Status agregat (semua TA harus konfirmasi/selesai sebelum status berubah):
                  //  - ditolak/dibatalkan: kalau ADA salah satu → tampilkan itu
                  //  - selesai: hanya jika SEMUA TA sudah selesai
                  //  - sedang_bertugas: jika SEMUA TA sudah konfirmasi (mixed selesai+bertugas OK)
                  //  - menunggu: jika ada yang masih menunggu
                  const statuses = g.items.map(p => p.status);
                  const overallStatus = statuses.includes('dibatalkan') ? 'dibatalkan'
                    : statuses.includes('ditolak') ? 'ditolak'
                    : statuses.every(s => s === 'selesai') ? 'selesai'
                    : statuses.every(s => s === 'sedang_bertugas' || s === 'selesai') ? 'sedang_bertugas'
                    : statuses.includes('menunggu') ? 'menunggu'
                    : statuses[0] || '—';
                  return (
                    <tr key={g.key}>
                      <td style={{ color: "#94A3B8", fontSize: "12px" }}>{i + 1}</td>
                      <td style={{ fontWeight: "500", color: "#1E293B" }}>{g.siklus?.faskes?.nama || "—"}</td>
                      <td>
                        <span style={{
                          padding: "2px 8px", borderRadius: "9999px",
                          fontSize: "11px", fontWeight: "600",
                          background: g.jenis === "survei" ? "#DBEAFE" : "#E8F5E9",
                          color: g.jenis === "survei" ? "#1E40AF" : "#166534",
                        }}>
                          {g.jenis}
                        </span>
                      </td>
                      <td style={{ color: "#64748B", fontSize: "13px" }}>
                        {g.tenaga_ahli_list.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                            {g.tenaga_ahli_list.map(t => (
                              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{
                                  padding: "1px 6px", borderRadius: "4px",
                                  fontSize: "10px", fontWeight: "600",
                                  background: t.jenis === "TKPP" ? "#FEF3C7" : t.jenis === "TKSDU" ? "#DBEAFE" : "#E8F5E9",
                                  color: t.jenis === "TKPP" ? "#92400E" : t.jenis === "TKSDU" ? "#1E40AF" : "#166534",
                                }}>
                                  {t.jenis || (g.jenis === "verifikasi" ? "VER" : "—")}
                                </span>
                                <span style={{ color: "#334155", fontWeight: "500" }}>{t.nama}</span>
                              </div>
                            ))}
                          </div>
                        ) : "—"}
                      </td>
                      <td><StatusBadge status={overallStatus} /></td>
                      <td>
                        <div style={{ display: "flex", gap: "4px" }}>
                          {g.items[0] && (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: "#4CAF50", padding: "4px 8px" }}
                              onClick={() => setDetailGroup(g)}
                            >
                              Detail
                            </button>
                          )}
                          {g.items.length > 0 && g.items.every(p => p.status === "menunggu") && (
                            <button className="btn btn-ghost btn-sm" style={{ color: "#DC2626", padding: "4px 8px" }} onClick={() => handleBatal(g.items.map(p => p.id))}>
                              Batal
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={() => setShowModal(false)}>
          <div style={{ background: "#fff", borderRadius: "12px", width: "100%", maxWidth: "520px", boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#1E293B" }}>Tunjuk Tenaga Ahli</h3>
              <button className="btn btn-ghost" style={{ padding: "4px", color: "#94A3B8" }} onClick={() => setShowModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleAppoint} style={{ padding: "24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label className="form-label">Siklus</label>
                  <select className="form-input" value={form.siklus_id} onChange={e => setForm({ ...form, siklus_id: e.target.value })} required>
                    <option value="">— Pilih Siklus —</option>
                    {siklus.map(s => {
                      const faskesName = s.faskes_nama ?? s.faskes?.nama;
                      const lembagaName = s.lembaga_nama ?? s.lembaga?.nama;
                      const label = faskesName
                        ? `${faskesName}${lembagaName ? ' — ' + lembagaName : ''} (Tahap ${s.tahapan ?? '?'}, ${s.status ?? '—'})`
                        : `Siklus ${s.id.substring(0, 8)}… (Faskes tidak ditemukan)`;
                      return (
                        <option key={s.id} value={s.id}>{label}</option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="form-label">Jenis Penugasan</label>
                  <select className="form-input" value={form.jenis} onChange={e => {
                    const newJenis = e.target.value;
                    setForm({ ...form, jenis: newJenis, siklus_id: "" });
                  }}>
                    <option value="survei">Survei</option>
                    <option value="verifikasi">Verifikasi</option>
                  </select>
                </div>
              </div>
              {form.jenis === "survei" ? (
                <>
                  <div style={{ marginTop: "16px" }}>
                    <label className="form-label">Surveyor TKPP *</label>
                    <SearchableSelect
                      options={surveyorTKPP}
                      value={form.surveyor_tkpp_id}
                      onChange={v => setForm({ ...form, surveyor_tkpp_id: v })}
                      placeholder={tkppLoading ? "Memuat…" : tkppError ? `Error: ${tkppError.message}` : surveyorTKPP.length === 0 ? "Tidak ada surveyor TKPP tersedia" : "Cari & pilih surveyor TKPP…"}
                      required
                      disabledHint="Tidak ada surveyor TKPP yang cocok"
                    />
                  </div>
                  <div style={{ marginTop: "16px" }}>
                    <label className="form-label">Surveyor TKSDU *</label>
                    <SearchableSelect
                      options={surveyorTKSDU}
                      value={form.surveyor_tksdu_id}
                      onChange={v => setForm({ ...form, surveyor_tksdu_id: v })}
                      placeholder={tksduLoading ? "Memuat…" : tksduError ? `Error: ${tksduError.message}` : surveyorTKSDU.length === 0 ? "Tidak ada surveyor TKSDU tersedia" : "Cari & pilih surveyor TKSDU…"}
                      required
                      disabledHint="Tidak ada surveyor TKSDU yang cocok"
                    />
                  </div>
                </>
              ) : (
                <div style={{ marginTop: "16px" }}>
                  <label className="form-label">Verifikator *</label>
                  <SearchableSelect
                    options={verifikator}
                    value={form.verifikator_id}
                    onChange={v => setForm({ ...form, verifikator_id: v })}
                    placeholder={verifikator.length === 0 ? "Tidak ada verifikator tersedia" : "Cari & pilih verifikator…"}
                    required
                    disabledHint="Tidak ada verifikator yang cocok"
                  />
                </div>
              )}
              <div style={{ marginTop: "16px" }}>
                <label className="form-label">Surat Tugas (PDF, opsional)</label>
                <input type="file" accept=".pdf" className="form-input" onChange={e => setForm({ ...form, surat: e.target.files[0] })} />
              </div>
              {form.jenis === "survei" && (
                <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label className="form-label">Tanggal Mulai Survei</label>
                    <input
                      type="date"
                      className="form-input"
                      value={form.tanggal_mulai_survei}
                      onChange={e => setForm({ ...form, tanggal_mulai_survei: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">Tanggal Selesai Survei</label>
                    <input
                      type="date"
                      className="form-input"
                      value={form.tanggal_selesai_survei}
                      onChange={e => setForm({ ...form, tanggal_selesai_survei: e.target.value })}
                    />
                  </div>
                </div>
              )}
              {appointError && (
                <div style={{ marginTop: "12px", padding: "8px 12px", background: "#FEE2E2", color: "#991B1B", borderRadius: "6px", fontSize: "13px" }}>
                  {appointError}
                </div>
              )}
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "24px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={appointLoading}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={appointLoading}>
                  {appointLoading ? "Memproses…" : "Tunjuk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Replace Surveyor */}
      {replaceTarget && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
          onClick={() => !mutateReplaceSubmit.isPending && setReplaceTarget(null)}
        >
          <div
            style={{ background: "#fff", borderRadius: "12px", width: "100%", maxWidth: "480px", boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#1E293B" }}>
                Ganti Tenaga Ahli
              </h3>
              <button className="btn btn-ghost" style={{ padding: "4px", color: "#94A3B8" }} onClick={() => setReplaceTarget(null)} disabled={mutateReplaceSubmit.isPending}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div style={{ padding: "24px" }}>
              <div style={{
                padding: "10px 12px", background: "#FEF3C7", borderRadius: "8px",
                border: "1px solid #FDE68A", marginBottom: "16px", fontSize: "12px", color: "#92400E",
              }}>
                <strong>{replaceTarget.tenaga_ahli?.nama}</strong>
                {replaceTarget.tenaga_ahli?.jenis && (
                  <span style={{
                    marginLeft: "8px", padding: "1px 6px", borderRadius: "4px",
                    fontSize: "10px", fontWeight: "600",
                    background: replaceTarget.tenaga_ahli.jenis === "TKPP" ? "#FEF3C7" : "#DBEAFE",
                    color: replaceTarget.tenaga_ahli.jenis === "TKPP" ? "#92400E" : "#1E40AF",
                    border: "1px solid " + (replaceTarget.tenaga_ahli.jenis === "TKPP" ? "#FCD34D" : "#93C5FD"),
                  }}>
                    {replaceTarget.tenaga_ahli.jenis}
                  </span>
                )}
                <div style={{ fontSize: "11px", marginTop: "4px" }}>
                  Akan diganti dengan surveyor <strong>{replaceTarget.tenaga_ahli?.jenis || 'verifikator'} lain</strong> yang tidak sedang bertugas.
                </div>
              </div>

              <label className="form-label">Pilih Tenaga Ahli Pengganti *</label>
              <select
                className="form-input"
                value={replaceChoice}
                onChange={e => setReplaceChoice(e.target.value)}
                required
                disabled={mutateReplaceSubmit.isPending}
              >
                <option value="">— Pilih —</option>
                {replaceCandidates.length === 0 ? (
                  <option value="" disabled>Tidak ada kandidat tersedia (semua sedang bertugas / nonaktif)</option>
                ) : (
                  replaceCandidates.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nama} ({c.nomor_induk_surveior}){c.jenis ? ` • ${c.jenis}` : ""}
                    </option>
                  ))
                )}
              </select>
              {replaceCandidates.length === 0 && (
                <div style={{ fontSize: "11px", color: "#DC2626", marginTop: "6px" }}>
                  Semua surveyor {replaceTarget.tenaga_ahli?.jenis || ''} sedang aktif di siklus lain.
                </div>
              )}

              <div style={{ marginTop: "12px" }}>
                <label className="form-label">Alasan Penggantian (opsional)</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={replaceReason}
                  onChange={e => setReplaceReason(e.target.value)}
                  placeholder="cth: Konflik kepentingan, tidak dapat dihubungi, dll."
                  disabled={mutateReplaceSubmit.isPending}
                  style={{ resize: "vertical", minHeight: "50px" }}
                />
              </div>
            </div>
            <div style={{ padding: "12px 24px", borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button className="btn btn-secondary" onClick={() => setReplaceTarget(null)} disabled={mutateReplaceSubmit.isPending}>Batal</button>
              <button
                className="btn btn-primary"
                onClick={submitReplace}
                disabled={!replaceChoice || mutateReplaceSubmit.isPending}
              >
                {mutateReplaceSubmit.isPending ? "Mengganti..." : "Ganti"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Penugasan */}
      {detailGroup && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
          onClick={() => setDetailGroup(null)}
        >
          <div
            style={{ background: "#fff", borderRadius: "12px", width: "100%", maxWidth: "520px", boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#1E293B" }}>
                Detail Penugasan
              </h3>
              <button className="btn btn-ghost" style={{ padding: "4px", color: "#94A3B8" }} onClick={() => setDetailGroup(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div style={{ padding: "24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", rowGap: "10px", columnGap: "16px", fontSize: "13px", marginBottom: "20px" }}>
                <div style={{ color: "#64748B" }}>Faskes</div>
                <div style={{ color: "#1E293B", fontWeight: "500" }}>{detailGroup.siklus?.faskes?.nama || "—"}</div>

                <div style={{ color: "#64748B" }}>Lembaga</div>
                <div style={{ color: "#1E293B" }}>{detailGroup.siklus?.lembaga?.nama || "—"}</div>

                <div style={{ color: "#64748B" }}>Jenis</div>
                <div>
                  <span style={{
                    padding: "2px 8px", borderRadius: "9999px",
                    fontSize: "11px", fontWeight: "600",
                    background: detailGroup.jenis === "survei" ? "#DBEAFE" : "#E8F5E9",
                    color: detailGroup.jenis === "survei" ? "#1E40AF" : "#166534",
                  }}>{detailGroup.jenis}</span>
                </div>

                <div style={{ color: "#64748B" }}>Status Siklus</div>
                <div style={{ color: "#1E293B" }}>Tahap {detailGroup.siklus?.tahapan ?? "?"} — {detailGroup.siklus?.status || "—"}</div>
              </div>

              <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: "16px" }}>
                <div style={{ fontSize: "11px", fontWeight: "600", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
                  Tenaga Ahli ({detailGroup.tenaga_ahli_list.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {detailGroup.items.map(p => (
                    <div
                      key={p.id}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "10px 12px", background: "#F8FAFC", borderRadius: "8px",
                        border: "1px solid #E2E8F0",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{
                            padding: "2px 8px", borderRadius: "4px",
                            fontSize: "10px", fontWeight: "600",
                            background: p.tenaga_ahli?.jenis === "TKPP" ? "#FEF3C7"
                              : p.tenaga_ahli?.jenis === "TKSDU" ? "#DBEAFE" : "#E8F5E9",
                            color: p.tenaga_ahli?.jenis === "TKPP" ? "#92400E"
                              : p.tenaga_ahli?.jenis === "TKSDU" ? "#1E40AF" : "#166534",
                          }}>
                            {p.tenaga_ahli?.jenis || (detailGroup.jenis === "verifikasi" ? "VER" : "—")}
                          </span>
                          <span style={{ fontWeight: "500", color: "#1E293B", fontSize: "13px" }}>{p.tenaga_ahli?.nama || "—"}</span>
                        </div>
                        <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "3px", marginLeft: "40px" }}>
                          NIK: {p.tenaga_ahli?.nomor_induk_surveior || "—"}
                        </div>
                        {detailGroup.jenis === "survei" && (
                          <div style={{ fontSize: "11px", color: "#64748B", marginTop: "3px", marginLeft: "40px" }}>
                            Jadwal Survei: {p.tanggal_mulai_survei ? `${formatDate(p.tanggal_mulai_survei)} s/d ${formatDate(p.tanggal_selesai_survei)}` : "—"}
                            {p.tanggal_selesai && <span> · Selesai: {formatDate(p.tanggal_selesai)}</span>}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <StatusBadge status={p.status} />
                        {(p.status === "menunggu" || p.status === "sedang_bertugas" || p.status === "ditolak") && (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: "#2563EB", padding: "4px 8px", fontSize: "11px" }}
                            onClick={() => openReplace(p)}
                            title={`Ganti ${p.tenaga_ahli?.nama} dengan surveyor ${p.tenaga_ahli?.jenis || 'sejenis'} lain`}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                              <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
                            </svg>
                            Ganti
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* History Pergantian */}
              {histori.length > 0 && (
                <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: "16px", marginTop: "16px" }}>
                  <div style={{ fontSize: "11px", fontWeight: "600", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
                    Riwayat Pergantian ({histori.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {histori.map(h => (
                      <div
                        key={h.id}
                        style={{
                          padding: "10px 12px", background: "#FFF7ED", borderRadius: "8px",
                          border: "1px solid #FED7AA", fontSize: "12px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          <span style={{ color: "#1E293B", fontWeight: "500" }}>{h.tenaga_ahli_lama?.nama || "—"}</span>
                          <span style={{ color: "#9A3412" }}>→</span>
                          <span style={{ color: "#1E293B", fontWeight: "500" }}>{h.tenaga_ahli_baru?.nama || "—"}</span>
                          {h.tenaga_ahli_lama?.jenis && (
                            <span style={{
                              padding: "1px 6px", borderRadius: "4px",
                              fontSize: "10px", fontWeight: "600",
                              background: h.tenaga_ahli_lama.jenis === "TKPP" ? "#FEF3C7" : "#DBEAFE",
                              color: h.tenaga_ahli_lama.jenis === "TKPP" ? "#92400E" : "#1E40AF",
                            }}>
                              {h.tenaga_ahli_lama.jenis}
                            </span>
                          )}
                        </div>
                        {h.alasan && (
                          <div style={{ fontSize: "11px", color: "#9A3412", marginTop: "4px", fontStyle: "italic" }}>
                            "{h.alasan}"
                          </div>
                        )}
                        <div style={{ fontSize: "10px", color: "#94A3B8", marginTop: "4px" }}>
                          {formatDateTime(h.created_at)} · oleh {h.admin?.nama || "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detailGroup.items.some(p => p.surat_tugas?.path_pdf) && (
                <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: "16px", marginTop: "16px" }}>
                  <div style={{ fontSize: "11px", fontWeight: "600", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                    Surat Tugas
                  </div>
                  {detailGroup.items.filter(p => p.surat_tugas?.path_pdf).map(p => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                      <span style={{ fontSize: "12px", color: "#64748B" }}>{p.tenaga_ahli?.nama}</span>
                      <a
                        href={`/api/penugasan/surat-tugas/${p.surat_tugas.id}/serve`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 10px", background: "#EFF6FF", color: "#2563EB", borderRadius: "6px", fontSize: "12px", fontWeight: "500", textDecoration: "none" }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                        Buka
                      </a>
                      <a
                        href={`/api/penugasan/surat-tugas/${p.surat_tugas.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 10px", background: "#DCFCE7", color: "#166534", borderRadius: "6px", fontSize: "12px", fontWeight: "500", textDecoration: "none" }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Unduh
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ padding: "12px 24px", borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "flex-end" }}>
              <button className="btn btn-secondary" onClick={() => setDetailGroup(null)}>Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PenugasanList;
