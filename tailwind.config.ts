import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "background-primary": "var(--background-primary)",
        "background-secondary": "var(--background-secondary)",
        "background-elevated": "var(--background-elevated)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "accent-primary": "var(--accent-primary)",
        positive: "var(--positive)",
        negative: "var(--negative)",
        contrarian: "var(--contrarian)",
        "blind-period": "var(--blind-period)",
        border: "var(--border)",
      },
    },
  },
  plugins: [],
};
export default config;
