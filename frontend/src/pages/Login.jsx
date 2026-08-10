import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Camera, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  const handleLogin = () => {
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="relative hidden lg:block overflow-hidden grain">
        <img
          src="https://images.unsplash.com/photo-1561409958-c0e6ad782a81?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2MzR8MHwxfHNlYXJjaHwxfHxvdXRkb29yJTIwZ3JhZHVhdGlvbiUyMHBob3RvfGVufDB8fHx8MTc4NjMzODI2Nnww&ixlib=rb-4.1.0&q=85"
          alt="Graduation"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-moss-900/75" />
        <div className="absolute bottom-0 p-12 text-white z-10">
          <p className="label-xs !text-white/60">Admin Panel</p>
          <h2 className="text-3xl font-bold mt-3 max-w-sm leading-tight">
            Kelola booking, pendapatan, dan fee fotografer dari satu tempat.
          </h2>
        </div>
      </div>

      <div className="flex items-center px-6 sm:px-12 lg:px-20 py-16">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 text-moss-800">
            <Camera className="h-5 w-5" />
            <span className="font-display font-bold tracking-tight">GradFrame Studio</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-none mt-10">
            Masuk ke <span className="text-moss-800">Dashboard</span>
          </h1>
          <p className="text-muted-foreground mt-4 text-sm">
            Hanya untuk admin studio. Gunakan akun Google kamu untuk masuk.
          </p>

          <Button
            data-testid="google-login-button"
            onClick={handleLogin}
            className="mt-8 w-full h-12 rounded-full bg-moss-800 hover:bg-moss-900 hover:text-white text-white font-semibold transition-colors"
          >
            Lanjutkan dengan Google <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <div className="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 mt-0.5 text-moss-600 shrink-0" />
            <p>Sesi login aman & berlaku 7 hari. Data client tersimpan privat di database studio.</p>
          </div>

          <Link
            to="/"
            data-testid="back-to-booking-link"
            className="inline-block mt-10 text-sm font-semibold text-moss-800 hover:text-moss-900 underline underline-offset-4"
          >
            ← Kembali ke halaman booking
          </Link>
        </div>
      </div>
    </div>
  );
}
