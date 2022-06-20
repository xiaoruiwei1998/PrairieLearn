"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unsafeHtml = exports.escapeHtml = exports.html = exports.HtmlSafeString = void 0;
const ENCODE_HTML_RULES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&#34;',
    "'": '&#39;',
};
var MATCH_HTML = /[&<>'"]/g;
function encodeCharacter(c) {
    return ENCODE_HTML_RULES[c] || c;
}
/**
 * Based on the `escapeXML` function from the `ejs` library.
 */
function escapeHtmlRaw(value) {
    return value == undefined ? '' : String(value).replace(MATCH_HTML, encodeCharacter);
}
function escapeValue(value) {
    if (value instanceof HtmlSafeString) {
        // Already escaped!
        return value.toString();
    }
    else if (Array.isArray(value)) {
        return value.map((val) => escapeValue(val)).join('');
    }
    else if (typeof value === 'string' || typeof value === 'number') {
        return escapeHtmlRaw(String(value));
    }
    else if (value == null) {
        // undefined or null -- render nothing
        return '';
    }
    else if (typeof value === 'object') {
        throw new Error(`Cannot interpolate object in template: ${JSON.stringify(value)}`);
    }
    else {
        // This is boolean - don't render anything here.
        return '';
    }
}
// Based on https://github.com/Janpot/escape-html-template-tag
class HtmlSafeString {
    constructor(strings, values) {
        this.strings = strings;
        this.values = values;
    }
    toString() {
        return this.values.reduce((acc, val, i) => {
            return acc + escapeValue(val) + this.strings[i + 1];
        }, this.strings[0]);
    }
}
exports.HtmlSafeString = HtmlSafeString;
function html(strings, ...values) {
    return new HtmlSafeString(strings, values);
}
exports.html = html;
/**
 * Pre-escpapes the rendered HTML. Useful for when you want to inline the HTML
 * in something else, for instance in a `data-content` attribute for a Bootstrap
 * popover.
 */
function escapeHtml(html) {
    return unsafeHtml(escapeHtmlRaw(html.toString()));
}
exports.escapeHtml = escapeHtml;
/**
 * Will render the provided value without any additional escaping. Use carefully
 * with user-provided data.
 *
 * @param value The value to render.
 * @returns An {@link HtmlSafeString} representing the provided value.
 */
function unsafeHtml(value) {
    return new HtmlSafeString([value], []);
}
exports.unsafeHtml = unsafeHtml;
//# sourceMappingURL=index.js.map