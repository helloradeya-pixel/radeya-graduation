import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api } from '../lib/api';
import { AdminLayout } from '../components/AdminLayout';

export default function Analytics() {
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await api.get('/analytics/summary');
        const formatted = res.data.monthly.map(item => {
          // Mengubah format "2026-08" menjadi format yang lebih rapi, misal "Agu 2026"
          let displayMonth = item.month;
          try {
            const [year, month] = item.month.split('-');
            const dateObj = new Date(year, month - 1, 1);
            displayMonth = dateObj.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
          } catch (e) {
            // fallback jika gagal parsing
          }

          return {
            monthName: displayMonth,
            totalPendapatan: item.dp + item.full,
            jumlahBooking: item.bookings
          };
        });
        setMonthlyData(formatted);
      } catch (err) {
        console.error("Gagal memuat data grafik", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  return (
    <AdminLayout title="Grafik Pendapatan" subtitle="Analisis tren omzet bulanan Radeyaphoto">
      {loading ? (
        <div className="text-center py-12 text-neutral-500 text-sm">Memuat grafik...</div>
      ) : (
        <div className="bg-white p-5 rounded-2xl border border-moss-900/10 shadow-sm max-w-xl">
          <h3 className="text-sm font-semibold text-neutral-800 mb-4">Total Pendapatan per Bulan</h3>
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="monthName" fontSize={12} stroke="#888888" />
                <YAxis fontSize={12} stroke="#888888" tickFormatter={(val) => `Rp${val / 1000}k`} />
                <Tooltip formatter={(value) => [`Rp ${value.toLocaleString('id-ID')}`, 'Pendapatan']} />
                <Bar dataKey="totalPendapatan" fill="#065f46" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
