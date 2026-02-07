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
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { createConnection, updateConnection } from 'src/api/connection';

import { Form, Field } from 'src/components/hook-form';

const ConnectionSchema = zod
  .object({
    name: zod.string().min(1, { message: 'Name is required' }),
    type: zod.enum(['HTTP', 'S3']).default('HTTP'),
    status: zod.enum(['active', 'inactive']).default('active'),
    description: zod.string().optional(),
    // HTTP config
    url: zod.string().optional(),
    method: zod.string().optional(),
    headers: zod.string().optional(), // JSON string
    // S3 config
    bucket: zod.string().optional(),
    region: zod.string().optional(),
    accessKeyId: zod.string().optional(),
    secretAccessKey: zod.string().optional(),
  })
  .refine(
    (data) => {
      if (data.type === 'HTTP') {
        return !!data.url;
      }
      if (data.type === 'S3') {
        return !!data.bucket;
      }
      return true;
    },
    {
      message: 'URL is required for HTTP connections, bucket is required for S3 connections',
      path: ['url'],
    }
  );

export function ConnectionForm({ currentConnection }) {
  const router = useRouter();

  const defaultValues = useMemo(
    () => ({
      name: '',
      type: 'HTTP',
      status: 'active',
      description: '',
      url: '',
      method: 'POST',
      headers: '',
      bucket: '',
      region: '',
      accessKeyId: '',
      secretAccessKey: '',
    }),
    []
  );

  const methods = useForm({
    resolver: zodResolver(ConnectionSchema),
    defaultValues,
    values: currentConnection
      ? {
          ...defaultValues,
          name: currentConnection.name || '',
          type: currentConnection.type || 'HTTP',
          status: currentConnection.status || 'active',
          description: currentConnection.description || '',
          url: currentConnection.config?.url || '',
          method: currentConnection.config?.method || 'POST',
          headers: currentConnection.config?.headers
            ? JSON.stringify(currentConnection.config.headers, null, 2)
            : '',
          bucket: currentConnection.config?.bucket || '',
          region: currentConnection.config?.region || '',
          accessKeyId: currentConnection.config?.accessKeyId || '',
          secretAccessKey: currentConnection.config?.secretAccessKey || '',
        }
      : defaultValues,
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
    watch,
  } = methods;

  const connectionType = watch('type');

  const onSubmit = handleSubmit(async (data) => {
    try {
      const config = {};

      if (data.type === 'HTTP') {
        config.url = data.url;
        config.method = data.method || 'POST';
        if (data.headers) {
          try {
            config.headers = JSON.parse(data.headers);
          } catch (e) {
            console.error('Invalid JSON headers', e);
          }
        }
      } else if (data.type === 'S3') {
        config.bucket = data.bucket;
        config.region = data.region;
        config.accessKeyId = data.accessKeyId;
        config.secretAccessKey = data.secretAccessKey;
      }

      const payload = {
        name: data.name,
        type: data.type,
        status: data.status,
        description: data.description || '',
        config,
      };

      if (currentConnection) {
        await updateConnection(currentConnection.id, payload);
      } else {
        await createConnection(payload);
      }

      router.push(paths.dashboard.connection.root);
    } catch (error) {
      console.error(error);
    }
  });

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Stack spacing={3}>
        <Card>
          <CardHeader
            title={currentConnection ? 'Edit Connection' : 'New Connection'}
            subheader="Configure external destination for data delivery"
          />
          <Stack spacing={3} sx={{ p: 3 }}>
            <Field.Text name="name" label="Name" required />

            <Field.Select name="type" label="Type" required>
              <MenuItem value="HTTP">HTTP</MenuItem>
              <MenuItem value="S3">S3</MenuItem>
            </Field.Select>

            <Field.Select name="status" label="Status" required>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Field.Select>

            <Field.Text
              name="description"
              label="Description"
              multiline
              rows={2}
            />

            {connectionType === 'HTTP' && (
              <>
                <Typography variant="h6" sx={{ mt: 2 }}>
                  HTTP Configuration
                </Typography>
                <Field.Text name="url" label="URL" required placeholder="https://api.example.com/webhook" />
                <Field.Select name="method" label="HTTP Method">
                  <MenuItem value="POST">POST</MenuItem>
                  <MenuItem value="PUT">PUT</MenuItem>
                  <MenuItem value="PATCH">PATCH</MenuItem>
                </Field.Select>
                <Field.Text
                  name="headers"
                  label="Headers (JSON)"
                  multiline
                  rows={4}
                  placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
                />
              </>
            )}

            {connectionType === 'S3' && (
              <>
                <Typography variant="h6" sx={{ mt: 2 }}>
                  S3 Configuration
                </Typography>
                <Field.Text name="bucket" label="Bucket Name" required placeholder="my-bucket" />
                <Field.Text name="region" label="Region" placeholder="us-east-1" />
                <Field.Text name="accessKeyId" label="Access Key ID" placeholder="AKIAIOSFODNN7EXAMPLE" />
                <Field.Text
                  name="secretAccessKey"
                  label="Secret Access Key"
                  type="password"
                  placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                />
              </>
            )}
          </Stack>
        </Card>

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button
            variant="outlined"
            onClick={() => router.push(paths.dashboard.connection.root)}
          >
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {currentConnection ? 'Save Changes' : 'Create Connection'}
          </Button>
        </Stack>
      </Stack>
    </Form>
  );
}
