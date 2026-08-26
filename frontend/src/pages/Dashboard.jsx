import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "../components/AdminLayout";
import { api, rupiah } from "../lib/api";
import { toast } from "sonner";
import { TrendingUp, Wallet, Users, Calendar as CalendarIcon, DollarSign, MessageSquare, Mail, Settings, ExternalLink, Save, ArrowLeft, Trash2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
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

  // State untuk popup rincian klien fotografer & detail booking spesifik
  const [selectedPhotographer, setSelectedPhotographer] = useState(null);
  const [selectedBookingDetail, setSelectedBookingDetail] = useState(null);
  const [, setLoadingBooking] = useState(false);

  // State tambahan untuk Mode Edit Langsung di dalam Popup
  const [isEditing, setIsEditing] = useState(false);
  const [photographersList, setPhotographersList] = useState([]);
  const [editForm, setEditForm] = useState({
    status: "",
    payment_type: "",
    amount_paid: 0,
    photographer_id: "",
    photographer_fee: 0,
    photographer_paid: false,
    extra_charge: 0,
    extra_note: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Fungsi load data berdasarkan rentang tanggal ke backend
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
    // Load daftar fotografer untuk pilihan dropdown edit
    api.get("/photographers").then((res) => {
      setPhotographersList(res.data || []);
    }).catch(() => {});
  }, [loadAnalytics]);

  // Fungsi untuk mengambil detail booking saat nama klien diklik
  const handleClientClick = async (bookingId) => {
    if (!bookingId) {
      toast.error("ID Booking tidak ditemukan");
      return;
    }
    setLoadingBooking(true);
    try {
      const { data: res } = await api.get(`/bookings/${bookingId}`);
      setSelectedBookingDetail(res);
      setEditForm({
        status: res.status || "pending",
        payment_type: res.payment_type || "dp",
        amount_paid: res.amount_paid || 0,
        photographer_id: res.photographer_id || "none",
        photographer_fee: res.photographer_fee || 0,
        photographer_paid: res.photographer_paid || false,
        extra_charge: res.extra_charge || 0,
        extra_note: res.extra_note || "",
      });
      setIsEditing(false); // Reset ke mode lihat
    } catch {
      toast.error("Gagal memuat detail booking");
    } finally {
      setLoadingBooking(false);
    }
  };

  // Fungsi untuk menyimpan perubahan data booking langsung dari popup
  const handleSaveEdit = async () => {
    if (!selectedBookingDetail) return;
    setSavingEdit(true);
    try {
      const payload = {
        status: editForm.status,
        payment_type: editForm.payment_type,
        amount_paid: parseFloat(editForm.amount_paid) || 0,
        photographer_id: editForm.photographer_id === "none" ? null : editForm.photographer_id,
        photographer_fee: parseFloat(editForm.photographer_fee) || 0,
        photographer_paid: editForm.photographer_paid,
        extra_charge: parseFloat(editForm.extra_charge) || 0,
        extra_note: editForm.extra_note,
      };

      const { data: res } = await api.put(`/bookings/${selectedBookingDetail.booking_id}`, payload);
      setSelectedBookingDetail(res);
      setIsEditing(false);
      toast.success("Perubahan booking berhasil disimpan!");
      loadAnalytics(); // Refresh ringkasan finansial di belakang
    } catch {
      toast.error("Gagal menyimpan perubahan booking");
    } finally {
      setSavingEdit(false);
    }
  };

  // Fungsi untuk menghapus booking dari popup
  const handleDeleteBooking = async (bookingId) => {
    if (!confirm("Apakah Anda yakin ingin menghapus booking ini?")) return;
    try {
      await api.delete(`/bookings/${bookingId}`);
      toast.success("Booking berhasil dihapus");
      setSelectedBookingDetail(null);
      setSelectedPhotographer(null);
      loadAnalytics();
    } catch {
      toast.error("Gagal menghapus booking");
    }
  };

  // Tombol Shortcut Cepat (Gaya Meta Ads)
  const handlePreset = (preset) => {
    const today = new Date();
    if (preset === "all") {
      setDateRange({ from: undefined, to: undefined });
    } else if (preset === "today") {
      setDateRange({ from: today, to: today });
    } else if (preset === "lastMonth") {
      const lastMonthDate = subMonths(today, 1);
      setDateRange({
        from: startOfMonth(lastMonthDate),
        to: endOfMonth(lastMonthDate),
      });
    } else if (preset === "thisMonth") {
      setDateRange({ from: startOfMonth(today), to: endOfMonth(today) });
    } else if (preset === "nextMonth") {
      const nextMonthDate = addMonths(today, 1);
      setDateRange({
        from: startOfMonth(nextMonthDate),
        to: endOfMonth(nextMonthDate),
      });
    }
    setIsOpen(false);
  };

  return (
    <AdminLayout title="Ringkasan Finansial" subtitle="Analisis pendapatan & rincian fee fotografer">
      <div className="space-y-4 pb-20">
        
        {/* Filter Rentang Tanggal (Date Range Picker ala Meta Ads) */}
        <div className="flex justify-end">
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full sm:w-[280px] justify-start text-left font-normal bg-white rounded-xl border-moss-900/10 text-xs h-10 shadow-sm",
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
            <PopoverContent className="w-auto p-0 bg-white z-50 shadow-xl rounded-2xl border border-moss-900/10" align="end">
              <div className="flex flex-col sm:flex-row">
                <div className="p-3 border-b sm:border-b-0 sm:border-r border-neutral-100 flex flex-col gap-1.5 min-w-[140px]">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase px-2 mb-1">Periode Cepat</p>
                  <Button variant="ghost" size="sm" className="justify-start text-xs h-8 px-2 font-normal hover:bg-moss-50" onClick={() => handlePreset("today")}>
                    Hari Ini
                  </Button>
                  <Button variant="ghost" size="sm" className="justify-start text-xs h-8 px-2 font-normal hover:bg-moss-50" onClick={() => handlePreset("lastMonth")}>
                    Bulan Lalu
                  </Button>
                  <Button variant="ghost" size="sm" className="justify-start text-xs h-8 px-2 font-normal hover:bg-moss-50" onClick={() => handlePreset("thisMonth")}>
                    Bulan Ini
                  </Button>
                  <Button variant="ghost" size="sm" className="justify-start text-xs h-8 px-2 font-normal hover:bg-moss-50" onClick={() => handlePreset("nextMonth")}>
                    Bulan Berikutnya
                  </Button>
                  <Button variant="ghost" size="sm" className="justify-start text-xs h-8 px-2 font-normal hover:bg-moss-50 text-rose-600" onClick={() => handlePreset("all")}>
                    Semua Waktu
                  </Button>
                </div>

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
                  <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">Net Profit Bersih (Potensi Omzet)</p>
                  <div className="p-2 rounded-xl bg-white/10 text-white"><DollarSign className="h-4 w-4" /></div>
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold mt-2 text-white">
                  {rupiah(data.net_profit_accrual ?? data.net_profit)}
                </p>
                <p className="text-[11px] text-white/80 mt-1">Estimasi bersih jika semua piutang lunas dikurangi fee fotografer</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-moss-900/10 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Omzet Kotor</p>
                    <div className="p-1.5 rounded-lg bg-moss-50 text-moss-700"><TrendingUp className="h-3.5 w-3.5" /></div>
                  </div>
                  <p className="text-xl font-bold text-moss-900 mt-2">{rupiah(data.total_turnover || 0)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Akumulasi seluruh nilai kontrak</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-moss-900/10 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Kas Masuk (Aktual)</p>
                    <div className="p-1.5 rounded-lg bg-green-50 text-green-700"><Wallet className="h-3.5 w-3.5" /></div>
                  </div>
                  <p className="text-xl font-bold text-green-700 mt-2">{rupiah(data.total_income)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Uang riil DP & Pelunasan di kas</p>
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
              <p className="text-[11px] text-muted-foreground mb-3">Klik nama fotografer untuk melihat daftar klien & jadwal sesi.</p>
              
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
                      <tr 
                        key={p.name} 
                        onClick={() => setSelectedPhotographer(p)}
                        className="border-b border-neutral-50 last:border-0 hover:bg-moss-50/50 cursor-pointer transition-colors"
                      >
                        <td className="py-3 font-semibold text-moss-900 underline decoration-moss-300 underline-offset-2">
                          {p.name}
                        </td>
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

      {/* POPUP 1: DAFTAR KLIEN & JADWAL FOTOGRAFER */}
      {selectedPhotographer && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-moss-900 text-base">Jadwal Sesi: {selectedPhotographer.name}</h3>
                <p className="text-xs text-muted-foreground">Total {selectedPhotographer.sessions} sesi ditangani</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedPhotographer(null)}
                className="h-8 w-8 p-0 rounded-full"
              >
                ✕
              </Button>
            </div>

            <div className="space-y-3">
              {selectedPhotographer.clients && selectedPhotographer.clients.length > 0 ? (
                selectedPhotographer.clients.map((client, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => handleClientClick(client.booking_id)}
                    className="p-3 rounded-xl border border-neutral-100 bg-neutral-50 hover:bg-moss-50/60 cursor-pointer flex justify-between items-center text-xs sm:text-sm transition-colors"
                  >
                    <div>
                      <p className="font-bold text-moss-900 underline decoration-moss-300">{client.client_name}</p>
                      <p className="text-muted-foreground text-[11px]">{client.package_name} • {client.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-moss-800">{rupiah(client.fee)}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${client.is_paid ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'}`}>
                        {client.is_paid ? 'Fee Lunas' : 'Belum Lunas'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">
                  Belum ada data klien untuk fotografer ini pada periode tersebut.
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t">
              <Button 
                size="sm" 
                onClick={() => setSelectedPhotographer(null)}
                className="bg-moss-900 text-white hover:bg-moss-800 text-xs h-9 px-4 rounded-xl"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP 2: DETAIL INFORMASI & FORM EDIT BOOKING LENGKAP */}
      {selectedBookingDetail && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-moss-900 text-base">
                {isEditing ? "Edit Data Booking" : "Detail Informasi Booking"}
              </h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { setSelectedBookingDetail(null); setIsEditing(false); }}
                className="h-8 w-8 p-0 rounded-full"
              >
                ✕
              </Button>
            </div>

            {/* KONDISI TAMPILAN: JIKA SEDANG EDIT ATAU LIHAT */}
            {!isEditing ? (
              <>
                {/* Kotak Rincian Informasi */}
                <div className="p-4 rounded-2xl border border-moss-900/10 bg-neutral-50/50 space-y-2 text-xs sm:text-sm">
                  <p><span className="font-bold text-moss-900">No. Invoice:</span> {selectedBookingDetail.invoice_number}</p>
                  <p><span className="font-bold text-moss-900">Nama Client:</span> {selectedBookingDetail.full_name}</p>
                  <p><span className="font-bold text-moss-900">WhatsApp:</span> {selectedBookingDetail.whatsapp}</p>
                  <p><span className="font-bold text-moss-900">Kampus / Jurusan:</span> {selectedBookingDetail.university} — {selectedBookingDetail.study}</p>
                  <p><span className="font-bold text-moss-900">Paket Foto:</span> {selectedBookingDetail.package_name} ({rupiah(selectedBookingDetail.package_price)})</p>
                  <p><span className="font-bold text-moss-900">Jadwal Sesi:</span> {selectedBookingDetail.shoot_date} ({selectedBookingDetail.start_time} - {selectedBookingDetail.end_time} WIB)</p>
                  <p><span className="font-bold text-moss-900">Lokasi:</span> {selectedBookingDetail.location}</p>
                  <p><span className="font-bold text-moss-900">Status Booking:</span> <span className="text-moss-700 font-bold uppercase">{selectedBookingDetail.status}</span></p>
                  <p><span className="font-bold text-moss-900">Status Pembayaran:</span> <span className="uppercase font-bold">{selectedBookingDetail.payment_type}</span> ({rupiah(selectedBookingDetail.amount_paid)} dibayar)</p>
                  <p><span className="font-bold text-moss-900">Fotografer:</span> {selectedBookingDetail.photographer_name || "Belum Ditugaskan"}</p>
                  <p><span className="font-bold text-moss-900">Fee Fotografer:</span> {rupiah(selectedBookingDetail.photographer_fee)} ({selectedBookingDetail.photographer_paid ? "Fee Lunas" : "Belum Lunas"})</p>
                </div>

                {/* Tombol Aksi Cepat */}
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    onClick={() => window.open(selectedBookingDetail.whatsapp_link || `https://wa.me/${selectedBookingDetail.whatsapp}`, "_blank")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-10 rounded-xl flex items-center justify-center gap-1.5 font-medium"
                  >
                    <MessageSquare className="h-4 w-4" /> WA
                  </Button>
                  <Button 
                    onClick={() => window.open(`mailto:${selectedBookingDetail.email}`, "_blank")}
                    variant="outline"
                    className="border-neutral-200 hover:bg-neutral-100 text-xs h-10 rounded-xl flex items-center justify-center gap-1.5 font-medium"
                  >
                    <Mail className="h-4 w-4" /> Email
                  </Button>
                  <Button 
                    onClick={() => setIsEditing(true)}
                    className="bg-moss-900 hover:bg-moss-800 text-white text-xs h-10 rounded-xl flex items-center justify-center gap-1.5 font-medium"
                  >
                    <Settings className="h-4 w-4" /> Kelola
                  </Button>
                </div>

                {/* Tombol Bukti Transfer */}
                {selectedBookingDetail.proof_file_id && (
                  <Button 
                    onClick={() => window.open(`/api/files/${selectedBookingDetail.proof_file_id}`, "_blank")}
                    variant="outline"
                    className="w-full border-moss-900/20 text-moss-900 hover:bg-moss-50 text-xs h-10 rounded-xl flex items-center justify-center gap-2 font-medium"
                  >
                    <ExternalLink className="h-4 w-4" /> Lihat Bukti Transfer Asli
                  </Button>
                )}

                {/* Tombol Tutup */}
                <div className="pt-2">
                  <Button 
                    onClick={() => setSelectedBookingDetail(null)}
                    className="w-full bg-moss-900 hover:bg-moss-800 text-white text-xs h-10 rounded-xl"
                  >
                    Tutup
                  </Button>
                </div>
              </>
            ) : (
              /* FORM EDIT LENGKAP SEPERTI DI DATABASE */
              <div className="space-y-3 text-xs sm:text-sm">
                <div>
                  <label className="font-bold text-moss-900 block mb-1">Status Booking</label>
                  <select 
                    value={editForm.status} 
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white text-xs"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-moss-900 block mb-1">Status Pembayaran</label>
                  <select 
                    value={editForm.payment_type} 
                    onChange={(e) => setEditForm({ ...editForm, payment_type: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white text-xs"
                  >
                    <option value="dp">DP (Down Payment)</option>
                    <option value="full">Full (Lunas)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-moss-900 block mb-1">Extra Charge (Rp)</label>
                    <input 
                      type="number" 
                      value={editForm.extra_charge} 
                      onChange={(e) => setEditForm({ ...editForm, extra_charge: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white text-xs"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-moss-900 block mb-1">Keterangan Extra</label>
                    <input 
                      type="text" 
                      value={editForm.extra_note} 
                      onChange={(e) => setEditForm({ ...editForm, extra_note: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white text-xs"
                      placeholder="Misal: Extra Time"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-moss-900 block mb-1">Tugaskan Fotografer</label>
                  <select 
                    value={editForm.photographer_id} 
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const foundPho = photographersList.find(p => p.photographer_id === selectedId);
                      setEditForm({ 
                        ...editForm, 
                        photographer_id: selectedId,
                        photographer_fee: foundPho ? foundPho.fee_per_session : editForm.photographer_fee
                      });
                    }}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white text-xs"
                  >
                    <option value="none">-- Belum Ditugaskan --</option>
                    {photographersList.map((pho) => (
                      <option key={pho.photographer_id} value={pho.photographer_id}>
                        {pho.name} (Fee: {rupiah(pho.fee_per_session)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-moss-900 block mb-1">Fee Fotografer Sesi Ini (Rp)</label>
                  <input 
                    type="number" 
                    value={editForm.photographer_fee} 
                    onChange={(e) => setEditForm({ ...editForm, photographer_fee: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white text-xs"
                  />
                </div>

                {/* Kotak Centang Fee Fotografer Sudah Dibayar */}
                <div className="flex items-center gap-2 p-2.5 rounded-xl border border-neutral-200 bg-neutral-50">
                  <input 
                    type="checkbox" 
                    id="pho_paid_checkbox"
                    checked={editForm.photographer_paid}
                    onChange={(e) => setEditForm({ ...editForm, photographer_paid: e.target.checked })}
                    className="h-4 w-4 rounded border-neutral-300 text-moss-900 focus:ring-moss-800"
                  />
                  <label htmlFor="pho_paid_checkbox" className="text-xs font-semibold text-moss-900 cursor-pointer">
                    Fee Fotografer Sudah Dibayar (Lunas)
                  </label>
                </div>

                <div>
                  <label className="font-bold text-moss-900 block mb-1">Jumlah Total Sudah Dibayar (Rp)</label>
                  <input 
                    type="number" 
                    value={editForm.amount_paid} 
                    onChange={(e) => setEditForm({ ...editForm, amount_paid: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white text-xs"
                  />
                </div>

                {/* Tombol Lihat Bukti Transfer & Hapus Booking */}
                <div className="flex items-center justify-between pt-1">
                  {selectedBookingDetail.proof_file_id && (
                    <button 
                      type="button"
                      onClick={() => window.open(`/api/files/${selectedBookingDetail.proof_file_id}`, "_blank")}
                      className="text-xs text-moss-800 font-semibold underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Lihat Bukti Transfer Asli
                    </button>
                  )}
                  <button 
                    type="button"
                    onClick={() => handleDeleteBooking(selectedBookingDetail.booking_id)}
                    className="text-xs text-rose-600 font-semibold flex items-center gap-1 ml-auto"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Hapus Booking
                  </button>
                </div>

                {/* Tombol Simpan & Batal */}
                <div className="space-y-2 pt-2">
                  <Button 
                    onClick={handleSaveEdit}
                    disabled={savingEdit}
                    className="w-full bg-moss-900 hover:bg-moss-800 text-white text-xs h-10 rounded-xl font-medium"
                  >
                    {savingEdit ? "Menyimpan..." : <><Save className="h-4 w-4 mr-1.5" /> Simpan Perubahan</>}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    className="w-full border-neutral-200 text-xs h-10 rounded-xl font-medium"
                  >
                    Batal
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
