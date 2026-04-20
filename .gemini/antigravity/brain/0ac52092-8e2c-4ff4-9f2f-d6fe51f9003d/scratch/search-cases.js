
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');

const SUPABASE_URL = "https://kjcwozzfzbizxurppxlf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqY3dvenpmemJpenh1cnBweGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDQ1MzI2OCwiZXhwIjoyMDg2MDI5MjY4fQ.74Vs3RqNBVYiUIKuccJgOSJuViFxD3t18BiItOE_3os";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const excelPath = path.join('c:', 'Users', 'MIPC', 'Desktop', 'Proyectos', 'PNL', 'webpnl', 'docs', 'PADRÓN SITIO WEB 02-26.xlsx');
const targetEmails = ['disenotonos@gmail.com', 'vhh.contacto@gmail.com'];

async function searchSpecificEmails() {
    try {
        console.log("🔍 Buscando casos específicos...");

        // 1. Buscar en Excel
        const workbook = XLSX.readFile(excelPath);
        const sheetName = workbook.SheetNames[0];
        const excelData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        
        console.log("\n📊 En el EXCEL:");
        targetEmails.forEach(email => {
            const found = excelData.find(m => m.EMAIL?.toLowerCase().trim() === email.toLowerCase());
            if (found) {
                console.log(` ✅ Encontrado: ${email} ->`, found);
            } else {
                console.log(` ❌ NO encontrado en Excel: ${email}`);
            }
        });

        // 2. Buscar en Supabase
        console.log("\n🗄️ En la BASE DE DATOS (Supabase):");
        for (const email of targetEmails) {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('email', email.trim());
            
            if (error) throw error;
            
            if (data && data.length > 0) {
                console.log(` ✅ Encontrado en DB: ${email} ->`, data[0]);
            } else {
                console.log(` ❌ NO encontrado en DB: ${email}`);
            }
        }

    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

searchSpecificEmails();
