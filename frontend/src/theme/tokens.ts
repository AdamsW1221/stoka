/**
 * Stoka Design System - Tokens oficiales de diseño
 * 
 * Paleta de colores oficial y métricas visuales para la aplicación móvil Stoka.
 */

export const colors = {
  // Color de Acento / Primario (Acciones principales, CTA, alertas de stock bajo)
  primary: {
    DEFAULT: "#FF8000",
    hover: "#E67300",
    active: "#CC6600",
    muted: "rgba(255, 128, 0, 0.15)",
    glow: "rgba(255, 128, 0, 0.35)",
  },

  // Fondo Principal (Dark slate profundo)
  background: {
    DEFAULT: "#192230",
    darker: "#121924",
    elevated: "#202B3D",
  },

  // Superficie / Tarjetas / Modales (Gris carbón oscuro)
  surface: {
    DEFAULT: "#2C2F38",
    hover: "#343842",
    active: "#3D414D",
    card: "#2C2F38",
    modal: "#262931",
  },

  // Bordes / Separadores / Estados desactivados
  border: {
    DEFAULT: "#3D474E",
    light: "#4E5A63",
    subtle: "rgba(61, 71, 78, 0.5)",
  },

  // Textos y Contenido
  text: {
    primary: "#FFFFFF",
    primaryAlt: "#F8FAFC",
    secondary: "#94A3B8",
    muted: "#64748B",
    placeholder: "#64748B",
  },

  // Estados del Sistema
  status: {
    success: "#10B981",
    successMuted: "rgba(16, 185, 129, 0.15)",
    warning: "#F59E0B",
    warningMuted: "rgba(245, 158, 11, 0.15)",
    danger: "#EF4444",
    dangerMuted: "rgba(239, 68, 68, 0.15)",
    lowStock: "#FF8000", // Stock < 5 usa el acento oficial
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24, // rounded-2xl estándar en Stoka
  full: 9999,
} as const;

export const typography = {
  fontSizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 30,
    "4xl": 36,
  },
} as const;

export type Colors = typeof colors;
export type Spacing = typeof spacing;
export type Radius = typeof radius;
export type Typography = typeof typography;

export default {
  colors,
  spacing,
  radius,
  typography,
};
