/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Vazirmatn', 'Tahoma', 'sans-serif'], poetry: ['Vazirmatn', 'serif'] },
      colors: {
        paper: '#FAF7F0', ink: '#1C1917', muted: '#57534E', amber: '#B45309',
        night: '#121214', surface: '#1C1C20', nightText: '#F4F4F5', nightMuted: '#A1A1AA',
      },
      boxShadow: { paper: '0 18px 60px -32px rgba(67, 47, 20, .28)' },
    },
  },
  plugins: [],
};
