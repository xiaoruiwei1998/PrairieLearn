"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.suppressTracing = exports.SpanStatusCode = exports.context = exports.trace = exports.instrumented = exports.shutdown = exports.init = void 0;
const grpc_js_1 = require("@grpc/grpc-js");
const sdk_node_1 = require("@opentelemetry/sdk-node");
const sdk_trace_node_1 = require("@opentelemetry/sdk-trace-node");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const exporter_otlp_grpc_1 = require("@opentelemetry/exporter-otlp-grpc");
const instrumentation_express_1 = require("@opentelemetry/instrumentation-express");
const sdk_trace_base_2 = require("@opentelemetry/sdk-trace-base");
const api_1 = require("@opentelemetry/api");
const core_1 = require("@opentelemetry/core");
// Instrumentations go here.
const instrumentation_aws_sdk_1 = require("@opentelemetry/instrumentation-aws-sdk");
const instrumentation_connect_1 = require("@opentelemetry/instrumentation-connect");
const instrumentation_dns_1 = require("@opentelemetry/instrumentation-dns");
const instrumentation_express_2 = require("@opentelemetry/instrumentation-express");
const instrumentation_http_1 = require("@opentelemetry/instrumentation-http");
const instrumentation_pg_1 = require("@opentelemetry/instrumentation-pg");
const instrumentation_redis_1 = require("@opentelemetry/instrumentation-redis");
// Resource detectors go here.
const resource_detector_aws_1 = require("@opentelemetry/resource-detector-aws");
const resources_2 = require("@opentelemetry/resources");
/**
 * Extends `BatchSpanProcessor` to give it the ability to filter out spans
 * before they're queued up to send. This enhances our samping process so
 * that we can filter spans _after_ they've been emitted.
 */
class FilterBatchSpanProcessor extends sdk_trace_base_2.BatchSpanProcessor {
    constructor(exporter, filter) {
        super(exporter);
        this.filter = filter;
    }
    /**
     * This is invoked after a span is "finalized". `super.onEnd` will queue up
     * the span to be exported, but if we don't call that, we can just drop the
     * span and the parent will be none the wiser!
     */
    onEnd(span) {
        if (!this.filter(span))
            return;
        super.onEnd(span);
    }
}
/**
 * This will be used with our {@link FilterBatchSpanProcessor} to filter out
 * events that we're not interested in. This helps reduce our event volume
 * but still gives us fine-grained control over which events we keep.
 */
function filter(span) {
    if (span.name === 'pg-pool.connect') {
        // Looking at historical data, this generally happens in under a millisecond,
        // precisely because we maintain a pool of long-lived connections. The only
        // time obtaining a client should take longer than that is if we're
        // establishing a connection for the first time, which should happen only at
        // bootup, or if a connection errors out. Those are the cases we're
        // interested in, so we'll filter accordingly.
        return (0, core_1.hrTimeToMilliseconds)(span.duration) > 1;
    }
    // Always return true so that we default to including a span.
    return true;
}
const instrumentations = [
    new instrumentation_aws_sdk_1.AwsInstrumentation(),
    new instrumentation_connect_1.ConnectInstrumentation(),
    new instrumentation_dns_1.DnsInstrumentation(),
    new instrumentation_express_2.ExpressInstrumentation({
        // We use a lot of middleware; it makes the traces way too noisy. If we
        // want telementry on a particular middleware, we should instrument it
        // manually.
        ignoreLayersType: [instrumentation_express_1.ExpressLayerType.MIDDLEWARE],
        ignoreLayers: [
            // These don't provide useful information to us.
            'router - /',
            'request handler - /*',
        ],
    }),
    new instrumentation_http_1.HttpInstrumentation({
        ignoreIncomingPaths: [
            // socket.io requests are generally just long-polling; they don't add
            // useful information for us.
            /\/socket.io\//,
            // We get several of these per second; they just chew through our event quota.
            // They don't really do anything interesting anyways.
            /\/pl\/webhooks\/ping/,
        ],
    }),
    new instrumentation_pg_1.PgInstrumentation(),
    new instrumentation_redis_1.RedisInstrumentation(),
];
// Enable all instrumentations now, even though we haven't configured our
// span processors or trace exporters yet. We'll set those up later.
instrumentations.forEach((i) => {
    i.enable();
});
let tracerProvider;
/**
 * Should be called once we've loaded our config; this will allow us to set up
 * the correct metadata for the Honeycomb exporter. We don't actually have that
 * information available until we've loaded our config.
 */
async function init(config) {
    if (!config.openTelemetryEnabled) {
        // If not enabled, do nothing. We used to disable the instrumentations, but
        // per maintainers, that can actually be problematic. See the comments on
        // https://github.com/open-telemetry/opentelemetry-js-contrib/issues/970
        // The Express instrumentation also logs a benign error, which can be
        // confusing to users. There's a fix in progress if we want to switch back
        // to disabling instrumentations in the future:
        // https://github.com/open-telemetry/opentelemetry-js-contrib/pull/972
        return;
    }
    let exporter;
    if (typeof config.openTelemetryExporter === 'object') {
        exporter = config.openTelemetryExporter;
    }
    else {
        switch (config.openTelemetryExporter) {
            case 'console': {
                // Export spans to the console for testing purposes.
                exporter = new sdk_node_1.tracing.ConsoleSpanExporter();
                break;
            }
            case 'honeycomb': {
                // Create a Honeycomb exporter with the appropriate metadata from the
                // config we've been provided with.
                const metadata = new grpc_js_1.Metadata();
                metadata.set('x-honeycomb-team', config.honeycombApiKey);
                metadata.set('x-honeycomb-dataset', config.honeycombDataset);
                exporter = new exporter_otlp_grpc_1.OTLPTraceExporter({
                    url: 'grpc://api.honeycomb.io:443/',
                    credentials: grpc_js_1.credentials.createSsl(),
                    metadata,
                });
                break;
            }
            default:
                throw new Error(`Unknown OpenTelemetry exporter: ${config.openTelemetryExporter}`);
        }
    }
    let sampler;
    switch (config.openTelemetrySamplerType ?? 'always-on') {
        case 'always-on': {
            sampler = new core_1.AlwaysOnSampler();
            break;
        }
        case 'always-off': {
            sampler = new core_1.AlwaysOffSampler();
            break;
        }
        case 'trace-id-ratio': {
            sampler = new core_1.ParentBasedSampler({
                root: new core_1.TraceIdRatioBasedSampler(config.openTelemetrySampleRate),
            });
            break;
        }
        default:
            throw new Error(`Unknown OpenTelemetry sampler type: ${config.openTelemetrySamplerType}`);
    }
    let spanProcessor;
    switch (config.openTelemetrySpanProcessor ?? 'batch') {
        case 'batch': {
            spanProcessor = new FilterBatchSpanProcessor(exporter, filter);
            break;
        }
        case 'simple': {
            spanProcessor = new sdk_trace_base_1.SimpleSpanProcessor(exporter);
            break;
        }
        default: {
            throw new Error(`Unknown OpenTelemetry span processor: ${config.openTelemetrySpanProcessor}`);
        }
    }
    // Much of this functionality is copied from `@opentelemetry/sdk-node`, but
    // we can't use the SDK directly because of the fact that we load our config
    // asynchronously. We need to initialize our instrumentations first; only
    // then can we actually start requiring all of our code that loads our config
    // and ultimately tells us how to configure OpenTelemetry.
    let resource = await (0, resources_1.detectResources)({
        detectors: [resource_detector_aws_1.awsEc2Detector, resources_2.processDetector, resources_2.envDetector],
    });
    if (config.serviceName) {
        resource = resource.merge(new resources_1.Resource({ [semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAME]: config.serviceName }));
    }
    tracerProvider = new sdk_trace_node_1.NodeTracerProvider({
        sampler,
        resource,
    });
    tracerProvider.addSpanProcessor(spanProcessor);
    tracerProvider.register();
    instrumentations.forEach((i) => i.setTracerProvider(tracerProvider));
}
exports.init = init;
/**
 * Gracefully shuts down the OpenTelemetry instrumentation. Should be called
 * when a `SIGTERM` signal is handled.
 */
async function shutdown() {
    if (tracerProvider) {
        await tracerProvider.shutdown();
        tracerProvider = null;
    }
}
exports.shutdown = shutdown;
async function instrumented(name, fn) {
    return api_1.trace
        .getTracer('default')
        .startActiveSpan(name, async (span) => {
        try {
            const result = await fn(span);
            span.setStatus({ code: api_1.SpanStatusCode.OK });
            return result;
        }
        catch (e) {
            span.setStatus({
                code: api_1.SpanStatusCode.ERROR,
                message: e.message,
            });
            span.recordException(e);
            throw e;
        }
        finally {
            span.end();
        }
    });
}
exports.instrumented = instrumented;
var api_2 = require("@opentelemetry/api");
Object.defineProperty(exports, "trace", { enumerable: true, get: function () { return api_2.trace; } });
Object.defineProperty(exports, "context", { enumerable: true, get: function () { return api_2.context; } });
Object.defineProperty(exports, "SpanStatusCode", { enumerable: true, get: function () { return api_2.SpanStatusCode; } });
var core_2 = require("@opentelemetry/core");
Object.defineProperty(exports, "suppressTracing", { enumerable: true, get: function () { return core_2.suppressTracing; } });
//# sourceMappingURL=index.js.map