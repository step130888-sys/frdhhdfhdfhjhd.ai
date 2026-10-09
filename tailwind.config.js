/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        charcoal: {
          950: '#000000',
          900: '#0A0A0E',
          850: '#101015',
          800: '#15151C',
          750: '#1B1B24',
          700: '#23232E',
          600: '#2F2F3D',
        },
        cosmic: {
          950: '#000000',
          900: '#0A0A0E',
          850: '#101015',
          800: '#15151C',
          750: '#1B1B24',
          700: '#23232E',
        },
        appleOrange: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
        },
        tenderRose: {
          50: '#FDF2F8',
          100: '#FCE7F3',
          200: '#FBCFE8',
          300: '#F9A8D4',
          400: '#FCB4D5',
          500: '#F472B6',
          600: '#DB2777',
        },
        kedrRose: {
          DEFAULT: '#FCB4D5',
          light: '#FDF2F8',
          hover: '#F9A8D4',
          border: 'rgba(252, 180, 213, 0.35)',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"', 'Montserrat', 'system-ui', 'sans-serif'],
        script: ['Caveat', 'cursive'],
      }
    },
  },
  plugins: [],
}
