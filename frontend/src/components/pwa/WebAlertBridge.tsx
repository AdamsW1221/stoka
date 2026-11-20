import React, { useState, useEffect } from "react";
import { Modal, View, Text, TouchableOpacity, Platform, Alert, AlertButton } from "react-native";
import { ShieldCheck, WarningCircle } from "phosphor-react-native";
import { colors } from "@/theme/tokens";

interface AlertPayload {
  title: string;
  message?: string;
  buttons?: AlertButton[];
}

/**
 * En react-native-web, Alert.alert() es una función vacía (no-op).
 * Este componente intercepta todas las llamadas a Alert.alert() en Web / PWA (iPhone Safari y Android Chrome)
 * y renderiza un modal nativo con el diseño oscuro de Stoka y soporte completo de botones y callbacks.
 */
export const WebAlertBridge: React.FC = () => {
  const [queue, setQueue] = useState<AlertPayload[]>([]);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const customAlert = (title: string, message?: string, buttons?: AlertButton[]) => {
      setQueue((prev) => [...prev, { title, message, buttons }]);
    };

    try {
      (Alert as any).alert = customAlert;
    } catch (err) {
      console.warn("[WebAlertBridge] No se pudo asignar Alert.alert:", err);
    }
  }, []);

  if (Platform.OS !== "web" || queue.length === 0) {
    return null;
  }

  const current = queue[0];
  const buttons: AlertButton[] =
    current.buttons && current.buttons.length > 0
      ? current.buttons
      : [{ text: "Entendido", style: "default" }];

  const handlePress = (btn: AlertButton) => {
    setQueue((prev) => prev.slice(1));
    if (btn.onPress) {
      setTimeout(() => {
        btn.onPress?.();
      }, 50);
    }
  };

  const isWarningOrDanger =
    current.title.toLowerCase().includes("alerta") ||
    current.title.toLowerCase().includes("eliminar") ||
    current.title.toLowerCase().includes("error") ||
    buttons.some((b) => b.style === "destructive");

  return (
    <Modal visible={true} transparent animationType="fade">
      <View className="flex-1 bg-black/75 items-center justify-center px-6">
        <View
          style={{
            backgroundColor: colors.surface.modal,
            borderColor: isWarningOrDanger ? colors.primary.DEFAULT : colors.border.DEFAULT,
          }}
          className="w-full max-w-[380px] rounded-2xl border p-6 shadow-2xl"
        >
          <View className="flex-row items-center gap-3 mb-3">
            <View
              style={{
                backgroundColor: isWarningOrDanger
                  ? colors.primary.muted
                  : colors.status.successMuted,
              }}
              className="w-10 h-10 rounded-xl items-center justify-center"
            >
              {isWarningOrDanger ? (
                <WarningCircle size={22} color={colors.primary.DEFAULT} weight="duotone" />
              ) : (
                <ShieldCheck size={22} color={colors.status.success} weight="duotone" />
              )}
            </View>
            <Text
              style={{ color: colors.text.primary }}
              className="text-base font-black flex-1"
            >
              {current.title}
            </Text>
          </View>

          {current.message ? (
            <Text
              style={{ color: colors.text.secondary }}
              className="text-sm leading-5 mb-6"
            >
              {current.message}
            </Text>
          ) : null}

          <View className={buttons.length > 2 ? "gap-2" : "flex-row gap-2.5 justify-end"}>
            {buttons.map((btn, idx) => {
              const isDestructive = btn.style === "destructive";
              const isCancel = btn.style === "cancel";

              let bgColor: string = colors.primary.DEFAULT;
              let textColor: string = "#FFFFFF";
              let borderColor: string = colors.primary.DEFAULT;

              if (isDestructive) {
                bgColor = colors.status.danger;
                borderColor = colors.status.danger;
              } else if (isCancel) {
                bgColor = colors.surface.DEFAULT;
                textColor = colors.text.secondary;
                borderColor = colors.border.DEFAULT;
              }

              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handlePress(btn)}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: bgColor,
                    borderColor,
                  }}
                  className="px-4 py-3 rounded-xl border items-center justify-center flex-1"
                >
                  <Text style={{ color: textColor }} className="text-xs font-bold text-center">
                    {btn.text || "Aceptar"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};
