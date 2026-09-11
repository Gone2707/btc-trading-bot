/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        crypto: {
          dark: '#0b0e14',
          card: '#121722',
          border: '#1e2638',
          accent: '#f59e0b',
          green: '#10b981',
          red: '#ef4444',
          cyan: '#06b6d4',
          muted: '#64748b',
        },
      },
    },
  },
  plugins: [],
};
