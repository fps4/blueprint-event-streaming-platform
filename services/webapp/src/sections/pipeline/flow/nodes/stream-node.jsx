'use client';

import { Handle, Position } from 'reactflow';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';

export function StreamNode({ data }) {
  const { streamName, variant } = data;
  const chipColor = variant === 'source' ? 'success' : 'info';

  return (
    <Card
      sx={{
        minWidth: 200,
        padding: 2,
        border: 2,
        borderColor: 'primary.main',
        bgcolor: 'background.paper',
      }}
    >
      <Handle type="target" position={Position.Top} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {streamName}
        </Typography>
        <Chip label={variant} size="small" color={chipColor} />
      </Box>
      <Handle type="source" position={Position.Bottom} />
    </Card>
  );
}
