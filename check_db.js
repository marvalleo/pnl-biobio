const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function check() {
    const config = fs.readFileSync('supabase-config.js', 'utf8');
    const url = config.match(/const SUPABASE_URL = "(.*?)";/)[1];
    const key = config.match(/const SUPABASE_ANON_KEY = "(.*?)";/)[1];

    const supabase = createClient(url, key);
    const { data, error } = await supabase.from('courses').select('id, title, level');
    console.log(JSON.stringify({ data, error }, null, 2));
}

check();
