// Importa los estilos globales de Tailwind CSS para toda la app
import "../global.css";

import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { configureReanimatedLogger, ReanimatedLogLevel } from "react-native-reanimated";
import { WebAlertBridge } from "@/components/pwa/WebAlertBridge";
import { PwaService } from "@/services/pwa";

// Desactiva el modo estricto para evitar advertencias internas de librerías como NativeWind
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

export default function RootLayout() {
  useEffect(() => {
    PwaService.ensureServiceWorker();
  }, []);

  return (
    <>
      {/* Barra de estado del dispositivo (estilo claro para fondo oscuro) */}
      <StatusBar style="light" />
      {/* Puente de alertas modales nativas para Web / PWA (iOS Safari y Android Chrome) */}
      <WebAlertBridge />
      {/* Stack maneja la navegación de pantallas en Expo Router */}
      <Stack
        screenOptions={{
          headerShown: false, // Oculta la barra de título superior predeterminada
          title: "Stoka - Inventario Pro",
        }}
      />
    </>
  );
}
