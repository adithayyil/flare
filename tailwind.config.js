/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx}", "./src/**/*.{js,jsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Warm coral palette
        bg: '#FFF8F6',
        'bg-elevated': '#FFFFFF',
        text: '#2D1520',         // accent = primary text
        'text-secondary': '#7A6872',
        'text-tertiary': '#A8969F',
        border: '#F0E0E0',
        'border-strong': '#DCC8C8',

        // Coral gradient for interactive elements
        coral: {
          100: '#FFDAB9',
          200: '#FBC4AB',
          300: '#F8AD9D',
          400: '#F4978E',
          500: '#F08080',
        },

        // Accent (dark plum)
        accent: '#2D1520',

        // Severity mapped to coral spectrum
        'sev-low': '#FBC4AB',   // 1-3
        'sev-mid': '#F4978E',   // 4-6
        'sev-high': '#F08080',  // 7-9
        'sev-crit': '#D45D5D',  // 10
      },
    },
  },
  plugins: [],
};
