import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const API_URL = "https://aza-market-backend.onrender.com";

const api = axios.create({ baseURL: `${API_URL}/api`, timeout: 60000 });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error?.response?.status === 401) {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
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
export interface ProductImage { id: number; url: string; is_main: boolean; }
export interface Product {
  id: number; title: string; description?: string; about?: string;
  attributes?: Record<string, string>; price: number;
  original_price?: number; brand?: string; rating: number; reviews_count: number;
  stock: number; is_active: boolean; seller_id: number;
  category: Category; images: ProductImage[];
}
export interface ProductsResponse { total: number; page: number; pages: number; items: Product[]; }
export interface User {
  id: number; username: string; full_name?: string; phone?: string;
  role: "buyer" | "seller" | "admin"; is_active: boolean; balance: number;
  avatar_url?: string; created_at: string; shop_name?: string;
  shop_description?: string; shop_banner_url?: string; shop_logo_url?: string;
}
export interface CartItem { id: number; quantity: number; product: Product; }
export interface OrderItem { id: number; quantity: number; price: number; product: Product; }
export type OrderStatus = "pending"|"confirmed"|"processing"|"shipped"|"delivered"|"cancelled";
export interface Order {
  id: number; status: OrderStatus; total_price: number;
  delivery_address: string; delivery_city: string; contact_phone: string;
  created_at: string; items: OrderItem[];
}
