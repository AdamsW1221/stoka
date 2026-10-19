import * as LocalAuthentication from "expo-local-authentication";
import { SecureStorageService, StorageKeys } from "./storage";

export interface BiometricStatus {
  isAvailable: boolean;
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
  biometryName: "Face ID" | "Huella Dactilar" | "Biometría";
}

export const BiometricsService = {
  /**
   * Comprueba si el dispositivo tiene hardware biométrico y si el usuario tiene huella/rostro configurado
   */
  async checkAvailability(): Promise<BiometricStatus> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      let biometryName: "Face ID" | "Huella Dactilar" | "Biometría" = "Biometría";
      if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        biometryName = "Face ID";
      } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        biometryName = "Huella Dactilar";
      }

      return {
        isAvailable: hasHardware && isEnrolled,
        hasHardware,
        isEnrolled,
        supportedTypes,
        biometryName,
      };
    } catch (error) {
      console.warn("[BiometricsService] Error verificando disponibilidad biométrica:", error);
      return {
        isAvailable: false,
        hasHardware: false,
        isEnrolled: false,
        supportedTypes: [],
        biometryName: "Biometría",
      };
    }
  },

  /**
   * Solicita al usuario autenticarse con Huella Dactilar / Face ID
   */
  async authenticate(promptMessage: string = "Desbloquear Stoka con datos biométricos"): Promise<boolean> {
    try {
      const { isAvailable } = await this.checkAvailability();
      if (!isAvailable) {
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: "Cancelar",
        fallbackLabel: "Usar contraseña",
        disableDeviceFallback: false,
      });

      return result.success;
    } catch (error) {
      console.warn("[BiometricsService] Error durante la autenticación biométrica:", error);
      return false;
    }
  },

  /**
   * Guarda la preferencia del usuario sobre si desea usar biometría
   */
  async setBiometricEnabled(enabled: boolean): Promise<void> {
    await SecureStorageService.setItem(StorageKeys.BIOMETRIC_ENABLED, enabled ? "true" : "false");
  },

  /**
   * Consulta si el usuario activó la biometría en la app
   */
  async isBiometricEnabled(): Promise<boolean> {
    const value = await SecureStorageService.getItem(StorageKeys.BIOMETRIC_ENABLED);
    return value === "true";
  },
};
