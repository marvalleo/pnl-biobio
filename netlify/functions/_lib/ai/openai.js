function withTimeout(promise, ms, label) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timeout (${ms}ms)`)), ms))
    ]);
}

async function moderate({ text, systemPrompt, model, apiKey, timeoutMs }) {
    if (!apiKey) throw new Error('OpenAI: API key no configurada');

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
        fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reqBody)
        }),
        timeoutMs,
        'OpenAI'
    );

    if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`OpenAI HTTP ${res.status}: ${errBody.substring(0, 200)}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('OpenAI: respuesta sin content');

    const parsed = JSON.parse(content);

    if (!['ok', 'warning', 'block'].includes(parsed.verdict)) {
        throw new Error(`OpenAI: verdict inválido: ${parsed.verdict}`);
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
