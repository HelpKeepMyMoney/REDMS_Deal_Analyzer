import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext.jsx";
import { ConfigProvider } from "./contexts/ConfigContext.jsx";
import REDMS from "./REDMS.jsx";
import Landing from "./pages/Landing.jsx";
import Wholesaler from "./pages/Wholesaler.jsx";
import Admin from "./pages/Admin.jsx";
import Profile from "./pages/Profile.jsx";

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
  const { user, loading, isWholesaler, isAdmin } = useAuth();
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
  if (!isWholesaler && !isAdmin) {
    return <Navigate to="/investor" replace />;
  }
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <ConfigProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
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
      </ConfigProvider>
    </AuthProvider>
  );
}
