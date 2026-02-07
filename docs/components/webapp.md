# UI & Control Surface

How operators and integration engineers interact with the platform via the UI and Control API. Companion to the user flows in [requirements-ux.md](../requirements-ux.md) and the API surface in [control-api.md](./control-api.md).

## Responsibilities
- Present the platform control plane for end-user flows; no direct data-path ingestion or delivery.
- Enforce RBAC per environment; audit all mutations (who/when/what); relies on **Authorizer** for tokens.
- Backed by Kafka, Schema Registry, Kafka Connect, Custom Connectors, and ksqlDB metadata via **Control API**.
- Drives the wizard steps described in `requirements-ux.md` (source → topics → transform → destinations → observability → access).

## End User Goals (surfaced in UI)
- Access & Authentication: sign in, register/manage access.
- Pipeline & Workspace Management: create workspaces; create pipelines with source/sink configuration and transformation logic; start/stop pipelines.
- Observability & Operations: view dashboards with key pipeline statistics; view run logs/traces; monitor Kafka metrics; receive alerts/notifications on source/sink connector failures.
- Metadata & Governance: browse/search schema catalog, diff schemas (PII, impact), pin schema versions to integrations.
- Documentation: view user documentation inside the UI.

## Capabilities (UI-facing)
- Workspaces: create/edit workspaces with codes and allowed origins; list/filter workspaces.
- Pipelines: create/edit pipelines with streams and source/sink connectors; visualize pipeline flows with React Flow; start/stop pipelines.
- Clients: create/edit global authenticated clients (source producers); manage allowed scopes/topics; list/filter clients.
- Connections: create/edit external sink destinations (HTTP endpoints, S3 buckets); manage type-specific configurations; list/filter connections.
- Source Connectors: link clients to pipeline source streams with connector type (HTTP, S3); visualize in pipeline flow diagram.
- Sink Connectors: link connections to pipeline sink streams for data delivery (placeholder for future implementation).
- Transformations (Jsonata): configure Jsonata expressions for pipeline transforms; version pinning (via worker-jsonata).
- Topics & broker config: display retention/partitioning/compaction per naming convention; read-only guardrails.
- Observability: integration status (active/paused/failed), per-message trace (ingest → transform → delivery/DLQ), Kafka metrics, alerts/notifications for connector failures.
- Schema catalog: browse, diff, tag (PII), view impact; pin versions to integrations (future).
- Replay & DLQ: select window or IDs, dry-run validation, rate limiting, target schema/mapping versions, audit trail (future).
- Docs aggregation: shared Swagger/Redoc portal for platform services and user docs.

## Related Services
- **Control API** (`control-api.md`): primary backend for UI flows.
- **Authorizer** (`authorizer.md`): issues tokens for UI/control usage.
- **Connectors** (`connectors.md`): connector lifecycle surfaced in UI.
