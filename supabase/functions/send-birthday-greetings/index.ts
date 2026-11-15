import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { configureVapid, sendToSubscriptions } from "../_shared/web-push.ts"
import {
    BIRTHDAY_IMAGE_URL,
    buildGreeting,
    celebrationsInWindow,
    GREETINGS_START_DATE,
    INBOX_PATH,
    localNow,
    monthDaysForWindow,
    SEND_HOUR,
    windowDates,
} from "./greeting.ts"

const EMAIL_FROM = "PNL Biobío <comunicaciones@nacionallibertariobiobio.cl>"
const EMAIL_DELAY_MS = 600

interface Person { profile_id: string; auth_id: string; full_name: string; email: string | null; birth_date: string }
interface Registry {
    id: string | null
    inbox_log_id: string | null
    push_status: string
    email_status: string
}
interface Outcome { inbox: string; push: string; email: string; errors: string[] }

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Constant-time comparison; an empty expected secret never matches. */
function secretMatches(provided: string | null, expected: string): boolean {
    if (!expected || !provided) return false
    const enc = new TextEncoder()
    const a = enc.encode(provided)
    const b = enc.encode(expected)
    let diff = a.length ^ b.length
    for (let i = 0; i < b.length; i++) diff |= (a[i] ?? 0) ^ b[i]
    return diff === 0
}

serve(async (req: Request) => {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

    const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    )

    let body: any = {}
    try { body = await req.json() } catch { body = {} }

    // --- Authentication -----------------------------------------------------
    const isCron = secretMatches(req.headers.get("x-cron-secret"), Deno.env.get("BIRTHDAY_CRON_SECRET") ?? "")
    let callerAuthId: string | null = null
    if (!isCron) {
        const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "")
        if (!token) return json({ error: "Unauthorized" }, 401)
        const { data: { user }, error } = await supabase.auth.getUser(token)
        if (error || !user) return json({ error: "Unauthorized" }, 401)
        const { data: caller } = await supabase.from("profiles").select("role").eq("auth_id", user.id).maybeSingle()
        if (caller?.role !== "super_admin") return json({ error: "Unauthorized" }, 401)
        callerAuthId = user.id
    }

    const testSelf = !isCron && body?.test_self === true
    const testProfileId = isCron && typeof body?.test_profile_id === "string" ? body.test_profile_id : null
    if (!isCron && !testSelf) return json({ error: "Unauthorized" }, 401)
    const isTest = testSelf || !!testProfileId

    // --- Push configuration (missing secrets must not stop the run) ----------
    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY") ?? ""
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY") ?? ""
    const vapidEmail = Deno.env.get("VAPID_EMAIL") ?? ""
    const vapidOk = !!(vapidPublic && vapidPrivate && vapidEmail)
    if (vapidOk) configureVapid(vapidPublic, vapidPrivate, `mailto:${vapidEmail}`)

    const resendKey = Deno.env.get("RESEND_API_KEY") ?? ""
    let quotaHit = false
    let emailsSent = 0

    async function deliver(person: Person, reg: Registry): Promise<Outcome> {
        const g = buildGreeting(person.full_name)
        const out: Outcome = { inbox: "skipped", push: reg.push_status, email: reg.email_status, errors: [] }

        // Inbox
        if (!reg.inbox_log_id) {
            try {
                const { data, error } = await supabase.from("push_notifications_log").insert({
                    title: g.title, body: g.inboxBody, url: INBOX_PATH, recipient_id: person.auth_id,
                    image_url: BIRTHDAY_IMAGE_URL, target_audience: "all", total_sent: 0, total_failed: 0,
                }).select("id").single()
                if (error) throw new Error(error.message)
                reg.inbox_log_id = data.id
                out.inbox = "created"
            } catch (e: any) {
                out.inbox = "failed"
                out.errors.push(`inbox: ${e.message}`)
            }
        } else out.inbox = "existing"

        // Push
        if (reg.push_status === "pending" || reg.push_status === "failed") {
            try {
                if (!vapidOk) {
                    out.push = "failed"
                    out.errors.push("VAPID secrets missing")
                } else {
                    const { data: subs, error } = await supabase.from("push_subscriptions")
                        .select("id, endpoint, keys_p256dh, keys_auth")
                        .eq("user_id", person.auth_id).eq("is_active", true)
                    if (error) throw new Error(error.message)
                    if (!subs || subs.length === 0) out.push = "no_subscription"
                    else {
                        const r = await sendToSubscriptions(subs, {
                            title: g.title, body: g.pushBody, url: INBOX_PATH, tag: "pnl-birthday",
                        })
                        if (r.expiredIds.length > 0) {
                            await supabase.from("push_subscriptions").update({ is_active: false }).in("id", r.expiredIds)
                        }
                        out.push = r.sent > 0 ? "sent" : "failed"
                        if (r.sent === 0) out.errors.push(`push: 0 of ${subs.length} delivered`)
                    }
                }
            } catch (e: any) {
                out.push = "failed"
                out.errors.push(`push: ${e.message}`)
            }
        }

        // Email
        if (["pending", "failed", "skipped_quota"].includes(reg.email_status) && !quotaHit) {
            try {
                if (!person.email) out.email = "no_email"
                else if (!resendKey) {
                    out.email = "failed"
                    out.errors.push("email: RESEND_API_KEY missing")
                } else {
                    if (emailsSent > 0) await sleep(EMAIL_DELAY_MS)
                    emailsSent++
                    const res = await fetch("https://api.resend.com/emails", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
                        body: JSON.stringify({
                            from: EMAIL_FROM, to: [person.email], subject: g.emailSubject,
                            html: g.emailHtml, text: g.emailText,
                        }),
                    })
                    if (res.ok) out.email = "sent"
                    else if (res.status === 429) {
                        out.email = "skipped_quota"
                        quotaHit = true
                    } else {
                        out.email = "failed"
                        out.errors.push(`email: Resend ${res.status} ${(await res.text()).slice(0, 300)}`)
                    }
                }
            } catch (e: any) {
                out.email = "failed"
                out.errors.push(`email: ${e.message}`)
            }
        }
        return out
    }

    // --- Test modes: one profile, now, no registry --------------------------
    if (isTest) {
        const q = supabase.from("profiles").select("id, auth_id, full_name, email, birth_date")
        const { data: p, error } = await (testSelf ? q.eq("auth_id", callerAuthId!) : q.eq("id", testProfileId!)).maybeSingle()
        if (error || !p || !p.auth_id) return json({ error: "Profile not found" }, 404)
        const person: Person = {
            profile_id: p.id, auth_id: p.auth_id, full_name: p.full_name ?? "", email: p.email, birth_date: p.birth_date,
        }
        const out = await deliver(person, { id: null, inbox_log_id: null, push_status: "pending", email_status: "pending" })
        console.log(`[birthday] test profile=${person.profile_id} inbox=${out.inbox} push=${out.push} email=${out.email}`)
        return json({ test: true, ...out })
    }

    // --- Scheduled run ------------------------------------------------------
    const now = localNow(new Date())
    if (now.hour < SEND_HOUR) return json({ status: "before_send_hour" })

    const window = windowDates(now.date)
    const { data: rows, error: rpcErr } = await supabase.rpc("list_birthday_profiles", {
        p_month_days: monthDaysForWindow(window),
    })
    if (rpcErr) {
        console.error(`[birthday] list_birthday_profiles failed: ${rpcErr.message}`)
        return json({ error: "Could not list birthdays" }, 500)
    }

    let processed = 0, inbox = 0, push = 0, email = 0
    for (const person of (rows ?? []) as Person[]) {
        const cel = celebrationsInWindow(person.birth_date, window, GREETINGS_START_DATE)
        if (!cel) continue
        processed++
        try {
            await supabase.from("birthday_greetings").upsert(
                { profile_id: person.profile_id, greeting_year: cel.greetingYear, celebration_date: cel.celebrationDate },
                { onConflict: "profile_id,greeting_year", ignoreDuplicates: true },
            )
            const { data: row, error } = await supabase.from("birthday_greetings")
                .select("id, inbox_log_id, push_status, email_status")
                .eq("profile_id", person.profile_id).eq("greeting_year", cel.greetingYear).single()
            if (error) throw new Error(error.message)

            const done = row.inbox_log_id &&
                !["pending", "failed"].includes(row.push_status) &&
                !["pending", "failed", "skipped_quota"].includes(row.email_status)
            if (done) continue

            const hadInbox = !!row.inbox_log_id
            const out = await deliver(person, row)
            if (!hadInbox && row.inbox_log_id) inbox++
            if (out.push === "sent") push++
            if (out.email === "sent") email++

            const { error: upErr } = await supabase.from("birthday_greetings").update({
                inbox_log_id: row.inbox_log_id,
                push_status: out.push,
                email_status: out.email,
                last_error: out.errors.length ? out.errors.join(" | ").slice(0, 1000) : null,
                updated_at: new Date().toISOString(),
            }).eq("id", row.id)
            if (upErr) throw new Error(upErr.message)
        } catch (e: any) {
            console.error(`[birthday] profile=${person.profile_id} failed: ${e.message}`)
        }
    }

    console.log(`[birthday] date=${now.date} processed=${processed} inbox=${inbox} push=${push} email=${email} quotaHit=${quotaHit}`)
    return json({ processed, inbox, push, email })
})
