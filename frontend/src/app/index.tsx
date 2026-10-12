import React, { useState } from "react";
import { Text, View, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * Pantalla principal (HomeScreen)
 * 
 * Conceptos clave para empezar:
 * 1. <SafeAreaView>: Asegura que el contenido no quede tapado por la barra superior ni el notch del móvil.
 * 2. <View>: Es como un <div> en desarrollo web (un contenedor).
 * 3. <Text>: En React Native, TODO texto debe ir dentro de un componente <Text>.
 * 4. <TouchableOpacity>: Un botón táctil que reacciona con opacidad al pulsarlo.
 * 5. className="...": Clases de Tailwind CSS para dar estilo rápidamente.
 */
export default function HomeScreen() {
  // Estado simple en TypeScript: contador de tipo número (number)
  const [contador, setContador] = useState<number>(0);
  const [mostrar, setMostrar] = useState<boolean>(false);

  // Función para incrementar el contador
  const incrementar = (): void => {
    setContador((prev) => prev + 1);
  };



  // Función para reiniciar el contador
  const reiniciar = (): void => {
    setContador(0);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900 justify-between p-6">
      {/* Encabezado */}
      <View className="items-center mt-8">
        <View className="bg-indigo-500/20 px-4 py-1.5 rounded-full mb-3 border border-indigo-500/30">
          <Text className="text-indigo-300 font-semibold text-xs tracking-wide uppercase">
            React Native + Tailwind CSS
          </Text>
        </View>

        <Text className="text-white text-3xl font-extrabold text-center">
          ¡Hola Mundo! 👋
        </Text>
        <Text className="text-slate-400 text-center mt-2 text-base">
          Tu entorno móvil con TypeScript está listo y funcionando.
        </Text>
      </View>
      <View>
        <Text className={`text-white font-semibold transition duration-700 ${mostrar ? '-translate-x-10' : 'translate-x-10'}`}>funciona</Text>
      </View>
      <TouchableOpacity
        onPress={() => {
          setMostrar(!mostrar);
        }}
      >

        <Text className="text-white text-lg font-bold">
          Probando
        </Text>
      </TouchableOpacity>
      {/* Tarjeta interactiva del contador */}
      <View className="bg-slate-800/80 p-6 rounded-3xl border border-slate-700/60 items-center shadow-lg">
        <Text className="text-slate-400 text-sm font-medium mb-1">
          Prueba interactiva
        </Text>
        <Text className="text-white text-6xl font-black my-4">
          {contador}
        </Text>

        {/* Botón principal */}
        <TouchableOpacity
          onPress={incrementar}
          activeOpacity={0.8}
          className="w-full bg-indigo-600 active:bg-indigo-700 py-4 rounded-2xl items-center shadow-md mb-3"
        >
          <Text className="text-white font-bold text-lg">
            Presióname para contar 🚀
          </Text>
        </TouchableOpacity>

        {/* Botón secundario para reiniciar (solo visible si contador > 0) */}
        {contador > 0 && (
          <TouchableOpacity
            onPress={reiniciar}
            activeOpacity={0.7}
            className="py-2 px-4"
          >
            <Text className="text-slate-400 hover:text-slate-300 text-sm font-medium">
              Reiniciar contador
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tarjeta informativa para aprender */}

    </SafeAreaView>
  );
}
