/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./*.html",
        "./assets/**/*.js",
        "./public/**/*.js",
        "./shared.js"
    ],
    darkMode: 'media',
    theme: {
        extend: {
            fontFamily: {
                'pnl-serif': ['Playfair Display', 'Georgia', 'serif'],
                'pnl-sans': ['Roboto', 'Helvetica', 'Arial', 'sans-serif'],
            },
            colors: {
                'pnl-navy': '#182d56',
                'pnl-gold': '#fba931',
                'pnl-dark': '#0f172a',
            },
        },
    },
    corePlugins: {
        container: false,
    },
    plugins: [],
}
