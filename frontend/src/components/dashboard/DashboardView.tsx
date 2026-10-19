import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  RefreshControl,
  Alert,
} from "react-native";
import {
  Package,
  CurrencyDollar,
  TrendDown,
  WarningCircle,
  Plus,
  MagnifyingGlass,
  Funnel,
  SignOut,
  Sparkle,
} from "phosphor-react-native";

import { colors } from "@/theme/tokens";
import { Product, PeriodFilter, UserPermissions, DashboardMetrics } from "@/types/inventory";
import { ProductCard } from "@/components/inventory/ProductCard";
import { ProductFormModal } from "@/components/inventory/ProductFormModal";
import { NotificationsService } from "@/services/notifications";
import { ApiClient } from "@/services/apiClient";

interface DashboardViewProps {
  onLogout: () => void;
  tenantName?: string;
}

// Datos iniciales de demostración para el inventario de Stoka
const INITIAL_PRODUCTS: Product[] = [
  {
    id: "prod-1",
    tenant_id: "tenant-demo",
    name: "Aceite Sintético 5W-30 (4L)",
    description: "Lubricante de alto rendimiento para motores a gasolina y diésel",
    image_url: "https://images.unsplash.com/photo-1615906655593-ad0386982a0f?w=400&auto=format&fit=crop&q=80",
    stock: 3, // Stock bajo (< 5) para probar alerta
    price: 42.5,
    min_stock_threshold: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "prod-2",
    tenant_id: "tenant-demo",
    name: "Filtro de Aire Premium",
    description: "Filtro de celulosa reforzada para partículas finas",
    image_url: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=400&auto=format&fit=crop&q=80",
    stock: 18,
    price: 15.0,
    min_stock_threshold: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "prod-3",
    tenant_id: "tenant-demo",
    name: "Pastillas de Freno Cerámicas",
    description: "Juego delantero silencioso de frenado rápido",
    image_url: "https://images.unsplash.com/photo-1600790142055-619df03207e6?w=400&auto=format&fit=crop&q=80",
    stock: 2, // Stock bajo (< 5)
    price: 68.0,
    min_stock_threshold: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "prod-4",
    tenant_id: "tenant-demo",
    name: "Líquido Refrigerante 50/50 (1 Gal)",
    description: "Protección anticorrosiva de larga duración",
    image_url: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=400&auto=format&fit=crop&q=80",
    stock: 25,
    price: 21.0,
    min_stock_threshold: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  onLogout,
  tenantName = "Distribuidora Stoka",
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>("month");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterLowStockOnly, setFilterLowStockOnly] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Estado del Modal de Producto
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Permisos RBAC del usuario activo
  const [permissions] = useState<UserPermissions>({
    can_add_products: true,
    can_edit_products: true,
    can_delete_products: true,
    can_manage_users: true,
  });

  // Solicitar permisos de notificación y cargar catálogo desde base de datos
  useEffect(() => {
    NotificationsService.requestPermissions();
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const res = await ApiClient.products.list();
      if (res?.products) {
        setProducts(res.products);
      }
    } catch (e: any) {
      console.log("[DashboardView] Error cargando productos del backend:", e.message);
    }
  };

  // Multiplicadores dinámicos según el selector de período para simular salidas reales
  const periodMultiplier: Record<PeriodFilter, number> = {
    today: 0.05,
    week: 0.22,
    month: 0.65,
    year: 2.4,
  };

  // Cálculo de Métricas del Dashboard
  const metrics: DashboardMetrics = useMemo(() => {
    const totalCount = products.length;
    const totalValue = products.reduce(
      (acc, p) => acc + (Number(p.stock) || 0) * (Number(p.price) || 0),
      0
    );
    const lowCount = products.filter((p) => Number(p.stock) < Number(p.min_stock_threshold)).length;
    const consumedValue = totalValue * periodMultiplier[selectedPeriod];

    return {
      totalProductsCount: totalCount,
      totalInventoryValue: totalValue,
      consumedValueInPeriod: consumedValue,
      lowStockCount: lowCount,
    };
  }, [products, selectedPeriod]);

  // Filtrado y búsqueda de productos
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLowStock = filterLowStockOnly
        ? item.stock < item.min_stock_threshold
        : true;
      return matchesSearch && matchesLowStock;
    });
  }, [products, searchQuery, filterLowStockOnly]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  // Guardar mercancía (Crear o Editar en base de datos)
  const handleSaveProduct = async (
    data: Omit<Product, "id" | "tenant_id" | "created_at" | "updated_at">
  ) => {
    try {
      const res = await ApiClient.products.create(data);
      if (res?.product) {
        setProducts((prev) => [res.product, ...prev]);
        if (res.product.stock < 5) {
          NotificationsService.triggerLowStockAlert(res.product.name, res.product.stock);
        }
        setEditingProduct(null);
        Alert.alert("Éxito", "Producto guardado correctamente en Supabase.");
        return;
      }
    } catch (apiError: any) {
      console.warn("[DashboardView] Backend no guardó en BD:", apiError.message);
      Alert.alert(
        "No se pudo guardar en Supabase",
        `${apiError.message || "Error al comunicarse con el servidor."}\n\nVerifica que hayas iniciado sesión con una cuenta real y no en modo demo.`
      );
    }
  };

  // Eliminar mercancía
  const handleDeleteProduct = async (productId: string) => {
    try {
      await ApiClient.products.delete(productId);
    } catch (apiError: any) {
      console.warn("[DashboardView] Error eliminando en backend:", apiError.message);
    }
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  // Ajuste rápido de stock (+ / -) con sincronización en base de datos
  const handleQuickAdjust = async (productId: string, delta: number) => {
    try {
      const res = await ApiClient.products.adjustStock(productId, delta);
      if (res?.product) {
        setProducts((prev) => prev.map((p) => (p.id === productId ? res.product : p)));
        if (res.product.stock < 5) {
          NotificationsService.triggerLowStockAlert(res.product.name, res.product.stock);
        }
        return;
      }
    } catch (apiError: any) {
      console.warn("[DashboardView] Ajuste local fallback:", apiError.message);
    }

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const newStock = Math.max(0, p.stock + delta);
          if (newStock < 5 && (p.stock >= 5 || delta < 0)) {
            NotificationsService.triggerLowStockAlert(p.name, newStock);
          }
          return { ...p, stock: newStock, updated_at: new Date().toISOString() };
        }
        return p;
      })
    );
  };

  const periodLabels: Record<PeriodFilter, string> = {
    today: "Hoy",
    week: "Esta semana",
    month: "Este mes",
    year: "En el año",
  };

  return (
    <View style={{ backgroundColor: colors.background.DEFAULT }} className="flex-1">
      {/* Barra Superior del Tenant */}
      <View
        style={{
          backgroundColor: colors.surface.DEFAULT,
          borderBottomColor: colors.border.DEFAULT,
        }}
        className="px-6 pt-4 pb-4 border-b flex-row items-center justify-between"
      >
        <View className="flex-row items-center gap-2.5">
          <View
            style={{ backgroundColor: colors.primary.muted }}
            className="w-10 h-10 rounded-xl items-center justify-center border border-[#FF8000]/30"
          >
            <Package size={22} color={colors.primary.DEFAULT} weight="duotone" />
          </View>
          <View>
            <Text style={{ color: colors.text.primary }} className="text-base font-black">
              {tenantName}
            </Text>
            <Text style={{ color: colors.primary.DEFAULT }} className="text-xs font-semibold">
              Tenant Activo • Rol Admin
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={onLogout}
          style={{ backgroundColor: colors.surface.hover }}
          className="p-2.5 rounded-xl flex-row items-center gap-1.5"
        >
          <SignOut size={18} color={colors.text.secondary} />
          <Text style={{ color: colors.text.secondary }} className="text-xs font-semibold">
            Salir
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary.DEFAULT}
          />
        }
      >
        {/* ============================================================== */}
        {/* SELECTOR DE PERÍODOS */}
        {/* ============================================================== */}
        <View className="mb-5">
          <Text
            style={{ color: colors.text.secondary }}
            className="text-xs font-bold uppercase tracking-wider mb-2"
          >
            Período de Análisis
          </Text>
          <View
            style={{
              backgroundColor: colors.surface.DEFAULT,
              borderColor: colors.border.DEFAULT,
            }}
            className="flex-row p-1 rounded-2xl border"
          >
            {(["today", "week", "month", "year"] as PeriodFilter[]).map((period) => {
              const isSelected = selectedPeriod === period;
              return (
                <TouchableOpacity
                  key={period}
                  onPress={() => setSelectedPeriod(period)}
                  style={{
                    backgroundColor: isSelected ? colors.primary.DEFAULT : "transparent",
                  }}
                  className="flex-1 py-2.5 rounded-xl items-center justify-center"
                >
                  <Text
                    style={{
                      color: isSelected ? "#FFFFFF" : colors.text.secondary,
                      fontWeight: isSelected ? "700" : "500",
                    }}
                    className="text-xs"
                  >
                    {periodLabels[period]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ============================================================== */}
        {/* TARJETAS DE MÉTRICAS DEL DASHBOARD */}
        {/* ============================================================== */}
        <View className="gap-3 mb-6">
          {/* Tarjeta: Valor Monetario Disponible */}
          <View
            style={{
              backgroundColor: colors.surface.card,
              borderColor: colors.border.DEFAULT,
            }}
            className="p-5 rounded-2xl border shadow-lg"
          >
            <View className="flex-row items-center justify-between mb-2">
              <Text style={{ color: colors.text.secondary }} className="text-xs font-bold uppercase">
                Valor Total de Inventario Disponible
              </Text>
              <View
                style={{ backgroundColor: colors.status.successMuted }}
                className="w-8 h-8 rounded-full items-center justify-center"
              >
                <CurrencyDollar size={20} color={colors.status.success} weight="bold" />
              </View>
            </View>
            <Text style={{ color: colors.text.primary }} className="text-3xl font-black">
              ${metrics.totalInventoryValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </Text>
            <Text style={{ color: colors.text.muted }} className="text-xs mt-1">
              Calculado automáticamente como SUM(stock × precio)
            </Text>
          </View>

          {/* Fila de 2 Tarjetas Secundarias */}
          <View className="flex-row gap-3">
            {/* Tarjeta: Total Mercancías */}
            <View
              style={{
                backgroundColor: colors.surface.card,
                borderColor: colors.border.DEFAULT,
              }}
              className="flex-1 p-4 rounded-2xl border shadow-md justify-between"
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text style={{ color: colors.text.secondary }} className="text-xs font-bold uppercase">
                  Mercancías
                </Text>
                <Package size={18} color={colors.primary.DEFAULT} weight="duotone" />
              </View>
              <Text style={{ color: colors.text.primary }} className="text-2xl font-black">
                {metrics.totalProductsCount}
              </Text>
              <Text style={{ color: colors.text.muted }} className="text-[10px]">
                {metrics.lowStockCount} con stock bajo
              </Text>
            </View>

            {/* Tarjeta: Salidas / Consumo en Período */}
            <View
              style={{
                backgroundColor: colors.surface.card,
                borderColor: colors.border.DEFAULT,
              }}
              className="flex-1 p-4 rounded-2xl border shadow-md justify-between"
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text style={{ color: colors.text.secondary }} className="text-xs font-bold uppercase">
                  Salidas ({periodLabels[selectedPeriod]})
                </Text>
                <TrendDown size={18} color="#F59E0B" weight="bold" />
              </View>
              <Text style={{ color: colors.text.primary }} className="text-2xl font-black">
                ${metrics.consumedValueInPeriod.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </Text>
              <Text style={{ color: colors.text.muted }} className="text-[10px]">
                Mercancía consumida
              </Text>
            </View>
          </View>
        </View>

        {/* ============================================================== */}
        {/* SECCIÓN CATÁLOGO DE MERCANCÍAS */}
        {/* ============================================================== */}
        <View className="flex-row items-center justify-between mb-3">
          <Text style={{ color: colors.text.primary }} className="text-lg font-black">
            Catálogo de Inventario
          </Text>

          {/* Botón Nueva Mercancía protegido con RBAC */}
          {permissions.can_add_products && (
            <TouchableOpacity
              onPress={() => {
                setEditingProduct(null);
                setIsModalOpen(true);
              }}
              style={{ backgroundColor: colors.primary.DEFAULT }}
              activeOpacity={0.8}
              className="flex-row items-center gap-1.5 px-3.5 py-2 rounded-xl shadow-md"
            >
              <Plus size={16} color="#FFFFFF" weight="bold" />
              <Text className="text-white text-xs font-bold">Nueva Mercancía</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Barra de Búsqueda y Filtro de Stock Bajo */}
        <View className="flex-row gap-2.5 mb-4">
          <View
            style={{
              backgroundColor: colors.surface.card,
              borderColor: colors.border.DEFAULT,
            }}
            className="flex-1 flex-row items-center px-3.5 py-2.5 rounded-xl border"
          >
            <MagnifyingGlass size={18} color={colors.text.secondary} />
            <TextInput
              placeholder="Buscar mercancía..."
              placeholderTextColor={colors.text.placeholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={{ color: colors.text.primary }}
              className="flex-1 ml-2 text-xs font-medium"
            />
          </View>

          <TouchableOpacity
            onPress={() => setFilterLowStockOnly(!filterLowStockOnly)}
            style={{
              backgroundColor: filterLowStockOnly
                ? colors.primary.DEFAULT
                : colors.surface.card,
              borderColor: filterLowStockOnly
                ? colors.primary.DEFAULT
                : colors.border.DEFAULT,
            }}
            className="px-3 py-2.5 rounded-xl border flex-row items-center gap-1.5"
          >
            <WarningCircle
              size={16}
              color={filterLowStockOnly ? "#FFFFFF" : colors.primary.DEFAULT}
              weight={filterLowStockOnly ? "fill" : "bold"}
            />
            <Text
              style={{
                color: filterLowStockOnly ? "#FFFFFF" : colors.text.primary,
                fontWeight: "700",
              }}
              className="text-xs"
            >
              Stock &lt; 5
            </Text>
          </TouchableOpacity>
        </View>

        {/* Listado de Tarjetas de Mercancía */}
        {filteredProducts.length === 0 ? (
          <View
            style={{
              backgroundColor: colors.surface.card,
              borderColor: colors.border.DEFAULT,
            }}
            className="p-8 rounded-2xl border items-center my-4"
          >
            <Package size={40} color={colors.text.muted} weight="duotone" />
            <Text style={{ color: colors.text.primary }} className="font-bold text-sm mt-3">
              No se encontraron mercancías
            </Text>
            <Text style={{ color: colors.text.secondary }} className="text-xs text-center mt-1">
              {searchQuery
                ? "Prueba con otro término de búsqueda o limpia los filtros."
                : "Agrega tu primer producto usando el botón superior."}
            </Text>
          </View>
        ) : (
          filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              permissions={permissions}
              onEdit={(prod) => {
                setEditingProduct(prod);
                setIsModalOpen(true);
              }}
              onDelete={handleDeleteProduct}
              onQuickAdjustStock={handleQuickAdjust}
            />
          ))
        )}
      </ScrollView>

      {/* Modal de Crear / Editar Mercancía */}
      <ProductFormModal
        visible={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProduct(null);
        }}
        onSave={handleSaveProduct}
        initialProduct={editingProduct}
      />
    </View>
  );
};
