import React, { useEffect, useRef } from "react";
import { useLocation, useHistory } from "react-router-dom";
import { LMNIcon } from "@/components/LMNIcon";

export default function AuthLayout({ children }) {
  const mainContent = useRef(null);
  const location = useLocation();
  const history = useHistory();

  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.scrollingElement && (document.scrollingElement.scrollTop = 0);
    if (mainContent.current) mainContent.current.scrollTop = 0;

    const token = localStorage.getItem("token");
    if (token && location.pathname === "/auth/login") {
      history.replace("/admin/dashboard");
    }
  }, [location, history]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-950">
      <div ref={mainContent} className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-4">
          <div className="flex items-center gap-3">
            <LMNIcon size={32} />
            <div>
              <div className="text-slate-900 dark:text-slate-50 font-bold text-sm leading-tight tracking-tight">
                LIPA MITRA NUSA
              </div>
              <div className="text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 text-[11px] font-medium uppercase tracking-widest">
                Sistem ERP Akreditasi Faskes
              </div>
            </div>
          </div>
        </header>

        {/* Page content — centered */}
        <div className="flex-1 flex items-center justify-center p-5">
          {children}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-8 py-4 text-center">
        <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">
          &copy; {new Date().getFullYear()} LIPA MITRA NUSA. Hak cipta dilindungi.
        </span>
      </footer>
    </div>
  );
}
