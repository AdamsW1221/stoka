import React, { useRef, useState } from "react";
import { View, TextInput, Text, TouchableOpacity, NativeSyntheticEvent, TextInputKeyPressEventData } from "react-native";
import { colors } from "@/theme/tokens";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (otp: string) => void;
  onComplete?: (otp: string) => void;
  error?: string | null;
  onResend?: () => void;
  resendCooldown?: number; // en segundos
}

export const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  value,
  onChange,
  onComplete,
  error,
  onResend,
  resendCooldown = 60,
}) => {
  const inputsRef = useRef<Array<TextInput | null>>([]);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const digits = value.split("");

  const handleChangeText = (text: string, index: number) => {
    // Si el usuario pega un código completo (ej: 6 dígitos)
    if (text.length > 1) {
      const cleanDigits = text.replace(/[^0-9]/g, "").slice(0, length);
      onChange(cleanDigits);
      if (cleanDigits.length === length) {
        onComplete?.(cleanDigits);
        inputsRef.current[length - 1]?.focus();
      }
      return;
    }

    const cleanChar = text.replace(/[^0-9]/g, "");
    const newDigits = [...digits];
    newDigits[index] = cleanChar;
    const newOtp = newDigits.join("");
    onChange(newOtp);

    // Auto-focus al siguiente input si se escribió un dígito
    if (cleanChar && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }

    if (newOtp.length === length) {
      onComplete?.(newOtp);
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    if (e.nativeEvent.key === "Backspace") {
      if (!digits[index] && index > 0) {
        inputsRef.current[index - 1]?.focus();
        const newDigits = [...digits];
        newDigits[index - 1] = "";
        onChange(newDigits.join(""));
      }
    }
  };

  return (
    <View className="w-full items-center my-4">
      {/* Contenedor de las 6 cajas numéricas */}
      <View className="flex-row justify-between w-full max-w-[340px] px-1">
        {Array.from({ length }).map((_, index) => {
          const char = digits[index] || "";
          const isFocused = focusedIndex === index;
          const hasError = !!error;

          return (
            <TextInput
              key={index}
              ref={(ref) => {
                inputsRef.current[index] = ref;
              }}
              value={char}
              onChangeText={(text) => handleChangeText(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              onFocus={() => setFocusedIndex(index)}
              onBlur={() => setFocusedIndex(-1)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              style={{
                width: 48,
                height: 58,
                backgroundColor: colors.surface.card,
                borderRadius: 16,
                borderWidth: 2,
                borderColor: hasError
                  ? colors.status.danger
                  : isFocused
                  ? colors.primary.DEFAULT
                  : colors.border.DEFAULT,
                color: colors.text.primary,
                fontSize: 24,
                fontWeight: "700",
              }}
              selectionColor={colors.primary.DEFAULT}
            />
          );
        })}
      </View>

      {/* Mensaje de error si falló el intento */}
      {error && (
        <Text
          style={{ color: colors.status.danger }}
          className="text-xs mt-3 text-center font-medium"
        >
          {error}
        </Text>
      )}

      {/* Reenviar código */}
      {onResend && (
        <View className="flex-row items-center mt-5">
          <Text
            style={{ color: colors.text.secondary }}
            className="text-xs"
          >
            ¿No recibiste el código?{" "}
          </Text>
          <TouchableOpacity
            onPress={onResend}
            disabled={resendCooldown > 0}
            activeOpacity={0.7}
          >
            <Text
              style={{
                color: resendCooldown > 0 ? colors.text.muted : colors.primary.DEFAULT,
                fontWeight: "600",
              }}
              className="text-xs"
            >
              {resendCooldown > 0
                ? `Reenviar en ${resendCooldown}s`
                : "Reenviar código"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};
