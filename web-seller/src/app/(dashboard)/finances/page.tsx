"use client";
import { useEffect, useState } from "react";
import {
  Wallet, ArrowDownToLine, Clock, CheckCircle, XCircle,
  RefreshCw, ChevronRight, AlertCircle, TrendingUp, CreditCard,
  Building2,
} from "lucide-react";
import api from "@/lib/api";
import { clsx } from "clsx";

// ── Types ──────────────────────────────────────────────────────────────
type PayoutStatus = "pending" | "approved" | "rejected";

interface Payout {
  id: number;
  amount: number;
  bank_details: string;
  status: PayoutStatus;
  comment?: string | null;
  created_at: string;
}

interface BalanceData {
  balance: number;
  total_earned: number;
  total_withdrawn: number;
  payouts: Payout[];
}

const STATUS_LABEL: Record<PayoutStatus, string> = {
  pending:  "На рассмотрении",
  approved: "Одобрен",
  rejected: "Отклонён",
};
const STATUS_COLOR: Record<PayoutStatus, string> = {
  pending:  "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100  text-green-700",
  rejected: "bg-red-100    text-red-600",
};
const STATUS_ICON: Record<PayoutStatus, React.ElementType> = {
  pending:  Clock,
  approved: CheckCircle,
  rejected: XCircle,
};

// ── Skeleton ───────────────────────────────────────────────────────────
function Sk({ w = "w-full", h = "h-4", rounded = "rounded-lg", className = "" }: {
  w?: string; h?: string; rounded?: string; className?: string;
}) {
  return <div className={`bg-gray-100 animate-pulse ${w} ${h} ${rounded} ${className}`} />;
}

// ── Page ───────────────────────────────────────────────────────────────
export default function FinancesPage() {
  const [data, setData] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);

  // Form
  const [amount, setAmount] = useState("");
  const [bankDetails, setBankDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);

  const load = async () => {
    try {
      const res = await api.get<BalanceData>("/seller/balance");
      setData(res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setFormError("Введите сумму"); return; }
    if (!bankDetails.trim() || bankDetails.trim().length < 5) { setFormError("Введите реквизиты"); return; }
    if (data && amt > data.balance) { setFormError("Сумма превышает доступный баланс"); return; }

    setSubmitting(true); setFormError(""); setFormSuccess(false);
    try {
      await api.post("/seller/payouts", { amount: amt, bank_details: bankDetails.trim() });
      setAmount(""); setBankDetails("");
      setFormSuccess(true);
      setTimeout(() => setFormSuccess(false), 4000);
      await load();
    } catch (e: any) {
      setFormError(e?.response?.data?.detail || "Ошибка при подаче заявки");
    } finally { setSubmitting(false); }
  };

  const balance = data?.balance ?? 0;
  const earned  = data?.total_earned ?? 0;
  const withdrawn = data?.total_withdrawn ?? 0;
  const pendingSum = data?.payouts
    .filter(p => p.status === "pending")
    .reduce((s, p) => s + p.amount, 0) ?? 0;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Финансы</h1>
        <p className="text-sm text-gray-500 mt-0.5">Баланс, выплаты и история операций</p>
      </div>

      {/* ── Balance hero ── */}
      <div className="relative rounded-3xl overflow-hidden text-white"
        style={{ background: "linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #14b8a6 100%)" }}>
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute bottom-0 left-20 w-28 h-28 rounded-full bg-white/5" />

        <div className="relative p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="w-4 h-4 text-teal-200" />
                <span className="text-teal-200 text-sm font-medium">Доступный баланс</span>
              </div>
              {loading ? (
                <div className="mt-2 space-y-2">
                  <div className="bg-white/20 animate-pulse w-48 h-12 rounded-xl" />
                </div>
              ) : (
                <p className="text-5xl font-black tracking-tight mt-2">
                  {balance.toLocaleString("ru-RU")}
                  <span className="text-2xl font-normal text-teal-300 ml-2">сом.</span>
                </p>
              )}

              {pendingSum > 0 && !loading && (
                <div className="mt-3 flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2 w-fit">
                  <Clock className="w-3.5 h-3.5 text-teal-200" />
                  <span className="text-sm text-teal-100">
                    {pendingSum.toLocaleString("ru-RU")} сом. на рассмотрении
                  </span>
                </div>
              )}
            </div>

            {/* Right stats */}
            <div className="flex flex-col gap-3 text-right">
              {loading ? (
                <>
                  <div className="bg-white/20 animate-pulse w-32 h-12 rounded-xl" />
                  <div className="bg-white/20 animate-pulse w-32 h-12 rounded-xl" />
                </>
              ) : (
                <>
                  <div className="bg-white/10 rounded-2xl px-4 py-2.5">
                    <p className="text-teal-200 text-xs mb-0.5">Всего заработано</p>
                    <p className="text-lg font-bold">{earned.toLocaleString("ru-RU")} <span className="text-sm font-normal text-teal-300">сом.</span></p>
                  </div>
                  <div className="bg-white/10 rounded-2xl px-4 py-2.5">
                    <p className="text-teal-200 text-xs mb-0.5">Выведено</p>
                    <p className="text-lg font-bold">{withdrawn.toLocaleString("ru-RU")} <span className="text-sm font-normal text-teal-300">сом.</span></p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Mini progress bar: withdrawn / earned */}
          {!loading && earned > 0 && (
            <div className="mt-5">
              <div className="flex justify-between text-xs text-teal-200 mb-1.5">
                <span>Выведено {Math.round((withdrawn / earned) * 100)}%</span>
                <span>Баланс {Math.round((balance / earned) * 100)}%</span>
              </div>
              <div className="h-2 bg-white/15 rounded-full overflow-hidden">
                <div className="h-full flex">
                  <div className="bg-white/70 rounded-l-full transition-all duration-500"
                    style={{ width: `${(withdrawn / earned) * 100}%` }} />
                  <div className="bg-white/30 transition-all duration-500"
                    style={{ width: `${(balance / earned) * 100}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-teal-200">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-white/70 inline-block" />Выведено</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-white/30 inline-block" />На балансе</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Withdrawal form — 2/5 */}
        <div className="lg:col-span-2 card p-6 space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
              <ArrowDownToLine className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Вывести средства</h2>
              <p className="text-xs text-gray-400">Заявка рассматривается 1–3 дня</p>
            </div>
          </div>

          {/* Balance hint */}
          <div className="bg-teal-50 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-teal-700">Доступно</span>
            <span className="text-lg font-black text-teal-800">
              {loading ? "..." : balance.toLocaleString("ru-RU") + " сом."}
            </span>
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Сумма (сом.) *</label>
            <div className="relative">
              <input
                className="input pr-16"
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                min="1"
                max={balance}
              />
              <button
                onClick={() => setAmount(String(Math.floor(balance)))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-teal-600 font-semibold hover:text-teal-800 transition"
              >
                Всё
              </button>
            </div>
            {amount && parseFloat(amount) > balance && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Превышает баланс
              </p>
            )}
          </div>

          {/* Bank details */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Реквизиты *
            </label>
            <textarea
              className="input resize-none text-sm"
              rows={4}
              value={bankDetails}
              onChange={e => setBankDetails(e.target.value)}
              placeholder={"Eskhata / Alif / Humo\nНомер карты: 8600 XXXX XXXX XXXX\nПолучатель: Иванов Иван"}
            />
            <p className="text-xs text-gray-400 mt-1">Укажите банк, номер карты и имя получателя</p>
          </div>

          {formError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {formError}
            </div>
          )}
          {formSuccess && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0" /> Заявка подана! Ожидайте рассмотрения.
            </div>
          )}

          <button
            onClick={submit}
            disabled={submitting || loading || !amount || !bankDetails || parseFloat(amount) > balance}
            className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition
              bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Отправляем...</>
              : <><ArrowDownToLine className="w-4 h-4" /> Подать заявку</>
            }
          </button>
        </div>

        {/* History — 3/5 */}
        <div className="lg:col-span-3 card p-6">
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">История выплат</h2>
              <p className="text-xs text-gray-400">{data?.payouts.length ?? 0} заявок</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-start gap-3 py-3 border-b border-gray-50">
                  <Sk w="w-9" h="h-9" rounded="rounded-xl" className="flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Sk w="w-32" h="h-3" />
                    <Sk w="w-48" h="h-2.5" />
                  </div>
                  <Sk w="w-20" h="h-5" rounded="rounded-full" />
                </div>
              ))}
            </div>
          ) : !data?.payouts.length ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center">
                <Wallet className="w-8 h-8 text-gray-200" />
              </div>
              <p className="text-gray-500 font-medium">Заявок пока нет</p>
              <p className="text-xs text-gray-400">Подайте первую заявку на вывод средств</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.payouts.map((p) => {
                const Icon = STATUS_ICON[p.status];
                return (
                  <div key={p.id}
                    className="flex items-start gap-3 px-3 py-3.5 rounded-xl hover:bg-gray-50 transition group">
                    {/* Icon */}
                    <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                      p.status === "approved" ? "bg-green-50" :
                      p.status === "rejected" ? "bg-red-50" : "bg-yellow-50"
                    )}>
                      <Icon className={clsx("w-5 h-5",
                        p.status === "approved" ? "text-green-600" :
                        p.status === "rejected" ? "text-red-500" : "text-yellow-600"
                      )} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-gray-900">
                          {p.amount.toLocaleString("ru-RU")} сом.
                        </p>
                        <span className={clsx("badge text-[10px]", STATUS_COLOR[p.status])}>
                          {STATUS_LABEL[p.status]}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{p.bank_details}</p>
                      {p.comment && (
                        <p className="text-xs text-gray-500 mt-1 bg-gray-50 px-2 py-1 rounded-lg">
                          💬 {p.comment}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-300 mt-1">
                        #{p.id} · {new Date(p.created_at).toLocaleDateString("ru-RU", {
                          day: "numeric", month: "long", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Info block */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex gap-4">
        <CreditCard className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700 space-y-1">
          <p className="font-semibold">Как работают выплаты?</p>
          <p className="text-xs text-blue-600 leading-relaxed">
            После доставки заказа сумма зачисляется на ваш баланс. Вы можете подать заявку на вывод в любое время.
            Заявки рассматриваются администратором в течение 1–3 рабочих дней.
            Деньги поступают на указанные реквизиты после одобрения.
          </p>
        </div>
      </div>

    </div>
  );
}
