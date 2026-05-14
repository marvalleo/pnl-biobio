const openrouter = require('./openrouter.js');
const openai = require('./openai.js');
const anthropic = require('./anthropic.js');
const gemini = require('./gemini.js');

const adapters = { openrouter, openai, anthropic, gemini };

/**
 * Llama al proveedor primario; si falla, intenta el fallback.
 * Si ambos fallan, lanza un error con e.code = 'all_providers_failed'.
 */
async function moderate(text, systemPrompt) {
    const primaryName = process.env.AI_PRIMARY_PROVIDER;
    const primary = adapters[primaryName];
    if (!primary) {
        const e = new Error(`AI_PRIMARY_PROVIDER inválido: "${primaryName}"`);
        e.code = 'config_error';
        throw e;
    }

    const timeoutMs = parseInt(process.env.AI_TIMEOUT_MS || '8000', 10);

    try {
        return await primary.moderate({
            text,
            systemPrompt,
            model: process.env.AI_PRIMARY_MODEL,
            apiKey: process.env.AI_PRIMARY_API_KEY,
            timeoutMs
        });
    } catch (primaryErr) {
        console.warn(`[AI] Primary (${primaryName}) falló:`, primaryErr.message);

        const fallbackName = process.env.AI_FALLBACK_PROVIDER;
        if (!fallbackName) {
            const e = new Error('all_providers_failed');
            e.code = 'all_providers_failed';
            e.primaryErr = primaryErr.message;
            throw e;
        }

        const fallback = adapters[fallbackName];
        if (!fallback) {
            const e = new Error(`AI_FALLBACK_PROVIDER inválido: "${fallbackName}"`);
            e.code = 'config_error';
            throw e;
        }

        try {
            return await fallback.moderate({
                text,
                systemPrompt,
                model: process.env.AI_FALLBACK_MODEL,
                apiKey: process.env.AI_FALLBACK_API_KEY,
                timeoutMs
            });
        } catch (fallbackErr) {
            console.warn(`[AI] Fallback (${fallbackName}) falló:`, fallbackErr.message);
            const e = new Error('all_providers_failed');
            e.code = 'all_providers_failed';
            e.primaryErr = primaryErr.message;
            e.fallbackErr = fallbackErr.message;
            throw e;
        }
    }
}

module.exports = { moderate };
