import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { toast } from "sonner";
import {
  Camera, CalendarDays, MapPin, Clock, Upload, CheckCircle2, ArrowRight,
  Instagram, Phone, GraduationCap, FileImage, ExternalLink, X,
} from "lucide-react";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { api, rupiah } from "../lib/api";

const HERO = "https://images.unsplash.com/photo-1561409958-c0e6ad782a81?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2MzR8MHwxfHNlYXJjaHwxfHxvdXRkb29yJTIwZ3JhZHVhdGlvbiUyMHBob3RvfGVufDB8fHx8MTc4NjMzODI2Nnww&ixlib=rb-4.1.0&q=85";
const FEATURE = "https://images.unsplash.com/photo-1570708815241-ab70c41765e9?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2MzR8MHwxfHNlYXJjaHw0fHxvdXRkb29yJTIwZ3JhZHVhdGlvbiUyMHBob3RvfGVufDB8fHx8MTc4NjMzODI2Nnww&ixlib=rb-4.1.0&q=85";
const SHOOTER = "https://images.unsplash.com/photo-1618151193636-acf8bed54982?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTF8MHwxfHNlYXJjaHwyfHxwaG90b2dyYXBoZXIlMjBjYW1lcmElMjBvdXRkb29yfGVufDB8fHx8MTc4NjMzODI2Nnww&ixlib=rb-4.1.0&q=85";

const Section = ({ n, title, desc, children }) => (
  <section className="border-t border-moss-900/10 pt-10 mt-10 first:mt-0 first:border-0 first:pt-0">
    <div className="flex items-baseline gap-3">
      <span className="font-display text-xs font-bold text-amberx">0{n}</span>
      <div>
        <h3 className="text-xl sm:text-2xl font-semibold tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{desc}</p>
      </div>
    </div>
    <div className="mt-7 grid gap-6 sm:grid-cols-2">{children}</div>
  </section>
);

const Field = ({ label, icon: Icon, children, full }) => (
  <div className={full ? "sm:col-span-2" : ""}>
    <Label className="label-xs flex items-center gap-1.5 mb-2">
      {Icon && <Icon className="h-3.5 w-3.5" />} {label}
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

  useEffect(() => {
    api.get("/packages", { params: { only_active: true } })
      .then(({ data }) => {
        setPackages(Array.isArray(data) ? data : (data?.data || data?.packages || []));
      })
      .catch(() => {
        setPackages([]);
      });
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!f.package_id) return toast.error("Pilih paket foto dulu ya");
    if (!date) return toast.error("Tanggal foto belum dipilih");
    if (!file) return toast.error("Bukti transfer wajib diupload");
    if (f.start_time >= f.end_time) return toast.error("Jam selesai harus setelah jam mulai");

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data: up } = await api.post("/upload/proof", fd, { headers: { "Content-Type": "multipart/form-data" } });

      const body = new FormData();
      Object.entries(f).forEach(([k, v]) => body.append(k, v));
      body.append("shoot_date", format(date, "yyyy-MM-dd"));
      body.append("amount_paid", String(amount));
      body.append("proof_file_id", up.file_id);

      const { data } = await api.post("/bookings", body);
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
      <div className="min-h-screen bg-background px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-lg rounded-lg border border-moss-900/10 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          data-testid="booking-success"
        >
          <div className="h-12 w-12 rounded-full bg-moss-50 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-moss-800" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight mt-6">Booking Terkirim!</h2>
          <p className="text-sm text-muted-foreground mt-2">
            No. Invoice <span className="font-semibold text-foreground" data-testid="success-invoice-number">{result.invoice_number}</span>.
            Langkah terakhir: kirim detail booking ke admin via WhatsApp untuk konfirmasi.
          </p>

          <dl className="mt-6 space-y-2 rounded-md bg-moss-50/60 p-4 text-sm">
            {[["Nama", result.full_name], ["Paket", result.package_name],
              ["Tanggal", result.shoot_date], ["Jam", `${result.start_time} - ${result.end_time}`],
              ["Lokasi", result.location],
              ["Dibayar", `${rupiah(result.amount_paid)} (${result.payment_type === "dp" ? "DP" : "Full"})`],
              ["Sisa", rupiah(result.balance_due)]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-medium text-right">{v}</dd>
              </div>
            ))}
          </dl>

          <a href={result.whatsapp_link} target="_blank" rel="noreferrer" data-testid="share-whatsapp-button">
            <Button className="mt-6 w-full h-12 rounded-full bg-moss-800 hover:bg-moss-900 hover:text-white text-white font-semibold transition-colors">
              Kirim ke WhatsApp Admin <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </a>
          <a href={result.gcal_link} target="_blank" rel="noreferrer" data-testid="add-to-gcal-button">
            <Button variant="outline" className="mt-3 w-full h-11 rounded-full border-moss-900/20 hover:bg-moss-50">
              <CalendarDays className="mr-2 h-4 w-4" /> Tambahkan ke Google Calendar
            </Button>
          </a>
          <button
            onClick={() => { setResult(null); setFile(null); setDate(undefined); }}
            data-testid="new-booking-button"
            className="mt-6 w-full text-sm font-semibold text-moss-800 underline underline-offset-4"
          >
            Buat booking lagi
          </button>
        </motion.div>
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-moss-900/10 bg-clay/85 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-moss-800">
            <Camera className="h-5 w-5" />
            <span className="font-display font-bold tracking-tight">GradFrame Studio</span>
          </div>
        </div>
      </header>

      <div className="relative overflow-hidden grain">
        <img src={HERO} alt="Graduation outdoor" className="h-[46vh] max-h-[420px] w-full object-cover" />
        <div className="absolute inset-0 bg-moss-900/70" />
        <div className="absolute inset-0 flex items-end">
          <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 pb-10">
            <p className="label-xs !text-white/70">Booking Sesi Foto</p>
            <h1 className="mt-3 text-4xl sm:text-5xl font-black tracking-tight leading-none text-white max-w-xl">
              Abadikan hari<br />kelulusanmu.
            </h1>
            <p className="mt-4 text-white/80 text-sm max-w-md">
              Isi form di bawah, upload bukti transfer, lalu konfirmasi ke admin via WhatsApp. Jadwal langsung tercatat.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 -mt-6 relative z-10">
        <div className="grid gap-4 sm:grid-cols-3">
          {[["Outdoor spesialis", FEATURE], ["Fotografer pro", SHOOTER]].map(([t, src]) => (
            <div key={t} className="relative overflow-hidden rounded-lg border border-moss-900/10 h-28 group">
              <img src={src} alt={t} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-moss-900/45" />
              <p className="absolute bottom-3 left-3 text-white text-sm font-semibold">{t}</p>
            </div>
          ))}
          <div className="rounded-lg border border-moss-900/10 bg-white p-4">
            <p className="label-xs">Konfirmasi via</p>
            <p className="mt-2 font-display text-lg font-bold text-moss-800">WhatsApp</p>
            <p className="text-xs text-muted-foreground mt-1">0821-1251-570</p>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="mx-auto max-w-5xl px-4 sm:px-6 py-14" data-testid="booking-form">
        <Section n={1} title="Data Diri" desc="Pastikan email & WhatsApp aktif, invoice dikirim ke sana.">
          <Field label="Nama Lengkap">
            <Input data-testid="input-full-name" required value={f.full_name} onChange={set("full_name")} placeholder="Nama sesuai ijazah" className="h-11" />
          </Field>
          <Field label="Email">
            <Input data-testid="input-email" type="email" required value={f.email} onChange={set("email")} placeholder="nama@email.com" className="h-11" />
          </Field>
          <Field label="Instagram" icon={Instagram}>
            <Input data-testid="input-instagram" required value={f.instagram} onChange={set("instagram")} placeholder="@username" className="h-11" />
          </Field>
          <Field label="WhatsApp" icon={Phone}>
            <Input data-testid="input-whatsapp" required value={f.whatsapp} onChange={set("whatsapp")} placeholder="08xxxxxxxxxx" className="h-11" />
          </Field>
          <Field label="Universitas" icon={GraduationCap}>
            <Input data-testid="input-university" required value={f.university} onChange={set("university")} placeholder="Nama universitas" className="h-11" />
          </Field>
          <Field label="Program Studi">
            <Input data-testid="input-study" required value={f.study} onChange={set("study")} placeholder="Jurusan / prodi" className="h-11" />
          </Field>
        </Section>

        <Section n={2} title="Detail Sesi Foto" desc="Pilih paket, tanggal, lokasi, dan jam sesi kamu.">
          <div className="sm:col-span-2">
            <Label className="label-xs mb-3 block">Paket Foto</Label>
            <div className="grid gap-3 sm:grid-cols-3" data-testid="package-list">
              {(Array.isArray(packages) ? packages : []).map((p) => {
                const active = f.package_id === p.package_id;

                return (
                  <button
                    type="button"
                    key={p.package_id}
                    data-testid={`package-option-${p.package_id}`}
                    onClick={() => setF((s) => ({ ...s, package_id: p.package_id }))}
                    className={`text-left rounded-lg border p-4 transition-colors duration-200 ${
                      active ? "border-moss-800 bg-moss-50" : "border-moss-900/10 bg-white hover:border-moss-600/40"
                    }`}
                  >
                    <p className="font-semibold">{p.name}</p>
                    <p className="font-display text-lg font-bold text-moss-800 mt-1">{rupiah(p.price)}</p>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{p.description}</p>
                    <p className="text-[11px] text-amberx font-semibold mt-2">DP {rupiah(p.dp_amount || Math.round(p.price * 0.3))}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <Field label="Tanggal Foto" icon={CalendarDays}>
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" data-testid="date-picker-trigger" className="h-11 w-full justify-start rounded-md border-moss-900/20 font-normal hover:bg-moss-50">
                  {date ? format(date, "d MMMM yyyy", { locale: idLocale }) : "Pilih tanggal"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
              </PopoverContent>
            </Popover>
          </Field>

          <Field label="Lokasi Foto" icon={MapPin}>
            <Input data-testid="input-location" required value={f.location} onChange={set("location")} placeholder="Contoh: Kampus UI Depok" className="h-11" />
          </Field>
          <Field label="Jam Mulai" icon={Clock}>
            <Input data-testid="input-start-time" type="time" required value={f.start_time} onChange={set("start_time")} className="h-11" />
          </Field>
          <Field label="Jam Selesai" icon={Clock}>
            <Input data-testid="input-end-time" type="time" required value={f.end_time} onChange={set("end_time")} className="h-11" />
          </Field>
          <Field label="Catatan (opsional)" full>
            <Textarea data-testid="input-notes" value={f.notes} onChange={set("notes")} placeholder="Konsep foto, request khusus, dll." rows={3} />
          </Field>
        </Section>

        <Section n={3} title="Pembayaran & Bukti Transfer" desc="Pilih DP atau langsung lunas, lalu upload bukti transfernya.">
          <div className="sm:col-span-2">
            <RadioGroup value={f.payment_type} onValueChange={(v) => setF((s) => ({ ...s, payment_type: v }))} className="grid gap-3 sm:grid-cols-2">
              {[["dp", "Bayar DP", "Sisa dilunasi saat hari-H"], ["full", "Full Payment", "Langsung lunas, bebas pikiran"]].map(([v, t, d]) => (
                <label
                  key={v}
                  data-testid={`payment-option-${v}`}
                  className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors duration-200 ${
                    f.payment_type === v ? "border-moss-800 bg-moss-50" : "border-moss-900/10 bg-white hover:border-moss-600/40"
                  }`}
                >
                  <RadioGroupItem value={v} className="mt-1" />
                  <span>
                    <span className="block font-semibold text-sm">{t}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">{d}</span>
                  </span>
                </label>
              ))}
            </RadioGroup>

            <div className="mt-4 flex items-center justify-between rounded-md border border-dashed border-moss-800/30 bg-moss-50/50 px-4 py-3">
              <span className="label-xs">Jumlah yang ditransfer</span>
              <span className="font-display text-xl font-bold text-moss-800" data-testid="amount-to-pay">{rupiah(amount)}</span>
            </div>
          </div>

          <div className="sm:col-span-2">
            <Label className="label-xs mb-2 block">Bukti Transfer</Label>
            {file ? (
              <div className="flex items-center gap-3 rounded-lg border border-moss-900/10 bg-white p-4" data-testid="proof-file-selected">
                <FileImage className="h-5 w-5 text-moss-800 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
                <button type="button" data-testid="remove-proof-button" onClick={() => setFile(null)} className="text-neutral-400 hover:text-destructive transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label
                data-testid="proof-upload-zone"
                className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-moss-900/15 bg-white py-10 cursor-pointer hover:border-moss-800/40 hover:bg-moss-50/40 transition-colors"
              >
                <Upload className="h-6 w-6 text-moss-800" />
                <span className="text-sm font-semibold">Upload bukti transfer</span>
                <span className="text-xs text-muted-foreground">JPG, PNG, WEBP atau PDF · maks 6MB</span>
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

        <Button
          type="submit"
          disabled={submitting}
          data-testid="submit-booking-button"
          className="mt-12 w-full h-14 rounded-full bg-moss-800 hover:bg-moss-900 hover:text-white text-white text-base font-semibold transition-colors"
        >
          {submitting ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Mengirim...</> : <>Kirim Booking <ArrowRight className="ml-2 h-5 w-5" /></>}
        </Button>
        <p className="mt-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
          Setelah submit kamu akan diarahkan ke WhatsApp admin <ExternalLink className="h-3 w-3" />
        </p>
      </form>

      <footer className="border-t border-moss-900/10 py-8 text-center text-xs text-muted-foreground">
        Radeya Graduation · Graduation Photo Outdoor · WA 0821-1251-570
      </footer>
    </div>
  );
}
