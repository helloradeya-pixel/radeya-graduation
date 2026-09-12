import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { api, rupiah, fmtDate } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import { ArrowRight, ExternalLink } from "lucide-react";

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

      const paidVal = parseFloat(amountPaid);

      await api.post(`/bookings/${id}/confirm-payment`, {
        amount_paid: paidVal,
        proof_file_id: proofFileId,
      });

      if (typeof window !== "undefined" && window.gtag) {
        window.gtag("event", "purchase", {
          transaction_id: `pelunasan_${invoice.invoice_number}_${Date.now()}`,
          value: paidVal,
          currency: "IDR",
          items: [
            {
              item_id: invoice.invoice_number,
              item_name: `Pelunasan - ${invoice.package_name || "Paket Foto"}`,
              price: paidVal,
              quantity: 1,
            },
          ],
        });
      }

      toast.success("Konfirmasi pelunasan berhasil dikirim!");
      loadInvoice();
      setFile(null);
    } catch {
      toast.error("Gagal mengirim konfirmasi pelunasan");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-xs">Memuat invoice...</div>;
  if (!invoice) return <div className="p-10 text-center text-xs">Invoice tidak valid.</div>;

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
    <div className="max-w-xl mx-auto p-4 sm:p-6 bg-white rounded-lg shadow-sm my-4 border border-moss-900/10 font-sans text-[#2C2A29] text-xs">
      <div className="flex justify-between items-center border-b pb-2 mb-3">
        <div>
          <h1 className="text-base font-bold text-moss-900">Radeyaphoto Invoice</h1>
          <p className="text-[11px] text-muted-foreground">{invoice.invoice_number}</p>
        </div>
        <div className="text-right">
          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${balanceDue <= 0 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
            {balanceDue <= 0 ? 'Lunas (Full)' : 'DP / Belum Lunas'}
          </span>
        </div>
      </div>

      <div className="space-y-1.5 mb-4">
        <p><span className="font-semibold">Nama Klien:</span> {invoice.full_name}</p>
        <p><span className="font-semibold">Paket:</span> {invoice.package_name} ({rupiah(packagePrice)})</p>
        <p><span className="font-semibold">Jadwal:</span> {fmtDate(invoice.shoot_date)} ({invoice.start_time} - {invoice.end_time})</p>
        <p><span className="font-semibold">Lokasi:</span> {invoice.location}</p>
        <hr className="my-1.5" />
        
        <div className="bg-slate-50 p-2.5 rounded-md border border-slate-200 my-2 space-y-1">
          <p className="text-slate-600">bisa di transfer ke sini yah kak</p>
          <p className="font-bold text-slate-800">BCA 2952093623 a/n Yulviana Kusnia</p>
          <p className="text-amber-700 font-medium pt-1 border-t border-slate-200 text-[11px]">
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

        <div className="flex justify-between font-bold border-t pt-1.5">
          <span>Total Keseluruhan:</span>
          <span>{rupiah(totalKeseluruhan)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Sudah Dibayar:</span>
          <span>{rupiah(invoice.amount_paid)}</span>
        </div>
        <div className="flex justify-between text-amber-700 font-bold border-t pt-1.5">
          <span>Sisa Tagihan:</span>
          <span>{rupiah(balanceDue)}</span>
        </div>

        {/* ======================================================== */}
        {/* BAGIAN BARU: TAMPILAN TOMBOL BUKTI TRANSFER */}
        {/* ======================================================== */}
        {invoice.proof_file_id && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-md border border-slate-200">
              <div>
                <span className="font-semibold block text-xs text-moss-900">Bukti Transfer</span>
                <span className="text-[10px] text-muted-foreground">File pembayaran terlampir</span>
              </div>
              <a href={`/api/files/${invoice.proof_file_id}`} target="_blank" rel="noreferrer">
                <Button variant="outline" className="h-8 text-xs gap-1 border-moss-900/20 text-moss-900 hover:bg-moss-50">
                  <ExternalLink className="h-3 w-3" /> Lihat Bukti
                </Button>
              </a>
            </div>
          </div>
        )}
        {/* ======================================================== */}

      </div>

      {balanceDue > 0 ? (
        <form onSubmit={handleSubmitPelunasan} className="space-y-3 border-t pt-3">
          <h3 className="font-semibold text-xs">Konfirmasi Pelunasan / Pembayaran</h3>
          <div>
            <label className="block text-[11px] font-medium mb-0.5">Nominal Pembayaran / Pelunasan (Rp)</label>
            <Input
              type="number"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              className="mt-0.5 bg-white h-8 text-xs"
              placeholder="Masukkan nominal yang ditransfer"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium mb-0.5">Upload Bukti Transfer (Foto/PDF)</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              className="mt-0.5 block w-full text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-moss-50 file:text-moss-700 hover:file:bg-moss-100"
              required
            />
          </div>
          <Button type="submit" disabled={submitting} className="w-full h-9 bg-[#065f46] hover:bg-[#044e38] text-white text-xs">
            {submitting ? "Mengirim..." : "Kirim Konfirmasi Pelunasan"}
          </Button>
        </form>
      ) : (
        <div className="space-y-2 border-t pt-3">
          <div className="bg-emerald-50/70 border border-emerald-200/60 p-3 rounded-lg text-center text-emerald-900 font-medium text-xs">
            Pembayaran Anda sudah LUNAS! Terima kasih.
          </div>
          <a href={waLink} target="_blank" rel="noreferrer">
            <Button className="w-full h-10 rounded-lg bg-[#065f46] hover:bg-[#044e38] text-white font-medium text-xs shadow-sm">
              Konfirmasi ke WhatsApp Admin <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </a>
        </div>
      )}
    </div>
  );
}
