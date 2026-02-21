'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { Markdown } from 'src/components/markdown';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

export function UserManualQuickStartView({ content }) {
  return (
    <DashboardContent maxWidth="lg">
      <CustomBreadcrumbs
        heading="Quick Start"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'User Manual', href: paths.dashboard.manuals.userManual.root },
          { name: 'Quick Start' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card>
        <CardContent>
          <Markdown>{content}</Markdown>
        </CardContent>
      </Card>
    </DashboardContent>
  );
}
