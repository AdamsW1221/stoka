import { Platform } from "react-native";
import Constants from "expo-constants";
import { SecureStorageService, StorageKeys } from "./storage";
import { Product, PeriodFilter, DashboardMetrics } from "@/types/inventory";

// Extraer dinámicamente la IP de la máquina anfitriona desde Expo Go, o usar la IP de la red Wi-Fi actual
const hostUri = Constants.expoConfig?.hostUri || "";
const dynamicHost = hostUri.split(":")[0];
const DEV_MACHINE_IP = dynamicHost || "192.168.2.213";

export const API_BASE_URL =
  Platform.OS === "web"
    ? "http://127.0.0.1:4000/api/v1"
    : `http://${DEV_MACHINE_IP}:4000/api/v1`;

interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  message?: string;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await SecureStorageService.getItem(StorageKeys.AUTH_TOKEN);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.message || `Error ${response.status}: ${response.statusText}`;
      throw new Error(errorMsg);
    }

    return data as T;
  } catch (error: any) {
    console.warn(`[ApiClient] Error en petición a ${endpoint}:`, error.message);
    throw error;
  }
}

export const ApiClient = {
  auth: {
    async register(data: { email: string; password: string; organizationName: string }) {
      return request<{ success: boolean; message: string; email: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    async verifyOtp(data: { email: string; code: string; organizationName: string; password: string }) {
      const res = await request<{
        success: boolean;
        token: string;
        user: any;
        tenant: any;
      }>("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (res.token) {
        await SecureStorageService.setItem(StorageKeys.AUTH_TOKEN, res.token);
        await SecureStorageService.setObject(StorageKeys.USER_DATA, res.user);
      }

      return res;
    },

    async login(data: { email: string; password: string }) {
      const res = await request<{
        success: boolean;
        token: string;
        user: any;
        tenant: any;
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (res.token) {
        await SecureStorageService.setItem(StorageKeys.AUTH_TOKEN, res.token);
        await SecureStorageService.setObject(StorageKeys.USER_DATA, res.user);
      }

      return res;
    },

    async googleLogin(idToken: string) {
      const res = await request<{
        success: boolean;
        token: string;
        user: any;
        tenant: any;
      }>("/auth/google", {
        method: "POST",
        body: JSON.stringify({ idToken }),
      });

      if (res.token) {
        await SecureStorageService.setItem(StorageKeys.AUTH_TOKEN, res.token);
        await SecureStorageService.setObject(StorageKeys.USER_DATA, res.user);
      }

      return res;
    },

    async logout() {
      await SecureStorageService.clearSession();
    },
  },

  dashboard: {
    async getMetrics(period: PeriodFilter = "month"): Promise<DashboardMetrics> {
      return request<DashboardMetrics>(`/dashboard/metrics?period=${period}`);
    },
  },

  products: {
    async list(): Promise<{ products: Product[] }> {
      return request<{ products: Product[] }>("/products");
    },

    async create(productData: Omit<Product, "id" | "tenant_id" | "created_at" | "updated_at">) {
      return request<{ product: Product }>("/products", {
        method: "POST",
        body: JSON.stringify(productData),
      });
    },

    async adjustStock(id: string, delta: number, reason?: string) {
      return request<{ product: Product }>(`/products/${id}/stock`, {
        method: "PATCH",
        body: JSON.stringify({ delta, reason }),
      });
    },

    async delete(id: string) {
      return request<{ success: boolean }>(`/products/${id}`, {
        method: "DELETE",
      });
    },
  },
};
