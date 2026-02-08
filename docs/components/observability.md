# Observability

This document describes the end-user observability architecture for the Event Streaming Platform, covering logging, monitoring, tracing, and alerting for product teams using the platform.

## 1. Design Philosophy

### 1.1 End-User Focus

The platform provides **self-service observability** for product teams through:

- **Raw service logs** with workspace filtering (full context, real-time)
- **Integration-level metrics** (lag, DLQ counts, success rates, throughput)
- **Distributed tracing** (correlation ID → full message lifecycle)
- **Self-service alerting** configuration with Slack/email/PagerDuty integrations
- **Business-focused dashboards** (no Kafka internals required)

**Rationale**: Product teams need complete visibility into their integrations without needing to understand platform internals or request access from ops teams.

### 1.2 Platform Operations

> **Note**: Platform operators (infrastructure teams running the event streaming platform) are expected to use their organization's **centralized observability tooling** (e.g., Datadog, Splunk, ELK stack, Grafana Cloud) for infrastructure monitoring, service health, and incident response. This document focuses on the **product-facing observability features** built into the platform.

---

## 2. Architecture Overview

### 2.1 Observability Service

A dedicated **Observability API** service provides scalable, workspace-scoped access to logs, metrics, and traces:

**Service**: `services/observability-api`

**Responsibilities**:
- Query Loki for workspace-filtered logs
- Aggregate metrics from Kafka Admin API + MongoDB
- Reconstruct distributed traces from correlation IDs
- Serve REST API for WebApp consumption
- Enforce workspace isolation via JWT claims

**Key Benefits**:
- **Isolation**: User queries don't impact control plane performance
- **Scalability**: Horizontally scalable, independent from Control API
- **Security**: Workspace-scoped access via JWT validation
- **Custom UX**: Purpose-built API for product team needs

### 2.2 Infrastructure Components

**Loki + Promtail** (log aggregation):
- **Loki**: Horizontally-scalable log aggregation backend
- **Promtail**: Scrapes Docker container logs, forwards to Loki
- **Multi-tenancy**: Supports workspace-scoped LogQL queries

### 2.3 Service Logging Standards

All platform services use **Pino** for structured JSON logging with the following conventions:

**Standard Fields**:
- `level`: Pino log level (trace, debug, info, warn, error, fatal)
- `time`: ISO 8601 timestamp
- `msg`: Human-readable message
- `service`: Service name (e.g., `control-api`, `worker-jsonata`)
- `requestId`: Correlation ID (`x-request-id` header, propagated across services)
- `workspaceId`: Workspace context (when applicable)
- `topic`: Kafka topic (when applicable)

**Example Log Entry**:
```json
{
  "level": "info",
  "time": "2026-02-08T15:00:00.000Z",
  "service": "connector-http-source",
  "requestId": "req_abc123",
  "workspaceId": "ws_acme",
  "topic": "prod.acme.orders.raw",
  "msg": "Message accepted for topic",
  "statusCode": 202
}
```

**Environment Variable** (`LOG_PRETTY`):
- `LOG_PRETTY=true`: Human-readable output (development)
- `LOG_PRETTY=false`: JSON structured logs (production, parsed by Promtail)

---

## 3. Observability API Endpoints

The **Observability API** provides REST endpoints for logs, metrics, tracing, and alerting, with automatic **workspace isolation** via JWT claims.

### 3.1 Log Query API

**Endpoint**: `GET /api/logs`

**Query Parameters**:
- `workspaceId` (required): Workspace scope (validated against JWT)
- `service` (optional): Filter by service name (e.g., `worker-jsonata`)
- `level` (optional): Filter by log level (`info`, `warn`, `error`)
- `requestId` (optional): Filter by correlation ID
- `topic` (optional): Filter by Kafka topic
- `since` (required): Start time (ISO 8601 or relative like `-1h`)
- `until` (optional): End time (ISO 8601, defaults to now)
- `limit` (optional): Max results (default: 100, max: 1000)

**Response**:
```json
{
  "logs": [
    {
      "timestamp": "2026-02-08T15:00:00.000Z",
      "level": "info",
      "service": "connector-http-source",
      "requestId": "req_abc123",
      "topic": "prod.acme.orders.raw",
      "message": "Message accepted for topic",
      "metadata": { "statusCode": 202 }
    }
  ],
  "total": 42,
  "hasMore": false
}
```

**Implementation**:
- Translates query params to workspace-scoped LogQL:
  ```logql
  {service=~".+"} | json | workspaceId="ws_acme" | level="error" | __timestamp__ > 1h
  ```
- Queries Loki `/loki/api/v1/query_range`
- Returns parsed, sanitized results

### 3.2 Metrics API

**Integration-Level Metrics**:

Aggregated from:

**Integration-Level Metrics**:

Aggregated from:
- **Kafka Admin API** (via KafkaJS): topic lag, partition offsets, throughput
- **MongoDB collections**: pipeline run history, DLQ message counts, transform success/failure rates

**Endpoints**:

| Metric                     | Endpoint                                      | Description                                    |
|----------------------------|-----------------------------------------------|------------------------------------------------|
| Consumer lag               | `GET /api/metrics/:pipelineId/lag`            | Current lag per partition (messages behind)    |
| DLQ message count          | `GET /api/metrics/:pipelineId/dlq`            | Total messages in DLQ topic                    |
| Transform success rate     | `GET /api/metrics/:pipelineId/transforms`     | Success/failure/total counts + percentage      |
| Delivery rate              | `GET /api/metrics/:pipelineId/delivery`       | Delivered/failed/total counts for sink         |
| Throughput                 | `GET /api/metrics/:pipelineId/throughput`     | Messages per second (5m, 1h, 24h windows)     |
| Pipeline health            | `GET /api/metrics/:pipelineId/health`         | Aggregated status (healthy/degraded/critical)  |

**Example Response** (`GET /api/metrics/pl_abc123/lag`):
```json
{
  "pipelineId": "pl_abc123",
  "consumerGroup": "worker-jsonata-pl_abc123",
  "topic": "prod.acme.orders.raw",
  "totalLag": 1234,
  "partitions": [
    { "partition": 0, "currentOffset": 10000, "highWaterMark": 10500, "lag": 500 },
    { "partition": 1, "currentOffset": 9000, "highWaterMark": 9734, "lag": 734 }
  ],
  "timestamp": "2026-02-08T15:00:00.000Z"
}
```

### 3.3 Distributed Tracing API

**Endpoint**: `GET /api/traces/:requestId`

**Correlation ID (`x-request-id`) Propagation**:

1. **Ingress** (connector-http-source): Accept or generate `x-request-id`
2. **Kafka Headers**: Attach `requestId` as message header
3. **Worker**: Read header, include in logs and DLQ messages
4. **Sink**: Propagate to downstream systems (HTTP header or payload field)

**Response** (Full Message Lifecycle):
```json
{
  "requestId": "req_abc123",
  "workspaceId": "ws_acme",
  "pipelineId": "pl_abc123",
  "status": "delivered",
  "duration": 2456,
  "events": [
    {
      "timestamp": "2026-02-08T15:00:00.000Z",
      "stage": "ingress",
      "service": "connector-http-source",
      "topic": "prod.acme.orders.raw",
      "status": "accepted"
    },
    {
      "timestamp": "2026-02-08T15:00:01.123Z",
      "stage": "transform",
      "service": "worker-jsonata",
      "transformVersion": "v2",
      "status": "success",
      "outputTopic": "prod.acme.orders.enriched"
    },
    {
      "timestamp": "2026-02-08T15:00:02.456Z",
      "stage": "delivery",
      "service": "connector-http-sink",
      "destination": "https://api.example.com/orders",
      "status": "delivered",
      "httpStatus": 201
    }
  ]
}
```

**Implementation Strategy**:
1. **Primary Source**: Query Loki for all logs with matching `requestId` across services
2. **Fallback/Enrichment**: Query MongoDB trace collection (if services write trace events)
3. **Aggregation**: Reconstruct timeline with stage identification (ingress → transform → delivery)

### 3.4 Alerting API

**Configuration Model** (persisted in MongoDB):

```typescript
interface AlertRule {
  pipelineId: string;
  workspaceId: string;
  name: string;
  condition: {
    metric: 'consumer_lag' | 'dlq_rate' | 'delivery_failure_rate' | 'transform_error_rate';
    operator: 'gt' | 'lt' | 'eq';
    threshold: number;
    windowMinutes: number; // Evaluation window
  };
  actions: {
    slack?: { webhookUrl: string; channel: string };
    email?: { recipients: string[] };
    pagerduty?: { integrationKey: string };
  };
  enabled: boolean;
  createdBy: string;
  createdAt: Date;
}
```

**CRUD Endpoints**:

**WebApp UI Flows**:
- **Create Alert Rule**: Form to select metric, set threshold, configure destinations
- **Alert History**: Timeline of fired alerts with acknowledge/snooze controls
- **Alert Status Dashboard**: Current alert state per pipeline (green/yellow/red)

**Evaluation Engine** (runs in Control API or dedicated alerting service):
- Periodic job (every 1-5 minutes) evaluates all enabled rules
- Queries Kafka Admin + MongoDB for current metric values
- Fires webhooks/emails when threshold breached
- Debounces repeated alerts (e.g., only fire once per 15 minutes per rule)

---

## 4. Operational Playbooks

### 4.1 Debugging a Failed Message (Ops)

1. **User reports**: "Message X failed"
2. **Get correlation ID** from user or WebApp trace view
3. **Query Loki**:
   ```logql
   {service=~".+"} |= "req_abc123"
   ```
4. **Identify failure stage** from logs
5. **Inspect DLQ** (if applicable):
   ```bash
   kafka-console-consumer --bootstrap-server broker:9092 \
     --topic prod.acme.orders.dlq \
     --property print.headers=true | grep req_abc123
   ```
6. **Fix mapping/schema** via Control API
7. **Replay from DLQ** via WebApp UI

### 4.2 Investigating High Lag (Ops)

1. **Check Grafana dashboard**: Identify service/consumer group
2. **Query Loki for errors**:
   ```logql
   {service="worker-jsonata"} | json | level="error" | __timestamp__ > 1h
   ```
3. **Check Kafka consumer group state**:
   ```bash
   kafka-consumer-groups --bootstrap-server broker:9092 \
     --describe --group worker-jsonata
   ```
4. **Scale workers** (increase replicas) or **pause integration** if degraded

### 4.3 Service Health Check (Ops)

**Grafana Dashboard Panels**:
- Service uptime (container status)
- Log error rate by service
- Kafka topic lag (all consumer groups)
- MongoDB connection pool stats
- HTTP 5xx rate per service

---

## 7. Best Practices

### 7.1 Logging Guidelines

**DO**:
- Always include `requestId` when available
- Log at appropriate levels (info for normal flow, warn for retries, error for failures)
- Include structured context (topic, workspaceId, pipelineId) as separate fields, not in message strings
- Use `msg` for human-readable summary, structured fields for machine parsing

**DON'T**:
- Log sensitive data (PII, credentials, full payloads unless explicitly debug mode)
- Log excessively in hot paths (> 1000 msg/s = use sampling)
- Concatenate context into message strings (breaks Loki queries)

### 7.2 Correlation ID Propagation

- HTTP services: Read from `x-request-id` header, generate if missing (nanoid/uuid)
- Kafka messages: Store in `requestId` header (string)
- MongoDB writes: Include `requestId` field in trace event docs
- Downstream HTTP calls: Forward `x-request-id` header

### 7.3 Metric Naming

**End-User Metrics** (WebApp):
- Use business terms: "Messages Delivered", "Failed Transformations"
- Aggregate to pipeline level (hide Kafka internals)

**Platform Metrics** (Grafana):
- Use technical terms: "Consumer Lag (Partitions 0-2)", "Broker Disk Usage"
- Expose raw Kafka/service data

---

## 8. References

- **Grafana Loki**: https://grafana.com/oss/loki/
- **LogQL Query Language**: https://grafana.com/docs/loki/latest/logql/
- **Pino Logger**: https://getpino.io/
- **Kafka Monitoring**: https://kafka.apache.org/documentation/#monitoring
- **Platform Requirements**: [requirements-ux.md](../requirements-ux.md) (§7, §9)
- **Solution Design**: [solution-design.md](../solution-design.md)
