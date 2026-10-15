import React from "react";

const STAGES = [
  { id: 1, label: "Pendaftaran" },
  { id: 2, label: "Validasi" },
  { id: 3, label: "Kontrak" },
  { id: 4, label: "Pembayaran" },
  { id: 5, label: "Survei", hasSub: true },
  { id: 6, label: "Verifikasi" },
  { id: 7, label: "Selesai" },
];

const SUB_STAGES = [
  { id: 1, label: "Menunggu Surat Tugas" },
  { id: 2, label: "Survei Dijadwalkan" },
  { id: 3, label: "Survei Sedang Berlangsung" },
  { id: 4, label: "Laporan FA Dikirim" },
];

function getStageState(currentStage, stageId) {
  const cur = typeof currentStage === "number" ? currentStage : parseInt(currentStage, 10);
  if (currentStage === "ditolak" || currentStage === "dibatalkan") return "rejected";
  if (cur > stageId) return "completed";
  if (cur === stageId) return "active";
  return "pending";
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" width="14" height="14" style={{ flexShrink: 0 }}>
      <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function SubArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" width="12" height="12" style={{ flexShrink: 0 }}>
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export { STAGES, SUB_STAGES };

export default function SiklusStepper({
  currentStage = 1,
  stageStatus = "ditolak",
  subStage = 0,
  size = "md",
  showLabels = true,
  compact = false,
  surveiDone = false,
  invoiceBelumLunas = false,
}) {
  const cur = typeof currentStage === "number" ? currentStage : parseInt(currentStage, 10);
  const stateMap = (id) => {
    // Tahap 5 (Survei): hijau jika survei selesai
    if (id === 5 && surveiDone) return "completed";
    // Tahap 7 (Selesai): hijau jika siklus selesai
    if (id === 7 && (cur >= 7 || stageStatus === "selesai")) return "completed";
    return getStageState(cur, id);
  };

  // Tahap 4 (Pembayaran): kuning jika survei selesai tapi invoice belum lunas
  const isPembayaranBermasalah = cur >= 4 && invoiceBelumLunas && surveiDone;
  const isRejected = stageStatus === "ditolak" || stageStatus === "dibatalkan";
  const isCompleted = cur >= 7 || stageStatus === "selesai";

  if (compact) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
        {STAGES.map((s, i) => {
          const state = stateMap(s.id);
          const isLast = i === STAGES.length - 1;
          const color = state === "completed" ? "#4CAF50" : state === "active" ? "#4CAF50" : state === "rejected" ? "#DC2626" : "#CBD5E1";
          return (
            <React.Fragment key={s.id}>
              <span style={{
                fontSize: "11px",
                fontWeight: state === "active" ? "600" : "400",
                color: state === "active" ? "#4CAF50" : state === "rejected" ? "#DC2626" : "#94A3B8",
              }}>
                {s.label}
              </span>
              {!isLast && (
                <svg viewBox="0 0 12 12" fill="none" width="12" height="12" style={{ color: "#CBD5E1", flexShrink: 0 }}>
                  <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  const dotSize = size === "sm" ? 28 : size === "lg" ? 44 : 36;
  const lineH = size === "sm" ? 2 : 3;
  const fontSize = size === "sm" ? "10px" : size === "lg" ? "13px" : "12px";
  const iconPad = size === "sm" ? 5 : size === "lg" ? 10 : 7;

  return (
    <div>
      <div style={{
        display: "flex",
        alignItems: "flex-start",
        position: "relative",
        overflowX: "auto",
        paddingBottom: "4px",
      }}>
        {STAGES.map((stage, i) => {
          const state = stateMap(stage.id);
          const isLast = i === STAGES.length - 1;
          const isActive = state === "active";
          const isDone = state === "completed";
          const isReject = state === "rejected";

          // Tahap 4: kuning warning jika survei selesai tapi invoice belum lunas
          const isWarning = stage.id === 4 && isPembayaranBermasalah;

          let dotBg, dotColor, lineColor, labelColor;
          if (isWarning) {
            dotBg = "#FEF3C7"; dotColor = "#D97706"; lineColor = "#D97706"; labelColor = "#D97706";
          } else if (isDone) {
            dotBg = "#4CAF50"; dotColor = "#fff"; lineColor = "#4CAF50"; labelColor = "#64748B";
          } else if (isReject) {
            dotBg = "#DC2626"; dotColor = "#fff"; lineColor = "#DC2626"; labelColor = "#DC2626";
          } else if (isActive) {
            dotBg = "#fff"; dotColor = "#4CAF50"; lineColor = "#CBD5E1"; labelColor = "#1E293B";
          } else {
            dotBg = "#fff"; dotColor = "#CBD5E1"; lineColor = "#CBD5E1"; labelColor = "#94A3B8";
          }

          return (
            <React.Fragment key={stage.id}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                <div style={{
                  width: dotSize, height: dotSize,
                  borderRadius: "50%",
                  background: dotBg,
                  border: `2px solid ${dotColor}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: dotColor,
                  fontSize: fontSize, fontWeight: "600",
                  transition: "all 0.2s ease",
                  zIndex: 1,
                  flexShrink: 0,
                }}>
                  {isWarning ? (
                    <svg viewBox="0 0 24 24" width={Math.round(dotSize * 0.52)} height={Math.round(dotSize * 0.52)}>
                      <path d="M12 3L21.5 20H2.5L12 3Z" fill="#FEF3C7" stroke="#D97706" strokeWidth="1.5" strokeLinejoin="round"/>
                      <line x1="12" y1="10" x2="12" y2="15" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round"/>
                      <circle cx="12" cy="18" r="1.5" fill="#D97706"/>
                    </svg>
                  ) : isDone ? (
                    <CheckIcon />
                  ) : isReject ? (
                    <svg viewBox="0 0 16 16" fill="none" width={iconPad} height={iconPad}>
                      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    <span style={{ color: dotColor, fontWeight: "600" }}>{stage.id}</span>
                  )}
                </div>
                {showLabels && (
                  <div style={{
                    marginTop: "8px",
                    fontSize: fontSize,
                    fontWeight: isActive ? "600" : "500",
                    color: labelColor,
                    textAlign: "center",
                    maxWidth: `${dotSize + 20}px`,
                    lineHeight: "1.3",
                  }}>
                    {stage.label}
                    {stage.hasSub && isActive && subStage > 0 && (
                      <div style={{
                        marginTop: "4px",
                        fontSize: size === "sm" ? "9px" : "10px",
                        color: "#64748B",
                        fontWeight: "400",
                      }}>
                        {SUB_STAGES[subStage - 1]?.label || ""}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {!isLast && (
                <div style={{
                  flex: 1,
                  minWidth: size === "sm" ? "16px" : "32px",
                  height: `${dotSize}px`,
                  display: "flex",
                  alignItems: "center",
                  position: "relative",
                  top: `${dotSize / 2}px`,
                  marginTop: `-${dotSize / 2}px`,
                  zIndex: 0,
                  padding: "0 2px",
                }}>
                  <div style={{
                    height: lineH,
                    borderRadius: lineH / 2,
                    background: isDone ? "#4CAF50" : isReject ? "#DC2626" : "#E2E8F0",
                    flex: 1,
                  }} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {(cur === 5 || surveiDone) && showLabels && !compact && (
        <div style={{
          marginTop: "16px",
          padding: "12px 16px",
          background: "#F8FAFC",
          borderRadius: "6px",
          border: "1px solid #E2E8F0",
        }}>
          <div style={{ fontSize: "11px", fontWeight: "600", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
            Tahapan survei
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0", flexWrap: "wrap" }}>
            {SUB_STAGES.map((s, i) => {
              const isSubDone = subStage > s.id || (surveiDone && s.id >= 1);
              const isSubActive = !surveiDone && subStage === s.id;
              const isLast = i === SUB_STAGES.length - 1;

              let dotBg, dotColor, labelColor;
              if (isSubDone) { dotBg = "#4CAF50"; dotColor = "#fff"; labelColor = "#64748B"; }
              else if (isSubActive) { dotBg = "#fff"; dotColor = "#4CAF50"; labelColor = "#1E293B"; }
              else { dotBg = "#fff"; dotColor = "#CBD5E1"; labelColor = "#94A3B8"; }

              return (
                <React.Fragment key={s.id}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{
                      width: "20px", height: "20px",
                      borderRadius: "50%",
                      background: dotBg,
                      border: `1.5px solid ${dotColor}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: dotColor,
                      flexShrink: 0,
                    }}>
                      {isSubDone ? (
                        <svg viewBox="0 0 16 16" fill="none" width="10" height="10">
                          <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <span style={{ fontSize: "9px", color: dotColor, fontWeight: "600" }}>{s.id}</span>
                      )}
                    </div>
                    <span style={{
                      fontSize: "11px",
                      fontWeight: isSubActive ? "600" : "400",
                      color: labelColor,
                      whiteSpace: "nowrap",
                    }}>
                      {s.label}
                    </span>
                  </div>
                  {!isLast && (
                    <div style={{
                      width: "24px", height: "1px",
                      background: isSubDone ? "#4CAF50" : "#E2E8F0",
                      margin: "0 8px",
                      flexShrink: 0,
                    }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "12px", paddingTop: "10px", borderTop: "1px solid #E2E8F0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                <path d="M3 8l3.5 3.5L13 5" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontSize: "10px", color: "#64748B" }}>Proses selesai</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <svg viewBox="0 0 24 24" width="14" height="14">
                <path d="M12 3L21.5 20H2.5L12 3Z" fill="#FEF3C7" stroke="#D97706" strokeWidth="1.5" strokeLinejoin="round"/>
                <line x1="12" y1="10" x2="12" y2="15" stroke="#D97706" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="18" r="1" fill="#D97706"/>
              </svg>
              <span style={{ fontSize: "10px", color: "#64748B" }}>Menunggu proses</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                <path d="M4 4l8 8M12 4l-8 8" stroke="#DC2626" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span style={{ fontSize: "10px", color: "#64748B" }}>Ditolak</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
