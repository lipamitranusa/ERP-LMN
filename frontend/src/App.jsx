import React, { useEffect } from "react";
import { Route, Switch, Redirect, useLocation } from "react-router-dom";
import AdminLayout from "@/layouts/Admin";
import AuthLayout from "@/layouts/Auth";
import FaskesLayout from "@/layouts/FaskesLayout";
import SurveiorLayout from "@/layouts/SurveiorLayout";
import PenugasanSaya from "@/views/surveior/PenugasanSaya";
import LaporanKendala from "@/views/surveior/LaporanKendala";
import GantiPassword from "@/views/surveior/GantiPassword";
import routes from "@/routes";

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
    .map((prop, key) => (
      <Route
        key={`admin-${key}-${prop.path}`}
        exact={!prop.path.includes(":")}
        path={prop.layout + prop.path}
        component={prop.component}
      />
    ));

  const authRoutes = routes
    .filter(r => r.layout === "/auth")
    .map((prop, key) => (
      <Route
        key={key}
        path={prop.layout + prop.path}
        component={prop.component}
      />
    ));

  const faskesIndexRoute = routes.find(r => r.layout === "/faskes" && r.path === "/");
  const faskesSubRoutesList = routes.filter(r => r.layout === "/faskes" && r.path !== "/");
  const faskesSubRoutes = faskesSubRoutesList.map((prop, key) => (
    <Route
      key={`faskes-${key}-${prop.path}`}
      exact={!prop.path.includes(":")}
      path={prop.layout + prop.path}
      component={prop.component}
    />
  ));

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
            <Route exact path="/faskes" component={faskesIndexRoute?.component} />
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
