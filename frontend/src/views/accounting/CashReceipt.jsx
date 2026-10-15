import React from "react";
import KasBankForm from "./KasBankForm";

const CONF = {
  type: "kkm",
  title: "Kas Kecil Masuk (KKM)",
  subtitle: "Bukti Kas Kecil Masuk — mencatat pengisian kembali dana kas kecil.",
  color: { bg: "#F0FDF4", border: "#BBF7D0", badge: "#DCFCE7", badgeText: "#166534", accent: "#16A34A" },
  icon: "💰",
  jenis: "Kas Kecil Masuk",
};

export default function CashReceipt() {
  return <KasBankForm {...CONF} />;
}
