const fs = require('fs');
const path = require('path');

// Intentar leer el archivo .env si existe
const envPath = path.join(__dirname, '.env');
let env = {};

if (fs.existsSync(envPath)) {
    console.log('📖 Leyendo variables desde archivo .env local...');
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            env[key.trim()] = valueParts.join('=').trim();
        }
    });
} else {
    console.log('🌐 Archivo .env no encontrado. Usando variables de entorno del sistema (CI/CD)...');
    env = {
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
    };
}

// Validar que las variables necesarias existan
if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    console.error('❌ Error: No se encontraron las variables SUPABASE_URL o SUPABASE_ANON_KEY.');
    console.error('Asegúrate de configurarlas en el panel de Netlify (Site Settings > Environment Variables).');
    process.exit(1);
}

// Leer el template
const templatePath = path.join(__dirname, 'supabase-config.template.js');
if (!fs.existsSync(templatePath)) {
    console.error('❌ Error: No se encontró supabase-config.template.js');
    process.exit(1);
}

let configContent = fs.readFileSync(templatePath, 'utf8');

// Reemplazar placeholders
configContent = configContent.replace('__SUPABASE_URL__', env.SUPABASE_URL);
configContent = configContent.replace('__SUPABASE_ANON_KEY__', env.SUPABASE_ANON_KEY);

// Guardar el config real
fs.writeFileSync(path.join(__dirname, 'supabase-config.js'), configContent);

console.log('✅ supabase-config.js generado exitosamente.');
