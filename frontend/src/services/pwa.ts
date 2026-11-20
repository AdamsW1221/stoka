import { Platform } from "react-native";

export type PwaDevicePlatform = "ios" | "android" | "desktop";

export interface PwaCapabilities {
  isWeb: boolean;
  devicePlatform: PwaDevicePlatform;
  isStandalone: boolean;
  canTriggerInstallPrompt: boolean;
  isOnline: boolean;
  hasServiceWorker: boolean;
  hasNotifications: boolean;
  hasCameraSupport: boolean;
  isSafariIos: boolean;
}

declare global {
  interface Window {
    __stokaDeferredPwaPrompt?: any;
  }
}

function detectDevicePlatform(): PwaDevicePlatform {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return "desktop";
  }

  const ua = navigator.userAgent || navigator.vendor || "";
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (isIOS) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

function detectSafariIos(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
  return isIOS && isSafari;
}

function detectStandalone(): boolean {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return true; // En app nativa ya es standalone
  }
  const navStandalone = (window.navigator as any)?.standalone === true;
  const mediaStandalone =
    typeof window.matchMedia === "function" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches);
  return navStandalone || mediaStandalone;
}

export const PwaService = {
  getCapabilities(): PwaCapabilities {
    const isWeb = Platform.OS === "web" && typeof window !== "undefined";
    const devicePlatform = detectDevicePlatform();

    if (!isWeb) {
      return {
        isWeb: false,
        devicePlatform,
        isStandalone: true,
        canTriggerInstallPrompt: false,
        isOnline: true,
        hasServiceWorker: true,
        hasNotifications: true,
        hasCameraSupport: true,
        isSafariIos: false,
      };
    }

    return {
      isWeb: true,
      devicePlatform,
      isStandalone: detectStandalone(),
      canTriggerInstallPrompt: Boolean(window.__stokaDeferredPwaPrompt),
      isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
      hasServiceWorker: typeof navigator !== "undefined" && "serviceWorker" in navigator,
      hasNotifications: typeof window !== "undefined" && "Notification" in window,
      hasCameraSupport:
        typeof navigator !== "undefined" &&
        Boolean(navigator.mediaDevices || typeof document !== "undefined"),
      isSafariIos: detectSafariIos(),
    };
  },

  /**
   * Registra el Service Worker manualmente si aún no está activo
   */
  async ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (Platform.OS !== "web" || typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return null;
    }
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      return reg;
    } catch (err) {
      console.warn("[PwaService] No se pudo registrar /sw.js:", err);
      return null;
    }
  },

  /**
   * Dispara el prompt nativo de instalación en Android / Chrome / Edge / Desktop
   */
  async triggerInstallPrompt(): Promise<"accepted" | "dismissed" | "unavailable"> {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      return "unavailable";
    }

    const promptEvent = window.__stokaDeferredPwaPrompt;
    if (!promptEvent) {
      return "unavailable";
    }

    try {
      await promptEvent.prompt();
      const choiceResult = await promptEvent.userChoice;
      if (choiceResult?.outcome === "accepted") {
        window.__stokaDeferredPwaPrompt = null;
        return "accepted";
      }
      return "dismissed";
    } catch (err) {
      console.warn("[PwaService] Error ejecutando prompt de instalación:", err);
      return "unavailable";
    }
  },

  /**
   * Comparte o copia el enlace actual de la PWA para abrirlo en iPhone (Safari) o Android
   */
  async shareOrCopyUrl(): Promise<{ method: "share" | "clipboard" | "none"; url: string }> {
    const url =
      Platform.OS === "web" && typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:8081";

    if (Platform.OS === "web" && typeof navigator !== "undefined") {
      if (typeof navigator.share === "function") {
        try {
          await navigator.share({
            title: "Stoka - Inventario Pro (PWA)",
            text: "Abre e instala la app de inventario Stoka en tu iPhone o Android:",
            url,
          });
          return { method: "share", url };
        } catch {
          // Si canceló el menú compartir, intentar copiar al portapapeles
        }
      }

      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        try {
          await navigator.clipboard.writeText(url);
          return { method: "clipboard", url };
        } catch {
          // Fallback con textarea
        }
      }

      if (typeof document !== "undefined") {
        try {
          const el = document.createElement("textarea");
          el.value = url;
          document.body.appendChild(el);
          el.select();
          document.execCommand("copy");
          document.body.removeChild(el);
          return { method: "clipboard", url };
        } catch {
          return { method: "none", url };
        }
      }
    }

    return { method: "none", url };
  },
};
