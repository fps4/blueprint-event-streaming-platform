'use client';

import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';

const CONNECTOR_TYPES = ['HTTP', 'S3'];

export function EditSinkConnectorDialog({ open, onClose, onSave, connector, sinkStreams }) {
  const [connectorType, setConnectorType] = useState('');
  const [streamName, setStreamName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  // Load connector data when dialog opens
  useEffect(() => {
    if (open && connector) {
      setConnectorType(connector.connectorType || '');
      setStreamName(connector.streamName || '');
      setDescription(connector.description || '');
      setError('');
    }
  }, [open, connector]);

  const handleSave = () => {
    if (!connectorType) {
      setError('Connector type is required');
      return;
    }
    if (!streamName) {
      setError('Stream is required');
      return;
    }

    onSave({
      connectorType,
      streamName,
      description: description.trim(),
    });
    handleClose();
  };

  const handleClose = () => {
    setConnectorType('');
    setStreamName('');
    setDescription('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Sink Connector</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Connection"
            fullWidth
            value={connector?.connectionName || ''}
            disabled
            helperText="Connection cannot be changed"
          />

          <TextField
            select
            label="Connector Type"
            fullWidth
            value={connectorType}
            onChange={(e) => {
              setConnectorType(e.target.value);
              if (error) setError('');
            }}
            error={!!error && !connectorType}
            helperText={!connectorType && error ? 'Connector type is required' : ''}
          >
            {CONNECTOR_TYPES.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Stream"
            fullWidth
            value={streamName}
            onChange={(e) => {
              setStreamName(e.target.value);
              if (error) setError('');
            }}
            error={!!error && !streamName}
            helperText={!streamName && error ? 'Stream is required' : 'Select the sink stream to connect from'}
          >
            {sinkStreams && sinkStreams.length > 0 ? (
              sinkStreams.map((stream) => (
                <MenuItem key={stream.streamName} value={stream.streamName}>
                  {stream.streamName}
                </MenuItem>
              ))
            ) : (
              <MenuItem disabled>No sink streams available</MenuItem>
            )}
          </TextField>

          <TextField
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
          />

          {error && (
            <Box sx={{ color: 'error.main', fontSize: '0.875rem' }}>
              {error}
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!connectorType || !streamName}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
