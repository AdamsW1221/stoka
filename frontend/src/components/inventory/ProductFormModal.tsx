import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  X,
  Camera,
  Image as ImageIcon,
  Tag,
  CurrencyDollar,
  Stack as StackIcon,
  Check,
  Package,
} from "phosphor-react-native";

import { colors } from "@/theme/tokens";
import { Product } from "@/types/inventory";

interface ProductFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (productData: Omit<Product, "id" | "tenant_id" | "created_at" | "updated_at">) => void;
  initialProduct?: Product | null;
}

// Imagen placeholder por defecto para mercancías sin foto
const DEFAULT_PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&auto=format&fit=crop&q=80";

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  visible,
  onClose,
  onSave,
  initialProduct,
}) => {
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [stock, setStock] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (initialProduct) {
      setName(initialProduct.name);
      setDescription(initialProduct.description || "");
      setStock(initialProduct.stock.toString());
      setPrice(initialProduct.price.toString());
      setImageUri(initialProduct.image_url || null);
    } else {
      resetForm();
    }
  }, [initialProduct, visible]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setStock("");
    setPrice("");
    setImageUri(null);
  };

  // Selector de imagen: Galería
  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso Requerido", "Necesitamos acceso a tus fotos para adjuntar la imagen.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  // Selector de imagen: Cámara
  const takeWithCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso Requerido", "Necesitamos acceso a la cámara para tomar la fotografía.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert("Campo Requerido", "Por favor ingresa el nombre de la mercancía.");
      return;
    }

    const parsedStock = parseInt(stock, 10);
    const parsedPrice = parseFloat(price);

    if (isNaN(parsedStock) || parsedStock < 0) {
      Alert.alert("Stock Inválido", "Ingresa una cantidad numérica de stock mayor o igual a 0.");
      return;
    }

    if (isNaN(parsedPrice) || parsedPrice < 0) {
      Alert.alert("Precio Inválido", "Ingresa un precio unitario válido.");
      return;
    }

    setLoading(true);
    try {
      onSave({
        name: name.trim(),
        description: description.trim(),
        stock: parsedStock,
        price: parsedPrice,
        image_url: imageUri || DEFAULT_PLACEHOLDER_IMAGE,
        min_stock_threshold: 5,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-end bg-black/75"
      >
        <View
          style={{
            backgroundColor: colors.surface.modal,
            borderColor: colors.border.DEFAULT,
          }}
          className="rounded-t-3xl border-t p-6 max-h-[90%]"
        >
          {/* Header del Modal */}
          <View className="flex-row items-center justify-between pb-4 border-b border-[#3D474E]/60 mb-4">
            <View className="flex-row items-center gap-2.5">
              <Package size={24} color={colors.primary.DEFAULT} weight="duotone" />
              <Text style={{ color: colors.text.primary }} className="text-xl font-bold">
                {initialProduct ? "Editar Mercancía" : "Nueva Mercancía"}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={{ backgroundColor: colors.surface.DEFAULT }}
              className="p-2 rounded-full"
            >
              <X size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* 1. Selector de Imagen (Cámara / Galería / Placeholder) */}
            <View className="items-center my-2">
              <View
                style={{
                  borderColor: colors.border.DEFAULT,
                  backgroundColor: colors.background.DEFAULT,
                }}
                className="w-32 h-32 rounded-2xl border-2 overflow-hidden items-center justify-center mb-3 shadow-md"
              >
                <Image
                  source={{ uri: imageUri || DEFAULT_PLACEHOLDER_IMAGE }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              </View>

              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={pickFromGallery}
                  style={{
                    backgroundColor: colors.surface.DEFAULT,
                    borderColor: colors.border.DEFAULT,
                  }}
                  activeOpacity={0.7}
                  className="flex-row items-center gap-1.5 px-3 py-2 rounded-xl border"
                >
                  <ImageIcon size={16} color={colors.primary.DEFAULT} />
                  <Text style={{ color: colors.text.primary }} className="text-xs font-semibold">
                    Galería
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={takeWithCamera}
                  style={{
                    backgroundColor: colors.surface.DEFAULT,
                    borderColor: colors.border.DEFAULT,
                  }}
                  activeOpacity={0.7}
                  className="flex-row items-center gap-1.5 px-3 py-2 rounded-xl border"
                >
                  <Camera size={16} color={colors.primary.DEFAULT} />
                  <Text style={{ color: colors.text.primary }} className="text-xs font-semibold">
                    Cámara
                  </Text>
                </TouchableOpacity>

                {imageUri && (
                  <TouchableOpacity
                    onPress={() => setImageUri(null)}
                    style={{ backgroundColor: colors.surface.DEFAULT }}
                    activeOpacity={0.7}
                    className="px-3 py-2 rounded-xl"
                  >
                    <Text style={{ color: colors.status.danger }} className="text-xs font-medium">
                      Quitar
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* 2. Nombre del Producto */}
            <View className="mb-4">
              <Text
                style={{ color: colors.text.secondary }}
                className="text-xs font-semibold mb-1.5 uppercase tracking-wider"
              >
                Nombre del Producto *
              </Text>
              <View
                style={{
                  backgroundColor: colors.background.DEFAULT,
                  borderColor: colors.border.DEFAULT,
                }}
                className="flex-row items-center px-4 py-3 rounded-2xl border"
              >
                <Tag size={20} color={colors.text.secondary} />
                <TextInput
                  placeholder="Ej. Filtro de Aceite Sintético"
                  placeholderTextColor={colors.text.placeholder}
                  value={name}
                  onChangeText={setName}
                  style={{ color: colors.text.primary }}
                  className="flex-1 ml-3 text-sm font-medium"
                />
              </View>
            </View>

            {/* 3. Descripción Breve */}
            <View className="mb-4">
              <Text
                style={{ color: colors.text.secondary }}
                className="text-xs font-semibold mb-1.5 uppercase tracking-wider"
              >
                Descripción Breve
              </Text>
              <View
                style={{
                  backgroundColor: colors.background.DEFAULT,
                  borderColor: colors.border.DEFAULT,
                }}
                className="px-4 py-3 rounded-2xl border"
              >
                <TextInput
                  placeholder="Detalles, lote o especificaciones del producto..."
                  placeholderTextColor={colors.text.placeholder}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={2}
                  style={{ color: colors.text.primary, minHeight: 48 }}
                  className="text-sm font-medium"
                />
              </View>
            </View>

            {/* Fila: Stock Inicial & Precio Unitario */}
            <View className="flex-row gap-3 mb-6">
              {/* 4. Stock Inicial */}
              <View className="flex-1">
                <Text
                  style={{ color: colors.text.secondary }}
                  className="text-xs font-semibold mb-1.5 uppercase tracking-wider"
                >
                  Stock Inicial *
                </Text>
                <View
                  style={{
                    backgroundColor: colors.background.DEFAULT,
                    borderColor: colors.border.DEFAULT,
                  }}
                  className="flex-row items-center px-4 py-3 rounded-2xl border"
                >
                  <StackIcon size={20} color={colors.text.secondary} />
                  <TextInput
                    placeholder="0"
                    placeholderTextColor={colors.text.placeholder}
                    value={stock}
                    onChangeText={setStock}
                    keyboardType="number-pad"
                    style={{ color: colors.text.primary }}
                    className="flex-1 ml-3 text-sm font-bold"
                  />
                </View>
              </View>

              {/* 5. Precio Unitario */}
              <View className="flex-1">
                <Text
                  style={{ color: colors.text.secondary }}
                  className="text-xs font-semibold mb-1.5 uppercase tracking-wider"
                >
                  Precio Unitario ($) *
                </Text>
                <View
                  style={{
                    backgroundColor: colors.background.DEFAULT,
                    borderColor: colors.border.DEFAULT,
                  }}
                  className="flex-row items-center px-4 py-3 rounded-2xl border"
                >
                  <CurrencyDollar size={20} color={colors.text.secondary} />
                  <TextInput
                    placeholder="0.00"
                    placeholderTextColor={colors.text.placeholder}
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="decimal-pad"
                    style={{ color: colors.text.primary }}
                    className="flex-1 ml-3 text-sm font-bold"
                  />
                </View>
              </View>
            </View>

            {/* Botón Guardar */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={loading}
              style={{ backgroundColor: colors.primary.DEFAULT }}
              activeOpacity={0.85}
              className="w-full py-4 rounded-2xl items-center justify-center flex-row gap-2 shadow-lg mb-4"
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text className="text-white font-bold text-base">
                    {initialProduct ? "Guardar Cambios" : "Registrar Mercancía"}
                  </Text>
                  <Check size={20} color="#FFFFFF" weight="bold" />
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
