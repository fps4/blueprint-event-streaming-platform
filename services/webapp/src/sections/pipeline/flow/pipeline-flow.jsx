'use client';

import 'reactflow/dist/style.css';

import { useMemo, useState, useCallback } from 'react';
import ReactFlow, { MiniMap, Controls, Background } from 'reactflow';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

import { updatePipeline } from 'src/api/pipeline';

import { StreamNode, AddStreamNode, ClientNode, SourceConnectorNode, AddSourceConnectorNode } from './nodes';
import { AddStreamDialog } from './add-stream-dialog';
import { AddSourceConnectorDialog } from './add-source-connector-dialog';

const nodeTypes = {
  addStream: AddStreamNode,
  stream: StreamNode,
  client: ClientNode,
  sourceConnector: SourceConnectorNode,
  addSourceConnector: AddSourceConnectorNode,
};

const NODE_VERTICAL_SPACING = 150;
const NODE_START_Y = 50;

export function PipelineFlow({ pipelineId, pipeline }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [connectorDialogOpen, setConnectorDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Extract stream names from pipeline.streams (assuming streams have topic field)
  const existingStreams = useMemo(() => {
    if (!Array.isArray(pipeline?.streams)) return [];
    
    // Return array of { streamName, variant } objects
    return pipeline.streams.map((stream) => {
      if (stream?.topic) {
        const parts = stream.topic.split('.');
        if (parts.length >= 5) {
          // Format: env.workspace_code.pipeline_code.stream.variant
          const variant = parts[parts.length - 1]; // last part is variant (source/sink)
          const streamName = parts.slice(3, -1).join('.'); // everything after pipeline_code and before variant
          return { streamName, variant, type: stream.type };
        }
      }
      return null;
    }).filter(Boolean);
  }, [pipeline]);

  // Extract source connectors from pipeline.sourceClients
  const sourceConnectors = useMemo(() => {
    if (!Array.isArray(pipeline?.sourceClients)) return [];
    return pipeline.sourceClients;
  }, [pipeline]);

  // Build nodes array
  const nodes = useMemo(() => {
    const result = [];
    let yOffset = NODE_START_Y;
    
    // Add source connector nodes (client -> connector pairs)
    sourceConnectors.forEach((connector, index) => {
      // Create unique ID using clientId + streamName
      const uniqueId = `${connector.clientId}-${connector.streamName || index}`;
      
      // Client node (left side)
      result.push({
        id: `client-${uniqueId}`,
        type: 'client',
        position: { x: 50, y: yOffset },
        data: {
          clientName: connector.clientName || connector.clientId,
        },
      });
      
      // Source connector node (middle)
      result.push({
        id: `source-connector-${uniqueId}`,
        type: 'sourceConnector',
        position: { x: 280, y: yOffset },
        data: {
          connectorType: connector.connectorType,
          description: connector.description,
        },
      });
      
      yOffset += NODE_VERTICAL_SPACING;
    });

    // Add existing stream nodes (right side)
    existingStreams.forEach((stream, index) => {
      result.push({
        id: `stream-${stream.streamName}-${stream.variant}`,
        type: 'stream',
        position: { x: 510, y: NODE_START_Y + index * NODE_VERTICAL_SPACING },
        data: {
          streamName: stream.streamName,
          variant: stream.variant,
        },
      });
    });

    // Add "Add Source Connector" button node at the bottom left
    result.push({
      id: 'add-source-connector',
      type: 'addSourceConnector',
      position: { x: 50, y: yOffset },
      data: {
        onClick: () => setConnectorDialogOpen(true),
      },
    });

    // Add "Add Stream" node at the bottom (right side)
    result.push({
      id: 'add-stream',
      type: 'addStream',
      position: { x: 510, y: NODE_START_Y + existingStreams.length * NODE_VERTICAL_SPACING },
      data: {
        onClick: () => setDialogOpen(true),
      },
    });

    return result;
  }, [existingStreams, sourceConnectors]);

  // Build edges array to connect client -> connector -> stream
  const edges = useMemo(() => {
    const result = [];
    
    // Connect each client to its connector
    sourceConnectors.forEach((connector, index) => {
      // Create unique ID using clientId + streamName
      const uniqueId = `${connector.clientId}-${connector.streamName || index}`;
      
      result.push({
        id: `edge-client-${uniqueId}`,
        source: `client-${uniqueId}`,
        target: `source-connector-${uniqueId}`,
        animated: true,
      });
      
      // Connect connector to its specific source stream (if streamName is specified)
      if (connector.streamName) {
        result.push({
          id: `edge-connector-${uniqueId}-${connector.streamName}`,
          source: `source-connector-${uniqueId}`,
          target: `stream-${connector.streamName}-source`,
          animated: false,
        });
      }
    });
    
    return result;
  }, [sourceConnectors]);

  const handleAddStream = useCallback(
    async (streamName) => {
      if (!pipelineId || !pipeline?.workspaceId) {
        setError('Pipeline or workspace ID missing');
        return;
      }

      if (!pipeline?.workspaceCode || !pipeline?.code) {
        setError('Pipeline or workspace code missing');
        return;
      }

      setSaving(true);
      setError(null);

      try {
        const env = 'dev'; // TODO: derive from context
        const workspaceCode = pipeline.workspaceCode;
        const pipelineCode = pipeline.code;

        // Create two topic entries: source and sink
        const newStreams = [
          {
            topic: `${env}.${workspaceCode}.${pipelineCode}.${streamName}.source`,
            type: 'source',
            description: `Source topic for ${streamName}`,
          },
          {
            topic: `${env}.${workspaceCode}.${pipelineCode}.${streamName}.sink`,
            type: 'sink',
            description: `Sink topic for ${streamName}`,
          },
        ];

        const updatedStreams = [...(pipeline.streams || []), ...newStreams];

        await updatePipeline(pipelineId, {
          workspaceId: pipeline.workspaceId,
          streams: updatedStreams,
        });

        // Trigger parent to refetch pipeline data
        window.location.reload(); // Simple approach for MVP; ideally use state management
      } catch (err) {
        console.error('Failed to add stream:', err);
        setError(err?.message || 'Failed to add stream');
      } finally {
        setSaving(false);
      }
    },
    [pipelineId, pipeline]
  );

  const handleAddSourceConnector = useCallback(
    async (connectorData) => {
      if (!pipelineId || !pipeline?.workspaceId) {
        setError('Pipeline or workspace ID missing');
        return;
      }

      setSaving(true);
      setError(null);

      try {
        const newSourceClient = {
          clientId: connectorData.clientId,
          role: 'source',
          connectorType: connectorData.connectorType,
          streamName: connectorData.streamName,
          description: connectorData.description || '',
        };

        const updatedSourceClients = [...(pipeline.sourceClients || []), newSourceClient];

        await updatePipeline(pipelineId, {
          workspaceId: pipeline.workspaceId,
          sourceClients: updatedSourceClients,
        });

        // Trigger parent to refetch pipeline data
        window.location.reload(); // Simple approach for MVP; ideally use state management
      } catch (err) {
        console.error('Failed to add source connector:', err);
        setError(err?.message || 'Failed to add source connector');
      } finally {
        setSaving(false);
      }
    },
    [pipelineId, pipeline]
  );

  if (!pipeline) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: 600, position: 'relative' }}>
      {error && (
        <Alert severity="error" sx={{ position: 'absolute', top: 16, left: 16, right: 16, zIndex: 10 }}>
          {error}
        </Alert>
      )}
      {saving && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(255,255,255,0.7)',
            zIndex: 20,
          }}
        >
          <CircularProgress />
        </Box>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.5}
        maxZoom={1.5}
        nodesDraggable={false}
        nodesConnectable={false}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
      <AddStreamDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onAdd={handleAddStream}
        env="dev"
        workspaceCode={pipeline?.workspaceCode || ''}
        pipelineCode={pipeline?.code || ''}
      />
      <AddSourceConnectorDialog
        open={connectorDialogOpen}
        onClose={() => setConnectorDialogOpen(false)}
        onAdd={handleAddSourceConnector}
        sourceStreams={existingStreams.filter((s) => s.variant === 'source')}
      />
    </Box>
  );
}
