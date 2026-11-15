import { buildRequest, configureVapid } from "./web-push.ts"

function b64url(bytes: Uint8Array): string {
    let s = ""
    bytes.forEach((b) => (s += String.fromCharCode(b)))
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
}

async function generateVapid() {
    const pair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])
    const pub = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey))
    const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey)
    return { publicKey: b64url(pub), privateKey: jwk.d! }
}

Deno.test("encrypts a payload for a valid subscription", async () => {
    const vapid = await generateVapid()
    configureVapid(vapid.publicKey, vapid.privateKey, "mailto:test@example.com")

    const pair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])
    const p256dh = b64url(new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey)))
    const auth = b64url(crypto.getRandomValues(new Uint8Array(16)))

    const req = buildRequest(
        { id: "1", endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys_p256dh: p256dh, keys_auth: auth },
        { title: "Hola", body: "Mundo", url: "/" },
    )

    if (req.method !== "POST") throw new Error(`method ${req.method}`)
    if (req.headers["Content-Encoding"] !== "aes128gcm") throw new Error(`encoding ${req.headers["Content-Encoding"]}`)
    if (!String(req.headers.Authorization).startsWith("vapid t=")) throw new Error("no vapid header")
    if (!(req.body.byteLength > 0)) throw new Error("empty body")
})
