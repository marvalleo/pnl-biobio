const fs = require('fs');

function replaceLoader(file, regex, replacement) {
    try {
        let content = fs.readFileSync(file, 'utf8');
        content = content.replace(regex, replacement);
        fs.writeFileSync(file, content);
        console.log("SUCCESS " + file);
    } catch (e) {
        console.error("ERROR " + file + " " + e.message);
    }
}

// 1. forja-academia.html
const acadRegex = /<div class=\"col-span-full text-center py-20\">[\s\S]*?<\/div>/;
const acadSk = '<div class="col-span-1 md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 w-full animate-pulse">\n' +
    '                <div class="h-[450px] bg-slate-100 rounded-[2.5rem] flex flex-col justify-end p-10 relative overflow-hidden xl:flex">\n' +
    '                    <div class="w-16 h-6 bg-slate-200 rounded-full mb-4"></div>\n' +
    '                    <div class="w-3/4 h-8 bg-slate-200 rounded-xl mb-6"></div>\n' +
    '                    <div class="w-full h-2 bg-slate-200 rounded-full mb-4"></div>\n' +
    '                    <div class="w-1/2 h-4 bg-slate-200 rounded-md"></div>\n' +
    '                </div>\n' +
    '                <div class="h-[450px] bg-slate-100 rounded-[2.5rem] flex flex-col justify-end p-10 relative overflow-hidden hidden md:flex">\n' +
    '                    <div class="w-16 h-6 bg-slate-200 rounded-full mb-4"></div>\n' +
    '                    <div class="w-3/4 h-8 bg-slate-200 rounded-xl mb-6"></div>\n' +
    '                    <div class="w-full h-2 bg-slate-200 rounded-full mb-4"></div>\n' +
    '                    <div class="w-1/2 h-4 bg-slate-200 rounded-md"></div>\n' +
    '                </div>\n' +
    '                <div class="h-[450px] bg-slate-100 rounded-[2.5rem] flex flex-col justify-end p-10 relative overflow-hidden hidden lg:flex">\n' +
    '                    <div class="w-16 h-6 bg-slate-200 rounded-full mb-4"></div>\n' +
    '                    <div class="w-3/4 h-8 bg-slate-200 rounded-xl mb-6"></div>\n' +
    '                    <div class="w-full h-2 bg-slate-200 rounded-full mb-4"></div>\n' +
    '                    <div class="w-1/2 h-4 bg-slate-200 rounded-md"></div>\n' +
    '                </div>\n' +
    '            </div>';
replaceLoader('forja-academia.html', acadRegex, acadSk);

// 2. forja-votaciones.html
const voteRegex = /<div class=\"col-span-full py-20 text-center animate-pulse\">[\s\S]*?<\/div>/;
const voteSk = '<div class="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100 relative overflow-hidden animate-pulse block">\n' +
    '                <div class="w-24 h-4 bg-slate-200 rounded-full mb-4"></div>\n' +
    '                <div class="w-3/4 h-8 bg-slate-200 rounded-xl mb-4"></div>\n' +
    '                <div class="w-1/2 h-3 bg-slate-200 rounded-md mb-8"></div>\n' +
    '                <div class="space-y-4">\n' +
    '                    <div class="w-full h-12 bg-slate-100 rounded-xl"></div>\n' +
    '                    <div class="w-full h-12 bg-slate-100 rounded-xl"></div>\n' +
    '                </div>\n' +
    '            </div>\n' +
    '            <div class="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100 relative overflow-hidden animate-pulse hidden md:block">\n' +
    '                <div class="w-24 h-4 bg-slate-200 rounded-full mb-4"></div>\n' +
    '                <div class="w-3/4 h-8 bg-slate-200 rounded-xl mb-4"></div>\n' +
    '                <div class="w-1/2 h-3 bg-slate-200 rounded-md mb-8"></div>\n' +
    '                <div class="space-y-4">\n' +
    '                    <div class="w-full h-12 bg-slate-100 rounded-xl"></div>\n' +
    '                    <div class="w-full h-12 bg-slate-100 rounded-xl"></div>\n' +
    '                </div>\n' +
    '            </div>';
replaceLoader('forja-votaciones.html', voteRegex, voteSk);
