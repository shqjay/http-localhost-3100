import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "ui-sans-serif", "system-ui"]
      },
      colors: {
        void: "#050816",
        primary: "#7C3AED",
        accent: "#3B82F6",
        highlight: "#06B6D4",
        muted: "#94A3B8"
      },
      boxShadow: {
        glow: "0 0 48px rgba(124, 58, 237, 0.28)",
        cyan: "0 0 42px rgba(6, 182, 212, 0.22)",
        luxury: "0 24px 100px rgba(0, 0, 0, 0.45)"
      },
      backgroundImage: {
        "radial-noise":
          "radial-gradient(circle at top left, rgba(124,58,237,.32), transparent 34%), radial-gradient(circle at 80% 10%, rgba(59,130,246,.24), transparent 30%), radial-gradient(circle at 48% 85%, rgba(6,182,212,.18), transparent 30%)"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translate3d(0, 0, 0) rotate(0deg)" },
          "50%": { transform: "translate3d(0, -16px, 0) rotate(1deg)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" }
        },
        scroll: {
          "0%": { transform: "translateY(0)", opacity: "1" },
          "75%": { transform: "translateY(14px)", opacity: ".12" },
          "100%": { transform: "translateY(0)", opacity: "0" }
        },
        scan: {
          "0%": { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(120%)" }
        }
      },
      animation: {
        float: "float 8s ease-in-out infinite",
        shimmer: "shimmer 9s ease-in-out infinite",
        scroll: "scroll 1.8s ease-in-out infinite",
        scan: "scan 4.6s linear infinite"
      }
    }
  },
  plugins: []
};

export default config;
