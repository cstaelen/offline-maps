/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // Monokai Pro (default filter) palette, used via dark:bg-monokai-*
      // etc. throughout the UI panels, replacing the generic slate/gray
      // dark: colors Tailwind ships by default.
      colors: {
        monokai: {
          bg: '#2d2a2e',
          surface: '#403e41',
          border: '#5b595c',
          text: '#fcfcfa',
          muted: '#c1c0c0',
          pink: '#ff6188',
          green: '#a9dc76',
          yellow: '#ffd866',
          purple: '#ab9df2',
          blue: '#78dce8',
        },
      },
    },
  },
  plugins: [],
}
