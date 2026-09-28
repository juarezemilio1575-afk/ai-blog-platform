import type { Config } from "tailwindcss";

/**
 * Design direction (section 27: "Modern, Premium, Minimal, Fast,
 * Professional" + dark/light mode): an editorial-magazine feel rather than
 * a generic SaaS-dashboard look — warm ink/paper neutrals, a single
 * confident accent (amber), a serif display face for headlines paired
 * with a clean grotesk for body/UI text.
 */
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: {
          50: "#FAF8F3",
          100: "#F3EFE5",
          200: "#E7E0D0",
        },
        ink: {
          700: "#33302A",
          800: "#211F1A",
          900: "#141310",
        },
        accent: {
          400: "#D98A3D",
          500: "#C4712A",
          600: "#A85C1E",
        },
      },
      fontFamily: {
        display: ["'Fraunces'", "ui-serif", "Georgia", "serif"],
        sans: ["'Inter'", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: "70ch",
          },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
