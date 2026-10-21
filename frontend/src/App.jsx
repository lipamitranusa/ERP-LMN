import React, { useEffect, lazy, Suspense } from "react";
import { Route, Switch, Redirect, useLocation } from "react-router-dom";
import AdminLayout from "@/layouts/Admin";
import AuthLayout from "@/layouts/Auth";
import FaskesLayout from "@/layouts/FaskesLayout";
import SurveiorLayout from "@/layouts/SurveiorLayout";
import PenugasanSaya from "@/views/surveior/PenugasanSaya";
import LaporanKendala from "@/views/surveior/LaporanKendala";
import GantiPassword from "@/views/surveior/GantiPassword";
import routes from "@/routes";

// ─── Theme initialization — runs before first render ───────────────────────────
(function initTheme() {
  const saved = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = saved === "dark" || (!saved && prefersDark);
  if (isDark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
})();

// ─── Lazy-loaded component registry ───────────────────────────────────────────
const lazyComponents = {
  Login: lazy(() => import("@/views/auth/Login")),
  Dashboard: lazy(() => import("@/views/admin/Dashboard")),
  SiklusList: lazy(() => import("@/views/admin/SiklusList")),
  SiklusDetail: lazy(() => import("@/views/admin/SiklusDetail")),
  PenugasanList: lazy(() => import("@/views/admin/PenugasanList")),
  MasterBiayaTA: lazy(() => import("@/views/admin/MasterBiayaTA")),
  Roles: lazy(() => import("@/views/admin/Roles")),
  Privileges: lazy(() => import("@/views/admin/Privileges")),
  AuditTrail: lazy(() => import("@/views/admin/AuditTrail")),
  KontrakInvoicing: lazy(() => import("@/views/admin/KontrakInvoicing")),
  VerifikasiPembayaran: lazy(() => import("@/views/admin/VerifikasiPembayaran")),
  PiutangDashboard: lazy(() => import("@/views/admin/PiutangDashboard")),
  PiutangDetail: lazy(() => import("@/views/admin/PiutangDetail")),
  FaskesDashboard: lazy(() => import("@/views/faskes/Dashboard")),
  FaskesKontrak: lazy(() => import("@/views/faskes/Kontrak")),
  FaskesTagihan: lazy(() => import("@/views/faskes/Tagihan")),
  FaskesTagihanDetail: lazy(() => import("@/views/faskes/TagihanDetail")),
  FaskesDokumen: lazy(() => import("@/views/faskes/Dokumen")),
  FaskesChangePassword: lazy(() => import("@/views/faskes/ChangePassword")),
  RefundApproval: lazy(() => import("@/views/keuangan/RefundApproval")),
  LedgerJournal: lazy(() => import("@/views/keuangan/LedgerJournal")),
  SlipHonorarium: lazy(() => import("@/views/keuangan/SlipHonorarium")),
  ApHonorDashboard: lazy(() => import("@/views/admin/ApHonorDashboard")),
  ApHonorList: lazy(() => import("@/views/admin/ApHonorList")),
  ApHonorBayar: lazy(() => import("@/views/admin/ApHonorBayar")),
  ApHonorHistory: lazy(() => import("@/views/admin/ApHonorHistory")),
  ApHonorPaymentDetail: lazy(() => import("@/views/admin/ApHonorPaymentDetail")),
  HutangPajakList: lazy(() => import("@/views/admin/HutangPajakList")),
  HutangPajakDetail: lazy(() => import("@/views/admin/HutangPajakDetail")),
  RekonsiliasiDashboard: lazy(() => import("@/views/keuangan/RekonsiliasiDashboard")),
  BuktiPotong: lazy(() => import("@/views/keuangan/BuktiPotong")),
  KonfigurasiPajak: lazy(() => import("@/views/keuangan/KonfigurasiPajak")),
  AccountingDashboard: lazy(() => import("@/views/accounting/Dashboard")),
  AccountingCoa: lazy(() => import("@/views/accounting/CoaList")),
  AccountingKategori: lazy(() => import("@/views/accounting/KategoriJurnal")),
  AccountingJurnal: lazy(() => import("@/views/accounting/JurnalUmum")),
  AccountingBukuBesar: lazy(() => import("@/views/accounting/BukuBesar")),
  BankReceipt: lazy(() => import("@/views/accounting/BankReceipt")),
  BankDisbursement: lazy(() => import("@/views/accounting/BankDisbursement")),
  CashReceipt: lazy(() => import("@/views/accounting/CashReceipt")),
  CashDisbursement: lazy(() => import("@/views/accounting/CashDisbursement")),
  SettlementList: lazy(() => import("@/views/accounting/SettlementList")),
  MasterLembaga: lazy(() => import("@/views/admin/MasterLembaga")),
  MasterJenisFaskes: lazy(() => import("@/views/admin/MasterJenisFaskes")),
  MasterFaskes: lazy(() => import("@/views/admin/MasterFaskes")),
  UserManagement: lazy(() => import("@/views/admin/UserManagement")),
  PksTemplateSettings: lazy(() => import("@/views/admin/PksTemplateSettings")),
  MasterTenagaAhli: lazy(() => import("@/views/admin/MasterTenagaAhli")),
  MasterBiaya: lazy(() => import("@/views/admin/MasterBiaya")),
  PengaturanPembayaran: lazy(() => import("@/views/admin/PengaturanPembayaran")),
  PengaturanMail: lazy(() => import("@/views/admin/PengaturanMail")),
  PengaturanWhatsApp: lazy(() => import("@/views/admin/PengaturanWhatsApp")),
  ProfilePage: lazy(() => import("@/views/admin/ProfilePage")),
  RekomendasiWorkspace: lazy(() => import("@/views/rekomendator/RekomendasiWorkspace")),
  RekomendasiSettings: lazy(() => import("@/views/rekomendator/RekomendasiSettings")),
};

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Memuat...</p>
      </div>
    </div>
  );
}

function App() {
  const location = useLocation();

  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.scrollingElement && (document.scrollingElement.scrollTop = 0);
  }, [location]);

  // Root redirect: berdasarkan role — hanya di Effect agar tidak re-render loop
  useEffect(() => {
    if (location.pathname !== "/") return;
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.replace("/auth/login");
      return;
    }
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user.role === "Faskes") {
      window.location.replace("/faskes/");
    } else if (user.role === "Surveior") {
      window.location.replace("/surveior/penugasan");
    } else if (user.role === "Verifikator") {
      window.location.replace("/surveior/penugasan");
    } else if (user.role === "Directeur/Keuangan") {
      window.location.replace("/admin/piutang");
    } else {
      window.location.replace("/admin/dashboard");
    }
  }, [location]);

  const flattenLayout = (layoutKey) => {
    const out = [];
    for (const entry of routes) {
      if (entry.group) {
        for (const r of (entry.items || [])) {
          if (r.layout === layoutKey) out.push(r);
        }
      } else if (entry.layout === layoutKey) {
        out.push(entry);
      }
    }
    return out;
  };

  const adminRoutes = flattenLayout("/admin")
    .map((prop, key) => {
      const LazyComponent = lazyComponents[prop.componentName];
      return (
        <Route
          key={`admin-${key}-${prop.path}`}
          exact={!prop.path.includes(":")}
          path={prop.layout + prop.path}
        >
          <Suspense fallback={<PageLoader />}>
            <LazyComponent />
          </Suspense>
        </Route>
      );
    });

  const authRoutes = routes
    .filter(r => r.layout === "/auth")
    .map((prop, key) => {
      const LazyComponent = lazyComponents[prop.componentName];
      return (
        <Route key={key} path={prop.layout + prop.path}>
          <Suspense fallback={<PageLoader />}>
            <LazyComponent />
          </Suspense>
        </Route>
      );
    });

  const faskesIndexRoute = routes.find(r => r.layout === "/faskes" && r.path === "/");
  const faskesSubRoutesList = routes.filter(r => r.layout === "/faskes" && r.path !== "/");
  const FaskesIndexComponent = faskesIndexRoute ? lazyComponents[faskesIndexRoute.componentName] : null;
  const faskesSubRoutes = faskesSubRoutesList.map((prop, key) => {
    const LazyComponent = lazyComponents[prop.componentName];
    return (
      <Route
        key={`faskes-${key}-${prop.path}`}
        exact={!prop.path.includes(":")}
        path={prop.layout + prop.path}
      >
        <Suspense fallback={<PageLoader />}>
          <LazyComponent />
        </Suspense>
      </Route>
    );
  });

  return (
    <Switch>
      {/* Root: redirect to role-appropriate home — handled by useEffect above */}
      <Route exact path="/" render={() => null} />

      {/* Auth pages wrapped in AuthLayout */}
      <Route path="/auth">
        <AuthLayout>{authRoutes}</AuthLayout>
      </Route>

      {/* Faskes portal */}
      <Route path="/faskes" render={() => (
        <FaskesLayout>
          <Switch>
            <Route exact path="/faskes">
              <Suspense fallback={<PageLoader />}>
                {FaskesIndexComponent && <FaskesIndexComponent />}
              </Suspense>
            </Route>
            {faskesSubRoutes}
            <Route render={() => <Redirect to="/faskes" />} />
          </Switch>
        </FaskesLayout>
      )} />

      {/* Surveior portal */}
      <Route path="/surveior" render={() => (
        <SurveiorLayout>
          <Switch>
            <Route exact path="/surveior" render={() => <Redirect to="/surveior/penugasan" />} />
            <Route exact path="/surveior/penugasan" component={PenugasanSaya} />
            <Route exact path="/surveior/kendala" component={LaporanKendala} />
            <Route exact path="/surveior/ganti-password" component={GantiPassword} />
            <Route render={() => <Redirect to="/surveior/penugasan" />} />
          </Switch>
        </SurveiorLayout>
      )} />

      {/* Admin pages wrapped in AdminLayout */}
      <Route path="/admin">
        <AdminLayout>{adminRoutes}</AdminLayout>
      </Route>

      {/* Fallback */}
      <Route render={() => <Redirect to="/" />} />
    </Switch>
  );
}

export default App;
