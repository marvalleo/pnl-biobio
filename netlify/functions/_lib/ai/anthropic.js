function withTimeout(promise, ms, label) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timeout (${ms}ms)`)), ms))
    ]);
}

function extractJson(content) {
    // El SDK de Anthropic devuelve content como array de bloques. Tomar el primer text block.
    if (Array.isArray(content)) {
        const textBlock = content.find(b => b.type === 'text');
        content = textBlock?.text || '';
    }
    const cleaned = String(content)
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/i, '')
        .trim();
    return JSON.parse(cleaned);
}

async function moderate({ text, systemPrompt, model, apiKey, timeoutMs }) {
    if (!apiKey) throw new Error('Anthropic: API key no configurada');

    const reqBody = {
        model,
        max_tokens: 500,
        temperature: 0,
        system: systemPrompt,
        messages: [
            { role: 'user', content: text }
        ]
    };

    const res = await withTimeout(
        fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reqBody)
        }),
        timeoutMs,
        'Anthropic'
    );

    if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`Anthropic HTTP ${res.status}: ${errBody.substring(0, 200)}`);
    }

    const data = await res.json();
    const parsed = extractJson(data.content);

    if (!['ok', 'warning', 'block'].includes(parsed.verdict)) {
        throw new Error(`Anthropic: verdict inválido: ${parsed.verdict}`);
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
