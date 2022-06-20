import { SpanExporter } from '@opentelemetry/sdk-trace-base';
import { Span } from '@opentelemetry/api';
export interface OpenTelemetryConfig {
    openTelemetryEnabled: boolean;
    openTelemetryExporter: 'console' | 'honeycomb' | SpanExporter;
    openTelemetrySamplerType: 'always-on' | 'always-off' | 'trace-id-ratio';
    openTelemetrySampleRate?: number;
    openTelemetrySpanProcessor?: 'batch' | 'simple';
    honeycombApiKey?: string;
    honeycombDataset?: string;
    serviceName?: string;
}
/**
 * Should be called once we've loaded our config; this will allow us to set up
 * the correct metadata for the Honeycomb exporter. We don't actually have that
 * information available until we've loaded our config.
 */
export declare function init(config: OpenTelemetryConfig): Promise<void>;
/**
 * Gracefully shuts down the OpenTelemetry instrumentation. Should be called
 * when a `SIGTERM` signal is handled.
 */
export declare function shutdown(): Promise<void>;
export declare function instrumented<T>(name: string, fn: (span: Span) => Promise<T> | T): Promise<T>;
export { trace, context, SpanStatusCode } from '@opentelemetry/api';
export { suppressTracing } from '@opentelemetry/core';
