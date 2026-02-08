'use client';

import { Handle, Position } from 'reactflow';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';

import { getNodeStyle } from './shared-node-styles';

export function TransformationNode({ data }) {
  const { type, sourceStream, targetStream, description, isPaused, onEdit, onTogglePause } = data;

  return (
    <Card sx={{ ...getNodeStyle('transformation'), position: 'relative' }}>
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

      {/* Play/Pause icon - bottom right */}
      <IconButton
        size="small"
        onClick={onTogglePause}
        sx={{
          position: 'absolute',
          bottom: 4,
          right: 4,
          zIndex: 10,
          padding: '4px',
        }}
      >
        {isPaused ? (
          <PlayArrowIcon sx={{ fontSize: '1rem' }} />
        ) : (
          <PauseIcon sx={{ fontSize: '1rem' }} />
        )}
      </IconButton>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>
          Transformation
        </Typography>
        <Chip label={type?.toUpperCase() || 'JSONATA'} size="small" color="warning" />
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
            {sourceStream} → {targetStream}
          </Typography>
        </Box>
        {description && (
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', fontSize: '0.65rem' }}>
            {description}
          </Typography>
        )}
      </Box>
      <Handle type="source" position={Position.Right} />
    </Card>
  );
}
