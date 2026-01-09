/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        slatey: {
          950: "#0b0d0f",
          900: "#0f1113",
          850: "#14171a",
          800: "#1c2024",
          700: "#272b30",
          600: "#343a40",
          500: "#4b535b",
        },
        accent: {
          info: "#35D2AB",
          warn: "#D9B26D",
          error: "#E28B8B",
          success: "#5BCFA8",
        },
      },
      boxShadow: {
        panel: "0 0 0 1px rgba(31, 41, 55, 0.6)",
      },
    },
  },
  plugins: [],
};
