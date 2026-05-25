"use client";
import Link from "next/link";
import { CATEGORIES } from "@/data/categories";

export default function CatalogPage() {
  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      <div className="bg-white px-4 pt-5 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Каталог</h1>
        <p className="text-sm text-gray-400 mt-0.5">{CATEGORIES.length} категорий</p>
      </div>

      <div className="grid grid-cols-3 gap-2 p-3">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.slug}
            href={`/catalog/${cat.slug}`}
            className={`bg-gradient-to-br ${cat.color} relative flex flex-col justify-between p-3 rounded-2xl active:scale-95 transition-transform shadow-sm overflow-hidden`}
            style={{ aspectRatio: "1" }}
          >
            <div className="absolute -bottom-3 -right-3 w-16 h-16 rounded-full bg-white/10" />
            <p className="text-white text-[11px] font-bold leading-snug text-left drop-shadow z-10 line-clamp-3">
              {cat.name}
            </p>
            <div className="self-end text-3xl drop-shadow-lg z-10">{cat.emoji}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
