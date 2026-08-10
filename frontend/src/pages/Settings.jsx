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

  const addPkg = async () => {
    if (!np.name || !np.price) return toast.error("Nama & harga paket wajib diisi");
    await api.post("/packages", { ...np, price: Number(np.price), dp_amount: Number(np.dp_amount || 0), duration_minutes: Number(np.duration_minutes || 60) });
    setNp(emptyPkg); loadAll(); toast.success("Paket ditambahkan");
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
    await api.post("/photographers", { ...nf, fee_per_session: Number(nf.fee_per_session || 0) });
    setNf(emptyPho); loadAll(); toast.success("Fotografer ditambahkan");
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
      <Tabs defaultValue="packages">
        <TabsList data-testid="settings-tabs">
          <TabsTrigger value="packages" data-testid="tab-packages"><PackageIcon className="h-4 w-4 mr-1.5" /> Paket Foto</TabsTrigger>
          <TabsTrigger value="photographers" data-testid="tab-photographers"><Camera className="h-4 w-4 mr-1.5" /> Fotografer</TabsTrigger>
        </TabsList>

        <TabsContent value="packages" className="mt-6 space-y-4">
          <div className="rounded-lg border border-dashed border-moss-800/30 bg-moss-50/40 p-5" data-testid="new-package-form">
            <p className="label-xs mb-4">Tambah Paket Baru</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Input data-testid="new-package-name" placeholder="Nama paket" value={np.name} onChange={(e) => setNp({ ...np, name: e.target.value })} className="h-10" />
              <Input data-testid="new-package-price" type="number" placeholder="Harga" value={np.price} onChange={(e) => setNp({ ...np, price: e.target.value })} className="h-10" />
              <Input data-testid="new-package-dp" type="number" placeholder="Nominal DP" value={np.dp_amount} onChange={(e) => setNp({ ...np, dp_amount: e.target.value })} className="h-10" />
              <Input data-testid="new-package-desc" placeholder="Deskripsi" value={np.description} onChange={(e) => setNp({ ...np, description: e.target.value })} className="h-10" />
              <Button onClick={addPkg} data-testid="add-package-button" className="h-10 rounded-full bg-moss-800 hover:bg-moss-900 hover:text-white text-white"><Plus className="h-4 w-4 mr-1" /> Tambah</Button>
            </div>
          </div>

          {safePackages.map((p) => (
            <div key={p.package_id} data-testid={`package-row-${p.package_id}`} className="rounded-lg border border-moss-900/10 bg-white p-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end">
                <div><Label className="label-xs">Nama</Label><Input value={p.name} onChange={(e) => upd(setPackages, p.package_id, "package_id", "name", e.target.value)} className="h-10 mt-1.5" /></div>
                <div><Label className="label-xs">Harga</Label><Input type="number" value={p.price} onChange={(e) => upd(setPackages, p.package_id, "package_id", "price", e.target.value)} className="h-10 mt-1.5" /></div>
                <div><Label className="label-xs">DP</Label><Input type="number" value={p.dp_amount} onChange={(e) => upd(setPackages, p.package_id, "package_id", "dp_amount", e.target.value)} className="h-10 mt-1.5" /></div>
                <div><Label className="label-xs">Deskripsi</Label><Input value={p.description || ""} onChange={(e) => upd(setPackages, p.package_id, "package_id", "description", e.target.value)} className="h-10 mt-1.5" /></div>
                <div className="flex items-center gap-2">
                  <Switch checked={p.active} onCheckedChange={(v) => upd(setPackages, p.package_id, "package_id", "active", v)} data-testid={`package-active-${p.package_id}`} />
                  <span className="text-xs text-muted-foreground flex-1">Aktif</span>
                  <Button size="sm" onClick={() => savePkg(p)} data-testid={`save-package-${p.package_id}`} className="rounded-full bg-moss-800 hover:bg-moss-900 hover:text-white text-white"><Save className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => delPkg(p.package_id)} data-testid={`delete-package-${p.package_id}`} className="text-neutral-400 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">Harga tampil di form: {rupiah(p.price)} · DP {rupiah(p.dp_amount)}</p>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="photographers" className="mt-6 space-y-4">
          <div className="rounded-lg border border-dashed border-moss-800/30 bg-moss-50/40 p-5" data-testid="new-photographer-form">
            <p className="label-xs mb-4">Tambah Fotografer</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Input data-testid="new-photographer-name" placeholder="Nama fotografer" value={nf.name} onChange={(e) => setNf({ ...nf, name: e.target.value })} className="h-10" />
              <Input data-testid="new-photographer-phone" placeholder="No. WhatsApp" value={nf.phone} onChange={(e) => setNf({ ...nf, phone: e.target.value })} className="h-10" />
              <Input data-testid="new-photographer-fee" type="number" placeholder="Fee per sesi" value={nf.fee_per_session} onChange={(e) => setNf({ ...nf, fee_per_session: e.target.value })} className="h-10" />
              <Button onClick={addPho} data-testid="add-photographer-button" className="h-10 rounded-full bg-moss-800 hover:bg-moss-900 hover:text-white text-white"><Plus className="h-4 w-4 mr-1" /> Tambah</Button>
            </div>
          </div>

          {safePhotographers.map((p) => (
            <div key={p.photographer_id} data-testid={`photographer-row-${p.photographer_id}`} className="rounded-lg border border-moss-900/10 bg-white p-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end">
                <div><Label className="label-xs">Nama</Label><Input value={p.name} onChange={(e) => upd(setPhotographers, p.photographer_id, "photographer_id", "name", e.target.value)} className="h-10 mt-1.5" /></div>
                <div><Label className="label-xs">WhatsApp</Label><Input value={p.phone || ""} onChange={(e) => upd(setPhotographers, p.photographer_id, "photographer_id", "phone", e.target.value)} className="h-10 mt-1.5" /></div>
                <div><Label className="label-xs">Fee / sesi</Label><Input type="number" value={p.fee_per_session} onChange={(e) => upd(setPhotographers, p.photographer_id, "photographer_id", "fee_per_session", e.target.value)} className="h-10 mt-1.5" /></div>
                <div className="flex items-center gap-2">
                  <Switch checked={p.active} onCheckedChange={(v) => upd(setPhotographers, p.photographer_id, "photographer_id", "active", v)} data-testid={`photographer-active-${p.photographer_id}`} />
                  <span className="text-xs text-muted-foreground flex-1">Aktif</span>
                  <Button size="sm" onClick={() => savePho(p)} data-testid={`save-photographer-${p.photographer_id}`} className="rounded-full bg-moss-800 hover:bg-moss-900 hover:text-white text-white"><Save className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => delPho(p.photographer_id)} data-testid={`delete-photographer-${p.photographer_id}`} className="text-neutral-400 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
