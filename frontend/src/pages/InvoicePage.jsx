import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, rupiah, fmtDate } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";

export default function InvoicePage() {
  const { id } = useParams(); // Mengambil booking_id dari URL
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [amountPaid, setAmountPaid] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadInvoice = async () => {
    try {
      const { data } = await api.get(`/bookings/${id}/invoice`);
      setInvoice(data.booking);
      setAmountPaid(data.booking.amount_paid);
    } catch {
      toast.error("Invoice tidak ditemukan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoice();
  }, [id]);

  const handleSubmitPelunasan = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error("Mohon upload bukti transfer pelunasan");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upload file bukti transfer
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await api.post("/upload/proof", formData);
      const proofFileId = uploadRes.data.file_id;

      // 2. Kirim konfirmasi pelunasan
      await api.post(`/bookings/${id}/confirm-payment`, {
        amount_paid: parseFloat(amountPaid),
        proof_file_id: proofFileId,
      });

      toast.success("Konfirmasi pelunasan berhasil dikirim!");
      loadInvoice();
    } catch {
      toast.error("Gagal mengirim konfirmasi pelunasan");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Memuat invoice...</div>;
  if (!invoice) return <div className="p-10 text-center">Invoice tidak valid.</div>;

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow-md my-10 border border-moss-900/10">
      <div className="flex justify-between items-center border-b pb-4 mb-4">
        <div>
          <h1 className="text-xl font-bold text-moss-900">Radeyaphoto Invoice</h1>
          <p className="text-xs text-muted-foreground">{invoice.invoice_number}</p>
        </div>
        <div className="text-right">
          <span className={`text-xs px-2.5 py-1 rounded font-semibold uppercase ${invoice.payment_type === 'full' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
            {invoice.payment_type === 'full' ? 'Lunas (Full)' : 'DP / Belum Lunas'}
          </span>
        </div>
      </div>

      <div className="space-y-2 text-sm mb-6">
        <p><span className="font-semibold">Nama Klien:</span> {invoice.full_name}</p>
        <p><span className="font-semibold">Paket:</span> {invoice.package_name} ({rupiah(invoice.package_price)})</p>
        <p><span className="font-semibold">Jadwal:</span> {fmtDate(invoice.shoot_date)} ({invoice.start_time} - {invoice.end_time})</p>
        <p><span className="font-semibold">Lokasi:</span> {invoice.location}</p>
        <hr className="my-2" />
        <p><span className="font-semibold">Total Harga:</span> {rupiah(invoice.package_price)}</p>
        <p><span className="font-semibold">Sudah Dibayar:</span> {rupiah(invoice.amount_paid)}</p>
        <p className="text-amberx font-bold"><span className="font-semibold">Sisa Tagihan:</span> {rupiah(invoice.balance_due)}</p>
      </div>

      {invoice.balance_due > 0 ? (
        <form onSubmit={handleSubmitPelunasan} className="space-y-4 border-t pt-4">
          <h3 className="font-semibold text-sm">Konfirmasi Pelunasan / Pembayaran</h3>
          <div>
            <label className="text-xs font-medium">Total Jumlah yang Sudah Dibayar (Rp)</label>
            <Input
              type="number"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              className="mt-1 bg-white"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium">Upload Bukti Transfer (Foto/PDF)</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              className="mt-1 block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-moss-50 file:text-moss-700 hover:file:bg-moss-100"
              required
            />
          </div>
          <Button type="submit" disabled={submitting} className="w-full bg-moss-800 text-white">
            {submitting ? "Mengirim..." : "Kirim Konfirmasi Pelunasan"}
          </Button>
        </form>
      ) : (
        <div className="bg-green-50 p-4 rounded-md text-center text-green-800 font-semibold text-sm">
          Pembayaran Anda sudah LUNAS! Terima kasih.
        </div>
      )}
    </div>
  );
}
