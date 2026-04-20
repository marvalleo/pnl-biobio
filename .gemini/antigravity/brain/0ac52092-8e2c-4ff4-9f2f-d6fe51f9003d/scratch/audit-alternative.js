
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');

const SUPABASE_URL = "https://kjcwozzfzbizxurppxlf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqY3dvenpmemJpenh1cnBweGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDQ1MzI2OCwiZXhwIjoyMDg2MDI5MjY4fQ.74Vs3RqNBVYiUIKuccJgOSJuViFxD3t18BiItOE_3os";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const excelPath = path.join('c:', 'Users', 'MIPC', 'Desktop', 'Proyectos', 'PNL', 'webpnl', 'docs', 'LISTA MILITANTE BIOBÍO to EXPORT final.xlsx');

async function auditAlternativeExcel() {
    try {
        console.log(`🚀 Auditando el archivo alternativo: ${path.basename(excelPath)}`);
        
        const workbook = XLSX.readFile(excelPath);
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        
        const excelEmails = new Set();
        data.forEach(m => {
            // Buscamos la columna de mail, que puede tener otro nombre
            const emailKey = Object.keys(m).find(k => k.toLowerCase().includes('email') || k.toLowerCase().includes('correo'));
            if (emailKey && m[emailKey]) excelEmails.add(m[emailKey].toLowerCase().trim());
        });

        console.log(`📊 Total en Excel alternativo: ${excelEmails.size} emails únicos.`);

        let dbEmailsSet = new Set();
        let from = 0;
        let hasMore = true;

        while (hasMore) {
            const { data: dbProfiles, error } = await supabase
                .from('profiles')
                .select('email')
                .range(from, from + 999);

            if (error) throw error;
            dbProfiles.forEach(p => {
                if (p.email) dbEmailsSet.add(p.email.toLowerCase().trim());
            });

            if (dbProfiles.length < 1000) hasMore = false;
            else from += 1000;
        }

        const missing = [];
        data.forEach(m => {
            const emailKey = Object.keys(m).find(k => k.toLowerCase().includes('email'));
            const email = emailKey ? m[emailKey]?.toLowerCase().trim() : null;
            if (email && !dbEmailsSet.has(email)) {
                missing.push(m);
                dbEmailsSet.add(email);
            }
        });

        console.log(`⚠️ RESULTADO: faltan ${missing.length} militantes de este archivo en la base de datos.`);
        if (missing.length > 0) {
            console.log("📝 Ejemplo de los primeros 5:");
            missing.slice(0, 5).forEach(m => console.log(` - ${JSON.stringify(m)}`));
        }

    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

auditAlternativeExcel();
