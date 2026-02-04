'use client';

import { useState, useCallback, useMemo } from 'react';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

import { updatePipeline } from 'src/api/pipeline';
import { AddStreamNode, StreamNode } from './nodes';
import { AddStreamDialog } from './add-stream-dialog';

const nodeTypes = {
  addStream: AddStreamNode,
  stream: StreamNode,
};

const NODE_VERTICAL_SPACING = 150;
const NODE_START_Y = 50;

export function PipelineFlow({ pipelineId, pipeline }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Extract stream names from pipeline.streams (assuming streams have topic field)
  const existingStreams = useMemo(() => {
    if (!Array.isArray(pipeline?.streams)) return [];
    
    // Return array of { streamName, variant } objects
    return pipeline.streams.map((stream) => {
      if (stream?.topic) {
        const parts = stream.topic.split('.');
        if (parts.length >= 4) {
          // Format: env.workspace.stream.variant
          const variant = parts[parts.length - 1]; // last part is variant (source/sink)
          const streamName = parts.slice(2, -1).join('.'); // everything between workspace and variant
          return { streamName, variant, type: stream.type };
        }
      }
      return null;
    }).filter(Boolean);
  }, [pipeline]);

  // Build nodes array
  const nodes = useMemo(() => {
    const result = [];
    
    // Add existing stream nodes (one node per stream variant)
    existingStreams.forEach((stream, index) => {
      result.push({
        id: `stream-${stream.streamName}-${stream.variant}`,
        type: 'stream',
        position: { x: 100, y: NODE_START_Y + index * NODE_VERTICAL_SPACING },
        data: {
          streamName: stream.streamName,
          variant: stream.variant,
        },
      });
    });

    // Add "Add Stream" node at the bottom
    result.push({
      id: 'add-stream',
      type: 'addStream',
      position: { x: 100, y: NODE_START_Y + existingStreams.length * NODE_VERTICAL_SPACING },
      data: {
        onClick: () => setDialogOpen(true),
      },
    });

    return result;
  }, [existingStreams]);

  const edges = useMemo(() => [], []); // No edges for MVP

  const handleAddStream = useCallback(
    async (streamName) => {
      if (!pipelineId || !pipeline?.workspaceId) {
        setError('Pipeline or workspace ID missing');
        return;
      }

      setSaving(true);
      setError(null);

      try {
        const env = 'dev'; // TODO: derive from context
        const workspace = pipeline.workspaceId;

        // Create two topic entries: source and sink
        const newStreams = [
          {
            topic: `${env}.${workspace}.${streamName}.source`,
            type: 'source',
            description: `Source topic for ${streamName}`,
          },
          {
            topic: `${env}.${workspace}.${streamName}.sink`,
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
        elementsSelectable={true}
        nodesFocusable={true}
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
        workspace={pipeline?.workspaceId || 'default'}
      />
    </Box>
  );
}
