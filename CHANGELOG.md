# Change Log

## [Unreleased]
### Added - Pipeline Multiple Transformations Support
- **Data Models**: Pipeline schema now supports multiple transformations
  - Changed `transform` (single object) to `transforms` (array)
  - Added `isPaused` field to TransformConfig for pausing individual transformations
  - Validation enforces unique `targetStream` values across all transformations
- **Control API**: Enhanced pipeline transformation handling
  - POST/PUT endpoints now accept `transforms` array instead of `transform` object
  - Backend validation ensures no duplicate target streams (returns 400 error)
  - Updated OpenAPI documentation with detailed TransformConfig schema
- **Documentation**: Updated schemas and API docs
  - packages/openapi-components/control-api.yaml reflects transforms array
  - docs/components/data-models.md updated with transforms field description

### Breaking Changes
- **API**: Pipeline `transform` field replaced with `transforms` array
  - Old pipelines with `transform` field need migration
  - Frontend must update to use transforms array

### Added - Pipeline Flow Visualization Enhancements
- **Webapp**: Interactive drag-and-drop pipeline flow canvas with persistent node positions
  - Single stream creation with type dropdown (source, sink, dlq, replay)
  - Column-based auto-positioning: nodes align under action buttons
  - Draggable nodes with positions saved to MongoDB
  - Shared node styling system (`shared-node-styles.js`) for consistent appearance
  - Color-coded stream variants: source (green), sink (blue), dlq (red), replay (orange)
  - Horizontal left-to-right data flow visualization
  - Stream caption labels on all node types
- **Transformation Dialog**: Enhanced configuration options
  - Type dropdown (currently JSONata only, extensible)
  - Failure Queue (DLQ) selection (optional)
  - Source/target stream selection with proper variant filtering
- **Edge Visualization**: Smart connection logic
  - Transformation edges automatically connect to correct stream variants
  - Dashed red lines for failure queue connections
  - Animated edges for active data flow
- **Data Models**: Extended Pipeline schema
  - `nodePositions` field (map of nodeId → {x, y}) for UI layout persistence
  - `failureQueue` field in TransformConfig for DLQ routing
  - Stream type enum extended: `source | sink | dlq | replay`
- **Control API**: Pipeline update endpoint now accepts `nodePositions` field

### Changed
- Stream creation changed from creating pairs (source+sink) to single stream with type selection
- Action buttons (Add Stream, Add Connector, Add Transformation) now fixed at top, non-draggable
- All other functions disabled until at least one stream exists
- Target stream finding logic prefers sink variant for transformation connections

### Fixed
- Transformation edges now correctly connect to target streams with proper variant detection
- Node positions persist across page navigation and browser sessions

## [0.0.1] 2026-01-18
### Initial design

- Define requirements and clarify main components
- Add CHANGELOG.md to track all changes

