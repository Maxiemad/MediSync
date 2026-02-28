/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Calm Intelligence palette
        sage: {
          DEFAULT: "#EAF4F1",
          dark: "#d4e8e2",
        },
        teal: {
          DEFAULT: "#2E7C7B",
          light: "#3d9b99",
          dark: "#246362",
        },
        offwhite: "#F9FAF8",
        // Severity accents (safe, not alarming)
        mild: "#8FBC9A",
        moderate: "#D4A574",
        severe: "#C97B7B",
        unknown: "#9B8FA6",
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
        display: ["Manrope", "Plus Jakarta Sans", "sans-serif"],
      },
      boxShadow: {
        soft: "0 4px 24px -4px rgba(46, 124, 123, 0.12), 0 8px 16px -8px rgba(0,0,0,0.06)",
        card: "0 8px 32px -8px rgba(46, 124, 123, 0.14), 0 2px 8px -2px rgba(0,0,0,0.04)",
        glow: "0 0 24px -4px rgba(46, 124, 123, 0.2)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      animation: {
        "pulse-soft": "pulse-soft 2.5s ease-in-out infinite",
        "float": "float 8s ease-in-out infinite",
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.85" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-12px) rotate(2deg)" },
        },
      },
    },
  },
  plugins: [],
};
