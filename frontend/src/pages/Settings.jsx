import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Save, Package as PackageIcon, Camera } from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";
import { api, rupiah } from "../lib/api";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

const emptyPkg = { name: "", price: "", dp_amount: "", duration_minutes: 60, description: "", active: true };
const emptyPho = { name: "", phone: "", fee_per_session: "", active: true };

export default function Settings() {
  const [packages, setPackages] = useState([]);
  const [photographers, setPhotographers] = useState([]);
  const [np, setNp] = useState(emptyPkg);
  const [nf, setNf] = useState(emptyPho);

  const loadAll = () => {
    api.get("/packages")
      .then(({ data }) => setPackages(Array.isArray(data) ? data : (data?.data || data?.packages || [])))
      .catch(() => setPackages([]));

    api.get("/photographers")
      .then(({ data }) => setPhotographers(Array.isArray(data) ? data : (data?.data || data?.photographers || [])))
      .catch(() => setPhotographers([]));
  };

  useEffect(loadAll, []);

  // ==========================================
  // PASANG KODE BARU DI SINI (Gantikan yang lama)
  // ==========================================
  const addPkg = async () => {
    if (!np.name || !np.price) return toast.error("Nama & harga paket wajib diisi");
    try {
      await api.post("/packages", { 
        ...np, 
        price: Number(np.price), 
        dp_amount: Number(np.dp_amount || 0), 
        duration_minutes: Number(np.duration_minutes || 60) 
      });
      setNp(emptyPkg); 
      loadAll(); 
      toast.success("Paket ditambahkan");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.detail || "Gagal menambahkan paket. Periksa koneksi/login Anda.");
    }
  };

  const savePkg = async (p) => {
    await api.put(`/packages/${p.package_id}`, { name: p.name, price: Number(p.price), dp_amount: Number(p.dp_amount || 0), duration_minutes: Number(p.duration_minutes || 60), description: p.description || "", active: p.active });
    toast.success("Paket diperbarui");
  };

  const delPkg = async (id) => { 
    await api.delete(`/packages/${id}`); 
    setPackages((x) => (Array.isArray(x) ? x : []).filter((p) => p.package_id !== id)); 
    toast.success("Paket dihapus"); 
  };

  const addPho = async () => {
    if (!nf.name) return toast.error("Nama fotografer wajib diisi");
    try {
      await api.post("/photographers", { 
        ...nf, 
        fee_per_session: Number(nf.fee_per_session || 0) 
      });
      setNf(emptyPho); 
      loadAll(); 
      toast.success("Fotografer ditambahkan");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.detail || "Gagal menambahkan fotografer. Periksa koneksi/login Anda.");
    }
  };

  const savePho = async (p) => {
    await api.put(`/photographers/${p.photographer_id}`, { name: p.name, phone: p.phone || "", fee_per_session: Number(p.fee_per_session || 0), active: p.active });
    toast.success("Fotografer diperbarui");
  };

  const delPho = async (id) => { 
    await api.delete(`/photographers/${id}`); 
    setPhotographers((x) => (Array.isArray(x) ? x : []).filter((p) => p.photographer_id !== id)); 
    toast.success("Fotografer dihapus"); 
  };

  const upd = (setter, id, key, field, val) => setter((arr) => (Array.isArray(arr) ? arr : []).map((x) => (x[key] === id ? { ...x, [field]: val } : x)));

  const safePackages = Array.isArray(packages) ? packages : [];
  const safePhotographers = Array.isArray(photographers) ? photographers : [];

  return (
    <AdminLayout title="Paket & Fotografer" subtitle="Ubah harga paket dan data fotografer freelance kapan saja">
       {/* ... bagian return / tampilan UI selanjutnya tetap sama ... */}
    </AdminLayout>
  );
}
