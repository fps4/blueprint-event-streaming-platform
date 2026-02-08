'use client';

import { Handle, Position } from 'reactflow';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';

import { getNodeStyle } from './shared-node-styles';

export function SinkConnectorNode({ data }) {
  const { connectorType, description, connectionName, onEdit } = data;

  return (
    <Card sx={{ ...getNodeStyle('sinkConnector'), position: 'relative' }}>
      <Handle type="target" position={Position.Left} />
      
      {/* Edit icon - top right */}
      <IconButton
        size="small"
        onClick={onEdit}
        sx={{
          position: 'absolute',
          top: 4,
          right: 4,
          zIndex: 10,
          padding: '4px',
        }}
      >
        <EditIcon sx={{ fontSize: '1rem' }} />
      </IconButton>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>
          Sink Connector
        </Typography>
        {connectionName && (
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {connectionName}
          </Typography>
        )}
        <Chip label={connectorType} size="small" color="info" />
        {description && (
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', fontSize: '0.7rem' }}>
            {description}
          </Typography>
        )}
      </Box>
      <Handle type="source" position={Position.Right} />
    </Card>
  );
}
