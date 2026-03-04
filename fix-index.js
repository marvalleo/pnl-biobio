const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');
content = content.replace(/<header id="main-header">[\s\S]*?<\/header>/, '<pnl-navbar type="public"></pnl-navbar>');
fs.writeFileSync('index.html', content);
console.log('Replaced header in index.html');
