import axios from "axios";

const api = axios.create({ baseURL: "http://192.168.1.45:8000/api" });

api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/auth/login";
    }
    return Promise.reject(error);
  }
);

export default api;

// ---- Types ----
export interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
}

export interface ProductImage {
  id: number;
  url: string;
  is_main: boolean;
}

export interface Product {
  id: number;
  title: string;
  description?: string;
  price: number;
  original_price?: number;
  brand?: string;
  rating: number;
  reviews_count: number;
  stock: number;
  is_active: boolean;
  seller_id: number;
  category: Category;
  images: ProductImage[];
}

export interface ProductsResponse {
  total: number;
  page: number;
  pages: number;
  items: Product[];
}

export interface User {
  id: number;
  email?: string;
  username: string;
  full_name?: string;
  phone?: string;
  role: "buyer" | "seller" | "admin";
  is_active: boolean;
  balance: number;
  created_at: string;
  shop_name?: string;
  shop_description?: string;
  shop_banner_url?: string;
  shop_logo_url?: string;
}

export type PayoutStatus = "pending" | "approved" | "rejected";

export interface Payout {
  id: number;
  amount: number;
  bank_details: string;
  status: PayoutStatus;
  comment?: string;
  created_at: string;
}

export interface SellerBalance {
  balance: number;
  total_earned: number;
  total_withdrawn: number;
  payouts: Payout[];
}

export interface CartItem {
  id: number;
  quantity: number;
  product: Product;
}

export interface OrderItem {
  id: number;
  quantity: number;
  price: number;
  product: Product;
}

export type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";

export interface Order {
  id: number;
  status: OrderStatus;
  total_price: number;
  delivery_address: string;
  delivery_city: string;
  contact_phone: string;
  created_at: string;
  items: OrderItem[];
}
