function withTimeout(promise, ms, label) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timeout (${ms}ms)`)), ms))
    ]);
}

function extractJson(text) {
    const cleaned = String(text)
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/i, '')
        .trim();
    return JSON.parse(cleaned);
}

async function moderate({ text, systemPrompt, model, apiKey, timeoutMs }) {
    if (!apiKey) throw new Error('Gemini: API key no configurada');

    // Gemini API: el system prompt va en system_instruction
    const reqBody = {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [
            { role: 'user', parts: [{ text }] }
        ],
        generationConfig: {
            temperature: 0,
            response_mime_type: 'application/json'
        }
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;
    const res = await withTimeout(
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reqBody)
        }),
        timeoutMs,
        'Gemini'
    );

    if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`Gemini HTTP ${res.status}: ${errBody.substring(0, 200)}`);
    }

    const data = await res.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error('Gemini: respuesta sin content');

    const parsed = extractJson(content);

    if (!['ok', 'warning', 'block'].includes(parsed.verdict)) {
        throw new Error(`Gemini: verdict inválido: ${parsed.verdict}`);
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
