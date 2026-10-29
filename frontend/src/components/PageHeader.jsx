import React from "react";
import { cn } from "@/lib/utils";

/**
 * PageHeader — reusable page header dengan gaya shadcn.
 * Props:
 *   title     — judul halaman (string)
 *   subtitle  — deskripsi singkat (string, opsional)
 *   icon     — Lucide icon (opsional, tampil di kiri judul)
 *   actions  — React node untuk tombol/aksi di kanan (opsional)
 *   className
 */
export function PageHeader({ title, subtitle, icon, actions, className }) {
  return (
    <div className={cn("flex items-start justify-between mb-6 gap-4", className)}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/10 dark:bg-primary/20">
            <div className="text-primary">{icon}</div>
          </div>
        )}
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50 leading-tight">
            {title}
          </h1>
          {subtitle && (
            <div className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-0.5 leading-snug">
              {subtitle}
            </div>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}
