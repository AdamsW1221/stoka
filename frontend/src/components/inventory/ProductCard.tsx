import React from "react";
import { View, Text, Image, TouchableOpacity, Alert } from "react-native";
import {
  WarningCircle,
  PencilSimple,
  Trash,
  Plus,
  Minus,
} from "phosphor-react-native";

import { colors } from "@/theme/tokens";
import { Product, UserPermissions } from "@/types/inventory";

interface ProductCardProps {
  product: Product;
  permissions: UserPermissions;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onQuickAdjustStock: (productId: string, delta: number) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  permissions,
  onEdit,
  onDelete,
  onQuickAdjustStock,
}) => {
  const isLowStock = product.stock < product.min_stock_threshold; // Umbral < 5

  const confirmDelete = () => {
    Alert.alert(
      "Eliminar Mercancía",
      `¿Estás seguro de que deseas eliminar "${product.name}"? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => onDelete(product.id),
        },
      ]
    );
  };

  return (
    <View
      style={{
        backgroundColor: colors.surface.card,
        borderColor: isLowStock ? colors.primary.DEFAULT : colors.border.DEFAULT,
        borderWidth: isLowStock ? 1.5 : 1,
      }}
      className="rounded-2xl p-4 mb-3.5 shadow-md"
    >
      <View className="flex-row gap-3.5">
        {/* Imagen del producto */}
        <View
          style={{
            borderColor: colors.border.DEFAULT,
            backgroundColor: colors.background.DEFAULT,
          }}
          className="w-20 h-20 rounded-xl border overflow-hidden items-center justify-center"
        >
          <Image
            source={{
              uri:
                product.image_url ||
                "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&auto=format&fit=crop&q=80",
            }}
            className="w-full h-full"
            resizeMode="cover"
          />
        </View>

        {/* Información Principal */}
        <View className="flex-1 justify-between">
          <View>
            <View className="flex-row items-center justify-between">
              <Text
                style={{ color: colors.text.primary }}
                numberOfLines={1}
                className="text-base font-bold flex-1 mr-2"
              >
                {product.name}
              </Text>

              {/* Acciones RBAC (Editar / Eliminar) */}
              <View className="flex-row items-center gap-1.5">
                {permissions.can_edit_products && (
                  <TouchableOpacity
                    onPress={() => onEdit(product)}
                    style={{ backgroundColor: colors.surface.DEFAULT }}
                    className="p-1.5 rounded-lg"
                  >
                    <PencilSimple size={16} color={colors.text.secondary} />
                  </TouchableOpacity>
                )}

                {permissions.can_delete_products && (
                  <TouchableOpacity
                    onPress={confirmDelete}
                    style={{ backgroundColor: colors.surface.DEFAULT }}
                    className="p-1.5 rounded-lg"
                  >
                    <Trash size={16} color={colors.status.danger} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {product.description ? (
              <Text
                style={{ color: colors.text.secondary }}
                numberOfLines={1}
                className="text-xs mt-0.5"
              >
                {product.description}
              </Text>
            ) : null}
          </View>

          {/* Fila de Precio y Stock */}
          <View className="flex-row items-center justify-between mt-2">
            <View>
              <Text style={{ color: colors.text.muted }} className="text-[10px] uppercase font-bold">
                Precio Unitario
              </Text>
              <Text style={{ color: colors.text.primary }} className="text-base font-black">
                ${Number(product.price || 0).toFixed(2)}
              </Text>
            </View>

            {/* Contador de Stock con Botones Rápidos si tiene permisos */}
            <View className="flex-row items-center gap-2">
              {permissions.can_edit_products && (
                <TouchableOpacity
                  onPress={() => onQuickAdjustStock(product.id, -1)}
                  disabled={product.stock <= 0}
                  style={{
                    backgroundColor: colors.surface.DEFAULT,
                    borderColor: colors.border.DEFAULT,
                  }}
                  className="w-7 h-7 rounded-lg border items-center justify-center"
                >
                  <Minus size={14} color={colors.text.secondary} />
                </TouchableOpacity>
              )}

              <View className="items-center min-w-[36px]">
                <Text
                  style={{
                    color: isLowStock ? colors.primary.DEFAULT : colors.text.primary,
                    fontWeight: "800",
                  }}
                  className="text-base"
                >
                  {product.stock}
                </Text>
                <Text style={{ color: colors.text.muted }} className="text-[9px] uppercase">
                  unid.
                </Text>
              </View>

              {permissions.can_edit_products && (
                <TouchableOpacity
                  onPress={() => onQuickAdjustStock(product.id, 1)}
                  style={{
                    backgroundColor: colors.surface.DEFAULT,
                    borderColor: colors.border.DEFAULT,
                  }}
                  className="w-7 h-7 rounded-lg border items-center justify-center"
                >
                  <Plus size={14} color={colors.text.secondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Badge destacado de Stock Bajo (< 5 unidades) */}
      {isLowStock && (
        <View
          style={{
            backgroundColor: colors.primary.muted,
            borderColor: colors.primary.DEFAULT,
          }}
          className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl border mt-3"
        >
          <WarningCircle size={16} color={colors.primary.DEFAULT} weight="bold" />
          <Text
            style={{ color: colors.primary.DEFAULT }}
            className="text-xs font-bold flex-1"
          >
            Alerta de Stock Crítico: Por debajo de {product.min_stock_threshold} unidades ({product.stock} disponibles)
          </Text>
        </View>
      )}
    </View>
  );
};
