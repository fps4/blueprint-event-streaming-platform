'use client';

import 'reactflow/dist/style.css';

import { useMemo, useState, useCallback, useEffect } from 'react';
import ReactFlow, { MiniMap, Controls, Background, useNodesState, useEdgesState } from 'reactflow';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import AddIcon from '@mui/icons-material/Add';

import { updatePipeline } from 'src/api/pipeline';

import { StreamNode, ClientNode, SourceConnectorNode, ConnectionNode, SinkConnectorNode, TransformationNode } from './nodes';
import { AddStreamDialog } from './add-stream-dialog';
import { AddSourceConnectorDialog } from './add-source-connector-dialog';
import { AddSinkConnectorDialog } from './add-sink-connector-dialog';
import { AddTransformationDialog } from './add-transformation-dialog';
import { EditTransformationDialog } from './edit-transformation-dialog';
import { EditSourceConnectorDialog } from './edit-source-connector-dialog';
import { EditSinkConnectorDialog } from './edit-sink-connector-dialog';

const nodeTypes = {
  stream: StreamNode,
  client: ClientNode,
  sourceConnector: SourceConnectorNode,
  connection: ConnectionNode,
  sinkConnector: SinkConnectorNode,
  transformation: TransformationNode,
};

const NODE_VERTICAL_SPACING = 150;
const CONTENT_START_Y = 50; // Y position where content starts (buttons moved to toolbar)

// Column X positions
const COLUMNS = {
  SOURCE_CONNECTOR: 50,
  STREAM: 280,
  TRANSFORMATION: 510,
  SINK_CONNECTOR: 740,
  CLIENT: -180,
  CONNECTION: 970,
};

export function PipelineFlow({ pipelineId, pipeline }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [connectorDialogOpen, setConnectorDialogOpen] = useState(false);
  const [sinkDialogOpen, setSinkDialogOpen] = useState(false);
  const [transformDialogOpen, setTransformDialogOpen] = useState(false);
  const [editTransformDialogOpen, setEditTransformDialogOpen] = useState(false);
  const [editSourceConnectorDialogOpen, setEditSourceConnectorDialogOpen] = useState(false);
  const [editSinkConnectorDialogOpen, setEditSinkConnectorDialogOpen] = useState(false);
  const [selectedSourceConnector, setSelectedSourceConnector] = useState(null);
  const [selectedSinkConnector, setSelectedSinkConnector] = useState(null);
  const [selectedTransformationIndex, setSelectedTransformationIndex] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [nodePositions, setNodePositions] = useState({});

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

  // Extract sink connectors from pipeline.sinkConnections
  const sinkConnectors = useMemo(() => {
    if (!Array.isArray(pipeline?.sinkConnections)) return [];
    return pipeline.sinkConnections;
  }, [pipeline]);

  // Extract transformations from pipeline.transforms
  const transformations = useMemo(() => {
    if (!Array.isArray(pipeline?.transforms)) return [];
    return pipeline.transforms;
  }, [pipeline]);

  // Load saved node positions from pipeline
  useEffect(() => {
    console.log('Loading node positions from pipeline:', pipeline?.nodePositions);
    if (pipeline?.nodePositions) {
      setNodePositions(pipeline.nodePositions);
    }
  }, [pipeline]);

  // Helper function to get node position (saved or default)
  const getNodePosition = useCallback((nodeId, defaultPosition) => {
    return nodePositions[nodeId] || defaultPosition;
  }, [nodePositions]);

  // Build initial nodes array
  const initialNodes = useMemo(() => {
    const result = [];
    
    // Simple column-based layout
    let sourceConnectorY = CONTENT_START_Y;
    let streamY = CONTENT_START_Y;
    let transformationY = CONTENT_START_Y;
    let sinkConnectorY = CONTENT_START_Y;
    
    // Add all source connectors in SOURCE_CONNECTOR column
    sourceConnectors.forEach((connector) => {
      const uniqueId = `${connector.clientId}-${connector.streamName || connector.clientId}`;
      
      // Source connector node in SOURCE_CONNECTOR column with client name
      const sourceConnectorNodeId = `source-connector-${uniqueId}`;
      result.push({
        id: sourceConnectorNodeId,
        type: 'sourceConnector',
        position: getNodePosition(sourceConnectorNodeId, { x: COLUMNS.SOURCE_CONNECTOR, y: sourceConnectorY }),
        data: {
          connectorType: connector.connectorType,
          description: connector.description,
          clientName: connector.clientName || connector.clientId,
          onEdit: () => {
            setSelectedSourceConnector(connector);
            setEditSourceConnectorDialogOpen(true);
          },
        },
      });
      sourceConnectorY += NODE_VERTICAL_SPACING;
    });
    
    // Add all streams in STREAM column (under Add Stream button)
    existingStreams.forEach((stream) => {
      const streamNodeId = `stream-${stream.streamName}-${stream.variant}`;
      result.push({
        id: streamNodeId,
        type: 'stream',
        position: getNodePosition(streamNodeId, { x: COLUMNS.STREAM, y: streamY }),
        data: {
          streamName: stream.streamName,
          variant: stream.variant,
        },
      });
      streamY += NODE_VERTICAL_SPACING;
    });
    
    // Add all transformations in TRANSFORMATION column
    transformations.forEach((transformation, index) => {
      const transformationNodeId = `transformation-${index}`;
      result.push({
        id: transformationNodeId,
        type: 'transformation',
        position: getNodePosition(transformationNodeId, { x: COLUMNS.TRANSFORMATION, y: transformationY }),
        data: {
          type: transformation.type,
          sourceStream: transformation.sourceStream,
          targetStream: transformation.targetStream,
          failureQueue: transformation.failureQueue,
          description: transformation.description,
          isPaused: transformation.isPaused || false,
          onEdit: () => {
            setSelectedTransformationIndex(index);
            setEditTransformDialogOpen(true);
          },
          onTogglePause: () => handleToggleTransformationPause(index),
        },
      });
      transformationY += NODE_VERTICAL_SPACING;
    });
    
    // Add all sink connectors in SINK_CONNECTOR column
    sinkConnectors.forEach((connector) => {
      const uniqueId = `${connector.connectionId}-${connector.streamName || connector.connectionId}`;
      
      // Sink connector node in SINK_CONNECTOR column with connection name
      const sinkConnectorNodeId = `sink-connector-${uniqueId}`;
      result.push({
        id: sinkConnectorNodeId,
        type: 'sinkConnector',
        position: getNodePosition(sinkConnectorNodeId, { x: COLUMNS.SINK_CONNECTOR, y: sinkConnectorY }),
        data: {
          connectorType: connector.connectorType,
          description: connector.description,
          connectionName: connector.connectionName || connector.connectionId,
          onEdit: () => {
            setSelectedSinkConnector(connector);
            setEditSinkConnectorDialogOpen(true);
          },
        },
      });
      sinkConnectorY += NODE_VERTICAL_SPACING;
    });

    return result;
  }, [existingStreams, sourceConnectors, sinkConnectors, transformations, getNodePosition]);

  // Use ReactFlow's node state management
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  
  // Update nodes when initialNodes change
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  // Build edges array to connect client -> connector -> stream and stream -> sink connector -> connection
  const edges = useMemo(() => {
    const result = [];
    
    // Connect each connector to its specific source stream (if streamName is specified)
    sourceConnectors.forEach((connector, index) => {
      const uniqueId = `${connector.clientId}-${connector.streamName || index}`;
      
      if (connector.streamName) {
        result.push({
          id: `edge-connector-${uniqueId}-${connector.streamName}`,
          source: `source-connector-${uniqueId}`,
          target: `stream-${connector.streamName}-source`,
          animated: false,
        });
      }
    });
    
    // Connect each sink stream to its sink connector (if streamName is specified)
    sinkConnectors.forEach((connector, index) => {
      const uniqueId = `${connector.connectionId}-${connector.streamName || index}`;
      
      if (connector.streamName) {
        result.push({
          id: `edge-stream-${connector.streamName}-${uniqueId}`,
          source: `stream-${connector.streamName}-sink`,
          target: `sink-connector-${uniqueId}`,
          animated: false,
        });
      }
    });
    
    // Connect all transformations
    transformations.forEach((transformation, index) => {
      if (!transformation.sourceStream || !transformation.targetStream) return;
      
      // Find the actual source and target streams to get their variants
      const sourceStream = existingStreams.find(
        (s) => s.streamName === transformation.sourceStream && s.variant === 'source'
      );
      // For target stream, prefer sink variant, but fallback to any variant if not found
      const targetStream = existingStreams.find(
        (s) => s.streamName === transformation.targetStream && s.variant === 'sink'
      ) || existingStreams.find(
        (s) => s.streamName === transformation.targetStream && s.variant !== 'source'
      );
      
      const transformNodeId = `transformation-${index}`;
      
      if (sourceStream) {
        // Source stream -> Transformation
        result.push({
          id: `edge-transform-${index}-source`,
          source: `stream-${sourceStream.streamName}-${sourceStream.variant}`,
          target: transformNodeId,
          animated: true,
        });
      }
      
      if (targetStream) {
        // Transformation -> Target stream
        result.push({
          id: `edge-transform-${index}-target`,
          source: transformNodeId,
          target: `stream-${targetStream.streamName}-${targetStream.variant}`,
          animated: true,
        });
      }
      
      // Connect to failure queue if specified
      if (transformation.failureQueue) {
        const failureStream = existingStreams.find(
          (s) => s.streamName === transformation.failureQueue && s.variant === 'dlq'
        );
        if (failureStream) {
          result.push({
            id: `edge-transform-${index}-failure`,
            source: transformNodeId,
            target: `stream-${failureStream.streamName}-${failureStream.variant}`,
            animated: true,
            style: { stroke: '#ff0000', strokeDasharray: '5,5' },
          });
        }
      }
    });
    
    return result;
  }, [sourceConnectors, sinkConnectors, transformations, existingStreams]);

  const handleAddStream = useCallback(
    async (streamName, streamType) => {
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

        // Create one topic entry with the selected type
        const newStream = {
          topic: `${env}.${workspaceCode}.${pipelineCode}.${streamName}.${streamType}`,
          type: streamType,
          description: `${streamType.charAt(0).toUpperCase() + streamType.slice(1)} topic for ${streamName}`,
        };

        const updatedStreams = [...(pipeline.streams || []), newStream];

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

  const handleAddSinkConnector = useCallback(
    async (connectorData) => {
      if (!pipelineId || !pipeline?.workspaceId) {
        setError('Pipeline or workspace ID missing');
        return;
      }

      setSaving(true);
      setError(null);

      try {
        const newSinkConnection = {
          connectionId: connectorData.connectionId,
          connectorType: connectorData.connectorType,
          streamName: connectorData.streamName,
          description: connectorData.description || '',
        };

        const updatedSinkConnections = [...(pipeline.sinkConnections || []), newSinkConnection];

        await updatePipeline(pipelineId, {
          workspaceId: pipeline.workspaceId,
          sinkConnections: updatedSinkConnections,
        });

        // Trigger parent to refetch pipeline data
        window.location.reload(); // Simple approach for MVP; ideally use state management
      } catch (err) {
        console.error('Failed to add sink connector:', err);
        setError(err?.message || 'Failed to add sink connector');
      } finally {
        setSaving(false);
      }
    },
    [pipelineId, pipeline]
  );

  const handleEditSourceConnector = useCallback(
    async (connectorData) => {
      if (!pipelineId || !pipeline?.workspaceId || !selectedSourceConnector) {
        setError('Pipeline or workspace ID missing');
        return;
      }

      setSaving(true);
      setError(null);

      try {
        // Update the specific connector in the array
        const updatedSourceClients = (pipeline.sourceClients || []).map((connector) => {
          if (connector.clientId === selectedSourceConnector.clientId && 
              connector.streamName === selectedSourceConnector.streamName) {
            return {
              ...connector,
              connectorType: connectorData.connectorType,
              streamName: connectorData.streamName,
              description: connectorData.description,
            };
          }
          return connector;
        });

        await updatePipeline(pipelineId, {
          workspaceId: pipeline.workspaceId,
          sourceClients: updatedSourceClients,
        });

        // Trigger parent to refetch pipeline data
        window.location.reload();
      } catch (err) {
        console.error('Failed to edit source connector:', err);
        setError(err?.message || 'Failed to edit source connector');
      } finally {
        setSaving(false);
      }
    },
    [pipelineId, pipeline, selectedSourceConnector]
  );

  const handleEditSinkConnector = useCallback(
    async (connectorData) => {
      if (!pipelineId || !pipeline?.workspaceId || !selectedSinkConnector) {
        setError('Pipeline or workspace ID missing');
        return;
      }

      setSaving(true);
      setError(null);

      try {
        // Update the specific connector in the array
        const updatedSinkConnections = (pipeline.sinkConnections || []).map((connector) => {
          if (connector.connectionId === selectedSinkConnector.connectionId && 
              connector.streamName === selectedSinkConnector.streamName) {
            return {
              ...connector,
              connectorType: connectorData.connectorType,
              streamName: connectorData.streamName,
              description: connectorData.description,
            };
          }
          return connector;
        });

        await updatePipeline(pipelineId, {
          workspaceId: pipeline.workspaceId,
          sinkConnections: updatedSinkConnections,
        });

        // Trigger parent to refetch pipeline data
        window.location.reload();
      } catch (err) {
        console.error('Failed to edit sink connector:', err);
        setError(err?.message || 'Failed to edit sink connector');
      } finally {
        setSaving(false);
      }
    },
    [pipelineId, pipeline, selectedSinkConnector]
  );

  const handleAddTransformation = useCallback(
    async (transformData) => {
      if (!pipelineId || !pipeline?.workspaceId) {
        setError('Pipeline or workspace ID missing');
        return;
      }

      setSaving(true);
      setError(null);

      try {
        const newTransform = {
          type: transformData.type,
          sourceStream: transformData.sourceStream,
          targetStream: transformData.targetStream,
          failureQueue: transformData.failureQueue || null,
          expression: transformData.expression,
          description: transformData.description || '',
        };

        // Add to transforms array
        const updatedTransforms = [...(pipeline.transforms || []), newTransform];

        await updatePipeline(pipelineId, {
          workspaceId: pipeline.workspaceId,
          transforms: updatedTransforms,
        });

        // Trigger parent to refetch pipeline data
        window.location.reload(); // Simple approach for MVP; ideally use state management
      } catch (err) {
        console.error('Failed to add transformation:', err);
        setError(err?.message || 'Failed to add transformation');
      } finally {
        setSaving(false);
      }
    },
    [pipelineId, pipeline]
  );

  const handleEditTransformation = useCallback(
    async (transformData) => {
      if (!pipelineId || !pipeline?.workspaceId || selectedTransformationIndex === null) {
        setError('Pipeline or workspace ID missing');
        return;
      }

      setSaving(true);
      setError(null);

      try {
        const transforms = Array.isArray(pipeline.transforms) ? [...pipeline.transforms] : [];
        
        // Update the selected transformation
        if (selectedTransformationIndex >= 0 && selectedTransformationIndex < transforms.length) {
          transforms[selectedTransformationIndex] = {
            ...transforms[selectedTransformationIndex],
            type: transformData.type,
            sourceStream: transformData.sourceStream,
            targetStream: transformData.targetStream,
            failureQueue: transformData.failureQueue || null,
            expression: transformData.expression,
            description: transformData.description || '',
          };
        }

        await updatePipeline(pipelineId, {
          workspaceId: pipeline.workspaceId,
          transforms,
        });

        // Trigger parent to refetch pipeline data
        window.location.reload();
      } catch (err) {
        console.error('Failed to edit transformation:', err);
        setError(err?.message || 'Failed to edit transformation');
      } finally {
        setSaving(false);
      }
    },
    [pipelineId, pipeline, selectedTransformationIndex]
  );

  const handleToggleTransformationPause = useCallback(
    async (index) => {
      if (!pipelineId || !pipeline?.workspaceId) {
        setError('Pipeline or workspace ID missing');
        return;
      }

      setSaving(true);
      setError(null);

      try {
        const transforms = Array.isArray(pipeline.transforms) ? [...pipeline.transforms] : [];
        if (index < 0 || index >= transforms.length) {
          setError('Invalid transformation index');
          return;
        }

        // Toggle pause on the specified transformation
        transforms[index] = {
          ...transforms[index],
          isPaused: !transforms[index]?.isPaused,
        };

        await updatePipeline(pipelineId, {
          workspaceId: pipeline.workspaceId,
          transforms,
        });

        // Trigger parent to refetch pipeline data
        window.location.reload();
      } catch (err) {
        console.error('Failed to toggle transformation pause:', err);
        setError(err?.message || 'Failed to toggle transformation pause');
      } finally {
        setSaving(false);
      }
    },
    [pipelineId, pipeline]
  );

  // Handle node drag end - save positions to backend
  const handleNodeDragStop = useCallback(
    (event, node) => {
      if (pipelineId && pipeline?.workspaceId) {
        const updatedPositions = { ...nodePositions, [node.id]: node.position };
        
        console.log('Saving node position:', node.id, node.position);
        console.log('All positions:', updatedPositions);
        
        // Update local state immediately
        setNodePositions(updatedPositions);
        
        // Save to backend immediately (no debounce for now to debug)
        updatePipeline(pipelineId, {
          workspaceId: pipeline.workspaceId,
          nodePositions: updatedPositions,
        }).then(() => {
          console.log('Position saved successfully!');
        }).catch((err) => {
          console.error('Failed to save node positions:', err);
        });
      }
    },
    [pipelineId, pipeline, nodePositions]
  );

  if (!pipeline) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  const hasStreams = existingStreams.length > 0;

  return (
    <Box sx={{ width: '100%' }}>
      {/* Action Toolbar */}
      <Stack 
        direction="row" 
        spacing={2} 
        sx={{ 
          mb: 2,
          p: 2,
          bgcolor: 'background.paper',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setConnectorDialogOpen(true)}
          disabled={!hasStreams}
        >
          Add Source Connector
        </Button>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Add Stream
        </Button>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setTransformDialogOpen(true)}
          disabled={!hasStreams}
        >
          Add Transformation
        </Button>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setSinkDialogOpen(true)}
          disabled={!hasStreams}
        >
          Add Sink Connector
        </Button>
      </Stack>

      {/* ReactFlow Canvas */}
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
        onNodesChange={onNodesChange}
        onNodeDragStop={handleNodeDragStop}
        fitView
        minZoom={0.5}
        maxZoom={1.5}
        nodesDraggable={true}
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
      <EditSourceConnectorDialog
        open={editSourceConnectorDialogOpen}
        onClose={() => {
          setEditSourceConnectorDialogOpen(false);
          setSelectedSourceConnector(null);
        }}
        onSave={handleEditSourceConnector}
        connector={selectedSourceConnector}
        sourceStreams={existingStreams.filter((s) => s.variant === 'source')}
      />
      <AddSinkConnectorDialog
        open={sinkDialogOpen}
        onClose={() => setSinkDialogOpen(false)}
        onAdd={handleAddSinkConnector}
        sinkStreams={existingStreams.filter((s) => s.variant === 'sink')}
      />
      <EditSinkConnectorDialog
        open={editSinkConnectorDialogOpen}
        onClose={() => {
          setEditSinkConnectorDialogOpen(false);
          setSelectedSinkConnector(null);
        }}
        onSave={handleEditSinkConnector}
        connector={selectedSinkConnector}
        sinkStreams={existingStreams.filter((s) => s.variant === 'sink')}
      />
      <AddTransformationDialog
        open={transformDialogOpen}
        onClose={() => setTransformDialogOpen(false)}
        onAdd={handleAddTransformation}
        sourceStreams={existingStreams.filter((s) => s.variant === 'source')}
        sinkStreams={existingStreams.filter((s) => s.variant === 'sink')}
        dlqStreams={existingStreams.filter((s) => s.variant === 'dlq')}
      />
      <EditTransformationDialog
        open={editTransformDialogOpen}
        onClose={() => {
          setEditTransformDialogOpen(false);
          setSelectedTransformationIndex(null);
        }}
        onSave={handleEditTransformation}
        transformation={selectedTransformationIndex !== null ? transformations[selectedTransformationIndex] : null}
        sourceStreams={existingStreams.filter((s) => s.variant === 'source')}
        sinkStreams={existingStreams.filter((s) => s.variant === 'sink')}
        dlqStreams={existingStreams.filter((s) => s.variant === 'dlq')}
      />
      </Box>
    </Box>
  );
}
