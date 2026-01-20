/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme colors from reference images
        dark: {
          bg: '#1a1a1a',
          card: '#2a2a2a',
          border: '#3a3a3a',
        },
        primary: {
          DEFAULT: '#4ade80', // Green from reference
          dark: '#22c55e',
        },
      },
    },
  },
  plugins: [],
}
