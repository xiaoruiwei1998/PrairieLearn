"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderEjs = void 0;
const ejs_1 = __importDefault(require("ejs"));
const path_1 = __importDefault(require("path"));
const html_1 = require("@prairielearn/html");
/**
 * This is a shim to allow for the use of EJS templates inside of HTML tagged
 * template literals.
 *
 * The resulting string is assumed to be appropriately escaped and will be used
 * verbatim in the resulting HTML.
 *
 * @param filename The name of the file from which relative includes should be resolved.
 * @param template The raw EJS template string.
 * @param data Any data to be made available to the template.
 * @returns The rendered EJS.
 */
function renderEjs(filename, template, data = {}) {
    return (0, html_1.unsafeHtml)(ejs_1.default.render(template, data, { views: [path_1.default.dirname(filename)] }));
}
exports.renderEjs = renderEjs;
//# sourceMappingURL=index.js.map