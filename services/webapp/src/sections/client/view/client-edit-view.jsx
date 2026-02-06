'use client';

import { useState, useEffect } from 'react';

import { paths } from 'src/routes/paths';

import { getClient } from 'src/api/client';
import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { ClientForm } from '../client-form';

export function ClientEditView({ clientId }) {
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!clientId) return undefined;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    getClient(clientId, controller.signal)
      .then((data) => setClient(data))
      .catch((err) => {
        if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return;
        setError(err?.message || 'Failed to load client');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [clientId]);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Edit client"
        backHref={paths.dashboard.client.root}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Clients', href: paths.dashboard.client.root },
          { name: client?.name || 'Edit' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {!loading && !error && client && <ClientForm currentClient={client} />}
    </DashboardContent>
  );
}
