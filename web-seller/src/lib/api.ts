import axios from "axios";

export const API_URL = "https://aza-market-backend.onrender.com";
const TOKEN_KEY = "seller_web:token";
const USER_KEY  = "seller_web:user";

const api = axios.create({ baseURL: `${API_URL}/api`, timeout: 50000 });

api.interceptors.request.use((cfg) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;

export function getToken()  { return typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null; }
export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); } catch { return null; }
}
export function saveAuth(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = "/login";
}

export function imgUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API_URL}${url}`;
}

// ── Types ──────────────────────────────────────────────────────────────
export interface User {
  id: number; username: string; full_name?: string; phone?: string;
  role: "buyer" | "seller" | "admin"; is_active: boolean; balance: number;
  avatar_url?: string; created_at: string;
  shop_name?: string; shop_description?: string;
  shop_banner_url?: string; shop_logo_url?: string;
  shop_city?: string; is_verified?: boolean;
}

export interface Category { id: number; name: string; slug: string; parent_id: number | null; }
export interface ProductImage { id: number; url: string; is_main: boolean; variant_index?: number | null; }
export interface ProductVariant { index: number; name: string; price: number; original_price?: number | null; stock?: number | null; }
export interface ProductDocument { id: number; doc_type: string; url: string; filename?: string | null; }
export interface Product {
  id: number; title: string; description?: string; about?: string;
  price: number; original_price?: number; brand?: string; sku?: string;
  rating: number; reviews_count: number; stock: number; sales_count?: number;
  is_active: boolean; seller_id: number; shop_tag?: string | null;
  delivery_price?: number; delivery_price_other?: number; delivery_mode?: string;
  barcode?: string | null;
  category: Category; images: ProductImage[];
  variants?: ProductVariant[] | null;
  documents?: ProductDocument[];
  attributes?: Record<string, string>;
}

export interface OrderItem { id: number; quantity: number; price: number; product: Product; }
export type OrderStatus = "pending"|"confirmed"|"processing"|"shipped"|"delivered"|"cancelled";
export interface Order {
  id: number; status: OrderStatus; total_price: number;
  delivery_address: string; delivery_city: string; contact_phone: string;
  is_paid: boolean; payment_method: string; delivery_cost?: number;
  delivery_date?: string | null; delivery_time?: string | null;
  delivery_service?: string | null; tracking_number?: string | null;
  created_at: string; items: OrderItem[];
}

export interface SellerStats {
  products: { total: number; active: number; out_of_stock: number };
  orders: { total: number; pending: number; confirmed: number; processing: number; shipped: number; delivered: number; cancelled: number };
  revenue: { total: number; last_7d: number; last_30d: number };
  orders_7d: number; orders_30d: number;
  avg_rating: number; total_reviews: number;
  top_products: { id: number; title: string; price: number; sales_count: number; stock: number; image_url: string | null }[];
  chart_7d: { date: string; revenue: number }[];
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Новый", confirmed: "Подтверждён", processing: "В обработке",
  shipped: "Отправлен", delivered: "Доставлен", cancelled: "Отменён",
};
export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-purple-100 text-purple-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};
export const ORDER_STATUS_NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "confirmed", confirmed: "processing", processing: "shipped", shipped: "delivered",
};
