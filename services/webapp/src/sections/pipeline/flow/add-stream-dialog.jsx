'use client';

import { useState } from 'react';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

const STREAM_NAME_REGEX = /^[a-zA-Z0-9._-]+$/;
const MAX_STREAM_NAME_LENGTH = 100; // Conservative, considering full topic will be <env>.<workspace_code>.<pipeline_code>.<stream>.<variant>

export function AddStreamDialog({ open, onClose, onAdd, env, workspaceCode, pipelineCode }) {
  const [streamName, setStreamName] = useState('');
  const [error, setError] = useState('');

  const validateStreamName = (name) => {
    if (!name || name.trim().length === 0) {
      return 'Stream name is required';
    }
    if (name.length > MAX_STREAM_NAME_LENGTH) {
      return `Stream name must be ${MAX_STREAM_NAME_LENGTH} characters or less`;
    }
    if (!STREAM_NAME_REGEX.test(name)) {
      return 'Stream name can only contain: a-z, A-Z, 0-9, . _ -';
    }
    return '';
  };

  const handleAdd = () => {
    const validationError = validateStreamName(streamName);
    if (validationError) {
      setError(validationError);
      return;
    }

    onAdd(streamName.trim());
    setStreamName('');
    setError('');
    onClose();
  };

  const handleClose = () => {
    setStreamName('');
    setError('');
    onClose();
  };

  const handleChange = (e) => {
    setStreamName(e.target.value);
    if (error) {
      setError('');
    }
  };

  const sourceTopic = `${env}.${workspaceCode}.${pipelineCode}.${streamName || '<name>'}.source`;
  const sinkTopic = `${env}.${workspaceCode}.${pipelineCode}.${streamName || '<name>'}.sink`;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add New Stream</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Stream Name"
          type="text"
          fullWidth
          value={streamName}
          onChange={handleChange}
          error={!!error}
          helperText={error || 'Allowed characters: a-z, A-Z, 0-9, . _ -'}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleAdd();
            }
          }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          This will create two topics:
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontFamily: 'monospace' }}>
          • {sourceTopic}
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontFamily: 'monospace' }}>
          • {sinkTopic}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleAdd} variant="contained" disabled={!streamName.trim()}>
          Add Stream
        </Button>
      </DialogActions>
    </Dialog>
  );
}
