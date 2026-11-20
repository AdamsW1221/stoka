import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * Servicio de almacenamiento seguro cifrado en hardware del dispositivo móvil (o localStorage en Web)
 * Utilizado para almacenar tokens JWT, credenciales y estado de biometría.
 */
export const StorageKeys = {
  AUTH_TOKEN: "stoka_auth_token",
  REFRESH_TOKEN: "stoka_refresh_token",
  USER_DATA: "stoka_user_data",
  TENANT_DATA: "stoka_tenant_data",
  BIOMETRIC_ENABLED: "stoka_biometric_enabled",
  BIOMETRIC_USER_EMAIL: "stoka_biometric_user_email",
  DEVICE_ID: "stoka_device_unique_id",
  SAVED_EMAIL: "stoka_saved_email",
} as const;

export const SecureStorageService = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === "web") {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.warn(`[SecureStorage] Error guardando la clave "${key}":`, error);
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === "web") {
        if (typeof window !== "undefined" && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return null;
      }
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.warn(`[SecureStorage] Error obteniendo la clave "${key}":`, error);
      return null;
    }
  },

  async deleteItem(key: string): Promise<void> {
    try {
      if (Platform.OS === "web") {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.removeItem(key);
        }
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.warn(`[SecureStorage] Error eliminando la clave "${key}":`, error);
    }
  },

  async setObject<T>(key: string, value: T): Promise<void> {
    await this.setItem(key, JSON.stringify(value));
  },

  async getObject<T>(key: string): Promise<T | null> {
    const raw = await this.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  async clearSession(): Promise<void> {
    await this.deleteItem(StorageKeys.AUTH_TOKEN);
    await this.deleteItem(StorageKeys.REFRESH_TOKEN);
    await this.deleteItem(StorageKeys.USER_DATA);
    await this.deleteItem(StorageKeys.TENANT_DATA);
  },

  /**
   * Obtiene o genera un identificador único persistente por dispositivo físico / navegador.
   * Garantiza que el inicio de sesión biométrico cree y mantenga un Tenant aislado por dispositivo.
   */
  async getOrCreateDeviceId(): Promise<string> {
    const existing = await this.getItem(StorageKeys.DEVICE_ID);
    if (existing && existing.length >= 12) {
      return existing;
    }
    const randomPart = () => Math.random().toString(36).substring(2, 10);
    const newDeviceId = `dev-${Date.now().toString(36)}-${randomPart()}-${randomPart()}`;
    await this.setItem(StorageKeys.DEVICE_ID, newDeviceId);
    return newDeviceId;
  },
};
