# Delivery Blueprint: Event Streaming Platform (Kafka)

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

## Architecture at a glance

Deployed locally via Docker Compose (see `compose.yaml`):

- Kafka platform layer: **Apache Kafka**, **Schema Registry**, **Kafka Connect**, (optional) **ksqlDB**
- Control plane: **control-api** (MongoDB-backed)
- Security: **authorizer** (JWT issuance/refresh)
- Data plane:
  - `connector-http-source` (`POST /ingest/:topic`)
  - `worker-jsonata` (Kafka → Kafka transforms, DLQ on failure)
  - `connector-http-sink` (consumer skeleton today; future: REST delivery)
- Supporting infra: **MongoDB** (state/auth), optional **ClickHouse** scaffolding

## Operational model

- Topic convention: `<env>.<workspace>.<stream>.<variant>` with variants like `raw`, `enriched`, `dlq`, `retry`.
- DLQ + replay are first-class UX flows (demo-critical): show a failing message landing in DLQ, fix mapping/schema, then replay.
- Observability: correlation/request IDs, consumer lag/DLQ metrics, structured logs.

## Docs

Start here: [`/docs/README.md`](./docs/README.md)

Key reads:
- [Requirements & UX](./docs/requirements-ux.md)
- [Solution Design](./docs/solution-design.md)
