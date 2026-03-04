const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const htmlFiles = fs.readdirSync(rootDir).filter(file => file.endsWith('.html'));

let replacedCount = 0;

htmlFiles.forEach(file => {
    let content = fs.readFileSync(path.join(rootDir, file), 'utf8');
    const original = content;

    // We only want to replace the prominent top navs in public and some forja pages
    // Pages like admin ones might have a very specific nav that we skip for now to maintain stability.
    const publicPages = ['index.html', 'nosotros.html', 'contacto.html', 'publicaciones-oficiales.html'];
    const forjaPages = ['forja-academia.html', 'forja-eventos.html', 'forja-votaciones.html', 'forja-foros.html', 'forja-foros-mockup.html'];

    if (publicPages.includes(file)) {
        // Regex to match the <nav> block for public pages
        content = content.replace(/<nav[^>]*>[\s\S]*?<\/nav>/, '<pnl-navbar type="public"></pnl-navbar>');
    } else if (forjaPages.includes(file)) {
        // Regex to match the <nav> block for forja pages
        content = content.replace(/<nav[^>]*>[\s\S]*?<\/nav>/, '<pnl-navbar type="forja"></pnl-navbar>');
    }

    // Include the component script at the end of body if not already there
    if (content !== original) {
        if (!content.includes('navbar.js')) {
            content = content.replace('</body>', '    <script src="/assets/components/navbar.js"></script>\n</body>');
        }

        fs.writeFileSync(path.join(rootDir, file), content);
        console.log(`Injected <pnl-navbar> into: ${file}`);
        replacedCount++;
    }
});

console.log(`Navbar replacement complete. Files updated: ${replacedCount}`);
