'use client';

import { Handle, Position } from 'reactflow';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';

export function ClientNode({ data }) {
  const { clientName } = data;

  return (
    <Card
      sx={{
        minWidth: 180,
        padding: 2,
        border: 2,
        borderColor: 'secondary.main',
        bgcolor: 'background.paper',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
          CLIENT
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
          {clientName}
        </Typography>
      </Box>
      <Handle type="source" position={Position.Bottom} />
    </Card>
  );
}
