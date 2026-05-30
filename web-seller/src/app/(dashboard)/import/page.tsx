"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Search, Upload, Package, FileSpreadsheet,
  CheckCircle, XCircle, AlertTriangle, Download, Plus,
} from "lucide-react";
import api from "@/lib/api";

interface ImportedProduct {
  wb_id?: number;
  ozon_article?: string;
  title: string;
  brand: string;
  price: number;
  photos: string[];
  description: string;
  stock: number;
  _source?: "wb" | "ozon";
}

interface CsvRow {
  index: number;
  title: string;
  price: number;
  category_id: number;
  description: string;
  brand: string;
  stock: number;
  original_price?: number;
  valid: boolean;
  error?: string;
}

type Tab = "wb" | "excel";

export default function ImportPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>("wb");

  // WB / Ozon
  const [article, setArticle] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ImportedProduct | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  // Excel
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [excelPublishing, setExcelPublishing] = useState(false);
  const [excelDone, setExcelDone] = useState<number | null>(null);

  const fetchProduct = async () => {
    const raw = article.trim();
    if (!raw) return;
    setLoading(true);
    setPreview(null);
    setPublished(false);
    try {
      const isNumeric = /^\d+$/.test(raw);
      const url = isNumeric ? `/products/import/wb/${raw}` : `/products/import/ozon/${raw}`;
      const r = await api.get<ImportedProduct>(url);
      setPreview({ ...r.data, _source: isNumeric ? "wb" : "ozon" });
      setPrice(String(r.data.price || ""));
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Товар не найден");
    } finally {
      setLoading(false);
    }
  };

  const publishOne = async () => {
    if (!preview || !categoryId) { alert("Выберите категорию"); return; }
    setPublishing(true);
    try {
      const res = await api.post<{ id: number }>("/products", {
        title: preview.title,
        description: preview.description || undefined,
        brand: preview.brand || undefined,
        price: parseFloat(price) || preview.price || 1,
        stock: preview.stock || 10,
        category_id: parseInt(categoryId),
      });
      // Download photos and upload
      if (preview.photos.length > 0) {
        const fd = new FormData();
        for (let i = 0; i < Math.min(preview.photos.length, 6); i++) {
          try {
            const resp = await fetch(preview.photos[i]);
            const blob = await resp.blob();
            fd.append("files", blob, `photo_${i + 1}.jpg`);
          } catch { /* skip failed photo */ }
        }
        if ([...fd.entries()].length > 0) {
          await api.post(`/products/${res.data.id}/images`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        }
      }
      setPublished(true);
      setPreview(null);
      setArticle("");
      setCategoryId("");
      setPrice("");
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Ошибка публикации");
    } finally {
      setPublishing(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) { alert("Файл пустой или неверный формат"); return; }

    const parsed: CsvRow[] = lines.slice(1).map((line, i) => {
      const cols = line.split(/[,;	]/).map(c => c.trim().replace(/^"|"$/g, ""));
      const title = cols[0] || "";
      const price = parseFloat(cols[1]) || 0;
      const category_id = parseInt(cols[2]) || 0;
      let error = "";
      if (!title) error = "Нет названия";
      else if (price <= 0) error = "Нет цены";
      else if (!category_id) error = "Нет категории";
      return {
        index: i + 1,
        title,
        price,
        category_id,
        description: cols[3] || "",
        brand: cols[4] || "",
        stock: parseInt(cols[5]) || 10,
        original_price: parseFloat(cols[6]) || undefined,
        valid: !error,
        error: error || undefined,
      };
    }).filter(r => r.title || r.price);

    setRows(parsed);
    setExcelDone(null);
    e.target.value = "";
  };

  const publishExcel = async () => {
    const valid = rows.filter(r => r.valid);
    if (valid.length === 0) { alert("Нет валидных товаров"); return; }
    setExcelPublishing(true);
    try {
      const r = await api.post<{ created: number }>("/products/bulk", valid.map(r => ({
        title: r.title,
        price: r.price,
        category_id: r.category_id,
        description: r.description || undefined,
        brand: r.brand || undefined,
        stock: r.stock,
        original_price: r.original_price || undefined,
      })));
      setExcelDone(r.data.created);
      setRows([]);
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Ошибка публикации");
    } finally {
      setExcelPublishing(false);
    }
  };

  const validCount = rows.filter(r => r.valid).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Импорт каталога</h1>
          <p className="text-sm text-gray-500">Добавьте товары с WB/Ozon или загрузите Excel/CSV</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-3">
        {([
          { key: "wb", label: "🛍 Импорт с WB / Ozon" },
          { key: "excel", label: "📊 Excel / CSV" },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${tab === t.key ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "wb" ? (
        <div className="space-y-5">
          {/* Search */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
            <div>
              <h2 className="font-bold text-gray-900 mb-1">Артикул товара</h2>
              <p className="text-sm text-gray-500">Введите числовой артикул с Wildberries или Ozon</p>
            </div>
            <div className="flex gap-3">
              <input
                value={article}
                onChange={e => setArticle(e.target.value)}
                onKeyDown={e => e.key === "Enter" && fetchProduct()}
                placeholder="Например: 123456789"
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={fetchProduct} disabled={loading || !article.trim()}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm disabled:opacity-50 hover:bg-blue-700 flex items-center gap-2 transition-colors">
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search size={16} />}
                {loading ? "Поиск..." : "Найти"}
              </button>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
              <span className="font-semibold">Примеры:</span> WB: 123456789 · Ozon: 987654321
            </div>
          </div>

          {/* Success */}
          {published && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center gap-3">
              <CheckCircle size={24} className="text-green-600 shrink-0" />
              <div>
                <p className="font-bold text-green-800">Товар успешно добавлен!</p>
                <p className="text-sm text-green-600">Найдите его в разделе «Товары» и добавьте описание.</p>
              </div>
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="text-green-600" />
                <span className="font-bold text-green-700">
                  Найден на {preview._source === "wb" ? "Wildberries" : "Ozon"}
                </span>
              </div>

              <div className="flex gap-4">
                {/* Photos */}
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {preview.photos.slice(0, 6).map((url, i) => (
                    <div key={i} className="relative shrink-0 w-20 h-[107px] rounded-xl overflow-hidden border border-gray-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      {i === 0 && <div className="absolute bottom-0 left-0 right-0 bg-blue-600/85 text-white text-[9px] text-center py-0.5 font-semibold">Главное</div>}
                    </div>
                  ))}
                </div>

                {/* Info */}
                <div className="flex-1 space-y-2">
                  <h3 className="font-bold text-gray-900 text-lg leading-tight">{preview.title}</h3>
                  {preview.brand && <p className="text-sm text-gray-500">{preview.brand}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Цена (сом) *</label>
                  <input
                    type="number"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">ID категории *</label>
                  <input
                    type="number"
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    placeholder="Напр.: 5"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 text-xs text-amber-700">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>Фото будут импортированы с оригинального сайта. Цену и описание можно отредактировать после публикации.</span>
              </div>

              <button onClick={publishOne} disabled={publishing || !categoryId}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-base disabled:opacity-50 hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors">
                {publishing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={18} />}
                {publishing ? "Публикуем..." : "Опубликовать товар"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {/* Upload area */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
            <div>
              <h2 className="font-bold text-gray-900 mb-1">Загрузить CSV / Excel</h2>
              <p className="text-sm text-gray-500">До 200 товаров за один раз</p>
            </div>

            {/* Format guide */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold text-slate-600">📋 Структура файла (первая строка — заголовки):</p>
              <code className="text-xs text-slate-600 block bg-white rounded-lg p-2 border border-slate-200">
                Название, Цена, ID категории, Описание, Бренд, Остаток, Старая цена
              </code>
              <p className="text-xs text-slate-400">Разделитель: запятая, точка с запятой или Tab</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => fileRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors">
                <Upload size={16} />
                Выбрать файл
              </button>
            </div>
            <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,.xls,.xlsx" className="hidden" onChange={handleFile} />
          </div>

          {/* Excel done */}
          {excelDone !== null && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center gap-3">
              <CheckCircle size={24} className="text-green-600 shrink-0" />
              <div>
                <p className="font-bold text-green-800">Опубликовано {excelDone} товаров!</p>
                <p className="text-sm text-green-600">Добавьте фото через раздел «Товары».</p>
              </div>
            </div>
          )}

          {/* Rows preview */}
          {rows.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <span className="font-bold text-gray-900">Товары из файла ({rows.length})</span>
                <div className="flex gap-2 text-xs">
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded-lg font-semibold">✓ {validCount} готово</span>
                  {rows.length - validCount > 0 && (
                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded-lg font-semibold">✗ {rows.length - validCount} ошибок</span>
                  )}
                </div>
              </div>

              <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                {rows.map(row => (
                  <div key={row.index} className={`px-4 py-3 flex items-center gap-3 ${!row.valid ? "bg-red-50/50" : ""}`}>
                    {row.valid
                      ? <CheckCircle size={16} className="text-green-500 shrink-0" />
                      : <XCircle size={16} className="text-red-400 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${!row.valid ? "text-red-600" : "text-gray-900"}`}>
                        {row.title || "Нет названия"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {row.price > 0 ? `${row.price.toLocaleString("ru-RU")} сом` : "—"} · Кат. {row.category_id || "?"} · {row.stock} шт.
                        {row.error && <span className="text-red-400 ml-2">· {row.error}</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-gray-100">
                <button onClick={publishExcel} disabled={excelPublishing || validCount === 0}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-base disabled:opacity-50 hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors">
                  {excelPublishing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Package size={18} />}
                  {excelPublishing ? "Публикуем..." : `Опубликовать ${validCount} товаров`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
