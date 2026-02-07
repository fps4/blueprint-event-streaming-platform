'use client';

import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

import { listClients } from 'src/api/client';

const CONNECTOR_TYPES = ['HTTP', 'S3'];

export function AddSourceConnectorDialog({ open, onClose, onAdd, sourceStreams }) {
  const [clientId, setClientId] = useState('');
  const [connectorType, setConnectorType] = useState('');
  const [streamName, setStreamName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);

  useEffect(() => {
    if (open) {
      const controller = new AbortController();
      setLoadingClients(true);
      listClients(controller.signal)
        .then((items) => setClients(items))
        .catch((err) => {
          if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return;
          console.error('Failed to load clients:', err);
        })
        .finally(() => setLoadingClients(false));
      return () => controller.abort();
    }
  }, [open]);

  const handleAdd = () => {
    if (!clientId) {
      setError('Client is required');
      return;
    }
    if (!connectorType) {
      setError('Connector type is required');
      return;
    }
    if (!streamName) {
      setError('Stream is required');
      return;
    }

    const selectedClient = clients.find((c) => c.id === clientId);
    onAdd({
      clientId,
      clientName: selectedClient?.name || clientId,
      role: 'source',
      connectorType,
      streamName,
      description: description.trim(),
    });
    handleClose();
  };

  const handleClose = () => {
    setClientId('');
    setConnectorType('');
    setStreamName('');
    setDescription('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Source Connector</DialogTitle>
      <DialogContent>
        {loadingClients ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <>
            <TextField
              select
              autoFocus
              margin="dense"
              label="Client"
              fullWidth
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                if (error) setError('');
              }}
              error={!!error && !clientId}
              helperText={!clientId && error ? 'Client is required' : ''}
            >
              {clients.length === 0 ? (
                <MenuItem disabled>No clients available</MenuItem>
              ) : (
                clients.map((client) => (
                  <MenuItem key={client.id} value={client.id}>
                    {client.name}
                  </MenuItem>
                ))
              )}
            </TextField>

            <TextField
              select
              margin="dense"
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
              margin="dense"
              label="Stream"
              fullWidth
              value={streamName}
              onChange={(e) => {
                setStreamName(e.target.value);
                if (error) setError('');
              }}
              error={!!error && !streamName}
              helperText={!streamName && error ? 'Stream is required' : 'Select the source stream to connect to'}
            >
              {sourceStreams.length === 0 ? (
                <MenuItem disabled>No source streams available</MenuItem>
              ) : (
                sourceStreams.map((stream) => (
                  <MenuItem key={stream.streamName} value={stream.streamName}>
                    {stream.streamName}
                  </MenuItem>
                ))
              )}
            </TextField>

            <TextField
              margin="dense"
              label="Description (optional)"
              type="text"
              fullWidth
              multiline
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleAdd}
          variant="contained"
          disabled={!clientId || !connectorType || !streamName || loadingClients}
        >
          Add Connector
        </Button>
      </DialogActions>
    </Dialog>
  );
}
