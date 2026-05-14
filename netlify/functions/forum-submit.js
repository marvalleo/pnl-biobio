const { authenticate } = require('./_lib/auth.js');
const { sanitizeHtml, htmlToPlainText } = require('./_lib/sanitize.js');
const { moderate } = require('./_lib/ai/index.js');
const { SYSTEM_PROMPT } = require('./_lib/rules-prompt.js');

const MAX_INPUT_CHARS = parseInt(process.env.AI_MAX_INPUT_CHARS || '4000', 10);

async function logModeration(supabase, profileId, targetType, targetId, contentPreview, verdict, rulesViolated, modelUsed, rawResponse) {
    try {
        await supabase.from('forum_moderation_log').insert({
            profile_id: profileId,
            target_type: targetType,
            target_id: targetId,
            content_preview: contentPreview.substring(0, 500),
            verdict,
            rules_violated: rulesViolated,
            model_used: modelUsed,
            raw_response: rawResponse
        });
    } catch (e) {
        console.warn('[forum-submit] No se pudo loggear moderación:', e.message);
    }
}

async function insertTopic(supabase, payload) {
    return supabase.from('forum_topics')
        .insert({
            category_id: payload.category_id,
            profile_id: payload.profile_id,
            title: payload.title,
            content: payload.content,
            moderation_status: payload.moderation_status,
            moderation_notes: payload.moderation_notes
        })
        .select('id')
        .single();
}

async function insertPost(supabase, payload) {
    return supabase.from('forum_posts')
        .insert({
            topic_id: payload.topic_id,
            profile_id: payload.profile_id,
            content: payload.content,
            parent_id: payload.parent_id,
            moderation_status: payload.moderation_status,
            moderation_notes: payload.moderation_notes
        })
        .select('id')
        .single();
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ ok: false, message: 'Método no permitido' }) };
    }

    let auth;
    try {
        auth = await authenticate(event);
    } catch (err) {
        return { statusCode: err.statusCode || 500, body: JSON.stringify({ ok: false, message: err.message }) };
    }
    const { profile, supabase } = auth;

    if (!profile.accepted_forum_rules) {
        return { statusCode: 403, body: JSON.stringify({ ok: false, code: 'rules_not_accepted', message: 'Debes aceptar el reglamento del foro primero.' }) };
    }

    let body;
    try {
        body = JSON.parse(event.body);
    } catch {
        return { statusCode: 400, body: JSON.stringify({ ok: false, message: 'Body inválido' }) };
    }

    const { target_type, category_id, topic_id, parent_id, title, content } = body;

    if (target_type !== 'topic' && target_type !== 'post') {
        return { statusCode: 400, body: JSON.stringify({ ok: false, message: 'target_type debe ser "topic" o "post"' }) };
    }
    if (!content || typeof content !== 'string') {
        return { statusCode: 400, body: JSON.stringify({ ok: false, message: 'Falta content' }) };
    }
    if (target_type === 'topic' && (!category_id || !title)) {
        return { statusCode: 400, body: JSON.stringify({ ok: false, message: 'topic requiere category_id y title' }) };
    }
    if (target_type === 'post' && !topic_id) {
        return { statusCode: 400, body: JSON.stringify({ ok: false, message: 'post requiere topic_id' }) };
    }

    // 1. Sanitizar HTML
    const cleanHtml = sanitizeHtml(content);
    if (!cleanHtml.trim()) {
        return { statusCode: 400, body: JSON.stringify({ ok: false, message: 'Contenido vacío tras sanitizar' }) };
    }

    // 2. Extraer texto plano para la IA
    let plainForAI;
    if (target_type === 'topic') {
        plainForAI = `${title}\n\n${htmlToPlainText(cleanHtml)}`;
    } else {
        plainForAI = htmlToPlainText(cleanHtml);
    }
    if (plainForAI.length > MAX_INPUT_CHARS) {
        plainForAI = plainForAI.substring(0, MAX_INPUT_CHARS) + '...';
    }

    // 3. Moderar
    let verdict, rulesViolated, reason, modelUsed, rawResponse;
    let unavailable = false;
    try {
        const r = await moderate(plainForAI, SYSTEM_PROMPT);
        verdict = r.verdict;
        rulesViolated = r.rules_violated;
        reason = r.reason;
        modelUsed = r.model_used;
        rawResponse = r.raw;
    } catch (modErr) {
        console.warn('[forum-submit] Moderación falló, fail-open:', modErr.message);
        unavailable = true;
        verdict = 'unavailable';
        rulesViolated = [];
        reason = 'Bot offline';
        modelUsed = null;
        rawResponse = { error: modErr.message, primaryErr: modErr.primaryErr, fallbackErr: modErr.fallbackErr };
    }

    // 4. Decisión
    if (verdict === 'ok' || unavailable) {
        const moderation_status = unavailable ? 'pending_review' : 'clean';
        const moderation_notes = unavailable ? 'Bot offline al momento del envío, requiere revisión humana' : null;

        let insertResult;
        if (target_type === 'topic') {
            insertResult = await insertTopic(supabase, {
                category_id,
                profile_id: profile.id,
                title,
                content: cleanHtml,
                moderation_status,
                moderation_notes
            });
        } else {
            insertResult = await insertPost(supabase, {
                topic_id,
                profile_id: profile.id,
                content: cleanHtml,
                parent_id: parent_id || null,
                moderation_status,
                moderation_notes
            });
        }

        if (insertResult.error) {
            await logModeration(supabase, profile.id, target_type, null, plainForAI, unavailable ? 'unavailable' : 'clean', rulesViolated, modelUsed, rawResponse);
            return { statusCode: 500, body: JSON.stringify({ ok: false, message: insertResult.error.message }) };
        }

        await logModeration(supabase, profile.id, target_type, insertResult.data.id, plainForAI, unavailable ? 'unavailable' : 'clean', rulesViolated, modelUsed, rawResponse);

        return {
            statusCode: 200,
            body: JSON.stringify({
                ok: true,
                id: insertResult.data.id,
                verdict: unavailable ? 'pending_review' : 'clean'
            })
        };
    }

    // verdict === 'warning' o 'block': no insertar
    const logVerdict = verdict === 'warning' ? 'warned' : 'blocked';
    await logModeration(supabase, profile.id, target_type, null, plainForAI, logVerdict, rulesViolated, modelUsed, rawResponse);

    return {
        statusCode: 200,
        body: JSON.stringify({
            ok: false,
            verdict,            // 'warning' o 'block' (no se transforma para que el cliente maneje el tono)
            reason,
            rules_violated: rulesViolated
        })
    };
};
