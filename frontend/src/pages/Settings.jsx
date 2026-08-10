import { useEffect, useState, useCallback } from "react";
import { Search, Mail, Eye, Trash2 } from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";
import { api, rupiah, fmtDate } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { toast } from "sonner";

export default function Clients() {
  const [bookings, setBookings] = useState([]);
  const [photographers, setPhotographers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [editPho, setEditPho] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editPaid, setEditPaid] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [{ data: b }, { data: p }] = await Promise.all([
        api.get("/bookings", { params: { status: statusFilter, payment_type: paymentFilter, q: search || undefined } }),
        api.get("/photographers"),
      ]);
      setBookings(b);
      setPhotographers(p);
    } catch {
      toast.error("Gagal memuat data client");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, paymentFilter, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openDetail = (b) => {
    setSelected(b);
    setEditPho(b.photographer_id || "none");
    setEditStatus(b.status);
    setEditPaid(String(b.amount_paid));
  };

  const saveDetail = async () => {
    try {
      await api.put(`/bookings/${selected.booking_id}`, {
        status: editStatus,
        photographer_id: editPho === "none" ? null : editPho,
        amount_paid: parseFloat(editPaid) || 0,
      });
      toast.success("Booking berhasil diperbarui");
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

  return (
    <AdminLayout title="Database Client" subtitle="Kelola jadwal, fotografer, dan kirim invoice">
      <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center justify-between" data-testid="client-filters">
        <div className="relative w-full sm:w-72">
          <Search className="absolute h-4 w-4 left-3 top-3 text-muted-foreground" />
          <Input
            placeholder="Cari nama, email, univ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select onValueChange={setStatusFilter} value={statusFilter}>
            <SelectTrigger className="w-[140px] bg-white">
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
            <SelectTrigger className="w-[140px] bg-white">
              <SelectValue placeholder="Pembayaran" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Pembayaran</SelectItem>
              <SelectItem value="dp">DP Saja</SelectItem>
              <SelectItem value="full">Full Payment</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

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
              {!loading && bookings.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Tidak ada client ditemukan.</td></tr>
              )}
              {bookings.map((b) => (
                <tr key={b.booking_id} className="border-b border-moss-900/5 hover:bg-moss-50/30 transition-colors">
                  <td className="p-3.5">
                    <p className="font-bold text-moss-900">{b.full_name}</p>
                    <p className="text-xs text-muted-foreground">{b.invoice_number} · {b.whatsapp}</p>
                    <p className="text-xs text-muted-foreground">{b.university} ({b.study})</p>
                  </td>
                  <td className="p-3.5">
                    <p className="font-semibold">{b.package_name}</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(b.shoot_date)} · {b.start_time}-{b.end_time}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-xs">{b.location}</p>
                  </td>
                  <td className="p-3.5">
                    {b.photographer_name ? (
                      <span className="inline-flex items-center gap-1.5 font-medium text-xs bg-moss-50 text-moss-800 px-2.5 py-1 rounded-full">
                        {b.photographer_name}
                      </span>
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
                      <button
                        title="Lihat Bukti Transfer"
                        onClick={() => window.open(`${process.env.REACT_APP_BACKEND_URL}/api/files/${b.proof_file_id}`, "_blank")}
                        className="p-1.5 rounded-md hover:bg-moss-100 text-moss-800"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        title="Kirim Invoice"
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

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail & Pengaturan Booking</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-2">
              <div className="rounded-md bg-moss-50/50 p-3 border border-moss-900/10 text-xs space-y-1">
                <p><span className="font-bold">Client:</span> {selected.full_name} ({selected.whatsapp})</p>
                <p><span className="font-bold">Kampus:</span> {selected.university} — {selected.study}</p>
                <p><span className="font-bold">Paket:</span> {selected.package_name} ({rupiah(selected.package_price)})</p>
                <p><span className="font-bold">Jadwal:</span> {fmtDate(selected.shoot_date)} ({selected.start_time} - {selected.end_time})</p>
                <p><span className="font-bold">Lokasi:</span> {selected.location}</p>
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
                <label className="text-xs font-bold">Tugaskan Fotografer</label>
                <Select onValueChange={setEditPho} value={editPho}>
                  <SelectTrigger className="bg-white"><SelectValue placeholder="Pilih fotografer" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Belum Ditugaskan —</SelectItem>
                    {photographers.map((p) => (
                      <SelectItem key={p.photographer_id} value={p.photographer_id}>
                        {p.name} (Fee: {rupiah(p.fee_per_session)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold">Jumlah Dibayar (Rp)</label>
                <Input type="number" value={editPaid} onChange={(e) => setEditPaid(e.target.value)} className="bg-white" />
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
