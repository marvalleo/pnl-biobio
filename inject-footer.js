const fs = require('fs');
const path = require('path');

const directoryPath = __dirname;

function processDirectory(directory) {
    fs.readdir(directory, (err, files) => {
        if (err) {
            return console.log('Unable to scan directory: ' + err);
        }

        files.forEach(file => {
            const filePath = path.join(directory, file);

            fs.stat(filePath, (err, stats) => {
                if (err) {
                    return console.error(err);
                }

                if (stats.isDirectory() && file !== 'node_modules' && file !== '.git' && file !== 'public') {
                    // processDirectory(filePath);
                } else if (stats.isFile() && filePath.endsWith('.html')) {
                    replaceFooter(filePath);
                }
            });
        });
    });
}

function replaceFooter(filePath) {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return console.error(`Error reading file ${filePath}: ${err}`);
        }

        let updatedData = data;

        // Regex para buscar el tag footer viejo y todo su contenido
        const footerRegex = /<footer[\s\S]*?<\/footer>/gi;

        if (footerRegex.test(updatedData)) {
            updatedData = updatedData.replace(footerRegex, '<pnl-footer></pnl-footer>');

            // Si no tiene el script, lo agregamos antes del cierre del body
            if (!updatedData.includes('<script src="/assets/components/footer.js"></script>')) {
                updatedData = updatedData.replace('</body>', '    <script src="/assets/components/footer.js"></script>\n</body>');
            }

            fs.writeFile(filePath, updatedData, 'utf8', (err) => {
                if (err) {
                    return console.error(`Error writing file ${filePath}: ${err}`);
                }
                console.log(`✅ Footer injected into ${path.basename(filePath)}`);
            });
        }
    });
}

processDirectory(directoryPath);
