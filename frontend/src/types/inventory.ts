export type PeriodFilter = "today" | "week" | "month" | "year";

export interface UserPermissions {
  can_add_products: boolean;
  can_edit_products: boolean;
  can_delete_products: boolean;
  can_manage_users: boolean;
}

export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  image_url?: string | null;
  stock: number;
  price: number;
  min_stock_threshold: number; // Por defecto 5
  created_at: string;
  updated_at: string;
}

export interface InventoryMovement {
  id: string;
  tenant_id: string;
  product_id: string;
  type: "IN" | "OUT" | "ADJUSTMENT";
  quantity: number;
  unit_price: number;
  total_amount: number;
  reason?: string;
  created_at: string;
}

export interface DashboardMetrics {
  totalProductsCount: number;
  totalInventoryValue: number; // SUM(stock * price)
  consumedValueInPeriod: number; // Salidas en el período seleccionado
  lowStockCount: number;
}
