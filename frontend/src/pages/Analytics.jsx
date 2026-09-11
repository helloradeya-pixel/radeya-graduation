import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts';
import { api } from '../lib/api';
import { AdminLayout } from '../components/AdminLayout';
import { TrendingUp, Users, CheckCircle2, Trash2, Landmark } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

// Komponen UI shadcn
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

const COLORS = ['#065f46', '#047857', '#10b981', '#34d399', '#6ee7b7'];

// Fungsi helper rupiah untuk format mata uang
const rupiah = (v) => `Rp ${Math.round(v || 0).toLocaleString('id-ID')}`;

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // State untuk Modal Catat & Kelola Prive di halaman Analitik
  const [priveModalOpen, setPriveModalOpen] = useState(false);
  const [priveAmount, setPriveAmount] = useState("");
  const [priveNotes, setPriveNotes] = useState("");
  const [priveList, setPriveList] = useState([]);
  const [loadingPrive, setLoadingPrive] = useState(false);

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/analytics/summary');
      setData(res.data);
    } catch (err) {
      console.error("Gagal memuat data analitik", err);
    } finally {
      setLoading(false);
    }
  };

  const loadPrive = async () => {
    try {
      const { data: res } = await api.get("/prive");
      setPriveList(res || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchAnalytics();
    loadPrive();
  }, []);

  // Fungsi simpan Prive
  const handleSavePrive = async () => {
    if (!priveAmount || isNaN(priveAmount) || Number(priveAmount) <= 0) {
      return toast.error("Masukkan nominal prive yang valid");
    }
    setLoadingPrive(true);
    try {
      await api.post("/prive", { amount: parseFloat(priveAmount), notes: priveNotes || "Keperluan pribadi" });
      toast.success("Penarikan pribadi berhasil dicatat!");
      setPriveAmount("");
      setPriveNotes("");
      fetchAnalytics(); 
      loadPrive(); 
    } catch {
      toast.error("Gagal mencatat penarikan pribadi");
    } finally {
      setLoadingPrive(false);
    }
  };

  // Fungsi hapus Prive
  const handleDeletePrive = async (priveId) => {
    try {
      await api.delete(`/prive/${priveId}`);
      toast.success("Catatan prive berhasil dihapus");
      fetchAnalytics();
      loadPrive();
    } catch {
      toast.error("Gagal menghapus catatan prive");
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Analisis & Grafik" subtitle="Memuat data laporan bisnis...">
        <div className="flex justify-center items-center py-24 text-neutral-400 text-sm">
          Menyiapkan grafik pendapatan...
        </div>
      </AdminLayout>
    );
  }

  // Perhitungan Keuangan Riil Rekening Global
  const totalTurnover = data?.total_turnover || 0;
  const totalIncome = data?.total_income || 0;
  const totalFeeSudahBayar = (data?.photographer_fee_total || 0) - (data?.photographer_fee_unpaid || 0);
  const realAccountBalance = totalIncome - totalFeeSudahBayar;

  // Perhitungan Dana Aman / Laba Bersih untuk Prive
  const safePriveLimit = realAccountBalance - (data?.photographer_fee_unpaid || 0);

  const monthlyFormatted = (data?.monthly || []).map(item => {
    let displayMonth = item.month;
    try {
      const [year, month] = item.month.split('-');
      const dateObj = new Date(year, month - 1, 1);
      displayMonth = dateObj.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
    } catch (e) {
      // fallback
    }
    return {
      monthName: displayMonth,
      totalPendapatan: item.dp + item.full,
      jumlahBooking: item.bookings
    };
  });

  // Ekstraksi Data Harian berdasarkan waktu pembuatan form (created_at)
  const dailyMap = {};
  (data?.monthly || []).forEach(m => {
    if (m.clients && Array.isArray(m.clients)) {
      m.clients.forEach(c => {
        // Prioritaskan created_at agar sesuai persis dengan waktu/tanggal client isi form
        const rawDate = c.created_at || c.date || c.shoot_date || "";
        if (rawDate) {
          const dayKey = rawDate.split('T')[0]; 
          if (!dailyMap[dayKey]) {
            dailyMap[dayKey] = { date: dayKey, revenue: 0, count: 0 };
          }
          dailyMap[dayKey].revenue += (c.amount_paid || c.total_price || 0);
          dailyMap[dayKey].count += 1;
        }
      });
    }
  });

  const dailyData = Object.values(dailyMap)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14)
    .map(d => {
      let formattedDay = d.date;
      try {
        formattedDay = format(new Date(d.date), "d MMM", { locale: id });
      } catch (e) {}
      return {
        dayLabel: formattedDay,
        pendapatanHarian: d.revenue,
        jumlahBooking: d.count
      };
    });

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = format(yesterdayDate, "yyyy-MM-dd");

  const todayStats = dailyMap[todayStr] || { revenue: 0, count: 0 };
  const yesterdayStats = dailyMap[yesterdayStr] || { revenue: 0, count: 0 };

  const packageData = (data?.per_package || []).map(p => ({
    name: p.name,
    revenue: p.revenue,
    count: p.count
  }));

  const photographerData = (data?.per_photographer || []).filter(
    pho => pho.name && pho.name !== "Belum Ditugaskan" && pho.name.trim() !== ""
  );

  return (
    <AdminLayout title="Grafik & Analisis" subtitle="Laporan performa finansial, omzet, dan operasional Radeyaphoto">
      <div className="space-y-6 pb-12">
        
        {/* Tombol Akses Prive / Penarikan Pribadi */}
        <div className="flex justify-end">
          <Button
            onClick={() => setPriveModalOpen(true)}
            variant="outline"
            className="bg-white rounded-xl border-moss-900/10 text-xs h-10 shadow-sm text-rose-700 hover:bg-rose-50 font-medium px-4"
          >
            - Catat Prive / Tarik Pribadi
          </Button>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-moss-900/10 shadow-sm">
            <div className="flex items-center gap-2 text-moss-800 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Omzet Kotor</span>
            </div>
            <p className="text-sm sm:text-lg font-bold text-neutral-900">
              {rupiah(totalTurnover)}
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-emerald-500/35 shadow-sm bg-emerald-50/20">
            <div className="flex items-center gap-2 text-emerald-700 mb-1">
              <Landmark className="h-4 w-4" />
              <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Saldo Rekening</span>
            </div>
            <p className="text-sm sm:text-lg font-bold text-emerald-700">
              {rupiah(realAccountBalance)}
            </p>
            <p className="text-[9px] text-emerald-600/80 mt-0.5">Uang masuk - Prive - Bayar FG</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-indigo-500/35 shadow-sm bg-indigo-50/20">
            <div className="flex items-center gap-2 text-indigo-700 mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-[11px] font-semibold text-indigo-800 uppercase tracking-wider">Aman Ditarik</span>
            </div>
            <p className={`text-sm sm:text-lg font-bold ${safePriveLimit < 0 ? 'text-rose-600' : 'text-indigo-700'}`}>
              {rupiah(safePriveLimit)}
            </p>
            <p className="text-[9px] text-indigo-600/80 mt-0.5">Saldo min. utang fee FG</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-moss-900/10 shadow-sm">
            <div className="flex items-center gap-2 text-rose-700 mb-1">
              <Users className="h-4 w-4" />
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Total Fee FG</span>
            </div>
            <p className="text-sm sm:text-lg font-bold text-rose-700">
              {rupiah(data?.photographer_fee_total || 0)}
            </p>
            <p className="text-[9px] text-neutral-400 mt-0.5">Belum lunas: {rupiah(data?.photographer_fee_unpaid || 0)}</p>
          </div>
        </div>

        {/* KARTU PERBANDINGAN HARI INI VS KEMARIN */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-emerald-900 to-emerald-950 text-white p-5 rounded-2xl shadow-sm">
            <p className="text-xs uppercase tracking-wider text-emerald-200 font-semibold mb-1">Performa Hari Ini</p>
            <div className="flex items-baseline justify-between mt-2">
              <div>
                <p className="text-2xl font-extrabold">{rupiah(todayStats.revenue)}</p>
                <p className="text-xs text-emerald-100/80 mt-0.5">{todayStats.count} Sesi booking masuk hari ini</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-moss-900/10 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-neutral-500 font-semibold mb-1">Performa Kemarin</p>
            <div className="flex items-baseline justify-between mt-2">
              <div>
                <p className="text-2xl font-extrabold text-neutral-900">{rupiah(yesterdayStats.revenue)}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{yesterdayStats.count} Sesi booking masuk kemarin</p>
              </div>
            </div>
          </div>
        </div>

        {/* GRAFIK BARU: TREN PENDAPATAN HARIAN (14 HARI TERAKHIR) */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-moss-900/10 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-neutral-900">Tren Pendapatan Harian</h3>
              <p className="text-xs text-neutral-500">Perbandingan pemasukan booking per hari (14 hari terakhir)</p>
            </div>
          </div>
          {dailyData.length > 0 ? (
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="dayLabel" fontSize={11} stroke="#888888" tickLine={false} />
                  <YAxis fontSize={11} stroke="#888888" tickLine={false} tickFormatter={(val) => `Rp${val / 1000}k`} />
                  <Tooltip 
                    formatter={(value) => [rupiah(value), 'Pendapatan']}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="pendapatanHarian" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-neutral-400 py-10 text-center">Belum ada data harian yang cukup untuk ditampilkan.</p>
          )}
        </div>

        {/* Grafik Utama: Tren Pendapatan Bulanan */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-moss-900/10 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-neutral-900">Tren Pendapatan Bulanan</h3>
              <p className="text-xs text-neutral-500">Akumulasi nilai kontrak (harga paket + extra charge) per bulan</p>
            </div>
          </div>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={monthlyFormatted}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="monthName" fontSize={12} stroke="#888888" tickLine={false} />
                <YAxis fontSize={12} stroke="#888888" tickLine={false} tickFormatter={(val) => `Rp${val / 1000}k`} />
                <Tooltip 
                  formatter={(value) => [rupiah(value), 'Pendapatan']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="totalPendapatan" fill="#065f46" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grid Bagian Bawah: Paket Terlaris & Performa Fotografer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-moss-900/10 shadow-sm">
            <h3 className="text-base font-bold text-neutral-900 mb-1">Pendapatan Berdasarkan Paket</h3>
            <p className="text-xs text-neutral-500 mb-4">Paket layanan yang paling diminati klien</p>
            
            <div className="space-y-4">
              {packageData.map((pkg, idx) => (
                <div key={pkg.name} className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <div>
                      <p className="text-sm font-semibold text-neutral-800">{pkg.name}</p>
                      <p className="text-xs text-neutral-500">{pkg.count} Sesi foto</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-moss-800">
                    {rupiah(pkg.revenue)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-moss-900/10 shadow-sm">
            <h3 className="text-base font-bold text-neutral-900 mb-1">Performa Fotografer</h3>
            <p className="text-xs text-neutral-500 mb-4">Jumlah sesi dan total fee tim fotografer</p>

            <div className="space-y-4">
              {photographerData.map((pho) => (
                <div key={pho.name} className="flex items-start justify-between gap-2 p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-moss-100 text-moss-800 flex items-center justify-center font-bold text-xs shrink-0">
                      {pho.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-neutral-800 truncate">{pho.name}</p>
                      <p className="text-xs text-neutral-500">{pho.sessions} Sesi Selesai</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-neutral-900">
                      {rupiah(pho.fee)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* POPUP MODAL: CATAT & KELOLA PRIVE */}
      {priveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-moss-900 text-base">Catat & Riwayat Prive (Tarik Pribadi)</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setPriveModalOpen(false)}
                className="h-8 w-8 p-0 rounded-full"
              >
                ✕
              </Button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-moss-900 block mb-1">Nominal Penarikan (Rp)</label>
                <input 
                  type="number" 
                  value={priveAmount} 
                  onChange={(e) => setPriveAmount(e.target.value)}
                  placeholder="Contoh: 150000"
                  className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white"
                />
              </div>
              <div>
                <label className="font-bold text-moss-900 block mb-1">Keterangan / Keperluan</label>
                <input 
                  type="text" 
                  value={priveNotes} 
                  onChange={(e) => setPriveNotes(e.target.value)}
                  placeholder="Contoh: Keperluan rumah / bensin"
                  className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white"
                />
              </div>
              <Button 
                onClick={handleSavePrive}
                disabled={loadingPrive}
                className="w-full bg-rose-700 hover:bg-rose-800 text-white text-xs h-10 rounded-xl font-medium"
              >
                {loadingPrive ? "Menyimpan..." : "Simpan Catatan Prive"}
              </Button>
            </div>

            <div className="pt-3 border-t space-y-2">
              <p className="font-bold text-moss-900 text-xs">Riwayat Prive Terbaru:</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {priveList.map((prv) => (
                  <div key={prv.prive_id} className="flex justify-between items-center p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 text-xs">
                    <div>
                      <p className="font-bold text-rose-700">{rupiah(prv.amount)}</p>
                      <p className="text-neutral-500 text-[10px]">{prv.notes} • {format(new Date(prv.created_at), "d MMM yyyy", { locale: id })}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDeletePrive(prv.prive_id)}
                      className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50 rounded-lg"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <Button 
                onClick={() => setPriveModalOpen(false)}
                className="w-full bg-moss-900 hover:bg-moss-800 text-white text-xs h-9 rounded-xl"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  );
}
