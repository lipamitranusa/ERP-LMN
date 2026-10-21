import React from "react";

export function LMNIcon({ size = 32, className = "" }) {
  return (
    <svg
      viewBox="0 0 36 36"
      width={size}
      height={size}
      fill="none"
      className={className}
    >
      <circle cx="18" cy="18" r="15" stroke="#4CAF50" strokeWidth="3" strokeDasharray="22 73" strokeDashoffset="0" strokeLinecap="round"/>
      <path d="M18 11v14M12 18h12" stroke="#4CAF50" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="18" cy="3.5" r="2" fill="#7E57C2"/>
      <circle cx="29.5" cy="9.5" r="2" fill="#EF5350"/>
      <circle cx="32" cy="20" r="2" fill="#FF9800"/>
      <circle cx="26" cy="30" r="2" fill="#FFEB3B"/>
      <circle cx="10" cy="30" r="2" fill="#42A5F5"/>
    </svg>
  );
}
