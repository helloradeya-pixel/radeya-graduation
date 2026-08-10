import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Camera, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "../components/ui/button";
import { useAuth } from "../context/AuthContext";

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
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#F8F6F0] text-[#2C2A29] font-sans">
      <div className="relative hidden lg:block overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1561409958-c0e6ad782a81?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2MzR8MHwxfHNlYXJjaHwxfHxvdXRkb29yJTIwZ3JhZHVhdGlvbiUyMHBob3RvfGVufDB8fHx8MTc4NjMzODI2Nnww&ixlib=rb-4.1.0&q=85"
          alt="Graduation"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[#2C2A29]/70" />
        <div className="absolute bottom-0 p-12 text-white z-10">
          <p className="text-xs uppercase tracking-[0.25em] text-[#BEAF9D] font-medium">Exclusive Portal</p>
          <h2 className="text-3xl font-serif font-normal mt-3 max-w-sm leading-snug">
            Tempat di mana setiap bingkai cerita terorganisir rapi. Masuk untuk mengelola ruang kerja anda.
          </h2>
        </div>
      </div>

      <div className="flex items-center px-6 sm:px-12 lg:px-20 py-16">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2.5 text-[#2C2A29]">
            <Camera className="h-5 w-5 text-[#BEAF9D]" />
            <span className="font-serif font-semibold tracking-wider text-lg">Radeya Graduation</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-normal tracking-tight leading-tight mt-10">
            Masuk ke <span className="text-[#BEAF9D] italic">Dashboard</span>
          </h1>
          <p className="text-[#666666] mt-3 text-sm leading-relaxed">
            Khusus admin vendor. Gunakan akun Google terverifikasi untuk melanjutkan.
          </p>

          <Button
            data-testid="google-login-button"
            onClick={handleLogin}
            className="mt-8 w-full h-12 rounded-2xl bg-[#BEAF9D] hover:bg-[#A89987] text-white font-medium transition-all shadow-sm flex items-center justify-center gap-2"
          >
            Lanjutkan dengan Google <ArrowRight className="h-4 w-4" />
          </Button>

          <div className="mt-6 flex items-start gap-2.5 text-xs text-[#666666] bg-white p-4 rounded-2xl border border-[#EBE7DF]">
            <ShieldCheck className="h-4 w-4 mt-0.5 text-[#BEAF9D] shrink-0" />
            <p className="leading-relaxed">Sesi terenkripsi aman & berlaku selama 7 hari. Data klien tersimpan privat.</p>
          </div>

          <Link
            to="/"
            data-testid="back-to-booking-link"
            className="inline-block mt-10 text-sm font-medium text-[#BEAF9D] hover:text-[#2C2A29] underline underline-offset-4 transition-colors"
          >
            ← Kembali ke halaman booking
          </Link>
        </div>
      </div>
    </div>
  );
}
