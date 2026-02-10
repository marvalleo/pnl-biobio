const fs = require('fs');
const path = require('path');

// Leer el archivo .env
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
    console.error('❌ Error: No se encontró el archivo .env');
    process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};

envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim();
    }
});

// Leer el template
const templatePath = path.join(__dirname, 'supabase-config.template.js');
let configContent = fs.readFileSync(templatePath, 'utf8');

// Reemplazar placeholders
configContent = configContent.replace('__SUPABASE_URL__', env.SUPABASE_URL);
configContent = configContent.replace('__SUPABASE_ANON_KEY__', env.SUPABASE_ANON_KEY);

// Guardar el config real (ignorado por git)
fs.writeFileSync(path.join(__dirname, 'supabase-config.js'), configContent);

console.log('✅ supabase-config.js generado exitosamente con variables de entorno.');
