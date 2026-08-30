import { useEffect, useState, useCallback, useRef } from "react";
import { Search, Mail, Eye, Trash2, MessageSquare, Table, Calendar as CalendarIcon, ExternalLink, ChevronDown, ChevronUp, Settings } from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";
import { api, rupiah, fmtDate } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Calendar as UICalendar } from "../components/ui/calendar";
import { toast } from "sonner";
import { format, subDays, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "../lib/utils";

// Import untuk React Big Calendar
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import idLocale from "date-fns/locale/id";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = { "id": idLocale };
const localizer = dateFnsLocalizer({ format: (date, fmt, options) => format(date, fmt, { locale: id }), parse, startOfWeek, getDay, locales });

export default function Clients() {
  const [bookings, setBookings] = useState([]);
  const [photographers, setPhotographers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const [viewMode, setViewMode] = useState("list");
  const [currentView, setCurrentView] = useState(Views.MONTH);

  const [calendarDate, setCalendarDate] = useState(new Date());

  const [selected, setSelected] = useState(null);
  const [editPho, setEditPho] = useState("none");
  const [editStatus, setEditStatus] = useState("");
  const [editPaid, setEditPaid] = useState("");
  const [editPaymentType, setEditPaymentType] = useState("dp");
  const [editPhoPaid, setEditPhoPaid] = useState(false);
  const [editPhoFee, setEditPhoFee] = useState("");
  const [editExtraCharge, setEditExtraCharge] = useState("");
  const [editExtraNote, setEditExtraNote] = useState("");
  const [editShootDate, setEditShootDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editLocation, setEditLocation] = useState("");

  const [showReschedule, setShowReschedule] = useState(false);
  const [viewDetailOnly, setViewDetailOnly] = useState(null);

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const loadData = useCallback(async () => {
    try {
      const params = {
        status: statusFilter,
        payment_type: paymentFilter,
        q: search || undefined,
      };

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
  }, [statusFilter, paymentFilter, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    setIsCalendarOpen(false);
  };

  const openDetail = (b) => {
    setSelected(b);
    setEditPho(b.photographer_id ? String(b.photographer_id) : "none");
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
    setEditLocation(b.location || "");
    setShowReschedule(false);
  };

  const saveDetail = async () => {
    try {
      const photographerIdToSend = (!editPho || editPho === "none" || editPho === "") ? null : editPho;

      await api.put(`/bookings/${selected.booking_id}`, {
        status: editStatus,
        photographer_id: photographerIdToSend,
        amount_paid: parseFloat(editPaid) || 0,
        payment_type: editPaymentType,
        photographer_paid: editPhoPaid,
        photographer_fee: photographerIdToSend ? (parseFloat(editPhoFee) || 0) : 0,
        extra_charge: parseFloat(editExtraCharge) || 0,
        extra_note: editExtraNote,
        shoot_date: editShootDate,
        start_time: editStartTime,
        end_time: editEndTime,
        location: editLocation,
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

  const filteredBookings = safeBookings
    .filter((b) => {
      if (dateRange?.from && dateRange?.to && b.shoot_date) {
        const shootDate = new Date(b.shoot_date);
        shootDate.setHours(0, 0, 0, 0);

        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0, 0, 0, 0);

        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);

        if (shootDate < fromDate || shootDate > toDate) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.shoot_date || "1970-01-01");
      const dateB = new Date(b.shoot_date || "1970-01-01");
      if (dateA - dateB !== 0) {
        return dateA - dateB;
      }

      const timeA = a.start_time || "00:00";
      const timeB = b.start_time || "00:00";
      if (timeA.localeCompare(timeB) !== 0) {
        return timeA.localeCompare(timeB);
      }

      const nameA = a.full_name || "";
      const nameB = b.full_name || "";
      return nameA.localeCompare(nameB);
    });

  const calendarEvents = safeBookings.map((b) => {
    const startTime = (b.start_time || "10:00").substring(0, 5);
    const endTime = (b.end_time || "11:00").substring(0, 5);
    const locationText = b.location ? ` — ${b.location}` : "";
    return {
      id: b.booking_id,
      title: `${b.full_name} (${b.package_name})${locationText}`,
      start: new Date(`${b.shoot_date}T${startTime}:00`),
      end: new Date(`${b.shoot_date}T${endTime}:00`),
      resource: b,
    };
  });

  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      const nextDate = new Date(calendarDate);
      nextDate.setMonth(nextDate.getMonth() + 1);
      setCalendarDate(nextDate);
    } else if (distance < -minSwipeDistance) {
      const prevDate = new Date(calendarDate);
      prevDate.setMonth(prevDate.getMonth() - 1);
      setCalendarDate(prevDate);
    }

    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  return (
    <AdminLayout title="Database Client" subtitle="Kelola jadwal, fotografer, dan kirim invoice">
      <div className="flex flex-col gap-3 mb-6" data-testid="client-filters">
        <div className="flex items-center justify-between gap-2 w-full">
          <div className="relative flex-1">
            <Search className="absolute h-4 w-4 left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Cari nama, email, univ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
          
          <div className="flex bg-white rounded-lg border border-moss-900/10 p-0.5 shrink-0">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className={`h-9 text-xs gap-1 px-3 ${viewMode === "list" ? "bg-moss-800 text-white" : ""}`}
            >
              <Table className="h-3.5 w-3.5" /> Tabel
            </Button>
            <Button
              variant={viewMode === "calendar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("calendar")}
              className={`h-9 text-xs gap-1 px-3 ${viewMode === "calendar" ? "bg-moss-800 text-white" : ""}`}
            >
              <CalendarIcon className="h-3.5 w-3.5" /> Kalender
            </Button>
          </div>
        </div>

        {viewMode === "list" && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[220px] sm:w-[240px] justify-start text-left font-normal bg-white rounded-xl border-moss-900/10 text-xs h-9 shadow-sm shrink-0",
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
              <PopoverContent className="w-auto p-0 bg-white z-50 shadow-xl rounded-2xl border border-moss-900/10 scale-95 origin-top-left" align="start">
                <div className="flex flex-col sm:flex-row">
                  <div className="p-3 border-b sm:border-b-0 sm:border-r border-neutral-100 flex flex-col gap-1.5 min-w-[140px]">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase px-2 mb-1">Periode</p>
                    <Button variant="ghost" size="sm" className="justify-start text-xs h-8 px-2 font-normal hover:bg-moss-50" onClick={() => handlePreset("today")}>Hari Ini</Button>
                    <Button variant="ghost" size="sm" className="justify-start text-xs h-8 px-2 font-normal hover:bg-moss-50" onClick={() => handlePreset("lastMonth")}>Bulan Lalu</Button>
                    <Button variant="ghost" size="sm" className="justify-start text-xs h-8 px-2 font-normal hover:bg-moss-50" onClick={() => handlePreset("thisMonth")}>Bulan Ini</Button>
                    <Button variant="ghost" size="sm" className="justify-start text-xs h-8 px-2 font-normal hover:bg-moss-50" onClick={() => handlePreset("nextMonth")}>Bulan Berikutnya</Button>
                    <Button variant="ghost" size="sm" className="justify-start text-xs h-8 px-2 font-normal hover:bg-moss-50 text-rose-600" onClick={() => handlePreset("all")}>Semua Waktu</Button>
                  </div>
                  <div className="p-2">
                    <UICalendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={1}
                      locale={id}
                      className="text-xs"
                    />
                    <div className="flex items-center justify-end gap-2 p-2 border-t border-neutral-100">
                      <Button size="sm" className="bg-moss-800 text-white hover:bg-moss-900 text-xs h-7 px-3 rounded-lg" onClick={() => setIsCalendarOpen(false)}>Terapkan</Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Select onValueChange={setStatusFilter} value={statusFilter}>
              <SelectTrigger className="w-[130px] bg-white shrink-0 text-xs h-9">
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
              <SelectTrigger className="w-[130px] bg-white shrink-0 text-xs h-9">
                <SelectValue placeholder="Pembayaran" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                <SelectItem value="all" className="text-xs">Semua Bayar</SelectItem>
                <SelectItem value="dp" className="text-xs">DP Saja</SelectItem>
                <SelectItem value="full" className="text-xs">Full Payment</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {viewMode === "calendar" ? (
        <div 
          className="bg-white p-3 sm:p-6 rounded-2xl border border-moss-900/10 shadow-sm w-full select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-full" style={{ height: "75vh", minHeight: "650px" }}>
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              date={calendarDate}
              view={currentView}
              onView={(newView) => setCurrentView(newView)}
              onNavigate={(newDate) => setCalendarDate(newDate)}
              style={{ height: "100%" }}
              views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
              length={31}
              messages={{
                next: "Selanjutnya",
                previous: "Sebelumnya",
                today: "Hari Ini",
                month: "Bulan",
                week: "Minggu",
                day: "Hari",
                agenda: "Agenda",
                date: "Tanggal",
                time: "Waktu",
                event: "Acara",
                noEventsInRange: "Tidak ada jadwal di bulan ini.",
              }}
              onSelectEvent={(event) => setViewDetailOnly(event.resource)}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3 pb-20" data-testid="clients-cards">
          {loading && (
            <div className="p-6 text-center text-muted-foreground bg-white rounded-lg border">Memuat data...</div>
          )}
          {!loading && filteredBookings.length === 0 && (
            <div className="p-6 text-center text-muted-foreground bg-white rounded-lg border">Tidak ada client atau jadwal ditemukan.</div>
          )}
          
          {filteredBookings.map((b) => {
            const startTimeFormatted = (b.start_time || "").substring(0, 5);
            const endTimeFormatted = (b.end_time || "").substring(0, 5);

            return (
              <div 
                key={b.booking_id} 
                className="bg-white rounded-xl border border-moss-900/10 p-4 shadow-sm hover:border-moss-800/40 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p 
                      onClick={() => setViewDetailOnly(b)}
                      className="font-bold text-moss-900 text-base cursor-pointer hover:underline text-moss-800"
                    >
                      {b.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{b.invoice_number} · {b.whatsapp}</p>
                    <p className="text-xs text-muted-foreground font-medium">{b.university} ({b.study})</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-moss-50 text-moss-800 border border-moss-900/15">
                      {b.status}
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-700">
                      {b.payment_type}
                    </span>
                  </div>
                </div>

                <div className="bg-moss-50/40 rounded-lg p-2.5 border border-moss-900/5 text-xs space-y-1">
                  <p className="font-semibold text-moss-900">{b.package_name}</p>
                  <p className="text-muted-foreground">📅 {fmtDate(b.shoot_date)} ({startTimeFormatted} - {endTimeFormatted} WIB)</p>
                  <p className="text-muted-foreground truncate">📍 {b.location}</p>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                  <div>
                    <span className="text-muted-foreground">Fotografer: </span>
                    <span className="font-medium text-moss-900">
                      {b.photographer_name ? `${b.photographer_name} ${b.photographer_paid ? "✓" : ""}` : "Belum ada"}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-moss-900">{rupiah(b.amount_paid)}</p>
                    {b.balance_due > 0 && <p className="text-[11px] text-amber-600 font-medium">Kurang: {rupiah(b.balance_due)}</p>}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-gray-100">
                  <Button
                    onClick={() => handleSendReminder(b)}
                    size="sm"
                    className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1 px-3"
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> WA
                  </Button>
                  <Button
                    onClick={() => window.open(`${process.env.REACT_APP_BACKEND_URL}/api/files/${b.proof_file_id}`, "_blank")}
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs px-2.5"
                    title="Lihat Bukti Transfer"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    onClick={() => sendInvoice(b.booking_id)}
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs px-2.5"
                    title="Kirim Invoice via Email"
                  >
                    <Mail className="h-3.5 w-3.5" />
                  </Button>
                  <Button 
                    onClick={() => openDetail(b)} 
                    size="sm" 
                    className="h-8 bg-moss-800 hover:bg-moss-900 text-white text-xs"
                  >
                    Kelola
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DETAIL DENGAN TOMBOL AKSI LENGKAP */}
      <Dialog open={!!viewDetailOnly} onOpenChange={(o) => !o && setViewDetailOnly(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-3xl p-6 bg-white border border-moss-900/10 shadow-2xl z-50">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-moss-900">Detail Informasi Booking</DialogTitle>
          </DialogHeader>
          {viewDetailOnly && (
            <div className="space-y-3 py-2 text-xs">
              <div className="rounded-2xl bg-moss-50/60 p-4 border border-moss-900/10 space-y-2">
                <p><span className="font-bold text-moss-900">No. Invoice:</span> {viewDetailOnly.invoice_number}</p>
                <p><span className="font-bold text-moss-900">Nama Client:</span> {viewDetailOnly.full_name}</p>
                <p><span className="font-bold text-moss-900">WhatsApp:</span> {viewDetailOnly.whatsapp}</p>
                <p><span className="font-bold text-moss-900">Kampus / Jurusan:</span> {viewDetailOnly.university} — {viewDetailOnly.study}</p>
                <p><span className="font-bold text-moss-900">Paket Foto:</span> {viewDetailOnly.package_name} ({rupiah(viewDetailOnly.package_price)})</p>
                <p><span className="font-bold text-moss-900">Jadwal Sesi:</span> {fmtDate(viewDetailOnly.shoot_date)} ({(viewDetailOnly.start_time || "").substring(0, 5)} - {(viewDetailOnly.end_time || "").substring(0, 5)} WIB)</p>
                <p><span className="font-bold text-moss-900">Lokasi:</span> {viewDetailOnly.location}</p>
                <p><span className="font-bold text-moss-900">Status Booking:</span> <span className="uppercase font-bold text-moss-800">{viewDetailOnly.status}</span></p>
                <p><span className="font-bold text-moss-900">Status Pembayaran:</span> <span className="uppercase font-bold">{viewDetailOnly.payment_type}</span> ({rupiah(viewDetailOnly.amount_paid)} dibayar)</p>
                {viewDetailOnly.balance_due > 0 && (
                  <p className="text-amber-700 font-bold">Sisa Tagihan: {rupiah(viewDetailOnly.balance_due)}</p>
                )}
                <p><span className="font-bold text-moss-900">Fotografer:</span> {viewDetailOnly.photographer_name || "Belum ditugaskan"}</p>
              </div>

              {/* TOMBOL AKSI CEPAT DI DALAM POP-UP DETAIL */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <Button
                  onClick={() => handleSendReminder(viewDetailOnly)}
                  size="sm"
                  className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1"
                >
                  <MessageSquare className="h-3.5 w-3.5" /> WA
                </Button>
                <Button
                  onClick={() => sendInvoice(viewDetailOnly.booking_id)}
                  size="sm"
                  variant="outline"
                  className="h-9 text-xs gap-1 border-moss-900/20"
                >
                  <Mail className="h-3.5 w-3.5" /> Email
                </Button>
                <Button
                  onClick={() => {
                    const dataToEdit = viewDetailOnly;
                    setViewDetailOnly(null);
                    openDetail(dataToEdit);
                  }}
                  size="sm"
                  className="h-9 bg-moss-800 hover:bg-moss-900 text-white text-xs gap-1"
                >
                  <Settings className="h-3.5 w-3.5" /> Kelola
                </Button>
              </div>

              {viewDetailOnly.proof_file_id && (
                <button
                  onClick={() => window.open(`${process.env.REACT_APP_BACKEND_URL}/api/files/${viewDetailOnly.proof_file_id}`, "_blank")}
                  className="w-full py-2.5 bg-moss-50 hover:bg-moss-100 text-moss-900 rounded-xl font-semibold flex items-center justify-center gap-1.5 border border-moss-900/10"
                >
                  <ExternalLink className="h-4 w-4" /> Lihat Bukti Transfer
                </button>
              )}
            </div>
          )}
          <DialogFooter className="pt-2">
            <Button className="w-full bg-moss-900 hover:bg-moss-800 text-white rounded-xl h-10 text-xs" onClick={() => setViewDetailOnly(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG KELOLA */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl p-6 bg-white border border-moss-900/10 shadow-2xl z-50">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-moss-900">Kelola & Pengaturan Booking</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-2">
              <div className="rounded-2xl bg-moss-50/50 p-4 border border-moss-900/10 text-xs space-y-1.5">
                <p><span className="font-bold text-moss-900">Client:</span> {selected.full_name} ({selected.whatsapp})</p>
                <p><span className="font-bold text-moss-900">Kampus:</span> {selected.university} — {selected.study}</p>
                <p><span className="font-bold text-moss-900">Paket:</span> {selected.package_name} ({rupiah(selected.package_price)})</p>
                <p><span className="font-bold text-moss-900">Jadwal Saat Ini:</span> {fmtDate(selected.shoot_date)} ({(selected.start_time || "").substring(0, 5)} - {(selected.end_time || "").substring(0, 5)})</p>
                <p><span className="font-bold text-moss-900">Lokasi:</span> {selected.location}</p>
              </div>

              {/* TOGGLE RESCHEDULE (TANGGAL, JAM, & LOKASI) */}
              <div className="border border-moss-900/15 rounded-2xl overflow-hidden bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setShowReschedule(!showReschedule)}
                  className="w-full px-4 py-3 bg-moss-50/70 hover:bg-moss-50 flex items-center justify-between text-xs font-bold text-moss-900 transition-colors"
                >
                  <span>📅 Ingin Ubah Tanggal & Jam Sesi Foto?</span>
                  {showReschedule ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {showReschedule && (
                  <div className="p-4 space-y-3 bg-white border-t border-moss-900/10">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-muted-foreground">Lokasi / Venue Foto</label>
                      <Input 
                        type="text" 
                        value={editLocation} 
                        onChange={(e) => setEditLocation(e.target.value)} 
                        placeholder="Misal: UTCC Pondok Cabe" 
                        className="bg-white text-xs h-10 w-full rounded-xl border border-moss-900/20 shadow-sm" 
                      />
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
                )}
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
                    if (val && val !== "none" && val !== "") {
                      const found = safePhotographers.find(p => p.photographer_id === val);
                      if (found) {
                        setEditPhoFee(String(found.fee_per_session || 0));
                      }
                    } else {
                      setEditPhoFee("0");
                    }
                  }} 
                  value={editPho}
                >
                  <SelectTrigger className="bg-white rounded-xl border-moss-900/20 h-10 text-xs">
                    <SelectValue placeholder="— Belum Ditugaskan —" />
                  </SelectTrigger>
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

              <div className="flex items-center justify-end pt-2">
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
