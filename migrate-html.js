const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
let count = 0;
for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('cdn.tailwindcss.com')) {
        content = content.replace(/<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>/gi, '<link rel="stylesheet" href="/input.css">');
        fs.writeFileSync(file, content);
        count++;
    }
}
console.log(`Updated ${count} HTML files.`);
