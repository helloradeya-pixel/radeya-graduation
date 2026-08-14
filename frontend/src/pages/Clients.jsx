import { useEffect, useState, useCallback, useMemo } from "react";
import { Search, Mail, Eye, Trash2, MessageSquare, Table, Calendar as CalendarIcon } from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";
import { api, rupiah, fmtDate } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { toast } from "sonner";

// Import untuk React Big Calendar
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import idLocale from "date-fns/locale/id";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = { "id": idLocale };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

export default function Clients() {
  const [bookings, setBookings] = useState([]);
  const [photographers, setPhotographers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  
  // State untuk Switch View (table / calendar)
  const [viewMode, setViewMode] = useState("table");

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

  const monthOptions = useMemo(() => {
    const monthsName = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    let options = [];
    for (let year = 2030; year >= 2025; year--) {
      for (let month = 12; month >= 1; month--) {
        const mStr = String(month).padStart(2, '0');
        const value = `${year}-${mStr}`;
        const label = `${monthsName[month - 1]} ${year}`;
        options.push({ value, label });
      }
    }
    return options;
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [{ data: b }, { data: p }] = await Promise.all([
        api.get("/bookings", { 
          params: { 
            status: statusFilter, 
            payment_type: paymentFilter, 
            month: monthFilter, 
            q: search || undefined 
          } 
        }),
        api.get("/photographers"),
      ]);
      setBookings(Array.isArray(b) ? b : (b?.data || b?.bookings || []));
      setPhotographers(Array.isArray(p) ? p : (p?.data || p?.photographers || []));
    } catch {
      toast.error("Gagal memuat data client");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, paymentFilter, monthFilter, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    
    // Set state edit jadwal
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
      `Silakan cek detail lengkap dan upload bukti pelunasan melalui tautan berikut:\n${invoiceUrl}\n\n` +
      `Mohon konfirmasinya ya Kak. Terima kasih!`;
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const safeBookings = Array.isArray(bookings) ? bookings : [];
  const safePhotographers = Array.isArray(photographers) ? photographers : [];

  // Mapping data bookings ke format Event Calendar
  const calendarEvents = safeBookings.map((b) => {
    const startTime = b.start_time || "10:00";
    const endTime = b.end_time || "11:00";
    return {
      id: b.booking_id,
      title: `${b.full_name} (${b.package_name})`,
      start: new Date(`${b.shoot_date}T${startTime}:00`),
      end: new Date(`${b.shoot_date}T${endTime}:00`),
      resource: b,
    };
  });

  return (
    <AdminLayout title="Database Client" subtitle="Kelola jadwal, fotografer, dan kirim invoice">
      <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center justify-between" data-testid="client-filters">
        <div className="relative w-full sm:w-64">
          <Search className="absolute h-4 w-4 left-3 top-3 text-muted-foreground" />
          <Input
            placeholder="Cari nama, email, univ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Toggle View Mode (Tabel vs Kalender) */}
          <div className="flex bg-white rounded-lg border border-moss-900/10 p-0.5">
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className={`h-8 text-xs gap-1 ${viewMode === "table" ? "bg-moss-800 text-white" : ""}`}
            >
              <Table className="h-3.5 w-3.5" /> Tabel
            </Button>
            <Button
              variant={viewMode === "calendar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("calendar")}
              className={`h-8 text-xs gap-1 ${viewMode === "calendar" ? "bg-moss-800 text-white" : ""}`}
            >
              <CalendarIcon className="h-3.5 w-3.5" /> Kalender
            </Button>
          </div>

          <Select onValueChange={setMonthFilter} value={monthFilter}>
            <SelectTrigger className="w-[150px] bg-white">
              <SelectValue placeholder="Bulan / Tahun" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value="all">Semua Waktu</SelectItem>
              {monthOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select onValueChange={setStatusFilter} value={statusFilter}>
            <SelectTrigger className="w-[120px] bg-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select onValueChange={setPaymentFilter} value={paymentFilter}>
            <SelectTrigger className="w-[120px] bg-white">
              <SelectValue placeholder="Pembayaran" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Bayar</SelectItem>
              <SelectItem value="dp">DP Saja</SelectItem>
              <SelectItem value="full">Full Payment</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Render Berdasarkan View Mode */}
      {viewMode === "calendar" ? (
        <div className="bg-white p-6 rounded-lg border border-moss-900/10 shadow-sm" style={{ height: 650 }}>
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: "100%" }}
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
              noEventsInRange: "Tidak ada jadwal di rentang waktu ini.",
            }}
            onSelectEvent={(event) => openDetail(event.resource)}
          />
        </div>
      ) : (
        <div className="rounded-lg border border-moss-900/10 bg-white overflow-hidden" data-testid="clients-table">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-moss-900/10 bg-moss-50/50">
                  <th className="p-3.5">Invoice / Klien</th>
                  <th className="p-3.5">Paket & Jadwal</th>
                  <th className="p-3.5">Fotografer</th>
                  <th className="p-3.5">Pembayaran</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Memuat data...</td></tr>
                )}
                {!loading && safeBookings.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Tidak ada client ditemukan.</td></tr>
                )}
                {safeBookings.map((b) => (
                  <tr key={b.booking_id} className="border-b border-moss-900/5 hover:bg-moss-50/30 transition-colors">
                    <td className="p-3.5">
                      <div 
                        onClick={() => openDetail(b)} 
                        className="cursor-pointer group inline-block"
                      >
                        <p className="font-bold text-moss-900 group-hover:text-moss-700 underline transition-colors">
                          {b.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground">{b.invoice_number} · {b.whatsapp}</p>
                        <p className="text-xs text-muted-foreground">{b.university} ({b.study})</p>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <p className="font-semibold">{b.package_name}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(b.shoot_date)} · {b.start_time}-{b.end_time}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-xs">{b.location}</p>
                    </td>
                    <td className="p-3.5">
                      {b.photographer_name ? (
                        <div>
                          <span className="inline-flex items-center gap-1.5 font-medium text-xs bg-moss-50 text-moss-800 px-2.5 py-1 rounded-full">
                            {b.photographer_name} {b.photographer_paid && "✓"}
                          </span>
                          <p className="text-[11px] text-muted-foreground mt-0.5">Fee: {rupiah(b.photographer_fee)}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-amberx font-semibold">Belum ditugaskan</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded border border-moss-900/20">
                        {b.payment_type}
                      </span>
                      <p className="text-xs mt-1 font-semibold">{rupiah(b.amount_paid)}</p>
                      {b.balance_due > 0 && <p className="text-[11px] text-amberx">Kurang: {rupiah(b.balance_due)}</p>}
                    </td>
                    <td className="p-3.5">
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded border border-moss-900/25">
                        {b.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          title="Kirim Reminder WA ke Klien"
                          onClick={() => handleSendReminder(b)}
                          size="sm"
                          className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1 px-2.5"
                        >
                          <MessageSquare className="h-3.5 w-3.5" /> Kirim WA
                        </Button>
                        <button
                          title="Lihat Bukti Transfer"
                          onClick={() => window.open(`${process.env.REACT_APP_BACKEND_URL}/api/files/${b.proof_file_id}`, "_blank")}
                          className="p-1.5 rounded-md hover:bg-moss-100 text-moss-800"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          title="Kirim Invoice via Email"
                          onClick={() => sendInvoice(b.booking_id)}
                          className="p-1.5 rounded-md hover:bg-moss-100 text-moss-800"
                        >
                          <Mail className="h-4 w-4" />
                        </button>
                        <Button onClick={() => openDetail(b)} size="sm" variant="outline" className="h-7 text-xs">
                          Kelola
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialog Detail / Edit Booking */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail & Pengaturan Booking</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-2">
              <div className="rounded-md bg-moss-50/50 p-3 border border-moss-900/10 text-xs space-y-1">
                <p><span className="font-bold">Client:</span> {selected.full_name} ({selected.whatsapp})</p>
                <p><span className="font-bold">Kampus:</span> {selected.university} — {selected.study}</p>
                <p><span className="font-bold">Paket:</span> {selected.package_name} ({rupiah(selected.package_price)})</p>
                <p><span className="font-bold">Jadwal Asli:</span> {fmtDate(selected.shoot_date)} ({selected.start_time} - {selected.end_time})</p>
                <p><span className="font-bold">Lokasi:</span> {selected.location}</p>
              </div>

              {/* INPUT EDIT JADWAL / RESCHEDULE */}
              <div className="space-y-3 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                <label className="text-xs font-bold text-moss-900 uppercase tracking-wider block">Ubah Jadwal Sesi Foto (Reschedule)</label>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Tanggal Foto</label>
                  <Input 
                    type="date" 
                    value={editShootDate} 
                    onChange={(e) => setEditShootDate(e.target.value)} 
                    className="bg-white" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Jam Mulai</label>
                    <Input 
                      type="time" 
                      value={editStartTime} 
                      onChange={(e) => setEditStartTime(e.target.value)} 
                      className="bg-white" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Jam Selesai</label>
                    <Input 
                      type="time" 
                      value={editEndTime} 
                      onChange={(e) => setEditEndTime(e.target.value)} 
                      className="bg-white" 
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold">Status Booking</label>
                <Select onValueChange={setEditStatus} value={editStatus}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold">Status Pembayaran</label>
                <Select onValueChange={setEditPaymentType} value={editPaymentType}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dp">DP (Down Payment)</SelectItem>
                    <SelectItem value="full">Full (Lunas)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold">Extra Charge / Biaya Lain (Rp)</label>
                  <Input 
                    type="number" 
                    value={editExtraCharge} 
                    onChange={(e) => setEditExtraCharge(e.target.value)} 
                    placeholder="Misal: 200000" 
                    className="bg-white" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold">Keterangan Extra</label>
                  <Input 
                    type="text" 
                    value={editExtraNote} 
                    onChange={(e) => setEditExtraNote(e.target.value)} 
                    placeholder="Misal: Extra Time 30 Menit" 
                    className="bg-white" 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold">Tugaskan Fotografer</label>
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
                  <SelectTrigger className="bg-white"><SelectValue placeholder="Pilih fotografer" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Belum Ditugaskan —</SelectItem>
                    {safePhotographers.map((p) => (
                      <SelectItem key={p.photographer_id} value={p.photographer_id}>
                        {p.name} (Default Fee: {rupiah(p.fee_per_session)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold">Fee Fotografer Sesi Ini (Rp)</label>
                <Input 
                  type="number" 
                  value={editPhoFee} 
                  onChange={(e) => setEditPhoFee(e.target.value)} 
                  placeholder="Masukkan nominal fee fotografer sesi ini" 
                  className="bg-white" 
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="phoPaid"
                  checked={editPhoPaid}
                  onChange={(e) => setEditPhoPaid(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-moss-800 focus:ring-moss-800 cursor-pointer"
                />
                <label htmlFor="phoPaid" className="text-xs font-bold cursor-pointer">
                  Fee Fotografer Sudah Dibayar (Lunas)
                </label>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold">Jumlah Total Sudah Dibayar (Rp)</label>
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
                  className="bg-white" 
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => window.open(`${process.env.REACT_APP_BACKEND_URL}/api/files/${selected.proof_file_id}`, "_blank")}
                  className="text-xs text-moss-800 underline font-semibold"
                >
                  Lihat Bukti Transfer Asli
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Batal</Button>
            <Button className="bg-moss-800 hover:bg-moss-900 text-white" onClick={saveDetail}>Simpan Perubahan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
