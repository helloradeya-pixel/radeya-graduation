import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts';
import { api } from '../lib/api';
import { AdminLayout } from '../components/AdminLayout';
import { TrendingUp, CalendarCheck, Users, ArrowUpRight, CheckCircle2, Trash2, Landmark, Clock, Camera, ExternalLink } from 'lucide-react';
import { format, subDays, isSameDay, parseISO } from 'date-fns';
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

  // State untuk Modal Detail Klien saat nama diklik
  const [selectedClientModal, setSelectedClientModal] = useState(false);
  const [activeClient, setActiveClient] = useState(null);

  // State untuk preview modal gambar bukti transfer
  const [previewImage, setPreviewImage] = useState(null);

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

  // Fungsi untuk membuka modal detail klien
  const handleOpenClientDetail = (client) => {
    setActiveClient(client);
    setSelectedClientModal(true);
  };

  // Helper function untuk membersihkan dan memformat nomor WhatsApp agar valid (mengganti 0 dengan 62)
  const formatWhatsAppUrl = (phone) => {
    if (!phone) return '#';
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('0')) {
      clean = '62' + clean.slice(1);
    }
    return `https://wa.me/${clean}`;
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

  // --- FILTER CLOSING FORM HARI INI & KEMARIN BERDASARKAN created_at ---
  const allBookings = data?.recent_bookings || [];
  
  const todayDate = new Date();
  const yesterdayDate = subDays(todayDate, 1);

  const todayClosings = allBookings.filter(item => {
    if (!item.created_at) return false;
    try {
      const itemDate = parseISO(item.created_at);
      return isSameDay(itemDate, todayDate);
    } catch {
      return false;
    }
  });

  const yesterdayClosings = allBookings.filter(item => {
    if (!item.created_at) return false;
    try {
      const itemDate = parseISO(item.created_at);
      return isSameDay(itemDate, yesterdayDate);
    } catch {
      return false;
    }
  });

  const todayRevenue = todayClosings.reduce((acc, curr) => acc + (curr.amount_paid || 0), 0);
  const yesterdayRevenue = yesterdayClosings.reduce((acc, curr) => acc + (curr.amount_paid || 0), 0);

  // Perhitungan Keuangan Riil Rekening Global
  const totalTurnover = data?.total_turnover || 0;
  const totalIncome = data?.total_income || 0;
  const totalBookings = data?.total_bookings || 0;
  const totalFeeSudahBayar = (data?.photographer_fee_total || 0) - (data?.photographer_fee_unpaid || 0);
  const realAccountBalance = totalIncome - totalFeeSudahBayar;

  // Perhitungan Dana Aman / Laba Bersih untuk Prive
  const safePriveLimit = realAccountBalance - (data?.photographer_fee_unpaid || 0);

  // Pengelompokan Keuangan Riil Rekening Per Tahun
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

  const photographerData = (data?.per_photographer || []).filter(
    pho => pho.name && pho.name !== "Belum Ditugaskan" && pho.name.trim() !== ""
  );

  const activeBookingsCount = packageData.reduce((acc, curr) => acc + curr.count, 0);
  const averageOrderValue = activeBookingsCount > 0 ? totalTurnover / activeBookingsCount : 0;
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

        {/* SECTION KHUSUS: MONITORING CLOSING FORM HARI INI & KEMARIN */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Card Closing Hari Ini */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50/40 p-5 rounded-2xl border border-emerald-500/30 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-emerald-800">
                <CalendarCheck className="h-5 w-5 text-emerald-700" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">Closing Form Hari Ini</span>
              </div>
              <span className="text-[10px] bg-emerald-200/60 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full">
                {format(todayDate, 'd MMM yyyy', { locale: id })}
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <div>
                <p className="text-2xl font-black text-emerald-900">{todayClosings.length} <span className="text-xs font-semibold text-neutral-600">Orang / Klien</span></p>
                <p className="text-xs text-emerald-700 font-medium mt-0.5">Pendapatan Masuk: Rp {Math.round(todayRevenue).toLocaleString('id-ID')}</p>
              </div>
            </div>
            {todayClosings.length > 0 && (
              <div className="mt-3 pt-3 border-t border-emerald-500/15 flex flex-wrap gap-1.5">
                {todayClosings.map((tc, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => handleOpenClientDetail(tc)}
                    className="inline-flex items-center gap-1 bg-white/95 hover:bg-emerald-100 text-emerald-900 text-[10px] px-2.5 py-1 rounded-lg border border-emerald-500/25 font-semibold transition-colors text-left cursor-pointer shadow-xs"
                  >
                    <Clock className="h-3 w-3 text-emerald-600 shrink-0" />
                    <span>{format(parseISO(tc.created_at), 'HH:mm')} WIB - {tc.full_name} ({tc.package_name})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Card Closing Hari Sebelumnya (Kemarin) */}
          <div className="bg-white p-5 rounded-2xl border border-moss-900/10 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-neutral-700">
                <Clock className="h-5 w-5 text-neutral-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">Closing Form Kemarin</span>
              </div>
              <span className="text-[10px] bg-neutral-100 text-neutral-600 font-semibold px-2.5 py-0.5 rounded-full">
                {format(yesterdayDate, 'd MMM yyyy', { locale: id })}
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <div>
                <p className="text-2xl font-black text-neutral-900">{yesterdayClosings.length} <span className="text-xs font-semibold text-neutral-500">Orang / Klien</span></p>
                <p className="text-xs text-neutral-600 font-medium mt-0.5">Pendapatan Masuk: Rp {Math.round(yesterdayRevenue).toLocaleString('id-ID')}</p>
              </div>
            </div>
            {yesterdayClosings.length > 0 && (
              <div className="mt-3 pt-3 border-t border-neutral-100 flex flex-wrap gap-1.5">
                {yesterdayClosings.map((yc, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => handleOpenClientDetail(yc)}
                    className="inline-flex items-center gap-1 bg-neutral-50 hover:bg-neutral-100 text-neutral-800 text-[10px] px-2.5 py-1 rounded-lg border border-neutral-200 font-semibold transition-colors text-left cursor-pointer shadow-xs"
                  >
                    <Clock className="h-3 w-3 text-neutral-400 shrink-0" />
                    <span>{format(parseISO(yc.created_at), 'HH:mm')} WIB - {yc.full_name} ({yc.package_name})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-moss-900/10 shadow-sm">
            <div className="flex items-center gap-2 text-moss-800 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Omzet Kotor</span>
            </div>
            <p className="text-sm sm:text-lg font-bold text-neutral-900">
              Rp {Math.round(totalTurnover).toLocaleString('id-ID')}
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-emerald-500/35 shadow-sm bg-emerald-50/20">
            <div className="flex items-center gap-2 text-emerald-700 mb-1">
              <Landmark className="h-4 w-4" />
              <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Saldo Rekening</span>
            </div>
            <p className="text-sm sm:text-lg font-bold text-emerald-700">
              Rp {Math.round(realAccountBalance).toLocaleString('id-ID')}
            </p>
            <p className="text-[9px] text-emerald-600/80 mt-0.5">Uang masuk - Prive - Bayar FG</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-indigo-500/35 shadow-sm bg-indigo-50/20">
            <div className="flex items-center gap-2 text-indigo-700 mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-[11px] font-semibold text-indigo-800 uppercase tracking-wider">Aman Ditarik</span>
            </div>
            <p className={`text-sm sm:text-lg font-bold ${safePriveLimit < 0 ? 'text-rose-600' : 'text-indigo-700'}`}>
              Rp {Math.round(safePriveLimit).toLocaleString('id-ID')}
            </p>
            <p className="text-[9px] text-indigo-600/80 mt-0.5">Saldo min. utang fee FG</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-moss-900/10 shadow-sm">
            <div className="flex items-center gap-2 text-rose-700 mb-1">
              <Users className="h-4 w-4" />
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Total Fee FG</span>
            </div>
            <p className="text-sm sm:text-lg font-bold text-rose-700">
              Rp {Math.round(data?.photographer_fee_total || 0).toLocaleString('id-ID')}
            </p>
            <p className="text-[9px] text-neutral-400 mt-0.5">Belum lunas: Rp {Math.round(data?.photographer_fee_unpaid || 0).toLocaleString('id-ID')}</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-moss-900/10 shadow-sm">
            <div className="flex items-center gap-2 text-moss-800 mb-1">
              <CalendarCheck className="h-4 w-4" />
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Total Sesi</span>
            </div>
            <p className="text-sm sm:text-lg font-bold text-neutral-900">
              {totalBookings} <span className="text-xs font-normal text-neutral-500">Booking</span>
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-moss-900/10 shadow-sm">
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <Users className="h-4 w-4" />
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Piutang</span>
            </div>
            <p className="text-sm sm:text-lg font-bold text-amber-600">
              Rp {Math.round(data?.outstanding || 0).toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        {/* Indikator Profesional */}
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
                    <th className="pb-3 font-semibold w-24">Tahun</th>
                    <th className="pb-3 font-semibold">Sesi</th>
                    <th className="pb-3 font-semibold text-emerald-700">Saldo Rekening (BCA)</th>
                    <th className="pb-3 font-semibold text-amber-600 text-right">Piutang Belum Lunas</th>
                  </tr>
                </thead>
                <tbody>
                  {yearlyData.map((y) => (
                    <tr key={y.year} className="border-b border-neutral-50 last:border-0">
                      <td className="py-3.5 font-extrabold text-moss-900 text-sm">{y.year}</td>
                      <td className="py-3.5 text-neutral-600 font-medium">{y.jumlahBooking} Sesi</td>
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

        {/* Grid Bagian Bawah */}
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
                    Rp {pkg.revenue.toLocaleString('id-ID')}
                  </p>
                </div>
              ))}
              {packageData.length === 0 && (
                <p className="text-sm text-neutral-400 text-center py-6">Belum ada data paket.</p>
              )}
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
                loading={loadingPrive}
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

      {/* POPUP MODAL DETAIL KLIEN SAAT NAMA DIKLIK */}
      {selectedClientModal && activeClient && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-moss-900 text-base">{activeClient.full_name}</h3>
                <p className="text-[11px] text-neutral-500">Invoice: {activeClient.invoice_number || '-'}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedClientModal(false)}
                className="h-8 w-8 p-0 rounded-full"
              >
                ✕
              </Button>
            </div>

            <div className="space-y-2.5 text-xs text-neutral-700">
              <div className="flex justify-between p-2 rounded-xl bg-neutral-50">
                <span className="text-neutral-500">Paket Layanan:</span>
                <span className="font-bold text-moss-900">{activeClient.package_name}</span>
              </div>
              <div className="flex justify-between p-2 rounded-xl bg-neutral-50">
                <span className="text-neutral-500">Kampus / Prodi:</span>
                <span className="font-medium">{activeClient.university || '-'} / {activeClient.study || '-'}</span>
              </div>
              <div className="flex justify-between p-2 rounded-xl bg-neutral-50">
                <span className="text-neutral-500">Fotografer Bertugas:</span>
                <span className="font-bold text-moss-900 flex items-center gap-1">
                  <Camera className="h-3.5 w-3.5 text-emerald-700" />
                  {activeClient.photographer_name || activeClient.photographer || 'Belum Ditugaskan'}
                </span>
              </div>
              <div className="flex justify-between p-2 rounded-xl bg-neutral-50">
                <span className="text-neutral-500">Jadwal Foto:</span>
                <span className="font-medium">{activeClient.shoot_date} ({activeClient.start_time} - {activeClient.end_time})</span>
              </div>
              <div className="flex justify-between p-2 rounded-xl bg-neutral-50">
                <span className="text-neutral-500">Lokasi:</span>
                <span className="font-medium">{activeClient.location || '-'}</span>
              </div>
              <div className="flex justify-between p-2 rounded-xl bg-neutral-50">
                <span className="text-neutral-500">WhatsApp:</span>
                <a href={formatWhatsAppUrl(activeClient.whatsapp)} target="_blank" rel="noreferrer" className="font-bold text-emerald-700 underline">
                  {activeClient.whatsapp}
                </a>
              </div>
              <div className="flex justify-between p-2 rounded-xl bg-emerald-50/50 border border-emerald-500/20">
                <span className="text-emerald-800 font-semibold">Pembayaran ({activeClient.payment_type?.toUpperCase()}):</span>
                <span className="font-bold text-emerald-900">Rp {Number(activeClient.amount_paid || 0).toLocaleString('id-ID')}</span>
              </div>
            </div>

            {/* Tombol Lihat Bukti Transfer */}
            {activeClient.proof_file_id && (
              <Button 
                onClick={() => {
                  const proofVal = activeClient.proof_file_id;
                  if (typeof proofVal === "string" && (proofVal.startsWith("http://") || proofVal.startsWith("https://"))) {
                    setPreviewImage(proofVal);
                  } else {
                    const backendBase = api.defaults.baseURL ? api.defaults.baseURL.replace(/\/api$/, "") : window.location.origin;
                    setPreviewImage(`${backendBase}/api/files/${proofVal}`);
                  }
                }}
                variant="outline"
                className="w-full border-moss-900/20 text-moss-900 hover:bg-moss-50 text-xs h-10 rounded-xl flex items-center justify-center gap-2 font-medium"
              >
                <ExternalLink className="h-4 w-4" /> Lihat Bukti Transfer
              </Button>
            )}

            <div className="pt-2">
              <Button 
                onClick={() => setSelectedClientModal(false)}
                className="w-full bg-moss-900 hover:bg-moss-800 text-white text-xs h-9 rounded-xl"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL PREVIEW GAMBAR BUKTI TRANSFER */}
      {previewImage && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-4 shadow-2xl space-y-3 relative flex flex-col items-center">
            <div className="w-full flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-moss-900 text-sm">Bukti Transfer</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setPreviewImage(null)}
                className="h-7 w-7 p-0 rounded-full"
              >
                ✕
              </Button>
            </div>
            <div className="w-full max-h-[70vh] overflow-auto flex justify-center items-center bg-neutral-100 rounded-xl p-2">
              <img 
                src={previewImage} 
                alt="Bukti Transfer" 
                className="max-h-[60vh] object-contain rounded-lg"
                onError={() => {
                  toast.error("Gagal memuat gambar bukti transfer");
                }}
              />
            </div>
            <div className="w-full flex gap-2 pt-2">
              <Button 
                variant="outline"
                onClick={() => window.open(previewImage, "_blank")}
                className="w-1/2 text-xs h-9 rounded-xl"
              >
                Buka di Tab Baru
              </Button>
              <Button 
                onClick={() => setPreviewImage(null)}
                className="w-1/2 bg-moss-900 hover:bg-moss-800 text-white text-xs h-9 rounded-xl"
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
