import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { configureVapid, sendToSubscriptions } from "../_shared/web-push.ts"
import {
    BIRTHDAY_IMAGE_URL,
    buildGreeting,
    celebrationsInWindow,
    EMAIL_REPLY_TO,
    emailNeedsSend,
    GREETINGS_START_DATE,
    INBOX_PATH,
    isGreetingComplete,
    localNow,
    monthDaysForWindow,
    pushNeedsSend,
    SEND_HOUR,
    windowDates,
} from "./greeting.ts"

const EMAIL_FROM = "PNL Biobío <comunicaciones@nacionallibertariobiobio.cl>"
const EMAIL_DELAY_MS = 600
// A registry row touched less than this long ago belongs to a run still in progress.
const CLAIM_LEASE_MS = 10 * 60 * 1000
const REGISTRY_COLUMNS = "id, inbox_log_id, push_status, email_status"

interface Person { profile_id: string; auth_id: string; full_name: string; email: string | null; birth_date: string }
interface Registry {
    id: string | null
    inbox_log_id: string | null
    push_status: string
    email_status: string
}
interface Outcome { inbox: string; push: string; email: string; errors: string[] }
/** Persists one channel's progress; throws if the registry could not be written. */
type SaveProgress = (patch: Record<string, unknown>) => Promise<void>

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

    /**
     * Sends whatever channels are still pending. Each channel's result is saved right after it
     * finishes, so a crash or timeout later in the run never makes the next run repeat it.
     * A failed save throws and stops this person, to avoid sending further unrecorded channels.
     */
    async function deliver(person: Person, reg: Registry, save: SaveProgress): Promise<Outcome> {
        const g = buildGreeting(person.full_name)
        const out: Outcome = { inbox: "skipped", push: reg.push_status, email: reg.email_status, errors: [] }
        // last_error is only overwritten when this run produced errors; skipped channels keep the old one.
        const withErrors = (patch: Record<string, unknown>) =>
            out.errors.length ? { ...patch, last_error: out.errors.join(" | ").slice(0, 1000) } : patch

        // Inbox
        if (!reg.inbox_log_id) {
            let created = false
            try {
                // A null recipient_id is a broadcast to every inbox: never allow it for a personal greeting.
                if (!person.auth_id) throw new Error("missing recipient auth_id")
                const { data, error } = await supabase.from("push_notifications_log").insert({
                    title: g.title, body: g.inboxBody, url: INBOX_PATH, recipient_id: person.auth_id,
                    image_url: BIRTHDAY_IMAGE_URL, target_audience: "all", total_sent: 0, total_failed: 0,
                }).select("id").single()
                if (error) throw new Error(error.message)
                reg.inbox_log_id = data.id
                out.inbox = "created"
                created = true
            } catch (e: any) {
                out.inbox = "failed"
                out.errors.push(`inbox: ${e.message}`)
            }
            await save(withErrors(created ? { inbox_log_id: reg.inbox_log_id } : {}))
        } else out.inbox = "existing"

        // Push
        if (pushNeedsSend(reg.push_status)) {
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
                            const { error: deactivateErr } = await supabase.from("push_subscriptions")
                                .update({ is_active: false }).in("id", r.expiredIds)
                            if (deactivateErr) {
                                console.error(`[birthday] could not deactivate ${r.expiredIds.length} expired subscriptions: ${deactivateErr.message}`)
                            }
                        }
                        out.push = r.sent > 0 ? "sent" : "failed"
                        if (r.sent === 0) out.errors.push(`push: 0 of ${subs.length} delivered`)
                    }
                }
            } catch (e: any) {
                out.push = "failed"
                out.errors.push(`push: ${e.message}`)
            }
            await save(withErrors({ push_status: out.push }))
        }

        // Email
        if (emailNeedsSend(reg.email_status) && !quotaHit) {
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
                            from: EMAIL_FROM, reply_to: EMAIL_REPLY_TO, to: [person.email], subject: g.emailSubject,
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
            await save(withErrors({ email_status: out.email }))
        }
        return out
    }

    /**
     * Returns the registry row this run may work on, or null to skip the person.
     * - A row this run just inserted is ours: (profile_id, greeting_year) is unique, so no other run created it.
     * - A completed row is skipped untouched.
     * - Any other row is claimed only if nobody touched it in the last CLAIM_LEASE_MS (every progress
     *   save refreshes updated_at). The conditional update is atomic in Postgres, so when two runs
     *   overlap only one of them gets the row back.
     */
    async function claimRegistry(profileId: string, year: number, date: string): Promise<Registry | null> {
        const { data: inserted, error: insertErr } = await supabase.from("birthday_greetings")
            .upsert(
                { profile_id: profileId, greeting_year: year, celebration_date: date },
                { onConflict: "profile_id,greeting_year", ignoreDuplicates: true },
            )
            .select(REGISTRY_COLUMNS)
        if (insertErr) throw new Error(`registry insert: ${insertErr.message}`)
        if (inserted && inserted.length > 0) return inserted[0]

        const { data: current, error: readErr } = await supabase.from("birthday_greetings")
            .select(REGISTRY_COLUMNS).eq("profile_id", profileId).eq("greeting_year", year).single()
        if (readErr) throw new Error(`registry read: ${readErr.message}`)
        if (isGreetingComplete(current)) return null

        const cutoff = new Date(Date.now() - CLAIM_LEASE_MS).toISOString()
        const { data: claimed, error: claimErr } = await supabase.from("birthday_greetings")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", current.id).lt("updated_at", cutoff)
            .select(REGISTRY_COLUMNS).maybeSingle()
        if (claimErr) throw new Error(`registry claim: ${claimErr.message}`)
        if (!claimed) console.warn(`[birthday] skipping profile=${profileId}: registry row in use by another run`)
        return claimed
    }

    // --- Test modes: one profile, now, no registry --------------------------
    if (isTest) {
        const q = supabase.from("profiles").select("id, auth_id, full_name, email, birth_date")
        const { data: p, error } = await (testSelf ? q.eq("auth_id", callerAuthId!) : q.eq("id", testProfileId!)).maybeSingle()
        if (error || !p || !p.auth_id) return json({ error: "Profile not found" }, 404)
        const person: Person = {
            profile_id: p.id, auth_id: p.auth_id, full_name: p.full_name ?? "", email: p.email, birth_date: p.birth_date,
        }
        const noRegistry: SaveProgress = async () => {}
        const out = await deliver(
            person, { id: null, inbox_log_id: null, push_status: "pending", email_status: "pending" }, noRegistry,
        )
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
        if (!person.auth_id) {
            console.warn(`[birthday] skipping profile=${person.profile_id}: no auth account`)
            continue
        }
        processed++
        try {
            const row = await claimRegistry(person.profile_id, cel.greetingYear, cel.celebrationDate)
            if (!row) continue

            const save: SaveProgress = async (patch) => {
                const { error } = await supabase.from("birthday_greetings")
                    .update({ ...patch, updated_at: new Date().toISOString() }).eq("id", row.id)
                if (error) throw new Error(`registry update: ${error.message}`)
            }
            const out = await deliver(person, row, save)
            if (out.inbox === "created") inbox++
            if (out.push === "sent") push++
            if (out.email === "sent") email++
        } catch (e: any) {
            console.error(`[birthday] profile=${person.profile_id} failed: ${e.message}`)
        }
    }

    console.log(`[birthday] date=${now.date} processed=${processed} inbox=${inbox} push=${push} email=${email} quotaHit=${quotaHit}`)
    return json({ processed, inbox, push, email })
})
