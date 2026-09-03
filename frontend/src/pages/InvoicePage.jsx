import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { api, rupiah, fmtDate } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

export default function InvoicePage() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [amountPaid, setAmountPaid] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadInvoice = useCallback(async () => {
    try {
      const { data } = await api.get(`/bookings/${id}`);
      setInvoice(data);
      
      const pkgPrice = parseFloat(data.package_price || 0);
      const extraTime = parseFloat(data.extra_time_charge || 0);
      const videoCharge = parseFloat(data.video_charge || 0);
      const totalKeseluruhan = pkgPrice + extraTime + videoCharge;
      const calcBalance = Math.max(totalKeseluruhan - parseFloat(data.amount_paid || 0), 0);
      
      setAmountPaid(calcBalance > 0 ? calcBalance : "");

      // Kirim data nilai uang ke Google Analytics agar tidak terbaca Rp0,00
      if (typeof window !== "undefined" && window.gtag) {
        window.gtag("event", "view_invoice", {
          currency: "IDR",
          value: totalKeseluruhan,
          items: [
            {
              item_id: data.invoice_number,
              item_name: data.package_name || "Paket Foto",
              price: totalKeseluruhan,
              quantity: 1,
            },
          ],
        });
      }
    } catch {
      toast.error("Invoice tidak ditemukan");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  const handleSubmitPelunasan = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error("Mohon upload bukti transfer pelunasan");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await api.post("/upload/proof", formData);
      const proofFileId = uploadRes.data.file_id;

      await api.post(`/bookings/${id}/confirm-payment`, {
        amount_paid: parseFloat(amountPaid),
        proof_file_id: proofFileId,
      });

      toast.success("Konfirmasi pelunasan berhasil dikirim!");
      loadInvoice();
      setFile(null);
    } catch {
      toast.error("Gagal mengirim konfirmasi pelunasan");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Memuat invoice...</div>;
  if (!invoice) return <div className="p-10 text-center">Invoice tidak valid.</div>;

  const packagePrice = parseFloat(invoice.package_price || 0);
  const extraTimeCharge = parseFloat(invoice.extra_time_charge || 0);
  const videoCharge = parseFloat(invoice.video_charge || 0);
  
  const totalKeseluruhan = packagePrice + extraTimeCharge + videoCharge;
  const balanceDue = Math.max(totalKeseluruhan - parseFloat(invoice.amount_paid || 0), 0);

  const adminWhatsApp = "628211251570";
  const waText = encodeURIComponent(
    `Halo Admin, saya sudah melunasi invoice ${invoice.invoice_number} atas nama ${invoice.full_name}. Mohon konfirmasinya ya, terima kasih!`
  );
  const waLink = `https://wa.me/${adminWhatsApp}?text=${waText}`;

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow-md my-10 border border-moss-900/10 font-sans text-[#2C2A29]">
      <div className="flex justify-between items-center border-b pb-4 mb-4">
        <div>
          <h1 className="text-xl font-bold text-moss-900">Radeyaphoto Invoice</h1>
          <p className="text-xs text-muted-foreground">{invoice.invoice_number}</p>
        </div>
        <div className="text-right">
          <span className={`text-xs px-2.5 py-1 rounded font-semibold uppercase ${balanceDue <= 0 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
            {balanceDue <= 0 ? 'Lunas (Full)' : 'DP / Belum Lunas'}
          </span>
        </div>
      </div>

      <div className="space-y-2 text-sm mb-6">
        <p><span className="font-semibold">Nama Klien:</span> {invoice.full_name}</p>
        <p><span className="font-semibold">Paket:</span> {invoice.package_name} ({rupiah(packagePrice)})</p>
        <p><span className="font-semibold">Jadwal:</span> {fmtDate(invoice.shoot_date)} ({invoice.start_time} - {invoice.end_time})</p>
        <p><span className="font-semibold">Lokasi:</span> {invoice.location}</p>
        <hr className="my-2" />
        
        {/* Informasi Rekening & Batas Pelunasan */}
        <div className="bg-slate-50 p-3 rounded-md border border-slate-200 my-3 text-xs space-y-1.5">
          <p className="text-slate-600">bisa di transfer ke sini yah kak</p>
          <p className="font-bold text-slate-800">BCA 2952093623 a/n Yulviana Kusnia</p>
          <p className="text-amber-700 font-medium pt-1 border-t border-slate-200">
            ⚠️ Batas waktu pelunasan paling lambat H-1 sebelum jadwal sesi foto.
          </p>
        </div>

        <div className="flex justify-between">
          <span>Harga Paket:</span>
          <span className="font-medium">{rupiah(packagePrice)}</span>
        </div>

        {extraTimeCharge > 0 && (
          <div className="flex justify-between text-amber-700">
            <span>{invoice.extra_time_note ? invoice.extra_time_note : 'Biaya Tambahan'}:</span>
            <span className="font-medium">+{rupiah(extraTimeCharge)}</span>
          </div>
        )}

        {videoCharge > 0 && (
          <div className="flex justify-between text-amber-700">
            <span>Penambahan Video {invoice.video_note ? `(${invoice.video_note})` : ''}:</span>
            <span className="font-medium">+{rupiah(videoCharge)}</span>
          </div>
        )}

        <div className="flex justify-between font-bold border-t pt-2">
          <span>Total Keseluruhan:</span>
          <span>{rupiah(totalKeseluruhan)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Sudah Dibayar:</span>
          <span>{rupiah(invoice.amount_paid)}</span>
        </div>
        <div className="flex justify-between text-amber-700 font-bold text-base border-t pt-2">
          <span>Sisa Tagihan:</span>
          <span>{rupiah(balanceDue)}</span>
        </div>
      </div>

      {balanceDue > 0 ? (
        <form onSubmit={handleSubmitPelunasan} className="space-y-4 border-t pt-4">
          <h3 className="font-semibold text-sm">Konfirmasi Pelunasan / Pembayaran</h3>
          <div>
            <label className="block text-xs font-medium mb-1">Nominal Pembayaran / Pelunasan (Rp)</label>
            <Input
              type="number"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              className="mt-1 bg-white"
              placeholder="Masukkan nominal yang ditransfer"
              required
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Masukkan nominal uang yang Anda transfer untuk membayar sisa tagihan.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Upload Bukti Transfer (Foto/PDF)</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              className="mt-1 block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-moss-50 file:text-moss-700 hover:file:bg-moss-100"
              required
            />
          </div>
          <Button type="submit" disabled={submitting} className="w-full bg-[#065f46] hover:bg-[#044e38] text-white">
            {submitting ? "Mengirim..." : "Kirim Konfirmasi Pelunasan"}
          </Button>
        </form>
      ) : (
        <div className="space-y-3 border-t pt-4">
          <div className="bg-emerald-50/70 border border-emerald-200/60 p-4 rounded-xl text-center text-emerald-900 font-medium text-sm">
            Pembayaran Anda sudah LUNAS! Terima kasih.
          </div>
          <a href={waLink} target="_blank" rel="noreferrer">
            <Button className="w-full h-12 rounded-xl bg-[#065f46] hover:bg-[#044e38] text-white font-medium transition-all shadow-sm">
              Konfirmasi ke WhatsApp Admin <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </a>
        </div>
      )}
    </div>
  );
}
