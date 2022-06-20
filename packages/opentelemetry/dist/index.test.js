"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sdk_node_1 = require("@opentelemetry/sdk-node");
const chai_1 = require("chai");
const index_1 = require("./index");
const context_async_hooks_1 = require("@opentelemetry/context-async-hooks");
describe('instrumented', () => {
    let contextManager;
    let exporter = new sdk_node_1.tracing.InMemorySpanExporter();
    before(async () => {
        await (0, index_1.init)({
            openTelemetryEnabled: true,
            openTelemetryExporter: exporter,
            openTelemetrySamplerType: 'always-on',
            openTelemetrySpanProcessor: 'simple',
        });
    });
    beforeEach(async () => {
        contextManager = new context_async_hooks_1.AsyncHooksContextManager();
        index_1.context.setGlobalContextManager(contextManager.enable());
    });
    afterEach(async () => {
        exporter.reset();
        index_1.context.disable();
    });
    it('returns the value from the function', async () => {
        const res = await (0, index_1.instrumented)('test', () => 'foo');
        chai_1.assert.equal(res, 'foo');
    });
    it('records a span on success', async () => {
        await (0, index_1.instrumented)('test-success', () => 'foo');
        const spans = exporter.getFinishedSpans();
        chai_1.assert.lengthOf(spans, 1);
        chai_1.assert.equal(spans[0].name, 'test-success');
        chai_1.assert.equal(spans[0].status.code, index_1.SpanStatusCode.OK);
    });
    it('records a span on failure', async () => {
        let maybeError = null;
        await (0, index_1.instrumented)('test-failure', () => {
            throw new Error('foo');
        }).catch((err) => {
            maybeError = err;
        });
        // Ensure the error was propagated back to the caller.
        chai_1.assert.isOk(maybeError);
        chai_1.assert.equal(maybeError.message, 'foo');
        // Ensure the correct span was recorded.
        const spans = exporter.getFinishedSpans();
        chai_1.assert.lengthOf(spans, 1);
        chai_1.assert.equal(spans[0].name, 'test-failure');
        chai_1.assert.equal(spans[0].status.code, index_1.SpanStatusCode.ERROR);
        chai_1.assert.equal(spans[0].status.message, 'foo');
        chai_1.assert.equal(spans[0].events[0].name, 'exception');
    });
    it('sets up context correctly', async () => {
        const tracer = index_1.trace.getTracer('default');
        const parentSpan = tracer.startSpan('parentSpan');
        const parentContext = index_1.trace.setSpan(index_1.context.active(), parentSpan);
        await (0, index_1.instrumented)('test', async () => {
            const childContext = index_1.context.active();
            chai_1.assert.notStrictEqual(childContext, parentContext);
        });
    });
});
//# sourceMappingURL=index.test.js.map