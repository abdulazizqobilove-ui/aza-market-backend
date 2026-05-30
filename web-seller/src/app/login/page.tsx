"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, Phone, Lock, ArrowRight, RefreshCw } from "lucide-react";
import api, { saveAuth, getToken, User } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [codeDigits, setCodeDigits] = useState(["", "", "", ""]);

  useEffect(() => {
    if (getToken()) router.replace("/overview");
  }, [router]);

  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setInterval(() => setCountdown((p) => p - 1), 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [countdown]);

  const formatPhone = (v: string) => {
    const d = v.replace(/\D/g, "");
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
    return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9, 11)}`;
  };

  const sendCode = async () => {
    const raw = phone.replace(/\D/g, "");
    if (raw.length < 9) { setError("Введите корректный номер телефона"); return; }
    setLoading(true); setError("");
    try {
      const r = await api.post<{ ok: boolean; dev_code?: string }>("/auth/phone/send", { phone: "+992" + raw });
      if (r.data.dev_code) setDevCode(r.data.dev_code);
      setStep("code"); setCountdown(60);
      setCodeDigits(["", "", "", ""]);
      setTimeout(() => codeRefs.current[0]?.focus(), 100);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Ошибка отправки кода");
    } finally { setLoading(false); }
  };

  const handleDigit = (i: number, v: string) => {
    const d = v.replace(/\D/g, "").slice(-1);
    const next = [...codeDigits];
    next[i] = d;
    setCodeDigits(next);
    if (d && i < 3) codeRefs.current[i + 1]?.focus();
  };
  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !codeDigits[i] && i > 0) {
      const next = [...codeDigits]; next[i - 1] = "";
      setCodeDigits(next); codeRefs.current[i - 1]?.focus();
    }
  };

  const verify = async () => {
    const c = codeDigits.join("");
    if (c.length < 4) { setError("Введите код из 4 цифр"); return; }
    const raw = phone.replace(/\D/g, "");
    setLoading(true); setError("");
    try {
      const res = await api.post<{ access_token: string; user: User }>("/auth/phone/verify", {
        phone: "+992" + raw, code: c,
      });
      const { access_token, user } = res.data;
      if (user.role !== "seller" && user.role !== "admin") {
        setError("Доступ только для продавцов"); return;
      }
      saveAuth(access_token, user);
      router.replace("/overview");
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Неверный код");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center p-4">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-white opacity-5 rounded-full" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-white opacity-5 rounded-full" />
        <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-white opacity-5 rounded-full" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <ShoppingBag className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-white">AZA Partners</h1>
          <p className="text-blue-200 text-sm mt-1">Кабинет продавца</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {step === "phone" ? (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Войти</h2>
              <p className="text-gray-500 text-sm mb-6">Введите номер телефона для получения кода</p>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Номер телефона</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500 flex items-center gap-2">
                      <Phone className="w-4 h-4" /> +992
                    </span>
                    <input
                      type="tel"
                      value={formatPhone(phone)}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      onKeyDown={(e) => e.key === "Enter" && sendCode()}
                      placeholder="900 000 000"
                      className="w-full pl-24 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                </div>

                {error && <p className="text-red-500 text-sm bg-red-50 px-4 py-2.5 rounded-xl">{error}</p>}

                <button onClick={sendCode} disabled={loading} className="btn-primary w-full py-3.5 flex items-center justify-center gap-2">
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <>Получить код <ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>
            </>
          ) : (
            <>
              <button onClick={() => { setStep("phone"); setError(""); }} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors">
                ← Назад
              </button>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Введите код</h2>
              <p className="text-gray-500 text-sm mb-4">
                Код отправлен на <span className="font-semibold text-gray-800">+992 {formatPhone(phone)}</span>
              </p>
              {devCode && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-4 text-center">
                  <p className="text-xs text-yellow-600 font-medium mb-0.5">Код для входа (dev режим)</p>
                  <p className="text-2xl font-bold text-yellow-800 tracking-widest">{devCode}</p>
                </div>
              )}

              <div className="space-y-5">
                <div className="flex gap-3 justify-center">
                  {codeDigits.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => { codeRefs.current[i] = el; }}
                      type="tel"
                      maxLength={1}
                      value={d}
                      onChange={(e) => handleDigit(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      className="w-14 h-14 text-center text-2xl font-bold bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition"
                    />
                  ))}
                </div>

                {error && <p className="text-red-500 text-sm bg-red-50 px-4 py-2.5 rounded-xl text-center">{error}</p>}

                <button onClick={verify} disabled={loading || codeDigits.join("").length < 4} className="btn-primary w-full py-3.5 flex items-center justify-center gap-2">
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <>
                    <Lock className="w-4 h-4" /> Войти
                  </>}
                </button>

                <div className="text-center">
                  {countdown > 0 ? (
                    <span className="text-gray-400 text-sm">Повторить через {countdown} сек.</span>
                  ) : (
                    <button onClick={sendCode} className="text-blue-600 text-sm font-semibold hover:underline">
                      Отправить ещё раз
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          <p className="text-center text-xs text-gray-400 mt-6">
            Доступ только для продавцов AZA Market
          </p>
        </div>
      </div>
    </div>
  );
}
