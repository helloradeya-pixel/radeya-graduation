import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { toast } from "sonner";
import {
  Camera, CalendarDays, MapPin, Clock, Upload, CheckCircle2, ArrowRight,
  Instagram, Phone, GraduationCap, FileImage, ExternalLink, X, Loader2, CreditCard, FileText,
} from "lucide-react";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { api, rupiah } from "../lib/api";

import { trackPurchase, formatPhone } from "../lib/tracking";

const HERO = "https://images.unsplash.com/photo-1561409958-c0e6ad782a81?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2MzR8MHwxfHNlYXJjaHwxfHxvdXRkb29yJTIwZ3JhZHVhdGlvbiUyMHBob3RvfGVufDB8fHx8MTc4NjMzODI2Nnww&ixlib=rb-4.1.0&q=85";

const Section = ({ n, title, desc, children }) => (
  <section className="border-t border-[#EBE7DF] pt-8 mt-8 first:mt-0 first:border-0 first:pt-0">
    <div className="flex items-baseline gap-3">
      <span className="font-display text-xs font-semibold text-[#BEAF9D]">0{n}</span>
      <div>
        <h3 className="text-xl sm:text-2xl font-serif text-[#2C2A29] tracking-tight">{title}</h3>
        <p className="text-sm text-[#666666] mt-1">{desc}</p>
      </div>
    </div>
    <div className="mt-6 grid gap-5 sm:grid-cols-2">{children}</div>
  </section>
);

const Field = ({ label, icon: Icon, children, full }) => (
  <div className={full ? "sm:col-span-2 min-w-0" : "min-w-0"}>
    <Label className="text-xs uppercase tracking-wider text-[#666666] font-medium flex items-center gap-1.5 mb-2">
      {Icon && <Icon className="h-3.5 w-3.5 text-[#BEAF9D]" />} {label}
    </Label>
    {children}
  </div>
);

export default function BookingPage() {
  const [packages, setPackages] = useState([]);
  const [date, setDate] = useState();
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [f, setF] = useState({
    full_name: "", email: "", instagram: "", whatsapp: "", university: "", study: "",
    package_id: "", location: "", start_time: "", end_time: "", payment_type: "dp", notes: "",
  });

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target?.value ?? e }));
  const pkg = Array.isArray(packages) ? packages.find((p) => p.package_id === f.package_id) : undefined;
  const amount = pkg ? (f.payment_type === "dp" ? pkg.dp_amount || Math.round(pkg.price * 0.3) : pkg.price) : 0;

  // Tangkap dan amankan fbclid dari URL iklan
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const fbclid = urlParams.get('fbclid');

    if (fbclid) {
      const fbcValue = `fb.1.${Date.now()}.${fbclid}`;
      localStorage.setItem('fbc', fbcValue);
      
      const cookieDate = new Date();
      cookieDate.setTime(cookieDate.getTime() + (30 * 24 * 60 * 60 * 1000));
      document.cookie = `_fbc=${fbcValue}; expires=${cookieDate.toUTCString()}; path=/; SameSite=Lax`;
    }
  }, []);

  useEffect(() => {
    api.get("/packages", { params: { only_active: true } })
      .then(({ data }) => {
        setPackages(Array.isArray(data) ? data : (data?.data || data?.packages || []));
      })
      .catch(() => {
        setPackages([]);
      });
  }, []);

  const getCookie = (name) => {
    if (typeof document === 'undefined') return '';
    return document.cookie.split('; ').find(row => row.startsWith(name + '='))?.split('=')[1] || '';
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!f.package_id) return toast.error("Pilih paket foto dulu ya");
    if (!date) return toast.error("Tanggal foto belum dipilih");
    if (!file) return toast.error("Bukti transfer wajib diupload");
    if (f.start_time >= f.end_time) return toast.error("Jam selesai harus setelah jam mulai");

    setSubmitting(true);
    try {
      // 1. Upload Bukti Transfer
      const fd = new FormData();
      fd.append("file", file);
      const { data: up } = await api.post("/upload/proof", fd, { headers: { "Content-Type": "multipart/form-data" } });

      // 2. Normalisasi nomor WhatsApp ke standar E.164 Meta (628xxx)
      const cleanPhone = formatPhone(f.whatsapp);

      // 3. Generator Event ID Deterministik untuk Deduplikasi Event Meta
      const formattedDate = format(date, "yyyyMMdd");
      const eventId = `purchase_${cleanPhone}_${formattedDate}`;

      const body = new FormData();
      Object.entries(f).forEach(([k, v]) => {
        if (k === 'whatsapp') {
          body.append(k, cleanPhone);
        } else {
          body.append(k, v);
        }
      });
      body.append("shoot_date", format(date, "yyyy-MM-dd"));
      body.append("amount_paid", String(amount));
      body.append("proof_file_id", up.file_id);
      body.append("event_id", eventId);
      
      const fbc = getCookie('_fbc') || localStorage.getItem('fbc') || "";
      const fbp = getCookie('_fbp') || localStorage.getItem('fbp') || "";
      
      body.append("fbc", fbc);
      body.append("fbp", fbp);

      // 4. Simpan Ke Database Backend FastAPI (FastAPI akan otomatis memicu CAPI server-side 1x)
      const { data } = await api.post("/bookings", body);

      const finalEventId = data.invoice_number || eventId;

      // Pisahkan nama depan dan nama belakang untuk parameter standar Meta EMQ
      const namaParts = f.full_name.trim().split(' ');
      const fn = namaParts[0] || "";
      const ln = namaParts.slice(1).join(' ') || "";

      // 5. Trigger Meta Pixel Browser (Purchase) dengan eventID konsisten
      trackPurchase(
        'booking_wisuda',
        {
          package_id: f.package_id,
          amount_paid: amount,
          university: f.university,
        },
        {
          ph: cleanPhone,
          em: f.email,
          fn: fn,
          ln: ln,
        },
        { eventID: finalEventId }
      );

      // 6. Trigger Google Analytics (GA4)
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'purchase', {
          transaction_id: finalEventId,
          value: amount,
          currency: 'IDR',
          items: [{
            item_id: f.package_id,
            item_name: pkg?.name || 'Paket Foto Wisuda',
            price: amount,
            quantity: 1
          }]
        });
      }

      setResult(data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Gagal mengirim booking. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  if (result)
    return (
      <div className="min-h-screen bg-[#F8F6F0] text-[#2C2A29] px-4 py-16 flex items-center justify-center font-sans overflow-x-hidden">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-lg w-full rounded-3xl border border-[#EBE7DF] bg-white p-8 shadow-sm"
          data-testid="booking-success"
        >
          <div className="h-12 w-12 rounded-full bg-[#BEAF9D]/20 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-[#BEAF9D]" />
          </div>
          <h2 className="text-2xl font-serif text-[#2C2A29] tracking-tight mt-6">Booking Terkirim!</h2>
          <p className="text-sm text-[#666666] mt-2">
            No. Invoice <span className="font-semibold text-[#2C2A29]" data-testid="success-invoice-number">{result.invoice_number}</span>.
            Langkah terakhir: konfirmasi transfer dan kirim detail booking ke admin via WhatsApp.
          </p>

          <dl className="mt-6 space-y-2 rounded-2xl bg-[#F8F6F0] p-4 text-sm">
            {[["Nama", result.full_name], ["Paket", result.package_name],
              ["Tanggal", result.shoot_date], ["Jam", `${result.start_time} - ${result.end_time}`],
              ["Lokasi", result.location],
              ["Dibayar", `${rupiah(result.amount_paid)} (${result.payment_type === "dp" ? "DP" : "Full"})`],
              ["Sisa", rupiah(result.balance_due)]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-[#666666]">{k}</dt>
                <dd className="font-medium text-right text-[#2C2A29]">{v}</dd>
              </div>
            ))}
          </dl>

          <a href={result.whatsapp_link} target="_blank" rel="noreferrer" data-testid="share-whatsapp-button">
            <Button className="mt-6 w-full h-12 rounded-2xl bg-[#BEAF9D] hover:bg-[#A89987] text-white font-medium transition-all shadow-sm">
              Konfirmasi via WhatsApp <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </a>
          
          <button
            onClick={() => { setResult(null); setFile(null); setDate(undefined); }}
            data-testid="new-booking-button"
            className="mt-6 w-full text-sm font-medium text-[#BEAF9D] underline underline-offset-4 text-center"
          >
            Buat booking lagi
          </button>
        </motion.div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F8F6F0] text-[#2C2A29] font-sans pb-16 overflow-x-hidden">
      <header className="sticky top-0 z-40 border-b border-[#EBE7DF] bg-[#F8F6F0]/90 backdrop-blur-xl">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-[#2C2A29]">
            <Camera className="h-5 w-5 text-[#BEAF9D]" />
            <span className="font-serif font-semibold tracking-wider text-lg">Radeyaphoto</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-[#2C2A29] text-white py-14 px-4 sm:px-6 text-center">
        <div className="absolute inset-0 opacity-20">
          <img src={HERO} alt="Graduation outdoor" className="h-full w-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-[#2C2A29]/85" />
        <div className="relative z-10 max-w-xl mx-auto">
          <p className="text-xs uppercase tracking-[0.25em] text-[#BEAF9D] font-medium">Limited Slots Available</p>
          <h1 className="mt-3 text-3xl sm:text-5xl font-serif font-normal tracking-tight leading-tight">
            Capture Your <span className="italic text-[#BEAF9D]">Special Chapter</span>.
          </h1>
          <p className="mt-4 text-[#EBE7DF]/80 text-sm max-w-md mx-auto leading-relaxed">
            Choose your package, transfer to the designated bank account, upload payment proof, and confirm via WhatsApp.
          </p>
        </div>
      </div>

      {/* Main Form Container */}
      <form onSubmit={submit} className="mx-auto max-w-4xl px-4 sm:px-6 py-10 w-full" data-testid="booking-form">
        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-6 sm:p-10 shadow-sm space-y-10 w-full max-w-full">
          
          <Section n={1} title="Data Diri" desc="Pastikan email & WhatsApp aktif, invoice dikirim ke sana.">
            <Field label="Nama Lengkap">
              <Input data-testid="input-full-name" required value={f.full_name} onChange={set("full_name")} placeholder="Nama sesuai ijazah" className="h-11 rounded-xl bg-[#F8F6F0]/50 border-[#EBE7DF] w-full" />
            </Field>
            <Field label="Email">
              <Input data-testid="input-email" type="email" required value={f.email} onChange={set("email")} placeholder="nama@email.com" className="h-11 rounded-xl bg-[#F8F6F0]/50 border-[#EBE7DF] w-full" />
            </Field>
            <Field label="Instagram" icon={Instagram}>
              <Input data-testid="input-instagram" required value={f.instagram} onChange={set("instagram")} placeholder="username" className="h-11 rounded-xl bg-[#F8F6F0]/50 border-[#EBE7DF] w-full" />
            </Field>
            <Field label="WhatsApp" icon={Phone}>
              <Input data-testid="input-whatsapp" required value={f.whatsapp} onChange={set("whatsapp")} placeholder="08xxxxxxxxxx" className="h-11 rounded-xl bg-[#F8F6F0]/50 border-[#EBE7DF] w-full" />
            </Field>
            <Field label="Universitas" icon={GraduationCap}>
              <Input data-testid="input-university" required value={f.university} onChange={set("university")} placeholder="Nama universitas" className="h-11 rounded-xl bg-[#F8F6F0]/50 border-[#EBE7DF] w-full" />
            </Field>
            <Field label="Program Studi">
              <Input data-testid="input-study" required value={f.study} onChange={set("study")} placeholder="Jurusan / prodi" className="h-11 rounded-xl bg-[#F8F6F0]/50 border-[#EBE7DF] w-full" />
            </Field>
          </Section>

          <Section n={2} title="Detail Sesi Foto" desc="Pilih paket, tanggal, lokasi, dan jam sesi kamu.">
            
            {/* DROPDOWN PILIHAN PAKET FOTO */}
            <div className="sm:col-span-2 min-w-0">
              <Label className="text-xs uppercase tracking-wider text-[#666666] font-medium mb-2 block">
                Pilih Paket Foto
              </Label>
              <select
                data-testid="package-select"
                required
                value={f.package_id}
                onChange={(e) => setF((s) => ({ ...s, package_id: e.target.value }))}
                className="w-full max-w-full h-12 px-4 rounded-xl bg-[#F8F6F0]/50 border border-[#EBE7DF] text-[#2C2A29] text-sm focus:outline-none focus:border-[#BEAF9D]"
              >
                <option value="" disabled>-- Pilih paket sesuai pricelist WhatsApp --</option>
                {(Array.isArray(packages) ? packages : []).map((p) => (
                  <option key={p.package_id} value={p.package_id}>
                    {p.name} — {rupiah(p.price)} {p.description ? `(${p.description})` : ""}
                  </option>
                ))}
              </select>

              {/* Menampilkan ringkasan info paket yang sedang dipilih */}
              {pkg && (
                <div className="mt-3 p-4 rounded-xl bg-[#F8F6F0] border border-[#EBE7DF] text-xs text-[#666666] flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-[#2C2A29]">{pkg.name}</span>
                    {pkg.description && <p className="mt-0.5">{pkg.description}</p>}
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-[#2C2A29] text-sm">{rupiah(pkg.price)}</span>
                    <p className="text-[11px] text-[#BEAF9D] font-medium">Min. DP: {rupiah(pkg.dp_amount || Math.round(pkg.price * 0.3))}</p>
                  </div>
                </div>
              )}
            </div>

            <Field label="Tanggal Foto" icon={CalendarDays}>
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" data-testid="date-picker-trigger" className="h-11 w-full justify-start rounded-xl border-[#EBE7DF] bg-[#F8F6F0]/50 font-normal hover:bg-[#F8F6F0]">
                    {date ? format(date, "d MMMM yyyy", { locale: idLocale }) : "Pilih tanggal"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl border-[#EBE7DF]" align="start">
                  <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                </PopoverContent>
              </Popover>
            </Field>

            <Field label="Lokasi Foto" icon={MapPin}>
              <Input data-testid="input-location" required value={f.location} onChange={set("location")} placeholder="Contoh: Kampus UI Depok" className="h-11 rounded-xl bg-[#F8F6F0]/50 border-[#EBE7DF] w-full" />
            </Field>
            <Field label="Jam Mulai" icon={Clock}>
              <Input data-testid="input-start-time" type="time" required value={f.start_time} onChange={set("start_time")} className="h-11 rounded-xl bg-[#F8F6F0]/50 border-[#EBE7DF] w-full" />
            </Field>
            <Field label="Jam Selesai" icon={Clock}>
              <Input data-testid="input-end-time" type="time" required value={f.end_time} onChange={set("end_time")} className="h-11 rounded-xl bg-[#F8F6F0]/50 border-[#EBE7DF] w-full" />
            </Field>
            <Field label="Catatan (opsional)" full>
              <Textarea data-testid="input-notes" value={f.notes} onChange={set("notes")} placeholder="Request khusus, Strobist ,dll." rows={3} className="rounded-xl bg-[#F8F6F0]/50 border-[#EBE7DF] w-full" />
            </Field>
          </Section>

          <Section n={3} title="Pembayaran & Rekening" desc="Lakukan transfer ke rekening di bawah sebelum upload bukti bayar.">
            {/* Kotak Informasi Rekening Bank */}
            <div className="sm:col-span-2 rounded-2xl bg-[#F8F6F0] p-5 border border-[#EBE7DF] space-y-3 min-w-0">
              <div className="flex items-center gap-2 text-[#2C2A29] font-serif font-semibold text-sm">
                <CreditCard className="h-4 w-4 text-[#BEAF9D]" />
                <span>Silakan Transfer Pembayaran Ke:</span>
              </div>
              <div className="grid gap-2 text-xs text-[#666666]">
                <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-[#EBE7DF]">
                  <div>
                    <span className="font-semibold text-[#2C2A29]">BCA Digital (blu)</span>
                    <p className="font-mono text-sm text-[#2C2A29] mt-0.5">005506102026</p>
                  </div>
                  <span className="text-[11px] text-[#888] text-right">a.n. Ade Sutiawan</span>
                </div>
              </div>
            </div>

            <div className="sm:col-span-2 min-w-0">
              <RadioGroup value={f.payment_type} onValueChange={(v) => setF((s) => ({ ...s, payment_type: v }))} className="grid gap-3 sm:grid-cols-2">
                {[["dp", "Bayar DP", "Pelunasan paling telat H-1"], ["full", "Full Payment", "Langsung lunas, bebas pikiran"]].map(([v, t, d]) => (
                  <label
                    key={v}
                    data-testid={`payment-option-${v}`}
                    className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition-all duration-200 ${
                      f.payment_type === v ? "border-[#BEAF9D] bg-[#F8F6F0] shadow-sm" : "border-[#EBE7DF] bg-white hover:border-[#BEAF9D]/50"
                    }`}
                  >
                    <RadioGroupItem value={v} className="mt-1 text-[#BEAF9D]" />
                    <span className="min-w-0">
                      <span className="block font-semibold text-sm text-[#2C2A29]">{t}</span>
                      <span className="block text-xs text-[#666666] mt-0.5">{d}</span>
                    </span>
                  </label>
                ))}
              </RadioGroup>

              <div className="mt-4 flex items-center justify-between rounded-2xl border border-dashed border-[#BEAF9D]/40 bg-[#F8F6F0] px-5 py-4">
                <span className="text-xs uppercase tracking-wider text-[#666666] font-medium">Jumlah yang ditransfer</span>
                <span className="font-serif text-xl font-bold text-[#2C2A29]" data-testid="amount-to-pay">{rupiah(amount)}</span>
              </div>
            </div>

            <div className="sm:col-span-2 min-w-0">
              <Label className="text-xs uppercase tracking-wider text-[#666666] font-medium mb-2 block">Bukti Transfer</Label>
              {file ? (
                <div className="flex items-center gap-3 rounded-2xl border border-[#EBE7DF] bg-[#F8F6F0] p-4" data-testid="proof-file-selected">
                  <FileImage className="h-5 w-5 text-[#BEAF9D] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#2C2A29]">{file.name}</p>
                    <p className="text-xs text-[#666666]">{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button type="button" data-testid="remove-proof-button" onClick={() => setFile(null)} className="text-[#666666] hover:text-destructive transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label
                  data-testid="proof-upload-zone"
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#EBE7DF] bg-[#F8F6F0]/40 py-10 cursor-pointer hover:border-[#BEAF9D] hover:bg-[#F8F6F0] transition-colors"
                >
                  <Upload className="h-6 w-6 text-[#BEAF9D]" />
                  <span className="text-sm font-medium text-[#2C2A29]">Upload bukti transfer</span>
                  <span className="text-xs text-[#666666]">JPG, PNG, WEBP atau PDF · maks 6MB</span>
                  <input
                    data-testid="proof-file-input"
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </label>
              )}
            </div>
          </Section>

          {/* Kotak Syarat dan Ketentuan (T&C) */}
          <div className="rounded-2xl bg-[#F8F6F0] p-6 border border-[#EBE7DF] space-y-4">
            <div className="flex items-center gap-2 text-[#2C2A29] font-serif font-semibold text-base">
              <FileText className="h-5 w-5 text-[#BEAF9D]" />
              <span>Terms & Conditions (T&C)</span>
            </div>
            <p className="text-xs sm:text-sm text-[#666666]">
              Sebelum dan sesudah pembayaran DP, klien wajib telah membaca dan menyetujui seluruh ketentuan berikut.
            </p>
            
            <div className="space-y-4 text-xs sm:text-sm text-[#666666] leading-relaxed">
              <div>
                <span className="font-semibold text-[#2C2A29]">1. Booking & Pembayaran</span>
                <ul className="mt-1 space-y-1 list-disc list-inside">
                  <li>Follow Instagram <strong>@radeya.graduation</strong> dan TikTok <strong>@radeyaphoto</strong>[span_0](start_span)[span_0](end_span).</li>
                  <li>Pastikan ketersediaan slot kepada admin sebelum booking[span_1](start_span)[span_1](end_span).</li>
                  <li>Booking dikonfirmasi setelah DP 200rb diterima melalui <strong>BLU by BCA Digital 005506102026 a.n. Ade Sutiawan</strong>[span_2](start_span)[span_2](end_span).</li>
                  <li>DP bersifat <strong>non-refundable</strong>, kecuali dalam kondisi force majeure ketidaksiapan dari pihak RADEYA[span_3](start_span)[span_3](end_span).</li>
                  <li>Wajib pelunasan maksimal <strong>H-1</strong> sebelum sesi[span_4](start_span)[span_4](end_span).</li>
                </ul>
              </div>

              <div>
                <span className="font-semibold text-[#2C2A29]">2. Jadwal & Reschedule</span>
                <ul className="mt-1 space-y-1 list-disc list-inside">
                  <li>Informasi final mengenai jam, lokasi, dan lainnya diberikan maksimal <strong>H-10</strong>, menyesuaikan ketersediaan slot[span_5](start_span)[span_5](end_span).</li>
                  <li>Reschedule diperbolehkan <strong>1 kali</strong>, maksimal <strong>H-10</strong> dan mengikuti ketersediaan jadwal[span_6](start_span)[span_6](end_span).</li>
                  <li>Reschedule lainnya sebelum <strong>H-5</strong> dikenakan biaya <strong>Rp100.000</strong>[span_7](start_span)[span_7](end_span).</li>
                  <li>Reschedule setelah <strong>H-5</strong> dikenakan biaya <strong>Rp200.000</strong>[span_8](start_span)[span_8](end_span).</li>
                  <li>Reschedule di <strong>Hari H</strong> dikenakan <strong>Rp300.000</strong>[span_9](start_span)[span_9](end_span).</li>
                  <li>Pembatalan dari pihak klien tidak disertai pengembalian DP[span_10](start_span)[span_10](end_span).</li>
                  <li>Apabila terjadi hujan deras atau kondisi cuaca/lokasi yang tidak memungkinkan, perubahan jadwal dapat dikoordinasikan bersama admin[span_11](start_span)[span_11](end_span). Pengecualian biaya reschedule akan disesuaikan dengan kondisi dan hasil koordinasi[span_12](start_span)[span_12](end_span).</li>
                </ul>
              </div>

              <div>
                <span className="font-semibold text-[#2C2A29]">3. Ketentuan Sesi Foto</span>
                <ul className="mt-1 space-y-1 list-disc list-inside">
                  <li>Durasi pemotretan mengikuti paket yang dipilih dan <strong>dihitung sejak jam booking</strong>[span_13](start_span)[span_13](end_span).</li>
                  <li>Klien wajib <strong>hadir tepat waktu</strong>[span_14](start_span)[span_14](end_span). Keterlambatan tetap mengurangi durasi sesi dan tidak mendapatkan tambahan waktu[span_15](start_span)[span_15](end_span).</li>
                  <li>Permintaan pose, referensi, dan mood board hanya berasal dari portofolio IG <strong>@radeya.graduation</strong>[span_16](start_span)[span_16](end_span).</li>
                  <li>Penambahan peserta, durasi, atau layanan lainnya mengikuti <strong>ketentuan add-ons</strong> dan wajib dikonfirmasi kepada admin[span_17](start_span)[span_17](end_span).</li>
                </ul>
              </div>

              <div>
                <span className="font-semibold text-[#2C2A29]">4. Pengiriman & Editing</span>
                <ul className="mt-1 space-y-1 list-disc list-inside">
                  <li>Seluruh file foto dikirim maksimal <strong>H+1</strong> setelah pemotretan melalui Google Drive[span_18](start_span)[span_18](end_span).</li>
                  <li>Klien wajib memilih foto yang akan diedit maksimal <strong>7 hari</strong> setelah file diterima[span_19](start_span)[span_19](end_span).</li>
                  <li>Keterlambatan pemilihan foto dari klien dapat menyebabkan mundurnya estimasi pengerjaan editing[span_20](start_span)[span_20](end_span).</li>
                  <li>Proses editing berlangsung <strong>1-14 hari kerja</strong> setelah pilihan foto diterima[span_21](start_span)[span_21](end_span).</li>
                  <li>Hasil akhir dikirim melalui WhatsApp admin[span_22](start_span)[span_22](end_span).</li>
                  <li>Editing standar mencakup <strong>penyesuaian warna, tone, dan pencahayaan</strong>[span_23](start_span)[span_23](end_span). Retouch detail atau manipulasi foto khusus tidak termasuk dalam layanan standar[span_24](start_span)[span_24](end_span).</li>
                </ul>
              </div>

              <div>
                <span className="font-semibold text-[#2C2A29]">5. Penyimpanan File</span>
                <ul className="mt-1 space-y-1 list-disc list-inside">
                  <li>File Google Drive dapat diakses maksimal <strong>H+30</strong> setelah hasil akhir dikirim[span_25](start_span)[span_25](end_span).</li>
                  <li>Permintaan pengiriman ulang setelah H+30 dikenakan biaya <strong>Rp150.000</strong>, selama file masih tersedia di arsip Radeya[span_26](start_span)[span_26](end_span).</li>
                </ul>
              </div>

              <div>
                <span className="font-semibold text-[#2C2A29]">6. Publikasi & Ketentuan Lain</span>
                <ul className="mt-1 space-y-1 list-disc list-inside">
                  <li>Klien wajib mencantumkan tag <strong>@radeya.graduation</strong> saat mengunggah hasil foto ke Instagram atau TikTok[span_27](start_span)[span_27](end_span).</li>
                  <li>Seluruh perubahan jadwal, lokasi, peserta, dan layanan wajib dikomunikasikan melalui admin[span_28](start_span)[span_28](end_span).</li>
                  <li>Hal-hal di luar ketentuan ini akan dikoordinasikan lebih lanjut bersama admin Radeya Graduation[span_29](start_span)[span_29](end_span).</li>
                </ul>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            data-testid="submit-booking-button"
            className="w-full h-14 rounded-2xl bg-[#BEAF9D] hover:bg-[#A89987] text-white text-sm uppercase tracking-wider font-semibold transition-all shadow-sm"
          >
            {submitting ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Mengirim...</> : <>Kirim Booking <ArrowRight className="ml-2 h-5 w-5" /></>}
          </Button>
          <p className="text-center text-xs text-[#666666] flex items-center justify-center gap-1">
            Setelah submit kamu akan diarahkan untuk konfirmasi via WhatsApp admin <ExternalLink className="h-3 w-3" />
          </p>

        </div>
      </form>

      <footer className="border-t border-[#EBE7DF] py-10 text-center text-xs text-[#666666] tracking-wide">
        © 2026 Radeyaphoto. All rights reserved.
      </footer>
    </div>
  );
}
