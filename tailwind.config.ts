import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    container: { center: true, padding: "1.5rem", screens: { "2xl": "1400px" } },
    extend: {
      fontFamily: { sans: ["var(--font-inter)", "sans-serif"] },
      colors: {
        border: "#E2E8F0",
        input: "#CBD5E1",
        ring: "#2563EB",
        background: "#F8FAFC",
        foreground: "#0F172A",
        primary: { DEFAULT: "#2563EB", foreground: "#FFFFFF" },
        navy: "#0F172A",
        pale: "#EFF6FF",
        sky: "#38BDF8",
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
        muted: { DEFAULT: "#F1F5F9", foreground: "#64748B" },
        card: { DEFAULT: "#FFFFFF", foreground: "#0F172A" }
      },
      borderRadius: { lg: "12px", md: "10px", sm: "8px" },
      boxShadow: { panel: "0 1px 3px rgb(15 23 42 / 0.08)" }
    }
  },
  plugins: []
};

export default config;