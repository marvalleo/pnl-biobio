/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./*.html",
        "./assets/**/*.js",
        "./public/**/*.js",
        "./shared.js"
    ],
    theme: {
        extend: {},
    },
    corePlugins: {
        container: false,
    },
    plugins: [],
}
