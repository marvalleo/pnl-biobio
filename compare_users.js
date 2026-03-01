const fs = require('fs');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// Configuración (Tomada de supabase-config.js y .env)
const SUPABASE_URL = "https://kjcwozzfzbizxurppxlf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqY3dvenpmemJpenh1cnBweGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NTMyNjgsImV4cCI6MjA4NjAyOTI2OH0.UEziql_VLY92Opgngmf-LBEYmFzduVMKFcwEviV99NE";
const EXCEL_PATH = "./docs/LISTA MILITANTE BIOBÍO to EXPORT final.xlsx";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runDiagnosis() {
    console.log("🚀 Iniciando diagnóstico de importación...");

    // 1. Leer Excel
    if (!fs.existsSync(EXCEL_PATH)) {
        console.error("❌ Archivo Excel no encontrado en:", EXCEL_PATH);
        return;
    }
    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);
    console.log(`📊 Usuarios en Excel: ${rows.length}`);

    // 2. Extraer y limpiar emails de Excel
    const excelEmails = new Set();
    const duplicatesInExcel = [];
    const invalidRows = [];

    rows.forEach((row, index) => {
        let email = row['Email'] || row['email'] || row['Correo'];
        let name = row['Nombre Completo'] || row['full_name'] || row['Nombre'];

        if (!email || !name) {
            invalidRows.push({ index, row });
            return;
        }

        email = email.trim().toLowerCase().replace(/\s+/g, '');
        if (excelEmails.has(email)) {
            duplicatesInExcel.push(email);
        } else {
            excelEmails.add(email);
        }
    });

    console.log(`✅ Emails únicos en Excel: ${excelEmails.size}`);
    console.log(`⚠️ Duplicados en Excel: ${duplicatesInExcel.length}`);
    console.log(`❌ Filas inválidas (sin nombre o email): ${invalidRows.length}`);

    // 3. Leer DB (profiles)
    console.log("🔍 Consultando base de datos (profiles)...");
    const { data: profiles, error } = await supabase.from('profiles').select('email');
    if (error) {
        console.error("❌ Error al consultar Supabase:", error.message);
        return;
    }
    const dbEmails = new Set(profiles.map(p => p.email.toLowerCase()));
    console.log(`📊 Usuarios en DB (profiles): ${dbEmails.size}`);

    // 4. Calcular delta
    const missingEmails = [];
    for (const email of excelEmails) {
        if (!dbEmails.has(email)) {
            missingEmails.push(email);
        }
    }

    console.log(`🔴 Usuarios faltantes en DB: ${missingEmails.length}`);

    if (missingEmails.length > 0) {
        console.log("\nPrimeros 10 faltantes:");
        console.log(missingEmails.slice(0, 10));
    }

    // 5. Informe final
    const summary = {
        total_excel: rows.length,
        uniques_excel: excelEmails.size,
        duplicates_excel: duplicatesInExcel.length,
        invalid_excel: invalidRows.length,
        total_db: dbEmails.size,
        missing: missingEmails.length
    };

    fs.writeFileSync('import_diagnosis_results.json', JSON.stringify({ summary, missingEmails }, null, 2));
    console.log("\n✅ Diagnóstico completado. Resultados guardados en 'import_diagnosis_results.json'");
}

runDiagnosis();
