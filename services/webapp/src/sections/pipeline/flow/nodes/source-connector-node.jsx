'use client';

import { Handle, Position } from 'reactflow';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';

import { getNodeStyle } from './shared-node-styles';

export function SourceConnectorNode({ data }) {
  const { connectorType, description, clientName, onEdit } = data;

  return (
    <Card sx={{ ...getNodeStyle('sourceConnector'), position: 'relative' }}>
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
          Source Connector
        </Typography>
        {clientName && (
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {clientName}
          </Typography>
        )}
        <Chip label={connectorType} size="small" color="success" />
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
