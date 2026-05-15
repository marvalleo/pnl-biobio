const sanitizeHtmlLib = require('sanitize-html');

const ALLOWED_TAGS = ['b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'br', 'p', 'span'];
const ALLOWED_ATTR = {
    'a': ['href', 'target', 'rel', 'class'],
    '*': ['class']
};

function sanitizeHtml(dirty) {
    if (!dirty || typeof dirty !== 'string') return '';
    return sanitizeHtmlLib(dirty, {
        allowedTags: ALLOWED_TAGS,
        allowedAttributes: ALLOWED_ATTR,
        // Forzar rel="noopener noreferrer" en links con target="_blank" (previene tabnabbing)
        transformTags: {
            'a': (tagName, attribs) => {
                if (attribs.target === '_blank') {
                    attribs.rel = 'noopener noreferrer';
                }
                return { tagName, attribs };
            }
        }
    });
}

function htmlToPlainText(html) {
    if (!html || typeof html !== 'string') return '';
    try {
        // Insertar saltos de línea antes de cerrar bloques para preservar separación
        const withNewlines = html
            .replace(/<\/p>/gi, '\n')
            .replace(/<\/li>/gi, '\n')
            .replace(/<br\s*\/?>/gi, '\n');
        return sanitizeHtmlLib(withNewlines, { allowedTags: [], allowedAttributes: {} })
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    } catch (e) {
        return html.replace(/<[^>]+>/g, '').trim();
    }
}

module.exports = { sanitizeHtml, htmlToPlainText };
