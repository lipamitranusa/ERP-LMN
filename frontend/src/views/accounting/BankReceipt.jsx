import React from "react";
import KasBankForm from "./KasBankForm";

const CONF = {
  type: "bkm",
  title: "Bank Masuk",
  subtitle: "Bukti Kas Masuk — mencatat penerimaan via transfer / setoran bank.",
  color: { bg: "#F0FDF4", border: "#BBF7D0", badge: "#DCFCE7", badgeText: "#166534", accent: "#16A34A" },
  icon: "🏦",
  jenis: "Bank Masuk",
};

export default function BankReceipt() {
  return <KasBankForm {...CONF} />;
}
