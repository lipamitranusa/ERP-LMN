import React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const STATUS_MAP = {
  // Success
  lengkap: { label: "Lengkap", variant: "success" },
  aktif: { label: "Aktif", variant: "success" },
  selesai: { label: "Selesai", variant: "success" },
  disetujui: { label: "Disetujui", variant: "success" },
  final: { label: "Final", variant: "success" },
  success: { label: "Berhasil", variant: "success" },
  // Warning
  menunggu: { label: "Menunggu", variant: "warning" },
  menunggu_dokumen: { label: "Menunggu Dokumen", variant: "warning" },
  menunggu_tindakan: { label: "Menunggu Tindakan", variant: "warning" },
  menunggu_persetujuan: { label: "Menunggu Persetujuan", variant: "warning" },
  menunggu_kontrak: { label: "Menunggu Kontrak", variant: "warning" },
  menunggu_pembayaran: { label: "Menunggu Pembayaran", variant: "warning" },
  aktifasi_akun: { label: "Aktifasi Akun", variant: "warning" },
  warning: { label: "Warning", variant: "warning" },
  // Danger
  ditolak: { label: "Ditolak", variant: "danger" },
  dibatalkan: { label: "Dibatalkan", variant: "danger" },
  danger: { label: "Danger", variant: "danger" },
  gagal: { label: "Gagal", variant: "danger" },
  // Info
  terkirim: { label: "Terkirim", variant: "info" },
  info: { label: "Info", variant: "info" },
  survei: { label: "Survei", variant: "info" },
  verifikasi: { label: "Verifikasi", variant: "info" },
  // Secondary
  draft: { label: "Draft", variant: "secondary" },
};

/**
 * Reusable status badge — maps status key to label + badge variant.
 * Usage: <StatusBadge status="menunggu" /> or <StatusBadge status="lengkap" />
 */
export function StatusBadge({ status, className }) {
  const config = STATUS_MAP[status] || { label: status, variant: "secondary" };
  return (
    <Badge variant={config.variant} className={cn("font-medium", className)}>
      {config.label}
    </Badge>
  );
}
