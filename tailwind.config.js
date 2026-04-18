/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        midnight: { DEFAULT: '#0a1628', dark: '#050b1a', light: '#1a2744' },
        gold: { DEFAULT: '#d4af37', dim: '#8b7d3f', bright: '#e6c659' },
        cream: '#f5f1e8',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'serif'],
        arabic: ['Amiri', 'serif'],
        sans: ['Outfit', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
