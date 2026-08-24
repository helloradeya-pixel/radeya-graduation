import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "../components/AdminLayout";
import { api, rupiah } from "../lib/api";
import { toast } from "sonner";
import { TrendingUp, Wallet, Users, Calendar as CalendarIcon, DollarSign } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { id } from "date-fns/locale";

// Komponen UI shadcn
import { Button } from "../components/ui/button";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { cn } from "../lib/utils";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // State untuk rentang tanggal (default: Bulan Ini)
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [isOpen, setIsOpen] = useState(false);

  // Fungsi load data berdasarkan rentang tanggal (format YYYY-MM-DD ke backend)
  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateRange?.from) {
        params.start_date = format(dateRange.from, "yyyy-MM-dd");
      }
      if (dateRange?.to) {
        params.end_date = format(dateRange.to, "yyyy-MM-dd");
      }

      const { data: res } = await api.get("/analytics/summary", { params });
      setData(res);
    } catch {
      toast.error("Gagal memuat data ringkasan");
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Tombol Shortcut Cepat (Gaya Meta Ads)
  const handlePreset = (preset) => {
    const today = new Date();
    if (preset === "all") {
      setDateRange({ from: undefined, to: undefined });
    } else if (preset === "today") {
      setDateRange({ from: today, to: today });
    } else if (preset === "7days") {
      setDateRange({ from: subDays(today, 6), to: today });
    } else if (preset === "thisMonth") {
      setDateRange({ from: startOfMonth(today), to: endOfMonth(today));
    }
    setIsOpen(false);
  };

  return (
    <AdminLayout title="Ringkasan Finansial" subtitle="Analisis pendapatan studio & rincian fee fotografer">
      <div className="space-y-4 pb-20">
        
        {/* Filter Rentang Tanggal (Date Range Picker ala Meta Ads) */}
        <div className="flex justify-end">
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full sm:w-[280px] justify-start text-left font-normal bg-white rounded-xl border-moss-900/10 text-xs h-10",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-moss-700" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "d MMM yyyy", { locale: id })} -{" "}
                      {format(dateRange.to, "d MMM yyyy", { locale: id })}
                    </>
                  ) : (
                    format(dateRange.from, "d MMM yyyy", { locale: id })
                  )
                ) : (
                  <span>Semua Waktu (Tanpa Batas)</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white z-50 shadow-lg rounded-2xl border border-moss-900/10" align="end">
              <div className="flex flex-col sm:flex-row">
                {/* Bagian Shortcut Kiri */}
                <div className="p-3 border-b sm:border-b-0 sm:border-r border-neutral-100 flex flex-col gap-1.5 min-w-[140px]">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase px-2 mb-1">Periode Cepat</p>
                  <Button variant="ghost" size="sm" className="justify-start text-xs h-8 px-2 font-normal hover:bg-moss-50" onClick={() => handlePreset("today")}>
                    Hari Ini
                  </Button>
                  <Button variant="ghost" size="sm" className="justify-start text-xs h-8 px-2 font-normal hover:bg-moss-50" onClick={() => handlePreset("7days")}>
                    7 Hari Terakhir
                  </Button>
                  <Button variant="ghost" size="sm" className="justify-start text-xs h-8 px-2 font-normal hover:bg-moss-50" onClick={() => handlePreset("thisMonth")}>
                    Bulan Ini
                  </Button>
                  <Button variant="ghost" size="sm" className="justify-start text-xs h-8 px-2 font-normal hover:bg-moss-50 text-rose-600" onClick={() => handlePreset("all")}>
                    Semua Waktu
                  </Button>
                </div>

                {/* Bagian Kalender Interaktif Kanan */}
                <div className="p-2">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={1}
                    locale={id}
                  />
                  <div className="flex items-center justify-end gap-2 p-2 border-t border-neutral-100">
                    <Button size="sm" className="bg-moss-900 text-white hover:bg-moss-800 text-xs h-8 px-4 rounded-lg" onClick={() => setIsOpen(false)}>
                      Terapkan
                    </Button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {loading ? (
          <div className="flex justify-center items-center p-20">
            <div className="h-8 w-8 rounded-full border-2 border-moss-800 border-t-transparent animate-spin" />
          </div>
        ) : data ? (
          <div className="space-y-4">
            
            {/* 1. KARTU METRIK UTAMA */}
            <div className="grid grid-cols-1 gap-3">
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

            {/* 2. TREND PENDAPATAN PER BULAN */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-moss-900/10 shadow-sm">
              <h3 className="font-bold text-moss-900 text-sm sm:text-base mb-3 flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-moss-700" /> Tren Pendapatan Per Bulan
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
