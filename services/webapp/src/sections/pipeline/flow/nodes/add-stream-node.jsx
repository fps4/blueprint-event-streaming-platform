'use client';

import { Handle, Position } from 'reactflow';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import Typography from '@mui/material/Typography';

export function AddStreamNode({ data }) {
  const handleClick = (e) => {
    e.stopPropagation();
    if (data?.onClick) {
      data.onClick();
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
        minWidth: 200,
        borderRadius: 2,
        border: '2px dashed',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        cursor: 'pointer',
        '&:hover': {
          borderColor: 'primary.main',
          bgcolor: 'action.hover',
        },
      }}
      onClick={handleClick}
    >
      <IconButton color="primary" size="large" onClick={handleClick}>
        <AddCircleOutlineIcon fontSize="large" />
      </IconButton>
      <Typography variant="body2" color="text.secondary" onClick={handleClick}>
        Add Stream
      </Typography>
      <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
    </Box>
  );
}
