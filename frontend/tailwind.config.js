/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F5F2FC',
        surface: {
          DEFAULT: '#FFFFFF',
          subtle: '#FAF8FD',
          card: '#FFFFFF',
          border: '#ECE5F6',
          hover: '#F2EDFA',
        },
        navy: {
          950: '#0C0D17',
          900: '#111322',
          850: '#16192E',
          800: '#1C2038',
          700: '#272C4A',
          border: '#22263F',
        },
        brand: {
          50: '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
          300: '#D8B4FE',
          400: '#C084FC',
          500: '#A855F7',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
        },
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        dark: {
          900: '#111322',
          800: '#16192E',
          700: '#1C2038',
          600: '#272C4A'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'saas-sm': '0 2px 8px -2px rgba(110, 85, 160, 0.06)',
        'saas': '0 4px 16px -4px rgba(110, 85, 160, 0.08)',
        'saas-lg': '0 12px 32px -8px rgba(110, 85, 160, 0.12)',
        'saas-glow': '0 8px 24px -4px rgba(124, 58, 237, 0.25)',
      }
    },
  },
  plugins: [],
}
