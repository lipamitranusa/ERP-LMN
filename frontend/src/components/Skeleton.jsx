import React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, Inbox, Loader2 } from "lucide-react";

export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-slate-200 dark:bg-slate-700",
        className
      )}
      {...props}
    />
  );
}

export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", i === lines - 1 ? "w-3/4" : "w-full")}
        />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="p-3">
              <Skeleton className="h-5 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-3">
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function SkeletonStatCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
  );
}

/** Tabel skeleton dengan jumlah kolom spesifik */
export function SkeletonTableRows({ rows = 5, cols = 4, message = "Memuat..." }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-4 py-2.5">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** Loading state — untuk halaman/page-level */
export function LoadingState({ message = "Memuat...", className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 gap-3", className)}>
      <Loader2 size={24} className="text-slate-300 dark:text-slate-600 dark:text-slate-300 animate-spin" />
      <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">{message}</p>
    </div>
  );
}

/** Empty state — untuk tabel/konten yang tidak ada data */
export function EmptyState({
  title = "Belum ada data",
  description,
  action,
  icon: Icon = Inbox,
  className,
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 gap-2", className)}>
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-1">
        <Icon size={22} className="text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="text-xs text-muted-foreground text-center max-w-xs">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Empty state untuk tabel — pakai colspan */
export function EmptyTableRow({ cols = 5, title = "Belum ada data", description }) {
  return (
    <tr>
      <td colSpan={cols}>
        <EmptyState title={title} description={description} />
      </td>
    </tr>
  );
}

/** Error state — untuk error page-level */
export function ErrorState({
  message = "Terjadi kesalahan",
  detail,
  onRetry,
  className,
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 gap-2", className)}>
      <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950 flex items-center justify-center mb-1">
        <AlertCircle size={22} className="text-red-400 dark:text-red-400" />
      </div>
      <p className="text-sm font-medium text-foreground">{message}</p>
      {detail && <p className="text-xs text-muted-foreground text-center max-w-xs">{detail}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 px-4 py-1.5 text-xs font-medium text-white bg-slate-600 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 rounded-md transition-colors"
        >
          Coba Lagi
        </button>
      )}
    </div>
  );
}
