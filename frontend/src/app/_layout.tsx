// Importa los estilos globales de Tailwind CSS para toda la app
import "../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { configureReanimatedLogger, ReanimatedLogLevel } from "react-native-reanimated";

// Desactiva el modo estricto para evitar advertencias internas de librerías como NativeWind
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

export default function RootLayout() {
  return (
    <>
      {/* Barra de estado del dispositivo (estilo claro para fondo oscuro) */}
      <StatusBar style="light" />
      {/* Stack maneja la navegación de pantallas en Expo Router */}
      <Stack
        screenOptions={{
          headerShown: false, // Oculta la barra de título superior predeterminada
        }}
      />
    </>
  );
}
