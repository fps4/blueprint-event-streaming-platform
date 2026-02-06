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

import { listClients } from 'src/api/client';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

export function ClientListView() {
  const router = useRouter();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    listClients(controller.signal)
      .then((items) => setClients(items))
      .catch((err) => {
        if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return;
        setError(err?.message || 'Failed to load clients');
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
        field: 'allowedScopes',
        headerName: 'Scopes',
        flex: 1,
        minWidth: 200,
        renderCell: (params) => params.value?.join(', ') || '-',
      },
      {
        field: 'allowedTopics',
        headerName: 'Topics',
        flex: 1,
        minWidth: 200,
        renderCell: (params) => params.value?.join(', ') || '-',
      },
    ],
    []
  );

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Clients"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Clients', href: paths.dashboard.client.root },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.client.new}
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
          >
            Add Client
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
          rows={clients}
          columns={columns}
          loading={loading}
          disableRowSelectionOnClick
          onRowDoubleClick={(params) => router.push(paths.dashboard.client.edit(params.row.id))}
          pageSizeOptions={[5, 10, 20, { value: -1, label: 'All' }]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          slots={{
            toolbar: GridToolbarQuickFilter,
            noRowsOverlay: () => <EmptyContent title="No clients" />,
            noResultsOverlay: () => <EmptyContent title="No results found" />,
          }}
          sx={{ [`& .${gridClasses.cell}`]: { alignItems: 'center' } }}
        />
      </Card>
    </DashboardContent>
  );
}
