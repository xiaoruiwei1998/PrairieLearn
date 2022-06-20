"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const index_1 = require("./index");
describe('renderEjs', () => {
    it('renders EJS template without data', () => {
        chai_1.assert.equal((0, index_1.renderEjs)(__filename, '<p>Hello</p>', {}).toString(), '<p>Hello</p>');
    });
    it('renders EJS template with data', () => {
        chai_1.assert.equal((0, index_1.renderEjs)(__filename, '<p>Hello <%= name %></p>', { name: 'Divya' }).toString(), '<p>Hello Divya</p>');
    });
});
//# sourceMappingURL=index.test.js.map