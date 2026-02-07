'use client';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { ConnectionForm } from '../connection-form';

export function ConnectionNewView() {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Create connection"
        backHref={paths.dashboard.connection.root}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Connections', href: paths.dashboard.connection.root },
          { name: 'New connection' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <ConnectionForm />
    </DashboardContent>
  );
}
