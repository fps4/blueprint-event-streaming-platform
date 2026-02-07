'use client';

import { useMemo, useState, useEffect } from 'react';

import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { DataGrid, gridClasses, GridToolbarQuickFilter } from '@mui/x-data-grid';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { listConnections } from 'src/api/connection';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

export function ConnectionListView() {
  const router = useRouter();
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    listConnections(controller.signal)
      .then((items) => setConnections(items))
      .catch((err) => {
        if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return;
        setError(err?.message || 'Failed to load connections');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const columns = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Name',
        flex: 1,
        minWidth: 200,
      },
      {
        field: 'type',
        headerName: 'Type',
        width: 100,
        renderCell: (params) => (
          <Chip
            label={params.value}
            color={params.value === 'HTTP' ? 'primary' : 'secondary'}
            size="small"
          />
        ),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        renderCell: (params) => (
          <Chip
            label={params.value}
            color={params.value === 'active' ? 'success' : 'default'}
            size="small"
          />
        ),
      },
      {
        field: 'description',
        headerName: 'Description',
        flex: 2,
        minWidth: 300,
        renderCell: (params) => params.value || '-',
      },
    ],
    []
  );

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Connections"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Connections', href: paths.dashboard.connection.root },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.connection.new}
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
          >
            Add Connection
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <Card>
        <DataGrid
          autoHeight
          rows={connections}
          columns={columns}
          loading={loading}
          disableRowSelectionOnClick
          onRowDoubleClick={(params) => router.push(paths.dashboard.connection.edit(params.row.id))}
          pageSizeOptions={[5, 10, 20, { value: -1, label: 'All' }]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          slots={{
            toolbar: GridToolbarQuickFilter,
            noRowsOverlay: () => <EmptyContent title="No connections" />,
            noResultsOverlay: () => <EmptyContent title="No results found" />,
          }}
          sx={{ [`& .${gridClasses.cell}`]: { alignItems: 'center' } }}
        />
      </Card>
    </DashboardContent>
  );
}
