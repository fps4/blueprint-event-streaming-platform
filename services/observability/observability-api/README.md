# Observability API

REST API service providing workspace-scoped observability features for the Event Streaming Platform.

## Features

- **Log Query API**: Workspace-isolated log queries against Loki
- **JWT Authentication**: Workspace context enforcement via Authorizer-issued tokens
- **Structured Logging**: Pino-based logging with correlation IDs

## Planned Features

- Metrics API (consumer lag, DLQ counts, throughput)
- Distributed Tracing API (correlation ID → full message lifecycle)
- Alerting API (rule CRUD, evaluation engine, webhook integrations)

## Architecture

```
WebApp → observability-api → Loki (log aggregation)
                           → Kafka Admin API (metrics)
                           → MongoDB (DLQ/transform stats)
```

## Environment Variables

| Variable                   | Default                           | Description                          |
|----------------------------|-----------------------------------|--------------------------------------|
| `OBSERVABILITY_API_PORT`   | `4040`                            | HTTP listen port                     |
| `LOKI_URL`                 | `http://localhost:3100`           | Loki base URL                        |
| `AUTH_JWT_SECRET`          | (required)                        | Shared secret for JWT verification   |
| `AUTH_JWT_ISSUER`          | `authorizer`                      | Expected JWT issuer                  |
| `AUTH_JWT_AUDIENCE`        | `event-streaming-platform`        | Expected JWT audience                |
| `CORS_ORIGINS`             | (empty = allow all)               | Comma-separated CORS origins         |
| `LOG_LEVEL`                | `info`                            | Pino log level                       |
| `LOG_PRETTY`               | `false`                           | Human-readable logs (dev only)       |

## API Endpoints

### Logs

**GET /api/logs**

Query workspace-scoped logs from Loki.

**Headers:**
- `Authorization: Bearer <jwt>`

**Query Parameters:**
- `service` (optional): Filter by service name
- `level` (optional): Filter by log level (`info`, `warn`, `error`)
- `requestId` (optional): Filter by correlation ID
- `topic` (optional): Filter by Kafka topic
- `since` (required): Start time (ISO 8601 or relative like `-1h`)
- `until` (optional): End time (ISO 8601, defaults to now)
- `limit` (optional): Max results (default: 100, max: 1000)

**Response:**
```json
{
  "logs": [
    {
      "timestamp": "2026-02-08T15:00:00.000Z",
      "level": "info",
      "service": "connector-http-source",
      "requestId": "req_abc123",
      "workspaceId": "ws_acme",
      "topic": "prod.acme.orders.raw",
      "message": "Message accepted for topic",
      "metadata": { "statusCode": 202 }
    }
  ],
  "total": 1,
  "hasMore": false
}
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test
```

## Docker

```bash
# Build (from repo root)
docker build -f services/observability/observability-api/Dockerfile -t observability-api .

# Run
docker run -p 4040:4040 \
  -e LOKI_URL=http://loki:3100 \
  -e AUTH_JWT_SECRET=your-secret \
  observability-api
```

## Testing

Requires a running Loki instance and valid JWT token from the Authorizer service.

```bash
# Example: Query logs for workspace ws_acme
curl -H "Authorization: Bearer <jwt>" \
  "http://localhost:4040/api/logs?since=-1h&service=worker-jsonata"
```

## Security

- All endpoints require valid JWT with workspace context (`wid` claim)
- Log queries are automatically scoped to the authenticated workspace
- No cross-workspace data leakage possible
