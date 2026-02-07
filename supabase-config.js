// Configuración de Supabase para PNL Biobío
const SUPABASE_URL = "https://kjcwozzfzbizxurppxlf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_SNZ9Np8K8sq9MG1x9OMolQ_-ry_Uoc5";

// Inicializar el cliente
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
