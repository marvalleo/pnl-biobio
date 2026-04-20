
const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join('c:', 'Users', 'MIPC', 'Desktop', 'Proyectos', 'PNL', 'webpnl', 'docs', 'PADRÓN SITIO WEB 02-26.xlsx');

try {
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const withoutEmail = data.filter(m => !m.EMAIL);
    const withEmail = data.filter(m => m.EMAIL);

    console.log(`📊 Análisis profundo del Excel:`);
    console.log(` - Registros con Email: ${withEmail.length}`);
    console.log(` - Registros SIN Email: ${withoutEmail.length}`);
    
    if (withoutEmail.length > 0) {
        console.log("📝 Ejemplo de militantes sin mail en el Excel:");
        withoutEmail.slice(0, 5).forEach(m => console.log(` - ${m.NOMBRE || 'SIN NOMBRE'} (Comuna: ${m.COMUNA})`));
    }

} catch (error) {
    console.error("❌ Error:", error.message);
}
