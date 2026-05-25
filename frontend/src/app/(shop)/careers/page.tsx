"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Clock, ChevronDown, ChevronUp, Briefcase } from "lucide-react";

const JOBS = [
  {
    id: 1, title: "Курьер", dept: "Доставка", type: "Полная занятость",
    city: "Москва", salary: "60 000 – 90 000 сом.",
    desc: "Доставка заказов покупателям в пределах города. Личный транспорт приветствуется.",
    reqs: ["Возраст от 18 лет", "Смартфон с доступом к интернету", "Ответственность и пунктуальность"],
  },
  {
    id: 2, title: "Оператор склада", dept: "Логистика", type: "Полная занятость",
    city: "Москва / Санкт-Петербург", salary: "45 000 – 65 000 сом.",
    desc: "Приём, сортировка и отгрузка товаров на складе. Работа в команде.",
    reqs: ["Опыт работы на складе приветствуется", "Физическая выносливость", "Внимательность"],
  },
  {
    id: 3, title: "Frontend разработчик", dept: "IT", type: "Полная занятость / Удалённо",
    city: "Удалённо", salary: "150 000 – 250 000 сом.",
    desc: "Разработка и поддержка веб-интерфейса маркетплейса. React, Next.js, TypeScript.",
    reqs: ["Опыт от 2 лет", "Знание React / Next.js", "TypeScript, Tailwind CSS"],
  },
  {
    id: 4, title: "Менеджер по работе с продавцами", dept: "Партнёры", type: "Полная занятость",
    city: "Москва", salary: "70 000 – 100 000 сом.",
    desc: "Привлечение и сопровождение продавцов на платформе. Анализ показателей.",
    reqs: ["Опыт в B2B продажах", "Навыки переговоров", "Excel / Google Sheets"],
  },
  {
    id: 5, title: "Оператор поддержки", dept: "Поддержка", type: "Сменный график",
    city: "Удалённо", salary: "35 000 – 50 000 сом.",
    desc: "Обработка обращений покупателей и продавцов через чат, email и телефон.",
    reqs: ["Грамотная устная и письменная речь", "Стрессоустойчивость", "Опыт в поддержке приветствуется"],
  },
];

const DEPT_COLORS: Record<string, string> = {
  "Доставка": "bg-blue-50 text-blue-700",
  "Логистика": "bg-orange-50 text-orange-700",
  "IT": "bg-primary-light text-purple-700",
  "Партнёры": "bg-green-50 text-green-700",
  "Поддержка": "bg-yellow-50 text-yellow-700",
};

export default function CareersPage() {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filter, setFilter] = useState("Все");
  const depts = ["Все", ...Array.from(new Set(JOBS.map((j) => j.dept)))];
  const filtered = filter === "Все" ? JOBS : JOBS.filter((j) => j.dept === filter);

  return (
    <div className="bg-gray-100 min-h-screen pb-24">
      <div className="bg-white px-4 pt-5 pb-4 flex items-center gap-3 border-b border-gray-100">
        <Link href="/profile" className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <h1 className="text-lg font-bold">Вакансии в AZA Market</h1>
      </div>

      {/* Hero */}
      <div className="mx-3 mt-3 bg-gradient-to-br from-primary to-blue-900 rounded-3xl p-5 text-white relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/5" />
        <div className="absolute right-10 -top-6 w-20 h-20 rounded-full bg-white/5" />
        <Briefcase size={28} className="mb-3 opacity-90" />
        <h2 className="text-xl font-bold mb-1">Присоединяйтесь к команде</h2>
        <p className="text-white/75 text-sm">Мы строим лучший маркетплейс — ищем талантливых людей</p>
        <div className="flex gap-4 mt-4 text-center">
          {[["500+", "Сотрудников"], ["25", "Городов"], ["#1", "Маркетплейс"]].map(([val, label]) => (
            <div key={label}>
              <p className="font-bold text-lg">{val}</p>
              <p className="text-white/60 text-xs">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 px-3 mt-3 overflow-x-auto pb-1 scrollbar-hide">
        {depts.map((d) => (
          <button key={d} onClick={() => setFilter(d)}
            className={`flex-none px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === d ? "bg-primary text-white" : "bg-white text-gray-600 shadow-sm"}`}>
            {d}
          </button>
        ))}
      </div>

      {/* Jobs */}
      <div className="p-3 mt-1 space-y-3">
        {filtered.map((job) => (
          <div key={job.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === job.id ? null : job.id)}
              className="w-full p-4 text-left"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${DEPT_COLORS[job.dept] || "bg-gray-100 text-gray-600"}`}>
                      {job.dept}
                    </span>
                    <span className="text-xs text-gray-400">{job.type}</span>
                  </div>
                  <p className="font-bold text-gray-900">{job.title}</p>
                  <p className="text-sm font-semibold text-primary mt-0.5">{job.salary}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><MapPin size={11} />{job.city}</span>
                    <span className="flex items-center gap-1"><Clock size={11} />{job.type}</span>
                  </div>
                </div>
                {expanded === job.id
                  ? <ChevronUp size={18} className="text-gray-400 shrink-0 mt-1" />
                  : <ChevronDown size={18} className="text-gray-400 shrink-0 mt-1" />}
              </div>
            </button>

            {expanded === job.id && (
              <div className="border-t border-gray-50 px-4 pb-4 pt-3">
                <p className="text-sm text-gray-600 mb-3">{job.desc}</p>
                <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Требования</p>
                <ul className="space-y-1.5 mb-4">
                  {job.reqs.map((r) => (
                    <li key={r} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-primary-light0 mt-0.5">·</span>{r}
                    </li>
                  ))}
                </ul>
                <a href="mailto:hr@azamarket.ru?subject=Отклик на вакансию: {job.title}"
                  className="w-full bg-primary text-white font-semibold py-3 rounded-2xl flex items-center justify-center text-sm">
                  Откликнуться
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
