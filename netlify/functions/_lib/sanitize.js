const { JSDOM } = require('jsdom');
const createDOMPurify = require('dompurify');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

const ALLOWED_TAGS = ['b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'br', 'p', 'span'];
const ALLOWED_ATTR = ['class', 'href', 'target'];

/**
 * Sanitiza HTML para prevenir XSS antes de insertarlo a la BD.
 * Mantiene el subset mínimo de tags que produce el editor Quill.
 */
function sanitizeHtml(dirty) {
    if (!dirty || typeof dirty !== 'string') return '';
    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS,
        ALLOWED_ATTR,
        KEEP_CONTENT: true
    });
}

/**
 * Extrae texto plano de un HTML. Mantiene saltos de línea entre bloques.
 * Usado para enviar contenido a la IA y para forum_moderation_log.content_preview.
 */
function htmlToPlainText(html) {
    if (!html || typeof html !== 'string') return '';
    const dom = new JSDOM(`<div>${html}</div>`);
    const root = dom.window.document.body.firstChild;
    // Insertar \n entre elementos de bloque para preservar separación
    root.querySelectorAll('p, div, br, li').forEach(el => {
        el.appendChild(dom.window.document.createTextNode('\n'));
    });
    return root.textContent.replace(/\n{3,}/g, '\n\n').trim();
}

module.exports = { sanitizeHtml, htmlToPlainText };
