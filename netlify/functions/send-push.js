const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
    // 0. Validar variables de entorno críticas al inicio del handler
    const { VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
    if (!VAPID_SUBJECT || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        console.error('Error: Variables de entorno VAPID no configuradas.');
        return { statusCode: 500, body: JSON.stringify({ error: 'Configuración VAPID incompleta en el servidor.' }) };
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        console.error('Error: Variables de entorno de Supabase no configuradas.');
        return { statusCode: 500, body: JSON.stringify({ error: 'Configuración de base de datos incompleta.' }) };
    }

    // Inicializar web-push con VAPID DENTRO del handler (evita crash en módulo global)
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    // Cliente Supabase con Service Role (permite saltar RLS para leer todas las suscripciones)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Solo permitir métodos POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Método no permitido' };
    }

    // 2. Verificar autenticación del administrador
    const authHeader = event.headers.authorization;
    if (!authHeader) {
        return { statusCode: 401, body: 'No autorizado: Falta token' };
    }

    try {
        const token = authHeader.replace('Bearer ', '');

        // Obtener el usuario desde el auth de Supabase
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return { statusCode: 401, body: 'Token inválido o expirado' };
        }

        // Verificar si el usuario tiene rol administrativo
        // Consultamos directamente la tabla profiles usando el auth_id del usuario
        const { data: profile, error: roleError } = await supabase
            .from('profiles')
            .select('role')
            .eq('auth_id', user.id)
            .single();

        const allowedRoles = ['super_admin', 'admin', 'admin_usuarios'];
        if (roleError || !profile || !allowedRoles.includes(profile.role)) {
            return { statusCode: 403, body: 'Prohibido: Se requiere rol administrativo' };
        }

        // 3. Parsear el cuerpo de la notificación
        const { title, body, url, icon, tag } = JSON.parse(event.body);
        if (!title || !body) {
            return { statusCode: 400, body: 'Título y mensaje son obligatorios' };
        }

        // 4. Obtener las suscripciones activas de la base de datos
        const { data: subscriptions, error: subError } = await supabase
            .from('push_subscriptions')
            .select('endpoint, keys_p256dh, keys_auth')
            .eq('is_active', true);

        if (subError) throw subError;

        // 5. Preparar el payload de la notificación
        const notificationPayload = JSON.stringify({
            title,
            body,
            icon: icon || 'https://pnl-biobio.netlify.app/assets/images/logos/pnl-del-biobio01.png',
            badge: 'https://pnl-biobio.netlify.app/assets/images/logos/favicon-100x100.jpg',
            url: url || 'https://pnl-biobio.netlify.app/',
            tag: tag || 'pnl-general'
        });

        // 6. Enviar notificaciones en paralelo
        let successCount = 0;
        let failCount = 0;
        const expiredEndpoints = [];

        await Promise.allSettled(
            subscriptions.map(async (sub) => {
                const pushConfig = {
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.keys_p256dh,
                        auth: sub.keys_auth
                    }
                };

                try {
                    await webpush.sendNotification(pushConfig, notificationPayload);
                    successCount++;
                } catch (err) {
                    failCount++;
                    // Si el servidor de push nos dice que el endpoint ya no existe (404 o 410)
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        expiredEndpoints.push(sub.endpoint);
                    }
                }
            })
        );

        // 7. Limpieza automática: desactivar endpoints expirados
        if (expiredEndpoints.length > 0) {
            await supabase
                .from('push_subscriptions')
                .update({ is_active: false })
                .in('endpoint', expiredEndpoints);
        }

        // 8. Registrar el envío en el log histórico
        await supabase.from('push_notifications_log').insert({
            title,
            body,
            url: url || '/',
            sent_by: user.id,
            total_sent: successCount,
            total_failed: failCount
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                sent: successCount,
                failed: failCount,
                cleaned: expiredEndpoints.length
            })
        };

    } catch (error) {
        console.error('Push Function Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error interno del servidor al procesar el push' })
        };
    }
};
