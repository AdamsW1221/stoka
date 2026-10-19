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
   * Solicita permisos para notificaciones
   */
  async requestPermissions(): Promise<boolean> {
    if (isExpoGo || Platform.OS === "web" || !NotificationsModule) {
      return true; // En Expo Go se utiliza notificación in-app nativa
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
   * En Expo Go utiliza una alerta modal de alta visibilidad, y en builds de desarrollo/producción
   * dispara la notificación push local del sistema operativo.
   */
  async triggerLowStockAlert(productName: string, currentStock: number): Promise<void> {
    const title = "⚠️ Alerta de Stock Bajo - Stoka";
    const body = `El producto "${productName}" está por agotarse. Quedan solo ${currentStock} unidad(es) disponible(s).`;

    if (isExpoGo || Platform.OS === "web" || !NotificationsModule) {
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
