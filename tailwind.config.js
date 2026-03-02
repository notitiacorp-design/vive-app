/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#0A0E1A',
        surface: '#141927',
        'surface-light': '#1E2436',
        primary: '#6C63FF',
        'primary-light': '#8B83FF',
        secondary: '#00D4AA',
        accent: '#FFB800',
        text: '#FFFFFF',
        'text-muted': '#8E95A9',
      },
    },
  },
  plugins: [],
};
