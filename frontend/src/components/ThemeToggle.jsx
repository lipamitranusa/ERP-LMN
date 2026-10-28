import React from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";

/**
 * Tombol pengalih light/dark mode yang sama untuk semua portal.
 * Styling mengikuti header admin (variant outline) agar konsisten.
 */
export function ThemeToggle({ className = "" }) {
  const { isDark, toggleTheme } = useTheme();
  return (
    <Button
      variant="outline"
      size="sm"
      className={`h-8 w-8 p-0 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 ${className}`}
      onClick={toggleTheme}
      title={isDark ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
      aria-label={isDark ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
    >
      {isDark ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-slate-500" />}
    </Button>
  );
}