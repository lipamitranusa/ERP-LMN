import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * StatCard — KPI card dengan gaya shadcn.
 *
 * Props:
 *   label        — judul metric
 *   value        — angka utama (string atau number)
 *   trend        — object { value: string (e.g. "+12.5%"), label: string (e.g. "from last month"), dir: "up"|"down"|"neutral" }
 *   subtitle     — teks deskripsi singkat
 *   icon         — Lucide icon component
 *   iconColor    — warna icon
 *   iconBg       — background icon container
 *   className
 */
export function StatCard({ label, value, trend, subtitle, icon, iconColor = "#4CAF50", iconBg = "#E8F5E9", className }) {
  return (
    <Card className={cn(
      "p-3 sm:p-5 flex items-start justify-between gap-3 sm:gap-4",
      "hover:shadow-md transition-shadow duration-200",
      "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 dark:border-slate-700",
      className
    )}>
      <div className="flex-1 min-w-0">
        {/* Label */}
        <p className="text-[9px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5 sm:mb-1 truncate">
          {label}
        </p>

        {/* Value */}
        <p className="text-xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50 leading-none mb-1 sm:mb-2">
          {value}
        </p>

        {/* Trend badge + subtitle row */}
        {(trend || subtitle) && (
          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            {trend && (
              <TrendBadge value={trend.value} dir={trend.dir} label={trend.label} />
            )}
            {subtitle && (
              <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 leading-snug">
                {subtitle}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Icon */}
      {icon && (
        <div
          className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 mt-0.5 p-1.5 sm:p-0"
          style={{ background: iconBg, opacity: 0.95 }}
        >
          <div style={{ color: iconColor }}>{icon}</div>
        </div>
      )}
    </Card>
  );
}

function TrendBadge({ value, dir, label }) {
  const configs = {
    up: {
      bg: "bg-green-50 dark:bg-green-950",
      text: "text-green-700 dark:text-green-300",
      dot: "bg-green-500",
      arrow: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="19" x2="12" y2="5"/>
          <polyline points="5 12 12 5 19 12"/>
        </svg>
      ),
    },
    down: {
      bg: "bg-red-50 dark:bg-red-950",
      text: "text-red-700 dark:text-red-300",
      dot: "bg-red-500",
      arrow: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <polyline points="19 12 12 19 5 12"/>
        </svg>
      ),
    },
    neutral: {
      bg: "bg-slate-100 dark:bg-slate-800",
      text: "text-slate-600 dark:text-slate-300",
      dot: "bg-slate-400",
      arrow: null,
    },
  };

  const cfg = configs[dir] || configs.neutral;

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
      cfg.bg, cfg.text
    )}>
      {cfg.arrow}
      {value && <span>{value}</span>}
      {label && <span className="font-normal opacity-80">{label}</span>}
    </div>
  );
}
