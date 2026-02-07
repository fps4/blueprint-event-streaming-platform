'use client';

import { Handle, Position } from 'reactflow';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';

export function SourceConnectorNode({ data }) {
  const { connectorType, description } = data;

  return (
    <Card
      sx={{
        minWidth: 200,
        padding: 2,
        border: 2,
        borderColor: 'success.main',
        bgcolor: 'background.paper',
      }}
    >
      <Handle type="target" position={Position.Top} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
          SOURCE CONNECTOR
        </Typography>
        <Chip label={connectorType} size="small" color="success" />
        {description && (
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
            {description}
          </Typography>
        )}
      </Box>
      <Handle type="source" position={Position.Bottom} />
    </Card>
  );
}
