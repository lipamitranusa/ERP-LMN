import React, { useEffect, useRef } from "react";
import { useLocation, useHistory } from "react-router-dom";
import { STAGES } from "@/components/SiklusStepper";

/**
 * Layout autentikasi — split-screen.
 *
 * Panel kiri (gelap) membawa narasi produk: 7 tahap siklus akreditasi.
 * Panel kanan (terang) menampung form. Tidak ada header/footer bar —
 * brandingnya menyatu ke dalam panel kiri.
 *
 * Warna panel memakai nilai eksplisit (bukan token `bg-slate-*`) karena
 * `index.css` memaksa `bg-slate-*` lewat `!important` pada mode gelap.
 */
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
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F8FAFC] dark:bg-[#020617]">
      {/* ─── Panel narasi ───────────────────────────────────────────── */}
      <aside className="relative hidden lg:flex lg:w-[46%] xl:w-[44%] flex-col overflow-y-auto bg-[#1E293B] dark:bg-[#0F172A] px-10 xl:px-14 py-12">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <OrbitMotif />
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center py-6">
          <h1 className="text-3xl xl:text-[34px] font-semibold leading-[1.15] tracking-tight text-white">
            Tujuh tahap,
            <br />
            satu sistem.
          </h1>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-[#94A3B8]">
            Kelola siklus akreditasi fasilitas pelayanan kesehatan — dari
            pendaftaran Faskes sampai pelaporan keuangan.
          </p>

          {/* Rel tahap — elemen signature produk */}
          <ol className="mt-10" aria-label="Tahapan siklus akreditasi">
            {STAGES.map((stage, i) => (
              <li key={stage.id} className="relative flex items-center gap-4 py-1.5">
                {i < STAGES.length - 1 && (
                  <span
                    className="absolute left-[11.5px] top-[30px] bottom-[-6px] w-px bg-[#4CAF50]/45"
                    aria-hidden="true"
                  />
                )}
                <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#4CAF50] bg-[#1E293B] text-[11px] font-semibold text-[#81C784]">
                  {stage.id}
                </span>
                <span className="text-[15px] text-[#CBD5E1]">{stage.label}</span>
              </li>
            ))}
          </ol>
        </div>

        <p className="relative z-10 text-xs text-[#94A3B8]">
          &copy; {new Date().getFullYear()} LIPA MITRA NUSA. Hak cipta dilindungi.
        </p>
      </aside>

      {/* ─── Panel form ─────────────────────────────────────────────── */}
      <main
        ref={mainContent}
        className="flex-1 flex items-center justify-center px-5 py-10 sm:px-8 lg:py-12"
      >
        {children}
      </main>
    </div>
  );
}

/**
 * Motif orbit — diturunkan dari geometri mark LMN (cincin + 5 titik brand).
 * Digunakan sebagai latar metalik, bukan dekorasi bebas.
 */
function OrbitMotif() {
  return (
    <svg
      viewBox="0 0 36 36"
      className="pointer-events-none absolute -bottom-28 -right-24 w-[34rem] h-[34rem] opacity-50 select-none"
      aria-hidden="true"
    >
      <circle cx="18" cy="18" r="15" stroke="#475569" strokeWidth="0.5" fill="none" />
      <path d="M18 11v14M12 18h12" stroke="#475569" strokeWidth="0.5" />
      <circle cx="18" cy="3.5" r="1.7" fill="#7E57C2" />
      <circle cx="29.5" cy="9.5" r="1.7" fill="#EF5350" />
      <circle cx="32" cy="20" r="1.7" fill="#FF9800" />
      <circle cx="26" cy="30" r="1.7" fill="#FFEB3B" />
      <circle cx="10" cy="30" r="1.7" fill="#42A5F5" />
    </svg>
  );
}
