import { useEffect, useState, useCallback, useMemo } from "react";
import { AdminLayout } from "../components/AdminLayout";
import { api, rupiah, fmtDate } from "../lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { TrendingUp, Wallet, Users, Calendar, DollarSign, ExternalLink } from "lucide-react";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [monthFilter, setMonthFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const monthOptions = useMemo(() => {
    const options = [{ value: "all", label: "Semua Waktu" }];
    const monthsName = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    
    const now = new Date();
    for (let i = 0; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthIdx = d.getMonth();
      const monthValue = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
      const monthLabel = `${monthsName[monthIdx]} ${year}`;
      options.push({ value: monthValue, label: monthLabel });
    }
    return options;
  }, []);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get("/analytics/summary", { 
        params: { month: monthFilter } 
      });
      setData(res);
    } catch {
      toast.error("Gagal memuat data ringkasan");
    } finally {
      setLoading(false);
    }
  }, [monthFilter]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return (
    <AdminLayout title="Ringkasan Finansial" subtitle="Analisis pendapatan studio & rincian fee fotografer">
      {/* Container utama dengan padding bawah agar tidak tertutup menu HP */}
      <div className="space-y-4 pb-20">
        
        {/* Filter Bulan */}
        <div className="flex justify-end">
          <Select onValueChange={setMonthFilter} value={monthFilter}>
            <SelectTrigger className="w-full sm:w-[200px] bg-white rounded-xl border-moss-900/10 text-xs">
              <SelectValue placeholder="Pilih Periode" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center items-center p-20">
            <div className="h-8 w-8 rounded-full border-2 border-moss-800 border-t-transparent animate-spin" />
          </div>
        ) : data ? (
          <div className="space-y-4">
            
            {/* 1. KARTU METRIK UTAMA (Dibuat 1 kolom di HP agar tidak kepotong) */}
            <div className="grid grid-cols-1 gap-3">
              
              {/* Net Profit Card */}
              <div className="bg-gradient-to-br from-moss-900 to-moss-950 text-white p-5 rounded-2xl shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">Net Profit (Bersih)</p>
                  <div className="p-2 rounded-xl bg-white/10 text-white"><DollarSign className="h-4 w-4" /></div>
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold mt-2 text-white">{rupiah(data.net_profit)}</p>
                <p className="text-[11px] text-white/80 mt-1">Pendapatan bersih dikurangi total fee fotografer</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-moss-900/10 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Pendapatan</p>
                    <div className="p-1.5 rounded-lg bg-green-50 text-green-700"><TrendingUp className="h-3.5 w-3.5" /></div>
                  </div>
                  <p className="text-xl font-bold text-moss-900 mt-2">{rupiah(data.total_income)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Akumulasi DP & Pelunasan</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-moss-900/10 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Outstanding / Piutang</p>
                    <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700"><Wallet className="h-3.5 w-3.5" /></div>
                  </div>
                  <p className="text-xl font-bold text-amber-600 mt-2">{rupiah(data.outstanding)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Sisa tagihan belum dibayar</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-moss-900/10 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Fee Fotografer</p>
                    <div className="p-1.5 rounded-lg bg-rose-50 text-rose-700"><Users className="h-3.5 w-3.5" /></div>
                  </div>
                  <p className="text-xl font-bold text-rose-600 mt-2">{rupiah(data.photographer_fee_total)}</p>
                  <p className="text-[10px] text-rose-700 mt-0.5">Belum lunas: {rupiah(data.photographer_fee_unpaid)}</p>
                </div>
              </div>

            </div>

            {/* 1.5 WIDGET JADWAL TERDEKAT + TOMBOL GOOGLE CALENDAR */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-moss-900/10 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-moss-900 text-sm sm:text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-moss-700" /> Jadwal Sesi Foto Terdekat
                </h3>
                <span className="text-[10px] bg-moss-50 text-moss-800 px-2 py-0.5 rounded border border-moss-900/10 font-medium">
                  Google Calendar
                </span>
              </div>

              {data.upcoming && data.upcoming.length > 0 ? (
                <div className="space-y-2.5">
                  {data.upcoming.map((item) => {
                    const startTime = (item.start_time || "").substring(0, 5);
                    const endTime = (item.end_time || "").substring(0, 5);

                    return (
                      <div 
                        key={item.booking_id} 
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-xl bg-moss-50/40 border border-moss-900/10 gap-3 hover:border-moss-800/30 transition-all"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <p className="font-bold text-xs text-moss-900 truncate">{item.full_name} — <span className="text-moss-700 font-semibold">{item.package_name}</span></p>
                          <p className="text-[11px] text-muted-foreground font-medium">
                            📅 {fmtDate(item.shoot_date)} ({startTime} - {endTime})
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">📍 {item.location}</p>
                        </div>

                        <Button
                          size="sm"
                          className="w-full sm:w-auto h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 shrink-0"
                          onClick={() => window.open(item.gcal_link, "_blank")}
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Buka GCal
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-4 text-center">Tidak ada jadwal sesi foto terdekat.</p>
              )}
            </div>

            {/* 2. TREND PENDAPATAN PER BULAN (Dibuat scrollable agar rapi di HP) */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-moss-900/10 shadow-sm">
              <h3 className="font-bold text-moss-900 text-sm sm:text-base mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-moss-700" /> Tren Pendapatan Per Bulan
              </h3>
              {data.monthly && data.monthly.length > 0 ? (
                <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                  <table className="w-full text-xs sm:text-sm min-w-[500px]">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b border-neutral-100">
                        <th className="pb-2.5 font-semibold">Bulan</th>
                        <th className="pb-2.5 font-semibold">Sesi</th>
                        <th className="pb-2.5 font-semibold">DP</th>
                        <th className="pb-2.5 font-semibold">Pelunasan</th>
                        <th className="pb-2.5 font-semibold text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.monthly.map((m) => {
                        const totalBulan = m.dp + m.full;
                        return (
                          <tr key={m.month} className="border-b border-neutral-50 last:border-0">
                            <td className="py-3 font-semibold text-moss-900">{m.month}</td>
                            <td className="py-3">{m.bookings} Sesi</td>
                            <td className="py-3">{rupiah(m.dp)}</td>
                            <td className="py-3">{rupiah(m.full)}</td>
                            <td className="py-3 text-right font-bold text-green-700">{rupiah(totalBulan)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-6 text-center">Belum ada data transaksi bulanan.</p>
              )}
            </div>

            {/* 3. RINCIAN FEE FOTOGRAFER */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-moss-900/10 shadow-sm">
              <h3 className="font-bold text-moss-900 text-sm sm:text-base mb-1 flex items-center gap-2">
                <Users className="h-4 w-4 text-moss-700" /> Beban Fee Fotografer
              </h3>
              <p className="text-[11px] text-muted-foreground mb-3">Pantau kewajiban pembayaran fee ke fotografer.</p>
              
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <table className="w-full text-xs sm:text-sm min-w-[450px]">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-neutral-100">
                      <th className="pb-2.5 font-semibold">Nama</th>
                      <th className="pb-2.5 font-semibold">Sesi</th>
                      <th className="pb-2.5 font-semibold">Total Fee</th>
                      <th className="pb-2.5 font-semibold text-right">Belum Dibayar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.per_photographer.map((p) => (
                      <tr key={p.name} className="border-b border-neutral-50 last:border-0">
                        <td className="py-3 font-semibold text-moss-900">{p.name}</td>
                        <td className="py-3">{p.sessions} Sesi</td>
                        <td className="py-3 font-medium">{rupiah(p.fee)}</td>
                        <td className={`py-3 text-right font-bold ${p.fee_unpaid > 0 ? 'text-rose-600' : 'text-green-600'}`}>
                          {rupiah(p.fee_unpaid)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
}
