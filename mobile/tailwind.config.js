/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9ebff',
          200: '#bcdcff',
          300: '#8ec7ff',
          400: '#59a9ff',
          500: '#3389fb',
          600: '#1d6af0',
          700: '#1854dc',
          800: '#1a46b2',
          900: '#1b3e8c',
          950: '#142755',
        },
        ink: {
          50: '#f7f9fc',
          100: '#eef2f8',
          200: '#dbe3ef',
          300: '#bfcce0',
          400: '#93a8c7',
          500: '#6f87ab',
          600: '#526b8e',
          700: '#3d5270',
          800: '#2a3a52',
          900: '#172033',
          950: '#0b1020',
        },
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        soft: '0 20px 50px -24px rgba(15, 23, 42, 0.35)',
      },
    },
  },
  plugins: [],
};
