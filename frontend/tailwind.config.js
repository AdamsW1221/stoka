/** @type {import('tailwindcss').Config} */
module.exports = {
  // Escanea todos los archivos dentro de src para aplicar clases de Tailwind
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        stoka: {
          primary: "#FF8000",
          "primary-hover": "#E67300",
          "primary-muted": "rgba(255, 128, 0, 0.15)",
          bg: "#192230",
          surface: "#2C2F38",
          "surface-hover": "#343842",
          border: "#3D474E",
          "text-primary": "#FFFFFF",
          "text-secondary": "#94A3B8",
          success: "#10B981",
          warning: "#F59E0B",
          danger: "#EF4444",
        },
      },
      borderRadius: {
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};