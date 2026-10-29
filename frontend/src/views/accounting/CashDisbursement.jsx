import React from "react";
import KasBankForm from "./KasBankForm";

const CONF = {
  type: "kkk",
  title: "Kas Kecil Keluar",
  subtitle: "Bukti Kas Kecil Keluar — mencatat pengeluaran dari dana kas kecil.",
  color: { bg: "#FFF7F7", border: "#FED7D7", badge: "#FEE2E2", badgeText: "#991B1B", accent: "#DC2626" },
  icon: "💰",
  jenis: "Kas Kecil Keluar",
};

export default function CashDisbursement() {
  return <KasBankForm {...CONF} />;
}
