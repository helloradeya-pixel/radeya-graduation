import { useEffect, useRef } from "react";
import { api } from "@/lib/api";

export default function AuthCallback() {
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;
    const sid = new URLSearchParams(window.location.hash.replace("#", "")).get("session_id");
    (async () => {
      try {
        await api.post("/auth/session", {}, { headers: { "X-Session-ID": sid } });
        window.location.replace("/dashboard");
      } catch {
        window.location.replace("/login?error=1");
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background" data-testid="auth-callback">
      <div className="h-8 w-8 rounded-full border-2 border-moss-800 border-t-transparent animate-spin" />
    </div>
  );
}
