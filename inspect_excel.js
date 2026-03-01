const XLSX = require('xlsx');
const EXCEL_PATH = "./docs/LISTA MILITANTE BIOBÍO to EXPORT final.xlsx";

const workbook = XLSX.readFile(EXCEL_PATH);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // Leer como array de arrays para ver cabeceras

console.log("Cabeceras encontradas (Fila 1):");
console.log(data[0]);

console.log("\nPrimera fila de datos (Fila 2):");
console.log(data[1]);
