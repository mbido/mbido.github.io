const colors = require('tailwindcss/colors')

module.exports = {
  content: [
    "./*.html",
    "./js/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        'primary': colors.teal[600],
        'secondary': colors.orange[500],
        // Example: Add a lighter primary for backgrounds or accents
        'primary-light': colors.teal[50],
        'primary-dark': colors.teal[700],
        'secondary-dark': colors.orange[600],
      },
      fontFamily: {
        sans: ['Nunito', 'sans-serif'],
        headline: ['Poppins', 'sans-serif'],
      },
      // Adding some playful transitions and transforms for later use
      transitionTimingFunction: {
        'elastic': 'cubic-bezier(0.68, -0.55, 0.27, 1.55)',
      },
      transformOrigin: {
        'bottom-center': 'bottom center',
      }
    }
  },
  plugins: [],
}
