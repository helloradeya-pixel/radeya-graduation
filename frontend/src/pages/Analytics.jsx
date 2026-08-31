import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts';
import { api } from '../lib/api';
import { AdminLayout } from '../components/AdminLayout';
import { TrendingUp, CalendarCheck, AlertCircle, Users, ArrowUpRight, CheckCircle2, Trash2, Landmark } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

// Komponen UI shadcn
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

const COLORS = ['#065f46', '#047857', '#10b981', '#34d399', '#6ee7b7'];

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
  const totalBookings = data?.total_bookings || 0;
  const totalFeeSudahBayar = (data?.photographer_fee_total || 0) - (data?.photographer_fee_unpaid || 0);
  const realAccountBalance = totalIncome - totalFeeSudahBayar;

  // Pengelompokan Keuangan Riil Rekening Per Tahun (Sinkron Total Global & Otomatis Full untuk Single Year)
  const yearlyMap = {};
  (data?.monthly || []).forEach(item => {
    const year = item.month ? item.month.split('-')[0] : '2026';
    if (!yearlyMap[year]) {
      yearlyMap[year] = { 
        year, 
        jumlahBooking: 0, 
        totalDp: 0, 
        totalPelunasan: 0 
      };
    }
    yearlyMap[year].jumlahBooking += (item.bookings || 0);
    yearlyMap[year].totalDp += (item.dp || 0);
    yearlyMap[year].totalPelunasan += (item.full || 0);
  });

  const yearlyData = Object.values(yearlyMap).map(y => {
    const isSingleYear = Object.keys(yearlyMap).length === 1;
    const omzetTahunIni = y.totalDp + y.totalPelunasan;
    const porsiTahun = isSingleYear ? 1 : (omzetTahunIni / (totalTurnover || 1));

    return {
      ...y,
      pendapatanKotor: omzetTahunIni,
      saldoRekeningRiil: isSingleYear ? realAccountBalance : realAccountBalance * porsiTahun,
      piutangBelumLunas: isSingleYear ? (data?.outstanding || 0) : (data?.outstanding || 0) * porsiTahun
    };
  }).sort((a, b) => a.year.localeCompare(b.year));

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

  const packageData = (data?.per_package || []).map(p => ({
    name: p.name,
    revenue: p.revenue,
    count: p.count
  }));

  // Menyaring agar "Belum Ditugaskan" atau string kosong tidak tampil di daftar performa fotografer
  const photographerData = (data?.per_photographer || []).filter(
    pho => pho.name && pho.name !== "Belum Ditugaskan" && pho.name.trim() !== ""
  );

  // Average Order Value (AOV) / Rata-rata nilai per booking aktif
  const activeBookingsCount = packageData.reduce((acc, curr) => acc + curr.count, 0);
  const averageOrderValue = activeBookingsCount > 0 ? totalTurnover / activeBookingsCount : 0;

  // Rasio Kas Cair (Kas Masuk / Omzet Kotor * 100)
  const cashCollectionRate = totalTurnover > 0 ? ((totalIncome / totalTurnover) * 100).toFixed(1) : 0;

  return (
    <AdminLayout title="Grafik & Analisis" subtitle="Laporan performa finansial, omzet, dan operasional Radeyaphoto">
      <div className="space-y-6 pb-12">
        
        {/* Tombol Akses Prive / Penarikan Pribadi di pojok atas halaman Analitik */}
        <div className="flex justify-end">
          <Button
            onClick={() => setPriveModalOpen(true)}
            variant="outline"
            className="bg-white rounded-xl border-moss-900/10 text-xs h-10 shadow-sm text-rose-700 hover:bg-rose-50 font-medium px-4"
          >
            - Catat Prive / Tarik Pribadi
          </Button>
        </div>

        {/* KPI Summary Cards - Fokus Saldo Rekening Nyata */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-moss-900/10 shadow-sm">
            <div className="flex items-center gap-2 text-moss-800 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Omzet Kotor</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-neutral-900">
              Rp {Math.round(totalTurnover).toLocaleString('id-ID')}
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-emerald-500/35 shadow-sm bg-emerald-50/20 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 text-emerald-700 mb-1">
              <Landmark className="h-4 w-4" />
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Saldo Rekening (BCA)</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-emerald-700">
              Rp {Math.round(realAccountBalance).toLocaleString('id-ID')}
            </p>
            <p className="text-[10px] text-emerald-600/80 mt-0.5">Uang masuk - Prive - Bayar FG</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-moss-900/10 shadow-sm">
            <div className="flex items-center gap-2 text-rose-700 mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Total Fee FG</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-rose-700">
              Rp {Math.round(data?.photographer_fee_total || 0).toLocaleString('id-ID')}
            </p>
            <p className="text-[10px] text-neutral-400 mt-0.5">Belum lunas: Rp {Math.round(data?.photographer_fee_unpaid || 0).toLocaleString('id-ID')}</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-moss-900/10 shadow-sm">
            <div className="flex items-center gap-2 text-moss-800 mb-1">
              <CalendarCheck className="h-4 w-4" />
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Total Sesi</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-neutral-900">
              {totalBookings} <span className="text-xs font-normal text-neutral-500">Booking</span>
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-moss-900/10 shadow-sm col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <AlertCircle className="h-4 w-4" />
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Piutang</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-amber-600">
              Rp {Math.round(data?.outstanding || 0).toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        {/* Baris Indikator Profesional & Kesehatan Keuangan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-moss-900/10 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Rata-rata Nilai Sesi (AOV)</p>
              <p className="text-xl font-extrabold text-moss-900">Rp {Math.round(averageOrderValue).toLocaleString('id-ID')}</p>
              <p className="text-[10px] text-neutral-400 mt-0.5">Belanja rata-rata per klien</p>
            </div>
            <div className="p-3 rounded-xl bg-moss-50 text-moss-800">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-moss-900/10 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Rasio Kas Cair</p>
              <p className="text-xl font-extrabold text-blue-700">{cashCollectionRate}%</p>
              <p className="text-[10px] text-neutral-400 mt-0.5">Persentase uang yang sudah masuk kas</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 text-blue-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* LAPORAN KEUANGAN REKENING PER TAHUN */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-moss-900/10 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-neutral-900">Rekap Keuangan Rekening Per Tahun</h3>
              <p className="text-xs text-neutral-500">Saldo bersih rekening nyata dan sisa piutang klien per tahun</p>
            </div>
          </div>
          {yearlyData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="text-left text-neutral-500 border-b border-neutral-100">
                    <th className="pb-3 font-semibold">Tahun</th>
                    <th className="pb-3 font-semibold">Sesi</th>
                    <th className="pb-3 font-semibold text-emerald-700">Saldo Rekening (BCA)</th>
                    <th className="pb-3 font-semibold text-amber-600 text-right">Piutang Belum Lunas</th>
                  </tr>
                </thead>
                <tbody>
                  {yearlyData.map((y) => (
                    <tr key={y.year} className="border-b border-neutral-50 last:border-0">
                      <td className="py-3.5 font-extrabold text-moss-900 text-sm">{y.year}</td>
                      <td className="py-3.5">{y.jumlahBooking} Sesi</td>
                      <td className="py-3.5 font-extrabold text-emerald-700 text-sm">
                        Rp {Math.round(y.saldoRekeningRiil).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3.5 text-right font-bold text-amber-600">
                        Rp {Math.round(y.piutangBelumLunas).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-neutral-400 py-6 text-center">Belum ada data rekap tahunan.</p>
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
                  formatter={(value) => [`Rp ${value.toLocaleString('id-ID')}`, 'Pendapatan']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="totalPendapatan" fill="#065f46" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grid Bagian Bawah: Paket Terlaris & Performa Fotografer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Kontribusi Paket */}
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
                    Rp {pkg.revenue.toLocaleString('id-ID')}
                  </p>
                </div>
              ))}
              {packageData.length === 0 && (
                <p className="text-sm text-neutral-400 text-center py-6">Belum ada data paket.</p>
              )}
            </div>
          </div>

          {/* Performa Fotografer */}
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
                      Rp {pho.fee.toLocaleString('id-ID')}
                    </p>
                    {pho.fee_unpaid > 0 && (
                      <div className="mt-1">
                        <span className="inline-block text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium leading-tight">
                          Belum dibayar: Rp {pho.fee_unpaid.toLocaleString('id-ID')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {photographerData.length === 0 && (
                <p className="text-sm text-neutral-400 text-center py-6">Belum ada data penugasan fotografer.</p>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* POPUP MODAL: CATAT & KELOLA PRIVE (TARIK PRIBADI) KHUSUS DI HALAMAN ANALITIK */}
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

            {/* Daftar Riwayat Prive */}
            <div className="pt-3 border-t space-y-2">
              <p className="font-bold text-moss-900 text-xs">Riwayat Prive Terbaru:</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {priveList.map((prv) => (
                  <div key={prv.prive_id} className="flex justify-between items-center p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 text-xs">
                    <div>
                      <p className="font-bold text-rose-700">Rp {Number(prv.amount).toLocaleString('id-ID')}</p>
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
                {priveList.length === 0 && (
                  <p className="text-center text-neutral-400 text-[11px] py-4">Belum ada catatan prive.</p>
                )}
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
