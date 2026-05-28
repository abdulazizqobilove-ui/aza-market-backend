import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const API_URL = "https://aza-market-backend.onrender.com";

const TIMEOUT_MS = 50000;

const api = axios.create({ baseURL: `${API_URL}/api`, timeout: TIMEOUT_MS });

/** Call once on app start — wakes up sleeping Render.com server in background */
export function pingServer() {
  axios.get(`${API_URL}/api/health`, { timeout: 55000 }).catch(() => {});
}

// Reliable timeout via AbortController — axios timeout alone doesn't always
// fire on React Native when the server accepts TCP but never sends a response
const timers = new Map<string, ReturnType<typeof setTimeout>>();

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("buyer:token");
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  config.signal = controller.signal;
  const key = Math.random().toString(36).slice(2);
  (config as any).__abortKey = key;
  timers.set(key, setTimeout(() => { controller.abort(); timers.delete(key); }, TIMEOUT_MS));

  return config;
});

api.interceptors.response.use(
  (r) => {
    const key = (r.config as any).__abortKey;
    if (key) { clearTimeout(timers.get(key)); timers.delete(key); }
    return r;
  },
  async (error) => {
    const key = (error?.config as any)?.__abortKey;
    if (key) { clearTimeout(timers.get(key)); timers.delete(key); }
    if (error?.response?.status === 401) {
      await AsyncStorage.removeItem("buyer:token");
      await AsyncStorage.removeItem("buyer:user");
    }
    return Promise.reject(error);
  }
);

export default api;

/** Returns a full image URL — works for both Cloudinary (https://...) and legacy local (/uploads/...) URLs */
export function imgUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API_URL}${url}`;
}

export interface Category { id: number; name: string; slug: string; parent_id: number | null; }
export interface ProductImage { id: number; url: string; is_main: boolean; variant_index?: number | null; }
export interface ProductVariant {
  index: number; name: string; price: number; original_price?: number | null; stock?: number | null;
}
export interface Product {
  id: number; title: string; description?: string; about?: string;
  attributes?: Record<string, string>; price: number;
  original_price?: number; brand?: string; sku?: string; rating: number; reviews_count: number;
  stock: number; sales_count?: number; is_active: boolean; seller_id: number;
  category: Category; images: ProductImage[];
  variants?: ProductVariant[] | null;
  shop_tag?: string | null;
}
export interface ProductsResponse { total: number; page: number; pages: number; items: Product[]; }
export interface User {
  id: number; username: string; full_name?: string; phone?: string; email?: string;
  role: "buyer" | "seller" | "admin"; is_active: boolean; balance: number;
  avatar_url?: string; created_at: string; shop_name?: string;
  shop_description?: string; shop_banner_url?: string; shop_logo_url?: string;
}
export interface CartItem { id: number; quantity: number; product: Product; selected_attrs?: Record<string, string> | null; }
export interface OrderItem { id: number; quantity: number; price: number; product: Product; }
export type OrderStatus = "pending"|"confirmed"|"processing"|"shipped"|"delivered"|"cancelled";
export interface Order {
  id: number; status: OrderStatus; total_price: number;
  delivery_address: string; delivery_city: string; contact_phone: string;
  is_paid: boolean; payment_method: string;
  delivery_date?: string | null; delivery_time?: string | null;
  created_at: string; items: OrderItem[];
}
