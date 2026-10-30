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
          50: '#fdf8f6',
          100: '#f2e8e5',
          600: '#8c2d19',
          700: '#732313',
          800: '#5a1c10',
          900: '#42140b',
        }
      }
    },
  },
  plugins: [],
}
