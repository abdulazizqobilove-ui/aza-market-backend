"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, ArrowLeft, Package } from "lucide-react";
import api, { Category } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import toast from "react-hot-toast";

export default function NewProductPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", price: "", original_price: "", stock: "", brand: "", category_id: "" });

  useEffect(() => {
    api.get<Category[]>("/products/categories").then((r) => setCategories(r.data));
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: any = { title: form.title, description: form.description || undefined, price: parseFloat(form.price), stock: parseInt(form.stock), category_id: parseInt(form.category_id) };
      if (form.brand) payload.brand = form.brand;
      if (form.original_price) payload.original_price = parseFloat(form.original_price);
      const res = await api.post("/products", payload);
      if (imageFile) {
        const fd = new FormData();
        fd.append("file", imageFile);
        await api.post(`/products/${res.data.id}/images`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      }
      toast.success("Товар добавлен!");
      router.push("/seller/products");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  if (!user || (user.role !== "seller" && user.role !== "admin")) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm">
        <ArrowLeft size={16} /> Назад
      </button>
      <h1 className="text-2xl font-bold mb-6">Новый товар</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Image upload */}
        <div className="card p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><Package size={18} /> Фото товара</h2>
          <label className="block cursor-pointer">
            {imagePreview ? (
              <div className="relative w-full h-48 rounded-xl overflow-hidden bg-gray-50">
                <img src={imagePreview} alt="" className="w-full h-full object-contain" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-xl">
                  <p className="text-white text-sm font-medium">Изменить фото</p>
                </div>
              </div>
            ) : (
              <div className="w-full h-40 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-all">
                <Upload size={28} className="text-gray-400" />
                <p className="text-sm text-gray-500 font-medium">Нажмите для загрузки</p>
                <p className="text-xs text-gray-400">PNG, JPG до 10MB</p>
              </div>
            )}
            <input type="file" accept="image/*" className="sr-only" onChange={handleImageChange} />
          </label>
        </div>

        {/* Main info */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold">Основная информация</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Название *</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" placeholder="Название товара" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Описание</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input h-28 resize-none" placeholder="Опишите товар подробнее..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Бренд</label>
              <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="input" placeholder="Apple, Samsung..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Категория *</label>
              <select required value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="input">
                <option value="">Выберите...</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.parent_id ? "  └ " : ""}{c.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold">Цена и остаток</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Цена (сом.) *</label>
              <input required type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="input" placeholder="1990" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Старая цена</label>
              <input type="number" min="0" step="0.01" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })} className="input" placeholder="2990" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Остаток *</label>
              <input required type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="input" placeholder="100" />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()} className="btn-outline flex-1 py-3">Отмена</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1 py-3">
            {loading ? "Сохраняем..." : "Добавить товар"}
          </button>
        </div>
      </form>
    </div>
  );
}
