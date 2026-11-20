import { Platform, Alert } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";

// Detectar si la aplicación se ejecuta dentro del cliente Expo Go
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let NotificationsModule: typeof import("expo-notifications") | null = null;

// En Expo Go (SDK 53+), expo-notifications no debe importarse estáticamente en Android
if (!isExpoGo && Platform.OS !== "web") {
  try {
    NotificationsModule = require("expo-notifications");
    NotificationsModule?.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (error) {
    console.warn("[NotificationsService] No se pudo cargar expo-notifications en este entorno:", error);
  }
}

export const NotificationsService = {
  /**
   * Solicita permisos para notificaciones (Nativas o Web Notifications en PWA Android/iOS 16.4+)
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      if ("Notification" in window) {
        try {
          if (Notification.permission === "granted") return true;
          if (Notification.permission !== "denied") {
            const permission = await Notification.requestPermission();
            return permission === "granted";
          }
        } catch {
          // Ignorar en navegadores que restringen requestPermission fuera de un gesto directo
        }
      }
      return true;
    }

    if (isExpoGo || !NotificationsModule) {
      return true;
    }

    try {
      const { status: existingStatus } = await NotificationsModule.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await NotificationsModule.requestPermissionsAsync();
        finalStatus = status;
      }

      return finalStatus === "granted";
    } catch (error) {
      console.warn("[NotificationsService] Error solicitando permisos:", error);
      return false;
    }
  },

  /**
   * Dispara una alerta de stock crítico (< 5 unidades).
   * En Web/PWA (iOS y Android) dispara tanto la notificación del Service Worker / navegador
   * como la alerta visual dentro de la aplicación.
   */
  async triggerLowStockAlert(productName: string, currentStock: number): Promise<void> {
    const title = "⚠️ Alerta de Stock Bajo - Stoka";
    const body = `El producto "${productName}" está por agotarse. Quedan solo ${currentStock} unidad(es) disponible(s).`;

    if (Platform.OS === "web" && typeof window !== "undefined") {
      try {
        if ("Notification" in window && Notification.permission === "granted") {
          if ("serviceWorker" in navigator) {
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg && typeof reg.showNotification === "function") {
              await reg.showNotification(title, {
                body,
                icon: "/icon-192.png",
                badge: "/icon-192.png",
                tag: `low-stock-${productName}`,
              });
            } else {
              new Notification(title, { body, icon: "/icon-192.png" });
            }
          } else {
            new Notification(title, { body, icon: "/icon-192.png" });
          }
        }
      } catch (err) {
        console.warn("[NotificationsService] Web Notification fallback:", err);
      }

      Alert.alert(title, body, [{ text: "Revisar Stock", style: "default" }]);
      return;
    }

    if (isExpoGo || !NotificationsModule) {
      Alert.alert(title, body, [{ text: "Revisar Stock", style: "default" }]);
      return;
    }

    try {
      await NotificationsModule.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { productName, currentStock },
          sound: "default",
        },
        trigger: null,
      });
    } catch (error) {
      console.warn("[NotificationsService] Error disparando notificación:", error);
      Alert.alert(title, body);
    }
  },
};
