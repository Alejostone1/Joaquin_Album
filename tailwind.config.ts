import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        salvia: { DEFAULT: "#A8C3A0", 50: "#F1F6EF", 100: "#E3EDE0", 200: "#CADCC4", 600: "#7FA176" },
        bosque: { DEFAULT: "#2F5D47", 700: "#244A38", 900: "#183025" },
        esmeralda: { DEFAULT: "#2BA36B", 100: "#D7F2E4" },
        menta: { DEFAULT: "#BDECD3", 50: "#EFFBF5" },
        sol: { DEFAULT: "#FFC93C", 600: "#F2A516", 100: "#FFF2C9" },
        vainilla: "#FFE89A",
        cielo: { DEFAULT: "#8FD3F4", 600: "#3C9BE0", 100: "#E2F2FC" },
        turquesa: { DEFAULT: "#1FB5B0", 100: "#DDF5F3" },
        coral: { DEFAULT: "#FF8A7A", 600: "#F06552", 100: "#FFE9E1" },
        melocoton: { DEFAULT: "#FFB38A", 600: "#FF9F68" },
        rosa: { DEFAULT: "#FFB7CF", 600: "#E86A9A", 100: "#FFE6EF" },
        crema: "#FFF6E6",
        papel: "#FFFCF5",
        tinta: { DEFAULT: "#21372B", soft: "#4A5F52", mute: "#6E8075" },
      },
      fontFamily: {
        display: ['"Fredoka Variable"', "Fredoka", "ui-rounded", "system-ui", "sans-serif"],
        heading: ['"Baloo 2 Variable"', '"Baloo 2"', "ui-rounded", "system-ui", "sans-serif"],
        body: ['"Nunito Variable"', "Nunito", "system-ui", "sans-serif"],
        ui: ['"Quicksand Variable"', "Quicksand", "system-ui", "sans-serif"],
      },
      borderRadius: { blob: "42% 58% 55% 45% / 48% 42% 58% 52%" },
      boxShadow: {
        soft: "0 10px 30px -12px rgba(33,55,43,.25)",
        lift: "0 22px 50px -20px rgba(33,55,43,.35)",
        sticker: "0 0 0 3px #FFFCF5, 0 6px 0 3px rgba(33,55,43,.12)",
      },
    },
  },
  plugins: [],
} satisfies Config;
