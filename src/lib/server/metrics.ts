import http from 'node:http';
import client from '@prometheus-io/client';
import type {Handle} from '@sveltejs/kit';

// vite dev re-runs this file on hot reload but the registry in node_modules persists
client.register.clear();

const httpRequests = new client.Counter({
  name: 'http_requests_total',
  help: 'HTTP requests',
  labelNames: ['method', 'route', 'status']
});

const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route', 'status']
});

export const handle: Handle = async ({event, resolve}) => {
  const end = httpDuration.startTimer();
  const response = await resolve(event);
  const labels = {
    method: event.request.method,
    // SvelteKit route, eg. /api/projects/[project]
    // Fallback - don't let 404 explode cardinality
    route: event.route.id || 'other',
    status: response.status
  };
  httpRequests.inc(labels);
  end(labels);
  return response;
};

export const listen = () => {
  if (!process.env.METRICS_PORT) {
    return;
  }

  const port = +process.env.METRICS_PORT;
  client.collectDefaultMetrics();

  const metricsServer = http.createServer((req, res) => {
    client.register.metrics()
      .then((body) => {
        res.setHeader('Content-Type', client.register.contentType);
        res.end(body);
      })
      .catch((error) => {
        console.error(error);
        res.statusCode = 500;
        res.end();
      });
  });

  metricsServer.listen(port, '127.0.0.1', () => {
    console.log(`Metrics on port ${port}`);
  });
};
