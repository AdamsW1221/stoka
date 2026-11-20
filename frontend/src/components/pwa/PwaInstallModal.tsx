import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import {
  DeviceMobile,
  AppleLogo,
  AndroidLogo,
  DownloadSimple,
  Export,
  PlusSquare,
  CheckCircle,
  WifiHigh,
  WifiSlash,
  BellRinging,
  Camera,
  ShieldCheck,
  ShareNetwork,
  X,
  Sparkle,
  Browsers,
} from "phosphor-react-native";

import { colors } from "@/theme/tokens";
import { PwaService, PwaCapabilities } from "@/services/pwa";
import { NotificationsService } from "@/services/notifications";

interface PwaInstallModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({ visible, onClose }) => {
  const [capabilities, setCapabilities] = useState<PwaCapabilities>(() =>
    PwaService.getCapabilities()
  );
  const [selectedTab, setSelectedTab] = useState<"ios" | "android">("ios");
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  useEffect(() => {
    const caps = PwaService.getCapabilities();
    setCapabilities(caps);
    if (caps.devicePlatform === "android") {
      setSelectedTab("android");
    } else {
      setSelectedTab("ios");
    }

    if (Platform.OS === "web" && typeof window !== "undefined") {
      const refresh = () => setCapabilities(PwaService.getCapabilities());
      window.addEventListener("stoka-pwa-prompt-ready", refresh);
      window.addEventListener("stoka-pwa-installed", refresh);
      window.addEventListener("online", refresh);
      window.addEventListener("offline", refresh);
      return () => {
        window.removeEventListener("stoka-pwa-prompt-ready", refresh);
        window.removeEventListener("stoka-pwa-installed", refresh);
        window.removeEventListener("online", refresh);
        window.removeEventListener("offline", refresh);
      };
    }
  }, [visible]);

  const handleDirectInstall = async () => {
    const outcome = await PwaService.triggerInstallPrompt();
    if (outcome === "accepted") {
      setCapabilities(PwaService.getCapabilities());
      Alert.alert(
        "¡Stoka PWA Instalada!",
        "La aplicación se ha agregado a tu pantalla de inicio y ya puede usarse a pantalla completa."
      );
    } else if (outcome === "unavailable") {
      if (selectedTab === "ios" || capabilities.devicePlatform === "ios") {
        Alert.alert(
          "Instalación en iPhone (iOS)",
          "En iPhone/iPad, Apple requiere instalar la PWA desde Safari tocando el botón Compartir y luego 'Agregar a inicio'. Sigue los 3 pasos en pantalla."
        );
      } else {
        Alert.alert(
          "Instalar desde el navegador",
          "Abre el menú de Chrome (⋮ arriba a la derecha) y selecciona 'Instalar aplicación' o 'Agregar a la pantalla principal'."
        );
      }
    }
  };

  const handleShareUrl = async () => {
    const res = await PwaService.shareOrCopyUrl();
    if (res.method === "clipboard") {
      setCopyFeedback(`Enlace copiado: ${res.url}`);
      setTimeout(() => setCopyFeedback(null), 4000);
    } else if (res.method === "share") {
      setCopyFeedback("Menú de compartir abierto");
      setTimeout(() => setCopyFeedback(null), 3000);
    } else {
      Alert.alert("URL de la PWA", `Abre esta dirección en Safari (iPhone) o Chrome (Android):\n\n${res.url}`);
    }
  };

  const handleTestNotification = async () => {
    await NotificationsService.requestPermissions();
    await NotificationsService.triggerLowStockAlert("Aceite Sintético 5W-30 (Prueba PWA)", 2);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/80">
        <View
          style={{
            backgroundColor: colors.surface.modal,
            borderColor: colors.border.DEFAULT,
          }}
          className="rounded-t-3xl border-t p-6 max-h-[92%]"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between pb-4 border-b border-[#3D474E]/60 mb-4">
            <View className="flex-row items-center gap-2.5 flex-1">
              <View
                style={{ backgroundColor: colors.primary.muted }}
                className="w-10 h-10 rounded-xl items-center justify-center border border-[#FF8000]/40"
              >
                <DeviceMobile size={22} color={colors.primary.DEFAULT} weight="duotone" />
              </View>
              <View className="flex-1">
                <Text style={{ color: colors.text.primary }} className="text-lg font-black">
                  Centro PWA (iPhone &amp; Android)
                </Text>
                <Text style={{ color: colors.text.secondary }} className="text-xs">
                  App Web Progresiva multiplataforma sin necesidad de Mac
                </Text>
              </View>
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
            {/* Estado Actual del Dispositivo */}
            <View
              style={{
                backgroundColor: colors.surface.card,
                borderColor: capabilities.isStandalone
                  ? colors.status.success
                  : colors.primary.DEFAULT,
              }}
              className="p-4 rounded-2xl border mb-4"
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-2">
                  {capabilities.isStandalone ? (
                    <CheckCircle size={20} color={colors.status.success} weight="fill" />
                  ) : (
                    <Sparkle size={20} color={colors.primary.DEFAULT} weight="fill" />
                  )}
                  <Text style={{ color: colors.text.primary }} className="text-sm font-bold">
                    {capabilities.isStandalone
                      ? "App Instalada • Modo Standalone Activo"
                      : "Ejecutando en Navegador Web"}
                  </Text>
                </View>

                <View
                  style={{
                    backgroundColor: capabilities.isOnline
                      ? colors.status.successMuted
                      : colors.status.dangerMuted,
                  }}
                  className="px-2.5 py-1 rounded-full flex-row items-center gap-1"
                >
                  {capabilities.isOnline ? (
                    <WifiHigh size={13} color={colors.status.success} weight="bold" />
                  ) : (
                    <WifiSlash size={13} color={colors.status.danger} weight="bold" />
                  )}
                  <Text
                    style={{
                      color: capabilities.isOnline
                        ? colors.status.success
                        : colors.status.danger,
                    }}
                    className="text-[10px] font-bold uppercase"
                  >
                    {capabilities.isOnline ? "Online" : "Offline"}
                  </Text>
                </View>
              </View>

              <Text style={{ color: colors.text.secondary }} className="text-xs leading-4">
                {capabilities.isStandalone
                  ? "Stoka se está ejecutando como aplicación instalada a pantalla completa con caché offline, cámara y notificaciones habilitadas."
                  : "Instala Stoka en la pantalla de inicio de tu iPhone o Android para usarla a pantalla completa como una app nativa, sin barras del navegador."}
              </Text>
            </View>

            {/* Selector de Plataforma: iPhone (iOS) vs Android */}
            <Text
              style={{ color: colors.text.secondary }}
              className="text-xs font-bold uppercase tracking-wider mb-2"
            >
              Selecciona el dispositivo a instalar
            </Text>
            <View
              style={{
                backgroundColor: colors.surface.DEFAULT,
                borderColor: colors.border.DEFAULT,
              }}
              className="flex-row p-1 rounded-2xl border mb-4"
            >
              <TouchableOpacity
                onPress={() => setSelectedTab("ios")}
                style={{
                  backgroundColor: selectedTab === "ios" ? colors.primary.DEFAULT : "transparent",
                }}
                className="flex-1 py-3 rounded-xl flex-row items-center justify-center gap-2"
              >
                <AppleLogo
                  size={18}
                  color={selectedTab === "ios" ? "#FFFFFF" : colors.text.secondary}
                  weight="fill"
                />
                <Text
                  style={{
                    color: selectedTab === "ios" ? "#FFFFFF" : colors.text.secondary,
                    fontWeight: selectedTab === "ios" ? "700" : "500",
                  }}
                  className="text-xs"
                >
                  iPhone / iPad (iOS)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSelectedTab("android")}
                style={{
                  backgroundColor:
                    selectedTab === "android" ? colors.primary.DEFAULT : "transparent",
                }}
                className="flex-1 py-3 rounded-xl flex-row items-center justify-center gap-2"
              >
                <AndroidLogo
                  size={18}
                  color={selectedTab === "android" ? "#FFFFFF" : colors.text.secondary}
                  weight="fill"
                />
                <Text
                  style={{
                    color: selectedTab === "android" ? "#FFFFFF" : colors.text.secondary,
                    fontWeight: selectedTab === "android" ? "700" : "500",
                  }}
                  className="text-xs"
                >
                  Android (Chrome)
                </Text>
              </TouchableOpacity>
            </View>

            {/* ============================================================== */}
            {/* CONTENIDO PESTAÑA: iPHONE / iOS */}
            {/* ============================================================== */}
            {selectedTab === "ios" && (
              <View
                style={{
                  backgroundColor: colors.surface.card,
                  borderColor: colors.border.DEFAULT,
                }}
                className="p-4 rounded-2xl border mb-4"
              >
                <View className="flex-row items-center gap-2 mb-3">
                  <AppleLogo size={20} color={colors.primary.DEFAULT} weight="fill" />
                  <Text style={{ color: colors.text.primary }} className="text-sm font-bold">
                    Cómo instalar Stoka en iPhone (iOS Safari)
                  </Text>
                </View>

                {/* Paso 1 */}
                <View className="flex-row items-start gap-3 mb-3.5">
                  <View
                    style={{ backgroundColor: colors.primary.muted }}
                    className="w-7 h-7 rounded-full items-center justify-center mt-0.5"
                  >
                    <Text style={{ color: colors.primary.DEFAULT }} className="text-xs font-black">
                      1
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text style={{ color: colors.text.primary }} className="text-xs font-bold">
                      Abre este enlace en Safari en el iPhone
                    </Text>
                    <Text style={{ color: colors.text.secondary }} className="text-xs mt-0.5">
                      Asegúrate de que el iPhone esté en la misma red Wi-Fi (o usa el dominio desplegado) y ábrelo en el navegador Safari.
                    </Text>
                  </View>
                </View>

                {/* Paso 2 */}
                <View className="flex-row items-start gap-3 mb-3.5">
                  <View
                    style={{ backgroundColor: colors.primary.muted }}
                    className="w-7 h-7 rounded-full items-center justify-center mt-0.5"
                  >
                    <Text style={{ color: colors.primary.DEFAULT }} className="text-xs font-black">
                      2
                    </Text>
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-1.5 flex-wrap">
                      <Text style={{ color: colors.text.primary }} className="text-xs font-bold">
                        Toca el botón Compartir de Safari
                      </Text>
                      <View
                        style={{ backgroundColor: colors.background.DEFAULT }}
                        className="px-2 py-0.5 rounded-md flex-row items-center gap-1 border border-[#3D474E]"
                      >
                        <Export size={13} color={colors.primary.DEFAULT} weight="bold" />
                        <Text style={{ color: colors.primary.DEFAULT }} className="text-[10px] font-bold">
                          Compartir
                        </Text>
                      </View>
                    </View>
                    <Text style={{ color: colors.text.secondary }} className="text-xs mt-0.5">
                      Se encuentra en la barra inferior de Safari (ícono de cuadrado con una flecha hacia arriba).
                    </Text>
                  </View>
                </View>

                {/* Paso 3 */}
                <View className="flex-row items-start gap-3 mb-2">
                  <View
                    style={{ backgroundColor: colors.primary.muted }}
                    className="w-7 h-7 rounded-full items-center justify-center mt-0.5"
                  >
                    <Text style={{ color: colors.primary.DEFAULT }} className="text-xs font-black">
                      3
                    </Text>
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-1.5 flex-wrap">
                      <Text style={{ color: colors.text.primary }} className="text-xs font-bold">
                        Selecciona &quot;Agregar a inicio&quot;
                      </Text>
                      <View
                        style={{ backgroundColor: colors.background.DEFAULT }}
                        className="px-2 py-0.5 rounded-md flex-row items-center gap-1 border border-[#3D474E]"
                      >
                        <PlusSquare size={13} color={colors.status.success} weight="bold" />
                        <Text style={{ color: colors.status.success }} className="text-[10px] font-bold">
                          Agregar a inicio
                        </Text>
                      </View>
                    </View>
                    <Text style={{ color: colors.text.secondary }} className="text-xs mt-0.5">
                      Confirma tocando &quot;Agregar&quot; arriba a la derecha. Stoka quedará instalada en el iPhone con su ícono propio, cámara, Face ID y pantalla completa.
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* ============================================================== */}
            {/* CONTENIDO PESTAÑA: ANDROID */}
            {/* ============================================================== */}
            {selectedTab === "android" && (
              <View
                style={{
                  backgroundColor: colors.surface.card,
                  borderColor: colors.border.DEFAULT,
                }}
                className="p-4 rounded-2xl border mb-4"
              >
                <View className="flex-row items-center gap-2 mb-3">
                  <AndroidLogo size={20} color={colors.status.success} weight="fill" />
                  <Text style={{ color: colors.text.primary }} className="text-sm font-bold">
                    Instalación Rápida en Android (Chrome / Edge)
                  </Text>
                </View>

                <Text style={{ color: colors.text.secondary }} className="text-xs leading-4 mb-4">
                  En Android puedes instalar Stoka directamente como una APK/PWA con un solo toque o desde el menú de Google Chrome (&quot;Instalar aplicación&quot;).
                </Text>

                <TouchableOpacity
                  onPress={handleDirectInstall}
                  style={{ backgroundColor: colors.primary.DEFAULT }}
                  activeOpacity={0.85}
                  className="w-full py-3.5 rounded-xl flex-row items-center justify-center gap-2 shadow-md"
                >
                  <DownloadSimple size={18} color="#FFFFFF" weight="bold" />
                  <Text className="text-white font-bold text-xs">
                    {capabilities.canTriggerInstallPrompt
                      ? "Instalar App Stoka Ahora (1 Toque)"
                      : "Instalar App en Pantalla de Inicio"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Botones de Acción Rápida: Compartir Enlace y Probar Notificación */}
            <View className="flex-row gap-2.5 mb-4">
              <TouchableOpacity
                onPress={handleShareUrl}
                style={{
                  backgroundColor: colors.surface.card,
                  borderColor: colors.border.DEFAULT,
                }}
                activeOpacity={0.8}
                className="flex-1 py-3 px-3 rounded-xl border flex-row items-center justify-center gap-2"
              >
                <ShareNetwork size={16} color={colors.primary.DEFAULT} weight="bold" />
                <Text style={{ color: colors.text.primary }} className="text-xs font-bold">
                  Compartir Enlace PWA
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleTestNotification}
                style={{
                  backgroundColor: colors.surface.card,
                  borderColor: colors.border.DEFAULT,
                }}
                activeOpacity={0.8}
                className="flex-1 py-3 px-3 rounded-xl border flex-row items-center justify-center gap-2"
              >
                <BellRinging size={16} color={colors.primary.DEFAULT} weight="bold" />
                <Text style={{ color: colors.text.primary }} className="text-xs font-bold">
                  Probar Alerta PWA
                </Text>
              </TouchableOpacity>
            </View>

            {copyFeedback && (
              <View
                style={{
                  backgroundColor: colors.status.successMuted,
                  borderColor: colors.status.success,
                }}
                className="p-2.5 rounded-xl border mb-4 items-center"
              >
                <Text style={{ color: colors.status.success }} className="text-xs font-bold">
                  {copyFeedback}
                </Text>
              </View>
            )}

            {/* Diagnóstico de Capacidades Activas en el Dispositivo */}
            <View
              style={{
                backgroundColor: colors.surface.card,
                borderColor: colors.border.DEFAULT,
              }}
              className="p-4 rounded-2xl border mb-4"
            >
              <Text
                style={{ color: colors.text.secondary }}
                className="text-xs font-bold uppercase tracking-wider mb-3"
              >
                Capacidades Compatibles (iOS &amp; Android PWA)
              </Text>

              <View className="gap-2.5">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <Browsers size={16} color={colors.primary.DEFAULT} />
                    <Text style={{ color: colors.text.primary }} className="text-xs">
                      Pantalla Completa &amp; Safe Area (iPhone Notch)
                    </Text>
                  </View>
                  <Text style={{ color: colors.status.success }} className="text-xs font-bold">
                    Activo
                  </Text>
                </View>

                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <Camera size={16} color={colors.primary.DEFAULT} />
                    <Text style={{ color: colors.text.primary }} className="text-xs">
                      Cámara y Galería HTML5 (Compresión Base64)
                    </Text>
                  </View>
                  <Text style={{ color: colors.status.success }} className="text-xs font-bold">
                    Activo
                  </Text>
                </View>

                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <ShieldCheck size={16} color={colors.primary.DEFAULT} />
                    <Text style={{ color: colors.text.primary }} className="text-xs">
                      Service Worker &amp; Modo Offline / Demo
                    </Text>
                  </View>
                  <Text style={{ color: colors.status.success }} className="text-xs font-bold">
                    {capabilities.hasServiceWorker ? "Activo" : "Soportado"}
                  </Text>
                </View>

                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <BellRinging size={16} color={colors.primary.DEFAULT} />
                    <Text style={{ color: colors.text.primary }} className="text-xs">
                      Alertas de Stock Crítico (&lt; 5 unid.)
                    </Text>
                  </View>
                  <Text style={{ color: colors.status.success }} className="text-xs font-bold">
                    Activo
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

interface PwaInstallBannerProps {
  onOpenModal: () => void;
}

export const PwaInstallBanner: React.FC<PwaInstallBannerProps> = ({ onOpenModal }) => {
  const [capabilities, setCapabilities] = useState<PwaCapabilities>(() =>
    PwaService.getCapabilities()
  );

  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const refresh = () => setCapabilities(PwaService.getCapabilities());
      window.addEventListener("stoka-pwa-prompt-ready", refresh);
      window.addEventListener("stoka-pwa-installed", refresh);
      return () => {
        window.removeEventListener("stoka-pwa-prompt-ready", refresh);
        window.removeEventListener("stoka-pwa-installed", refresh);
      };
    }
  }, []);

  return (
    <TouchableOpacity
      onPress={onOpenModal}
      activeOpacity={0.85}
      style={{
        backgroundColor: colors.surface.card,
        borderColor: colors.primary.DEFAULT,
      }}
      className="w-full p-3.5 rounded-2xl border mb-5 flex-row items-center justify-between shadow-md"
    >
      <View className="flex-row items-center gap-3 flex-1 pr-2">
        <View
          style={{ backgroundColor: colors.primary.muted }}
          className="w-10 h-10 rounded-xl items-center justify-center border border-[#FF8000]/40"
        >
          <View className="flex-row items-center">
            <AppleLogo size={16} color={colors.primary.DEFAULT} weight="fill" />
            <AndroidLogo size={16} color={colors.status.success} weight="fill" />
          </View>
        </View>

        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text style={{ color: colors.text.primary }} className="text-xs font-black">
              {capabilities.isStandalone
                ? "Stoka PWA Activa (iOS & Android)"
                : "Instalar App en iPhone (iOS) o Android"}
            </Text>
          </View>
          <Text style={{ color: colors.text.secondary }} className="text-[11px] mt-0.5">
            {capabilities.isStandalone
              ? "Ejecutando como aplicación instalada a pantalla completa"
              : "Toca aquí para instalar la PWA sin App Store ni entorno Mac"}
          </Text>
        </View>
      </View>

      <View
        style={{ backgroundColor: colors.primary.DEFAULT }}
        className="px-3 py-1.5 rounded-xl flex-row items-center gap-1"
      >
        <DownloadSimple size={14} color="#FFFFFF" weight="bold" />
        <Text className="text-white text-[11px] font-bold">PWA</Text>
      </View>
    </TouchableOpacity>
  );
};
