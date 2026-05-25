"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Phone, ArrowRight, ChevronLeft, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import toast from "react-hot-toast";

type Step = "phone" | "code";

function redirectByRole(role: string): string {
  if (role === "admin") return "/admin";
  if (role === "seller") return "/seller/products";
  return "/";
}

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [code, setCode] = useState(["", "", "", ""]);
  const [sendLoading, setSendLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const codeRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  // phone хранит полный номер с кодом страны, например "992901234567"
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 12);
    setPhone(digits);
  };

  const fullPhone = phone.startsWith("992") ? phone : "992" + phone;

  const sendCode = async () => {
    if (fullPhone.length < 12) { toast.error("Введите полный номер телефона"); return; }
    setSendLoading(true);
    try {
      const res = await api.post("/auth/phone/send", { phone: "+" + fullPhone });
      setDevCode(res.data.dev_code);
      setStep("code");
      setCountdown(60);
      setTimeout(() => codeRefs[0].current?.focus(), 100);
      toast.success("Код отправлен");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Ошибка");
    } finally {
      setSendLoading(false);
    }
  };

  const handleCodeInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    if (value && index < 3) codeRefs[index + 1].current?.focus();
    if (newCode.every((d) => d !== "")) verifyCode(newCode.join(""));
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      codeRefs[index - 1].current?.focus();
    }
  };

  const verifyCode = async (codeStr: string) => {
    setVerifyLoading(true);
    try {
      const res = await api.post("/auth/phone/verify", { phone: "+" + fullPhone, code: codeStr });
      setAuth(res.data.user, res.data.access_token);
      toast.success("Добро пожаловать!");
      router.push(redirectByRole(res.data.user.role));
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Неверный код");
      setCode(["", "", "", ""]);
      codeRefs[0].current?.focus();
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 bg-gray-50">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-3xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-lg shadow-primary/30">
            А
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {step === "phone" ? "Войти в AZA Market" : "Введите код"}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {step === "phone" ? "Введите номер телефона" : `Код отправлен на +${fullPhone}`}
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          {step === "phone" ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                  Номер телефона
                </label>
                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl overflow-hidden focus-within:border-primary">
                  <span className="pl-4 pr-2 text-sm text-gray-500 font-medium select-none">+992</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="flex-1 bg-transparent pr-4 py-3.5 text-sm outline-none tracking-wide"
                    placeholder="90 000 00 00"
                    autoFocus
                  />
                </div>
              </div>
              <button
                onClick={sendCode}
                disabled={sendLoading || fullPhone.length < 12}
                className="w-full bg-primary text-white font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {sendLoading ? "Отправляем..." : <><span>Получить код</span><ArrowRight size={18} /></>}
              </button>
              <p className="text-xs text-gray-400 text-center leading-relaxed">
                Один аккаунт для покупателей, продавцов и администраторов
              </p>
            </div>
          ) : (
            <div>
              <button
                onClick={() => { setStep("phone"); setCode(["", "", "", ""]); setDevCode(null); }}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-5"
              >
                <ChevronLeft size={16} /> Изменить номер
              </button>

              <div className="flex gap-3 justify-center mb-5">
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={codeRefs[i]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeInput(i, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(i, e)}
                    className={`w-14 h-14 text-center text-2xl font-bold rounded-2xl border-2 outline-none transition-all
                      ${digit ? "border-primary bg-primary/5 text-primary" : "border-gray-200 bg-gray-50"}
                      focus:border-primary focus:bg-primary/5`}
                  />
                ))}
              </div>

              {verifyLoading && (
                <p className="text-center text-sm text-gray-400 mb-4">Проверяем...</p>
              )}

              {devCode && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 text-center">
                  <p className="text-xs text-yellow-700">Код для разработки:</p>
                  <p className="text-2xl font-bold tracking-widest text-yellow-800">{devCode}</p>
                </div>
              )}

              {countdown > 0 ? (
                <p className="text-center text-sm text-gray-400">Повторная отправка через {countdown} сек.</p>
              ) : (
                <button onClick={sendCode} disabled={sendLoading}
                  className="w-full flex items-center justify-center gap-2 text-sm text-primary py-2">
                  <RefreshCw size={14} /> Отправить повторно
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
