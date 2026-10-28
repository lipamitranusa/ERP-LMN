import { fetchFile, saveBlob } from "@/lib/api";

/**
 * Master jenis dokumen permohonan — dipakai bersama oleh halaman Unggah
 * Dokumen dan Histori Pengajuan agar label konsisten di seluruh portal.
 */
export const JENIS_DOKUMEN = [
  { key: "dfo",              label: "Screenshot DFO",             desc: "Screenshot Daftar Tilik Fasilitas (DFO) yang sudah diisi",         icon: "clipboard",  wajib: true  },
  { key: "surat_permohonan", label: "Surat Permohonan Survei",    desc: "Surat resmi dari Faskes yang mengajukan permohonan survei",       icon: "mail",       wajib: true  },
  { key: "self_assessment",  label: "Self Assessment",            desc: "Hasil penilaian mandiri oleh Faskes terhadap standar akreditasi", icon: "checklist",  wajib: true  },
  { key: "sisdmk",           label: "Sisdmk / SISDMK",             desc: "Sistem Informasi SDM Kesehatan",                                 icon: "users",      wajib: false },
  { key: "aspak",            label: "ASPak",                      desc: "Aksi Cepat Pasien Keselamatan Pasien",                            icon: "shield",     wajib: false },
  { key: "inm",              label: "INM",                        desc: "Indikator Nasional Mutu",                                        icon: "chart",     wajib: false },
  { key: "ikp",              label: "IKP",                        desc: "Indikator Kinerja Prioritas",                                    icon: "target",    wajib: false },
];

const JENIS_MAP = JENIS_DOKUMEN.reduce((acc, d) => ({ ...acc, [d.key]: d }), {});

export function jenisDokumenLabel(key) {
  return JENIS_MAP[key]?.label || key || "—";
}

export function formatSize(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Unduh dokumen. Endpoint dilindungi auth:sanctum, jadi file diambil
 * sebagai blob dengan Authorization header — bukan lewat <a href> yang
 * akan berakhir 401.
 */
export async function downloadDokumen(dokumen) {
  const blob = await fetchFile(`/pendaftaran/dokumen/${dokumen.id}/download`);
  saveBlob(blob, dokumen.nama_file_asli || "dokumen");
}
