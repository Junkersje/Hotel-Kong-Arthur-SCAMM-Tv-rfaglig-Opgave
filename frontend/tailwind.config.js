/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        arthur: {
          dark: '#1e293b',
          gold: '#c5a059',
          goldLight: '#dfc285',
          goldDark: '#9a7b3c'
        }
      }
    },
  },
  plugins: [],
};
