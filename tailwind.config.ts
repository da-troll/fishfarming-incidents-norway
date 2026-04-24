import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        "paper-2": "var(--paper-2)",
        rule: "var(--rule)",
        "rule-2": "var(--rule-2)",
        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        "ink-warm": "var(--ink-warm)",
        mute: "var(--mute)",
        alarm: "var(--alarm)",
        "alarm-bg": "var(--alarm-bg)",
      },
      fontFamily: {
        display: ["Spectral", "Times New Roman", "serif"],
        sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
