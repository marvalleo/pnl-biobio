/**
 * 🔐 PNL Password Policy (S-03)
 * Política de contraseñas fuerte del lado del cliente + medidor de fortaleza.
 *
 * Uso:
 *   1. Incluir <script src="/assets/js/password-policy.js"></script>
 *   2. En el input de contraseña: data-pnl-password-meter="ID_DEL_CONTENEDOR"
 *      y un <div id="ID_DEL_CONTENEDOR"></div> debajo.
 *   3. Al enviar: const r = window.PNLPassword.validate(pw);
 *      if (!r.ok) { mostrarError(r.errors.join(' ')); return; }
 *
 * Nota: el mínimo real de Supabase Auth se configura en el panel; esto es la
 * barrera de UX/validación en el navegador (defensa en profundidad).
 */
(function () {
    'use strict';

    var MIN_LENGTH = 12;

    // Lista corta de contraseñas comunes/predecibles (incluye contexto local).
    var COMMON = [
        '123456', '1234567', '12345678', '123456789', '1234567890',
        'password', 'password1', 'contrasena', 'contraseña', 'qwerty',
        'qwerty123', '111111', '000000', '12345', 'iloveyou', 'admin',
        'abc123', 'aaaaaa', 'libertad', 'chile', 'biobio', 'pnlbiobio',
        'nacionallibertario', 'militante', 'partido'
    ];

    function validate(pw) {
        pw = pw || '';
        var errors = [];

        if (pw.length < MIN_LENGTH) errors.push('Debe tener al menos ' + MIN_LENGTH + ' caracteres.');
        if (!/[A-Z]/.test(pw)) errors.push('Incluye al menos una mayúscula.');
        if (!/[a-z]/.test(pw)) errors.push('Incluye al menos una minúscula.');
        if (!/[0-9]/.test(pw)) errors.push('Incluye al menos un número.');
        if (pw && COMMON.indexOf(pw.toLowerCase()) !== -1) errors.push('Es una contraseña demasiado común.');

        // Score 0-4 para el medidor
        var score = 0;
        if (pw) {
            if (pw.length >= MIN_LENGTH) score++;
            if (pw.length >= 16) score++;
            if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
            if (/[0-9]/.test(pw)) score++;
            if (/[^A-Za-z0-9]/.test(pw)) score++;
        }
        score = Math.min(score, 4);

        var labels = ['Muy débil', 'Débil', 'Aceptable', 'Buena', 'Fuerte'];
        var colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];

        return {
            ok: errors.length === 0,
            errors: errors,
            score: score,
            label: labels[score],
            color: colors[score]
        };
    }

    function renderMeter(container, pw, capsOn) {
        var r = validate(pw);
        var pct = pw ? ((r.score + 1) / 5) * 100 : 0;

        var capsHtml = capsOn
            ? '<p style="margin:6px 0 0;font-size:10px;font-weight:800;color:#f59e0b;text-transform:uppercase;letter-spacing:.05em;">⚠ Bloq Mayús activado</p>'
            : '';

        var reqHtml = '';
        if (pw && !r.ok) {
            reqHtml = '<ul style="margin:6px 0 0;padding-left:16px;list-style:disc;">' +
                r.errors.map(function (e) {
                    return '<li style="font-size:10px;color:#94a3b8;font-weight:600;line-height:1.5;">' + e + '</li>';
                }).join('') + '</ul>';
        }

        container.innerHTML =
            '<div style="margin-top:8px;">' +
                '<div style="height:6px;border-radius:9999px;background:#e2e8f0;overflow:hidden;">' +
                    '<div style="height:100%;width:' + pct + '%;background:' + r.color + ';transition:width .25s ease,background .25s ease;"></div>' +
                '</div>' +
                (pw ? '<p style="margin:6px 0 0;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:' + r.color + ';">Seguridad: ' + r.label + '</p>' : '') +
                reqHtml +
                capsHtml +
            '</div>';
    }

    function attach(input, container) {
        var capsOn = false;

        input.addEventListener('input', function () {
            renderMeter(container, input.value, capsOn);
        });
        input.addEventListener('keydown', function (e) {
            if (e.getModifierState) {
                capsOn = e.getModifierState('CapsLock');
                renderMeter(container, input.value, capsOn);
            }
        });
        input.addEventListener('keyup', function (e) {
            if (e.getModifierState) {
                capsOn = e.getModifierState('CapsLock');
                renderMeter(container, input.value, capsOn);
            }
        });
        input.addEventListener('blur', function () {
            // Mantener el medidor pero quitar el aviso de mayúsculas al salir
            renderMeter(container, input.value, false);
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        var inputs = document.querySelectorAll('[data-pnl-password-meter]');
        for (var i = 0; i < inputs.length; i++) {
            var meter = document.getElementById(inputs[i].getAttribute('data-pnl-password-meter'));
            if (meter) attach(inputs[i], meter);
        }
    });

    window.PNLPassword = { validate: validate, MIN_LENGTH: MIN_LENGTH };
})();
