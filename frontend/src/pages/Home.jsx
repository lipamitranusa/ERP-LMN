export default function Home() {
  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">
        Sistem ERP Akreditasi Faskes
      </h1>
      <p className="text-slate-600 max-w-2xl">
        Skeleton frontend untuk Sistem ERP Akreditasi Fasilitas Pelayanan Kesehatan
        LIPA MITRA NUSA. Halaman ini hanya penanda bahwa Vite, React, dan Tailwind
        berjalan. Modul-modul bisnis (Pendaftaran, Kontrak, Penugasan, Verifikasi,
        Ledger, Pengaturan Hak Akses) akan diimplementasikan pada fase berikutnya
        mengikuti PRD.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'Backend', value: 'Laravel 13', hint: 'REST API di /api' },
          { title: 'Frontend', value: 'React 18 + Vite', hint: 'Port 5173 (dev)' },
          { title: 'Database', value: 'PostgreSQL', hint: 'Supabase (production)' },
        ].map((card) => (
          <div
            key={card.title}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {card.title}
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {card.value}
            </p>
            <p className="mt-1 text-sm text-slate-600">{card.hint}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
