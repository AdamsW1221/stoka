/** @type {import('tailwindcss').Config} */
module.exports = {
  // Escanea todos los archivos dentro de src para aplicar clases de Tailwind
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
};