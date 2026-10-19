import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { ApiClient } from "./apiClient";

WebBrowser.maybeCompleteAuthSession();

export const GOOGLE_CLIENT_ID = "957967377042-43prhumdo6iquul8ir79r1h5h40earl9.apps.googleusercontent.com";

declare global {
  interface Window {
    google?: any;
  }
}

/**
 * Carga el script oficial de Google Identity Services (GSI) en Web
 */
export function loadGoogleGsiScript(): Promise<void> {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      return resolve();
    }

    const existing = document.getElementById("google-gsi-client");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }

    const script = document.createElement("script");
    script.id = "google-gsi-client";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo cargar Google Identity Services"));
    document.body.appendChild(script);
  });
}

/**
 * Renderiza el botón oficial de Google en un contenedor DOM (para Web)
 * con callback automático que envía el idToken al backend de Stoka.
 */
export function initGoogleWebButton(
  containerId: string,
  onSuccess: (res: { token: string; user: any; tenant: any }) => void,
  onError: (err: any) => void
): void {
  if (Platform.OS !== "web" || typeof window === "undefined") return;

  loadGoogleGsiScript()
    .then(() => {
      if (!window.google?.accounts?.id) return;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response: { credential: string }) => {
          try {
            if (!response.credential) {
              throw new Error("No se recibió credencial de Google.");
            }
            const res = await ApiClient.auth.googleLogin(response.credential);
            onSuccess(res);
          } catch (err) {
            onError(err);
          }
        },
        auto_select: false,
      });

      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = "";
        window.google.accounts.id.renderButton(container, {
          type: "standard",
          size: "large",
          width: 360,
        });
      }
    })
    .catch((err) => console.warn("[GoogleAuth] Error cargando Google GSI:", err));
}

/**
 * Servicio unificado de Autenticación con Google (Web + Móvil)
 */
export const GoogleAuthService = {
  /**
   * Inicia sesión con Google en plataformas móviles (Expo Go / Android / iOS)
   */
  async signInOnNative(): Promise<{ token: string; user: any; tenant: any }> {
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: "frontend",
    });

    const request = new AuthSession.AuthRequest({
      clientId: GOOGLE_CLIENT_ID,
      scopes: ["openid", "profile", "email"],
      responseType: AuthSession.ResponseType.IdToken,
      redirectUri,
      usePKCE: false,
      extraParams: {
        nonce: Math.random().toString(36).substring(2, 15),
      },
    });

    const discovery = {
      authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenEndpoint: "https://oauth2.googleapis.com/token",
      revocationEndpoint: "https://oauth2.googleapis.com/revoke",
    };

    const result = await request.promptAsync(discovery);

    if (result.type === "success" && result.params?.id_token) {
      return await ApiClient.auth.googleLogin(result.params.id_token);
    } else if (result.type === "cancel" || result.type === "dismiss") {
      throw new Error("Inicio de sesión cancelado por el usuario.");
    } else {
      const errorDetail = (result as any)?.error?.message || (result as any)?.params?.error_description || (result as any)?.params?.error;
      throw new Error(
        errorDetail
          ? `Google OAuth Error: ${errorDetail}`
          : `Error al autenticar con Google en móvil. Asegúrate de que el Redirect URI (${redirectUri}) esté autorizado en Google Cloud Console.`
      );
    }
  },

  /**
   * Dispara el flujo de inicio de sesión según la plataforma
   */
  async signIn(): Promise<{ token: string; user: any; tenant: any }> {
    if (Platform.OS === "web") {
      // En Web intentamos abrir el OneTap chooser de Google
      await loadGoogleGsiScript();
      return new Promise((resolve, reject) => {
        if (!window.google?.accounts?.id) {
          return reject(new Error("Google Identity Services no está listo. Haz clic en el botón de Google."));
        }

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response: { credential: string }) => {
            try {
              if (!response.credential) throw new Error("No se recibió credencial de Google.");
              const res = await ApiClient.auth.googleLogin(response.credential);
              resolve(res);
            } catch (err) {
              reject(err);
            }
          },
          auto_select: false,
        });

        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            reject(new Error("Selecciona tu cuenta directamente en la ventana de Google."));
          }
        });
      });
    } else {
      return await this.signInOnNative();
    }
  },
};
