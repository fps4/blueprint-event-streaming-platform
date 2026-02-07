'use client';

import { useState, useEffect } from 'react';

import { paths } from 'src/routes/paths';

import { getConnection } from 'src/api/connection';
import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { ConnectionForm } from '../connection-form';

export function ConnectionEditView({ connectionId }) {
  const [connection, setConnection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!connectionId) return undefined;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    getConnection(connectionId, controller.signal)
      .then((data) => setConnection(data))
      .catch((err) => {
        if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return;
        setError(err?.message || 'Failed to load connection');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [connectionId]);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Edit connection"
        backHref={paths.dashboard.connection.root}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Connections', href: paths.dashboard.connection.root },
          { name: connection?.name || 'Edit' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {!loading && !error && connection && <ConnectionForm currentConnection={connection} />}
    </DashboardContent>
  );
}
