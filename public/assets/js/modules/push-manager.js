/**
 * 🔔 PUSH NOTIFICATION MANAGER
 * PNL Biobío - Digital Platform
 */

const VAPID_PUBLIC_KEY = 'BG5gsJgsZ0t3Tu1GfWFYuHtDNAlkJXrMq0m_-3vPobewZaTzdqoHC8jC0elHKSyyhZ9_1Ov4VZacPUgwxEXcLuw';

export class PushNotificationManager {
    constructor() {
        this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
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
        if (!this.checkSupport()) return false;
        if (Notification.permission === 'granted') return true;
        try {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        } catch (err) {
            console.error('Error pidiendo permiso:', err);
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
        if (!this.checkSupport()) return null;
        try {
            const registration = await navigator.serviceWorker.ready;
            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisuallyIndicatesState: true,
                    applicationServerKey: this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
                });
            }

            await this.saveSubscriptionToDB(subscription);
            return subscription;
        } catch (error) {
            console.error('❌ Error al suscribir a push:', error);
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
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        return !!subscription;
    }

    async unsubscribe() {
        if (!this.checkSupport()) return false;
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
                // Marcar como inactiva en BD
                if (window.supabaseClient && window.isSupabaseInit) {
                    await window.supabaseClient
                        .from('push_subscriptions')
                        .update({ is_active: false })
                        .eq('endpoint', subscription.endpoint);
                }
            }
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
