import type { Config } from "tailwindcss";

// ─────────────────────────────────────────────────────────────────────────────
// AHADU BANK Brand Palette
// Extracted from the official Ahadu Bank branding header image.
// The color is a deep wine-burgundy crimson — NOT a pure red.
// It has a slightly purple-toned warmth: think merlot/burgundy wine.
//
//  Primary brand  : #9B1535   (deep wine-crimson — exact match from image bg)
//  Dark variant   : #7A0E28   (dark burgundy — shadow/sidebar)
//  Deeper         : #5E0B1E   (deepest — hover/active states)
//  Script pattern : #8A1230   (pattern overlay in image background)
//  Light accent   : #BE1B3C   (highlights / buttons)
//  Pale            : #FBF0F3  (tinted white backgrounds)
// ─────────────────────────────────────────────────────────────────────────────

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FFFFFF",
        foreground: "#18080D",

        // ── Ahadu Brand — Wine Burgundy Crimson ────────────────────────────
        primary: {
          DEFAULT: "#9B1535",
          foreground: "#FFFFFF",
          50:  "#FBF0F3",
          100: "#F6D9E1",
          200: "#EDB0BF",
          300: "#E0809A",
          400: "#C84C70",
          500: "#9B1535",   // main brand — from image
          600: "#7A0E28",   // dark
          700: "#5E0B1E",   // darker
          800: "#440816",   // deepest
          900: "#2C040D",
        },
        brand: {
          DEFAULT:  "#9B1535",
          dark:     "#7A0E28",
          darker:   "#5E0B1E",
          pattern:  "#8A1230",   // Ethiopic script overlay shade
          light:    "#BE1B3C",
          lighter:  "#E0809A",
          pale:     "#FBF0F3",
          accent:   "#F6D9E1",
        },
        muted: {
          DEFAULT: "#F5F5F5",
          foreground: "#666666",
        },
        border: "#E5E7EB",
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#18080D",
        },
        sidebar: {
          DEFAULT:    "#7A0E28",
          foreground: "#FFFFFF",
          hover:      "#9B1535",
          active:     "#BE1B3C",
          border:     "#5E0B1E",
        },
        tier: {
          high:        "#166534",
          "high-bg":   "#DCFCE7",
          medium:      "#92400E",
          "medium-bg": "#FEF3C7",
          low:         "#991B1B",
          "low-bg":    "#FEE2E2",
        },
        severity: {
          critical:       "#7F1D1D",
          "critical-bg":  "#FEE2E2",
          high:           "#7C2D12",
          "high-bg":      "#FFEDD5",
          medium:         "#78350F",
          "medium-bg":    "#FEF3C7",
          low:            "#14532D",
          "low-bg":       "#DCFCE7",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
      boxShadow: {
        card:         "0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.04)",
        "card-hover": "0 4px 12px -1px rgba(155,21,53,0.14), 0 2px 6px -2px rgba(0,0,0,0.06)",
        sidebar:      "2px 0 16px rgba(122,14,40,0.30)",
      },
    },
  },
  plugins: [],
};

export default config;
