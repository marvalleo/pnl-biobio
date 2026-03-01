const fs = require('fs');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://kjcwozzfzbizxurppxlf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqY3dvenpmemJpenh1cnBweGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NTMyNjgsImV4cCI6MjA4NjAyOTI2OH0.UEziql_VLY92Opgngmf-LBEYmFzduVMKFcwEviV99NE";
const EXCEL_PATH = "./docs/LISTA MILITANTE BIOBÍO to EXPORT final.xlsx";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function findMissing() {
    console.log("🔍 Buscando los 37 usuarios faltantes...");

    // 1. Leer Excel
    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const excelData = rows.map(row => {
        // Cabeceras exactas detectadas: '\r\nNombre Completo', 'Email'
        let email = row['Email'] || row['email'] || row['Correo'];
        let name = row['\r\nNombre Completo'] || row['Nombre Completo'] || row['Nombre'];

        if (email) email = email.trim().toLowerCase().replace(/\s+/g, '');
        return { email, name };
    }).filter(u => u.email && u.name);

    console.log(`📊 Usuarios válidos en Excel: ${excelData.length}`);

    // 2. Leer DB
    const { data: profiles, error } = await supabase.from('profiles').select('email');
    if (error) {
        console.error("❌ Error DB:", error.message);
        return;
    }
    const dbEmails = new Set(profiles.map(p => p.email.toLowerCase().trim()));
    console.log(`📊 Usuarios en DB: ${dbEmails.size}`);

    // 3. Cruzar datos
    const missing = excelData.filter(u => !dbEmails.has(u.email));

    console.log(`🔴 Faltantes detectados: ${missing.length}`);

    if (missing.length > 0) {
        console.log("\nLista de Faltantes:");
        missing.forEach((m, i) => console.log(`${i + 1}. ${m.email} (${m.name})`));

        fs.writeFileSync('usuarios_faltantes.json', JSON.stringify(missing, null, 2));
        console.log("\n✅ Lista guardada en 'usuarios_faltantes.json'");
    }
}

findMissing();
