// CHANGE: Extend Tailwind with Plena's design tokens (colors, shadows, animations, container widths).
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      // CHANGE: Nicer reading width on larger screens
      center: true,
      padding: "0.75rem",
      screens: {
        sm: "640px",
        md: "768px",
        lg: "960px",
      },
    },
    extend: {
      // CHANGE: Plena color palette (from the design system)
      colors: {
        primary: "#2563EB", // Bright Learning Blue
        secondary: "#F59E0B", // Golden Curiosity
        success: "#10B981", // Growth Green
        danger: "#EF4444", // Alert Red
        sky: "#3B82F6", // Support Blue
        ink: "#111827", // Deep Charcoal
        mute: "#6B7280", // Cool Gray
        surface: "#F9FAFB", // Soft Background White
      },
      // CHANGE: Softer, beautiful depth
      boxShadow: {
        soft: "0 8px 24px rgba(0,0,0,0.06)",
        lift: "0 12px 28px rgba(0,0,0,0.10)",
      },
      // CHANGE: Large friendly radii
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
        pill: "9999px",
      },
      // CHANGE: Subtle motion for polish
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "hover-lift": {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(-2px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 220ms ease-out",
        "hover-lift": "hover-lift 160ms ease-out forwards",
      },
      // CHANGE: Use Inter (wired in layout.tsx) as default sans
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;


