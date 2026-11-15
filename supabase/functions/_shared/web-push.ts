// Envio Web Push estandar (RFC 8291 aes128gcm + VAPID RFC 8292) compartido por las edge functions.
import webpush from "npm:web-push@3.6.7"

export interface PushSubscriptionRow { id: string; endpoint: string; keys_p256dh: string; keys_auth: string }
export interface PushPayload { title: string; body: string; url: string; tag?: string; icon?: string }
export interface PushResult { sent: number; failed: number; expiredIds: string[] }

const TTL_SECONDS = 86400

let vapidDetails: { subject: string; publicKey: string; privateKey: string } | null = null

export function configureVapid(publicKey: string, privateKey: string, subject: string): void {
    vapidDetails = { subject, publicKey, privateKey }
}

function toSubscription(sub: PushSubscriptionRow) {
    return { endpoint: sub.endpoint, keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth } }
}

function requireVapid() {
    if (!vapidDetails) throw new Error("configureVapid debe llamarse antes de enviar")
    return vapidDetails
}

export function buildRequest(sub: PushSubscriptionRow, payload: PushPayload) {
    return webpush.generateRequestDetails(toSubscription(sub), JSON.stringify(payload), {
        vapidDetails: requireVapid(),
        TTL: TTL_SECONDS,
    })
}

export async function sendToSubscriptions(subs: PushSubscriptionRow[], payload: PushPayload): Promise<PushResult> {
    const vapid = requireVapid()
    const body = JSON.stringify(payload)
    const result: PushResult = { sent: 0, failed: 0, expiredIds: [] }

    for (const sub of subs) {
        try {
            const res = await webpush.sendNotification(toSubscription(sub), body, { vapidDetails: vapid, TTL: TTL_SECONDS })
            if (res.statusCode >= 200 && res.statusCode < 300) result.sent++
            else {
                console.warn(`[web-push] ${sub.id}: HTTP ${res.statusCode}`)
                result.failed++
            }
        } catch (err: any) {
            result.failed++
            if (err?.statusCode === 404 || err?.statusCode === 410) result.expiredIds.push(sub.id)
            else console.error(`[web-push] ${sub.id}: ${err?.statusCode ?? ""} ${err?.message ?? err}`)
        }
    }
    return result
}
