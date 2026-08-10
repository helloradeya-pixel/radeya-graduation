import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Wallet, TrendingUp, Users, CalendarClock, CircleDollarSign, Camera, AlertCircle, ExternalLink } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { api, rupiah, shortRupiah, fmtDate } from "@/lib/api";

const COLORS = ["#065f46", "#d97706", "#0d7a56", "#a3a3a3", "#457b9d"];

const Stat = ({ label, value, sub, icon: Icon, accent, i, testid }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: i * 0.06 }}
    data-testid={testid}
    className="rounded-lg border border-moss-900/10 bg-white p-5 transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg"
  >
    <div className="flex items-start justify-between">
      <p className="label-xs">{label}</p>
      <Icon className={`h-4 w-4 ${accent ? "text-amberx" : "text-moss-800"}`} />
    </div>
    <p className="font-display text-2xl font-bold tracking-tight mt-3">{value}</p>
    {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
  </motion.div>
);

export default function Dashboard() {
  const [d, setD] = useState(null);

  useEffect(() => {
    api.get("/analytics/summary").then(({ data }) => setD(data)).catch(() => {});
  }, []);

  if (!d)
    return (
      <AdminLayout title="Ringkasan">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => <div key={i} className="h-28 rounded-lg border border-moss-900/10 bg-white/50 animate-pulse" />)}
        </div>
      </AdminLayout>
    );

  const monthly = d.monthly.map((m) => ({ ...m, label: m.month }));
  const pie = d.per_package.map((p) => ({ name: p.name, value: p.revenue }));

  return (
    <AdminLayout title="Ringkasan" subtitle="Pantau pendapatan, DP, dan fee fotografer">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="stats-grid">
        <Stat i={0} testid="stat-total-income" label="Total Pendapatan" value={rupiah(d.total_income)} sub={`${d.total_bookings} booking aktif`} icon={Wallet} />
        <Stat i={1} testid="stat-dp-income" label="Pendapatan DP" value={rupiah(d.dp_income)} sub="dari booking DP" icon={CircleDollarSign} accent />
        <Stat i={2} testid="stat-full-income" label="Pendapatan Full" value={rupiah(d.full_income)} sub="dari booking lunas" icon={TrendingUp} />
        <Stat i={3} testid="stat-outstanding" label="Sisa Tagihan" value={rupiah(d.outstanding)} sub="belum dilunasi client" icon={AlertCircle} accent />
        <Stat i={4} testid="stat-fee-total" label="Total Fee Fotografer" value={rupiah(d.photographer_fee_total)} sub="seluruh sesi" icon={Camera} />
        <Stat i={5} testid="stat-fee-unpaid" label="Fee Belum Dibayar" value={rupiah(d.photographer_fee_unpaid)} sub="wajib dibayar" icon={AlertCircle} accent />
        <Stat i={6} testid="stat-net-profit" label="Laba Bersih" value={rupiah(d.net_profit)} sub="pendapatan − fee" icon={TrendingUp} />
        <Stat i={7} testid="stat-total-bookings" label="Jumlah Client" value={d.total_bookings} sub="total booking" icon={Users} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mt-6">
        <div className="lg:col-span-2 rounded-lg border border-moss-900/10 bg-white p-5" data-testid="monthly-chart">
          <p className="label-xs">Pendapatan per Bulan</p>
          <h3 className="text-lg font-semibold mt-1 mb-5">DP vs Full Payment</h3>
          <div className="h-64">
            {monthly.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={shortRupiah} tick={{ fontSize: 11 }} width={62} />
                  <Tooltip formatter={(v) => rupiah(v)} />
                  <Legend />
                  <Bar dataKey="dp" name="DP" fill="#d97706" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="full" name="Full" fill="#065f46" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada data booking.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-moss-900/10 bg-white p-5" data-testid="package-chart">
          <p className="label-xs">Distribusi</p>
          <h3 className="text-lg font-semibold mt-1 mb-3">Pendapatan per Paket</h3>
          <div className="h-56">
            {pie.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pie} dataKey="value" nameKey="name" innerRadius={45} outerRadius={72} paddingAngle={3}>
                    {pie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => rupiah(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada data.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mt-6">
        <div className="rounded-lg border border-moss-900/10 bg-white p-5" data-testid="photographer-table">
          <p className="label-xs">Fotografer</p>
          <h3 className="text-lg font-semibold mt-1 mb-4">Pendapatan & Fee per Fotografer</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-moss-900/10">
                  <th className="pb-2">Nama</th><th className="pb-2">Sesi</th><th className="pb-2">Omzet</th><th className="pb-2">Fee</th><th className="pb-2">Blm Dibayar</th>
                </tr>
              </thead>
              <tbody>
                {d.per_photographer.length === 0 && (
                  <tr><td colSpan={5} className="py-4 text-muted-foreground">Belum ada data.</td></tr>
                )}
                {d.per_photographer.map((p) => (
                  <tr key={p.name} className="border-b border-moss-900/5">
                    <td className="py-2.5 font-medium">{p.name}</td>
                    <td className="py-2.5">{p.sessions}</td>
                    <td className="py-2.5">{rupiah(p.revenue)}</td>
                    <td className="py-2.5">{rupiah(p.fee)}</td>
                    <td className="py-2.5">
                      {p.fee_unpaid > 0 ? <span className="text-amberx font-semibold">{rupiah(p.fee_unpaid)}</span> : <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-moss-900/10 bg-white p-5" data-testid="upcoming-sessions">
          <p className="label-xs">Jadwal</p>
          <h3 className="text-lg font-semibold mt-1 mb-4">Sesi Foto Terdekat</h3>
          <div className="space-y-3">
            {d.upcoming.length === 0 && <p className="text-sm text-muted-foreground">Belum ada sesi mendatang.</p>}
            {d.upcoming.map((u) => (
              <div key={u.booking_id} className="flex items-start gap-3 rounded-md border border-moss-900/10 p-3">
                <CalendarClock className="h-4 w-4 text-moss-800 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{u.full_name}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(u.shoot_date)} · {u.start_time}-{u.end_time} · {u.location}</p>
                  <span className="mt-1.5 text-[10px] inline-block px-2 py-0.5 rounded border border-moss-900/20">{u.package_name}</span>
                </div>
                <a href={u.gcal_link} target="_blank" rel="noreferrer" title="Tambah ke Google Calendar" className="text-moss-800 hover:text-moss-900">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
