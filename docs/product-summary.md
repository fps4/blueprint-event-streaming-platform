# Product Summary: Event Streaming Platform (Kafka)

A delivery blueprint for an **in-house, Kafka-native event streaming and integration platform** where Kafka stays internal-only and teams integrate through APIs and a control plane (configuration over code).

## What it is

This blueprint packages the core building blocks needed to run a multi-tenant “REST → Kafka → Transform → Kafka → Deliver” platform:

- **Ingest** events via REST (webhook-style) into Kafka topics.
- **Validate + transform** events using a managed runtime (initial implementation: Jsonata worker; roadmap includes ksqlDB/Streams runtimes).
- **Deliver** to downstream systems via connectors (Kafka Connect + HTTP sink; S3 sink is part of the UX scope).
- **Operate and govern** integrations through a **Control API** (and a UI in the design), with auditability, replay/DLQ patterns, and clear ownership boundaries.

## Who it’s for

- **Platform team**: owns Kafka, Kafka Connect/ksqlDB, runtime operations, guardrails, observability.
- **Product / integration teams**: own schemas, mappings/transform versions, destinations, and activation/rollout.

## Core capabilities

### Ingestion (REST → Kafka)
- **HTTP source service** exposes `POST /ingest/:topic`.
- Enforces `Content-Type: application/json`, requires a **non-empty JSON object/array**, validates topic names via `validateTopicName`, and returns **`202 Accepted`** with a propagated/generated `x-request-id`.

### Transform runtime (Kafka → Kafka)
- **worker-jsonata** watches versioned `JsonataTransform` configs from MongoDB (via the Control API data models), subscribes to active `sourceTopic`s, applies the Jsonata expression, and produces to the configured `targetTopic`.
- On failures (transform/validation), writes to **DLQ** with context and headers (e.g., `x-request-id`, `x-dlq-reason`).

### Delivery (Kafka → REST / S3)
- Platform-managed **Kafka Connect** is the connector runtime (configured via REST: list/create/update/pause/resume/delete).
- HTTP sink behavior is represented both as a Connect plugin path (design) and as an in-repo Node service (currently logs consumed records; future: real delivery).
- UX scope includes **multi-destination delivery** (REST + S3), retries/backoff, idempotency hints, and operational controls.

### Control plane + security
- **Control API** manages workspaces, clients, users, topics, and transform configs; persists state in **MongoDB** and uses KafkaJS Admin for broker interactions.
- **Authorizer** issues short-lived **HS256 JWTs** for machine clients and UI sessions, with workspace + scope/topic restrictions.

## Architecture at a glance

**Kafka platform layer**: Apache Kafka + Schema Registry + Kafka Connect + (optionally) ksqlDB.

**Services included (docker compose)**:
- `control-api` (metadata + topic admin + transform configs)
- `authorizer` (JWT issuance/refresh)
- `connector-http-source` (REST ingress)
- `connector-http-sink` (consumer skeleton / future delivery)
- `worker-jsonata` (transform runtime)
- Supporting infra: `broker`, `schema-registry`, `kafka-connect`, `ksqldb`, `mongodb` (+ ClickHouse scaffolding)

## Operational model

- Standard topic naming convention: `<env>.<workspace>.<stream>.<variant>` with variants like `raw`, `enriched`, `dlq`, `retry`.
- DLQ + replay are first-class UX flows (demo-critical): show a failing message landing in DLQ, fix mapping/schema, then replay.
- Designed for strong observability: correlation IDs, lag/DLQ metrics, structured logs.

## What you can build with it

- A centralized integration platform for internal products where teams can onboard new event flows **without writing code** (primarily via configuration and versioned mappings).
- A reliable pipeline for webhooks/internal APIs → Kafka → transformations → downstream REST/S3 systems, with governance (schemas, RBAC), rollback, and on-call friendly controls.
