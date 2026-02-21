# Quick Start

This guide helps you complete your first end-to-end setup in the dashboard.

## Before You Begin

- You can sign in to the webapp.
- You have permission to create or edit workspaces, pipelines, clients, and connections.
- Core platform services are available in your environment.

## 1. Sign In

1. Open the webapp login page.
2. Authenticate with your platform credentials.
3. Confirm you land on the Dashboard.

If sign-in fails, contact your platform administrator for account and role access.

## 2. Create a Workspace

1. Go to **Workspaces**.
2. Select **Add Workspace**.
3. Enter a clear name and code.
4. Save the workspace.

Tip: Use short, stable workspace codes to keep pipeline topic naming predictable.

## 3. Create a Pipeline

1. Go to **Pipelines**.
2. Select **Create Pipeline**.
3. Set the pipeline name, code, and workspace.
4. Save the draft pipeline.

At this point, you should be able to open pipeline details and flow configuration.

## 4. Configure Flow Components

Inside pipeline flow:

- Add a **Source Connector** to define inbound data.
- Add one or more **Streams** for source/sink paths.
- Add a **Transformation** (for example, Jsonata) if mapping is required.
- Add a **Sink Connector** for outbound delivery.

Save changes after each configuration step.

## 5. Activate and Validate

1. Start the pipeline.
2. Send a test event through your configured source.
3. Verify status and logs in dashboard observability screens.

Expected result:

- Pipeline state is active.
- Messages are processed without errors.
- No unexpected DLQ growth.

## 6. Troubleshooting Checklist

- Confirm the pipeline is started.
- Confirm source and sink connector settings.
- Confirm stream names and transformation mappings.
- Check logs for validation or authorization errors.
- Check topic/stream naming mismatches between source and flow config.

## Next Steps

- Review **Observability** dashboards for runtime behavior.
- Add more streams and transformations for additional event paths.
- Define standard operating procedures for retries and DLQ handling.
