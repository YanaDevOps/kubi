/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        slatey: {
          950: "#0B1220",
          900: "#0F172A",
          850: "#111827",
          800: "#1F2937",
          700: "#374151",
          600: "#4B5563",
          500: "#6B7280",
        },
        accent: {
          info: "#38BDF8",
          warn: "#F59E0B",
          error: "#F87171",
          success: "#34D399",
        },
      },
      boxShadow: {
        panel: "0 0 0 1px rgba(31, 41, 55, 0.6)",
      },
    },
  },
  plugins: [],
};
