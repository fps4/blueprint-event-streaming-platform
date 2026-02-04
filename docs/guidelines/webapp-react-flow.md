# Webapp: React Flow Pipeline Builder

This guideline covers the file organization and implementation strategy for the visual pipeline builder using React Flow in the webapp. The pipeline flow widget allows users to compose event streaming pipelines by connecting sources, transforms, topics, and sinks visually.

## Overview

- **Location**: `services/webapp/src/sections/pipeline/flow/`
- **Integration Point**: `pipeline-details-view.jsx` renders the flow canvas in the main card area
- **Dependencies**: `reactflow`, existing MUI/Minimal theme
- **Data Model**: Aligns with control-api pipeline/connector/worker schemas

## File Structure

```
services/webapp/src/sections/pipeline/
├── view/
│   └── pipeline-details-view.jsx         # Main view (integrates <PipelineFlow />)
├── flow/                                  # NEW: React Flow module
│   ├── index.js                           # Export main PipelineFlow component
│   ├── pipeline-flow.jsx                  # Main ReactFlow container + state
│   ├── nodes/                             # Custom node components
│   │   ├── index.js                       # Export all node types
│   │   ├── source-node.jsx                # HTTP source, Kafka source connectors
│   │   ├── transform-node.jsx             # Jsonata worker node
│   │   ├── sink-node.jsx                  # HTTP sink, DB sink, etc.
│   │   └── topic-node.jsx                 # Kafka topic representation
│   ├── edges/                             # Custom edge types (optional)
│   │   ├── index.js
│   │   └── topic-edge.jsx                 # Styled edges for data flow
│   ├── controls/                          # UI controls for flow canvas
│   │   ├── node-palette.jsx               # Draggable node templates/toolbar
│   │   └── flow-toolbar.jsx               # Save, validate, export, layout buttons
│   ├── templates/                         # Pre-built pipeline templates
│   │   ├── index.js                       # Export all templates
│   │   ├── basic-ingest.js                # HTTP → Topic (raw)
│   │   ├── transform-pipeline.js          # Source → Topic → Worker → Topic (enriched) → Sink
│   │   └── multi-sink.js                  # One source → multiple consumers
│   ├── utils/
│   │   ├── flow-validator.js              # Validate topology + topic naming conventions
│   │   ├── flow-serializer.js             # Convert flow ↔ API format (pipeline + connectors + workers)
│   │   └── layout-helper.js               # Auto-layout algorithms (dagre, elkjs, or manual)
│   └── hooks/
│       ├── use-pipeline-flow.js           # Flow state management (nodes, edges, callbacks)
│       └── use-flow-persistence.js        # Save/load flow from control-api
└── pipeline-form.jsx                      # (existing form, may be merged or coexist)
```

## Component Responsibilities

### 1. `pipeline-flow.jsx` (Main Container)
- Renders `<ReactFlow>` with custom node/edge types
- Manages canvas state (zoom, pan, selection)
- Integrates `node-palette`, `flow-toolbar`, and React Flow controls (MiniMap, Background, Controls)
- Handles node/edge CRUD via callbacks
- Emits save/validate events to parent view

### 2. `nodes/` (Custom Node Types)
Each node type represents a pipeline component and renders:
- **Node UI**: Icon, label, configuration summary, status indicator
- **Handles**: Input/output connection points (React Flow handles)
- **Inline Actions**: Edit config, delete, duplicate (icon buttons)
- **Validation State**: Visual feedback for naming/config errors

**Node Types**:
- **`source-node.jsx`**: Represents HTTP source or Kafka source connectors. Outputs to a topic.
- **`topic-node.jsx`**: Represents a Kafka topic with naming convention display (`<env>.<workspace>.<stream>.<variant>`). Shows partition count, retention, ACLs summary.
- **`transform-node.jsx`**: Represents a Jsonata worker. Input topic → transform logic → output topic.
- **`sink-node.jsx`**: Represents HTTP sink, DB sink, or other consumers. Inputs from a topic.

### 3. `edges/` (Custom Edge Types, Optional)
- **`topic-edge.jsx`**: Styled edge to visualize data flow between nodes (animated, colored by topic variant: raw, enriched, dlq).
- Alternatively, use default React Flow edges with custom styling.

### 4. `controls/node-palette.jsx` (Node Toolbar)
- Displays draggable node templates (sources, transforms, sinks, topics)
- User drags a template onto canvas → triggers `onNodesChange` to add node
- Categorized sections: "Sources", "Topics", "Transforms", "Sinks"
- Icons aligned with platform conventions

### 5. `controls/flow-toolbar.jsx` (Action Bar)
- **Save**: Serialize flow → POST/PUT to control-api
- **Validate**: Run `flow-validator` → show errors/warnings
- **Auto Layout**: Apply dagre/elkjs layout
- **Export/Import**: JSON export for backup/sharing
- **Template Menu**: Load pre-built templates

### 6. `templates/` (Pre-Built Flows)
Export JS objects defining nodes + edges for common patterns:
- **`basic-ingest.js`**: HTTP source → `<env>.<workspace>.<stream>.raw` topic
- **`transform-pipeline.js`**: HTTP source → raw topic → Jsonata worker → enriched topic → HTTP sink
- **`multi-sink.js`**: One source → multiple topics/sinks (fan-out)

Templates are JSON-serializable and compatible with React Flow's `nodes`/`edges` format.

### 7. `utils/flow-validator.js`
Validates pipeline topology:
- **Topic Naming**: Enforces `<env>.<workspace>.<stream>.<variant>` convention
- **Required Topics**: DLQ/retry topics exist for each source/worker
- **Connection Rules**: Sources must output to topics, workers must have input + output topics, sinks must input from topics
- **Duplicate Names**: No duplicate topic names in same pipeline
- **Circular Dependencies**: Detect cycles (optional, if workers can feed back)

Returns array of `{ type: 'error'|'warning', node: nodeId, message: string }`.

### 8. `utils/flow-serializer.js`
Converts between React Flow format and control-api format:
- **`flowToApi(nodes, edges)`**: Extracts connectors, workers, topics → POST body for control-api
- **`apiToFlow(pipelineData)`**: Deserializes pipeline JSON → React Flow nodes/edges for editing
- Handles node positions, metadata, config objects

### 9. `utils/layout-helper.js`
Auto-layout algorithms:
- **`autoLayoutDagre(nodes, edges)`**: Uses dagre for hierarchical layout
- **`autoLayoutElk(nodes, edges)`**: Uses elkjs for more complex layouts (optional)
- Mutates node positions and returns updated nodes array

### 10. `hooks/use-pipeline-flow.js`
Encapsulates React Flow state management:
- `nodes`, `edges`, `onNodesChange`, `onEdgesChange`, `onConnect`
- Validation state, error messages
- Template loading logic
- Node/edge CRUD helpers (`addNode`, `removeNode`, `updateNodeData`)

### 11. `hooks/use-flow-persistence.js`
Handles save/load from control-api:
- `loadPipeline(pipelineId)`: Fetch pipeline → deserialize → set nodes/edges
- `savePipeline(pipelineId, nodes, edges)`: Serialize → PUT to `/api/pipelines/:id`
- Loading/saving state, error handling

## Integration with `pipeline-details-view.jsx`

Replace the placeholder card content with:
```jsx
import { PipelineFlow } from '../flow';

// Inside render:
<Card sx={{ minHeight: 600, p: 0 }}>
  {loading ? (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 600 }}>
      <CircularProgress />
    </Box>
  ) : (
    <PipelineFlow pipelineId={pipelineId} pipeline={pipeline} />
  )}
</Card>
```

## Data Persistence Model

### MongoDB Storage
Pipeline flow configurations are stored in MongoDB via the control-api. The `Pipeline` document schema (`packages/data-models/src/schemas/pipeline.ts`) needs to be extended with a new field to store the React Flow visual configuration:

```typescript
// Add to PipelineDocument interface:
export interface PipelineDocument extends Document<string> {
  // ... existing fields
  flowConfig?: {
    nodes: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      data: Record<string, any>;
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      sourceHandle?: string;
      targetHandle?: string;
    }>;
    viewport?: { x: number; y: number; zoom: number };
  };
}
```

**Persistence Flow**:
1. User edits pipeline flow in React Flow canvas
2. User clicks "Save" → `flow-serializer.js` converts React Flow format to API format
3. Webapp calls `PUT /api/pipelines/:id` with serialized `flowConfig`
4. Control-api validates and stores in MongoDB pipeline document
5. On load: control-api returns pipeline with `flowConfig` → `flow-serializer.js` deserializes to React Flow nodes/edges

**Schema Considerations**:
- `flowConfig` is optional (nullable) to support pipelines created without visual editor
- Store both visual representation (`flowConfig`) AND logical configuration (`streams`, `sourceClients`, `sinkClients`, `transform`)
- The serializer ensures consistency between visual flow and logical config
- Node `data` field stores node-specific configuration (topic names, transform IDs, connector configs)

### Dual Representation
The pipeline has two complementary representations in MongoDB:
- **Logical**: `streams[]`, `sourceClients[]`, `sinkClients[]`, `transform` (existing schema) — used by control-api to provision Kafka resources
- **Visual**: `flowConfig` (new field) — used by webapp to render/edit the flow diagram

The `flow-serializer.js` ensures both stay synchronized on save.

## Platform Alignment

### Topic Naming Conventions
- Topics must follow `<env>.<workspace>.<stream>.<variant>` format
- Validator enforces max 249 chars, allowed chars: `a-zA-Z0-9._-`
- DLQ topics (`*.dlq`) and retry topics (`*.retry`) are first-class and auto-suggested

### Node Type Mapping
- **HTTP Source Node** → `POST /api/connectors` with `type: 'http-source'`
- **HTTP Sink Node** → `POST /api/connectors` with `type: 'http-sink'`
- **Jsonata Worker Node** → `POST /api/workers` with `type: 'jsonata'`
- **Topic Node** → Topic config in pipeline metadata; topics are provisioned by control-api

### Authentication & Authorization
- Flow widget respects user's workspace-scoped token
- Topic ACLs are implied by pipeline ownership
- Control-api enforces topic creation rules; UI shows validation feedback pre-save

## Implementation Checklist

- [ ] Extend `pipeline.ts` schema with `flowConfig` field for storing React Flow state
- [ ] Update control-api pipeline routes to accept/return `flowConfig`
- [ ] Install `reactflow` in `services/webapp`: `npm install reactflow`
- [ ] Create `flow/` folder structure under `sections/pipeline/`
- [ ] Implement `pipeline-flow.jsx` with basic ReactFlow setup
- [ ] Create custom node components (source, topic, transform, sink)
- [ ] Build `node-palette.jsx` with draggable templates
- [ ] Implement `flow-validator.js` with topic naming + connection rules
- [ ] Implement `flow-serializer.js` for API ↔ flow conversion
- [ ] Create at least one template (`basic-ingest.js`)
- [ ] Integrate `<PipelineFlow>` into `pipeline-details-view.jsx`
- [ ] Add save/load hooks connecting to control-api
- [ ] Style nodes/edges with MUI theme colors
- [ ] Add auto-layout support (dagre or elkjs)
- [ ] Test template loading + validation + save flow end-to-end

## UI/UX Best Practices

- **Drag & Drop**: Node palette should support drag-to-canvas
- **Connection Feedback**: Visual cues for valid/invalid connections (red/green handles)
- **Inline Editing**: Double-click node to open config dialog/panel
- **Mini Map**: Show for large flows (React Flow `<MiniMap>`)
- **Keyboard Shortcuts**: Delete selected node (Del/Backspace), Undo/Redo (Ctrl+Z/Y)
- **Responsive**: Flow canvas should fill card, min-height 600px
- **Validation Feedback**: Show errors inline on nodes (red border, tooltip) and in toolbar summary

## References

- **React Flow Docs**: https://reactflow.dev/
- **Platform Topic Conventions**: See `packages/connector-core/src/utils/topic-utils.js`
- **Control API Schemas**: `packages/data-models/src/schemas/pipeline.schema.js`
- **Existing Minimal Patterns**: `docs/guidelines/webapp-adding-new-list-edit-view.md`

## Notes

- Keep flow state ephemeral until user clicks "Save"
- Use `react-hook-form` or similar for node config dialogs if needed
- Consider debouncing validation to avoid UI lag on large flows
- For MVP, start with basic node types and static templates; iterate based on user feedback
