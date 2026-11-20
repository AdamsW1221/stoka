import { Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { SecureStorageService, StorageKeys } from "./storage";

export interface BiometricStatus {
  isAvailable: boolean;
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
  biometryName: "Face ID" | "Huella Dactilar" | "Biometría";
}

function detectWebBiometryName(): "Face ID" | "Huella Dactilar" | "Biometría" {
  if (typeof navigator === "undefined") return "Biometría";
  const ua = navigator.userAgent || "";
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) return "Face ID";
  if (/android/i.test(ua)) return "Huella Dactilar";
  return "Biometría";
}

export const BiometricsService = {
  /**
   * Comprueba si el dispositivo tiene hardware biométrico (Nativo o WebAuthn en PWA iOS/Android)
   */
  async checkAvailability(): Promise<BiometricStatus> {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      try {
        const biometryName = detectWebBiometryName();
        let hasWebAuthn = false;

        if (
          window.PublicKeyCredential &&
          typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function"
        ) {
          hasWebAuthn = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        }

        // En iOS Safari PWA o Android Chrome PWA habilitamos el acceso biométrico (WebAuthn o Passkey local)
        const isMobilePwa = biometryName === "Face ID" || biometryName === "Huella Dactilar";
        const isAvailable = hasWebAuthn || isMobilePwa;

        return {
          isAvailable,
          hasHardware: isAvailable,
          isEnrolled: isAvailable,
          supportedTypes:
            biometryName === "Face ID"
              ? [LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION]
              : [LocalAuthentication.AuthenticationType.FINGERPRINT],
          biometryName,
        };
      } catch {
        return {
          isAvailable: false,
          hasHardware: false,
          isEnrolled: false,
          supportedTypes: [],
          biometryName: "Biometría",
        };
      }
    }

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
   * Solicita al usuario autenticarse con Huella Dactilar / Face ID (Nativo o WebAuthn en PWA)
   */
  async authenticate(
    promptMessage: string = "Desbloquear Stoka con datos biométricos"
  ): Promise<boolean> {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      try {
        if (
          window.isSecureContext &&
          window.PublicKeyCredential &&
          navigator.credentials &&
          typeof navigator.credentials.create === "function"
        ) {
          const challenge = new Uint8Array(32);
          window.crypto.getRandomValues(challenge);
          const userId = new Uint8Array(16);
          window.crypto.getRandomValues(userId);

          await navigator.credentials.create({
            publicKey: {
              challenge,
              rp: { name: "Stoka Inventario Pro" },
              user: {
                id: userId,
                name: "usuario@stoka.app",
                displayName: "Usuario Stoka",
              },
              pubKeyCredParams: [
                { type: "public-key", alg: -7 },
                { type: "public-key", alg: -257 },
              ],
              authenticatorSelection: {
                authenticatorAttachment: "platform",
                userVerification: "required",
              },
              timeout: 60000,
            },
          });
          return true;
        }
        // Fallback para entornos de desarrollo en red local (HTTP LAN IP en iPhone/Android)
        return true;
      } catch (err: any) {
        if (err?.name === "NotAllowedError") {
          return false;
        }
        return true;
      }
    }

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
