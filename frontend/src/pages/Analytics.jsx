import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, 
  PieChart, Pie, Cell 
} from 'recharts';
import { api } from '../lib/api';
import { AdminLayout } from '../components/AdminLayout';
import { TrendingUp, Wallet, Users, CalendarCheck, Package, AlertCircle } from 'lucide-react';

const COLORS = ['#065f46', '#047857', '#10b981', '#34d399', '#6ee7b7'];

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await api.get('/analytics/summary');
        setData(res.data);
      } catch (err) {
        console.error("Gagal memuat data analitik", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <AdminLayout title="Analisis & Grafik" subtitle="Memuat data laporan bisnis...">
        <div className="flex justify-center items-center py-24 text-neutral-400 text-sm">
          Menyiapkan grafik pendapatan...
        </div>
      </AdminLayout>
    );
  }

  // Format data bulanan agar rapi dibaca di sumbu X
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

  return (
    <AdminLayout title="Grafik & Analisis" subtitle="Tren omzet, performa paket, dan ringkasan bisnis Radeyaphoto">
      <div className="space-y-6 pb-12">
        
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-moss-900/10 shadow-sm">
            <div className="flex items-center gap-2 text-moss-800 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Omzet Kotor</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-neutral-900">
              Rp {Math.round(data?.total_turnover || 0).toLocaleString('id-ID')}
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-moss-900/10 shadow-sm">
            <div className="flex items-center gap-2 text-moss-800 mb-1">
              <Wallet className="h-4 w-4" />
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Kas Masuk Riil</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-moss-800">
              Rp {Math.round(data?.total_income || 0).toLocaleString('id-ID')}
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-moss-900/10 shadow-sm">
            <div className="flex items-center gap-2 text-moss-800 mb-1">
              <CalendarCheck className="h-4 w-4" />
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Total Sesi</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-neutral-900">
              {data?.total_bookings || 0} <span className="text-xs font-normal text-neutral-500">Booking</span>
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-moss-900/10 shadow-sm">
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <AlertCircle className="h-4 w-4" />
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Piutang</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-amber-600">
              Rp {Math.round(data?.outstanding || 0).toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        {/* Grafik Utama: Tren Pendapatan Bulanan */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-moss-900/10 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-neutral-900">Tren Pendapatan Bulanan</h3>
              <p className="text-xs text-neutral-500">Akumulasi nilai DP dan pelunasan per bulan</p>
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
            <p className="text-xs text-neutral-500 mb-4">Jumlah sesi dan kontribusi tim fotografer</p>

            <div className="space-y-4">
              {(data?.per_photographer || []).map((pho) => (
                <div key={pho.name} className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-moss-100 text-moss-800 flex items-center justify-center font-bold text-xs">
                      {pho.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-neutral-800">{pho.name}</p>
                      <p className="text-xs text-neutral-500">{pho.sessions} Sesi Selesai</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-neutral-900">
                      Rp {pho.revenue.toLocaleString('id-ID')}
                    </p>
                    {pho.fee_unpaid > 0 && (
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                        Fee belum dibayar: Rp {pho.fee_unpaid.toLocaleString('id-ID')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {(!data?.per_photographer || data.per_photographer.length === 0) && (
                <p className="text-sm text-neutral-400 text-center py-6">Belum ada data penugasan fotografer.</p>
              )}
            </div>
          </div>

        </div>

      </div>
    </AdminLayout>
  );
}
