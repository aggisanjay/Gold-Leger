import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: {
          50: "#FCFBF9",
          100: "#F9F6F0",
          200: "#F4EFE6",
          300: "#EFE8DA",
          400: "#E5DEC9",
          DEFAULT: "#FDFBF7",
        },
        gold: {
          50: "#FAF7EF",
          100: "#F3ECD7",
          200: "#E7D8AE",
          300: "#DBC485",
          400: "#D0B262",
          500: "#C5A059", // Champagne Gold Primary
          600: "#B08A44",
          700: "#8C6A30",
          800: "#6B5023",
          900: "#4A3617",
        },
        charcoal: {
          50: "#F5F5F5",
          100: "#E5E5E5",
          200: "#CCCCCC",
          300: "#999999",
          400: "#666666",
          500: "#333333",
          600: "#262626",
          700: "#1F1F1F",
          800: "#171717",
          900: "#121212",
          DEFAULT: "#1C1917",
        },
        emerald: {
          750: "#0D5C3A",
        },
        ruby: {
          750: "#991B1B",
        }
      },
      fontFamily: {
        serif: ["Cinzel", "Playfair Display", "Georgia", "serif"],
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        'luxury': '0 4px 20px -2px rgba(28, 25, 23, 0.05), 0 2px 6px -1px rgba(197, 160, 89, 0.08)',
        'luxury-hover': '0 10px 25px -5px rgba(28, 25, 23, 0.08), 0 8px 10px -6px rgba(197, 160, 89, 0.12)',
        'gold-glow': '0 0 15px -3px rgba(197, 160, 89, 0.35)',
      }
    },
  },
  plugins: [],
};

export default config;

