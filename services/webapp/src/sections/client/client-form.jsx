'use client';

import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import CardHeader from '@mui/material/CardHeader';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { createClient, updateClient } from 'src/api/client';

import { Form, Field } from 'src/components/hook-form';

const ClientSchema = zod.object({
  name: zod.string().min(1, { message: 'Name is required' }),
  status: zod.enum(['active', 'inactive']).default('active'),
  allowedScopes: zod.string().optional(),
  allowedTopics: zod.string().optional(),
});

export function ClientForm({ currentClient }) {
  const router = useRouter();

  const defaultValues = useMemo(
    () => ({
      name: '',
      status: 'active',
      allowedScopes: '',
      allowedTopics: '',
    }),
    []
  );

  const methods = useForm({
    resolver: zodResolver(ClientSchema),
    defaultValues,
    values: currentClient
      ? {
          ...defaultValues,
          name: currentClient.name || '',
          status: currentClient.status || 'active',
          allowedScopes: Array.isArray(currentClient.allowedScopes)
            ? currentClient.allowedScopes.join(', ')
            : '',
          allowedTopics: Array.isArray(currentClient.allowedTopics)
            ? currentClient.allowedTopics.join(', ')
            : '',
        }
      : defaultValues,
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    const payload = {
      name: data.name,
      status: data.status,
      allowedScopes: data.allowedScopes
        ? data.allowedScopes.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      allowedTopics: data.allowedTopics
        ? data.allowedTopics.split(',').map((t) => t.trim()).filter(Boolean)
        : [],
    };

    if (currentClient?.id) {
      await updateClient(currentClient.id, payload);
    } else {
      await createClient(payload);
    }

    router.replace(paths.dashboard.client.root);
  });

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Stack spacing={3}>
        <Card>
          <CardHeader title="Client details" />
          <Stack spacing={3} sx={{ p: 3 }}>
            <Field.Text name="name" label="Name" placeholder="My client" />
            <Field.Select name="status" label="Status">
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Field.Select>
            <Field.Text
              name="allowedScopes"
              label="Allowed Scopes"
              placeholder="ingest:topic:orders.created, api:read"
              helperText="Comma-separated list of scopes"
              multiline
              rows={2}
            />
            <Field.Text
              name="allowedTopics"
              label="Allowed Topics"
              placeholder="dev.ws-acme.orders.raw, prod.ws-acme.payments.enriched"
              helperText="Comma-separated list of topics"
              multiline
              rows={2}
            />
          </Stack>
        </Card>

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button color="inherit" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {currentClient ? 'Save changes' : 'Create client'}
          </Button>
        </Stack>
      </Stack>
    </Form>
  );
}
