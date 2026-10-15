import React from "react";

const METHOD_LABELS = {
  virtual_account: "Virtual Account",
  qris: "QRIS",
  transfer_manual: "Transfer Manual",
};

const METHOD_ICONS = {
  virtual_account: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <rect x="2" y="6" width="20" height="13" rx="2"/>
      <path d="M2 11h20"/>
      <path d="M7 16h3"/>
    </svg>
  ),
  qris: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <rect x="3" y="3" width="7" height="7"/>
      <rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/>
      <path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 18h2v2h-2z"/>
    </svg>
  ),
  transfer_manual: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <path d="M14 2v6h6M9 13h6M9 17h6"/>
    </svg>
  ),
};

export default function PaymentMethodSelector({ value, onChange, disabled }) {
  const options = [
    { value: "virtual_account", desc: "Bayar via VA di bank mana saja" },
    { value: "qris", desc: "Scan QR dari aplikasi e-wallet / m-banking" },
    { value: "transfer_manual", desc: "Transfer bank lalu upload bukti" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
      {options.map(opt => {
        const active = value === opt.value;
        return (
          <button
            type="button"
            key={opt.value}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            style={{
              padding: "16px",
              background: active ? "#E8F5E9" : "#FFFFFF",
              border: `1.5px solid ${active ? "#4CAF50" : "#E2E8F0"}`,
              borderRadius: "8px",
              cursor: disabled ? "not-allowed" : "pointer",
              textAlign: "left",
              transition: "all 0.15s ease",
              opacity: disabled ? 0.6 : 1,
              fontFamily: "inherit",
            }}
          >
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: "6px",
            }}>
              <span style={{ color: active ? "#2E7D32" : "#64748B" }}>{METHOD_ICONS[opt.value]}</span>
              {active && (
                <svg viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2" width="16" height="16">
                  <path d="M5 12l5 5L20 7"/>
                </svg>
              )}
            </div>
            <div style={{
              fontSize: "13px", fontWeight: "600",
              color: active ? "#1B5E20" : "#1E293B",
              marginBottom: "2px",
            }}>
              {METHOD_LABELS[opt.value]}
            </div>
            <div style={{ fontSize: "11px", color: "#64748B", lineHeight: "1.4" }}>
              {opt.desc}
            </div>
          </button>
        );
      })}
    </div>
  );
}
