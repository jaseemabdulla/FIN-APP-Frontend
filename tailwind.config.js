/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
        colors: {
            'card-dark': '#1e1e1e',
            'bg-dark': '#121212',
            'primary': '#bb86fc',
            'secondary': '#03dac6',
            'error': '#cf6679'
        }
    },
  },
  plugins: [],
}
