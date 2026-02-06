'use client';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { ClientForm } from '../client-form';

export function ClientNewView() {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Create client"
        backHref={paths.dashboard.client.root}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Clients', href: paths.dashboard.client.root },
          { name: 'New client' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <ClientForm />
    </DashboardContent>
  );
}
