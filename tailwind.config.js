/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx}", "./src/**/*.{js,jsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        severity: {
          mild: "#22c55e",
          moderate: "#f59e0b",
          severe: "#ef4444",
          emergency: "#b91c1c",
          none: "#d1d5db",
        },
      },
    },
  },
  plugins: [],
};
