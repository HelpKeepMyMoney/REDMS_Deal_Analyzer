import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider, useAuth } from "./contexts/AuthContext.jsx";
import { TierProvider, useTier } from "./contexts/TierContext.jsx";
import { ConfigProvider } from "./contexts/ConfigContext.jsx";
import REDMS from "./REDMS.jsx";
import Home from "./pages/Home.jsx";
import Demo from "./pages/Demo.jsx";
import Landing from "./pages/Landing.jsx";
import Wholesaler from "./pages/Wholesaler.jsx";
import Admin from "./pages/Admin.jsx";
import Profile from "./pages/Profile.jsx";
import Terms from "./pages/Terms.jsx";
import Privacy from "./pages/Privacy.jsx";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="app-loading">
        <span>Loading…</span>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) {
    return (
      <div className="app-loading">
        <span>Loading…</span>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function WholesalerRoute({ children }) {
  const { user, loading, isAdmin } = useAuth();
  const { hasWholesalerModule, loading: tierLoading } = useTier();
  if (loading || tierLoading) {
    return (
      <div className="app-loading">
        <span>Loading…</span>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/" replace />;
  }
  if (!hasWholesalerModule && !isAdmin) {
    return <Navigate to="/investor" replace />;
  }
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <TierProvider>
      <ConfigProvider>
      <HelmetProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/login" element={<Landing />} />
          <Route
            path="/investor"
            element={
              <ProtectedRoute>
                <REDMS />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            }
          />
          <Route
            path="/wholesaler"
            element={
              <WholesalerRoute>
                <Wholesaler />
              </WholesalerRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </HelmetProvider>
      </ConfigProvider>
      </TierProvider>
    </AuthProvider>
  );
}
