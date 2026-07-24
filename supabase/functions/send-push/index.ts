import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// ---------------------------------------------------------------------------
// Utilidades VAPID / Web Push (implementadas manualmente para Deno)
// Evita depender de npm:web-push que requiere Node.js crypto nativo.
// ---------------------------------------------------------------------------

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = atob(base64)
    const output = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i)
    return output
}

function uint8ArrayToBase64Url(arr: Uint8Array): string {
    let str = ''
    arr.forEach(b => str += String.fromCharCode(b))
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function importVapidPrivateKey(vapidPrivateKeyB64: string): Promise<CryptoKey> {
    const keyBytes = urlBase64ToUint8Array(vapidPrivateKeyB64)
    return crypto.subtle.importKey(
        'pkcs8',
        keyBytes,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
    )
}

async function buildVapidHeader(audience: string, subject: string, privateKey: CryptoKey, publicKeyB64: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000)
    const header = { typ: 'JWT', alg: 'ES256' }
    const payload = { aud: audience, exp: now + 12 * 3600, sub: subject }
    const encode = (obj: object) => uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(obj)))
    const unsigned = `${encode(header)}.${encode(payload)}`
    const signature = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        privateKey,
        new TextEncoder().encode(unsigned)
    )
    const jwt = `${unsigned}.${uint8ArrayToBase64Url(new Uint8Array(signature))}`
    return `vapid t=${jwt},k=${publicKeyB64}`
}

// Cifrado ECDH + AES-GCM para web push
async function encryptPayload(
    subscriptionPublicKey: string,
    subscriptionAuth: string,
    plaintext: string
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; localPublicKeyBytes: Uint8Array }> {
    const recipientPublicKeyBytes = urlBase64ToUint8Array(subscriptionPublicKey)
    const authBytes = urlBase64ToUint8Array(subscriptionAuth)

    const recipientPublicKey = await crypto.subtle.importKey(
        'raw', recipientPublicKeyBytes,
        { name: 'ECDH', namedCurve: 'P-256' },
        false, []
    )

    const localKeyPair = await crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        true, ['deriveKey', 'deriveBits']
    )
    const localPublicKeyBytes = new Uint8Array(
        await crypto.subtle.exportKey('raw', localKeyPair.publicKey)
    )

    const sharedSecret = await crypto.subtle.deriveBits(
        { name: 'ECDH', public: recipientPublicKey },
        localKeyPair.privateKey, 256
    )

    const salt = crypto.getRandomValues(new Uint8Array(16))

    // HKDF para derivar la clave de contenido y nonce
    const hkdfKey = await crypto.subtle.importKey('raw', sharedSecret, { name: 'HKDF' }, false, ['deriveBits'])

    const prk = async (info: string, length: number) => {
        const infoBytes = new TextEncoder().encode(info)
        const combined = new Uint8Array([...authBytes, ...salt, ...infoBytes, 0x01])
        return new Uint8Array(await crypto.subtle.deriveBits(
            { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: combined },
            hkdfKey, length * 8
        ))
    }

    const contentEncKey = await prk('Content-Encoding: aesgcm\0', 16)
    const nonce = await prk('Content-Encoding: nonce\0', 12)

    const aesKey = await crypto.subtle.importKey('raw', contentEncKey, 'AES-GCM', false, ['encrypt'])
    const ptBytes = new TextEncoder().encode(plaintext)
    const padded = new Uint8Array(2 + ptBytes.length)
    padded.set(ptBytes, 2)

    const ciphertext = new Uint8Array(
        await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, padded)
    )

    return { ciphertext, salt, localPublicKeyBytes }
}

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS = [
    'https://nacionallibertariobiobio.cl',
    'https://www.nacionallibertariobiobio.cl',
    'https://pnl-biobio.netlify.app',
]

function getCorsHeaders(req: Request): Record<string, string> {
    const origin = req.headers.get('origin') ?? ''
    const allowed = ALLOWED_ORIGINS.includes(origin) ||
        /^https:\/\/[a-z0-9-]+-pnl-biobio\.netlify\.app$/.test(origin) ||
        /^http:\/\/localhost(:\d+)?$/.test(origin)
    return {
        'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0],
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }
}

const ADMIN_ROLES = ['super_admin', 'admin']

// ---------------------------------------------------------------------------
// Handler principal
// ---------------------------------------------------------------------------
serve(async (req: Request) => {
    const cors = getCorsHeaders(req)
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

    try {
        // Leer secrets VAPID
        const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
        const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
        const VAPID_EMAIL = Deno.env.get('VAPID_EMAIL') ?? ''

        if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_EMAIL) {
            return new Response(JSON.stringify({ error: 'Faltan secrets VAPID' }), {
                status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
            })
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Verificar que el llamador es admin
        const authHeader = req.headers.get('authorization')
        if (!authHeader) return new Response(JSON.stringify({ error: 'Sin autorización' }), {
            status: 401, headers: { ...cors, 'Content-Type': 'application/json' }
        })

        const token = authHeader.replace(/^Bearer\s+/i, '')
        const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(token)
        if (authErr || !caller) return new Response(JSON.stringify({ error: 'Token inválido' }), {
            status: 401, headers: { ...cors, 'Content-Type': 'application/json' }
        })

        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('auth_id', caller.id)
            .maybeSingle()

        if (!profile || !ADMIN_ROLES.includes(profile.role)) {
            return new Response(JSON.stringify({ error: 'Requiere rol admin' }), {
                status: 403, headers: { ...cors, 'Content-Type': 'application/json' }
            })
        }

        const body = await req.json()
        const { title, message, url = '/', topic = 'pnl-general' } = body

        if (!title || !message) throw new Error('title y message son requeridos')

        // Obtener suscripciones activas
        const { data: subs, error: subsErr } = await supabaseAdmin
            .from('push_subscriptions')
            .select('id, endpoint, keys_p256dh, keys_auth')
            .eq('is_active', true)

        if (subsErr) throw new Error(`Error al obtener suscripciones: ${subsErr.message}`)
        if (!subs || subs.length === 0) {
            return new Response(JSON.stringify({ sent: 0, message: 'Sin suscriptores activos' }), {
                status: 200, headers: { ...cors, 'Content-Type': 'application/json' }
            })
        }

        // Importar clave privada VAPID
        const privateKey = await importVapidPrivateKey(VAPID_PRIVATE_KEY)
        const payload = JSON.stringify({ title, body: message, url, tag: topic, icon: '/assets/images/logos/pnl-del-biobio01.webp' })

        let sent = 0
        let failed = 0
        const expiredEndpoints: string[] = []

        for (const sub of subs) {
            try {
                const pushUrl = new URL(sub.endpoint)
                const audience = `${pushUrl.protocol}//${pushUrl.host}`
                const vapidHeader = await buildVapidHeader(audience, `mailto:${VAPID_EMAIL}`, privateKey, VAPID_PUBLIC_KEY)

                // Cifrar payload
                const { ciphertext, salt, localPublicKeyBytes } = await encryptPayload(
                    sub.keys_p256dh, sub.keys_auth, payload
                )

                const res = await fetch(sub.endpoint, {
                    method: 'POST',
                    headers: {
                        Authorization: vapidHeader,
                        'Content-Type': 'application/octet-stream',
                        'Content-Encoding': 'aesgcm',
                        Encryption: `salt=${uint8ArrayToBase64Url(salt)}`,
                        'Crypto-Key': `dh=${uint8ArrayToBase64Url(localPublicKeyBytes)}`,
                        TTL: '86400',
                        Topic: topic,
                        Urgency: 'normal',
                    },
                    body: ciphertext,
                })

                if (res.status === 201 || res.status === 200) {
                    sent++
                } else if (res.status === 410 || res.status === 404) {
                    expiredEndpoints.push(sub.endpoint)
                    failed++
                } else {
                    console.warn(`[send-push] Endpoint ${sub.endpoint}: HTTP ${res.status}`)
                    failed++
                }
            } catch (err: any) {
                console.error(`[send-push] Error con endpoint: ${err.message}`)
                failed++
            }
        }

        // Limpiar suscripciones expiradas (410/404)
        if (expiredEndpoints.length > 0) {
            await supabaseAdmin
                .from('push_subscriptions')
                .update({ is_active: false })
                .in('endpoint', expiredEndpoints)
            console.log(`[send-push] Marcadas inactivas: ${expiredEndpoints.length}`)
        }

        // Registrar en log
        await supabaseAdmin.from('push_notifications_log').insert({
            title, body: message, url, topic,
            sent_count: sent, failed_count: failed,
            sent_by: caller.id
        }).select()

        return new Response(JSON.stringify({ sent, failed, total: subs.length }), {
            status: 200, headers: { ...cors, 'Content-Type': 'application/json' }
        })

    } catch (error: any) {
        console.error('[send-push] Error:', error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
        })
    }
})
