import React from "react";

/**
 * Skeleton loading — placeholder animasi saat data sedang dimuat.
 * Menggunakan CSS gradient animation, tidak perlu library tambahan.
 */
export function Skeleton({ width = "100%", height = "16px", style = {}, borderRadius = "6px" }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
        backgroundSize: "200% 100%",
        animation: "skeleton-shimmer 1.5s infinite",
        ...style,
      }}
    />
  );
}

/** Baris skeleton untuk tabel — render <tr>/<td> agar valid di <tbody> */
export function SkeletonTable({ rows = 5, cols = 4, rowHeight = "40px" }) {
  return (
    <>
      <style>{`
        @keyframes skeleton-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} style={{ padding: "10px 16px" }}>
              <div style={{
                height: rowHeight,
                borderRadius: "4px",
                background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
                backgroundSize: "200% 100%",
                animation: "skeleton-shimmer 1.5s infinite",
              }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** Stat card skeleton */
export function SkeletonStatCard() {
  return (
    <div style={{
      padding: "16px",
      background: "#fff",
      borderRadius: "12px",
      border: "1px solid #F1F5F9",
    }}>
      <Skeleton height="12px" width="50%" style={{ marginBottom: "12px" }} />
      <Skeleton height="28px" width="40%" style={{ marginBottom: "12px" }} />
      <Skeleton height="10px" width="70%" />
    </div>
  );
}

/** Stat cards row skeleton (4 cards) */
export function SkeletonStatCards() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
      {Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)}
    </div>
  );
}
