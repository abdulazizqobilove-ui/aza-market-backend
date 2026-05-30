"use client";
import { useEffect, useState, useRef } from "react";
import {
  Store, Camera, Save, RefreshCw, BadgeCheck,
  MapPin, FileText, Upload,
} from "lucide-react";
import api, { User, imgUrl, getUser, saveAuth, getToken } from "@/lib/api";

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(getUser());
  const [form, setForm] = useState({
    shop_name: user?.shop_name || "",
    shop_description: user?.shop_description || "",
    shop_city: user?.shop_city || "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true); setSaved(false);
    try {
      await api.patch("/seller/shop", form);
      // Re-fetch me to update local user
      const meRes = await api.get<User>("/users/me");
      const token = getToken()!;
      saveAuth(token, meRes.data);
      setUser(meRes.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  };

  const uploadLogo = async (file: File) => {
    setUploadingLogo(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await api.post<User>("/seller/shop/logo", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const token = getToken()!;
      saveAuth(token, res.data);
      setUser(res.data);
    } finally { setUploadingLogo(false); }
  };

  const uploadBanner = async (file: File) => {
    setUploadingBanner(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await api.post<User>("/seller/shop/banner", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const token = getToken()!;
      saveAuth(token, res.data);
      setUser(res.data);
    } finally { setUploadingBanner(false); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Настройки магазина</h1>
        <p className="text-sm text-gray-500 mt-0.5">Управляйте профилем вашего магазина</p>
      </div>

      {/* Shop identity */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
            <Store className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Профиль магазина</h2>
            <p className="text-xs text-gray-500">Отображается покупателям</p>
          </div>
          {user?.is_verified && (
            <div className="ml-auto flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl text-xs font-semibold">
              <BadgeCheck className="w-4 h-4" /> Верифицирован
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Название магазина</label>
          <input className="input" value={form.shop_name} onChange={(e) => set("shop_name", e.target.value)} placeholder="Мой магазин" />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Описание</label>
          <textarea className="input resize-none" rows={3} value={form.shop_description} onChange={(e) => set("shop_description", e.target.value)} placeholder="Расскажите о вашем магазине..." />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1.5 block flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" /> Город
          </label>
          <input className="input" value={form.shop_city} onChange={(e) => set("shop_city", e.target.value)} placeholder="Душанбе" />
        </div>

        <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saved ? "Сохранено ✓" : "Сохранить изменения"}
        </button>
      </div>

      {/* Logo */}
      <div className="card p-6">
        <h2 className="font-bold text-gray-900 mb-1">Логотип магазина</h2>
        <p className="text-xs text-gray-500 mb-4">Рекомендуемый размер: 400×400 пикселей</p>
        <div className="flex items-center gap-5">
          <div className="w-24 h-24 rounded-2xl bg-blue-100 overflow-hidden flex items-center justify-center border-2 border-blue-200 flex-shrink-0">
            {user?.shop_logo_url
              ? <img src={imgUrl(user.shop_logo_url) ?? ""} className="w-full h-full object-cover" alt="" />
              : <span className="text-3xl font-bold text-blue-400">{(user?.shop_name || "?")[0]}</span>}
          </div>
          <div>
            <button
              onClick={() => logoRef.current?.click()}
              disabled={uploadingLogo}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              {uploadingLogo ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              Загрузить логотип
            </button>
            <p className="text-xs text-gray-400 mt-2">PNG, JPG до 5 МБ</p>
            <input ref={logoRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }} />
          </div>
        </div>
      </div>

      {/* Banner */}
      <div className="card p-6">
        <h2 className="font-bold text-gray-900 mb-1">Баннер магазина</h2>
        <p className="text-xs text-gray-500 mb-4">Рекомендуемый размер: 1200×400 пикселей</p>
        <div className="space-y-3">
          {user?.shop_banner_url && (
            <div className="w-full h-32 rounded-xl overflow-hidden bg-gray-100">
              <img src={imgUrl(user.shop_banner_url) ?? ""} className="w-full h-full object-cover" alt="" />
            </div>
          )}
          <button
            onClick={() => bannerRef.current?.click()}
            disabled={uploadingBanner}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            {uploadingBanner ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Загрузить баннер
          </button>
          <input ref={bannerRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadBanner(f); }} />
        </div>
      </div>

      {/* Account info */}
      <div className="card p-6">
        <h2 className="font-bold text-gray-900 mb-4">Аккаунт</h2>
        <div className="space-y-3">
          {[
            { label: "Имя пользователя", value: user?.username },
            { label: "Полное имя", value: user?.full_name || "—" },
            { label: "Телефон", value: user?.phone },
            { label: "Роль", value: user?.role === "admin" ? "Администратор" : "Продавец" },
            { label: "Баланс", value: `${(user?.balance ?? 0).toLocaleString()} сом.` },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between py-2.5 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-500">{label}</span>
              <span className="text-sm font-semibold text-gray-900">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
