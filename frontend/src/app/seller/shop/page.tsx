"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Store, Camera, Check, ExternalLink } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import toast from "react-hot-toast";

export default function SellerShopPage() {
  const { user, setAuth } = useAuthStore();
  const [form, setForm] = useState({ shop_name: "", shop_description: "" });
  const [saving, setSaving] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const bannerRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setForm({
        shop_name: user.shop_name || "",
        shop_description: user.shop_description || "",
      });
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.patch("/seller/shop", form);
      setAuth(res.data, localStorage.getItem("token")!);
      toast.success("Профиль магазина сохранён");
    } catch {
      toast.error("Ошибка при сохранении");
    } finally {
      setSaving(false);
    }
  };

  const uploadBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("/seller/shop/banner", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setAuth(res.data, localStorage.getItem("token")!);
      toast.success("Баннер обновлён");
    } catch {
      toast.error("Ошибка загрузки");
    } finally {
      setUploadingBanner(false);
      e.target.value = "";
    }
  };

  const uploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("/seller/shop/logo", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setAuth(res.data, localStorage.getItem("token")!);
      toast.success("Логотип обновлён");
    } catch {
      toast.error("Ошибка загрузки");
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-10">
      {/* Header */}
      <div className="bg-white px-4 pt-5 pb-4 flex items-center gap-3 border-b border-gray-100">
        <Link href="/profile" className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold">Мой магазин</h1>
          <p className="text-xs text-gray-400">Оформление и описание</p>
        </div>
        {user && (
          <Link
            href={`/shop/${user.id}`}
            className="flex items-center gap-1.5 text-xs text-primary font-semibold bg-primary/10 px-3 py-1.5 rounded-xl"
          >
            <ExternalLink size={13} /> Посмотреть
          </Link>
        )}
      </div>

      {/* Banner preview + upload */}
      <div className="relative">
        <div className="h-44 bg-gradient-to-br from-primary to-blue-700 relative overflow-hidden">
          {user?.shop_banner_url && (
            <Image
              src={`http://192.168.1.45:8000${user.shop_banner_url}`}
              alt="banner"
              fill
              className="object-cover"
            />
          )}
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <button
              onClick={() => bannerRef.current?.click()}
              disabled={uploadingBanner}
              className="flex items-center gap-2 bg-white/90 backdrop-blur text-gray-800 text-sm font-semibold px-4 py-2.5 rounded-2xl shadow"
            >
              <Camera size={16} />
              {uploadingBanner ? "Загружаем..." : "Изменить баннер"}
            </button>
          </div>
        </div>
        <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={uploadBanner} />

        {/* Logo over banner */}
        <div className="absolute left-4 -bottom-10">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-white">
              {user?.shop_logo_url ? (
                <Image
                  src={`http://192.168.1.45:8000${user.shop_logo_url}`}
                  alt="logo"
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                  <Store size={28} className="text-primary" />
                </div>
              )}
            </div>
            <button
              onClick={() => logoRef.current?.click()}
              disabled={uploadingLogo}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow border-2 border-white"
            >
              <Camera size={12} className="text-white" />
            </button>
          </div>
          <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={uploadLogo} />
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="px-4 mt-14 space-y-4">
        <div className="bg-white rounded-2xl p-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
              Название магазина
            </label>
            <input
              value={form.shop_name}
              onChange={(e) => setForm({ ...form, shop_name: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary"
              placeholder="Название вашего магазина"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
              Описание
            </label>
            <textarea
              value={form.shop_description}
              onChange={(e) => setForm({ ...form, shop_description: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary resize-none h-28"
              placeholder="Расскажите покупателям о вашем магазине..."
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{form.shop_description.length}/300</p>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-primary/5 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-semibold text-primary mb-2">Советы по оформлению</p>
          {[
            "Баннер 1200×400px выглядит лучше всего",
            "Логотип должен быть квадратным",
            "Опишите ваши товары и преимущества",
          ].map((tip) => (
            <div key={tip} className="flex items-center gap-2">
              <Check size={13} className="text-primary shrink-0" />
              <p className="text-xs text-primary/80">{tip}</p>
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-primary text-white font-semibold py-4 rounded-2xl text-sm"
        >
          {saving ? "Сохраняем..." : "Сохранить"}
        </button>
      </form>
    </div>
  );
}
