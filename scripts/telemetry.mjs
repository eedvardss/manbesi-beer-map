import { NodeSDK } from '@opentelemetry/sdk-node';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { AggregationType, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { metrics } from '@opentelemetry/api';
import { logs } from '@opentelemetry/api-logs';

export function startTelemetry() {
  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) return { shutdown: async () => {}, observe: () => {} };
  const sdk = new NodeSDK({
    resource: resourceFromAttributes({ 'service.name': 'beer-map', 'service.version': process.env.BEER_MAP_VERSION ?? 'development' }),
    traceExporter: new OTLPTraceExporter(),
    metricReaders: [new PeriodicExportingMetricReader({ exporter: new OTLPMetricExporter(), exportIntervalMillis: 10000 })],
    views: [{
      instrumentName: 'beer_map_http_duration',
      aggregation: {
        type: AggregationType.EXPLICIT_BUCKET_HISTOGRAM,
        options: {boundaries: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10]},
      },
    }],
    logRecordProcessors: [new BatchLogRecordProcessor({ exporter: new OTLPLogExporter() })],
    instrumentations: [new HttpInstrumentation({ ignoreIncomingRequestHook: request => request.url === '/api/live' }), new PgInstrumentation({ enhancedDatabaseReporting: false })],
  });
  sdk.start();
  const meter = metrics.getMeter('beer-map');
  const requests = meter.createCounter('beer_map_http_requests', { description: 'Completed HTTP requests' });
  const duration = meter.createHistogram('beer_map_http_duration', { unit: 's', description: 'HTTP request duration' });
  const logger = logs.getLogger('beer-map');
  return {
    shutdown: () => sdk.shutdown(),
    /** @param {import('node:http').Server} server */
    observe(server) {
      server.on('request', (request, response) => {
        const started = performance.now();
        const path = request.url?.split('?')[0];
        const route = ['/', '/api/health', '/api/venues', '/api/live'].includes(path) ? path : 'other';
        if (route === '/api/live') return;
        response.once('finish', () => {
          const attributes = { route, status: response.statusCode, method: request.method === 'GET' ? 'GET' : 'other' };
          requests.add(1, attributes);
          duration.record((performance.now() - started) / 1000, attributes);
          logger.emit({ severityNumber: response.statusCode >= 500 ? 17 : 9, severityText: response.statusCode >= 500 ? 'ERROR' : 'INFO', body: 'HTTP request completed', attributes });
        });
      });
    },
  };
}
