import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="auth-loading">
        <div className="h-8 w-8 rounded-full border-2 border-moss-800 border-t-transparent animate-spin" />
      </div>
    );

  if (!user) return <Navigate to="/login" replace />;
  return children;
};
