function withTimeout(promise, ms, label) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timeout (${ms}ms)`)), ms))
    ]);
}

function parseJsonLoose(content) {
    // Algunos modelos envuelven en ```json ... ```. Limpiar antes de parsear.
    const cleaned = content
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/i, '')
        .trim();
    return JSON.parse(cleaned);
}

async function moderate({ text, systemPrompt, model, apiKey, timeoutMs }) {
    if (!apiKey) throw new Error('OpenRouter: API key no configurada');

    const reqBody = {
        model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
        ],
        temperature: 0,
        response_format: { type: 'json_object' }
    };

    const res = await withTimeout(
        fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://nacionallibertariobiobio.cl',
                'X-Title': 'PNL Biobío Forum Moderator'
            },
            body: JSON.stringify(reqBody)
        }),
        timeoutMs,
        'OpenRouter'
    );

    if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`OpenRouter HTTP ${res.status}: ${errBody.substring(0, 200)}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('OpenRouter: respuesta sin content');

    let parsed;
    try {
        parsed = parseJsonLoose(content);
    } catch (parseErr) {
        throw new Error(`OpenRouter: JSON inválido en respuesta: ${content.substring(0, 200)}`);
    }

    if (!['ok', 'warning', 'block'].includes(parsed.verdict)) {
        throw new Error(`OpenRouter: verdict inválido: ${parsed.verdict}`);
    }

    return {
        verdict: parsed.verdict,
        rules_violated: Array.isArray(parsed.rules_violated) ? parsed.rules_violated : [],
        reason: parsed.reason || '',
        model_used: model,
        raw: data
    };
}

module.exports = { moderate };
