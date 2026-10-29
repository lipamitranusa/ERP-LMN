import React from "react";
import KasBankForm from "./KasBankForm";

const CONF = {
  type: "bkk",
  title: "Bank Keluar",
  subtitle: "Bukti Kas Keluar — mencatat pembayaran via transfer / pengambilan dari bank.",
  color: { bg: "#FFF7F7", border: "#FED7D7", badge: "#FEE2E2", badgeText: "#991B1B", accent: "#DC2626" },
  icon: "🏦",
  jenis: "Bank Keluar",
};

export default function BankDisbursement() {
  return <KasBankForm {...CONF} />;
}
