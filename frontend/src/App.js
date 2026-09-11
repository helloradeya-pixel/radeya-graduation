import "./App.css";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import BookingPage from "./pages/BookingPage";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Settings from "./pages/Settings";
import InvoicePage from "./pages/InvoicePage"; 
import Analytics from "./pages/Analytics";
import Meta from "./components/Meta";

// Fungsi pelacak otomatis perpindahan halaman untuk Google Analytics
function AnalyticsTracker() {
  const location = useLocation();
  useEffect(() => {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("config", "G-JLNW7X43JF", {
        page_path: location.pathname + location.search,
      });
    }
  }, [location]);
  return null;
}

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) return <AuthCallback />;

  return (
    <>
      <AnalyticsTracker />
      <Routes>
        {/* 1. Klien tetap akses form booking utama di link utama */}
        <Route path="/" element={<BookingPage />} />
        
        {/* 2. Halaman Login */}
        <Route path="/login" element={<Login />} />
        
        {/* 3. Halaman Invoice */}
        <Route path="/invoice/:id" element={<InvoicePage />} />
        
        {/* 4. Area Dashboard & Manajemen */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Meta /> 
        <AuthProvider>
          <AppRouter />
          <Toaster position="top-center" richColors />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}
