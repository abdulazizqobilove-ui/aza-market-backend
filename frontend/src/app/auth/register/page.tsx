"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User, ArrowRight, Store } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ email: "", username: "", password: "", full_name: "", role: "seller" as const });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/register", form);
      setAuth(res.data.user, res.data.access_token);
      toast.success("Аккаунт продавца создан!");
      router.push("/seller/products");
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Store size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Стать продавцом</h1>
          <p className="text-gray-500 text-sm mt-1">Создайте аккаунт для продажи товаров</p>
        </div>

        <div className="card p-6 shadow-soft">
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Имя / Название магазина</label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="input pl-10" placeholder="Иван Иванов" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                <input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="input pl-8" placeholder="myshop" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input pl-10" placeholder="you@example.com" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Пароль</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="password" required minLength={8} value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input pl-10" placeholder="Минимум 8 символов" />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 mt-1">
              {loading ? "Создаём..." : <><span>Создать аккаунт</span><ArrowRight size={16} /></>}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-5">
          Уже есть аккаунт?{" "}
          <Link href="/auth/login" className="text-primary font-semibold hover:underline">Войти</Link>
        </p>
        <p className="text-center text-sm text-gray-500 mt-2">
          Вы покупатель?{" "}
          <Link href="/auth/login" className="text-primary font-semibold hover:underline">Войти по телефону</Link>
        </p>
      </div>
    </div>
  );
}
