"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const index_1 = require("./index");
describe('html', () => {
    it('escapes string value', () => {
        chai_1.assert.equal((0, index_1.html) `<p>${'<script>'}</p>`.toString(), '<p>&lt;script&gt;</p>');
    });
    it('interpolates multiple values', () => {
        chai_1.assert.equal((0, index_1.html) `<p>${'cats'} and ${'dogs'}</p>`.toString(), '<p>cats and dogs</p>');
    });
    it('escapes values when rendering array', () => {
        const arr = ['cats>', '<dogs'];
        chai_1.assert.equal(
        // prettier-ignore
        (0, index_1.html) `<ul>${arr}</ul>`.toString(), '<ul>cats&gt;&lt;dogs</ul>');
    });
    it('does not double-escape values when rendering array', () => {
        const arr = ['cats', 'dogs'];
        chai_1.assert.equal(
        // prettier-ignore
        (0, index_1.html) `<ul>${arr.map((e) => (0, index_1.html) `<li>${e}</li>`)}</ul>`.toString(), '<ul><li>cats</li><li>dogs</li></ul>');
    });
    it('errors when interpolating object', () => {
        chai_1.assert.throws(
        // @ts-expect-error
        () => (0, index_1.html) `<p>${{ foo: 'bar' }}</p>`.toString(), 'Cannot interpolate object in template');
    });
    it('omits boolean values from template', () => {
        chai_1.assert.equal((0, index_1.html) `<p>${true}${false}</p>`.toString(), '<p></p>');
    });
    it('omits nullish values from template', () => {
        chai_1.assert.equal((0, index_1.html) `<p>${null}${undefined}</p>`.toString(), '<p></p>');
    });
});
describe('escapeHtml', () => {
    it('escapes rendered HTML', () => {
        chai_1.assert.equal((0, index_1.escapeHtml)((0, index_1.html) `<p>Hello</p>`).toString(), '&lt;p&gt;Hello&lt;/p&gt;');
    });
    it('works when nested inside html tag', () => {
        chai_1.assert.equal((0, index_1.html) `a${(0, index_1.escapeHtml)((0, index_1.html) `<p></p>`)}b`.toString(), 'a&lt;p&gt;&lt;/p&gt;b');
    });
});
//# sourceMappingURL=index.test.js.map