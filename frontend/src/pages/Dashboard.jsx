import { useEffect, useState, useCallback, useMemo } from "react";
import { AdminLayout } from "../components/AdminLayout";
import { api, rupiah } from "../lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";
import { TrendingUp, Wallet, Users, Calendar, DollarSign } from "lucide-react";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [monthFilter, setMonthFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // Generate daftar bulan secara otomatis (misal: 24 bulan ke belakang)
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
    <AdminLayout title="Ringkasan Finansial" subtitle="Analisis pendapatan studio dan rincian fee fotografer profesional">
      {/* Filter Bulan Dinamis */}
      <div className="mb-6 flex justify-end">
        <Select onValueChange={setMonthFilter} value={monthFilter}>
          <SelectTrigger className="w-[200px] bg-white rounded-xl border-moss-900/10">
            <SelectValue placeholder="Pilih Periode" />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
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
        <div className="space-y-6">
          
          {/* 1. KARTU METRIK UTAMA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-white p-5 rounded-2xl border border-moss-900/10 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Pendapatan</p>
                <div className="p-2 rounded-xl bg-green-50 text-green-700"><TrendingUp className="h-4 w-4" /></div>
              </div>
              <p className="text-2xl font-bold text-moss-900 mt-3">{rupiah(data.total_income)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Akumulasi DP & Pelunasan klien</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-moss-900/10 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Outstanding / Piutang</p>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-700"><Wallet className="h-4 w-4" /></div>
              </div>
              <p className="text-2xl font-bold text-amber-600 mt-3">{rupiah(data.outstanding)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Sisa tagihan belum dibayar klien</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-moss-900/10 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cost Fee Fotografer</p>
                <div className="p-2 rounded-xl bg-rose-50 text-rose-700"><Users className="h-4 w-4" /></div>
              </div>
              <p className="text-2xl font-bold text-rose-600 mt-3">{rupiah(data.photographer_fee_total)}</p>
              <p className="text-[11px] text-rose-700 mt-1">Belum lunas dibayar: {rupiah(data.photographer_fee_unpaid)}</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-moss-900/10 shadow-sm relative overflow-hidden bg-gradient-to-br from-moss-900 to-moss-950 text-white">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Net Profit (Bersih)</p>
                <div className="p-2 rounded-xl bg-white/10 text-white"><DollarSign className="h-4 w-4" /></div>
              </div>
              <p className="text-2xl font-bold mt-3 text-white">{rupiah(data.net_profit)}</p>
              <p className="text-[11px] text-white/90 font-medium mt-1">Pendapatan bersih dikurangi fee FG</p>
            </div>

          </div>

          {/* 2. ANALISIS PENDAPATAN PER BULAN */}
          <div className="bg-white p-6 rounded-2xl border border-moss-900/10 shadow-sm">
            <h3 className="font-bold text-moss-900 text-base mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-moss-700" /> Tren Pendapatan Per Bulan
            </h3>
            {data.monthly && data.monthly.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-neutral-100">
                      <th className="pb-3 font-semibold">Bulan</th>
                      <th className="pb-3 font-semibold">Jumlah Booking</th>
                      <th className="pb-3 font-semibold">Pemasukan DP</th>
                      <th className="pb-3 font-semibold">Pemasukan Pelunasan</th>
                      <th className="pb-3 font-semibold text-right">Total Pendapatan Bulanan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.monthly.map((m) => {
                      const totalBulan = m.dp + m.full;
                      return (
                        <tr key={m.month} className="border-b border-neutral-50 last:border-0 hover:bg-neutral-50/50">
                          <td className="py-3.5 font-semibold text-moss-900">{m.month}</td>
                          <td className="py-3.5">{m.bookings} Sesi</td>
                          <td className="py-3.5">{rupiah(m.dp)}</td>
                          <td className="py-3.5">{rupiah(m.full)}</td>
                          <td className="py-3.5 text-right font-bold text-green-700">{rupiah(totalBulan)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">Belum ada data transaksi bulanan.</p>
            )}
          </div>

          {/* 3. TABEL COST & PERFORMA FOTOGRAFER */}
          <div className="bg-white p-6 rounded-2xl border border-moss-900/10 shadow-sm">
            <h3 className="font-bold text-moss-900 text-base mb-1 flex items-center gap-2">
              <Users className="h-4 w-4 text-moss-700" /> Rincian Cost & Beban Fee Fotografer
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Pantau jumlah sesi tugas dan kewajiban pembayaran fee ke masing-masing fotografer.</p>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-neutral-100">
                    <th className="pb-3 font-semibold">Nama Fotografer</th>
                    <th className="pb-3 font-semibold">Total Tugas Sesi</th>
                    <th className="pb-3 font-semibold">Total Fee</th>
                    <th className="pb-3 font-semibold text-right">Fee Belum Dibayar (Kewajiban Studio)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.per_photographer.map((p) => (
                    <tr key={p.name} className="border-b border-neutral-50 last:border-0 hover:bg-neutral-50/50">
                      <td className="py-3.5 font-semibold text-moss-900">{p.name}</td>
                      <td className="py-3.5">{p.sessions} Sesi</td>
                      <td className="py-3.5 font-medium">{rupiah(p.fee)}</td>
                      <td className={`py-3.5 text-right font-bold ${p.fee_unpaid > 0 ? 'text-rose-600' : 'text-green-600'}`}>
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
    </AdminLayout>
  );
}
