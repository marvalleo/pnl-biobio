const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugCall() {
    const email = 'dlitorresg@gmail.com';
    const full_name = 'Debug User';
    
    console.log(`[DEBUG] Llamando a create-user-temp para: ${email}...`);
    
    try {
        const { data, error } = await supabase.functions.invoke('create-user-temp', {
            body: { email, full_name, role: 'normal' }
        });
        
        if (error) {
            console.error('[DEBUG] FALLO:', error);
            if (error.context) {
                const body = await error.context.json();
                console.error('[DEBUG] BODY DEL ERROR:', JSON.stringify(body, null, 2));
            }
        } else {
            console.log('[DEBUG] ÉXITO:', data);
        }
    } catch (e) {
        console.error('[DEBUG] EXCEPCIÓN:', e);
    }
}

debugCall();
