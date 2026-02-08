'use client';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { DataGrid, gridClasses } from '@mui/x-data-grid';

import { paths } from 'src/routes/paths';

import { fetchLogs } from 'src/api/observability';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

const TIME_RANGES = [
  { value: '-5m', label: '5 minutes' },
  { value: '-15m', label: '15 minutes' },
  { value: '-30m', label: '30 minutes' },
  { value: '-1h', label: '1 hour' },
  { value: '-3h', label: '3 hours' },
  { value: '-6h', label: '6 hours' },
  { value: '-12h', label: '12 hours' },
  { value: '-24h', label: '24 hours' },
];

const LOG_LEVELS = [
  { value: '', label: 'All Levels' },
  { value: 'trace', label: 'Trace' },
  { value: 'debug', label: 'Debug' },
  { value: 'info', label: 'Info' },
  { value: 'warn', label: 'Warning' },
  { value: 'error', label: 'Error' },
  { value: 'fatal', label: 'Fatal' },
];

const SERVICES = [
  { value: '', label: 'All Services' },
  { value: 'control-api', label: 'Control API' },
  { value: 'connector-http-source', label: 'HTTP Source' },
  { value: 'connector-http-sink', label: 'HTTP Sink' },
  { value: 'worker-jsonata', label: 'Worker (Jsonata)' },
  { value: 'authorizer', label: 'Authorizer' },
  { value: 'observability-api', label: 'Observability API' },
];

// ----------------------------------------------------------------------

export function LogsView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [timeRange, setTimeRange] = useState('-1h');
  const [service, setService] = useState('');
  const [level, setLevel] = useState('');
  const [requestId, setRequestId] = useState('');
  const [topic, setTopic] = useState('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        since: timeRange,
        limit: 500,
      };

      if (service) params.service = service;
      if (level) params.level = level;
      if (requestId.trim()) params.requestId = requestId.trim();
      if (topic.trim()) params.topic = topic.trim();

      const result = await fetchLogs(params);
      
      // Add unique ID for DataGrid
      const logsWithId = result.logs.map((log, idx) => ({
        ...log,
        id: `${log.timestamp}-${idx}`,
      }));

      setLogs(logsWithId);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  }, [timeRange, service, level, requestId, topic]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleRefresh = () => {
    loadLogs();
  };

  const handleReset = () => {
    setTimeRange('-1h');
    setService('');
    setLevel('');
    setRequestId('');
    setTopic('');
  };

  const columns = [
    {
      field: 'timestamp',
      headerName: 'Timestamp',
      width: 200,
      valueFormatter: (value) => new Date(value).toLocaleString(),
    },
    {
      field: 'level',
      headerName: 'Level',
      width: 90,
      renderCell: (params) => (
        <Box
          sx={{
            px: 1,
            py: 0.5,
            borderRadius: 1,
            typography: 'caption',
            fontWeight: 'fontWeightBold',
            textTransform: 'uppercase',
            bgcolor: getLevelColor(params.value),
            color: 'common.white',
          }}
        >
          {params.value || 'info'}
        </Box>
      ),
    },
    {
      field: 'service',
      headerName: 'Service',
      width: 180,
    },
    {
      field: 'requestId',
      headerName: 'Request ID',
      width: 250,
      renderCell: (params) =>
        params.value ? (
          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
            {params.value}
          </Typography>
        ) : (
          '-'
        ),
    },
    {
      field: 'topic',
      headerName: 'Topic',
      width: 250,
    },
    {
      field: 'message',
      headerName: 'Message',
      flex: 1,
      minWidth: 300,
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            py: 1,
          }}
        >
          {params.value}
        </Typography>
      ),
    },
  ];

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Logs"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Logs' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ mb: 3 }}>
        <Stack spacing={2} sx={{ p: 3 }}>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                label="Time Range"
                onChange={(e) => setTimeRange(e.target.value)}
              >
                {TIME_RANGES.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 180 }}>
              <InputLabel>Service</InputLabel>
              <Select value={service} label="Service" onChange={(e) => setService(e.target.value)}>
                {SERVICES.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Level</InputLabel>
              <Select value={level} label="Level" onChange={(e) => setLevel(e.target.value)}>
                {LOG_LEVELS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Request ID"
              value={requestId}
              onChange={(e) => setRequestId(e.target.value)}
              placeholder="Filter by request ID"
              sx={{ minWidth: 250 }}
            />

            <TextField
              label="Topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Filter by topic"
              sx={{ minWidth: 250 }}
            />
          </Stack>

          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              startIcon={<Iconify icon="eva:refresh-fill" />}
              onClick={handleRefresh}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button variant="outlined" onClick={handleReset}>
              Reset Filters
            </Button>
          </Stack>
        </Stack>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card>
        <DataGrid
          rows={logs}
          columns={columns}
          loading={loading}
          autoHeight
          pageSizeOptions={[25, 50, 100]}
          initialState={{
            pagination: { paginationModel: { pageSize: 50 } },
          }}
          getRowHeight={() => 'auto'}
          sx={{
            [`& .${gridClasses.cell}`]: {
              py: 1,
            },
          }}
          slots={{
            noRowsOverlay: () => (
              <EmptyContent
                title={loading ? 'Loading logs...' : 'No logs found'}
                description={
                  loading ? '' : 'Try adjusting your filters or select a different time range'
                }
                sx={{ py: 10 }}
              />
            ),
            loadingOverlay: () => (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                }}
              >
                <CircularProgress />
              </Box>
            ),
          }}
        />
      </Card>
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

function getLevelColor(level) {
  switch (level?.toLowerCase()) {
    case 'trace':
      return 'text.disabled';
    case 'debug':
      return 'info.main';
    case 'info':
      return 'success.main';
    case 'warn':
      return 'warning.main';
    case 'error':
      return 'error.main';
    case 'fatal':
      return 'error.dark';
    default:
      return 'text.secondary';
  }
}
