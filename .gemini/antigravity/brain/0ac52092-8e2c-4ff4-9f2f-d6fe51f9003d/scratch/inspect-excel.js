
const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join('c:', 'Users', 'MIPC', 'Desktop', 'Proyectos', 'PNL', 'webpnl', 'docs', 'PADRÓN SITIO WEB 02-26.xlsx');

try {
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log("📊 Archivo Excel cargado correctamente.");
    console.log("------------------------------------------");
    console.log(`✅ Total de registros en Excel: ${data.length}`);
    if (data.length > 0) {
        console.log("📝 Columnas detectadas:", Object.keys(data[0]));
        console.log("👀 Ejemplo del primer registro:", data[0]);
    }
} catch (error) {
    console.error("❌ Error al leer el Excel:", error.message);
}
