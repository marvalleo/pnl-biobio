/**
 * 🔔 PUSH NOTIFICATION MANAGER
 * PNL Biobío - Digital Platform
 */

const VAPID_PUBLIC_KEY = 'BG5gsJgsZ0t3Tu1GfWFYuHtDNAlkJXrMq0m_-3vPobewZaTzdqoHC8jC0elHKSyyhZ9_1Ov4VZacPUgwxEXcLuw';

export class PushNotificationManager {
    constructor() {
        const hasSW = 'serviceWorker' in navigator;
        const hasPush = 'PushManager' in window;
        const hasNotif = 'Notification' in window;
        const isSecure = window.isSecureContext;

        this.isSupported = hasSW && hasPush;

        // Imprimir siempre en la inicialización para saber qué falló en el móvil
        console.log(`PNL Push Manager: Iniciando clase...`);
        console.log(`PNL Push Manager: isSecureContext = ${isSecure}`);
        console.log(`PNL Push Manager: serviceWorker = ${hasSW}`);
        console.log(`PNL Push Manager: PushManager = ${hasPush}`);
        console.log(`PNL Push Manager: Notification = ${hasNotif}`);
        console.log(`PNL Push Manager: isSupported Final = ${this.isSupported}`);
    }

    checkSupport() {
        return this.isSupported;
    }

    getPermissionStatus() {
        return Notification.permission;
    }

    isIOS() {
        const ua = navigator.userAgent;
        return /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    }

    isStandalone() {
        return window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    }

    async requestPermission() {
        console.log('PNL Push Manager: requestPermission() invocado. checkSupport() =', this.checkSupport());
        if (!this.checkSupport()) {
            console.warn('PNL Push Manager: El navegador no soporta ServiceWorkers o PushManager.');
            return false;
        }

        console.log('PNL Push Manager: Permiso actual:', Notification.permission);
        if (Notification.permission === 'granted') return true;

        try {
            console.log('PNL Push Manager: Solicitando permiso al navegador...');
            const permission = await new Promise((resolve) => {
                const permissionResult = Notification.requestPermission((result) => {
                    resolve(result);
                });

                if (permissionResult) {
                    permissionResult.then(resolve);
                }
            });

            console.log('PNL Push Manager: Respuesta del usuario al prompt:', permission);
            return permission === 'granted';
        } catch (err) {
            console.error('PNL Push Manager: Error pidiendo permiso:', err);
            return false;
        }
    }

    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    async subscribe() {
        const lg = (msg) => {
            console.log(msg);
            if (window.pnlLog) window.pnlLog(msg);
        };
        const errLg = (msg, err) => {
            console.error(msg, err);
            if (window.pnlLog) window.pnlLog('ERROR FATAL: ' + msg + ' ' + (err?.message || err));
        };

        if (!this.checkSupport()) return null;
        lg('PNL Push Manager: Iniciando subscribe() interno...');
        try {
            lg('PNL Push Manager: Asegurando registro explícito de /sw.js...');
            await navigator.serviceWorker.register('/sw.js'); // FORZAR REGISTRO
            lg('PNL Push Manager: Esperando a navigator.serviceWorker.ready...');
            const registration = await navigator.serviceWorker.ready;
            lg('PNL Push Manager: registration listo. Revisando suscripciones existentes...');

            let subscription = await registration.pushManager.getSubscription();
            lg('PNL Push Manager: Resultado de getSubscription() -> ' + !!subscription);

            if (!subscription) {
                lg('PNL Push Manager: No hay suscripción previa. Generando nueva con PushManager...');
                try {
                    const convertedKey = this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
                    lg('PNL Push Manager: Llave VAPID convertida exitosamente.');
                    subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: convertedKey
                    });
                    lg('PNL Push Manager: ✅ Suscripción creada con éxito.');
                } catch (subErr) {
                    errLg('PNL Push Manager: ❌ Fallo fatal dentro de registration.pushManager.subscribe()', subErr);
                    throw subErr; // Lanzar para atrapar en el catch exterior
                }
            }

            lg('PNL Push Manager: Guardando token de suscripción en la base de datos...');
            await this.saveSubscriptionToDB(subscription);
            lg('PNL Push Manager: Token guardado exitosamente.');

            // Marcar en localStorage para que el toggle persista aunque isSubscribed() tarde
            localStorage.setItem('pnl_push_subscribed', 'true');
            lg('PNL Push Manager: Proceso de suscripción finalizado por completo.');
            return subscription;
        } catch (error) {
            errLg('❌ Error general al suscribir a push', error);
            return null;
        }
    }

    async saveSubscriptionToDB(subscription) {
        if (!window.supabaseClient || !window.isSupabaseInit) return;
        try {
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            if (!user) return;

            const subJson = subscription.toJSON();
            const { error } = await window.supabaseClient
                .from('push_subscriptions')
                .upsert({
                    user_id: user.id,
                    endpoint: subJson.endpoint,
                    keys_p256dh: subJson.keys.p256dh,
                    keys_auth: subJson.keys.auth,
                    user_agent: navigator.userAgent,
                    is_active: true,
                    last_used_at: new Date().toISOString()
                }, {
                    onConflict: 'endpoint'
                });

            if (error) throw error;
        } catch (err) {
            console.error('Error guardando en suscripciones:', err);
        }
    }

    async isSubscribed() {
        if (!this.checkSupport()) return false;
        try {
            await navigator.serviceWorker.register('/sw.js');
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            const result = !!subscription;
            // Sincronizar caché local
            if (result) localStorage.setItem('pnl_push_subscribed', 'true');
            else localStorage.removeItem('pnl_push_subscribed');
            return result;
        } catch {
            // Usar caché como fallback si el SW no responde a tiempo
            return localStorage.getItem('pnl_push_subscribed') === 'true';
        }
    }

    async unsubscribe() {
        if (!this.checkSupport()) return false;
        try {
            await navigator.serviceWorker.register('/sw.js');
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
                if (window.supabaseClient && window.isSupabaseInit) {
                    await window.supabaseClient
                        .from('push_subscriptions')
                        .update({ is_active: false })
                        .eq('endpoint', subscription.endpoint);
                }
            }
            localStorage.removeItem('pnl_push_subscribed');
            return true;
        } catch (err) {
            console.error('Error al desuscribir:', err);
            return false;
        }
    }

    // Retorna el número de notificaciones enviadas desde la última vez que el usuario abrió el menú
    async getUnreadCount() {
        try {
            if (!window.supabaseClient || !window.isSupabaseInit) return 0;
            const lastSeen = localStorage.getItem('pnl_last_notif_seen') || '1970-01-01T00:00:00Z';
            const { count, error } = await window.supabaseClient
                .from('push_notifications_log')
                .select('*', { count: 'exact', head: true })
                .gt('created_at', lastSeen);
            if (error) return 0;
            return count ?? 0;
        } catch {
            return 0;
        }
    }

    // Marca todas las notificaciones como vistas guardando el timestamp actual
    markAllAsRead() {
        localStorage.setItem('pnl_last_notif_seen', new Date().toISOString());
    }
}
