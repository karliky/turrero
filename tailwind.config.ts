import type { Config } from "tailwindcss";
import preline from 'preline/plugin';
import tailwindcssAnimate from 'tailwindcss-animate';

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    'node_modules/preline/dist/*.js',
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        whiskey: {
          '50': '#f9f6f3',
          '100': '#f2eae2',
          '200': '#e4d4c4',
          '300': '#d2b79f',
          '400': '#c39b7f',
          '500': '#b27d5d',
          '600': '#a56b51',
          '700': '#895645',
          '800': '#70473c',
          '900': '#5b3b33',
          '950': '#301e1a',
        },
        brand: '#a5050b', // Red pixel from Recuenco's x.com profile
      },
    },
  },
  plugins: [
    preline,
    tailwindcssAnimate,
  ],
} satisfies Config;
