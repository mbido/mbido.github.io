module.exports = {
  content: [
    "./*.html",
    "./js/**/*.js", // Ajout de cette ligne pour inclure les fichiers JS
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#2A2A2A',
        'secondary': '#4A5568',
      }
    }
  },
  plugins: [],
}
