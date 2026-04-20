
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');

const SUPABASE_URL = "https://kjcwozzfzbizxurppxlf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqY3dvenpmemJpenh1cnBweGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDQ1MzI2OCwiZXhwIjoyMDg2MDI5MjY4fQ.74Vs3RqNBVYiUIKuccJgOSJuViFxD3t18BiItOE_3os";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const excelPath = path.join('c:', 'Users', 'MIPC', 'Desktop', 'Proyectos', 'PNL', 'webpnl', 'docs', 'PADRÓN SITIO WEB 02-26.xlsx');

async function syncMilitantes() {
    try {
        console.log("🚀 Iniciando auditoría de padrón...");
        
        // 1. Leer Excel
        const workbook = XLSX.readFile(excelPath);
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        
        // Limpieza de emails para comparación
        const missingMilitantes = [];
        const excelEmails = new Set();
        
        data.forEach(m => {
            if (m.EMAIL) excelEmails.add(m.EMAIL.toLowerCase().trim());
        });

        console.log(`📊 Total en Excel: ${excelEmails.size} emails únicos.`);

        // 2. Leer Supabase (Todos los perfiles)
        // Usamos un bucle por si hay más de 1000
        let dbEmailsSet = new Set();
        let from = 0;
        let to = 999;
        let hasMore = true;

        while (hasMore) {
            const { data: dbProfiles, error } = await supabase
                .from('profiles')
                .select('email')
                .range(from, to);

            if (error) throw error;
            
            dbProfiles.forEach(p => {
                if (p.email) dbEmailsSet.add(p.email.toLowerCase().trim());
            });

            if (dbProfiles.length < 1000) {
                hasMore = false;
            } else {
                from += 1000;
                to += 1000;
            }
        }
        
        console.log(`🗄️ Total en Base de Datos: ${dbEmailsSet.size} emails.`);

        // 3. Cruzar Emails
        data.forEach(m => {
            const email = m.EMAIL?.toLowerCase().trim();
            if (email && !dbEmailsSet.has(email)) {
                missingMilitantes.push(m);
                // Evitar duplicados en los faltantes si el Excel tiene emails repetidos
                dbEmailsSet.add(email); 
            }
        });

        console.log("------------------------------------------");
        console.log(`⚠️ RESULTADO: faltan ${missingMilitantes.length} militantes en la base de datos.`);
        
        if (missingMilitantes.length > 0) {
            console.log("📝 Listado de los primeros 10 faltantes:");
            missingMilitantes.slice(0, 10).forEach(m => console.log(` - ${m.NOMBRE} (${m.EMAIL})`));
            console.log("\n💡 Confirmame y los cargo todos ahora mismo.");
        } else {
            console.log("✅ ¡El padrón está perfectamente sincronizado!");
        }

    } catch (error) {
        console.error("❌ Error en la auditoría:", error.message);
    }
}

syncMilitantes();
