import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api } from '../lib/api'; // sesuaikan path file axios/api Anda

export default function Analytics() {
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await api.get('/analytics/summary');
        // Format data agar total pendapatan (dp + full) tergabung untuk grafik
        const formatted = res.data.monthly.map(item => ({
          monthName: item.month, // contoh: "2026-08"
          totalPendapatan: item.dp + item.full,
          jumlahBooking: item.bookings
        }));
        setMonthlyData(formatted);
      } catch (err) {
        console.error("Gagal memuat data grafik", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) return <div className="p-4 text-center">Memuat grafik...</div>;

  return (
    <div className="p-4 max-w-md mx-auto bg-white min-h-screen pb-24">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Grafik Pendapatan</h2>
      <p className="text-sm text-gray-500 mb-6">Tren omzet bulanan Radeyaphoto</p>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="monthName" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(val) => `Rp${val / 1000}k`} />
              <Tooltip formatter={(value) => [`Rp ${value.toLocaleString('id-ID')}`, 'Pendapatan']} />
              <Bar dataKey="totalPendapatan" fill="#065f46" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
