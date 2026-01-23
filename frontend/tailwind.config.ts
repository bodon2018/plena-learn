import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "0.75rem",
      screens: {
        sm: "640px",
        md: "768px",
        lg: "960px",
      },
    },
    extend: {
      /* =====================================================
         COLOR PALETTE
         Semantic colors for consistent UI communication
         ===================================================== */
      colors: {
        primary: "#2563EB",    // Bright Learning Blue
        secondary: "#F59E0B",  // Golden Curiosity
        success: "#10B981",    // Growth Green
        danger: "#EF4444",     // Alert Red
        sky: "#3B82F6",        // Support Blue
        ink: "#111827",        // Deep Charcoal - primary text
        mute: "#6B7280",       // Cool Gray - secondary text
        subtle: "#9CA3AF",     // Lighter gray - tertiary text, placeholders
        surface: "#F9FAFB",    // Soft Background White
        
        // Extended neutral palette for layering
        neutral: {
          50: "#F9FAFB",
          100: "#F3F4F6",
          200: "#E5E7EB",
          300: "#D1D5DB",
          400: "#9CA3AF",
          500: "#6B7280",
          600: "#4B5563",
          700: "#374151",
          800: "#1F2937",
          900: "#111827",
          950: "#030712",
        },
      },

      /* =====================================================
         TYPOGRAPHY SYSTEM
         Apple-inspired type scale with clear hierarchy
         
         Philosophy:
         - Large, bold titles that command attention
         - Clear size steps between hierarchy levels
         - Tighter letter-spacing on large text
         - Looser letter-spacing on small text
         - Consistent line heights for readability
         ===================================================== */
      fontSize: {
        // Display - Hero headlines, splash screens
        // Use sparingly, maximum 1 per screen
        "display-xl": [
          "3.5rem",      // 56px
          {
            lineHeight: "1.1",
            letterSpacing: "-0.025em",
            fontWeight: "700",
          },
        ],
        "display": [
          "2.75rem",     // 44px
          {
            lineHeight: "1.15",
            letterSpacing: "-0.025em",
            fontWeight: "700",
          },
        ],

        // Headings - Page titles, section headers
        "heading-1": [
          "2rem",        // 32px
          {
            lineHeight: "1.2",
            letterSpacing: "-0.02em",
            fontWeight: "700",
          },
        ],
        "heading-2": [
          "1.5rem",      // 24px
          {
            lineHeight: "1.25",
            letterSpacing: "-0.015em",
            fontWeight: "600",
          },
        ],
        "heading-3": [
          "1.25rem",     // 20px
          {
            lineHeight: "1.3",
            letterSpacing: "-0.01em",
            fontWeight: "600",
          },
        ],

        // Body - Main content text
        "body-lg": [
          "1.125rem",    // 18px
          {
            lineHeight: "1.6",
            letterSpacing: "0",
            fontWeight: "400",
          },
        ],
        "body": [
          "1rem",        // 16px
          {
            lineHeight: "1.6",
            letterSpacing: "0",
            fontWeight: "400",
          },
        ],
        "body-sm": [
          "0.875rem",    // 14px
          {
            lineHeight: "1.5",
            letterSpacing: "0.005em",
            fontWeight: "400",
          },
        ],

        // UI - Buttons, labels, navigation
        "ui": [
          "0.875rem",    // 14px
          {
            lineHeight: "1.25",
            letterSpacing: "0.01em",
            fontWeight: "500",
          },
        ],
        "ui-sm": [
          "0.8125rem",   // 13px
          {
            lineHeight: "1.25",
            letterSpacing: "0.01em",
            fontWeight: "500",
          },
        ],

        // Caption - Supporting text, timestamps, metadata
        "caption": [
          "0.75rem",     // 12px
          {
            lineHeight: "1.4",
            letterSpacing: "0.02em",
            fontWeight: "400",
          },
        ],
        "caption-sm": [
          "0.6875rem",   // 11px
          {
            lineHeight: "1.4",
            letterSpacing: "0.025em",
            fontWeight: "500",
          },
        ],

        // Overline - Labels above content, category tags
        "overline": [
          "0.6875rem",   // 11px
          {
            lineHeight: "1.25",
            letterSpacing: "0.1em",
            fontWeight: "600",
          },
        ],
      },

      /* =====================================================
         SHADOWS
         Soft, layered depth for Apple-like elevation
         ===================================================== */
      boxShadow: {
        // Subtle resting state
        soft: "0 2px 8px rgba(0, 0, 0, 0.04), 0 4px 16px rgba(0, 0, 0, 0.04)",
        // Elevated/hover state
        lift: "0 4px 12px rgba(0, 0, 0, 0.06), 0 8px 24px rgba(0, 0, 0, 0.08)",
        // Prominent elements like modals
        elevated: "0 8px 24px rgba(0, 0, 0, 0.08), 0 16px 48px rgba(0, 0, 0, 0.12)",
        // Inner shadow for pressed states
        inner: "inset 0 2px 4px rgba(0, 0, 0, 0.06)",
      },

      /* =====================================================
         BORDER RADIUS
         Generous, friendly corners
         ===================================================== */
      borderRadius: {
        "xl": "1rem",      // 16px
        "2xl": "1.25rem",  // 20px
        "3xl": "1.5rem",   // 24px
        "4xl": "2rem",     // 32px
        "pill": "9999px",
      },

      /* =====================================================
         ANIMATIONS
         Subtle, purposeful motion
         ===================================================== */
      keyframes: {
        "fade-up": {
          "0%": { 
            opacity: "0", 
            transform: "translateY(8px)" 
          },
          "100%": { 
            opacity: "1", 
            transform: "translateY(0)" 
          },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { 
            opacity: "0", 
            transform: "scale(0.95)" 
          },
          "100%": { 
            opacity: "1", 
            transform: "scale(1)" 
          },
        },
        "slide-in-right": {
          "0%": { 
            opacity: "0", 
            transform: "translateX(16px)" 
          },
          "100%": { 
            opacity: "1", 
            transform: "translateX(0)" 
          },
        },
      },
      animation: {
        "fade-up": "fade-up 300ms ease-out",
        "fade-in": "fade-in 200ms ease-out",
        "scale-in": "scale-in 200ms ease-out",
        "slide-in-right": "slide-in-right 300ms ease-out",
      },

      /* =====================================================
         TRANSITIONS
         Consistent timing for interactive elements
         ===================================================== */
      transitionDuration: {
        "fast": "150ms",
        "normal": "200ms",
        "slow": "300ms",
      },
      transitionTimingFunction: {
        "apple": "cubic-bezier(0.25, 0.1, 0.25, 1)",      // Apple's default easing
        "apple-bounce": "cubic-bezier(0.34, 1.56, 0.64, 1)", // Slight overshoot
      },

      /* =====================================================
         FONT FAMILY
         Inter as the primary sans-serif
         ===================================================== */
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },

      /* =====================================================
         SPACING EXTENSIONS
         Additional spacing values for fine-tuning
         ===================================================== */
      spacing: {
        "18": "4.5rem",   // 72px
        "88": "22rem",    // 352px
        "128": "32rem",   // 512px
      },
    },
  },
  plugins: [],
};

export default config;