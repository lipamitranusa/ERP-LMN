import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useApi, useMutate } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(15,23,42,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: "12px", width: "100%", maxWidth: "520px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#1E293B" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#94A3B8" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function RekomendasiSettings() {
  const { menuActions } = useAuth();
  const canEdit = menuActions?.some(a => a.modul === "Rekomendasi" && a.action === "Ubah");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [editOpen, setEditOpen] = useState(false);
  const [editSelected, setEditSelected] = useState("");
  const [message, setMessage] = useState("");

  const isRekomendator = user?.role === "Rekomendator";

  const { data: defaultData, isLoading } = useApi("rekomendator-default", "/rekomendator/default");
  const { data: candidatesData } = useApi("rekomendator-candidates", "/rekomendator/candidates");

  const current = defaultData?.data || null;
  const candidates = Array.isArray(candidatesData?.data) ? candidatesData.data : [];
  const lemmaAktif = candidatesData?.lembaga || null;

  const setDefaultMutate = useMutate({
    onSuccess: (d) => {
      setMessage(d?.message || "Berhasil disetel.");
    },
    onError: (err) => {
      alert(err.message);
    },
  });

  const setEditMutate = useMutate({
    onSuccess: (d) => {
      setEditOpen(false);
      setMessage(d?.message || "Berhasil disetel.");
    },
    onError: (err) => {
      alert(err.message);
    },
  });

  function openEdit() {
    setEditSelected(current?.user_id || "");
    setEditOpen(true);
  }

  function handleSetAsDefault() {
    if (!confirm(`Setel diri Anda (${user.nama}) sebagai default rekomendator?`)) return;
    setDefaultMutate.mutate({
      path: "/rekomendator/default",
      method: "PUT",
      body: { user_id: user.id },
    });
  }

  function submitEdit() {
    if (!editSelected) {
      alert("Pilih salah satu rekomendator terlebih dahulu.");
      return;
    }
    const target = candidates.find(c => c.user_id === editSelected);
    if (!target) {
      alert("Rekomendator tidak ditemukan di daftar.");
      return;
    }
    if (!confirm(`Setel default rekomendator ke ${target.nama}?`)) return;
    setEditMutate.mutate({
      path: "/rekomendator/default",
      method: "PUT",
      body: { user_id: editSelected },
    });
  }

  return (
    <div style={{ maxWidth: "720px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "600", color: "#1E293B" }}>
          Pengaturan Rekomendator
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
          Tunjuk satu pengguna dengan role Rekomendator yang akan menerima hasil verifikasi
          untuk disetujui atau ditolak. Setelah verifikator finalize, laporan otomatis
          muncul di menu Rekomendasi untuk pengguna ini.
        </p>
      </div>

      {message && (
        <div style={{ background: "#DCFCE7", color: "#166534", padding: "10px 14px", borderRadius: "6px", marginBottom: "12px", fontSize: "13px" }}>
          {message}
        </div>
      )}

      <div className="card" style={{ padding: "20px" }}>
        {isLoading ? (
          <div style={{ padding: "20px", textAlign: "center", color: "#94A3B8" }}>Memuat...</div>
        ) : (
          <>
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "11px", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, marginBottom: "6px" }}>
                Default Rekomendator Saat Ini
              </div>
              {current ? (
                <div style={{ padding: "12px 14px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "8px" }}>
                  <div style={{ fontSize: "15px", fontWeight: "600", color: "#166534" }}>{current.nama}</div>
                  <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>{current.email}</div>
                  <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>
                    Role: {current.role} {current.tenaga_ahli && `· TA: ${current.tenaga_ahli.nomor_induk_surveior}`}
                  </div>
                  {current.tenaga_ahli?.no_rekening && (
                    <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>
                      Rekening: {current.tenaga_ahli.no_rekening} ({current.tenaga_ahli.nama_bank}) — {current.tenaga_ahli.atas_nama_rekening}
                    </div>
                  )}
                  {current && !current.tenaga_ahli?.no_rekening && (
                    <div style={{ fontSize: "11px", color: "#B45309", marginTop: "4px" }}>
                      Belum ada data rekening. Tautkan akun ini ke tenaga ahli di{" "}
                      <strong>Manajemen Akun</strong> agar honor reksa membawa rekening saat pembayaran AP.
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: "14px", background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: "8px", color: "#92400E", fontSize: "13px" }}>
                  Belum ada default rekomendator
                  {lembagaAktif ? ` untuk ${lembagaAktif.nama}` : ""}. Klik tombol "Edit" untuk memilih.
                </div>
              )}
            </div>

            {canEdit ? (
              <div>
                <div style={{ padding: "12px 14px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: "8px", marginBottom: "16px", fontSize: "12px", color: "#1E40AF" }}>
                  Anda login sebagai <strong>{user.nama}</strong>
                  {user.role && ` (${user.role})`}.
                  {isRekomendator && current?.user_id === user.id && " Anda sudah menjadi default rekomendator."}
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <Button variant="outline" onClick={openEdit} disabled={setDefaultMutate.isPending}>
                    Edit
                  </Button>
                  {isRekomendator && (
                    <Button onClick={handleSetAsDefault} disabled={setDefaultMutate.isPending}>
                      {setDefaultMutate.isPending ? "Menyetel..." : "Jadikan Saya Default"}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ padding: "12px 14px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "12px", color: "#475569" }}>
                Anda login sebagai <strong>{user.role || "—"}</strong>. Anda tidak memiliki
                privilege <strong>Rekomendasi, Ubah</strong> untuk menyetel default rekomendator.
                Hubungi administrator jika perlu mengubah.
              </div>
            )}

            {candidates.length > 0 && (
              <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #F1F5F9" }}>
                <div style={{ fontSize: "11px", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, marginBottom: "8px" }}>
                  Daftar Kandidat Rekomendator ({candidates.length})
                </div>
                <div style={{ border: "1px solid #E2E8F0", borderRadius: "6px", overflow: "hidden" }}>
                  <table className="data-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ fontSize: "11px" }}>Nama</th>
                        <th style={{ fontSize: "11px" }}>Email</th>
                        <th style={{ fontSize: "11px" }}>No. Induk</th>
                        <th style={{ fontSize: "11px" }}>Rekening (AP)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidates.map(c => (
                        <tr key={c.user_id} style={c.user_id === current?.user_id ? { background: "#F0FDF4" } : undefined}>
                          <td style={{ fontSize: "12px", fontWeight: 500 }}>
                            {c.nama}
                            {c.user_id === current?.user_id && (
                              <span style={{ marginLeft: "6px", padding: "1px 6px", background: "#16A34A", color: "#fff", borderRadius: "9999px", fontSize: "10px", fontWeight: 600 }}>DEFAULT</span>
                            )}
                          </td>
                          <td style={{ fontSize: "12px", color: "#475569" }}>{c.email}</td>
                          <td style={{ fontSize: "12px", color: "#64748B", fontFamily: "monospace" }}>{c.tenaga_ahli?.nomor_induk_surveior || "—"}</td>
                          <td style={{ fontSize: "12px", color: "#64748B" }}>
                            {c.tenaga_ahli?.no_rekening
                              ? `${c.tenaga_ahli.no_rekening} (${c.tenaga_ahli.nama_bank || "—"})`
                              : <span style={{ color: "#B45309" }}>belum ada — tautkan ke tenaga ahli</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {editOpen && (
        <Modal title="Edit Default Rekomendator" onClose={() => !setEditMutate.isPending && setEditOpen(false)}>
          <div style={{ padding: "20px 24px" }}>
            <p style={{ margin: "0 0 12px", fontSize: "13px", color: "#475569" }}>
              Pilih pengguna dengan role Rekomendator yang akan menerima hasil verifikasi.
              Hanya satu rekomendator yang aktif pada satu waktu.
              {lembagaAktif && (
                <> Kandidat diambil dari lembaga aktif <strong>{lembagaAktif.nama}</strong>.</>
              )}
            </p>
            <label className="form-label">Rekomendator *</label>
            <select
              className="form-input"
              value={editSelected}
              onChange={e => setEditSelected(e.target.value)}
            >
              <option value="">— Pilih rekomendator —</option>
              {candidates.map(c => (
                <option key={c.user_id} value={c.user_id}>
                  {c.nama} — {c.email}
                  {c.tenaga_ahli?.nomor_induk_surveior ? ` (${c.tenaga_ahli.nomor_induk_surveior})` : ""}
                </option>
              ))}
            </select>
            <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "6px" }}>
              {candidates.length > 0 ? (
                <>
                  {candidates.length} kandidat tersedia. Hanya menampilkan user dengan role Rekomendator dan status aktif.
                </>
              ) : (
                <div style={{
                  marginTop: "10px", padding: "12px 14px", background: "#FEF3C7",
                  border: "1px solid #FDE68A", borderRadius: "8px", color: "#92400E",
                  fontSize: "12px", lineHeight: "1.5",
                }}>
                  Belum ada akun dengan role <strong>Rekomendator</strong> di lembaga
                  {lembagaAktif ? ` ${lembagaAktif.nama}` : " aktif"}.
                  <br />
                  Buat di <strong>Master Data — Tenaga Ahli</strong> (peran <strong>Reksa</strong>,
                  lengkapi rekening, lalu buat akun login), atau di <strong>Manajemen Akun</strong>
                  (pilih role Rekomendator dan centang lembaga ini).
                </div>
              )}
            </div>
          </div>
          <div style={{ padding: "12px 24px", borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={setEditMutate.isPending}>
              Batal
            </Button>
            <Button onClick={submitEdit} disabled={setEditMutate.isPending || !editSelected}>
              {setEditMutate.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
