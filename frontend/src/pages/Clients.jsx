import { useEffect, useState, useCallback } from "react";
import { Search, Mail, Eye, Trash2, MessageSquare, Table, Calendar as CalendarIcon, MapPin, Clock, User, ExternalLink } from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";
import { api, rupiah, fmtDate } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Calendar } from "../components/ui/calendar";
import { toast } from "sonner";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "../lib/utils";

export default function Clients() {
  const [bookings, setBookings] = useState([]);
  const [photographers, setPhotographers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  
  // State untuk rentang tanggal ala Dashboard (Date Range Picker)
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  // State untuk Switch View ("list" atau "agenda")
  const [viewMode, setViewMode] = useState("list");

  const [selected, setSelected] = useState(null);
  const [editPho, setEditPho] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editPaid, setEditPaid] = useState("");
  const [editPaymentType, setEditPaymentType] = useState("dp");
  const [editPhoPaid, setEditPhoPaid] = useState(false);
  const [editPhoFee, setEditPhoFee] = useState("");
  const [editExtraCharge, setEditExtraCharge] = useState("");
  const [editExtraNote, setEditExtraNote] = useState("");

  // State untuk Edit Jadwal (Reschedule)
  const [editShootDate, setEditShootDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");

  const loadData = useCallback(async () => {
    try {
      const params = {
        status: statusFilter,
        payment_type: paymentFilter,
        q: search || undefined,
      };

      if (dateRange?.from) {
        params.start_date = format(dateRange.from, "yyyy-MM-dd");
      }
      if (dateRange?.to) {
        params.end_date = format(dateRange.to, "yyyy-MM-dd");
      }

      const [{ data: b }, { data: p }] = await Promise.all([
        api.get("/bookings", { params }),
        api.get("/photographers"),
      ]);
      setBookings(Array.isArray(b) ? b : (b?.data || b?.bookings || []));
      setPhotographers(Array.isArray(p) ? p : (p?.data || p?.photographers || []));
    } catch {
      toast.error("Gagal memuat data client");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, paymentFilter, dateRange, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Tombol Shortcut Cepat Kalender (Gaya Meta Ads / Dashboard)
  const handlePreset = (preset) => {
    const today = new Date();
    if (preset === "all") {
      setDateRange({ from: undefined, to: undefined });
    } else if (preset === "today") {
      setDateRange({ from: today, to: today });
    } else if (preset === "7days") {
      setDateRange({ from: subDays(today, 6), to: today });
    } else if (preset === "thisMonth") {
      setDateRange({ from: startOfMonth(today), to: endOfMonth(today) });
    }
    setIsCalendarOpen(false);
  };

  const openDetail = (b) => {
    setSelected(b);
    setEditPho(b.photographer_id || "none");
    setEditStatus(b.status);
    setEditPaid(String(b.amount_paid));
    setEditPaymentType(b.payment_type || "dp");
    setEditPhoPaid(b.photographer_paid || false);
    setEditPhoFee(b.photographer_fee !== undefined && b.photographer_fee !== null ? String(b.photographer_fee) : "");
    setEditExtraCharge(b.extra_charge ? String(b.extra_charge) : "");
    setEditExtraNote(b.extra_note || "");
    setEditShootDate(b.shoot_date || "");
    setEditStartTime(b.start_time || "");
    setEditEndTime(b.end_time || "");
  };

  const saveDetail = async () => {
    try {
      await api.put(`/bookings/${selected.booking_id}`, {
        status: editStatus,
        photographer_id: editPho === "none" ? null : editPho,
        amount_paid: parseFloat(editPaid) || 0,
        payment_type: editPaymentType,
        photographer_paid: editPhoPaid,
        photographer_fee: parseFloat(editPhoFee) || 0,
        extra_charge: parseFloat(editExtraCharge) || 0,
        extra_note: editExtraNote,
        shoot_date: editShootDate,
        start_time: editStartTime,
        end_time: editEndTime,
      });
      toast.success("Booking dan jadwal berhasil diperbarui");
      setSelected(null);
      loadData();
    } catch {
      toast.error("Gagal memperbarui booking");
    }
  };

  const sendInvoice = async (id) => {
    try {
      await api.post(`/bookings/${id}/send-invoice`);
      toast.success("Invoice berhasil dikirim ke email client");
      loadData();
    } catch {
      toast.error("Gagal mengirim invoice");
    }
  };

  const removeBooking = async (id) => {
    if (!window.confirm("Hapus booking ini?")) return;
    try {
      await api.delete(`/bookings/${id}`);
      toast.success("Booking dihapus");
      setSelected(null);
      loadData();
    } catch {
      toast.error("Gagal menghapus");
    }
  };

  const handleSendReminder = (booking) => {
    let waNumber = (booking.whatsapp || "").replace(/\D/g, "");
    if (waNumber.startsWith("0")) {
      waNumber = "62" + waNumber.slice(1);
    }
    const invoiceUrl = `https://booking.radeyaphoto.my.id/invoice/${booking.booking_id}`;
    const balanceDueText = booking.balance_due > 0 ? `Rp ${(booking.balance_due || 0).toLocaleString("id-ID")}` : "LUNAS";
    
    const message = `Halo Kak *${booking.full_name}*, terima kasih telah mempercayakan momen kelulusanmu di Radeyaphoto.\n\n` +
      `Berikut adalah rincian tagihan / sisa pelunasan untuk No. Invoice *${booking.invoice_number}*:\n` +
      `- Paket: ${booking.package_name}\n` +
      `- Sisa Tagihan: *${balanceDueText}*\n\n` +
      `⚠️ *Batas waktu pelunasan paling lambat H-1* sebelum jadwal sesi foto.\n\n` +
      `Bisa ditransfer ke sini ya Kak:\n` +
      `💳 *BCA 2952093623 a/n Yulviana Kusnia*\n\n` +
      `Silakan cek detail lengkap dan upload bukti pelunasan melalui tautan berikut:\n${invoiceUrl}\n\n` +
      `Mohon konfirmasinya ya Kak. Terima kasih!`;

    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const safeBookings = Array.isArray(bookings) ? bookings : [];
  const safePhotographers = Array.isArray(photographers) ? photographers : [];

  const sortedBookingsForAgenda = [...safeBookings].sort((a, b) => new Date(a.shoot_date) - new Date(b.shoot_date));

  return (
    <AdminLayout title="Database Client" subtitle="Kelola jadwal, fotografer, dan kirim invoice">
      {/* BAGIAN FILTER ATAS */}
      <div className="flex flex-col gap-3 mb-5" data-testid="client-filters">
        <div className="flex items-center justify-between gap-2 w-full">
          <div className="relative flex-1">
            <Search className="absolute h-4 w-4 left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Cari nama, email, univ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white rounded-xl border-moss-900/10 text-xs h-10 shadow-sm"
            />
          </div>
          
          <div className="flex bg-white rounded-xl border border-moss-900/10 p-1 shrink-0 shadow-sm">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className={`h-8 text-xs gap-1 px-3 rounded-lg ${viewMode === "list" ? "bg-moss-900 text-white hover:bg-moss-800" : "text-muted-foreground"}`}
            >
              <Table className="h-3.5 w-3.5" /> List
            </Button>
            <Button
              variant={viewMode === "agenda" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("agenda")}
              className={`h-8 text-xs gap-1 px-3 rounded-lg ${viewMode === "agenda" ? "bg-moss-900 text-white hover:bg-moss-800" : "text-muted-foreground"}`}
            >
              <CalendarIcon className="h-3.5 w-3.5" /> Agenda
            </Button>
          </div>
        </div>

        {/* Filter Rentang Tanggal Ala Dashboard & Status/Bayar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {/* Date Range Picker Popover */}
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[220px] sm:w-[260px] justify-start text-left font-normal bg-white rounded-xl border-moss-900/10 text-xs h-9 shadow-sm shrink-0",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5 text-moss-700" />
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
                  <span>Semua Waktu</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white z-50 shadow-xl rounded-2xl border border-moss-900/10" align="start">
              <div className="flex flex-col sm:flex-row">
                <div className="p-3 border-b sm:border-b-0 sm:border-r border-neutral-100 flex flex-col gap-1.5 min-w-[130px]">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase px-2 mb-1">Periode Cepat</p>
                  <Button variant="ghost" size="sm" className="justify-start text-xs h-8 px-2 font-normal hover:bg-moss-50" onClick={() => handlePreset("today")}>Hari Ini</Button>
                  <Button variant="ghost" size="sm" className="justify-start text-xs h-8 px-2 font-normal hover:bg-moss-50" onClick={() => handlePreset("7days")}>7 Hari Terakhir</Button>
                  <Button variant="ghost" size="sm" className="justify-start text-xs h-8 px-2 font-normal hover:bg-moss-50" onClick={() => handlePreset("thisMonth")}>Bulan Ini</Button>
                  <Button variant="ghost" size="sm" className="justify-start text-xs h-8 px-2 font-normal hover:bg-moss-50 text-rose-600" onClick={() => handlePreset("all")}>Semua Waktu</Button>
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
                    <Button size="sm" className="bg-moss-900 text-white hover:bg-moss-800 text-xs h-8 px-4 rounded-lg" onClick={() => setIsCalendarOpen(false)}>Terapkan</Button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Select onValueChange={setStatusFilter} value={statusFilter}>
            <SelectTrigger className="w-[120px] bg-white shrink-0 rounded-xl border-moss-900/10 text-xs h-9 shadow-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-white z-50">
              <SelectItem value="all" className="text-xs">Semua Status</SelectItem>
              <SelectItem value="pending" className="text-xs">Pending</SelectItem>
              <SelectItem value="confirmed" className="text-xs">Confirmed</SelectItem>
              <SelectItem value="completed" className="text-xs">Completed</SelectItem>
              <SelectItem value="cancelled" className="text-xs">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select onValueChange={setPaymentFilter} value={paymentFilter}>
            <SelectTrigger className="w-[120px] bg-white shrink-0 rounded-xl border-moss-900/10 text-xs h-9 shadow-sm">
              <SelectValue placeholder="Pembayaran" />
            </SelectTrigger>
            <SelectContent className="bg-white z-50">
              <SelectItem value="all" className="text-xs">Semua Bayar</SelectItem>
              <SelectItem value="dp" className="text-xs">DP Saja</SelectItem>
              <SelectItem value="full" className="text-xs">Full Payment</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* RENDER VIEW: AGENDA HARIAN */}
      {viewMode === "agenda" ? (
        <div className="space-y-4 pb-20">
          {loading && (
            <div className="flex justify-center items-center p-20 bg-white rounded-2xl border border-moss-900/10">
              <div className="h-8 w-8 rounded-full border-2 border-moss-800 border-t-transparent animate-spin" />
            </div>
          )}
          {!loading && sortedBookingsForAgenda.length === 0 && (
            <div className="p-12 text-center text-muted-foreground bg-white rounded-2xl border border-moss-900/10 text-xs">
              Tidak ada jadwal agenda di rentang tanggal ini.
            </div>
          )}

          {sortedBookingsForAgenda.map((b) => {
            const startTimeFormatted = (b.start_time || "").substring(0, 5);
            const endTimeFormatted = (b.end_time || "").substring(0, 5);

            return (
              <div 
                key={b.booking_id}
                onClick={() => openDetail(b)}
                className="bg-white rounded-2xl border border-moss-900/10 p-4 shadow-sm hover:border-moss-800/40 transition-all cursor-pointer space-y-2.5 relative overflow-hidden"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-moss-900" />
                <div className="flex items-center justify-between pl-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-moss-900">
                    <CalendarIcon className="h-3.5 w-3.5 text-moss-700" />
                    {fmtDate(b.shoot_date)}
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-moss-50 text-moss-800 border border-moss-900/15">
                    {b.status}
                  </span>
                </div>

                <div className="pl-2 space-y-1">
                  <p className="font-bold text-sm text-moss-900">{b.full_name}</p>
                  <p className="text-xs font-medium text-moss-800">{b.package_name}</p>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-0.5">
                    <span className="flex items-center gap-1 font-semibold text-neutral-800">
                      <Clock className="h-3 w-3 text-moss-700" /> {startTimeFormatted} - {endTimeFormatted} WIB
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                    <MapPin className="h-3 w-3 shrink-0 text-moss-700" /> {b.location}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 pl-2 border-t border-neutral-100 text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3 text-moss-700" /> Fotografer: <strong className="text-moss-900">{b.photographer_name || "Belum ditugaskan"}</strong>
                  </span>
                  <span className="font-bold text-emerald-700">{rupiah(b.amount_paid)}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* RENDER VIEW: LIST KARTU STANDARD */
        <div className="space-y-3 pb-20" data-testid="clients-cards">
          {loading && (
            <div className="flex justify-center items-center p-20 bg-white rounded-2xl border border-moss-900/10">
              <div className="h-8 w-8 rounded-full border-2 border-moss-800 border-t-transparent animate-spin" />
            </div>
          )}
          {!loading && safeBookings.length === 0 && (
            <div className="p-12 text-center text-muted-foreground bg-white rounded-2xl border border-moss-900/10 text-xs">
              Tidak ada client atau jadwal ditemukan.
            </div>
          )}
          
          {safeBookings.map((b) => {
            const startTimeFormatted = (b.start_time || "").substring(0, 5);
            const endTimeFormatted = (b.end_time || "").substring(0, 5);

            return (
              <div 
                key={b.booking_id} 
                className="bg-white rounded-2xl border border-moss-900/10 p-4 shadow-sm hover:border-moss-800/30 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p 
                      onClick={() => openDetail(b)}
                      className="font-bold text-moss-900 text-sm sm:text-base cursor-pointer hover:underline truncate"
                    >
                      {b.full_name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{b.invoice_number} · <span className="text-moss-800 font-medium">{b.whatsapp}</span></p>
                    <p className="text-[11px] text-muted-foreground font-medium truncate">{b.university} {b.study ? `(${b.study})` : ""}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-moss-50 text-moss-800 border border-moss-900/15">
                      {b.status}
                    </span>
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-600">
                      {b.payment_type}
                    </span>
                  </div>
                </div>

                <div className="bg-moss-50/40 rounded-xl p-3 border border-moss-900/5 text-xs space-y-1">
                  <p className="font-bold text-moss-900 flex items-center justify-between">
                    <span>{b.package_name}</span>
                    <span className="text-emerald-700 font-semibold">{rupiah(b.amount_paid)}</span>
                  </p>
                  <p className="text-muted-foreground font-medium flex items-center gap-1.5">
                    📅 {fmtDate(b.shoot_date)} <span className="text-moss-900 font-bold">({startTimeFormatted} - {endTimeFormatted})</span>
                  </p>
                  <p className="text-muted-foreground truncate flex items-center gap-1.5">
                    📍 {b.location}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 px-1">
                  <div className="text-muted-foreground">
                    Fotografer: <span className="font-semibold text-moss-900">{b.photographer_name ? `${b.photographer_name} ${b.photographer_paid ? "✓" : ""}` : "Belum ditugaskan"}</span>
                  </div>
                  {b.balance_due > 0 && (
                    <div className="text-amber-600 font-bold text-xs bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                      Kurang: {rupiah(b.balance_due)}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-neutral-100">
                  <Button
                    onClick={() => handleSendReminder(b)}
                    size="sm"
                    className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1 col-span-1 rounded-xl shadow-none"
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> WA
                  </Button>
                  <Button
                    onClick={() => window.open(`${process.env.REACT_APP_BACKEND_URL}/api/files/${b.proof_file_id}`, "_blank")}
                    size="sm"
                    variant="outline"
                    className="h-9 text-xs col-span-1 rounded-xl border-moss-900/20 hover:bg-moss-50"
                    title="Lihat Bukti Transfer"
                  >
                    <Eye className="h-3.5 w-3.5" /> Bukti
                  </Button>
                  <Button
                    onClick={() => sendInvoice(b.booking_id)}
                    size="sm"
                    variant="outline"
                    className="h-9 text-xs col-span-1 rounded-xl border-moss-900/20 hover:bg-moss-50"
                    title="Kirim Invoice"
                  >
                    <Mail className="h-3.5 w-3.5" /> Inv
                  </Button>
                  <Button 
                    onClick={() => openDetail(b)} 
                    size="sm" 
                    className="h-9 bg-moss-900 hover:bg-moss-800 text-white text-xs col-span-1 rounded-xl shadow-none font-medium"
                  >
                    Kelola
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog Detail / Edit Booking */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl p-6 bg-white border border-moss-900/10 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-moss-900">Detail & Pengaturan Booking</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-2">
              <div className="rounded-2xl bg-moss-50/50 p-4 border border-moss-900/10 text-xs space-y-1.5">
                <p><span className="font-bold text-moss-900">Client:</span> {selected.full_name} ({selected.whatsapp})</p>
                <p><span className="font-bold text-moss-900">Kampus:</span> {selected.university} — {selected.study}</p>
                <p><span className="font-bold text-moss-900">Paket:</span> {selected.package_name} ({rupiah(selected.package_price)})</p>
                <p><span className="font-bold text-moss-900">Jadwal Asli:</span> {fmtDate(selected.shoot_date)} ({(selected.start_time || "").substring(0, 5)} - {(selected.end_time || "").substring(0, 5)})</p>
                <p><span className="font-bold text-moss-900">Lokasi:</span> {selected.location}</p>
              </div>

              {/* INPUT EDIT JADWAL / RESCHEDULE (Sudah Dirapikan Kolomnya) */}
              <div className="space-y-3 p-4 bg-moss-50/30 rounded-2xl border border-moss-900/10">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-moss-900 uppercase tracking-wider">Ubah Jadwal Sesi Foto</label>
                  <span className="text-[10px] text-muted-foreground bg-white px-2 py-0.5 rounded border border-moss-900/10">Opsional</span>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">Tanggal Foto</label>
                  <Input 
                    type="date" 
                    value={editShootDate} 
                    onChange={(e) => setEditShootDate(e.target.value)} 
                    className="bg-white text-xs h-10 w-full rounded-xl border border-moss-900/20 shadow-sm" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Jam Mulai</label>
                    <Input 
                      type="time" 
                      step="60"
                      value={editStartTime} 
                      onChange={(e) => setEditStartTime(e.target.value)} 
                      className="bg-white text-xs h-10 w-full rounded-xl border border-moss-900/20 shadow-sm" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Jam Selesai</label>
                    <Input 
                      type="time" 
                      step="60"
                      value={editEndTime} 
                      onChange={(e) => setEditEndTime(e.target.value)} 
                      className="bg-white text-xs h-10 w-full rounded-xl border border-moss-900/20 shadow-sm" 
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-moss-900">Status Booking</label>
                <Select onValueChange={setEditStatus} value={editStatus}>
                  <SelectTrigger className="bg-white rounded-xl border-moss-900/20 h-10 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    <SelectItem value="pending" className="text-xs">Pending</SelectItem>
                    <SelectItem value="confirmed" className="text-xs">Confirmed</SelectItem>
                    <SelectItem value="completed" className="text-xs">Completed</SelectItem>
                    <SelectItem value="cancelled" className="text-xs">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-moss-900">Status Pembayaran</label>
                <Select onValueChange={setEditPaymentType} value={editPaymentType}>
                  <SelectTrigger className="bg-white rounded-xl border-moss-900/20 h-10 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    <SelectItem value="dp" className="text-xs">DP (Down Payment)</SelectItem>
                    <SelectItem value="full" className="text-xs">Full (Lunas)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-moss-900">Extra Charge / Biaya Lain (Rp)</label>
                  <Input 
                    type="number" 
                    value={editExtraCharge} 
                    onChange={(e) => setEditExtraCharge(e.target.value)} 
                    placeholder="Misal: 200000" 
                    className="bg-white rounded-xl border-moss-900/20 h-10 text-xs" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-moss-900">Keterangan Extra</label>
                  <Input 
                    type="text" 
                    value={editExtraNote} 
                    onChange={(e) => setEditExtraNote(e.target.value)} 
                    placeholder="Misal: Extra Time" 
                    className="bg-white rounded-xl border-moss-900/20 h-10 text-xs" 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-moss-900">Tugaskan Fotografer</label>
                <Select 
                  onValueChange={(val) => {
                    setEditPho(val);
                    if (val !== "none") {
                      const found = safePhotographers.find(p => p.photographer_id === val);
                      if (found) {
                        setEditPhoFee(String(found.fee_per_session || 0));
                      }
                    }
                  }} 
                  value={editPho}
                >
                  <SelectTrigger className="bg-white rounded-xl border-moss-900/20 h-10 text-xs"><SelectValue placeholder="Pilih fotografer" /></SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    <SelectItem value="none" className="text-xs">— Belum Ditugaskan —</SelectItem>
                    {safePhotographers.map((p) => (
                      <SelectItem key={p.photographer_id} value={p.photographer_id} className="text-xs">
                        {p.name} (Fee: {rupiah(p.fee_per_session)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-moss-900">Fee Fotografer Sesi Ini (Rp)</label>
                <Input 
                  type="number" 
                  value={editPhoFee} 
                  onChange={(e) => setEditPhoFee(e.target.value)} 
                  placeholder="Nominal fee sesi ini" 
                  className="bg-white rounded-xl border-moss-900/20 h-10 text-xs" 
                />
              </div>

              <div className="flex items-center space-x-2 pt-1 bg-moss-50/40 p-3 rounded-xl border border-moss-900/10">
                <input
                  type="checkbox"
                  id="phoPaid"
                  checked={editPhoPaid}
                  onChange={(e) => setEditPhoPaid(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-moss-900 focus:ring-moss-900 cursor-pointer"
                />
                <label htmlFor="phoPaid" className="text-xs font-bold text-moss-900 cursor-pointer">
                  Fee Fotografer Sudah Dibayar (Lunas)
                </label>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-moss-900">Jumlah Total Sudah Dibayar (Rp)</label>
                <Input 
                  type="number" 
                  value={editPaid} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditPaid(val);
                    const pkgPrice = Number(selected.package_price || 0);
                    const extra = Number(editExtraCharge || selected.extra_charge || 0);
                    if (Number(val) >= (pkgPrice + extra)) {
                      setEditPaymentType("full");
                    }
                  }} 
                  className="bg-white rounded-xl border-moss-900/20 h-10 text-xs" 
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => window.open(`${process.env.REACT_APP_BACKEND_URL}/api/files/${selected.proof_file_id}`, "_blank")}
                  className="text-xs text-moss-800 underline font-semibold flex items-center gap-1"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Lihat Bukti Transfer Asli
                </button>
                <button
                  onClick={() => removeBooking(selected.booking_id)}
                  className="text-xs text-destructive hover:underline font-semibold flex items-center gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Hapus Booking
                </button>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" className="rounded-xl h-10 text-xs" onClick={() => setSelected(null)}>Batal</Button>
            <Button className="bg-moss-900 hover:bg-moss-800 text-white rounded-xl h-10 text-xs" onClick={saveDetail}>Simpan Perubahan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
