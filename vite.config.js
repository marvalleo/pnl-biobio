const { resolve } = require('path');
const { defineConfig } = require('vite');
const fs = require('fs');

const files = fs.readdirSync(__dirname).filter(file => file.endsWith('.html'));
const inputFiles = files.reduce((acc, file) => {
    const name = file.replace(/\.html$/, '');
    acc[name] = resolve(__dirname, file);
    return acc;
}, {});

module.exports = defineConfig({
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: inputFiles
        }
    }
});
