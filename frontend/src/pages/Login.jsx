import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Camera, ArrowRight, ShieldCheck, Lock, Mail, AlertCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { useAuth } from "../context/AuthContext";
import loginBg from "../assets/ADS00060.jpg";

export default function Login() {
  const { user, loading, checkUser } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("hello.radeya@gmail.com");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setIsSubmitting(true);

    try {
      const response = await fetch("https://radeya-graduation-backend.vercel.app/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Gagal masuk. Periksa kembali email dan password.");
      }

      if (checkUser) await checkUser();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#F8F6F0] text-[#2C2A29] font-sans">
      <div className="relative hidden lg:block overflow-hidden">
        <img
          src={loginBg}
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
            <span className="font-serif font-semibold tracking-wider text-lg">Radeyaphoto</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-normal tracking-tight leading-tight mt-10">
            Masuk ke <span className="text-[#BEAF9D] italic">Dashboard</span>
          </h1>
          <p className="text-[#666666] mt-3 text-sm leading-relaxed">
            Khusus admin vendor. Masukkan kredensial akun Anda.
          </p>

          {errorMsg && (
            <div className="mt-6 flex items-center gap-2 text-xs text-red-700 bg-red-50 p-4 rounded-2xl border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p>{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[#666666] mb-1.5">
                Email Admin
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-[#BEAF9D]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full h-12 pl-10 pr-4 rounded-2xl bg-white border border-[#EBE7DF] text-[#2C2A29] text-sm focus:outline-none focus:border-[#BEAF9D]"
                  placeholder="hello.radeya@gmail.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[#666666] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-[#BEAF9D]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-12 pl-10 pr-4 rounded-2xl bg-white border border-[#EBE7DF] text-[#2C2A29] text-sm focus:outline-none focus:border-[#BEAF9D]"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-2xl bg-[#BEAF9D] hover:bg-[#A89987] text-white font-medium transition-all shadow-sm flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting ? "Memproses..." : "Masuk ke Dashboard"} <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="mt-6 flex items-start gap-2.5 text-xs text-[#666666] bg-white p-4 rounded-2xl border border-[#EBE7DF]">
            <ShieldCheck className="h-4 w-4 mt-0.5 text-[#BEAF9D] shrink-0" />
            <p className="leading-relaxed">Sesi terenkripsi aman & berlaku selama 7 hari. Data klien tersimpan privat.</p>
          </div>

          <Link
            to="/"
            data-testid="back-to-booking-link"
            className="inline-block mt-8 text-sm font-medium text-[#BEAF9D] hover:text-[#2C2A29] underline underline-offset-4 transition-colors"
          >
            ← Kembali ke halaman booking
          </Link>
        </div>
      </div>
    </div>
  );
}
