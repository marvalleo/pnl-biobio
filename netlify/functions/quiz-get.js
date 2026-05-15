const { authenticate } = require('./_lib/auth.js');

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function stripCorrectFromOptions(options, shuffleOpts) {
    const cleaned = options.map(opt => ({ id: opt.id, text: opt.text }));
    return shuffleOpts ? shuffle(cleaned) : cleaned;
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: JSON.stringify({ ok: false, message: 'Método no permitido' }) };
    }

    let auth;
    try {
        auth = await authenticate(event);
    } catch (err) {
        return { statusCode: err.statusCode || 500, body: JSON.stringify({ ok: false, message: err.message }) };
    }
    const { profile, supabase } = auth;

    const quizId = event.queryStringParameters?.quiz_id;
    if (!quizId) {
        return { statusCode: 400, body: JSON.stringify({ ok: false, message: 'Falta quiz_id' }) };
    }

    // 1. Cargar quiz
    const { data: quiz, error: quizErr } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .eq('is_active', true)
        .maybeSingle();

    if (quizErr) {
        return { statusCode: 500, body: JSON.stringify({ ok: false, message: quizErr.message }) };
    }
    if (!quiz) {
        return { statusCode: 404, body: JSON.stringify({ ok: false, message: 'Quiz no encontrado o inactivo' }) };
    }

    // 2. Verificar cooldown
    const { data: lastAttempt } = await supabase
        .from('quiz_attempts')
        .select('passed, submitted_at, answers')
        .eq('quiz_id', quizId)
        .eq('profile_id', profile.id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (lastAttempt && lastAttempt.passed === false) {
        const lastTime = new Date(lastAttempt.submitted_at).getTime();
        const cooldownMs = quiz.cooldown_hours * 3600 * 1000;
        const cooldownUntil = lastTime + cooldownMs;
        if (Date.now() < cooldownUntil) {
            return {
                statusCode: 429,
                body: JSON.stringify({
                    ok: false,
                    code: 'cooldown',
                    cooldown_until: new Date(cooldownUntil).toISOString()
                })
            };
        }
    }

    // 3. Cargar banco de preguntas
    const { data: bank, error: bankErr } = await supabase
        .from('quiz_questions')
        .select('id, question_text, options')
        .eq('quiz_id', quizId);

    if (bankErr) {
        return { statusCode: 500, body: JSON.stringify({ ok: false, message: bankErr.message }) };
    }
    if (!bank || bank.length === 0) {
        return { statusCode: 404, body: JSON.stringify({ ok: false, message: 'Banco vacío' }) };
    }

    // 4. Selección con anti-repetición
    let selected;
    const N = quiz.questions_per_attempt;
    if (!N || N >= bank.length) {
        selected = shuffle(bank);
    } else {
        const lastIds = lastAttempt?.answers
            ? new Set(lastAttempt.answers.map(a => a.question_id))
            : new Set();
        const fresh = bank.filter(q => !lastIds.has(q.id));

        if (fresh.length >= N) {
            selected = shuffle(fresh).slice(0, N);
        } else {
            const repeats = shuffle(bank.filter(q => lastIds.has(q.id)));
            selected = [...shuffle(fresh), ...repeats].slice(0, N);
        }
    }

    // 5. Strip is_correct + opcional shuffle de opciones
    const questions = selected.map(q => ({
        id: q.id,
        question_text: q.question_text,
        options: stripCorrectFromOptions(q.options, quiz.shuffle_options)
    }));

    return {
        statusCode: 200,
        body: JSON.stringify({
            ok: true,
            quiz: {
                id: quiz.id,
                title: quiz.title,
                description: quiz.description,
                pass_threshold: quiz.pass_threshold,
                cooldown_hours: quiz.cooldown_hours,
                total_questions: questions.length
            },
            questions
        })
    };
};
