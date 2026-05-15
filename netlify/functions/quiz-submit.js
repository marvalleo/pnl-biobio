const { authenticate } = require('./_lib/auth.js');

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

    let body;
    try {
        body = JSON.parse(event.body);
    } catch {
        return { statusCode: 400, body: JSON.stringify({ ok: false, message: 'Body no es JSON válido' }) };
    }

    const { quiz_id, answers } = body;
    if (!quiz_id || !Array.isArray(answers) || answers.length === 0) {
        return { statusCode: 400, body: JSON.stringify({ ok: false, message: 'Faltan quiz_id o answers' }) };
    }

    // 1. Cargar quiz
    const { data: quiz, error: quizErr } = await supabase
        .from('quizzes')
        .select('id, pass_threshold, cooldown_hours, is_active')
        .eq('id', quiz_id)
        .maybeSingle();

    if (quizErr || !quiz || !quiz.is_active) {
        return { statusCode: 404, body: JSON.stringify({ ok: false, message: 'Quiz no encontrado o inactivo' }) };
    }

    // 2. Re-verificar cooldown
    const { data: lastAttempt } = await supabase
        .from('quiz_attempts')
        .select('passed, submitted_at')
        .eq('quiz_id', quiz_id)
        .eq('profile_id', profile.id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (lastAttempt && lastAttempt.passed === false) {
        const lastTime = new Date(lastAttempt.submitted_at).getTime();
        const cooldownUntil = lastTime + quiz.cooldown_hours * 3600 * 1000;
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

    // 3. Cargar preguntas para validar pertenencia y calcular score
    const questionIds = answers.map(a => a.question_id);
    const { data: questions, error: qErr } = await supabase
        .from('quiz_questions')
        .select('id, question_text, options')
        .eq('quiz_id', quiz_id)
        .in('id', questionIds);

    if (qErr) {
        return { statusCode: 500, body: JSON.stringify({ ok: false, message: qErr.message }) };
    }

    const questionsById = new Map(questions.map(q => [q.id, q]));

    // 4. Validar pertenencia + calcular score
    let correctCount = 0;
    const wrongQuestions = [];
    const snapshot = [];

    for (const ans of answers) {
        const q = questionsById.get(ans.question_id);
        if (!q) {
            return {
                statusCode: 400,
                body: JSON.stringify({ ok: false, message: `question_id ${ans.question_id} no pertenece al quiz` })
            };
        }
        const selected = q.options.find(o => o.id === ans.selected_option_id);
        const isCorrect = selected ? selected.is_correct === true : false;
        if (isCorrect) {
            correctCount++;
        } else {
            wrongQuestions.push({ id: q.id, question_text: q.question_text });
        }
        snapshot.push({
            question_id: q.id,
            selected_option_id: ans.selected_option_id || null,
            is_correct: isCorrect
        });
    }

    const score = Math.round((correctCount / answers.length) * 100);
    const passed = score >= quiz.pass_threshold;

    // 5. Insertar intento
    const { data: inserted, error: insErr } = await supabase
        .from('quiz_attempts')
        .insert({
            quiz_id,
            profile_id: profile.id,
            score,
            passed,
            answers: snapshot
        })
        .select('id, submitted_at')
        .single();

    if (insErr) {
        return { statusCode: 500, body: JSON.stringify({ ok: false, message: insErr.message }) };
    }

    // 6. Calcular cooldown_until si reprobó
    let cooldownUntil = null;
    if (!passed) {
        const t = new Date(inserted.submitted_at).getTime();
        cooldownUntil = new Date(t + quiz.cooldown_hours * 3600 * 1000).toISOString();
    }

    return {
        statusCode: 200,
        body: JSON.stringify({
            ok: true,
            score,
            passed,
            wrong_question_ids: wrongQuestions.map(w => w.id),
            wrong_questions_preview: wrongQuestions,
            cooldown_until: cooldownUntil
        })
    };
};
