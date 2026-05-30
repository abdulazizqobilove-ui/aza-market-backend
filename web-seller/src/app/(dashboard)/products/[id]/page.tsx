"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import api, { Product } from "@/lib/api";
import ProductForm from "@/components/ProductForm";

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    api.get<Product>(`/products/${id}`)
      .then((r) => setProduct(r.data))
      .catch(() => setError("Товар не найден"))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 transition"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {loading ? "Загрузка..." : product?.title ?? "Редактировать товар"}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {product ? `ID: ${product.id}` : "Редактирование товара"}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-sm text-gray-400">Загружаем товар...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <p className="text-red-500 font-medium">{error}</p>
            <button onClick={() => router.push("/products")} className="btn-primary mt-4">
              ← Назад к товарам
            </button>
          </div>
        </div>
      ) : product ? (
        <ProductForm product={product} />
      ) : null}
    </div>
  );
}
