import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Settings, LogOut, Camera, Plus, BarChart3 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";

const nav = [
  { to: "/dashboard", label: "Ringkasan", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/analytics", label: "Grafik", icon: BarChart3, testid: "nav-analytics" }, // <-- 1. Tambahkan menu Grafik di sini
  { to: "/clients", label: "Database Client", icon: Users, testid: "nav-clients" },
  { to: "/settings", label: "Paket & Fotografer", icon: Settings, testid: "nav-settings" },
];

export const AdminLayout = ({ children, title, subtitle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("session_token");
    if (typeof logout === "function") {
      logout();
    }
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-background">
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-moss-900/10 bg-white/70 backdrop-blur-xl px-5 py-7">
        <div className="flex items-center gap-2 text-moss-800 px-2">
          <Camera className="h-5 w-5" />
          <span className="font-display font-bold tracking-tight">Radeyaphoto</span>
        </div>
        <nav className="mt-10 space-y-1">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              data-testid={n.testid}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "bg-moss-800 text-white" : "text-neutral-600 hover:bg-moss-50 hover:text-moss-900"
                }`
              }
            >
              <n.icon className="h-4 w-4" /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-3">
          <Button
            variant="outline"
            data-testid="sidebar-new-booking"
            onClick={() => navigate("/")}
            className="w-full rounded-full border-moss-900/20 hover:bg-moss-50"
          >
            <Plus className="h-4 w-4 mr-1" /> Form Booking
          </Button>
          <div className="flex items-center gap-3 rounded-md border border-moss-900/10 p-3">
            {user?.picture ? (
              <img src={user.picture} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-moss-100" />
            )}
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold" data-testid="sidebar-user-name">{user?.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <button
            data-testid="logout-button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-3 text-xs font-semibold text-neutral-500 hover:text-destructive transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" /> Keluar
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-moss-900/10 bg-clay/85 backdrop-blur-xl px-4 sm:px-8 py-4 flex items-center justify-between">
          <div>
            <p className="label-xs">Admin</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <button onClick={handleLogout} data-testid="logout-button-mobile" className="lg:hidden text-neutral-500">
            <LogOut className="h-5 w-5" />
          </button>
        </header>

        <main className="px-4 sm:px-8 py-6 pb-28 lg:pb-12">{children}</main>
      </div>

      {/* 2. Bagian bottom navigation mobile otomatis menyesuaikan grid kolom sejumlah item dalam array `nav` */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-moss-900/10 bg-white/95 backdrop-blur-xl grid grid-cols-4">
        {nav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            data-testid={`${n.testid}-mobile`}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-3 text-[11px] font-semibold transition-colors ${
                isActive ? "text-moss-800" : "text-neutral-400"
              }`
            }
          >
            <n.icon className="h-5 w-5" /> {n.label.split(" ")[0]}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
