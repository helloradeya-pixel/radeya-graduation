import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "../components/AdminLayout";
import { api, rupiah } from "../lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [monthFilter, setMonthFilter] = useState("all");
  const [loading, setLoading] = useState(true);

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
    <AdminLayout title="Ringkasan" subtitle="Pantau pendapatan, DP, dan fee fotografer">
      <div className="mb-6 flex justify-end">
        <Select onValueChange={setMonthFilter} value={monthFilter}>
          <SelectTrigger className="w-[180px] bg-white">
            <SelectValue placeholder="Pilih Bulan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Waktu</SelectItem>
            <SelectItem value="2026-08">Agustus 2026</SelectItem>
            <SelectItem value="2026-07">Juli 2026</SelectItem>
            <SelectItem value="2026-06">Juni 2026</SelectItem>
            <SelectItem value="2026-05">Mei 2026</SelectItem>
            <SelectItem value="2026-04">April 2026</SelectItem>
            <SelectItem value="2026-03">Maret 2026</SelectItem>
            <SelectItem value="2026-02">Februari 2026</SelectItem>
            <SelectItem value="2026-01">Januari 2026</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-center p-10">Memuat data...</p>
      ) : data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-moss-900/10">
              <p className="text-xs text-muted-foreground">Total Omzet</p>
              <p className="text-lg font-bold text-moss-900">{rupiah(data.total_income)}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-moss-900/10">
              <p className="text-xs text-muted-foreground">Outstanding</p>
              <p className="text-lg font-bold text-amberx">{rupiah(data.outstanding)}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-moss-900/10">
            <h3 className="font-bold text-moss-900 mb-4">Pendapatan & Fee per Fotografer</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="pb-2">Nama</th>
                    <th className="pb-2">Sesi</th>
                    <th className="pb-2">Omzet</th>
                    <th className="pb-2">Fee</th>
                    <th className="pb-2">Blm Dibayar</th>
                  </tr>
                </thead>
                <tbody>
                  {data.per_photographer.map((p) => (
                    <tr key={p.name} className="border-b last:border-0">
                      <td className="py-3 font-semibold">{p.name}</td>
                      <td className="py-3">{p.sessions}</td>
                      <td className="py-3">{rupiah(p.revenue)}</td>
                      <td className="py-3">{rupiah(p.fee)}</td>
                      <td className={`py-3 font-bold ${p.fee_unpaid > 0 ? 'text-amberx' : 'text-green-600'}`}>
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
