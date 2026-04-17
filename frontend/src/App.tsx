import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "./store/authStore";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import TournamentDetail from "./pages/TournamentDetail";
import MatchDetail from "./pages/MatchDetail";
import LiveScoring from "./pages/LiveScoring";
import PublicMatch from "./pages/PublicMatch";
import PublicRegistration from "./pages/PublicRegistration";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <>
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: { fontSize: '14px', borderRadius: '10px', fontWeight: 500 },
        success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
      }}
    />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/m/:id" element={<PublicMatch />} />
      <Route path="/tournaments/:tournamentId/register" element={<PublicRegistration />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tournaments/:id"
        element={
          <ProtectedRoute>
            <TournamentDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/matches/:id"
        element={
          <ProtectedRoute>
            <MatchDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/matches/:id/live"
        element={
          <ProtectedRoute>
            <LiveScoring />
          </ProtectedRoute>
        }
      />
    </Routes>
    </>
  );
}
