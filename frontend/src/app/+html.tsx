import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />

        <title>Stoka - Inventario Pro (iOS &amp; Android PWA)</title>
        <meta
          name="description"
          content="Gestión inteligente de inventario y control multi-tenant para iPhone (iOS) y Android."
        />

        {/* Color de tema para barra de estado de Android Chrome y Safari iOS */}
        <meta name="theme-color" content="#192230" />
        <meta name="msapplication-TileColor" content="#192230" />

        {/* Configuración crítica de PWA para iPhone / iPad (iOS Safari) */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Stoka" />
        <meta name="format-detection" content="telephone=no" />

        {/* Manifiesto Web App e Iconos */}
        <link rel="manifest" href="/manifest.json?v=2" />
        <link rel="icon" type="image/png" href="/favicon.png?v=2" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=2" />

        <ScrollViewStyleReset />

        {/* Estilos nativos para iOS Standalone y Android PWA */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root {
                background-color: #192230 !important;
                color: #FFFFFF;
                height: 100%;
                width: 100%;
                margin: 0;
                padding: 0;
                overscroll-behavior-y: none;
                -webkit-tap-highlight-color: transparent;
                -webkit-touch-callout: none;
                -webkit-font-smoothing: antialiased;
              }
              /* Respetar Safe Area en iPhone (Notch, Dynamic Island y barra inferior) en modo PWA */
              @media all and (display-mode: standalone) {
                body {
                  padding-top: env(safe-area-inset-top, 0px);
                  padding-bottom: env(safe-area-inset-bottom, 0px);
                  padding-left: env(safe-area-inset-left, 0px);
                  padding-right: env(safe-area-inset-right, 0px);
                }
              }
              /* Eliminar borde blanco (outline) del navegador al tocar cualquier input o textarea */
              input, textarea, select {
                outline: none !important;
                outline-width: 0 !important;
                outline-style: none !important;
                box-shadow: none !important;
              }
              input:focus, textarea:focus, select:focus,
              input:focus-visible, textarea:focus-visible, select:focus-visible {
                outline: none !important;
                outline-width: 0 !important;
                outline-style: none !important;
                box-shadow: none !important;
              }
              /* Evitar que Safari en iPhone haga zoom automático al enfocar inputs */
              @media screen and (max-width: 768px) {
                input, textarea, select {
                  font-size: 16px !important;
                }
              }
              /* Scrollbar discreta estilo oscuro */
              ::-webkit-scrollbar {
                width: 6px;
                height: 6px;
              }
              ::-webkit-scrollbar-track {
                background: #192230;
              }
              ::-webkit-scrollbar-thumb {
                background: #3D474E;
                border-radius: 3px;
              }
            `,
          }}
        />

        {/* Captura temprana de beforeinstallprompt y registro de Service Worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__stokaDeferredPwaPrompt = null;
              window.addEventListener('beforeinstallprompt', function(e) {
                e.preventDefault();
                window.__stokaDeferredPwaPrompt = e;
                window.dispatchEvent(new CustomEvent('stoka-pwa-prompt-ready'));
              });
              window.addEventListener('appinstalled', function() {
                window.__stokaDeferredPwaPrompt = null;
                window.dispatchEvent(new CustomEvent('stoka-pwa-installed'));
              });
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.warn('[Stoka PWA] Error registrando Service Worker:', err);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
