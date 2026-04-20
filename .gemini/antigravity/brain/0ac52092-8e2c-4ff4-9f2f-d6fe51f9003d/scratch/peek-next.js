
const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://kjcwozzfzbizxurppxlf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqY3dvenpmemJpenh1cnBweGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDQ1MzI2OCwiZXhwIjoyMDg2MDI5MjY4fQ.74Vs3RqNBVYiUIKuccJgOSJuViFxD3t18BiItOE_3os";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function peekNextRecipients() {
    try {
        console.log("🕵️ Verificando los próximos destinatarios (Offset: 1000)...");
        
        const { data, error } = await supabase
            .from('profiles')
            .select('full_name, email')
            .range(1000, 1005)
            .order('full_name', { ascending: true }); // Usamos el mismo orden que agregué a la función

        if (error) throw error;

        console.log("\n✅ Si ponés OFFSET 1000, los primeros en recibir el mail serán:");
        data.forEach((p, i) => {
            console.log(`${i + 1}. ${p.full_name} (${p.email})`);
        });
        
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

peekNextRecipients();
